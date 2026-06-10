import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";

export default function SkillTree() {
  const { user, refresh } = useAuth();
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    api.get("/game/skills").then((r) => setSkills(r.data));
  }, []);

  if (!user) return null;

  const allocated = user.skills_allocated || {};
  const allocate = async (skillId) => {
    if ((user.skill_points || 0) <= 0) {
      toast.error("Aucun point de compétence disponible. Montez en niveau!");
      return;
    }
    try {
      await api.post("/skills/allocate", { skill_id: skillId });
      sfx.success();
      toast.success("Compétence améliorée");
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="skill-tree-page">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Voie du Héros</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">Arbre de <span className="text-gradient">Compétences</span></h1>
          <p className="text-zinc-400 mt-2 text-sm">Investissez vos points pour façonner votre style de jeu unique.</p>
        </div>
        <div className="glass rounded-xl px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Points disponibles</div>
          <div className="font-mono-stat text-3xl font-bold text-cyan-400" data-testid="skill-points">{user.skill_points || 0}</div>
        </div>
      </div>

      <div className="relative min-h-[500px]">
        {/* SVG connecting lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 800 600">
          <defs>
            <linearGradient id="skillLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9D4CDD" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Lines from center to nodes */}
          {skills.map((_, i) => {
            const angle = (i * 360) / skills.length - 90;
            const rad = (angle * Math.PI) / 180;
            const cx = 400 + Math.cos(rad) * 250;
            const cy = 300 + Math.sin(rad) * 220;
            return <line key={i} x1="400" y1="300" x2={cx} y2={cy} stroke="url(#skillLine)" strokeWidth="2" />;
          })}
        </svg>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* Center node */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border-2 border-cyan-500/40 items-center justify-center flex-col z-10 backdrop-blur-md">
            <Lucide.Sparkles className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
            <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mt-1">CORE</div>
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
                whileHover={{ scale: 1.03 }}
                className={`glass rounded-xl p-5 text-left transition-all relative overflow-hidden ${canAllocate ? "hover:shadow-[0_0_24px_rgba(0,229,255,0.2)]" : "opacity-80 cursor-not-allowed"}`}
                style={{ borderColor: lvl > 0 ? s.color : "rgba(255,255,255,0.08)" }}
                data-testid={`skill-${s.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border" style={{ borderColor: s.color, boxShadow: lvl > 0 ? `0 0 16px ${s.color}66` : "none" }}>
                    <I className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div className="font-mono-stat text-xl font-bold" style={{ color: s.color }}>{lvl}</div>
                </div>
                <div className="font-display font-bold text-base mb-1">{s.name}</div>
                <div className="text-xs text-zinc-400 leading-snug">{s.description}</div>
                {canAllocate && <div className="mt-3 text-[10px] uppercase tracking-widest text-cyan-400 font-bold">+ Investir 1 pt</div>}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 glass rounded-xl p-5 text-sm text-zinc-400">
        <strong className="text-cyan-400">Astuce :</strong> Chaque montée de niveau octroie 1 point. Diversifiez ou spécialisez selon votre style — chaque branche débloque des bonus passifs croissants.
      </div>
    </div>
  );
}
