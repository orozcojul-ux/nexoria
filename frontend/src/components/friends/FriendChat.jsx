import React, { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, Send, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import HeroName from "@/components/HeroName";
import HeroPixelAvatar from "@/components/HeroPixelAvatar";
import "./FriendChat.css";

function FriendOnlineBadge({ online }) {
  return (
    <span className={`friend-online-badge ${online ? "friend-online-badge--on" : "friend-online-badge--off"}`}>
      {online ? "En ligne" : "Hors ligne"}
    </span>
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

  const loadThreads = useCallback(async () => {
    try {
      const { data } = await api.get("/friends/chat/threads");
      setThreads(data || []);
      const totalUnread = (data || []).reduce((s, t) => s + (t.unread || 0), 0);
      onUnreadChange?.(totalUnread);
    } catch {
      toast.error("Impossible de charger les conversations");
    }
  }, [onUnreadChange]);

  const loadMessages = useCallback(async (friendId) => {
    if (!friendId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/friends/chat/${friendId}/messages`);
      setMessages(data || []);
      await loadThreads();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Conversation inaccessible");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [loadThreads]);

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

  useEffect(() => {
    if (!ns?.friendMessage) return;
    const msg = ns.friendMessage;
    const friendId = msg.from_user === me?.user_id ? msg.to_user : msg.from_user;
    setThreads((prev) => prev.map((t) => {
      if (t.friend?.user_id !== friendId) return t;
      return {
        ...t,
        last_message: msg,
        unread: msg.to_user === me?.user_id && activeId !== friendId ? (t.unread || 0) + 1 : t.unread,
      };
    }));
    if (activeId === friendId) {
      setMessages((prev) => {
        if (prev.some((m) => m.message_id === msg.message_id)) return prev;
        return [...prev, msg];
      });
      if (msg.to_user === me?.user_id) loadThreads();
    } else {
      loadThreads();
    }
    ns.consumeFriendMessage?.();
  }, [ns?.friendMessage, ns, me?.user_id, activeId, loadThreads]);

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
      setMessages((prev) => {
        const without = prev.filter((m) => m.message_id !== optimisticId);
        if (without.some((m) => m.message_id === data.message_id)) return without;
        return [...without, data];
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
                    <FriendOnlineBadge online={t.friend.online} />
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
                  <FriendOnlineBadge online={activeFriend?.online} />
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
