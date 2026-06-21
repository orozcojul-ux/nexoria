import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Scroll } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import HomePanel from "./HomePanel";

function QuestItem({ quest }) {
  const displayProgress = quest.completed ? quest.target : quest.progress;
  const pct = quest.completed ? 100 : Math.min(100, (quest.progress / quest.target) * 100);
  return (
    <div className="feed-quest-item" data-testid={`feed-quest-${quest.quest_id || quest.user_id_quest_id}`}>
      <div className="feed-quest-head">
        <span className="truncate">{quest.name}</span>
        <span className="feed-quest-counter">{displayProgress}/{quest.target}</span>
      </div>
      <div className="feed-quest-track">
        <div
          className={`feed-quest-fill ${quest.completed ? "feed-quest-fill--done" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function HomeDailyQuests({ quests = [] }) {
  const { t } = useI18n();

  return (
    <div className="feed-col-widget" data-testid="feed-daily-quests">
      <HomePanel label={t("feed.daily_quests")} color="var(--home-green)" icon={Scroll} variant="emerald">
        {quests.length === 0 ? (
          <div className="feed-empty feed-empty--compact" data-testid="feed-quests-empty">
            {t("feed.quests_empty")}
          </div>
        ) : (
          quests.map((q) => <QuestItem key={q.quest_id || q.user_id_quest_id} quest={q} />)
        )}
        <Link to="/quests" className="feed-widget-more" style={{ color: "var(--home-green)" }}>
          {t("feed.all_quests")} <ChevronRight className="w-3 h-3" />
        </Link>
      </HomePanel>
    </div>
  );
}
