import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { ChevronRight, Crown, Target } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import HomePanel from "./HomePanel";

const TONES = {
  violet: { border: "rgba(123,63,242,0.28)", icon: "rgba(123,63,242,0.15)", text: "#B794F6" },
  cyan:   { border: "rgba(56,232,255,0.22)", icon: "rgba(56,232,255,0.12)", text: "#38E8FF" },
  amber:  { border: "rgba(214,178,94,0.25)", icon: "rgba(214,178,94,0.12)", text: "#D6B25E" },
  gold:   { border: "rgba(214,178,94,0.25)", icon: "rgba(214,178,94,0.12)", text: "#D6B25E" },
  emerald:{ border: "rgba(60,255,158,0.25)", icon: "rgba(60,255,158,0.12)", text: "#3CFF9E" },
};

function ChallengeCard({ challenge, index, tagLabel }) {
  const Icon = LucideIcons[challenge.icon] || Target;
  const t = TONES[challenge.tone] || TONES.violet;
  const pct = Math.min(
    100,
    challenge.percent ?? ((challenge.progress / Math.max(1, challenge.target)) * 100),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="feed-challenge-card"
      style={{ borderColor: t.border }}
    >
      <div className="feed-challenge-top">
        <div className="feed-challenge-icon" style={{ background: t.icon, borderColor: t.border }}>
          <Icon className="w-3.5 h-3.5" style={{ color: t.text }} />
        </div>
        <div className="feed-challenge-copy">
          <div className="feed-challenge-tag">{tagLabel}</div>
          <div className="feed-challenge-name">{challenge.name}</div>
          {challenge.description && (
            <div className="feed-challenge-desc">{challenge.description}</div>
          )}
        </div>
      </div>
      {challenge.reward_label && (
        <div className="feed-challenge-reward">🏆 {challenge.reward_label}</div>
      )}
      <div className="feed-challenge-prog">
        <div className="feed-challenge-track">
          <div
            className="feed-challenge-fill"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg,${t.text}99,${t.text})` }}
          />
        </div>
        <span className="feed-challenge-pct" style={{ color: t.text }}>
          {challenge.progress ?? 0}/{challenge.target ?? 0}
        </span>
      </div>
    </motion.div>
  );
}

export default function HomeRealmChallenges({ challenges = [] }) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      data-testid="community-challenges-widget"
    >
      <HomePanel
        label={t("feed.challenges_title")}
        icon={Crown}
        count={challenges.length > 0 ? challenges.length : undefined}
      >
        {challenges.length === 0 ? (
          <div className="feed-empty feed-empty--compact">
            {t("feed.challenges_empty")}
          </div>
        ) : (
          <div className="feed-challenge-scroll">
            {challenges.map((c, i) => (
              <ChallengeCard
                key={c.challenge_id}
                challenge={c}
                index={i}
                tagLabel={t("feed.challenge_tag")}
              />
            ))}
          </div>
        )}
        <Link to="/events" className="feed-widget-more" style={{ color: "var(--home-gold)" }}>
          {t("feed.all_challenges")} <ChevronRight className="w-3 h-3" />
        </Link>
      </HomePanel>
    </motion.div>
  );
}
