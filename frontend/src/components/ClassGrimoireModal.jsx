import React, { useEffect, useMemo, useState } from "react";
import { getClassImageSrc } from "@/lib/badge-assets";
import { useI18n } from "@/i18n/LanguageProvider";
import { translateClassDetail, translateStatKey } from "@/lib/translate-game";
import styles from "./ClassGrimoireModal.module.css";

function hexToRgba(hex, a) {
  const m = String(hex || "#9D4CDD").replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(v.slice(0, 2), 16) || 157;
  const g = parseInt(v.slice(2, 4), 16) || 76;
  const b = parseInt(v.slice(4, 6), 16) || 221;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function CornerFlourish({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g stroke="#e0b94e" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M6 34 C6 18 18 6 34 6" />
        <path d="M13 34 C13 23 23 13 34 13" />
        <path d="M13 33 C8 36 9 45 16 44 C21 43 19 36 14 38" />
        <path d="M33 13 C36 8 45 9 44 16 C43 21 36 19 38 14" />
      </g>
      <path d="M34 3 L40 9 L34 15 L28 9 Z" fill="#e8c66a" stroke="#8a6a1a" strokeWidth="1" />
    </svg>
  );
}

export default function ClassGrimoireModal({ cls, onClose }) {
  const { t } = useI18n();
  const [imgFailed, setImgFailed] = useState(false);
  const detail = useMemo(() => translateClassDetail(t, cls), [t, cls]);

  useEffect(() => {
    setImgFailed(false);
  }, [cls?.id]);

  useEffect(() => {
    if (!cls) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [cls, onClose]);

  if (!cls || !detail) return null;

  const accent = detail.color || "#9D4CDD";
  const stats = Object.entries(detail.stat_bonus || {}).sort((a, b) => b[1] - a[1]);
  const maxVal = stats.length ? stats[0][1] : 1;
  const src = getClassImageSrc(detail.id || detail.name);
  const powers = detail.powers || [];

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={detail.name}
      data-testid="class-modal"
    >
      <div
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
        style={{
          "--accent": accent,
          "--accent-border": hexToRgba(accent, 0.42),
        }}
      >
        <span
          className={styles.glow}
          style={{
            background: `radial-gradient(ellipse 60% 70% at 22% 46%, ${hexToRgba(
              accent,
              0.32
            )} 0%, transparent 60%)`,
          }}
        />

        <CornerFlourish className={`${styles.corner} ${styles.cTL}`} />
        <CornerFlourish className={`${styles.corner} ${styles.cTR}`} />
        <CornerFlourish className={`${styles.corner} ${styles.cBL}`} />
        <CornerFlourish className={`${styles.corner} ${styles.cBR}`} />

        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={t("common.close")}
          data-testid="class-modal-close"
        >
          ×
        </button>

        <div className={styles.content}>
          <div
            className={styles.portraitWrap}
            style={{ boxShadow: `inset 0 0 0 1px rgba(232,198,106,0.3), 0 0 34px ${hexToRgba(accent, 0.4)}` }}
          >
            {imgFailed ? (
              <span className={styles.portraitFallback} />
            ) : (
              <img
                src={src}
                alt={detail.name}
                className={styles.portrait}
                draggable={false}
                onError={() => setImgFailed(true)}
              />
            )}
          </div>

          <div className={styles.info}>
            <h2 className={`${styles.title} font-display`}>{detail.name}</h2>
            {detail.tagline && <p className={styles.tagline}>{detail.tagline}</p>}

            {stats.length > 0 && (
              <>
                <div className={styles.sectionLabel}>{t("grimoire.affinitiesTitle")}</div>
                <div className={styles.affinities}>
                  {stats.map(([k, v]) => (
                    <div className={styles.affRow} key={k}>
                      <span className={styles.affName}>{translateStatKey(t, k)}</span>
                      <span className={styles.affRail}>
                        <span
                          className={styles.affFill}
                          style={{
                            width: `${Math.min(100, (v / maxVal) * 100)}%`,
                            background: `linear-gradient(90deg, ${hexToRgba(accent, 0.85)}, ${accent})`,
                            boxShadow: `0 0 10px ${hexToRgba(accent, 0.7)}`,
                          }}
                        />
                      </span>
                      <span className={styles.affVal}>+{v}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {powers.length > 0 && (
              <>
                <div className={styles.sectionLabel}>{t("grimoire.powersTitle")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                  {powers.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: hexToRgba(accent, 0.08),
                        border: `1px solid ${hexToRgba(accent, 0.25)}`,
                      }}
                    >
                      <span style={{
                        width: "28px", height: "28px", flexShrink: 0, borderRadius: "6px",
                        background: hexToRgba(accent, 0.18),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", fontWeight: "900", color: accent,
                        border: `1px solid ${hexToRgba(accent, 0.35)}`,
                      }}>⚡</span>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "800", color: "#fff", marginBottom: "2px" }}>{p.name}</div>
                        <div style={{ fontSize: "10px", color: "rgba(228,228,231,0.7)", lineHeight: "1.5" }}>{p.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className={styles.gmBox}>
              <div className={styles.gmTitle}>{t("grimoire.gmTitle")}</div>
              <p className={styles.gmText}>
                {t("grimoire.gmAdvice", { className: detail.name })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
