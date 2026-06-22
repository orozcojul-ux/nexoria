import React, { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, Send, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import HeroName from "@/components/HeroName";
import HeroPixelAvatar from "@/components/HeroPixelAvatar";
import LastConnection from "@/components/LastConnection";
import "./FriendChat.css";

const POLL_INTERVAL_MS = 2500; // fallback polling when socket is unavailable

function FriendPresence({ user }) {
  return (
    <LastConnection
      user={user}
      onlineClassName="friend-online-badge friend-online-badge--on"
      offlineClassName="friend-online-badge friend-online-badge--off"
    />
  );
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function FriendChat({ initialFriendId = null, onUnreadChange, variant = "page" }) {
  const { user: me } = useAuth();
  const ns = useNexusSocket();
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(initialFriendId);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const activeIdRef = useRef(activeId);
  const pollRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Keep ref in sync with state for use inside intervals/closures
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const loadThreads = useCallback(async () => {
    try {
      const { data } = await api.get("/friends/chat/threads");
      setThreads(data || []);
      const totalUnread = (data || []).reduce((s, t) => s + (t.unread || 0), 0);
      onUnreadChange?.(totalUnread);
    } catch {
      // silently ignore – threads panel still shows cached state
    }
  }, [onUnreadChange]);

  // Merge an array of server messages into state, ignoring already-known ids.
  // Returns true if any new messages were added.
  const mergeMessages = useCallback((incoming) => {
    if (!incoming?.length) return false;
    let added = false;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.message_id));
      const fresh = incoming.filter((m) => !known.has(m.message_id));
      if (!fresh.length) return prev;
      added = true;
      const next = [...prev.filter((m) => !m._optimistic), ...fresh];
      // Re-attach any remaining optimistic messages that haven't been confirmed yet
      const confirmedIds = new Set(next.map((m) => m.message_id));
      const orphans = prev.filter(
        (m) => m._optimistic && !confirmedIds.has(m.message_id)
      );
      return [...next, ...orphans].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    });
    return added;
  }, []);

  const loadMessages = useCallback(async (friendId, silent = false) => {
    if (!friendId) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/friends/chat/${friendId}/messages`);
      // Full replace on explicit open; use merge for silent polls
      if (!silent) {
        setMessages(data || []);
      } else {
        mergeMessages(data || []);
      }
      await loadThreads();
    } catch (err) {
      if (!silent) {
        toast.error(err.response?.data?.detail || "Conversation inaccessible");
        setMessages([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadThreads, mergeMessages]);

  // ------ Polling fallback ------
  // Fires every POLL_INTERVAL_MS while a conversation is open.
  // This ensures messages appear even when the Socket.IO connection is absent
  // (user not in Nexus Online) or unreliable.
  const startPolling = useCallback((friendId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const id = activeIdRef.current;
      if (!id || isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const { data } = await api.get(`/friends/chat/${id}/messages`);
        mergeMessages(data || []);
      } catch {
        // silent
      } finally {
        isFetchingRef.current = false;
      }
    }, POLL_INTERVAL_MS);
  }, [mergeMessages]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Start/stop polling when activeId changes
  useEffect(() => {
    if (activeId) {
      startPolling(activeId);
    } else {
      stopPolling();
    }
    return stopPolling;
  }, [activeId, startPolling, stopPolling]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (ns?.presence) loadThreads();
  }, [ns?.presence?.total, loadThreads]);

  // Changement de compte — vider l'état local (évite mélange SmouzYi / TEST)
  useEffect(() => {
    setThreads([]);
    setMessages([]);
    setActiveId(initialFriendId || null);
    setText("");
    if (me?.user_id) loadThreads();
  }, [me?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActiveId(initialFriendId || null);
  }, [initialFriendId]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket real-time handler (instant delivery when socket is connected)
  useEffect(() => {
    if (!ns?.friendMessage) return;
    const msg = ns.friendMessage;
    const myId = me?.user_id;
    // The sender's own message comes back via socket too (multi-tab sync).
    // friendId is whoever is NOT us in this exchange.
    const friendId = msg.from_user === myId ? msg.to_user : msg.from_user;

    // Update thread preview + unread count
    setThreads((prev) => prev.map((t) => {
      if (t.friend?.user_id !== friendId) return t;
      return {
        ...t,
        last_message: msg,
        unread: msg.to_user === myId && activeIdRef.current !== friendId
          ? (t.unread || 0) + 1
          : t.unread,
      };
    }));

    // Inject into active conversation instantly (polling will deduplicate)
    if (activeIdRef.current === friendId) {
      setMessages((prev) => {
        if (prev.some((m) => m.message_id === msg.message_id)) return prev;
        // Replace any matching optimistic message
        const withoutOpt = prev.filter(
          (m) => !(m._optimistic && m.text === msg.text && m.from_user === msg.from_user)
        );
        return [...withoutOpt, msg].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
      });
    }
    loadThreads();
    ns.consumeFriendMessage?.();
  }, [ns?.friendMessage, ns, me?.user_id, loadThreads]);

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    const optimisticId = `opt_${Date.now()}`;
    const optimistic = {
      message_id: optimisticId,
      from_user: me?.user_id,
      to_user: activeId,
      text: body,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    try {
      const { data } = await api.post(`/friends/chat/${activeId}/messages`, { text: body });
      // Replace the optimistic placeholder with the confirmed message
      setMessages((prev) => {
        const withoutOpt = prev.filter((m) => m.message_id !== optimisticId);
        if (withoutOpt.some((m) => m.message_id === data.message_id)) return withoutOpt;
        return [...withoutOpt, data].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
      });
      loadThreads();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.message_id !== optimisticId));
      setText(body);
      toast.error(formatApiError(err) || "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  const activeThread = threads.find((t) => t.friend?.user_id === activeId);
  const activeFriend = activeThread?.friend;

  return (
    <div className={`friend-chat-layout ${variant === "nexus" ? "friend-chat-layout--nexus" : ""} ${activeId ? "friend-chat-layout--has-thread" : ""}`} data-testid="friend-chat">
      <div className="friend-chat-panel friend-chat-threads-panel">
        <div className="friend-chat-head">
          <MessageCircle className="w-3.5 h-3.5 text-cyan-300" />
          <div className="min-w-0">
            <span className="friend-chat-title">Échos privés</span>
            {me?.username && (
              <div className="text-[9px] text-zinc-500 truncate" data-testid="friend-chat-me">
                Sanctuaire : <span className="text-cyan-300/90">{me.username}</span>
              </div>
            )}
          </div>
        </div>
        <div className="friend-chat-threads">
          {threads.length === 0 ? (
            <div className="friend-chat-empty" style={{ minHeight: "12rem" }}>
              Aucune conversation — liez-vous à un compagnon pour échanger.
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.friend.user_id}
                type="button"
                onClick={() => setActiveId(t.friend.user_id)}
                className={`friend-chat-thread ${activeId === t.friend.user_id ? "friend-chat-thread--active" : ""}`}
                data-testid={`chat-thread-${t.friend.user_id}`}
              >
                <div className="friend-chat-avatar friend-chat-avatar--pixel">
                  <HeroPixelAvatar user={t.friend} size={28} />
                </div>
                <div className="friend-chat-thread-meta">
                  <div className="friend-chat-thread-name">
                    {t.friend.username}
                    <FriendPresence user={t.friend} />
                  </div>
                  <div className="friend-chat-thread-preview">
                    {t.last_message?.text || "Commencer la conversation…"}
                  </div>
                </div>
                {t.unread > 0 && <span className="friend-chat-unread">{t.unread > 9 ? "9+" : t.unread}</span>}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="friend-chat-panel">
        {!activeId ? (
          <div className="friend-chat-empty">
            <MessageCircle className="w-8 h-8 text-violet-400/50 mb-2" />
            Sélectionnez un compagnon pour ouvrir un canal privé entre vos sanctuaires.
          </div>
        ) : (
          <>
            <div className="friend-chat-head">
              <button
                type="button"
                className="md:hidden nexus-icon-btn"
                style={{ width: "1.5rem", height: "1.5rem" }}
                onClick={() => setActiveId(null)}
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="friend-chat-avatar friend-chat-avatar--pixel" style={{ width: "1.65rem", height: "2rem" }}>
                <HeroPixelAvatar user={activeFriend} size={22} />
              </div>
              <div className="min-w-0">
                <HeroName user={activeFriend} size="sm" />
                <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
                  <span>{activeFriend?.class_name} · niv. {activeFriend?.level}</span>
                  <FriendPresence user={activeFriend} />
                  {!activeFriend?.online && (
                    <span className="friend-offline-hint">— message en attente à la connexion</span>
                  )}
                </div>
              </div>
            </div>

            <div className="friend-chat-messages" data-testid="friend-chat-messages">
              {loading && <div className="friend-chat-empty">Synchronisation des échos…</div>}
              {!loading && messages.length === 0 && (
                <div className="friend-chat-empty">Aucun message — forgez le premier lien verbal.</div>
              )}
              {!loading && messages.map((m) => {
                const mine = m.from_user === me?.user_id;
                return (
                  <div key={m.message_id} className={`friend-chat-bubble ${mine ? "friend-chat-bubble--mine" : "friend-chat-bubble--theirs"}`}>
                    {m.text}
                    <div className="friend-chat-time">{formatTime(m.created_at)}</div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} className="friend-chat-input-row">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder="Écrire à votre compagnon…"
                className="friend-chat-input"
                data-testid="friend-chat-input"
              />
              <button type="submit" disabled={!text.trim() || sending} className="friend-chat-send" data-testid="friend-chat-send">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
