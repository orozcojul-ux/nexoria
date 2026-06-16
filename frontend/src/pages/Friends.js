import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, UserCheck, UserX, Mail, X, Search, MessageCircle, Inbox, Circle } from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { PageShell, PremiumButton } from "@/components/ui-premium";
import StarField from "@/components/StarField";
import HeroName from "@/components/HeroName";
import HeroPixelAvatar from "@/components/HeroPixelAvatar";
import FriendChat from "@/components/friends/FriendChat";
import { sfx } from "@/lib/sfx";
import { usePageBanner } from "@/lib/page-banners";

export default function Friends() {
  const banner = usePageBanner("friends");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatUnread, setChatUnread] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const chatFriendId = searchParams.get("chat");
  const ns = useNexusSocket();

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
    } catch (err) {
      toast.error(err.response?.data?.detail || "Impossible de charger vos compagnons");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const unfriend = async (uid) => {
    if (!window.confirm("Rompre ce lien d'amitié ?")) return;
    try {
      await api.delete(`/friends/${uid}`);
      toast.success("Lien rompu");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
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

      <div className="flex flex-wrap gap-2 mb-5">
          <span className="hub-stat-pill"><Users className="w-3 h-3" /> {friends.length} compagnon{friends.length > 1 ? "s" : ""}</span>
          <span className="hub-stat-pill"><Circle className="w-3 h-3 text-emerald-400 fill-emerald-400" /> {onlineCount} en ligne</span>
          {requests.length > 0 && (
            <span className="hub-stat-pill"><Inbox className="w-3 h-3 text-amber-400" /> {requests.length} demande{requests.length > 1 ? "s" : ""}</span>
          )}
          {chatUnread > 0 && (
            <span className="hub-stat-pill"><MessageCircle className="w-3 h-3 text-cyan-400" /> {chatUnread} non lu{chatUnread > 1 ? "s" : ""}</span>
          )}
        </div>
      <div className="flex justify-end mb-4">
        <PremiumButton variant="cyan" size="sm" icon={UserPlus} onClick={() => setShowAdd(true)}>
          Ajouter
        </PremiumButton>
      </div>

      {requests.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 mb-5" data-testid="friend-requests-section">
          <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-bold mb-3 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" /> Demandes reçues ({requests.length})
          </div>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.request_id} className="friend-request-card" data-testid={`req-${r.request_id}`}>
                <Link to={`/profile/${r.from?.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="friend-chat-avatar" style={{ width: "2.5rem", height: "2.5rem" }}>
                    {r.from?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <HeroName user={r.from} size="sm" />
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                      {r.from?.class_name} · Niv. {r.from?.level}
                    </div>
                  </div>
                </Link>
                <div className="friend-request-actions">
                  <button type="button" onClick={() => accept(r.request_id)} data-testid={`req-accept-${r.request_id}`} className="friend-btn-accept">
                    <UserCheck className="w-3 h-3 inline mr-1" /> Accepter
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

      <div className="friends-hub-layout">
        <section className="friends-hub-chat rounded-xl border border-cyan-500/15 overflow-hidden bg-black/20">
          <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-300 font-bold">Échos privés</span>
          </div>
          <FriendChat initialFriendId={chatFriendId} onUnreadChange={setChatUnread} />
        </section>

        <aside>
          <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Liste ({friends.length})
          </div>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1" data-testid="friends-grid">
            {loading && (
              <div className="text-center text-zinc-500 italic py-8 text-sm">Chargement…</div>
            )}
            {!loading && friends.length === 0 && (
              <div className="rounded-xl border border-white/8 bg-black/20 p-8 text-center text-zinc-500 italic text-sm">
                Aucun compagnon — ajoute des héros pour commencer.
              </div>
            )}
            {friends.map((f) => (
              <motion.div
                key={f.user_id}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl border border-white/8 bg-black/25 hover:border-violet-500/25 transition-all p-3 flex items-center gap-3"
                data-testid={`friend-${f.user_id}`}
              >
                <Link to={`/profile/${f.username}`} className="friend-chat-avatar friend-chat-avatar--pixel shrink-0" style={{ width: "2.5rem", height: "3rem" }}>
                  <HeroPixelAvatar user={f} size={32} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${f.username}`}><HeroName user={f} size="sm" /></Link>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1.5 mt-0.5">
                    <span className="truncate">{f.class_name} · Niv. {f.level}</span>
                    <span className={`friend-online-badge shrink-0 ${f.online ? "friend-online-badge--on" : "friend-online-badge--off"}`}>
                      {f.online ? "En ligne" : "Hors ligne"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => openChat(f.user_id)} className="friend-btn-message" data-testid={`friend-message-${f.user_id}`}>
                    <MessageCircle className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={() => unfriend(f.user_id)} data-testid={`unfriend-${f.user_id}`} className="text-red-400/70 hover:text-red-300 p-1" title="Rompre le lien">
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
  const [username, setUsername] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/friends/request", { target_username: username.trim() });
      toast.success(`Demande envoyée à ${username}`);
      onSent();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
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
          <h3 className="font-display font-black text-lg text-gradient">Ajouter un compagnon</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-zinc-500" /></button>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            placeholder="Pseudo du héros"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded pl-8 pr-3 py-2 text-sm"
            data-testid="add-friend-username"
          />
        </div>
        <button type="submit" className="w-full py-2 rounded border border-emerald-500/40 text-emerald-300 font-bold text-sm" data-testid="add-friend-submit">
          Envoyer la demande
        </button>
      </motion.form>
    </motion.div>
  );
}
