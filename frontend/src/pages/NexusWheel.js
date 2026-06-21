import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Coins, Zap, Sparkles, Gem, Package, Gift, Crown, Moon, Loader2, Clock, History,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
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

export default function NexusWheel() {
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

  const rewards = status?.rewards || [];
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
      toast.error("Impossible de charger la Roue du Nexus.");
    } finally {
      setLoading(false);
    }
  }, []);

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
        return `Le Nexus t'accorde ${spinsRemaining} chances aujourd'hui (VIP).`;
      }
      return "Le Nexus t'accorde une chance aujourd'hui.";
    }
    return `La Roue du Nexus se régénère dans ${formatCooldown(status.secondsRemaining)}.`;
  }, [status, spinsRemaining]);

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
        setWonReward(data.reward);
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
        toast.info("La Roue du Nexus se régénère encore.");
      } else {
        toast.error(typeof detail === "string" ? detail : "Le Nexus refuse ce tour pour l'instant.");
      }
    }
  };

  const conicGradient = useMemo(() => {
    if (!rewards.length) return "conic-gradient(#1a1030 0deg 360deg)";
    const parts = rewards.map((r, i) => {
      const start = i * segmentAngle;
      const end = start + segmentAngle;
      const color = r.color || "#2a1f4a";
      return `${color} ${start}deg ${end}deg`;
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
                  <span className="nw-vip-badge" data-testid="nexus-wheel-vip-badge">VIP · {dailyLimit} tours/jour</span>
                )}
                <div className="nw-ecus-pill" data-testid="nexus-wheel-ecus">
                  <Coins className="w-4 h-4 text-amber-300" />
                  <span>{Number(ecus).toLocaleString("fr-FR")} Écus</span>
                </div>
              </div>
            </div>
            {canSpin && spinsRemaining > 0 && dailyLimit > 1 && (
              <p className="nw-spins-left" data-testid="nexus-wheel-spins-remaining">
                {spinsRemaining} tour{spinsRemaining > 1 ? "s" : ""} restant{spinsRemaining > 1 ? "s" : ""}
              </p>
            )}
          </PremiumCard>

          <div className="nw-wheel-stage">
            <div className="nw-wheel-glow" aria-hidden />
            <div className="nw-wheel-ring" aria-hidden />
            <div className="nw-wheel-pointer" aria-hidden />

            <div
              ref={wheelRef}
              className={`nw-wheel ${spinning ? "nw-wheel-spinning" : ""}`}
              style={{
                background: conicGradient,
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.85, 0.2, 1)`
                  : "none",
              }}
              data-testid="nexus-wheel-disc"
            >
              {rewards.map((r, i) => {
                const angle = i * segmentAngle + segmentAngle / 2 - 90;
                const rad = (angle * Math.PI) / 180;
                const radius = 38;
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
                <Sparkles className="w-6 h-6 text-cyan-300" />
              </div>
            </div>
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
                  Le Nexus tourne…
                </>
              ) : canSpin ? (
                spinsRemaining > 1 ? `Lancer la roue (${spinsRemaining})` : "Lancer la roue"
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
            <div className="flex items-center gap-2 mb-3 text-violet-200">
              <History className="w-4 h-4 text-cyan-300" />
              <h2 className="text-sm font-display font-bold uppercase tracking-wider">Derniers gains</h2>
            </div>
            {loading ? (
              <p className="nw-muted">Chargement…</p>
            ) : history.length === 0 ? (
              <p className="nw-muted">Aucun tour enregistré. Le Nexus t'attend.</p>
            ) : (
              <ul className="nw-history-list">
                {history.map((entry) => {
                  const r = entry.reward || {};
                  return (
                    <li key={entry.spin_id} className={`nw-history-item ${rarityClass(r.rarity)}`}>
                      <WheelIcon name={r.icon} className="w-4 h-4 shrink-0 opacity-80" />
                      <div className="min-w-0 flex-1">
                        <p className="nw-history-label">{r.label}</p>
                        <p className="nw-history-date">
                          {entry.created_at
                            ? new Date(entry.created_at).toLocaleString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </PremiumCard>

          <PremiumCard className="nw-rewards-card">
            <div className="flex items-center gap-2 mb-3 text-violet-200">
              <Gift className="w-4 h-4 text-amber-300" />
              <h2 className="text-sm font-display font-bold uppercase tracking-wider">Récompenses possibles</h2>
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
        title="Récompense du Nexus"
        icon={Crown}
        maxWidth="max-w-md"
        testid="nexus-wheel-reward-modal"
        footer={(
          <PremiumButton variant="cyan" onClick={() => setShowPopup(false)} testid="nexus-wheel-reward-close">
            Merci, Nexus
          </PremiumButton>
        )}
      >
        {wonReward && (
          <div className={`nw-reward-popup ${rarityClass(wonReward.rarity)}`}>
            <div className="nw-reward-popup-icon">
              <WheelIcon name={wonReward.icon} className="w-10 h-10" />
            </div>
            <p className="nw-reward-popup-title">
              Le Nexus t'offre : {wonReward.label}.
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
