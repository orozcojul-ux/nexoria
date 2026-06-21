import React from "react";
import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import HomePanel from "./HomePanel";
import { QUICK_LINKS } from "./home-constants";

export default function HomeQuickAccess() {
  const { t } = useI18n();

  return (
    <div className="feed-col-widget" data-testid="feed-quick-actions">
      <HomePanel label={t("feed.quick_access")} icon={Target}>
        <div className="feed-quick-grid">
          {QUICK_LINKS.map(({ to, labelKey, label, icon: Icon, color, bg }) => (
            <Link key={to} to={to} className="feed-quick-link" data-testid={`quick-link-${to}`}>
              <div className="feed-quick-link-icon" style={{ background: bg, border: `1px solid ${color}40` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <span className="truncate">{t(labelKey) !== labelKey ? t(labelKey) : label}</span>
            </Link>
          ))}
        </div>
      </HomePanel>
    </div>
  );
}
