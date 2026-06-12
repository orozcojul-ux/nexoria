import React, { useEffect, useState } from "react";
import { Shield, Trash2, Users, MessageSquare, Trophy, Package, ScrollText, Eye, Sparkles, Ban, Edit3, Hammer, Megaphone, Crown, ShieldCheck, UserCog, ShoppingBag, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";
import StaffChat from "@/components/StaffChat";
import BroadcastPanel from "@/components/BroadcastPanel";
import HeroName from "@/components/HeroName";

export default function Admin() {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const isAdmin = me?.role === "admin";
  const isMod = me?.role === "moderator";
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [banHistory, setBanHistory] = useState([]);
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "" });
  const [tab, setTab] = useState("overview");
  const [banTarget, setBanTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const load = async () => {
    try {
      const [s, u, l, bh, m] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/logs"),
        api.get("/admin/ban-history"),
        api.get("/system/maintenance"),
      ]);
      setStats(s.data); setUsers(u.data); setLogs(l.data); setBanHistory(bh.data);
      setMaintenance(m.data);
    } catch { toast.error("Accès refusé"); }
  };
  useEffect(() => { load(); }, []);

  const toggleMaintenance = async () => {
    const newState = !maintenance.enabled;
    try {
      await api.post("/admin/maintenance", { enabled: newState, message: maintenance.message || "Royaume en maintenance" });
      toast.success(newState ? "Maintenance ACTIVÉE" : "Maintenance désactivée");
      await load();
    } catch { toast.error("Erreur"); }
  };

  const unban = async (uid) => {
    try { await api.post(`/admin/users/${uid}/unban`); toast.success("Ban levé"); await load(); }
    catch { toast.error("Erreur"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="admin-page">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3"><RuneSeal icon={Shield} color="#9D4CDD" size={48} /></div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
          Salle du <span className="text-gradient">Conseil</span>
        </h1>
        <RuneDivider className="mt-6 mb-6" />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {[
          { id: "overview", label: "Présage" },
          { id: "users", label: "Héros" },
          { id: "bans", label: "Bannissements" },
          { id: "logs", label: "Chroniques" },
          ...(isAdmin ? [{ id: "broadcast", label: "Proclamation" }] : []),
          { id: "chat", label: "Chat Staff" },
          ...(isAdmin ? [{ id: "shop", label: "Boutique" }] : []),
          ...(isAdmin ? [{ id: "seasons", label: "Saisons" }] : []),
          ...(isAdmin ? [{ id: "roles", label: "Rôles" }] : []),
          ...(isAdmin ? [{ id: "system", label: "Système" }] : []),
        ].map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} data-testid={`admin-tab-${tb.id}`}
            className={`px-4 py-2 rounded-md text-sm font-bold font-display tracking-wide border transition-all ${tab === tb.id ? "border-violet-500/60 text-violet-300 bg-violet-500/10 shadow-[0_0_14px_rgba(157,76,221,0.2)]" : "border-white/10 text-zinc-400"}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {isMod && (
        <div className="parchment rounded-xl p-3 mb-6 border-orange-500/30 max-w-2xl mx-auto text-center" data-testid="mod-banner">
          <div className="text-[10px] uppercase tracking-[0.3em] text-orange-400 font-bold font-display">
            <ShieldCheck className="w-3 h-3 inline mr-1" /> Mode Modérateur
          </div>
          <div className="text-xs text-zinc-400 italic mt-1">Vous pouvez consulter, bannir et lever les bans des héros standards. L'édition complète est réservée aux Archontes.</div>
        </div>
      )}

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              className="glass rounded-xl p-5">
              <s.icon className="w-6 h-6 mb-3" style={{ color: s.color, filter: `drop-shadow(0 0 6px ${s.color}66)` }} />
              <div className="font-mono-stat text-3xl font-bold text-white">{s.value}</div>
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
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const banned = u.banned_until && new Date(u.banned_until) > new Date();
                return (
                <tr key={u.user_id} className={`border-b border-white/5 hover:bg-white/[0.03] ${banned ? "bg-red-500/5" : ""}`} data-testid={`admin-user-${u.user_id}`}>
                  <td className="p-3"><HeroName user={u} size="sm" /> {banned && <span className="text-red-400 text-xs ml-1">[banni]</span>}</td>
                  <td className="p-3 hidden sm:table-cell text-zinc-400">{u.class_name}</td>
                  <td className="p-3 font-mono-stat text-cyan-300">{u.level}</td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={`text-[10px] uppercase tracking-[0.25em] font-bold ${u.role === "admin" ? "text-violet-300" : u.role === "moderator" ? "text-orange-300" : "text-zinc-400"}`}>
                      {u.role === "admin" ? "Sage" : u.role === "moderator" ? "Modérateur" : "Voyageur"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {isAdmin && (
                        <button onClick={() => setEditTarget(u)} className="text-cyan-400 hover:text-cyan-300 p-1" title="Modifier" data-testid={`edit-user-${u.user_id}`}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Mods can ban regular users only — admins can ban anyone except other admins */}
                      {u.role !== "admin" && (isMod ? u.role !== "moderator" : true) && (banned ? (
                        <button onClick={() => unban(u.user_id)} className="text-orange-400 hover:text-orange-300 p-1" title="Lever ban" data-testid={`unban-${u.user_id}`}>
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => setBanTarget(u)} className="text-red-400 hover:text-red-300 p-1" title="Bannir" data-testid={`ban-${u.user_id}`}>
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "bans" && (
        <div className="glass rounded-2xl p-4 space-y-2 max-h-[600px] overflow-y-auto" data-testid="ban-history">
          {banHistory.length === 0 && <div className="text-center text-zinc-500 italic py-12">Aucun bannissement enregistré</div>}
          {banHistory.map((b) => (
            <div key={b.ban_id} className={`p-3 rounded border ${b.lifted ? "border-white/5 opacity-50" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-display font-bold"><HeroName user={b} size="sm" /></div>
                  <div className="text-xs text-zinc-400">Par {b.banned_by} · {b.duration_hours}h · « {b.reason} »</div>
                  <div className="text-[10px] font-mono-stat text-zinc-500 mt-1">Jusqu'au {new Date(b.banned_until).toLocaleString()}</div>
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${b.lifted ? "text-zinc-500" : "text-red-400"}`}>
                  {b.lifted ? "Levé" : "Actif"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div className="glass rounded-2xl p-4 max-h-[600px] overflow-y-auto">
          {logs.map((l) => (
            <div key={l.chronicle_id || `${l.created_at}-${l.kind}`} className="py-2 border-b border-white/5 last:border-0 flex gap-3">
              <div className="w-1 bg-gradient-to-b from-violet-500 to-cyan-400 rounded-full" />
              <div className="flex-1">
                <div className="text-sm text-zinc-200">{l.text}</div>
                <div className="text-[10px] font-mono-stat text-zinc-500 uppercase tracking-widest">[{l.kind}] {new Date(l.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "broadcast" && <BroadcastPanel />}
      {tab === "chat" && <StaffChat />}
      {tab === "shop" && <ShopAdmin />}
      {tab === "seasons" && <SeasonsAdmin />}
      {tab === "roles" && <RolesGuide />}

      {tab === "system" && (
        <div className="glass rounded-2xl p-6 max-w-2xl">
          <h2 className="font-display font-bold text-xl ancient-text mb-4 flex items-center gap-2">
            <Hammer className="w-5 h-5 text-yellow-400" /> {t("admin.maintenance_mode")}
          </h2>
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold block">Message affiché</label>
            <textarea
              value={maintenance.message || ""}
              onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm"
              rows={3}
              data-testid="maintenance-message"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMaintenance}
                data-testid="maintenance-toggle"
                className={`px-5 py-2.5 rounded-md font-bold font-display tracking-wide border transition-all ${maintenance.enabled ? "border-green-500/50 text-green-300 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]" : "border-yellow-500/50 text-yellow-300 hover:shadow-[0_0_16px_rgba(234,179,8,0.3)]"}`}>
                {maintenance.enabled ? "Désactiver la maintenance" : "ACTIVER la maintenance"}
              </button>
              <span className={`text-xs font-mono-stat ${maintenance.enabled ? "text-yellow-400" : "text-zinc-500"}`}>
                Statut: {maintenance.enabled ? "ON 🔧" : "OFF"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ban dialog */}
      <AnimatePresence>
        {banTarget && <BanDialog target={banTarget} onClose={() => setBanTarget(null)} onDone={async () => { setBanTarget(null); await load(); }} t={t} />}
        {editTarget && <EditDialog target={editTarget} onClose={() => setEditTarget(null)} onDone={async () => { setEditTarget(null); await load(); }} t={t} />}
      </AnimatePresence>
    </div>
  );
}

function RolesGuide() {
  const roles = [
    {
      id: "user", name: "Voyageur", icon: Users, color: "#9CA3AF",
      desc: "L'utilisateur standard de NEXORIA.",
      perms: ["Poster, commenter, réagir", "Compléter quêtes et gagner XP", "Acheter à la Boutique d'Aether", "Consulter le Sanctuaire", "Construire son royaume"],
    },
    {
      id: "moderator", name: "Modérateur", icon: ShieldCheck, color: "#F97316",
      desc: "Veille sur la communauté. Accès partiel au Conseil.",
      perms: [
        "Tous les droits du Voyageur",
        "Accès à la Salle du Conseil (lecture)",
        "Accès Chat Staff (lecture + écriture)",
        "Accès à la page Maintenance",
        "PAS de droit : bannir, modifier des héros, lancer une proclamation, basculer la maintenance",
      ],
    },
    {
      id: "admin", name: "Sage (Admin)", icon: Crown, color: "#9D4CDD",
      desc: "Autorité suprême. Tous les pouvoirs.",
      perms: [
        "Tous les droits du Modérateur",
        "Bannir / lever ban (1h → 10 ans)",
        "Modifier tout héros (niveau, XP, Aether, réputation, rôle)",
        "Supprimer des héros",
        "Activer / désactiver le mode Maintenance",
        "Lancer des Proclamations Royales (alertes broadcast)",
        "Voir tous les logs et l'historique des bans",
      ],
    },
  ];
  return (
    <div className="grid md:grid-cols-3 gap-4" data-testid="roles-guide">
      {roles.map((r) => (
        <div key={r.id} className="glass rounded-2xl p-5" style={{ borderColor: `${r.color}40` }}>
          <div className="flex items-center gap-2 mb-2">
            <r.icon className="w-6 h-6" style={{ color: r.color, filter: `drop-shadow(0 0 8px ${r.color}66)` }} />
            <div className="font-display font-bold text-xl ancient-text">{r.name}</div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: r.color }}>{r.id}</div>
          <p className="text-sm text-zinc-300 italic mb-4 scroll-paragraph">{r.desc}</p>
          <ul className="space-y-1.5 text-xs">
            {r.perms.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-cyan-400 shrink-0">▸</span>
                <span className={p.startsWith("PAS") ? "text-red-300" : "text-zinc-300"}>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BanDialog({ target, onClose, onDone, t }) {
  const [hours, setHours] = useState(24);
  const [reason, setReason] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { toast.error("Raison requise"); return; }
    try {
      await api.post(`/admin/users/${target.user_id}/ban`, { duration_hours: hours, reason });
      toast.success(`${target.username} banni pour ${hours}h`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="rune-border rounded-2xl p-6 max-w-md w-full space-y-4" data-testid="ban-dialog">
        <h3 className="font-display font-black text-2xl text-red-300">Bannir {target.username}</h3>
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">{t("admin.ban_duration")}</label>
          <input type="number" min="1" max="87600" value={hours} onChange={(e) => setHours(parseInt(e.target.value) || 1)}
            className="w-full bg-[#0A0A0E] border border-red-500/30 rounded-md px-3 py-2" data-testid="ban-duration-input" />
          <div className="flex gap-2 mt-2">
            {[1, 24, 168, 720].map((h) => (
              <button key={h} type="button" onClick={() => setHours(h)} className="px-2 py-1 text-xs border border-white/10 rounded hover:border-red-500/40">
                {h < 24 ? `${h}h` : h < 168 ? `${h/24}j` : h < 720 ? `${h/168}sem` : `${h/720}mois`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">{t("admin.ban_reason")}</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full bg-[#0A0A0E] border border-red-500/30 rounded-md px-3 py-2" rows={3} data-testid="ban-reason-input" />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-white/10 text-sm">{t("common.cancel")}</button>
          <button type="submit" data-testid="confirm-ban-btn" className="px-4 py-2 rounded border border-red-500/50 text-red-300 hover:bg-red-500/10 font-bold text-sm">
            <Ban className="w-3 h-3 inline mr-1" /> Bannir
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function EditDialog({ target, onClose, onDone, t }) {
  const [form, setForm] = useState({
    level: target.level, xp: target.xp, aether: target.aether, reputation: target.reputation, role: target.role,
  });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${target.user_id}`, form);
      toast.success("Héros modifié"); onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="rune-border rounded-2xl p-6 max-w-md w-full space-y-3" data-testid="edit-dialog">
        <h3 className="font-display font-black text-xl text-gradient">{t("admin.edit_user")} — {target.username}</h3>
        {["level", "xp", "aether", "reputation"].map((f) => (
          <div key={f}>
            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1 block">{f}</label>
            <input type="number" value={form[f]} onChange={(e) => setForm({ ...form, [f]: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid={`edit-${f}`} />
          </div>
        ))}
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1 block">Rôle</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="edit-role">
            <option value="user">Voyageur</option>
            <option value="moderator">Modérateur</option>
            <option value="admin">Sage (admin)</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-white/10 text-sm">{t("common.cancel")}</button>
          <button type="submit" data-testid="confirm-edit-btn" className="px-4 py-2 rounded border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 font-bold text-sm">
            {t("common.save")}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}


// ---------- Shop Admin (CRUD) ----------
function ShopAdmin() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | item object
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/shop");
      setItems(data);
    } catch { toast.error("Erreur de chargement"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const removeItem = async (sku) => {
    if (!window.confirm(`Supprimer définitivement « ${sku} » ?`)) return;
    try {
      await api.delete(`/admin/shop/${sku}`);
      toast.success("Item supprimé");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };

  const byCat = items.reduce((acc, it) => {
    (acc[it.category] = acc[it.category] || []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="shop-admin">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold text-xl ancient-text flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-yellow-400" /> Gestion de la Boutique
          </h2>
          <p className="text-xs text-zinc-500 italic mt-1">
            Les items <span className="text-cyan-400 font-bold">statiques</span> sont immuables. Les items <span className="text-yellow-400 font-bold">custom</span> peuvent être modifiés / supprimés.
          </p>
        </div>
        <button onClick={() => setEditing("new")} data-testid="shop-add-btn"
          className="px-4 py-2 rounded-md border border-yellow-500/50 text-yellow-300 font-bold font-display tracking-wide hover:shadow-[0_0_18px_rgba(255,215,0,0.4)] flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nouvel item
        </button>
      </div>

      {loading && <div className="text-center py-8 text-zinc-500 italic">Chargement...</div>}

      {Object.keys(byCat).sort().map((cat) => (
        <div key={cat} className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold font-display border-b border-white/5 bg-white/[0.02]">
            {cat} ({byCat[cat].length})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[9px] uppercase tracking-widest text-zinc-500 border-b border-white/5">
                <th className="p-2">SKU</th>
                <th className="p-2">Nom</th>
                <th className="p-2">Rareté</th>
                <th className="p-2 text-center">Niv.</th>
                <th className="p-2 text-right">Prix</th>
                <th className="p-2 text-center">Source</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {byCat[cat].map((it) => (
                <tr key={it.sku} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]" data-testid={`shop-admin-row-${it.sku}`}>
                  <td className="p-2 font-mono-stat text-xs text-zinc-400">{it.sku}</td>
                  <td className="p-2 font-display font-bold">{it.name}</td>
                  <td className="p-2"><span className={`text-[9px] uppercase tracking-widest font-bold rarity-${it.rarity}`}>{it.rarity}</span></td>
                  <td className="p-2 text-center font-mono-stat text-cyan-300 font-bold">{it.unlock_level || 1}</td>
                  <td className="p-2 text-right font-mono-stat text-yellow-300 font-bold">{it.price}</td>
                  <td className="p-2 text-center">
                    <span className={`text-[9px] uppercase tracking-widest font-bold ${it.source === "custom" ? "text-yellow-400" : "text-cyan-400"}`}>
                      {it.source || "static"}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    {it.source === "custom" ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setEditing(it)} className="text-cyan-400 hover:text-cyan-300 p-1" title="Modifier" data-testid={`shop-edit-${it.sku}`}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeItem(it.sku)} className="text-red-400 hover:text-red-300 p-1" title="Supprimer" data-testid={`shop-delete-${it.sku}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] uppercase tracking-widest text-zinc-600">verrouillé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <AnimatePresence>
        {editing && (
          <ShopItemDialog
            item={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onDone={() => { setEditing(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ShopItemDialog({ item, onClose, onDone }) {
  const isNew = !item;
  const [form, setForm] = useState({
    sku: item?.sku || "",
    name: item?.name || "",
    category: item?.category || "cosmetic",
    price: item?.price || 100,
    icon: item?.icon || "Sparkles",
    rarity: item?.rarity || "common",
    description: item?.description || "",
    boost_type: item?.boost_type || "",
    boost_value: item?.boost_value || 0,
    duration_minutes: item?.duration_minutes || 0,
    unlock_level: item?.unlock_level || 1,
  });

  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form, price: parseInt(form.price) || 0, unlock_level: parseInt(form.unlock_level) || 1 };
    if (payload.category === "boost") {
      payload.boost_value = parseFloat(form.boost_value) || 1;
      payload.duration_minutes = parseInt(form.duration_minutes) || 60;
    } else {
      payload.boost_type = null;
      payload.boost_value = null;
      payload.duration_minutes = null;
    }
    try {
      if (isNew) {
        await api.post("/admin/shop", payload);
        toast.success(`« ${form.name} » ajouté à la boutique`);
      } else {
        await api.put(`/admin/shop/${item.sku}`, payload);
        toast.success("Item mis à jour");
      }
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="rune-border rounded-2xl p-6 max-w-lg w-full space-y-3 max-h-[90vh] overflow-y-auto" data-testid="shop-item-dialog">
        <div className="flex justify-between items-start">
          <h3 className="font-display font-black text-xl text-gradient">
            {isNew ? "Nouvel item de boutique" : `Modifier « ${item.name} »`}
          </h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <Field label="SKU (identifiant unique)" required>
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
            disabled={!isNew} placeholder="ex: cosmic_aura_special"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat disabled:opacity-50" data-testid="shop-sku" />
        </Field>

        <Field label="Nom affiché">
          <input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-name" />
        </Field>

        <Field label="Description (poétique)">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2} className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-desc" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Catégorie">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-category">
              <option value="cosmetic">Cosmétique</option>
              <option value="boost">Élixir (boost)</option>
              <option value="consumable">Consommable</option>
              <option value="kingdom">Royaume</option>
            </select>
          </Field>
          <Field label="Rareté">
            <select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-rarity">
              {["common", "rare", "epic", "legendary", "mythic", "divine", "cosmic"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix (Aether)">
            <input type="number" min="1" value={form.price} required onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat" data-testid="shop-price" />
          </Field>
          <Field label="Icône (Lucide)">
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="ex: Sparkles, Crown, Sword..." className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-icon" />
          </Field>
        </div>

        <Field label="Niveau requis pour acquérir">
          <input type="number" min="1" max="999" value={form.unlock_level} onChange={(e) => setForm({ ...form, unlock_level: e.target.value })}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat" data-testid="shop-unlock-level" />
        </Field>

        {form.category === "boost" && (
          <div className="grid grid-cols-3 gap-2 p-3 rounded-md border border-violet-500/30 bg-violet-500/5">
            <Field label="Type">
              <select value={form.boost_type} onChange={(e) => setForm({ ...form, boost_type: e.target.value })}
                className="w-full bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs" data-testid="shop-boost-type">
                <option value="xp_multiplier">XP x</option>
                <option value="aether_multiplier">Aether x</option>
                <option value="luck">Chance</option>
              </select>
            </Field>
            <Field label="Valeur">
              <input type="number" step="0.1" value={form.boost_value} onChange={(e) => setForm({ ...form, boost_value: e.target.value })}
                className="w-full bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs" data-testid="shop-boost-value" />
            </Field>
            <Field label="Durée (min)">
              <input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                className="w-full bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs" data-testid="shop-boost-duration" />
            </Field>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-white/10 text-sm">Annuler</button>
          <button type="submit" data-testid="shop-save" className="px-4 py-2 rounded border border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10 font-bold text-sm">
            {isNew ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

// ---------- Seasons Admin ----------
function SeasonsAdmin() {
  const [seasons, setSeasons] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [leaderboard, setLeaderboard] = useState({ rows: [], seasonId: null });

  const load = async () => {
    try {
      const { data } = await api.get("/seasons");
      setSeasons(data);
    } catch { toast.error("Erreur chargement saisons"); }
  };
  useEffect(() => { load(); }, []);

  const loadLB = async (sid) => {
    const { data } = await api.get(`/seasons/${sid}/leaderboard`);
    setLeaderboard({ rows: data, seasonId: sid });
  };

  const endSeason = async (sid) => {
    if (!window.confirm("Clôturer cette saison ? Les récompenses seront distribuées immédiatement.")) return;
    try {
      const { data } = await api.post(`/admin/seasons/${sid}/end`);
      toast.success(`Saison clôturée — ${data.ranked} héros récompensés`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };

  return (
    <div className="space-y-6" data-testid="seasons-admin">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold text-xl ancient-text">📅 Cycles du Cosmos</h2>
          <p className="text-xs text-zinc-500 italic mt-1">Une seule saison peut être active à la fois. Démarrer une nouvelle clôture la précédente sans distribuer ses récompenses.</p>
        </div>
        <button onClick={() => setShowCreate(true)} data-testid="open-create-season"
          className="px-4 py-2 rounded-md border border-cyan-500/50 text-cyan-300 font-bold flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nouvelle saison
        </button>
      </div>

      <div className="space-y-2">
        {seasons.length === 0 && <div className="text-center text-zinc-500 italic py-12">Aucune saison enregistrée</div>}
        {seasons.map((s) => (
          <div key={s.season_id} className={`glass rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap ${s.active ? "border-2 border-green-500/40" : ""}`} data-testid={`season-row-${s.season_id}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <h3 className="font-display font-bold">{s.name}</h3>
                {s.active && <span className="text-[10px] uppercase tracking-widest font-bold text-green-400">● Active</span>}
              </div>
              <div className="text-xs text-zinc-400 italic">{s.description || "—"}</div>
              <div className="text-[10px] font-mono-stat text-zinc-500 mt-1">
                {new Date(s.started_at).toLocaleDateString("fr-FR")} → {new Date(s.ends_at).toLocaleDateString("fr-FR")} ({s.duration_days}j)
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => loadLB(s.season_id)} className="px-3 py-1.5 rounded border border-cyan-500/40 text-cyan-300 text-xs font-bold" data-testid={`view-lb-${s.season_id}`}>Classement</button>
              {s.active && (
                <button onClick={() => endSeason(s.season_id)} className="px-3 py-1.5 rounded border border-red-500/40 text-red-300 text-xs font-bold" data-testid={`end-season-${s.season_id}`}>Clôturer</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {leaderboard.seasonId && (
        <div className="glass rounded-xl p-4">
          <div className="flex justify-between mb-3">
            <h3 className="font-display font-bold">Classement</h3>
            <button onClick={() => setLeaderboard({ rows: [], seasonId: null })}><X className="w-4 h-4 text-zinc-500" /></button>
          </div>
          {leaderboard.rows.length === 0 ? (
            <div className="text-center text-zinc-500 italic py-4">Aucun score enregistré</div>
          ) : (
            <div className="space-y-1">
              {leaderboard.rows.map((r, i) => (
                <div key={r.user_id} className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-stat text-cyan-300 font-bold w-6">#{i + 1}</span>
                    <HeroName user={r.user} size="sm" />
                  </div>
                  <span className="font-mono-stat text-violet-300 font-bold">{r.season_xp} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateSeasonDialog onClose={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await load(); }} />}
      </AnimatePresence>
    </div>
  );
}

function CreateSeasonDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", duration_days: 30 });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/seasons", { ...form, duration_days: parseInt(form.duration_days) || 30 });
      toast.success("Saison ouverte — tous les héros notifiés");
      await onCreated();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="rune-border rounded-2xl p-6 max-w-md w-full space-y-3" data-testid="create-season-dialog">
        <h3 className="font-display font-black text-xl text-gradient">Ouvrir une saison</h3>
        <input value={form.name} required minLength={3} placeholder="Nom (ex: L'Éveil du Dragon)"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="season-name" />
        <textarea value={form.description} rows={3} placeholder="Présage de cette saison..."
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="season-desc" />
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Durée (jours)</label>
          <input type="number" min="1" max="365" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat mt-1" data-testid="season-days" />
        </div>
        <div className="text-[10px] text-zinc-500 italic">
          Récompenses automatiques à la clôture : Top 1 → 5000 ✦ + badge Champion · Top 10 → 1500 ✦ + badge Elite · Top 50 → 500 ✦
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded border border-white/10 text-xs">Annuler</button>
          <button type="submit" className="px-4 py-2 rounded border border-cyan-500/40 text-cyan-300 font-bold text-sm" data-testid="season-create-submit">Ouvrir</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

