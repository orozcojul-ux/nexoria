import React from "react";
import { Zap } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import HomePanel from "./HomePanel";
import { fmtNum } from "./home-constants";

function StatBox({ value, label, tone = "" }) {
  return (
    <div className="feed-stat-box">
      <div className={`feed-stat-val ${tone}`} key={value}>{fmtNum(value)}</div>
      <div className="feed-stat-lbl">{label}</div>
    </div>
  );
}

export default function HomeRealmPulse({ siteOnline, visits, events, signups, updatedAt }) {
  const { t } = useI18n();

  return (
    <div className="feed-col-widget" data-testid="dashboard-stats">
      <HomePanel
        label={t("feed.realm_pulse")}
        color="var(--home-cyan)"
        icon={Zap}
        variant="cyan"
        extra={<span className="feed-live-dot" />}
      >
        <div className="feed-stats-grid">
          <StatBox value={siteOnline} label={t("feed.stat.online")} tone="feed-stat-val--cyan" key={`s-${siteOnline}-${updatedAt}`} />
          <StatBox value={visits} label={t("feed.stat.visits")} tone="feed-stat-val--violet" key={`v-${visits}-${updatedAt}`} />
          <StatBox value={events} label={t("feed.stat.events")} tone="feed-stat-val--gold" key={`e-${events}-${updatedAt}`} />
          <StatBox value={signups} label={t("feed.signups_short")} tone="feed-stat-val--green" key={`i-${signups}-${updatedAt}`} />
        </div>
      </HomePanel>
    </div>
  );
}
