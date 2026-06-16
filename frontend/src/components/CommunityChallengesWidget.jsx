import React from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare, ScrollText, Sparkles, Castle, Users, Flame, ChevronRight,
} from "lucide-react";
import { PremiumCard } from "@/components/ui-premium";

const ICONS = {
  MessageSquare,
  ScrollText,
  Sparkles,
  Castle,
  Users,
};

const TONE_STYLES = {
  violet: {
    border: "border-violet-500/30",
    label: "text-violet-300",
    bar: "from-violet-600 to-fuchsia-400",
    glow: "rgba(139,92,246,0.35)",
  },
  cyan: {
    border: "border-cyan-500/30",
    label: "text-cyan-300",
    bar: "from-cyan-600 to-sky-400",
    glow: "rgba(34,211,238,0.35)",
  },
  amber: {
    border: "border-amber-500/30",
    label: "text-amber-300",
    bar: "from-amber-600 to-orange-400",
    glow: "rgba(245,158,11,0.35)",
  },
  gold: {
    border: "border-yellow-500/30",
    label: "text-yellow-300",
    bar: "from-yellow-600 to-amber-400",
    glow: "rgba(234,179,8,0.35)",
  },
  emerald: {
    border: "border-emerald-500/30",
    label: "text-emerald-300",
    bar: "from-emerald-600 to-teal-400",
    glow: "rgba(52,211,153,0.35)",
  },
  red: {
    border: "border-red-500/30",
    label: "text-red-300",
    bar: "from-red-700 to-amber-500",
    glow: "rgba(239,68,68,0.35)",
  },
};

function ChallengeCard({ challenge, compact = false }) {
  const tone = TONE_STYLES[challenge.tone] || TONE_STYLES.violet;
  const Icon = ICONS[challenge.icon] || Flame;
  const pct = Math.min(100, challenge.percent ?? ((challenge.progress / Math.max(1, challenge.target)) * 100));

  return (
    <Link
      to={challenge.link || "/events"}
      className={`block rounded-lg border ${tone.border} bg-black/25 p-3 transition-colors hover:bg-white/[0.03]`}
      data-testid={`community-challenge-${challenge.challenge_id}`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
          style={{ boxShadow: `0 0 12px ${tone.glow}` }}
        >
          <Icon className={`w-3.5 h-3.5 ${tone.label}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[9px] uppercase tracking-widest font-bold ${tone.label}`}>
            Défi communautaire
          </div>
          <h4 className="font-display font-bold text-sm text-white leading-snug mt-0.5">
            {challenge.name}
          </h4>
          {!compact && challenge.description && (
            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
              {challenge.description}
            </p>
          )}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono-stat mb-1">
              <span className="text-zinc-500">{challenge.action_label}</span>
              <span className={tone.label}>
                {challenge.progress?.toLocaleString()} / {challenge.target?.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.04]">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tone.bar} transition-all duration-700`}
                style={{ width: `${pct}%`, boxShadow: `0 0 10px ${tone.glow}` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CommunityChallengesWidget({
  challenges = [],
  limit = 3,
  compact = false,
  testid = "community-challenges-widget",
}) {
  const visible = challenges.slice(0, limit);
  if (visible.length === 0) return null;

  return (
    <PremiumCard tone="violet" testid={testid} className="!border-[var(--nx-border)] !bg-[var(--nx-surface)]">
      <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold mb-3 flex items-center gap-1.5">
        <Flame className="w-3 h-3" /> Défis du royaume
      </div>
      <div className="space-y-2">
        {visible.map((c) => (
          <ChallengeCard key={c.challenge_id} challenge={c} compact={compact} />
        ))}
      </div>
      <Link
        to="/events"
        className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-violet-300 hover:text-violet-200"
      >
        Tous les défis <ChevronRight className="w-3 h-3" />
      </Link>
    </PremiumCard>
  );
}
