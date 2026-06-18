import React, { useEffect, useState } from "react";
import { getClassImageSrc } from "@/lib/badge-assets";
import styles from "./ClassGrimoireModal.module.css";

const STAT_LABEL = {
  creativity: "Créativité",
  persistence: "Persévérance",
  curiosity: "Curiosité",
  leadership: "Leadership",
  sociability: "Sociabilité",
  ambition: "Ambition",
  expertise: "Expertise",
  discovery: "Découverte",
};

function hexToRgba(hex, a) {
  const m = String(hex || "#9D4CDD").replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(v.slice(0, 2), 16) || 157;
  const g = parseInt(v.slice(2, 4), 16) || 76;
  const b = parseInt(v.slice(4, 6), 16) || 221;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* Filigrane doré de coin (orienté haut-gauche, miroir via CSS pour les autres) */
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
  const [imgFailed, setImgFailed] = useState(false);

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

  if (!cls) return null;

  const accent = cls.color || "#9D4CDD";
  const stats = Object.entries(cls.stat_bonus || {}).sort((a, b) => b[1] - a[1]);
  const maxVal = stats.length ? stats[0][1] : 1;
  const src = getClassImageSrc(cls.id || cls.name);
  const powers = cls.powers || [];

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={cls.name}
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
          aria-label="Fermer"
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
                alt={cls.name}
                className={styles.portrait}
                draggable={false}
                onError={() => setImgFailed(true)}
              />
            )}
          </div>

          <div className={styles.info}>
            <h2 className={`${styles.title} font-display`}>{cls.name}</h2>
            {cls.tagline && <p className={styles.tagline}>{cls.tagline}</p>}

            {stats.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Affinités cosmiques</div>
                <div className={styles.affinities}>
                  {stats.map(([k, v]) => (
                    <div className={styles.affRow} key={k}>
                      <span className={styles.affName}>{STAT_LABEL[k] || k}</span>
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
                <div className={styles.sectionLabel}>Pouvoirs de la Voie</div>
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
              <div className={styles.gmTitle}>Conseils du Maître de Jeu</div>
              <p className={styles.gmText}>
                Les héros de la voie{" "}
                <span className={styles.gmAccent}>{cls.name}</span> excellent dans les
                actions liées à leurs affinités cosmiques. Investis tes points de talent
                dans l'<em>Arbre des Voies</em> pour multiplier ces bonus, et grave ton nom
                dans le Hall des Légendes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
