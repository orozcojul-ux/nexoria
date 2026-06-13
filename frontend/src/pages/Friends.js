import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, UserCheck, UserX, Mail, X, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";
import StarField from "@/components/StarField";
import HeroName from "@/components/HeroName";
import { sfx } from "@/lib/sfx";

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    const [f, r] = await Promise.all([api.get("/friends"), api.get("/friends/requests")]);
    setFriends(f.data); setRequests(r.data);
  };
  useEffect(() => { load(); }, []);

  const accept = async (id) => {
    await api.post(`/friends/requests/${id}/accept`);
    toast.success("Pacte d'amitié forgé"); sfx.success(); load();
  };
  const decline = async (id) => {
    await api.post(`/friends/requests/${id}/decline`);
    load();
  };
  const unfriend = async (uid) => {
    if (!window.confirm("Rompre ce lien d'amitié ?")) return;
    await api.delete(`/friends/${uid}`);
    toast.success("Lien rompu"); load();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 relative" data-testid="friends-page">
      <StarField density={40} />
      <div className="text-center mb-8 relative">
        <div className="flex justify-center mb-3"><RuneSeal icon={Users} color="#10B981" size={48} /></div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-300 font-bold mb-1">Liens de fraternité</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">Mes <span className="text-gradient">Compagnons</span></h1>
        <p className="text-zinc-400 text-sm mt-2 italic scroll-paragraph max-w-2xl mx-auto">« Un héros n'est jamais plus fort que ceux qui marchent à ses côtés. »</p>
        <RuneDivider className="mt-5 max-w-md mx-auto" />
      </div>

      {requests.length > 0 && (
        <div className="mb-6" data-testid="friend-requests-section">
          <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-bold mb-3 flex items-center gap-2">
            <Mail className="w-3 h-3" /> Demandes en attente ({requests.length})
          </div>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.request_id} className="glass rounded-xl p-4 flex items-center justify-between gap-3" data-testid={`req-${r.request_id}`}>
                <Link to={`/profile/${r.from?.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-bold shrink-0">
                    {r.from?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <HeroName user={r.from} size="sm" />
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{r.from?.class_name} · Niv. {r.from?.level}</div>
                  </div>
                </Link>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => accept(r.request_id)} data-testid={`req-accept-${r.request_id}`}
                    className="px-3 py-1.5 rounded border border-green-500/40 text-green-300 text-xs font-bold flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Lier
                  </button>
                  <button onClick={() => decline(r.request_id)} data-testid={`req-decline-${r.request_id}`}
                    className="px-3 py-1.5 rounded border border-white/10 text-zinc-400 text-xs">
                    <UserX className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Compagnons ({friends.length})</div>
        <button onClick={() => setShowAdd(true)} data-testid="open-add-friend"
          className="px-4 py-2 rounded border border-emerald-500/40 text-emerald-300 text-sm font-bold flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Inviter
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="friends-grid">
        {friends.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 italic py-12">Aucun compagnon à ce jour — partez en quête de fraternité</div>
        )}
        {friends.map((f) => (
          <motion.div key={f.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 flex items-center gap-3" data-testid={`friend-${f.user_id}`}>
            <Link to={`/profile/${f.username}`} className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-bold shrink-0 overflow-hidden">
              {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : f.username[0]?.toUpperCase()}
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${f.username}`}><HeroName user={f} size="sm" /></Link>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{f.class_name} · Niv. {f.level} · {f.rank}</div>
            </div>
            <button onClick={() => unfriend(f.user_id)} data-testid={`unfriend-${f.user_id}`}
              className="text-red-400 hover:text-red-300 p-1" title="Rompre le lien">
              <UserX className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && <AddFriendDialog onClose={() => setShowAdd(false)} onSent={() => { setShowAdd(false); load(); }} />}
      </AnimatePresence>
    </div>
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
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="rune-border rounded-2xl p-6 max-w-sm w-full space-y-3" data-testid="add-friend-dialog">
        <div className="flex justify-between">
          <h3 className="font-display font-black text-lg text-gradient">Forger un nouveau lien</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-zinc-500" /></button>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3}
            placeholder="Pseudo exact"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded pl-8 pr-3 py-2 text-sm" data-testid="add-friend-username" />
        </div>
        <button type="submit" className="w-full py-2 rounded border border-emerald-500/40 text-emerald-300 font-bold text-sm" data-testid="add-friend-submit">
          Envoyer la demande
        </button>
      </motion.form>
    </motion.div>
  );
}
