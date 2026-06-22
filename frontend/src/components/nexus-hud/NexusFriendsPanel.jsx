import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users, UserPlus, UserCheck, UserX, MessageCircle, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import HeroName from "@/components/HeroName";
import HeroPixelAvatar from "@/components/HeroPixelAvatar";
import LastConnection from "@/components/LastConnection";
import FriendChat from "@/components/friends/FriendChat";
import { sfx } from "@/lib/sfx";

const TABS = [
  { id: "chat", label: "Échos", icon: MessageCircle },
  { id: "friends", label: "Compagnons", icon: Users },
  { id: "requests", label: "Demandes", icon: Inbox },
];

export default function NexusFriendsPanel({ open, onClose, initialTab = "chat", initialFriendId = null }) {
  const ns = useNexusSocket();
  const { user: me } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatFriendId, setChatFriendId] = useState(initialFriendId);

  const load = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        api.get("/friends"),
        api.get("/friends/requests"),
      ]);
      setFriends(f.data || []);
      setRequests(r.data || []);
      window.dispatchEvent(new CustomEvent("nexoria:friends-updated", {
        detail: { pendingCount: (r.data || []).length },
      }));
    } catch {
      toast.error("Synchronisation des compagnons impossible");
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!ns?.pushNotif) return;
    const k = ns.pushNotif.kind;
    if (k === "friend_request" || k === "friend_accepted" || k === "friend_message") {
      load();
    }
  }, [ns?.pushNotif, load]);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      if (initialFriendId) setChatFriendId(initialFriendId);
    }
  }, [open, initialTab, initialFriendId]);

  useEffect(() => {
    setFriends([]);
    setRequests([]);
    setChatFriendId(null);
    if (open && me?.user_id) load();
  }, [me?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ns?.presence) load();
  }, [ns?.presence?.total, load]);

  const accept = async (id) => {
    try {
      await api.post(`/friends/requests/${id}/accept`);
      toast.success("Pacte d'amitié forgé");
      sfx.success();
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Acceptation impossible");
    }
  };

  const decline = async (id) => {
    try {
      await api.post(`/friends/requests/${id}/decline`);
      toast.info("Demande refusée");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const openChatWith = (userId) => {
    setChatFriendId(userId);
    setTab("chat");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="nexus-friends-backdrop"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="nexus-friends-panel"
            data-testid="nexus-friends-panel"
          >
            <header className="nexus-friends-head">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-300" />
                <div>
                  <h2 className="nexus-friends-title">Compagnons</h2>
                  <p className="nexus-friends-sub">Liens & échos privés</p>
                  {me?.username && (
                    <p className="text-[9px] text-cyan-300/80 mt-0.5" data-testid="nexus-friends-me">
                      Connecté : {me.username}
                    </p>
                  )}
                </div>
              </div>
              <button type="button" onClick={onClose} className="nexus-icon-btn" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </header>

            <nav className="nexus-friends-tabs">
              {TABS.map((t) => {
                const Icon = t.icon;
                const badge = t.id === "requests" ? requests.length
                  : t.id === "chat" ? chatUnread : 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`nexus-friends-tab ${tab === t.id ? "nexus-friends-tab--active" : ""}`}
                    data-testid={`nexus-friends-tab-${t.id}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                    {badge > 0 && (
                      <span className="nexus-friends-tab-badge">{badge > 9 ? "9+" : badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="nexus-friends-body">
              {tab === "chat" && (
                <FriendChat
                  variant="nexus"
                  initialFriendId={chatFriendId}
                  onUnreadChange={setChatUnread}
                />
              )}

              {tab === "friends" && (
                <div className="nexus-friends-list" data-testid="nexus-friends-list">
                  {friends.length === 0 ? (
                    <p className="nexus-friends-empty">Aucun compagnon lié — forgez des alliances dans le royaume.</p>
                  ) : (
                    friends.map((f) => (
                      <div key={f.user_id} className="nexus-friend-row">
                        <div className="nexus-friend-avatar nexus-friend-avatar--pixel">
                          <HeroPixelAvatar user={f} size={28} />
                        </div>
                        <div className="nexus-friend-meta">
                          <HeroName user={f} size="sm" />
                          <div className="text-[10px] text-zinc-500">{f.class_name} · niv. {f.level}</div>
                          <LastConnection
                            user={f}
                            className="mt-0.5"
                            dateTimeClassName="text-zinc-500"
                            onlineClassName="nexus-friend-status nexus-friend-status--on"
                            offlineClassName="nexus-friend-status nexus-friend-status--off"
                            nexusOnlineClassName="nexus-friend-nexus-status nexus-friend-nexus-status--on"
                            nexusOfflineClassName="nexus-friend-nexus-status nexus-friend-nexus-status--off"
                          />
                        </div>
                        <button
                          type="button"
                          className="nexus-friend-msg-btn"
                          onClick={() => openChatWith(f.user_id)}
                          data-testid={`nexus-friend-msg-${f.user_id}`}
                        >
                          <MessageCircle className="w-3 h-3" /> Écho
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "requests" && (
                <div className="nexus-friends-requests" data-testid="nexus-friends-requests">
                  {requests.length === 0 ? (
                    <p className="nexus-friends-empty">Aucune demande en attente.</p>
                  ) : (
                    requests.map((r) => (
                      <div key={r.request_id} className="friend-request-card">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="nexus-friend-avatar">
                            {r.from_user?.username?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <HeroName user={r.from_user} size="sm" />
                            <div className="text-[10px] text-zinc-500">Souhaite lier son destin au vôtre</div>
                          </div>
                        </div>
                        <div className="friend-request-actions">
                          <button type="button" className="friend-btn-accept" onClick={() => accept(r.request_id)}>
                            <UserCheck className="w-3 h-3 inline mr-1" />Accepter
                          </button>
                          <button type="button" className="friend-btn-decline" onClick={() => decline(r.request_id)}>
                            <UserX className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
