import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Globe, Users, Sparkles, Filter, Wifi, WifiOff, Crown, ShieldCheck, Compass } from "lucide-react";
import api from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";
import StarField from "@/components/StarField";

/**
 * Atlas Éthérique — interactive constellation showing every hero in the realm.
 * Each hero is a star plotted on a deterministic position (from user_id hash).
 * Colors come from class, size from level, online status pulses.
 */

// Class -> color map (lifted from game_data, hardcoded as constants are fetched)
const CLASS_COLORS = {
  mage: "#9D4CDD",
  warrior: "#EF4444",
  assassin: "#71717A",
  paladin: "#EAB308",
  alchemist: "#10B981",
  explorer: "#00BFFF",
  necromancer: "#7928CA",
  architect: "#A855F7",
  chronomancer: "#00E5FF",
  inventor: "#FFD700",
};

const ROLE_RING = {
  admin: { stroke: "#FFD700", icon: Crown },
  moderator: { stroke: "#F97316", icon: ShieldCheck },
};

const ZONES = [
  { id: "north", label: "Plaines du Nord", x: 8, y: 12 },
  { id: "west", label: "Forêts d'Émeraude", x: 8, y: 78 },
  { id: "east", label: "Cités de Cendre", x: 80, y: 22 },
  { id: "south", label: "Marais Brumeux", x: 75, y: 80 },
  { id: "center", label: "Sanctuaire Central", x: 48, y: 50 },
];

export default function WorldMap() {
  const { t } = useI18n();
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState("all");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/world/heroes");
      setHeroes(data || []);
    } catch (e) {
      console.error("world heroes", e);
    } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return heroes.filter((h) => {
      if (classFilter !== "all" && h.class_id !== classFilter) return false;
      if (onlineOnly && !h.online) return false;
      return true;
    });
  }, [heroes, classFilter, onlineOnly]);

  const onlineCount = heroes.filter((h) => h.online).length;
  const classCounts = useMemo(() => {
    const c = {};
    heroes.forEach((h) => { c[h.class_id] = (c[h.class_id] || 0) + 1; });
    return c;
  }, [heroes]);

  const classes = Object.keys(CLASS_COLORS);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative" data-testid="world-map-page">
      <StarField density={80} />
      <div className="text-center mb-6 relative">
        <div className="flex justify-center mb-3">
          <RuneSeal icon={Globe} color="#00E5FF" size={48} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold mb-1">Atlas éthérique</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
          Carte du <span className="text-gradient">Monde</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-2 italic scroll-paragraph max-w-2xl mx-auto">
          « Chaque étoile est un héros. La pulsation indique ceux qui veillent encore. »
        </p>
        <RuneDivider className="mt-5 mb-6 max-w-md mx-auto" />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-testid="world-stats">
        <Stat icon={Users} label="Héros recensés" value={heroes.length} color="#00E5FF" />
        <Stat icon={Wifi} label="Actifs (15min)" value={onlineCount} color="#10B981" />
        <Stat icon={Sparkles} label="Affichés" value={filtered.length} color="#A855F7" />
        <Stat icon={Compass} label="Classes" value={Object.keys(classCounts).length} color="#FFD700" />
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3" data-testid="world-filters">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filtres
        </div>
        <button
          onClick={() => setClassFilter("all")}
          data-testid="filter-class-all"
          className={`px-3 py-1 rounded text-xs font-bold font-display tracking-wide border transition-all ${classFilter === "all" ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>
          Toutes ({heroes.length})
        </button>
        {classes.map((c) => classCounts[c] ? (
          <button key={c} onClick={() => setClassFilter(c)} data-testid={`filter-class-${c}`}
            className={`px-3 py-1 rounded text-xs font-bold font-display tracking-wide border transition-all ${classFilter === c ? "text-white" : "text-zinc-400 hover:text-white"}`}
            style={{
              borderColor: classFilter === c ? CLASS_COLORS[c] : "rgba(255,255,255,0.1)",
              background: classFilter === c ? `${CLASS_COLORS[c]}15` : "transparent",
              boxShadow: classFilter === c ? `0 0 14px ${CLASS_COLORS[c]}40` : "none",
            }}>
            {c} ({classCounts[c]})
          </button>
        ) : null)}
        <button
          onClick={() => setOnlineOnly(!onlineOnly)} data-testid="filter-online"
          className={`px-3 py-1 rounded text-xs font-bold font-display tracking-wide border transition-all flex items-center gap-1 ${onlineOnly ? "border-green-500/60 text-green-300 bg-green-500/10" : "border-white/10 text-zinc-400"}`}>
          {onlineOnly ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          Actifs uniquement
        </button>
      </div>

      {/* The map */}
      <div
        ref={mapRef}
        className="relative rounded-2xl overflow-hidden border border-cyan-500/20"
        style={{
          aspectRatio: "16/10",
          background: "radial-gradient(ellipse at center, rgba(0,229,255,0.06) 0%, rgba(157,76,221,0.04) 35%, #030305 80%)",
          boxShadow: "inset 0 0 80px rgba(0,229,255,0.08)",
        }}
        data-testid="world-map-canvas"
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10%" height="10%" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#00E5FF" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Concentric rune circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[40, 60, 80].map((sz) => (
            <div key={sz} className="absolute rounded-full border border-violet-500/10"
              style={{ width: `${sz}%`, height: `${sz}%`, animation: `spin ${60 + sz}s linear infinite` }} />
          ))}
        </div>

        {/* Zone labels */}
        {ZONES.map((z) => (
          <div key={z.id}
            className="absolute text-[9px] uppercase tracking-[0.35em] text-cyan-400/50 font-bold font-display pointer-events-none select-none"
            style={{ left: `${z.x}%`, top: `${z.y}%`, transform: "translate(-50%,-50%)" }}>
            {z.label}
          </div>
        ))}

        {/* Heroes plotted */}
        <AnimatePresence>
          {filtered.map((h) => {
            const color = CLASS_COLORS[h.class_id] || "#9CA3AF";
            const size = Math.min(28, 8 + Math.log2(Math.max(1, h.level)) * 2.4);
            const ring = ROLE_RING[h.role];
            return (
              <motion.button
                key={h.user_id}
                onMouseEnter={() => setHovered(h)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(h)}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${h.x}%`, top: `${h.y}%`, zIndex: hovered?.user_id === h.user_id ? 30 : 10 }}
                data-testid={`hero-marker-${h.user_id}`}
              >
                {/* Pulse ring (online) */}
                {h.online && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: color, opacity: 0.4, width: size, height: size, left: -size/2 + (size/2), top: -size/2 + (size/2) }}
                  />
                )}
                {/* Glow */}
                <span
                  className="absolute rounded-full"
                  style={{
                    width: size * 2.5, height: size * 2.5,
                    left: -size * 0.75, top: -size * 0.75,
                    background: `radial-gradient(circle, ${color}55 0%, transparent 70%)`,
                    filter: "blur(4px)",
                  }} />
                {/* Star marker */}
                <span
                  className="relative block rounded-full transition-transform group-hover:scale-150"
                  style={{
                    width: size, height: size,
                    background: `radial-gradient(circle, white 0%, ${color} 60%, ${color}88 100%)`,
                    boxShadow: ring
                      ? `0 0 ${size}px ${ring.stroke}, 0 0 4px white, inset 0 0 4px white`
                      : `0 0 ${size}px ${color}, inset 0 0 2px white`,
                    border: ring ? `1.5px solid ${ring.stroke}` : "none",
                  }}
                />
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute pointer-events-none px-3 py-2 rounded-lg glass border border-cyan-500/30 text-xs whitespace-nowrap z-40"
              style={{ left: `${hovered.x}%`, top: `${hovered.y}%`, transform: "translate(-50%, calc(-100% - 16px))" }}
              data-testid="hero-tooltip"
            >
              <div className="font-display font-bold text-white flex items-center gap-1">
                {hovered.role === "admin" && <Crown className="w-3 h-3 text-yellow-400" />}
                {hovered.role === "moderator" && <ShieldCheck className="w-3 h-3 text-orange-400" />}
                {hovered.username}
              </div>
              <div className="font-mono-stat text-[10px] text-zinc-400">
                Niv. <span className="text-cyan-300">{hovered.level}</span> · {hovered.class_name}
                {hovered.online && <span className="ml-1 text-green-400">●</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && heroes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 italic">
            Aucun héros recensé dans le royaume...
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center text-[10px] font-mono-stat uppercase tracking-widest text-zinc-500" data-testid="map-legend">
        {classes.map((c) => classCounts[c] ? (
          <div key={c} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: CLASS_COLORS[c], boxShadow: `0 0 8px ${CLASS_COLORS[c]}` }} />
            <span>{c}</span>
          </div>
        ) : null)}
      </div>

      {/* Hero detail modal */}
      <AnimatePresence>
        {selected && <HeroDetail hero={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <Icon className="w-5 h-5" style={{ color, filter: `drop-shadow(0 0 6px ${color}66)` }} />
      <div>
        <div className="font-mono-stat text-xl font-bold text-white">{value}</div>
        <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">{label}</div>
      </div>
    </div>
  );
}

function HeroDetail({ hero, onClose }) {
  const color = CLASS_COLORS[hero.class_id] || "#9CA3AF";
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        className="rune-border rounded-2xl p-6 max-w-md w-full text-center relative overflow-hidden"
        data-testid="hero-detail-modal">
        <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full blur-3xl" style={{ background: `${color}40` }} />
        <div className="relative">
          <div className="w-20 h-20 mx-auto rounded-full mb-4 flex items-center justify-center font-display font-black text-3xl"
            style={{ background: `radial-gradient(circle, white 0%, ${color} 70%)`, boxShadow: `0 0 30px ${color}` }}>
            {hero.username[0]?.toUpperCase()}
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1" style={{ color }}>{hero.class_name}</div>
          <h3 className="font-display font-black text-2xl ancient-text mb-1 flex items-center justify-center gap-2">
            {hero.role === "admin" && <Crown className="w-5 h-5 text-yellow-400" />}
            {hero.role === "moderator" && <ShieldCheck className="w-5 h-5 text-orange-400" />}
            {hero.username}
          </h3>
          <div className="font-mono-stat text-sm text-zinc-400 mb-4">
            Rang {hero.rank} · Niveau <span className="text-cyan-300 font-bold">{hero.level}</span>
            {hero.online && <span className="ml-2 text-green-400 text-xs">● actif</span>}
          </div>
          <Link to={`/profile/${hero.username}`}
            className="inline-block px-5 py-2 rounded-md border border-cyan-500/50 text-cyan-300 font-bold font-display tracking-wide hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all"
            data-testid="open-hero-profile">
            Consulter son codex →
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
