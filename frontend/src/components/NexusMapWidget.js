/**
 * NEXORIA — Interactive Nexus Map (Aperçu du Monde).
 * Rooms positioned on a stylized fantasy map. Real-time player counts via Socket.io.
 */
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Maximize2, Sparkles, Skull } from "lucide-react";
import api from "@/lib/api";
import { useNexusSocket } from "@/contexts/NexusSocketContext";

// Fixed positions (in % of map container) for known rooms
const ROOM_POSITIONS = {
  place_centrale:        { x: 50, y: 50, color: "#9D4CDD", emoji: "🏰", short: "Place\nCentrale" },
  hall_legendes:         { x: 50, y: 18, color: "#EAB308", emoji: "🏛", short: "Hall des\nLégendes" },
  bibliotheque_infinie:  { x: 22, y: 22, color: "#3B82F6", emoji: "📚", short: "Bibliothèque" },
  quartier_guildes:      { x: 78, y: 28, color: "#A855F7", emoji: "🏰", short: "Quartier\nGuildes" },
  laboratoire:           { x: 14, y: 50, color: "#10B981", emoji: "⚗️", short: "Laboratoire" },
  taverne_etoilee:       { x: 28, y: 78, color: "#F59E0B", emoji: "🍺", short: "Taverne" },
  sanctuaire_oracle:     { x: 28, y: 62, color: "#06B6D4", emoji: "🧙", short: "Sanctuaire\nOracle" },
  arene:                 { x: 50, y: 80, color: "#EF4444", emoji: "⚔️", short: "Arène\nCosmique" },
  marche_astral:         { x: 86, y: 50, color: "#EAB308", emoji: "💎", short: "Marché\nAstral" },
  sanctuaire_failles:    { x: 72, y: 70, color: "#EC4899", emoji: "🌀", short: "Sanctuaire\nFailles" },
  vallee_boss:           { x: 14, y: 82, color: "#7C2D12", emoji: "🐉", short: "Vallée\ndes Boss" },
  atelier_inventeurs:    { x: 84, y: 82, color: "#8B5CF6", emoji: "🛠", short: "Atelier" },
  jardin_celeste:        { x: 62, y: 32, color: "#22C55E", emoji: "🌿", short: "Jardin\nCéleste" },
  forge_eternelle:       { x: 38, y: 32, color: "#F97316", emoji: "🔥", short: "Forge\nÉternelle" },
};

// Edges to draw — gives a "world map" feel
const EDGES = [
  ["place_centrale", "hall_legendes"],
  ["place_centrale", "bibliotheque_infinie"],
  ["place_centrale", "quartier_guildes"],
  ["place_centrale", "laboratoire"],
  ["place_centrale", "marche_astral"],
  ["place_centrale", "arene"],
  ["place_centrale", "sanctuaire_oracle"],
  ["place_centrale", "sanctuaire_failles"],
  ["place_centrale", "forge_eternelle"],
  ["place_centrale", "jardin_celeste"],
  ["laboratoire", "bibliotheque_infinie"],
  ["arene", "vallee_boss"],
  ["arene", "sanctuaire_failles"],
  ["sanctuaire_failles", "atelier_inventeurs"],
  ["sanctuaire_oracle", "taverne_etoilee"],
  ["quartier_guildes", "hall_legendes"],
];

export default function NexusMapWidget() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();
  const { presence, openNexus } = useNexusSocket() || {};
  const byRoom = presence?.by_room || {};

  const enterNexus = () => {
    openNexus?.();
    navigate("/nexus");
  };

  useEffect(() => {
    api.get("/nexus/rooms-public").then((r) => setRooms(r.data || [])).catch(() => {});
  }, []);

  const positionedRooms = useMemo(() => {
    return rooms
      .filter((r) => ROOM_POSITIONS[r.id])
      .map((r) => ({
        ...r,
        ...ROOM_POSITIONS[r.id],
        online: byRoom[r.id] || 0,
      }));
  }, [rooms, byRoom]);

  const totalOnline = positionedRooms.reduce((acc, r) => acc + r.online, 0);
  const activeRooms = positionedRooms.filter((r) => r.online > 0).length;

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-violet-400/30 backdrop-blur-xl"
      style={{
        background:
          "radial-gradient(ellipse at 30% 20%, rgba(157,76,221,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0,229,255,0.10) 0%, transparent 55%), linear-gradient(180deg, rgba(15,8,32,0.95), rgba(8,4,16,0.95))",
        boxShadow:
          "0 0 40px rgba(157,76,221,0.18), inset 0 0 24px rgba(0,229,255,0.06)",
      }}
      data-testid="nexus-map-widget"
    >
      {/* Header */}
      <div className="relative flex items-center justify-between gap-3 p-4 border-b border-violet-400/20">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg border border-violet-400/40 flex items-center justify-center"
            style={{ background: "radial-gradient(circle, rgba(157,76,221,0.4), transparent 70%)", boxShadow: "0 0 14px rgba(157,76,221,0.55)" }}
          >
            <MapPin className="w-4 h-4 text-violet-200" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-violet-300 font-bold">Aperçu du Monde</div>
            <div className="font-display font-black text-lg text-white">Carte du Nexus — Salles en Temps Réel</div>
          </div>
        </div>
        <button
          type="button"
          onClick={enterNexus}
          data-testid="map-enter-nexus"
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-400/50 text-cyan-200 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-cyan-500/10 transition-all"
        >
          <Maximize2 className="w-3 h-3" /> Entrer
        </button>
      </div>

      {/* Map canvas */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", minHeight: "420px" }}>
        {/* SVG edges */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="edgeGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9D4CDD" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#9D4CDD" stopOpacity="0.55" />
            </linearGradient>
            <filter id="edgeGlow">
              <feGaussianBlur stdDeviation="0.4" />
            </filter>
          </defs>
          {EDGES.map(([a, b], i) => {
            const A = ROOM_POSITIONS[a];
            const B = ROOM_POSITIONS[b];
            if (!A || !B) return null;
            return (
              <g key={i}>
                <line
                  x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                  stroke="url(#edgeGradient)"
                  strokeWidth="0.25"
                  strokeDasharray="0.6 0.4"
                  filter="url(#edgeGlow)"
                  opacity="0.85"
                />
              </g>
            );
          })}
        </svg>

        {/* Decorative stars / runes */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          {Array.from({ length: 40 }).map((_, i) => {
            const x = (i * 37) % 100;
            const y = (i * 53) % 100;
            return (
              <span
                key={i}
                className="absolute text-cyan-200 text-[10px]"
                style={{ left: `${x}%`, top: `${y}%`, opacity: 0.4 + ((i * 7) % 5) / 10 }}
              >
                ✦
              </span>
            );
          })}
        </div>

        {/* Room nodes */}
        {positionedRooms.map((r, idx) => (
          <RoomNode key={r.id} room={r} delay={idx * 0.06} />
        ))}

        {/* Empty state */}
        {positionedRooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 italic">
            Chargement de la carte du monde...
          </div>
        )}
      </div>

      {/* Footer KPIs */}
      <div className="grid grid-cols-3 border-t border-violet-400/20">
        <FooterStat icon={Sparkles} label="Héros présents" value={totalOnline} color="#00E5FF" testid="map-foot-online" />
        <FooterStat icon={MapPin} label="Salles actives" value={activeRooms} color="#9D4CDD" testid="map-foot-active" />
        <FooterStat icon={Skull} label="Salles totales" value={rooms.length} color="#EAB308" testid="map-foot-total" />
      </div>
    </div>
  );
}

function RoomNode({ room, delay }) {
  const isLive = room.online > 0;
  const thumb = room.thumb_url ? room.thumb_url : null;
  return (
    <Link
      to="/nexus"
      data-testid={`map-room-${room.id}`}
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
      style={{ left: `${room.x}%`, top: `${room.y}%` }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay }}
        className="relative flex flex-col items-center text-center"
      >
        {/* Glow halo */}
        <div
          className={`absolute -inset-3 rounded-full blur-2xl ${isLive ? "animate-pulse" : ""}`}
          style={{ background: `${room.color}66`, opacity: isLive ? 0.85 : 0.35 }}
        />
        {/* Node with scene thumbnail */}
        <div
          className="relative w-16 h-16 rounded-xl border-2 overflow-hidden transition-transform group-hover:scale-110"
          style={{
            borderColor: `${room.color}`,
            boxShadow: `0 0 18px ${room.color}88, inset 0 0 8px ${room.color}55`,
          }}
        >
          {thumb ? (
            <>
              <img
                src={thumb}
                alt={room.name}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, transparent 30%, ${room.color}66 90%)`,
                  mixBlendMode: "multiply",
                }}
              />
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xl"
                style={{ filter: `drop-shadow(0 0 4px ${room.color})` }}
              >
                {room.emoji}
              </span>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-2xl"
              style={{ background: `radial-gradient(circle, ${room.color}33, rgba(8,4,16,0.85))` }}>
              <span style={{ filter: `drop-shadow(0 0 4px ${room.color})` }}>{room.emoji}</span>
            </div>
          )}
          {isLive && (
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-[#0F0820] animate-pulse"
              style={{ boxShadow: "0 0 6px rgba(74,222,128,0.9)" }}
            />
          )}
        </div>
        {/* Label */}
        <div className="relative mt-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-white/10 text-[9px] uppercase tracking-[0.15em] font-bold text-white whitespace-pre-line leading-tight">
          {room.short || room.name}
        </div>
        {/* Player count */}
        <div
          className="relative mt-0.5 text-[10px] font-mono-stat font-black"
          style={{ color: room.color, textShadow: `0 0 6px ${room.color}` }}
        >
          {room.online} joueur{room.online > 1 ? "s" : ""}
        </div>
      </motion.div>
    </Link>
  );
}

function FooterStat({ icon: Icon, label, value, color, testid }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" data-testid={testid}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}22`, boxShadow: `0 0 12px ${color}44 inset` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-bold">{label}</div>
        <div className="font-mono-stat font-black text-base text-white">{value}</div>
      </div>
    </div>
  );
}
