import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Sparkles, Swords } from "lucide-react";
import api from "@/lib/api";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatMaintRelativeTime } from "@/lib/maintenance-i18n";
import { normalizeClassId } from "@/lib/translate-game";
import { CLASS_HEX } from "@/lib/NexusPixelArt";
import HeroName from "@/components/HeroName";
import HeroPixelAvatar from "@/components/HeroPixelAvatar";

const fmtXp = (n) => (n == null ? "—" : n > 9999 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString());

export default function MaintenanceRecentHeroes() {
  const { t, fmtDate } = useI18n();
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/maintenance/recent-heroes", { params: { limit: 6 } });
      setHeroes(Array.isArray(data?.heroes) ? data.heroes : []);
    } catch {
      setHeroes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="maint-panel maint-recent-heroes" data-testid="maintenance-recent-heroes">
      <h2 className="maint-panel-title maint-recent-heroes-title">
        <Sparkles className="maint-recent-heroes-title-icon" strokeWidth={2} aria-hidden />
        {t("maintenance.recentHeroes.title")}
      </h2>
      <p className="maint-recent-heroes-lead">{t("maintenance.recentHeroes.lead")}</p>

      {loading ? (
        <p className="maint-recent-heroes-empty">{t("maintenance.recentHeroes.loading")}</p>
      ) : heroes.length === 0 ? (
        <p className="maint-recent-heroes-empty">{t("maintenance.recentHeroes.empty")}</p>
      ) : (
        <ul className="maint-recent-heroes-list">
          {heroes.map((hero, i) => {
            const classId = normalizeClassId(hero.class_id);
            const classColor = CLASS_HEX[classId] || hero.class_color || "#9CA3AF";
            const classLabel = t(`class.${classId}`, hero.class_name || classId);

            return (
              <motion.li
                key={hero.user_id}
                className="maint-recent-hero-row"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                style={{ "--hero-accent": classColor }}
              >
                <div className="maint-recent-hero-avatar" aria-hidden>
                  <HeroPixelAvatar user={hero} size={36} />
                </div>
                <div className="maint-recent-hero-main">
                  <div className="maint-recent-hero-head">
                    <HeroName user={hero} size="xs" showIcon={false} />
                    <span className="maint-recent-hero-level">
                      {t("maintenance.recentHeroes.level", { level: hero.level ?? 1 })}
                    </span>
                  </div>
                  <div className="maint-recent-hero-meta">
                    <span className="maint-recent-hero-class">{classLabel}</span>
                    <span className="maint-recent-hero-sep" aria-hidden>·</span>
                    <span className="maint-recent-hero-xp">
                      <Swords className="maint-recent-hero-xp-icon" strokeWidth={2} aria-hidden />
                      {fmtXp(hero.xp)} {t("common.xp")}
                    </span>
                  </div>
                  <p className="maint-recent-hero-joined">
                    <Clock className="maint-recent-hero-joined-icon" strokeWidth={2} aria-hidden />
                    {t("maintenance.recentHeroes.joined")}{" "}
                    {formatMaintRelativeTime(hero.created_at, t, fmtDate)}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
