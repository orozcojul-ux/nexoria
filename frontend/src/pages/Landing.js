import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe2, Sword, Crown, Sparkles, Users, Trophy, Flame, Shield,
  Zap, Eye, ArrowRight, MessageCircle, Lock,
} from "lucide-react";
import { PremiumButton, PremiumStat, PremiumSection, PremiumCard, PremiumHero } from "@/components/ui-premium";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import StarField from "@/components/StarField";

const ROOM_THEMES = {
  place_centrale: { icon: "🏰", bg: "from-purple-900/60 via-violet-800/40 to-indigo-900/60", accent: "#9D4CDD" },
  hall_legendes: { icon: "🏛", bg: "from-amber-700/60 via-purple-800/40 to-amber-900/60", accent: "#FCD34D" },
  sanctuaire_oracle: { icon: "🧙", bg: "from-fuchsia-700/60 via-purple-900/40 to-fuchsia-900/60", accent: "#E879F9" },
  arene: { icon: "⚔️", bg: "from-cyan-700/60 via-blue-900/40 to-cyan-900/60", accent: "#00E5FF" },
  quartier_guildes: { icon: "🛡", bg: "from-emerald-700/60 via-indigo-900/40 to-emerald-900/60", accent: "#10B981" },
  laboratoire_alchimistes: { icon: "⚗️", bg: "from-green-700/60 via-emerald-900/40 to-green-900/60", accent: "#34D399" },
  sanctuaire_failles: { icon: "🌀", bg: "from-cyan-600/60 via-purple-900/40 to-cyan-900/60", accent: "#00E5FF" },
  nexus_cosmique: { icon: "🌌", bg: "from-purple-900/80 via-black/60 to-cyan-900/40", accent: "#FFFFFF" },
  bibliotheque_infinie: { icon: "📚", bg: "from-purple-700/60 via-indigo-900/40 to-purple-900/60", accent: "#A78BFA" },
  vallee_boss: { icon: "🐉", bg: "from-red-800/60 via-orange-900/40 to-red-900/60", accent: "#EF4444" },
  marche_astral: { icon: "💎", bg: "from-amber-600/60 via-purple-800/40 to-amber-900/60", accent: "#FCD34D" },
  atelier_inventeurs: { icon: "🛠", bg: "from-orange-700/60 via-amber-900/40 to-orange-900/60", accent: "#FBBF24" },
};
const FEATURED_ROOMS = [
  "place_centrale", "hall_legendes", "sanctuaire_oracle", "arene",
  "quartier_guildes", "laboratoire_alchimistes", "sanctuaire_failles",
  "nexus_cosmique", "bibliotheque_infinie", "vallee_boss",
  "marche_astral", "atelier_inventeurs",
];

export default function Landing() {
  const ns = useNexusSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({ heroes: 0, guilds: 0, events: 0 });
  const [heroCount, setHeroCount] = useState(0);

  useEffect(() => {
    // Use public endpoint so visitors also see the live world
    api.get("/nexus/rooms-public").then((r) => setRooms(r.data || [])).catch(() => {});
    api.get("/stats/public").then((r) => setStats(r.data || {})).catch(() => {});
  }, []);

  useEffect(() => {
    setHeroCount(ns?.presence?.total || 0);
  }, [ns?.presence?.total]);

  const openNexus = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    ns?.setOverlayOpen?.(true);
  };

  const onlineFor = (id) => rooms.find((x) => x.id === id)?.online || 0;
  const totalActiveRooms = rooms.filter((r) => (r.online || 0) > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0613] via-[#05030D] to-[#1A0B3D] relative overflow-hidden" data-testid="landing-page">
      <StarField density={80} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* ===== HERO ===== */}
        <PremiumHero
          kicker="Univers MMORPG social"
          title={<>Bienvenue dans <span className="text-gradient">NEXORIA</span></>}
          subtitle="Une plateforme MMORPG sociale premium. Choisis ta classe, rejoins une guilde, explore les 22 sanctuaires du Nexus et grave ta légende dans le cosmos."
          image="/shop/armure_cosmique.png"
          height={360}
          testid="landing-hero">
          <div className="mt-4 flex flex-wrap gap-3">
            <PremiumButton variant="violet" size="lg" icon={Sword} onClick={openNexus} testid="cta-play">
              Jouer maintenant
            </PremiumButton>
            <PremiumButton variant="cyan" size="lg" icon={Globe2} onClick={openNexus} testid="cta-nexus">
              Entrer dans le Nexus
            </PremiumButton>
            <a href={process.env.REACT_APP_DISCORD_URL || "https://discord.gg/RC5QjcWDCH"}
               target="_blank" rel="noreferrer" data-testid="cta-discord">
              <PremiumButton variant="ghost" size="lg" icon={MessageCircle}>
                Discord
              </PremiumButton>
            </a>
          </div>
        </PremiumHero>

        {/* ===== LIVE STATS ===== */}
        <PremiumSection title="Pulsation du Nexus" subtitle="Mise à jour en temps réel" icon={Zap} tone="cyan">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PremiumStat icon={Users}  label="Héros connectés" value={heroCount} sub="En ligne maintenant" tone="cyan" testid="stat-heroes" />
            <PremiumStat icon={Globe2} label="Salles actives"   value={totalActiveRooms} sub={`${rooms.length} au total`} tone="violet" testid="stat-rooms" />
            <PremiumStat icon={Shield} label="Guildes"          value={stats.guilds || 0} sub="Bannières dressées" tone="emerald" testid="stat-guilds" />
            <PremiumStat icon={Trophy} label="Événements"       value={stats.events || 0} sub="En cours" tone="gold" testid="stat-events" />
          </div>
        </PremiumSection>

        {/* ===== INTERACTIVE NEXUS MAP — Floating Islands ===== */}
        <PremiumSection title="Carte du Nexus" subtitle="12 sanctuaires phares — monde vivant en temps réel" icon={Globe2} tone="violet"
          action={user
            ? <PremiumButton variant="cyan" size="sm" icon={ArrowRight} onClick={openNexus} testid="map-enter">Entrer maintenant</PremiumButton>
            : <PremiumButton variant="gold" size="sm" icon={Lock} onClick={() => navigate("/login")} testid="map-login-cta">Se connecter pour entrer</PremiumButton>}>
          <div className="relative" data-testid="landing-nexus-map">
            {/* Connecting glow lines (decorative) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="20" y1="20" x2="80" y2="80" stroke="url(#g1)" strokeWidth="0.15" strokeDasharray="0.5 0.5" />
              <line x1="80" y1="20" x2="20" y2="80" stroke="url(#g1)" strokeWidth="0.15" strokeDasharray="0.5 0.5" />
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0%" stopColor="#9D4CDD" /><stop offset="100%" stopColor="#00E5FF" />
                </linearGradient>
              </defs>
            </svg>
            <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {FEATURED_ROOMS.map((id, idx) => {
                const r = rooms.find((x) => x.id === id);
                const theme = ROOM_THEMES[id] || ROOM_THEMES.place_centrale;
                const online = onlineFor(id);
                const isLive = online > 0;
                const hasBoss = (r?.event?.kind === "boss") || (id === "arene" && Math.random() > 0.7);
                return (
                  <motion.button
                    key={id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    whileHover={{ y: -8, scale: 1.04 }}
                    onClick={openNexus}
                    data-testid={`landing-room-${id}`}
                    className={`relative text-left rounded-2xl border-2 overflow-hidden group transition-all`}
                    style={{
                      borderColor: `${theme.accent}66`,
                      boxShadow: isLive ? `0 0 30px ${theme.accent}55, inset 0 0 24px ${theme.accent}22`
                                        : `0 0 14px ${theme.accent}22`,
                    }}>
                    {/* Layered island background — uses curated scene art when available */}
                    {r?.thumb_url ? (
                      <>
                        <img
                          src={r.thumb_url}
                          alt={r.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0"
                          style={{ background: `linear-gradient(180deg, transparent 0%, rgba(3,3,8,0.45) 60%, rgba(3,3,8,0.85) 100%)` }} />
                        <div className="absolute inset-0 opacity-50"
                          style={{ background: `radial-gradient(circle at 30% 20%, ${theme.accent}55, transparent 60%)` }} />
                      </>
                    ) : (
                      <>
                        <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`} />
                        <div className="absolute inset-0 opacity-60"
                          style={{ background: `radial-gradient(circle at 30% 20%, ${theme.accent}55, transparent 60%)` }} />
                      </>
                    )}
                    {/* Floating animation icon */}
                    <motion.div
                      animate={{ y: [-3, 3, -3] }}
                      transition={{ duration: 4 + idx * 0.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute right-3 top-3 text-6xl opacity-50 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                      {theme.icon}
                    </motion.div>
                    {/* Cosmic dust */}
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="absolute w-1 h-1 rounded-full animate-pulse pointer-events-none"
                        style={{
                          top: `${15 + i * 20}%`, left: `${10 + i * 15}%`,
                          background: theme.accent,
                          boxShadow: `0 0 8px ${theme.accent}`,
                          animationDelay: `${i * 0.4}s`,
                        }} />
                    ))}
                    {/* Content */}
                    <div className="relative p-4 pt-14 min-h-[180px] flex flex-col justify-end">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {isLive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En ligne
                          </span>
                        )}
                        {hasBoss && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-red-300 px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40">
                            ⚔ Boss actif
                          </span>
                        )}
                      </div>
                      <div className="font-display font-black text-base text-white drop-shadow-lg truncate">{r?.name || id}</div>
                      <div className="text-[11px] text-zinc-200 line-clamp-2 mt-0.5 min-h-[28px] drop-shadow">{r?.description || ""}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="font-mono-stat font-black text-base" style={{ color: theme.accent }}>
                          {online}<span className="text-zinc-400 text-xs"> /{r?.max_players || 50}</span>
                          <span className="text-zinc-500 text-[10px] ml-1">joueurs</span>
                        </span>
                        <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </PremiumSection>

        {/* ===== QUICK NAVIGATION ===== */}
        <PremiumSection title="Explorer l'univers" icon={Sparkles} tone="gold">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="landing-nav-grid">
            <NavTile to="/classes"     icon={Sword}      label="Classes"     tone="violet" />
            <NavTile to="/guilds"      icon={Shield}     label="Guildes"     tone="emerald" />
            <NavTile to="/rankings"    icon={Trophy}     label="Classements" tone="gold" />
            <NavTile to="/events"      icon={Flame}      label="Événements"  tone="red" />
            <NavTile to="/shop"        icon={Sparkles}   label="Boutique"    tone="violet" />
            <NavTile to="/oracle"      icon={Eye}        label="Oracle"      tone="cyan" />
          </div>
        </PremiumSection>

        {/* ===== FOOTER CTA ===== */}
        <PremiumCard tone="violet" className="text-center" hover={false}>
          <Crown className="w-10 h-10 text-yellow-300 mx-auto mb-2" />
          <h2 className="font-display font-black text-2xl text-white mb-1">Rejoins la légende</h2>
          <p className="text-zinc-400 text-sm mb-4 max-w-xl mx-auto">
            Plus de {stats.heroes || heroCount || "—"} héros ont déjà commencé leur ascension. Quelle sera la tienne ?
          </p>
          <PremiumButton variant="gold" size="lg" icon={ArrowRight} onClick={openNexus} testid="cta-footer">
            Commencer
          </PremiumButton>
        </PremiumCard>
      </div>
    </div>
  );
}

function NavTile({ to, icon: Icon, label, tone }) {
  const tones = {
    violet: "border-purple-500/40 bg-purple-500/5 text-purple-300 hover:bg-purple-500/15",
    cyan: "border-cyan-500/40 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/15",
    gold: "border-yellow-500/40 bg-yellow-500/5 text-yellow-300 hover:bg-yellow-500/15",
    red: "border-red-500/40 bg-red-500/5 text-red-300 hover:bg-red-500/15",
    emerald: "border-emerald-500/40 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/15",
  };
  return (
    <Link to={to} data-testid={`nav-${label.toLowerCase()}`}
      className={`group rounded-xl border p-4 text-center transition-all hover:scale-105 ${tones[tone] || tones.violet}`}>
      <Icon className="w-7 h-7 mx-auto mb-2" />
      <div className="font-display font-bold text-sm uppercase tracking-wider">{label}</div>
    </Link>
  );
}
