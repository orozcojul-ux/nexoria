import React, { useEffect, useState } from "react";
import { Shield, Trash2, Users, MessageSquare, Trophy, Package, ScrollText, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";

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
    } catch (e) { toast.error("Accès refusé"); }
  };
  useEffect(() => { load(); }, []);

  const deleteUser = async (id) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    try { await api.delete(`/admin/users/${id}`); toast.success("Supprimé"); await load(); }
    catch { toast.error("Erreur"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="admin-page">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-violet-400 drop-shadow-[0_0_10px_rgba(157,76,221,0.6)]" />
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold">Administration</div>
          <h1 className="font-display font-black text-3xl">Dashboard Admin</h1>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: "overview", label: "Vue d'ensemble" },
          { id: "users", label: "Utilisateurs" },
          { id: "logs", label: "Logs" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
            className={`px-4 py-2 rounded-md text-sm font-bold border transition-all ${tab === t.id ? "border-violet-500/60 text-violet-300 bg-violet-500/10" : "border-white/10 text-zinc-400"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="admin-stats">
          {[
            { label: "Utilisateurs", value: stats.users, icon: Users, color: "#00E5FF" },
            { label: "Posts", value: stats.posts, icon: MessageSquare, color: "#9D4CDD" },
            { label: "Commentaires", value: stats.comments, icon: MessageSquare, color: "#A855F7" },
            { label: "Badges accordés", value: stats.badges_granted, icon: Trophy, color: "#FFD700" },
            { label: "Objets", value: stats.items, icon: Package, color: "#EF4444" },
            { label: "Quêtes terminées", value: stats.quests_completed, icon: ScrollText, color: "#10B981" },
            { label: "Oracle consulté", value: stats.oracle_consultations, icon: Eye, color: "#EC4899" },
            { label: "Sessions actives", value: stats.sessions, icon: Shield, color: "#3B82F6" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass rounded-xl p-5">
              <s.icon className="w-6 h-6 mb-3" style={{ color: s.color }} />
              <div className="font-mono-stat text-3xl font-bold text-white" data-testid={`stat-${s.label}`}>{s.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-left text-[10px] uppercase tracking-widest text-zinc-500">
                <th className="p-3">Pseudo</th>
                <th className="p-3 hidden sm:table-cell">Classe</th>
                <th className="p-3">Niveau</th>
                <th className="p-3 hidden md:table-cell">Rôle</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/5" data-testid={`admin-user-${u.user_id}`}>
                  <td className="p-3 font-bold">{u.username}</td>
                  <td className="p-3 hidden sm:table-cell text-zinc-400">{u.class_name}</td>
                  <td className="p-3 font-mono-stat text-cyan-300">{u.level}</td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${u.role === "admin" ? "text-violet-300" : "text-zinc-400"}`}>{u.role}</span>
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
            <div key={i} className="py-2 border-b border-white/5 last:border-0">
              <div className="text-sm text-zinc-200">{l.text}</div>
              <div className="text-[10px] font-mono-stat text-zinc-500">[{l.kind}] {new Date(l.created_at).toLocaleString("fr-FR")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
