import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe2, Sword, Crown, Sparkles, Users, Trophy, Flame, Shield,
  Zap, Eye, ArrowRight, MessageCircle,
} from "lucide-react";
import { PremiumButton, PremiumStat, PremiumSection, PremiumCard, PremiumHero } from "@/components/ui-premium";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import api from "@/lib/api";
import StarField from "@/components/StarField";

const ROOM_ICONS = {
  place_centrale: "🏰", hall_legendes: "🏛", sanctuaire_oracle: "🧙",
  arene: "⚔️", quartier_guildes: "🛡", laboratoire_alchimistes: "⚗️",
  sanctuaire_failles: "🌀", nexus_cosmique: "🌌", bibliotheque_infinie: "📚",
  vallee_boss: "🐉", marche_astral: "💎", atelier_inventeurs: "🛠",
};
const FEATURED_ROOMS = [
  "place_centrale", "hall_legendes", "sanctuaire_oracle", "arene",
  "quartier_guildes", "laboratoire_alchimistes", "sanctuaire_failles",
  "nexus_cosmique", "bibliotheque_infinie", "vallee_boss",
  "marche_astral", "atelier_inventeurs",
];

export default function Landing() {
  const ns = useNexusSocket();
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({ heroes: 0, guilds: 0, events: 0 });
  const [heroCount, setHeroCount] = useState(0);

  useEffect(() => {
    api.get("/nexus/rooms").then((r) => setRooms(r.data || [])).catch(() => {});
    api.get("/stats/public").then((r) => setStats(r.data || {})).catch(() => {});
  }, []);

  // Real-time global hero counter
  useEffect(() => {
    setHeroCount(ns?.presence?.total || 0);
  }, [ns?.presence?.total]);

  const openNexus = () => ns?.setOverlayOpen?.(true);

  // Map room id → live online count
  const onlineFor = (id) => {
    const r = rooms.find((x) => x.id === id);
    return r?.online || 0;
  };
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

        {/* ===== INTERACTIVE NEXUS MAP ===== */}
        <PremiumSection title="Carte du Nexus" subtitle="12 sanctuaires phares — clique pour entrer" icon={Globe2} tone="violet"
          action={<PremiumButton variant="cyan" size="sm" icon={ArrowRight} onClick={openNexus} testid="map-enter">Tout explorer</PremiumButton>}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="landing-nexus-map">
            {FEATURED_ROOMS.map((id) => {
              const r = rooms.find((x) => x.id === id);
              const icon = ROOM_ICONS[id] || "🌀";
              const online = onlineFor(id);
              const isLive = online > 0;
              return (
                <motion.button
                  key={id}
                  whileHover={{ y: -4, scale: 1.03 }}
                  onClick={openNexus}
                  data-testid={`landing-room-${id}`}
                  className="relative text-left rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#0F0820]/90 to-[#0A0613]/90 backdrop-blur p-4 overflow-hidden group transition-all hover:border-cyan-500/60"
                  style={{ boxShadow: isLive ? "0 0 24px rgba(0,229,255,0.25)" : "0 0 16px rgba(157,76,221,0.18)" }}>
                  <div className="absolute -right-4 -top-4 text-7xl opacity-10 group-hover:opacity-25 transition-opacity">{icon}</div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{icon}</span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                        </span>
                      )}
                    </div>
                    <div className="font-display font-black text-sm text-white truncate">{r?.name || id}</div>
                    <div className="text-[10px] text-zinc-400 line-clamp-2 mt-1 min-h-[26px]">{r?.description || ""}</div>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-cyan-300 font-mono-stat font-bold">{online}<span className="text-zinc-500"> / {r?.max_players || 50}</span></span>
                      <span className="text-zinc-500 uppercase tracking-widest">{r?.weather || "clair"}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
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
