import React from "react";
import { motion } from "framer-motion";

/** Portail dimensionnel NEXORIA — 100 % CSS/SVG, aucune image externe */
export default function NexusMaintenancePortal() {
  return (
    <div className="relative w-full h-full min-h-[320px] lg:min-h-[520px] flex items-center justify-center pointer-events-none select-none" aria-hidden>
      {/* Halo cosmique */}
      <motion.div
        className="absolute w-[min(420px,85vw)] h-[min(420px,85vw)] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(138,43,226,0.35) 0%, rgba(0,229,255,0.08) 45%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Anneaux du portail */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: 140 + i * 52,
            height: 140 + i * 52,
            borderColor: i % 2 === 0 ? "rgba(138,43,226,0.45)" : "rgba(0,229,255,0.3)",
            boxShadow: `0 0 ${18 + i * 10}px rgba(138,43,226,${0.12 + i * 0.06})`,
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 14 + i * 5, repeat: Infinity, ease: "linear" }}
        />
      ))}

      {/* Vortex */}
      <motion.div
        className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full opacity-80"
        style={{
          background: "conic-gradient(from 0deg, transparent, rgba(167,139,250,0.7), rgba(0,229,255,0.45), transparent, rgba(252,211,77,0.25), transparent)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      {/* Noyau */}
      <div
        className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full z-10"
        style={{
          background: "radial-gradient(circle, #e9d5ff 0%, #8A2BE2 35%, #1A0B3D 70%, transparent 100%)",
          boxShadow: "0 0 60px rgba(138,43,226,0.85), 0 0 100px rgba(0,229,255,0.35)",
        }}
      />

      {/* Runes orbitales */}
      {["◇", "◆", "◇", "◆", "◇", "◆"].map((r, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 118;
        return (
          <motion.span
            key={i}
            className="absolute text-[10px] text-cyan-300/70 font-mono z-20"
            style={{
              left: `calc(50% + ${Math.cos(angle) * radius}px)`,
              top: `calc(50% + ${Math.sin(angle) * radius}px)`,
              transform: "translate(-50%, -50%)",
              textShadow: "0 0 8px rgba(0,229,255,0.8)",
            }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.35 }}
          >
            {r}
          </motion.span>
        );
      })}

      {/* Cristaux flottants */}
      {[
        { x: "-28%", y: "-18%", c: "#a78bfa", s: 14 },
        { x: "32%", y: "-22%", c: "#00E5FF", s: 10 },
        { x: "-35%", y: "28%", c: "#00E5FF", s: 12 },
        { x: "30%", y: "30%", c: "#FCD34D", s: 16 },
      ].map((cr, i) => (
        <motion.div
          key={i}
          className="absolute z-20"
          style={{
            left: `calc(50% + ${cr.x})`,
            top: `calc(50% + ${cr.y})`,
            width: cr.s,
            height: cr.s * 1.5,
            background: `linear-gradient(180deg, ${cr.c}cc, ${cr.c}33)`,
            clipPath: "polygon(50% 0%, 85% 35%, 70% 100%, 30% 100%, 15% 35%)",
            filter: `drop-shadow(0 0 10px ${cr.c}88)`,
          }}
          animate={{ y: [0, -12, 0], rotate: [0, 6, -4, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <p className="absolute bottom-4 sm:bottom-8 text-[9px] uppercase tracking-[0.45em] text-violet-300/50 font-bold z-20">
        Faille dimensionnelle — suspendue
      </p>
    </div>
  );
}
