/**
 * NEXORIA — Classes (sanctuaire des héros).
 * Showcase of all 10 RPG classes using the premium design system.
 */
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import { Sword, Crown, ArrowRight, Sparkles, Filter, X } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import StarField from "@/components/StarField";
import {
  PremiumHero,
  PremiumSection,
  PremiumCard,
  PremiumButton,
  PremiumModal,
  PremiumStat,
} from "@/components/ui-premium";

const STAT_LABEL = {
  creativity: "Créativité",
  persistence: "Persévérance",
  curiosity: "Curiosité",
  leadership: "Leadership",
  sociability: "Sociabilité",
  ambition: "Ambition",
  expertise: "Expertise",
  discovery: "Découverte",
};

function IconByName({ name, className }) {
  const Cmp = Lucide[name] || Lucide.Sparkles;
  return <Cmp className={className} />;
}

export default function Classes() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [statFilter, setStatFilter] = useState("all");

  useEffect(() => {
    api.get("/game/classes").then((r) => setClasses(r.data || []));
  }, []);

  const filtered = useMemo(() => {
    if (statFilter === "all") return classes;
    return classes.filter((c) => Object.keys(c.stat_bonus || {}).includes(statFilter));
  }, [classes, statFilter]);

  return (
    <div className="min-h-screen relative" data-testid="classes-page">
      <StarField density={50} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* HERO */}
        <PremiumHero
          kicker="Sanctuaire des Héros"
          title={<>Choisis ta <span className="text-gradient">Voie</span></>}
          subtitle="Dix archétypes anciens t'attendent. Chacun forge un destin unique au sein de NEXORIA — ses bonus définissent ton ascension."
          image="/shop/armure_cosmique.png"
          height={300}
          testid="classes-hero"
        >
          {user?.class_name && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 text-cyan-200 text-xs font-bold uppercase tracking-widest">
              <Crown className="w-3.5 h-3.5" />
              Ta classe actuelle : {user.class_name}
            </div>
          )}
        </PremiumHero>

        {/* STATS OVERVIEW */}
        <PremiumSection title="Codex des Voies" subtitle="10 archétypes — 8 affinités" icon={Sword} tone="violet">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <PremiumStat icon={Sword} label="Archétypes" value={classes.length} sub="Voies disponibles" tone="violet" testid="stat-classes" />
            <PremiumStat icon={Sparkles} label="Affinités" value={8} sub="Statistiques cosmiques" tone="cyan" testid="stat-stats" />
            <PremiumStat icon={Crown} label="Rangs" value={999} sub="Niveau maximal" tone="gold" testid="stat-ranks" />
            <PremiumStat icon={Filter} label="Builds" value="∞" sub="Combinaisons possibles" tone="emerald" testid="stat-builds" />
          </div>

          {/* AFFINITY FILTER */}
          <div className="flex items-center gap-2 flex-wrap" data-testid="classes-filter">
            <button
              onClick={() => setStatFilter("all")}
              data-testid="filter-all"
              className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider transition-all ${
                statFilter === "all"
                  ? "border-cyan-400/70 text-cyan-200 bg-cyan-500/15"
                  : "border-white/10 text-zinc-400 hover:border-white/30"
              }`}
            >
              Toutes
            </button>
            {Object.entries(STAT_LABEL).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setStatFilter(k)}
                data-testid={`filter-${k}`}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider transition-all ${
                  statFilter === k
                    ? "border-purple-400/70 text-purple-200 bg-purple-500/15"
                    : "border-white/10 text-zinc-400 hover:border-white/30"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </PremiumSection>

        {/* CLASS GRID */}
        <PremiumSection title="Les Dix Voies" subtitle={`${filtered.length} affiché(s)`} icon={Crown} tone="gold">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4" data-testid="classes-grid">
            <AnimatePresence>
              {filtered.map((c, i) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <ClassCard cls={c} onSelect={() => setActiveClass(c)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </PremiumSection>

        {/* CTA */}
        {!user && (
          <PremiumCard tone="violet" className="text-center" hover={false}>
            <Crown className="w-10 h-10 text-yellow-300 mx-auto mb-2" />
            <h2 className="font-display font-black text-2xl text-white mb-1">Forge ton héros</h2>
            <p className="text-zinc-400 text-sm mb-4 max-w-xl mx-auto">
              Crée ton compte pour choisir ta classe et débuter ton ascension dans NEXORIA.
            </p>
            <Link to="/register">
              <PremiumButton variant="gold" size="lg" icon={ArrowRight} testid="cta-register">
                Forger mon personnage
              </PremiumButton>
            </Link>
          </PremiumCard>
        )}
      </div>

      <ClassModal cls={activeClass} onClose={() => setActiveClass(null)} />
    </div>
  );
}

function ClassCard({ cls, onSelect }) {
  const accent = cls.color || "#9D4CDD";
  const topStats = Object.entries(cls.stat_bonus || {}).sort((a, b) => b[1] - a[1]);
  return (
    <button
      onClick={onSelect}
      data-testid={`class-card-${cls.id}`}
      className="group relative w-full text-left rounded-2xl border bg-gradient-to-br from-[#0F0820]/95 via-[#0A0613]/95 to-[#1A0B3D]/80 backdrop-blur p-5 overflow-hidden transition-all hover:scale-[1.03]"
      style={{ borderColor: `${accent}55`, boxShadow: `0 0 30px ${accent}22, inset 0 0 12px ${accent}11` }}
    >
      {/* Aurora glow */}
      <div
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity"
        style={{ background: accent }}
      />
      {/* Sigil */}
      <div className="relative flex items-center justify-between mb-3">
        <div
          className="w-14 h-14 rounded-xl border-2 flex items-center justify-center"
          style={{
            borderColor: `${accent}80`,
            background: `radial-gradient(circle, ${accent}33, transparent 70%)`,
            boxShadow: `0 0 18px ${accent}66, inset 0 0 10px ${accent}33`,
          }}
        >
          <IconByName name={cls.icon} className="w-7 h-7" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: accent }}>
          #{cls.id}
        </div>
      </div>
      <div className="relative">
        <h3 className="font-display font-black text-xl text-white">{cls.name}</h3>
        <p className="text-xs text-zinc-400 italic mt-1 min-h-[2.5em]">{cls.tagline}</p>
        <div className="mt-3 space-y-1.5">
          {topStats.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-300 uppercase tracking-wider font-bold">{STAT_LABEL[k] || k}</span>
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: i < v ? accent : "rgba(255,255,255,0.10)" }}
                  />
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold">
          <span className="text-zinc-500">Voir le grimoire</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" style={{ color: accent }} />
        </div>
      </div>
    </button>
  );
}

function ClassModal({ cls, onClose }) {
  if (!cls) return null;
  const accent = cls.color || "#9D4CDD";
  const stats = Object.entries(cls.stat_bonus || {}).sort((a, b) => b[1] - a[1]);
  return (
    <PremiumModal open={!!cls} onClose={onClose} title={cls.name} icon={Sword} testid="class-modal" maxWidth="max-w-2xl">
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center shrink-0"
            style={{
              borderColor: `${accent}80`,
              background: `radial-gradient(circle, ${accent}33, transparent 70%)`,
              boxShadow: `0 0 24px ${accent}88`,
            }}
          >
            <IconByName name={cls.icon} className="w-10 h-10 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: accent }}>
              Voie ancienne
            </div>
            <h2 className="font-display font-black text-3xl text-white">{cls.name}</h2>
            <p className="text-zinc-400 italic text-sm">{cls.tagline}</p>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300 font-bold mb-3">
            Affinités cosmiques
          </div>
          <div className="space-y-2">
            {stats.map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <div className="w-32 text-xs uppercase tracking-wider font-bold text-zinc-300">
                  {STAT_LABEL[k] || k}
                </div>
                <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(v / 3) * 100}%`,
                      background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                      boxShadow: `0 0 10px ${accent}`,
                    }}
                  />
                </div>
                <div className="font-mono-stat text-sm font-bold" style={{ color: accent }}>
                  +{v}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2">
            Conseils du Maître de Jeu
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Les héros de la voie <span className="font-bold" style={{ color: accent }}>{cls.name}</span> excellent
            dans les actions liées à leurs affinités cosmiques. Investis tes points de talent dans l'<em>Arbre des Voies</em>
            pour multiplier ces bonus, et grave ton nom dans le Hall des Légendes.
          </p>
        </div>
      </div>
    </PremiumModal>
  );
}
