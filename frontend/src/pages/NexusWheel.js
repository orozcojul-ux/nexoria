import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Coins, Zap, Sparkles, Gem, Package, Gift, Crown, Moon, Loader2, Clock, History,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { translateWheelReward, translateWheelRewards } from "@/lib/translate-nexus-wheel";
import { sfx } from "@/lib/sfx";
import { PageShell, PremiumButton, PremiumCard, PremiumModal } from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";
import "./nexus-wheel.css";

const WHEEL_ICONS = { Coins, Zap, Sparkles, Gem, Package, Gift, Crown, Moon };
const SPIN_DURATION_MS = 4800;
const FULL_ROTATIONS = 6;

function WheelIcon({ name, className }) {
  const Icon = WHEEL_ICONS[name] || Gift;
  return <Icon className={className} aria-hidden />;
}

function formatCooldown(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function rarityClass(rarity) {
  return `nw-rarity-${rarity || "common"}`;
}

function adjustHex(hex, factor) {
  if (!hex || !hex.startsWith("#")) return hex || "#2a1f4a";
  const h = hex.slice(1);
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r = Math.round(Math.min(255, Math.max(0, r * factor)));
  g = Math.round(Math.min(255, Math.max(0, g * factor)));
  b = Math.round(Math.min(255, Math.max(0, b * factor)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default function NexusWheel() {
  const { t, fmtDate } = useI18n();
  const banner = usePageBanner("nexusWheel");
  const { user, setUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonReward, setWonReward] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const wheelRef = useRef(null);

  const rawRewards = status?.rewards || [];
  const rewards = useMemo(() => translateWheelRewards(t, rawRewards), [t, rawRewards]);
  const segmentCount = rewards.length || 11;
  const segmentAngle = 360 / segmentCount;

  const loadData = useCallback(async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        api.get("/nexus-wheel/status"),
        api.get("/nexus-wheel/history"),
      ]);
      setStatus(statusRes.data);
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch {
      toast.error(t("nexusWheel.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!status || status.canSpin || !(status.secondsRemaining > 0)) return undefined;
    const id = setInterval(() => {
      setStatus((prev) => {
        if (!prev || prev.canSpin) return prev;
        const next = Math.max(0, (prev.secondsRemaining || 0) - 1);
        if (next <= 0) {
          const limit = prev.dailySpinLimit ?? 1;
          return {
            ...prev,
            secondsRemaining: 0,
            canSpin: true,
            spinsUsed: 0,
            spinsRemaining: limit,
          };
        }
        return { ...prev, secondsRemaining: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status?.canSpin, status?.secondsRemaining]);

  const ecus = status?.ecus ?? user?.aether ?? 0;
  const canSpin = Boolean(status?.canSpin) && !spinning;
  const spinsRemaining = status?.spinsRemaining ?? (status?.canSpin ? 1 : 0);
  const dailyLimit = status?.dailySpinLimit ?? 1;

  const statusMessage = useMemo(() => {
    if (!status) return "";
    if (status.canSpin) {
      if (status.isVip && spinsRemaining > 1) {
        return t("nexusWheel.status.vipMulti", { count: spinsRemaining });
      }
      return t("nexusWheel.status.daily");
    }
    return t("nexusWheel.status.cooldown", { time: formatCooldown(status.secondsRemaining) });
  }, [status, spinsRemaining, t]);

  const spinToSegment = useCallback((segmentIndex) => {
    const offset = segmentIndex * segmentAngle + segmentAngle / 2;
    const target = FULL_ROTATIONS * 360 + (360 - offset);
    setRotation((prev) => {
      const base = prev % 360;
      return prev - base + target;
    });
  }, [segmentAngle]);

  const handleSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setWonReward(null);
    setShowPopup(false);

    try {
      const { data } = await api.post("/nexus-wheel/spin");
      spinToSegment(data.segmentIndex ?? data.reward?.segmentIndex ?? 0);

      window.setTimeout(() => {
        setWonReward(translateWheelReward(t, data.reward));
        setShowPopup(true);
        setStatus((prev) => ({
          ...prev,
          ...data,
          canSpin: data.canSpin,
          secondsRemaining: data.secondsRemaining ?? 0,
          ecus: data.ecus ?? prev?.ecus,
        }));
        if (data.ecus !== undefined && user) {
          setUser({ ...user, aether: data.ecus });
        }
        sfx.oracle?.();
        api.get("/nexus-wheel/history").then((r) => {
          setHistory(Array.isArray(r.data) ? r.data : []);
        }).catch(() => {});
        setSpinning(false);
      }, SPIN_DURATION_MS);
    } catch (err) {
      setSpinning(false);
      const detail = err?.response?.data?.detail;
      if (detail?.code === "cooldown") {
        setStatus((prev) => ({ ...prev, ...detail }));
        toast.info(t("nexusWheel.toast.cooldown"));
      } else {
        toast.error(typeof detail === "string" ? detail : t("nexusWheel.toast.refused"));
      }
    }
  };

  const conicGradient = useMemo(() => {
    if (!rewards.length) return "conic-gradient(#1a1030 0deg 360deg)";
    const parts = rewards.flatMap((r, i) => {
      const start = i * segmentAngle;
      const end = start + segmentAngle;
      const base = r.color || "#2a1f4a";
      const edge = adjustHex(base, 0.45);
      const shine = adjustHex(base, 1.18);
      const mid = start + segmentAngle * 0.52;
      return [
        `${edge} ${start}deg ${start + 1.2}deg`,
        `${base} ${start + 1.2}deg ${mid}deg`,
        `${shine} ${mid}deg ${end - 1.2}deg`,
        `${edge} ${end - 1.2}deg ${end}deg`,
      ];
    });
    return `conic-gradient(from -90deg, ${parts.join(", ")})`;
  }, [rewards, segmentAngle]);

  return (
    <PageShell banner={banner} testid="nexus-wheel-page" className="nexus-wheel-page">
      <div className="nw-layout">
        <section className="nw-main">
          <PremiumCard className="nw-status-card" testid="nexus-wheel-status">
            <div className="nw-status-row">
              <p className="nw-status-msg">{statusMessage}</p>
              <div className="nw-status-meta">
                {status?.isVip && (
                  <span className="nw-vip-badge" data-testid="nexus-wheel-vip-badge">{t("nexusWheel.vipBadge", { count: dailyLimit })}</span>
                )}
                <div className="nw-ecus-pill" data-testid="nexus-wheel-ecus">
                  <Coins className="w-4 h-4 text-amber-300" />
                  <span>{Number(ecus).toLocaleString()} {t("common.aether")}</span>
                </div>
              </div>
            </div>
            {canSpin && spinsRemaining > 0 && dailyLimit > 1 && (
              <p className="nw-spins-left" data-testid="nexus-wheel-spins-remaining">
                {t("nexusWheel.spinsLeft", { count: spinsRemaining })}
              </p>
            )}
          </PremiumCard>

          <div className="nw-wheel-stage">
            <div className="nw-wheel-ambient" aria-hidden />

            <div className="nw-wheel-frame-outer">
              <div className="nw-wheel-frame-inner">
                <div className="nw-wheel-rune-ring" aria-hidden />
                <div className="nw-wheel-pointer" aria-hidden>
                  <div className="nw-wheel-pointer-gem" />
                  <div className="nw-wheel-pointer-blade" />
                </div>

                <div
                  ref={wheelRef}
                  className={`nw-wheel-rotator ${spinning ? "nw-wheel-spinning" : ""}`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning
                      ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.85, 0.2, 1)`
                      : "none",
                  }}
                  data-testid="nexus-wheel-disc"
                >
                  <div className="nw-wheel-disc" style={{ background: conicGradient }} aria-hidden />
                  <svg className="nw-wheel-spokes" viewBox="0 0 100 100" aria-hidden>
                    {rewards.map((_, i) => {
                      const deg = i * segmentAngle - 90;
                      const rad = (deg * Math.PI) / 180;
                      return (
                        <line
                          key={`spoke-${i}`}
                          className={i % 2 === 0 ? "nw-spoke-gold" : undefined}
                          x1="50"
                          y1="50"
                          x2={50 + 47 * Math.cos(rad)}
                          y2={50 + 47 * Math.sin(rad)}
                        />
                      );
                    })}
                  </svg>
                  <div className="nw-wheel-inner-ring" aria-hidden />
                  {rewards.map((r, i) => {
                    const angle = i * segmentAngle + segmentAngle / 2 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const radius = 36;
                    const x = 50 + radius * Math.cos(rad);
                    const y = 50 + radius * Math.sin(rad);
                    return (
                      <div
                        key={r.id}
                        className={`nw-segment-label ${rarityClass(r.rarity)}`}
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
                        }}
                      >
                        <WheelIcon name={r.icon} className="w-3.5 h-3.5 shrink-0" />
                        <span>{r.label}</span>
                      </div>
                    );
                  })}
                  <div className="nw-wheel-hub">
                    <div className="nw-wheel-hub-gem" aria-hidden />
                    <Sparkles className="nw-wheel-hub-icon w-4 h-4" aria-hidden />
                  </div>
                </div>
              </div>
            </div>

            <div className="nw-wheel-pedestal" aria-hidden />
          </div>

          <div className="nw-actions">
            <PremiumButton
              variant="violet"
              size="lg"
              disabled={!canSpin || loading}
              onClick={handleSpin}
              testid="nexus-wheel-spin-btn"
              className="nw-spin-btn"
            >
              {spinning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("nexusWheel.spinning")}
                </>
              ) : canSpin ? (
                spinsRemaining > 1 ? t("nexusWheel.spinBtnMulti", { count: spinsRemaining }) : t("nexusWheel.spinBtn")
              ) : (
                <>
                  <Clock className="w-5 h-5" />
                  {formatCooldown(status?.secondsRemaining)}
                </>
              )}
            </PremiumButton>
          </div>
        </section>

        <aside className="nw-side">
          <PremiumCard className="nw-history-card" testid="nexus-wheel-history">
            <div className="nw-side-title">
              <History className="w-4 h-4 text-cyan-300" />
              <h2>{t("nexusWheel.history.title")}</h2>
            </div>
            {loading ? (
              <p className="nw-muted">{t("nexusWheel.history.loading")}</p>
            ) : history.length === 0 ? (
              <p className="nw-muted">{t("nexusWheel.history.empty")}</p>
            ) : (
              <ul className="nw-history-list">
                {history.map((entry) => {
                  const r = translateWheelReward(t, entry.reward || {});
                  return (
                    <li key={entry.spin_id} className={`nw-history-item ${rarityClass(r.rarity)}`}>
                      <WheelIcon name={r.icon} className="w-4 h-4 shrink-0 opacity-80" />
                      <div className="min-w-0 flex-1">
                        <p className="nw-history-label">{r.label}</p>
                        <p className="nw-history-date">
                          {entry.created_at ? fmtDate(entry.created_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </PremiumCard>

          <PremiumCard className="nw-rewards-card">
            <div className="nw-side-title">
              <Gift className="w-4 h-4 text-amber-300" />
              <h2>{t("nexusWheel.rewards.title")}</h2>
            </div>
            <ul className="nw-rewards-grid">
              {rewards.map((r) => (
                <li key={r.id} className={`nw-reward-chip ${rarityClass(r.rarity)}`}>
                  <WheelIcon name={r.icon} className="w-3.5 h-3.5" />
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>
        </aside>
      </div>

      <PremiumModal
        open={showPopup && Boolean(wonReward)}
        onClose={() => setShowPopup(false)}
        title={t("nexusWheel.modal.title")}
        icon={Crown}
        maxWidth="max-w-md"
        testid="nexus-wheel-reward-modal"
        footer={(
          <PremiumButton variant="cyan" onClick={() => setShowPopup(false)} testid="nexus-wheel-reward-close">
            {t("nexusWheel.modal.thanks")}
          </PremiumButton>
        )}
      >
        {wonReward && (
          <div className={`nw-reward-popup ${rarityClass(wonReward.rarity)}`}>
            <div className="nw-reward-popup-icon">
              <WheelIcon name={wonReward.icon} className="w-10 h-10" />
            </div>
            <p className="nw-reward-popup-title">
              {t("nexusWheel.modal.offer", { label: wonReward.label })}
            </p>
            <p className="nw-reward-popup-desc">
              {wonReward.flavor || wonReward.description}
            </p>
          </div>
        )}
      </PremiumModal>
    </PageShell>
  );
}
