import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { Network, Star } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import {
  PageShell,
  PremiumStat,
  PremiumCard,
} from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";

export default function SkillTree() {
  const { user, refresh } = useAuth();
  const banner = usePageBanner("skills");
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    api.get("/game/skills").then((r) => setSkills(r.data));
  }, []);

  if (!user) return null;

  const allocated = user.skills_allocated || {};
  const allocate = async (skillId) => {
    if ((user.skill_points || 0) <= 0) {
      toast.error("Aucune étoile à allumer. Montez en niveau...");
      return;
    }
    try {
      await api.post("/skills/allocate", { skill_id: skillId });
      sfx.success();
      toast.success("Une étoile s'éveille dans votre constellation");
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  return (
    <PageShell
      testid="skill-tree-page"
      banner={banner}
    >
      <div className="flex justify-center mb-6">
        <PremiumStat icon={Star} label="Étoiles à allumer" value={user.skill_points || 0} tone="violet" testid="skill-points" />
      </div>

      <div className="relative min-h-[500px]">
        {/* Constellation lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 800 600">
          <defs>
            <linearGradient id="skillLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9D4CDD" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.4" />
            </linearGradient>
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="400" cy="300" r="120" fill="url(#centerGlow)" />
          {skills.map((_, i) => {
            const angle = (i * 360) / skills.length - 90;
            const rad = (angle * Math.PI) / 180;
            const cx = 400 + Math.cos(rad) * 250;
            const cy = 300 + Math.sin(rad) * 220;
            return <line key={i} x1="400" y1="300" x2={cx} y2={cy} stroke="url(#skillLine)" strokeWidth="1.5" strokeDasharray="4 4" className="constellation-line" />;
          })}
          {/* Outer connecting arcs */}
          {skills.map((_, i) => {
            const a1 = (i * 360) / skills.length - 90;
            const a2 = ((i + 1) * 360) / skills.length - 90;
            const r1 = (a1 * Math.PI) / 180;
            const r2 = (a2 * Math.PI) / 180;
            const x1 = 400 + Math.cos(r1) * 250;
            const y1 = 300 + Math.sin(r1) * 220;
            const x2 = 400 + Math.cos(r2) * 250;
            const y2 = 300 + Math.sin(r2) * 220;
            return <line key={`arc${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(157,76,221,0.15)" strokeWidth="0.8" />;
          })}
        </svg>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* Center anchor */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border-2 border-cyan-500/40 items-center justify-center flex-col z-10 backdrop-blur-md animate-glow">
            <Network className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.9)]" />
            <div className="text-[9px] uppercase tracking-[0.3em] text-cyan-400 font-bold mt-1">Cœur</div>
          </div>

          {skills.map((s, i) => {
            const I = Lucide[s.icon] || Lucide.Star;
            const lvl = allocated[s.id] || 0;
            const canAllocate = (user.skill_points || 0) > 0;
            return (
              <motion.button
                key={s.id}
                onClick={() => allocate(s.id)}
                disabled={!canAllocate}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={canAllocate ? { scale: 1.04, y: -2 } : undefined}
                className="text-left w-full"
                data-testid={`skill-${s.id}`}
              >
              <PremiumCard tone="violet" hover={canAllocate} className={!canAllocate ? "opacity-90" : ""}>
                {/* Hexagonal etheric symbol */}
                <div className="flex items-start justify-between mb-3">
                  <div className="relative w-14 h-14">
                    <svg viewBox="0 0 40 40" className="absolute inset-0">
                      <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="none" stroke={s.color} strokeWidth="1.2" opacity={lvl > 0 ? 1 : 0.4} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center" style={{ filter: lvl > 0 ? `drop-shadow(0 0 8px ${s.color})` : "none" }}>
                      <I className="w-5 h-5" style={{ color: s.color }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-stat text-2xl font-bold leading-none" style={{ color: s.color }}>{lvl}</div>
                    <div className="text-[8px] uppercase tracking-[0.3em] text-zinc-500 font-bold mt-1">Étoiles</div>
                  </div>
                </div>
                <div className="font-display font-bold text-base mb-1 tracking-wide">{s.name}</div>
                <div className="text-xs text-zinc-400 leading-snug italic">{s.description}</div>
                {canAllocate && (
                  <div className="mt-3 text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    + Allumer une étoile
                  </div>
                )}
              </PremiumCard>
              </motion.button>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
