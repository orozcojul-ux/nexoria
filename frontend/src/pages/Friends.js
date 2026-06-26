import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, UserCheck, UserX, Mail, X, Search, MessageCircle, Inbox, Circle, Send } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { useI18n } from "@/contexts/I18nContext";
import { PageShell } from "@/components/ui-premium";
import StarField from "@/components/StarField";
import HeroName from "@/components/HeroName";
import HeroPixelAvatar from "@/components/HeroPixelAvatar";
import HeroCardOpener from "@/components/HeroCardOpener";
import LastConnection from "@/components/LastConnection";
import FriendChat from "@/components/friends/FriendChat";
import { sfx } from "@/lib/sfx";
import { usePageBanner } from "@/lib/page-banners";
import "./friends.css";

export default function Friends() {
  const { t } = useI18n();
  const banner = usePageBanner("friends");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatUnread, setChatUnread] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const chatFriendId = searchParams.get("chat");
  const ns = useNexusSocket();

  const load = useCallback(async () => {
    try {
      const [f, r, s] = await Promise.all([
        api.get("/friends"),
        api.get("/friends/requests"),
        api.get("/friends/requests/sent"),
      ]);
      setFriends(f.data || []);
      setRequests(r.data || []);
      setSentRequests(s.data || []);
      window.dispatchEvent(new CustomEvent("nexoria:friends-updated", {
        detail: { pendingCount: (r.data || []).length },
      }));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("friends.load_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!ns?.pushNotif) return;
    const k = ns.pushNotif.kind;
    if (k === "friend_request" || k === "friend_accepted" || k === "friend_message") {
      load();
    }
  }, [ns?.pushNotif, load]);

  useEffect(() => {
    if (ns?.presence) load();
  }, [ns?.presence?.total, load]);

  useEffect(() => {
    const onUpdate = () => load();
    window.addEventListener("nexoria:friends-updated", onUpdate);
    return () => window.removeEventListener("nexoria:friends-updated", onUpdate);
  }, [load]);

  const cancelRequest = async (id) => {
    try {
      await api.delete(`/friends/requests/${id}`);
      toast.info(t("friends.request_cancelled"));
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("common.error"));
    }
  };

  const accept = async (id) => {
    try {
      await api.post(`/friends/requests/${id}/accept`);
      toast.success(t("friends.pact_forged"));
      sfx.success();
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("friends.accept_failed"));
    }
  };

  const decline = async (id) => {
    try {
      await api.post(`/friends/requests/${id}/decline`);
      toast.info(t("friends.request_declined"));
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("common.error"));
    }
  };

  const unfriend = async (uid) => {
    if (!window.confirm(t("friends.unlink_confirm"))) return;
    try {
      await api.delete(`/friends/${uid}`);
      toast.success(t("friends.link_broken"));
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("common.error"));
    }
  };

  const openChat = (userId) => navigate(`/friends?chat=${userId}`);

  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <PageShell
      wide
      testid="friends-page"
      banner={banner}
    >
      <StarField density={30} />

      <div className="friends-topbar">
        <div className="friends-topbar-stats">
          <span className="hub-stat-pill">
            <Users className="w-3 h-3" />{" "}
            {friends.length <= 1
              ? t("friends.companion_count", { count: friends.length })
              : t("friends.companions_count", { count: friends.length })}
          </span>
          <span className="hub-stat-pill">
            <Circle className="w-3 h-3 text-emerald-400 fill-emerald-400" />{" "}
            {t("friends.online_count", { count: onlineCount })}
          </span>
          {requests.length > 0 && (
            <span className="hub-stat-pill">
              <Inbox className="w-3 h-3 text-amber-400" />{" "}
              {requests.length <= 1
                ? t("friends.requests_received", { count: requests.length })
                : t("friends.requests_received_plural", { count: requests.length })}
            </span>
          )}
          {sentRequests.length > 0 && (
            <span className="hub-stat-pill">
              <Send className="w-3 h-3 text-violet-400" />{" "}
              {sentRequests.length <= 1
                ? t("friends.requests_sent_count", { count: sentRequests.length })
                : t("friends.requests_sent_plural", { count: sentRequests.length })}
            </span>
          )}
          {chatUnread > 0 && (
            <span className="hub-stat-pill">
              <MessageCircle className="w-3 h-3 text-cyan-400" />{" "}
              {chatUnread <= 1
                ? t("friends.unread", { count: chatUnread })
                : t("friends.unread_plural", { count: chatUnread })}
            </span>
          )}
        </div>
        <button type="button" className="friends-add-btn" onClick={() => setShowAdd(true)} data-testid="friends-add-btn">
          <UserPlus className="w-3.5 h-3.5" /> {t("friends.add")}
        </button>
      </div>

      {sentRequests.length > 0 && (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 mb-3" data-testid="sent-requests-section">
          <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300 font-bold mb-3 flex items-center gap-2">
            <Send className="w-3.5 h-3.5" /> {t("friends.sent_requests_title", { count: sentRequests.length })}
          </div>
          <div className="space-y-2">
            {sentRequests.map((r) => (
              <div key={r.request_id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-3" data-testid={`sent-req-${r.request_id}`}>
                <div className="friend-chat-avatar text-sm font-bold" style={{ width: "2rem", height: "2rem" }}>
                  {r.to?.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{r.to?.username || "?"}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{r.to?.class_name} · Niv. {r.to?.level}</div>
                </div>
                <span className="text-[10px] text-violet-300 italic shrink-0">{t("friends.pending")}</span>
                <button type="button" onClick={() => cancelRequest(r.request_id)}
                  className="text-zinc-500 hover:text-red-400 p-1 shrink-0" title={t("friends.cancel_request")}
                  data-testid={`cancel-req-${r.request_id}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 mb-5" data-testid="friend-requests-section">
          <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-bold mb-3 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" /> {t("friends.received_requests_title", { count: requests.length })}
          </div>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.request_id} className="friend-request-card" data-testid={`req-${r.request_id}`}>
                <HeroCardOpener userId={r.from?.user_id} username={r.from?.username} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="friend-chat-avatar" style={{ width: "2.5rem", height: "2.5rem" }}>
                    {r.from?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <HeroName user={r.from} size="sm" />
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                      {r.from?.class_name} · Niv. {r.from?.level}
                    </div>
                  </div>
                </HeroCardOpener>
                <div className="friend-request-actions">
                  <button type="button" onClick={() => accept(r.request_id)} data-testid={`req-accept-${r.request_id}`} className="friend-btn-accept">
                    <UserCheck className="w-3 h-3 inline mr-1" /> {t("friends.accept")}
                  </button>
                  <button type="button" onClick={() => decline(r.request_id)} data-testid={`req-decline-${r.request_id}`} className="friend-btn-decline">
                    <UserX className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="friends-layout">
        <section className="friends-chat-block" data-testid="friends-chat-block">
          <div className="friends-chat-header">
            <MessageCircle className="w-4 h-4 text-cyan-400" />
            <span className="friends-chat-header-label">{t("friends.private_echoes")}</span>
          </div>
          <FriendChat initialFriendId={chatFriendId} onUnreadChange={setChatUnread} />
        </section>

        <aside>
          <div className="friends-list-head">
            <Users className="w-3.5 h-3.5" /> {t("friends.list", { count: friends.length })}
          </div>
          <div className="friends-list" data-testid="friends-grid">
            {loading && (
              <div className="text-center text-zinc-500 italic py-8 text-sm">{t("common.loading")}</div>
            )}
            {!loading && friends.length === 0 && (
              <div className="friends-empty">
                {t("friends.empty_short")}
              </div>
            )}
            {friends.map((f, i) => (
              <motion.div
                key={f.user_id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`friend-card ${chatFriendId === f.user_id ? "friend-card--active" : ""}`}
                data-testid={`friend-${f.user_id}`}
              >
                <HeroCardOpener userId={f.user_id} username={f.username} className="friend-card-avatar">
                  <span className={`friend-card-status ${f.online ? "friend-card-status--on" : "friend-card-status--off"}`} />
                  <HeroPixelAvatar user={f} size={34} />
                </HeroCardOpener>
                <div className="friend-card-body">
                  <HeroCardOpener userId={f.user_id} username={f.username} className="friend-card-name">
                    <HeroName user={f} size="sm" />
                  </HeroCardOpener>
                  <div className="friend-card-sub">
                    <span className="friend-card-class">{f.class_name} · Niv. {f.level}</span>
                    <LastConnection
                      user={f}
                      onlineClassName="friend-online-badge friend-online-badge--on"
                      offlineClassName="friend-online-badge friend-online-badge--off"
                    />
                  </div>
                </div>
                <div className="friend-card-actions">
                  <button type="button" onClick={() => openChat(f.user_id)} className="friend-card-msg" data-testid={`friend-message-${f.user_id}`} title={t("friends.send_message")}>
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => unfriend(f.user_id)} data-testid={`unfriend-${f.user_id}`} className="friend-card-unfriend" title={t("friends.break_link")}>
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddFriendDialog onClose={() => setShowAdd(false)} onSent={() => { setShowAdd(false); load(); }} />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function AddFriendDialog({ onClose, onSent }) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/friends/request", { target_username: username.trim() });
      toast.success(t("friends.request_sent", { username }));
      onSent();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("common.error"));
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-[#0F0820] to-[#0A0613] p-6 max-w-sm w-full space-y-3"
        data-testid="add-friend-dialog"
      >
        <div className="flex justify-between">
          <h3 className="font-display font-black text-lg text-gradient">{t("friends.add_companion")}</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-zinc-500" /></button>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            placeholder={t("friends.hero_username")}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded pl-8 pr-3 py-2 text-sm"
            data-testid="add-friend-username"
          />
        </div>
        <button type="submit" className="w-full py-2 rounded border border-emerald-500/40 text-emerald-300 font-bold text-sm" data-testid="add-friend-submit">
          {t("friends.send_request")}
        </button>
      </motion.form>
    </motion.div>
  );
}
