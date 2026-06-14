import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Crown, Shield, Package, Award, History, Users, BarChart3,
  MessageCircle, UserPlus, MoreHorizontal, Sword, MapPin, Sparkles,
  Trophy, Compass, Flame, Star, Eye,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/* ============================================================
   BADGE RARITY DESIGN — 7 tiers
   Each rarity has its own frame color, glow, and gradient.
============================================================ */
const RARITY = {
  common:   { fr: "Commun",    color: "#9CA3AF", glow: "rgba(156,163,175,0.5)", bg: "from-zinc-700/40 to-zinc-900/40", border: "border-zinc-500/40", text: "text-zinc-300" },
  rare:     { fr: "Rare",      color: "#3B82F6", glow: "rgba(59,130,246,0.6)",  bg: "from-blue-700/40 to-blue-900/40", border: "border-blue-400/60", text: "text-blue-300" },
  epic:     { fr: "Épique",    color: "#A855F7", glow: "rgba(168,85,247,0.7)",  bg: "from-purple-700/40 to-purple-900/40", border: "border-purple-400/60", text: "text-purple-300" },
  legendary:{ fr: "Légendaire", color: "#F59E0B", glow: "rgba(245,158,11,0.7)", bg: "from-amber-600/40 to-amber-900/40", border: "border-amber-400/60", text: "text-amber-300" },
  mythic:   { fr: "Mythique",  color: "#EF4444", glow: "rgba(239,68,68,0.75)",  bg: "from-red-700/40 to-red-900/40", border: "border-red-400/60", text: "text-red-300" },
  divine:   { fr: "Divin",     color: "#FBBF24", glow: "rgba(251,191,36,0.85)", bg: "from-yellow-400/40 to-amber-600/40", border: "border-yellow-300/80", text: "text-yellow-200" },
  cosmic:   { fr: "Cosmique",  color: "#FFFFFF", glow: "rgba(255,255,255,0.9)", bg: "from-cyan-300/40 via-purple-400/40 to-cyan-300/40", border: "border-cyan-200", text: "text-white" },
};

export function BadgeCard({ badge, size = "md" }) {
  const r = RARITY[badge.rarity] || RARITY.common;
  const sz = size === "sm" ? "w-12 h-12 text-xl" : size === "lg" ? "w-20 h-20 text-4xl" : "w-16 h-16 text-3xl";
  return (
    <div
      title={`${badge.name} — ${r.fr}`}
      className={`relative ${sz} rounded-lg ${r.border} border-2 bg-gradient-to-br ${r.bg} flex items-center justify-center cursor-pointer group transition-all hover:scale-110`}
      style={{ boxShadow: `0 0 12px ${r.glow}, inset 0 0 8px ${r.glow}` }}
      data-testid={`badge-${badge.badge_id || badge.id || badge.name}`}
    >
      <span className="drop-shadow-lg">{badge.icon || "✨"}</span>
      {badge.rarity === "cosmic" && (
        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-300 via-purple-400 to-cyan-300 opacity-30 animate-pulse" />
        </div>
      )}
      {badge.rarity === "divine" && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] text-yellow-300">✦</div>
      )}
    </div>
  );
}

/* ============================================================
   HERO CARD MODAL
============================================================ */
const TABS = [
  { id: "overview",  label: "Aperçu",      icon: Crown },
  { id: "info",      label: "Infos",       icon: BarChart3 },
  { id: "inventory", label: "Inventaire",  icon: Package },
  { id: "badges",    label: "Badges",      icon: Award },
  { id: "history",   label: "Historique",  icon: History },
  { id: "relations", label: "Relations",   icon: Users },
];

const CLASS_HEX = {
  mage: "#9D4CDD", warrior: "#EF4444", assassin: "#71717A", paladin: "#EAB308",
  alchemist: "#10B981", explorer: "#00BFFF", necromancer: "#7928CA",
  architect: "#A855F7", chronomancer: "#00E5FF", inventor: "#FFD700",
};

const RANKS = [
  { id: "elu_cosmique",    label: "Élu Cosmique",    icon: "✨", color: "#9D4CDD" },
  { id: "legende_vivante", label: "Légende Vivante", icon: "👑", color: "#FFD700" },
  { id: "roi_des_createurs",label: "Roi des Créateurs", icon: "🔥", color: "#EF4444" },
  { id: "seigneur_du_temps", label: "Seigneur du Temps", icon: "❄", color: "#00E5FF" },
];

export default function HeroCard({ userId, open, onClose }) {
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    setTab("overview");
    api.get(`/users/${userId}/card`)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Impossible de charger la carte héros"))
      .finally(() => setLoading(false));
  }, [open, userId]);

  const u = data?.user;
  const classColor = u?.class_id ? CLASS_HEX[u.class_id] || "#9D4CDD" : "#9D4CDD";

  // Pixel-art sprite preview via canvas (cheap re-rasterization)
  const spritePreview = useMemo(() => {
    if (!u) return null;
    return drawPixelHeroDataURL(u.class_id || "explorer", u.role || "user", classColor);
  }, [u, classColor]);

  const sendFriendRequest = async () => {
    try {
      await api.post(`/friends/request/${userId}`);
      toast.success("Demande d'amitié envoyée");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Impossible d'envoyer la demande");
    }
  };
  const sendMessage = () => {
    toast.info("Message privé : utilisez Chuchoter dans le Nexus");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={onClose} data-testid="hero-card-modal">
          <motion.div
            initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[90vh] bg-gradient-to-br from-[#0F0820] via-[#0A0613] to-[#1A0B3D] border border-purple-500/40 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(157,76,221,0.4)]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-transparent">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-300" />
                <span className="font-display font-black text-lg uppercase tracking-widest text-purple-200">Carte Héros</span>
              </div>
              <button onClick={onClose} data-testid="hero-card-close"
                className="w-8 h-8 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading || !u ? (
              <div className="p-16 text-center text-zinc-400">Chargement de la carte...</div>
            ) : (
              <div className="flex flex-col lg:flex-row h-[calc(90vh-3.5rem)]">
                {/* ===== LEFT — Avatar + Info ===== */}
                <aside className="lg:w-72 shrink-0 border-r border-white/10 bg-black/30 flex flex-col">
                  <div className="p-5 text-center border-b border-white/10">
                    <h2 className="font-display font-black text-3xl mb-1"
                        style={{ color: classColor, textShadow: `0 0 20px ${classColor}` }}>
                      {u.username}
                    </h2>
                    {u.active_title && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/40 text-xs text-purple-200 mt-1">
                        <Crown className="w-3 h-3" /> {prettifyTitle(u.active_title)}
                      </div>
                    )}
                    {/* Pixel sprite preview */}
                    <div className="mt-4 mx-auto w-44 h-44 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-black/50 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-30">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,76,221,0.3),transparent_70%)] animate-pulse" />
                      </div>
                      {spritePreview && (
                        <img src={spritePreview} alt="hero"
                          className="relative z-10 pixelated"
                          style={{ imageRendering: "pixelated", width: 96, height: 128 }} />
                      )}
                      {/* Halo ring */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full opacity-50"
                        style={{ background: `radial-gradient(ellipse, ${classColor}, transparent)` }} />
                    </div>
                  </div>

                  {/* Level + XP */}
                  <div className="p-4 border-b border-white/10">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Niveau</div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-stat text-4xl font-black text-white">{u.level || 1}</span>
                      <span className="text-zinc-400 text-xs">{u.rank || "Novice"}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all"
                        style={{ width: `${Math.min(100, Math.round(((u.xp || 0) / Math.max(1, u.xp_next || 1)) * 100))}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500 font-mono">
                      XP : {u.xp || 0}{u.xp_next ? ` / ${u.xp_next}` : ""}
                    </div>
                  </div>

                  <div className="p-4 space-y-2 text-xs flex-1 overflow-y-auto">
                    <InfoRow label="Pseudo"   v={u.username} />
                    <InfoRow label="Classe"   v={u.class_name} valueColor={classColor} />
                    <InfoRow label="Faction"  v="NEXORIA" />
                    <InfoRow label="Guilde"   v={data.guild?.name || "—"} valueColor={data.guild?.color || "#10B981"} />
                    <InfoRow label="Inscription" v={u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"} />
                    <InfoRow label="Dernière connexion" v={data.location ? <span className="text-green-400">En ligne</span> : "Hors-ligne"} />
                    <InfoRow label="Localisation" v={data.location ? prettyRoom(data.location.room) : "—"} valueColor="#00E5FF" />
                  </div>

                  {!data.is_self && (
                    <div className="p-3 border-t border-white/10 flex gap-2 flex-wrap">
                      <button onClick={sendFriendRequest} data-testid="hero-card-add-friend"
                        className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-200 text-xs font-bold flex items-center justify-center gap-1">
                        <UserPlus className="w-3 h-3" /> Ajouter ami
                      </button>
                      <button onClick={sendMessage} data-testid="hero-card-message"
                        className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1">
                        <MessageCircle className="w-3 h-3" /> Message
                      </button>
                    </div>
                  )}
                </aside>

                {/* ===== RIGHT — Tabs ===== */}
                <main className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex gap-0.5 border-b border-white/10 bg-black/30 px-2 overflow-x-auto">
                    {TABS.map((t) => {
                      const Ico = t.icon;
                      const active = tab === t.id;
                      return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                          data-testid={`hero-tab-${t.id}`}
                          className={`px-3 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border-b-2 transition-all whitespace-nowrap ${active ? "border-purple-400 text-purple-300 bg-purple-500/5" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                          <Ico className="w-3 h-3" /> {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex-1 overflow-y-auto p-5">
                    {tab === "overview" && (
                      <OverviewTab data={data} u={u} classColor={classColor} />
                    )}
                    {tab === "info" && (
                      <InfoTab u={u} guild={data.guild} location={data.location} />
                    )}
                    {tab === "inventory" && (
                      <InventoryTab inv={data.inventory} />
                    )}
                    {tab === "badges" && (
                      <BadgesTab badges={data.badges} />
                    )}
                    {tab === "history" && (
                      <HistoryTab chronicles={data.chronicles} />
                    )}
                    {tab === "relations" && (
                      <RelationsTab data={data} />
                    )}
                  </div>
                </main>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============== Subcomponents ============== */
function InfoRow({ label, v, valueColor }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-white/5">
      <span className="text-zinc-500 uppercase tracking-widest text-[10px]">{label}</span>
      <span className="font-bold" style={{ color: valueColor || "#E4E4E7" }}>{v}</span>
    </div>
  );
}

function OverviewTab({ data, u, classColor }) {
  const badges = data.badges || [];
  return (
    <div className="space-y-5">
      <Section title="Titres & Rangs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RANKS.map((r, i) => (
            <div key={r.id} className="text-center p-3 rounded-lg border border-white/10 bg-gradient-to-br from-purple-900/20 to-black/30">
              <div className="text-4xl mb-1 drop-shadow-lg" style={{ color: r.color, filter: `drop-shadow(0 0 8px ${r.color})` }}>{r.icon}</div>
              <div className="font-display font-bold text-sm" style={{ color: r.color }}>{r.label}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Rang {i + 1}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Badges (${badges.length})`} action={<span className="text-xs text-purple-300 cursor-pointer hover:text-purple-200">Voir tous</span>}>
        {badges.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 italic">Aucun badge — Explorez le monde !</div>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {badges.slice(0, 24).map((b, i) => <BadgeCard key={i} badge={b} />)}
          </div>
        )}
      </Section>

      <Section title="Statistiques">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatBlock icon={Sword} label="Combat" value={u.combat_wins || u.pvp_wins || 0} sub="Victoires" color="#EF4444" />
          <StatBlock icon={Flame} label="Boss" value={u.boss_kills || 0} sub="Vaincus" color="#A855F7" />
          <StatBlock icon={Trophy} label="Quêtes" value={u.quests_completed || 0} sub="Complétées" color="#EAB308" />
          <StatBlock icon={Compass} label="Exploration" value={`${u.exploration || 0}%`} sub="Carte" color="#00E5FF" />
          <StatBlock icon={Package} label="Collections" value={(data.inventory || []).length} sub="Objets" color="#10B981" />
        </div>
      </Section>

      <Section title="Équipement actuel">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {Array.from({ length: 8 }).map((_, i) => {
            const equipped = (u.equipment || [])[i];
            return (
              <div key={i} className={`aspect-square rounded-lg border-2 flex items-center justify-center text-2xl ${equipped ? "border-purple-400/60 bg-purple-500/10" : "border-zinc-700/40 bg-zinc-900/30"}`}>
                {equipped ? (equipped.icon || "⚔️") : <span className="text-zinc-600">—</span>}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function InfoTab({ u, guild, location }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <InfoBlock label="Pseudo" value={u.username} />
      <InfoBlock label="Titre actif" value={prettifyTitle(u.active_title)} />
      <InfoBlock label="Classe" value={u.class_name} />
      <InfoBlock label="Classe secondaire" value={u.secondary_class_id || "—"} />
      <InfoBlock label="Faction" value="NEXORIA" />
      <InfoBlock label="Guilde" value={guild?.name || "Sans guilde"} />
      <InfoBlock label="Niveau" value={u.level} />
      <InfoBlock label="XP totale" value={u.xp || 0} />
      <InfoBlock label="Aether" value={`${u.aether || 0} ⟡`} />
      <InfoBlock label="Réputation" value={u.reputation || 0} />
      <InfoBlock label="Inscription" value={u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"} />
      <InfoBlock label="Localisation" value={location ? prettyRoom(location.room) : "Hors-ligne"} />
      <InfoBlock label="Followers" value={u.followers || 0} />
      <InfoBlock label="Following" value={u.following || 0} />
      <InfoBlock label="Rôle" value={u.role || "user"} />
      <InfoBlock label="Posts" value={u.posts_count || 0} />
    </div>
  );
}

function InventoryTab({ inv }) {
  if (!inv?.length) return <div className="text-center py-12 text-zinc-500 italic">Inventaire vide.</div>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {inv.map((it, i) => {
        const r = RARITY[it.rarity] || RARITY.common;
        return (
          <div key={i} className={`p-3 rounded-lg border-2 ${r.border} bg-gradient-to-br ${r.bg} text-center transition-all hover:scale-105`}
            style={{ boxShadow: `0 0 10px ${r.glow}` }}>
            <div className="text-3xl mb-1">{it.icon || "✨"}</div>
            <div className={`text-xs font-bold ${r.text} truncate`}>{it.name}</div>
            <div className="text-[9px] uppercase tracking-widest text-zinc-500 mt-1">{r.fr}</div>
          </div>
        );
      })}
    </div>
  );
}

function BadgesTab({ badges }) {
  if (!badges?.length) return <div className="text-center py-12 text-zinc-500 italic">Aucun badge débloqué.</div>;
  // Group by rarity
  const groups = {};
  badges.forEach((b) => { (groups[b.rarity || "common"] = groups[b.rarity || "common"] || []).push(b); });
  const order = ["cosmic", "divine", "mythic", "legendary", "epic", "rare", "common"];
  return (
    <div className="space-y-5">
      {order.filter((r) => groups[r]).map((r) => {
        const cfg = RARITY[r];
        return (
          <div key={r}>
            <div className={`text-[10px] uppercase tracking-[0.3em] font-bold mb-2 ${cfg.text}`}>
              {cfg.fr} ({groups[r].length})
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {groups[r].map((b, i) => <BadgeCard key={i} badge={b} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ chronicles }) {
  if (!chronicles?.length) return <div className="text-center py-12 text-zinc-500 italic">Aucun historique.</div>;
  return (
    <div className="space-y-2">
      {chronicles.map((c, i) => (
        <div key={i} className="p-3 rounded-lg border-l-2 border-purple-500/60 bg-purple-500/5">
          <div className="text-zinc-200 text-sm">{c.text}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

function RelationsTab({ data }) {
  return (
    <div className="space-y-5">
      <Section title="Aperçu social">
        <div className="grid grid-cols-3 gap-3">
          <StatBlock icon={Users} label="Amis" value={data.friends_count || 0} sub="Acceptés" color="#10B981" />
          <StatBlock icon={Shield} label="Guilde" value={data.guild?.name || "—"} sub={data.guild?.rank || ""} color="#A855F7" />
          <StatBlock icon={Star} label="Followers" value={data.user.followers || 0} sub="Influence" color="#EAB308" />
        </div>
      </Section>
      <div className="text-center text-xs text-zinc-500 italic">
        Plus de détails sur les relations seront ajoutés (P5).
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-cyan-300">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="p-3 rounded-lg border border-white/10 bg-white/5">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="font-mono text-cyan-200 text-sm font-bold truncate mt-1">{value ?? "—"}</div>
    </div>
  );
}

function StatBlock({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="p-3 rounded-lg border border-white/10 bg-gradient-to-br from-black/40 to-purple-900/10 text-center">
      <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
      <div className="font-display font-black text-xl" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">{label}</div>
      {sub && <div className="text-[9px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ====== Helpers ====== */
function prettifyTitle(t) {
  if (!t) return "Novice";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function prettyRoom(r) {
  const map = {
    place_centrale: "Place Centrale", taverne_etoilee: "Taverne Étoilée",
    marche_astral: "Marché Astral", quartier_guildes: "Quartier des Guildes",
    arene: "Arène Cosmique", vallee_boss: "Vallée des Boss",
    hall_legendes: "Hall des Légendes", bibliotheque_infinie: "Bibliothèque Infinie",
    archives: "Archives", sanctuaire_oracle: "Sanctuaire de l'Oracle",
    sanctuaire_failles: "Sanctuaire des Failles",
    laboratoire_alchimistes: "Laboratoire", atelier_inventeurs: "Atelier",
    temple_temps: "Temple du Temps", necropole: "Nécropole",
    jardin_songes: "Jardin des Songes", observatoire: "Observatoire",
    camp_aventuriers: "Camp des Aventuriers", chambre_reliques: "Chambre des Reliques",
    pantheon: "Panthéon", nexus_cosmique: "Nexus Cosmique", salle_conseil: "Salle du Conseil",
  };
  return map[r] || r;
}

/* Generate a pixel-art hero sprite at 24×32 via Canvas — same logic as Phaser ensureCharTexture.
   Returns a base64 PNG data URL. */
function drawPixelHeroDataURL(classId, role, classColorHex) {
  const W = 24, H = 32;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const px = (x, y, color, a = 1) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = a;
    ctx.fillRect(x, y, 1, 1);
    ctx.globalAlpha = 1;
  };
  const bodyColor = classColorHex || "#9D4CDD";
  const outline = role === "admin" ? "#FFD700" : role === "moderator" ? "#F97316" : "#0A0613";
  const skin = "#F5D0A9";
  const hair = role === "admin" ? "#FFD700" : role === "moderator" ? "#F97316" : "#1F1B2E";

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(W / 2, H - 2, 7, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // legs
  for (let y = 22; y < 28; y++) {
    px(W / 2 - 3, y, "#1F1B2E");
    px(W / 2 - 2, y, bodyColor);
    px(W / 2 + 1, y, bodyColor);
    px(W / 2 + 2, y, "#1F1B2E");
  }
  for (let y = 28; y < 30; y++) {
    for (let x = W / 2 - 4; x <= W / 2 - 1; x++) px(x, y, "#000000");
    for (let x = W / 2; x <= W / 2 + 3; x++) px(x, y, "#000000");
  }
  // torso outline + fill
  for (let y = 13; y < 22; y++) { px(W / 2 - 5, y, outline); px(W / 2 + 4, y, outline); }
  for (let x = W / 2 - 4; x <= W / 2 + 3; x++) { px(x, 13, outline); px(x, 22, outline); }
  for (let y = 14; y < 22; y++) for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, y, bodyColor);
  for (let x = W / 2 - 3; x <= W / 2; x++) px(x, 15, "#FFFFFF", 0.25);
  px(W / 2, 17, "#FFFFFF", 0.9);
  px(W / 2, 19, "#FFFFFF", 0.9);
  // arms
  for (let y = 14; y < 21; y++) {
    px(W / 2 - 6, y, outline); px(W / 2 - 5, y, bodyColor);
    px(W / 2 + 4, y, bodyColor); px(W / 2 + 5, y, outline);
  }
  px(W / 2 - 6, 20, skin); px(W / 2 - 5, 21, skin);
  px(W / 2 + 5, 20, skin); px(W / 2 + 4, 21, skin);
  // neck
  for (let y = 11; y < 13; y++) for (let x = W / 2 - 2; x <= W / 2 + 1; x++) px(x, y, skin);
  // head outline + fill
  for (let y = 4; y < 11; y++) { px(W / 2 - 5, y, "#000000"); px(W / 2 + 4, y, "#000000"); }
  for (let x = W / 2 - 4; x <= W / 2 + 3; x++) { px(x, 3, "#000000"); px(x, 11, "#000000"); }
  for (let y = 4; y < 11; y++) for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, y, skin);
  for (let x = W / 2 - 4; x <= W / 2 + 3; x++) { px(x, 4, hair); px(x, 5, hair); }
  px(W / 2 - 4, 6, hair); px(W / 2 + 3, 6, hair);
  px(W / 2 - 2, 7, "#000000"); px(W / 2 + 1, 7, "#000000");
  px(W / 2 - 1, 9, "#000000"); px(W / 2, 9, "#000000");

  if (role === "admin") {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 2, "#FFD700");
    px(W / 2 - 4, 1, "#FFD700");
    px(W / 2 - 1, 0, "#FFD700");
    px(W / 2 + 2, 0, "#FFD700");
    px(W / 2 + 4, 1, "#FFD700");
  } else if (role === "moderator") {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 3, "#F97316");
  }
  return c.toDataURL("image/png");
}
