import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CircleDot, Sparkles, Clock, Crown, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { useI18n } from "@/i18n/LanguageProvider";

function formatCooldown(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export default function HomeNexusWheelBanner() {
  const { t } = useI18n();
  const [status, setStatus] = useState(null);

  const load = useCallback(() => {
    api.get("/nexus-wheel/status")
      .then((r) => setStatus(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!status || status.canSpin || !(status.secondsRemaining > 0)) return undefined;
    const id = setInterval(() => {
      setStatus((prev) => {
        if (!prev || prev.canSpin) return prev;
        const next = Math.max(0, (prev.secondsRemaining || 0) - 1);
        return {
          ...prev,
          secondsRemaining: next,
          canSpin: next <= 0,
          spinsRemaining: next <= 0 ? (prev.dailySpinLimit ?? 1) : prev.spinsRemaining,
        };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status?.canSpin, status?.secondsRemaining]);

  const canSpin = Boolean(status?.canSpin);
  const spinsRemaining = Math.max(0, Number(status?.spinsRemaining) || 0);
  const isVip = Boolean(status?.isVip);

  return (
    <motion.div
      className="feed-wheel-banner"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      data-testid="home-nexus-wheel-banner"
    >
      <div className="feed-wheel-banner-glow" aria-hidden />
      <div className="feed-wheel-banner-inner">
        <div className="feed-wheel-banner-visual" aria-hidden>
          <div className="feed-wheel-banner-disc">
            <div className="feed-wheel-banner-disc-ring" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <span
                key={i}
                className="feed-wheel-banner-seg"
                style={{ transform: `rotate(${i * 45}deg)` }}
              />
            ))}
            <div className="feed-wheel-banner-hub">
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>
          </div>
          <div className="feed-wheel-banner-pointer" />
        </div>

        <div className="feed-wheel-banner-copy">
          <span className="feed-wheel-banner-kicker">
            <CircleDot className="w-3.5 h-3.5" />
            {t("feed.wheel.kicker")}
          </span>
          <h2 className="feed-wheel-banner-title">{t("feed.wheel.title")}</h2>
          <p className="feed-wheel-banner-desc">
            {isVip ? t("feed.wheel.desc_vip") : t("feed.wheel.desc")}
          </p>
          <div className="feed-wheel-banner-tags">
            <span>{t("feed.wheel.tag_ecus")}</span>
            <span>{t("feed.wheel.tag_xp")}</span>
            <span>{t("feed.wheel.tag_chests")}</span>
            <span>{t("feed.wheel.tag_badges")}</span>
          </div>
        </div>

        <div className="feed-wheel-banner-cta">
          {canSpin ? (
            <span className="feed-wheel-banner-status feed-wheel-banner-status--ready">
              {spinsRemaining > 1
                ? t("feed.wheel.spins_available", { count: spinsRemaining })
                : t("feed.wheel.spin_ready")}
            </span>
          ) : (
            <span className="feed-wheel-banner-status feed-wheel-banner-status--wait">
              <Clock className="w-3.5 h-3.5" />
              {formatCooldown(status?.secondsRemaining)}
            </span>
          )}
          {isVip && (
            <span className="feed-wheel-banner-vip">
              <Crown className="w-3.5 h-3.5" />
              {t("feed.wheel.vip_pass")}
            </span>
          )}
          <Link to="/nexus-wheel" className="feed-wheel-banner-btn" data-testid="home-nexus-wheel-cta">
            {canSpin ? t("feed.wheel.spin_cta") : t("feed.wheel.view_cta")}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
