import React, { useEffect, useState } from "react";
import { Shield, Trash2, Users, MessageSquare, Trophy, Package, ScrollText, Eye, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState("overview");

  const load = async () => {
    try {
      const [s, u, l] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/logs"),
      ]);
      setStats(s.data); setUsers(u.data); setLogs(l.data);
    } catch { toast.error("Accès refusé par le Conseil"); }
  };
  useEffect(() => { load(); }, []);

  const deleteUser = async (id) => {
    if (!window.confirm("Bannir cet héros du royaume ?")) return;
    try { await api.delete(`/admin/users/${id}`); toast.success("Banni"); await load(); }
    catch { toast.error("Erreur"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="admin-page">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <RuneSeal icon={Shield} color="#9D4CDD" size={48} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-violet-300 font-bold mb-2">Chambre des Anciens</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
          Salle du <span className="text-gradient">Conseil</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-2 italic scroll-paragraph max-w-xl mx-auto">
          « Ici se prennent les décisions qui régissent le royaume. Veillez sur la lumière. »
        </p>
        <RuneDivider className="mt-6 mb-6" />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {[
          { id: "overview", label: "Présage" },
          { id: "users", label: "Héros enregistrés" },
          { id: "logs", label: "Chroniques" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
            className={`px-4 py-2 rounded-md text-sm font-bold font-display tracking-wide border transition-all ${tab === t.id ? "border-violet-500/60 text-violet-300 bg-violet-500/10 shadow-[0_0_14px_rgba(157,76,221,0.2)]" : "border-white/10 text-zinc-400"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="admin-stats">
          {[
            { label: "Héros", value: stats.users, icon: Users, color: "#00E5FF" },
            { label: "Missives", value: stats.posts, icon: MessageSquare, color: "#9D4CDD" },
            { label: "Voix", value: stats.comments, icon: MessageSquare, color: "#A855F7" },
            { label: "Badges scellés", value: stats.badges_granted, icon: Trophy, color: "#FFD700" },
            { label: "Reliques", value: stats.items, icon: Package, color: "#EF4444" },
            { label: "Quêtes accomplies", value: stats.quests_completed, icon: ScrollText, color: "#10B981" },
            { label: "Consultations Sanctuaire", value: stats.oracle_consultations, icon: Eye, color: "#EC4899" },
            { label: "Sceaux actifs", value: stats.sessions, icon: Sparkles, color: "#3B82F6" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass rounded-xl p-5 relative overflow-hidden group">
              <span className="absolute top-1 right-1 w-2 h-2 border-t border-r border-current opacity-30" style={{ color: s.color }} />
              <s.icon className="w-6 h-6 mb-3" style={{ color: s.color, filter: `drop-shadow(0 0 6px ${s.color}66)` }} />
              <div className="font-mono-stat text-3xl font-bold text-white" data-testid={`stat-${s.label}`}>{s.value}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-left text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-display">
                <th className="p-3">Pseudo</th>
                <th className="p-3 hidden sm:table-cell">Classe</th>
                <th className="p-3">Niveau</th>
                <th className="p-3 hidden md:table-cell">Statut</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/[0.03]" data-testid={`admin-user-${u.user_id}`}>
                  <td className="p-3 font-display font-bold">{u.username}</td>
                  <td className="p-3 hidden sm:table-cell text-zinc-400">{u.class_name}</td>
                  <td className="p-3 font-mono-stat text-cyan-300">{u.level}</td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={`text-[10px] uppercase tracking-[0.25em] font-bold ${u.role === "admin" ? "text-violet-300" : "text-zinc-400"}`}>
                      {u.role === "admin" ? "Sage" : "Voyageur"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {u.role !== "admin" && (
                      <button onClick={() => deleteUser(u.user_id)} className="text-red-400 hover:text-red-300" data-testid={`delete-user-${u.user_id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "logs" && (
        <div className="glass rounded-2xl p-4 max-h-[600px] overflow-y-auto" data-testid="admin-logs">
          {logs.map((l, i) => (
            <div key={i} className="py-2 border-b border-white/5 last:border-0 flex gap-3">
              <div className="w-1 bg-gradient-to-b from-violet-500 to-cyan-400 rounded-full" />
              <div className="flex-1">
                <div className="text-sm text-zinc-200 scroll-paragraph">{l.text}</div>
                <div className="text-[10px] font-mono-stat text-zinc-500 uppercase tracking-widest">[{l.kind}] {new Date(l.created_at).toLocaleString("fr-FR")}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
