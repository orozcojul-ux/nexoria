import React from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare, ScrollText, Sparkles, Castle, Users, Flame, ChevronRight,
} from "lucide-react";
import { PremiumCard } from "@/components/ui-premium";
import { useI18n } from "@/i18n/LanguageProvider";
import { translateChallenge } from "@/lib/translate-game";

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

function ChallengeCard({ challenge, compact = false, t }) {
  const c = translateChallenge(t, challenge);
  const tone = TONE_STYLES[c.tone] || TONE_STYLES.violet;
  const Icon = ICONS[c.icon] || Flame;
  const pct = Math.min(100, c.percent ?? ((c.progress / Math.max(1, c.target)) * 100));

  return (
    <Link
      to={c.link || "/events"}
      className={`block rounded-lg border ${tone.border} bg-black/25 p-3 transition-colors hover:bg-white/[0.03]`}
      data-testid={`community-challenge-${c.challenge_id}`}
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
            {t("feed.challenge_tag")}
          </div>
          <h4 className="font-display font-bold text-sm text-white leading-snug mt-0.5">
            {c.name}
          </h4>
          {!compact && c.description && (
            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
              {c.description}
            </p>
          )}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono-stat mb-1">
              <span className="text-zinc-500">{c.action_label}</span>
              <span className={tone.label}>
                {c.progress?.toLocaleString()} / {c.target?.toLocaleString()}
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
  const { t } = useI18n();
  const visible = challenges.slice(0, limit);
  if (visible.length === 0) return null;

  return (
    <PremiumCard tone="violet" testid={testid} className="!border-[var(--nx-border)] !bg-[var(--nx-surface)]">
      <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold mb-3 flex items-center gap-1.5">
        <Flame className="w-3 h-3" /> {t("feed.challenges_title")}
      </div>
      <div className="space-y-2">
        {visible.map((c) => (
          <ChallengeCard key={c.challenge_id} challenge={c} compact={compact} t={t} />
        ))}
      </div>
      <Link
        to="/events"
        className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-violet-300 hover:text-violet-200"
      >
        {t("feed.all_challenges")} <ChevronRight className="w-3 h-3" />
      </Link>
    </PremiumCard>
  );
}
