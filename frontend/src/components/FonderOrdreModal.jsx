import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./FonderOrdreModal.module.css";

const BASE = process.env.PUBLIC_URL || "";

const GEMS = [
  { name: "rouge", color: "#dc2626" },
  { name: "bleu", color: "#2563eb" },
  { name: "vert", color: "#16a34a" },
  { name: "jaune", color: "#eab308" },
  { name: "blanc", color: "#e5e7eb" },
  { name: "violet", color: "#7c3aed" },
];

const NOM_MAX = 32;
const TAG_MAX = 5;
const DEVISE_MAX = 120;

/* ---------- Décor SVG ---------- */
function CornerSVG() {
  const off = 4, th = 3, bar = 32, dia = 10;
  const dc = off + dia / 2 + 1;
  return (
    <svg width={52} height={52} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <g fill="#c8960a" stroke="#7a5a10" strokeWidth="1.5">
        <path d={`M${off} ${off} h${bar} v${th} h${-bar} Z`} />
        <path d={`M${off} ${off} v${bar} h${th} v${-bar} Z`} />
        <path d={`M${dc} ${dc - dia / 2} L${dc + dia / 2} ${dc} L${dc} ${dc + dia / 2} L${dc - dia / 2} ${dc} Z`} />
      </g>
    </svg>
  );
}

function Diamond({ size = 12, fill = "#7c3aed", stroke = "#a855f7", className, style }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} style={style} aria-hidden="true">
      <path d={`M${c} 1 L${size - 1} ${c} L${c} ${size - 1} L1 ${c} Z`} fill={fill} stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

function Wing({ mirror }) {
  return (
    <svg
      width={30}
      height={60}
      viewBox="0 0 30 60"
      fill="none"
      aria-hidden="true"
      style={{ transform: mirror ? "scaleX(-1)" : "none", filter: "drop-shadow(0 0 6px rgba(200,150,10,0.7))" }}
    >
      <path
        d="M30 30 C12 4 1 12 7 24 C2 27 2 33 7 36 C1 48 12 56 30 30 Z"
        fill="#c8960a"
        stroke="#7a5a10"
        strokeWidth="1"
      />
    </svg>
  );
}

function GemIcon({ name, color }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className={styles.gemIcon}
        style={{ borderRadius: 6, background: `radial-gradient(circle at 50% 35%, #fff 0%, ${color} 72%)` }}
      />
    );
  }
  return (
    <img
      src={`${BASE}/assets/icons/${name}.png`}
      alt=""
      className={styles.gemIcon}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

function Spinner() {
  return (
    <svg className={styles.spinner} width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" stroke="rgba(200,150,10,0.25)" strokeWidth="3" />
      <path d="M16 3 a13 13 0 0 1 13 13" stroke="#c8960a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Composant ---------- */
export default function FonderOrdreModal({ isOpen, onClose, onFonder, hero = { level: 1, aether: 0 } }) {
  const [nom, setNom] = useState("");
  const [tag, setTag] = useState("");
  const [devise, setDevise] = useState("");
  const [couleur, setCouleur] = useState("#7c3aed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef(null);
  const firstFieldRef = useRef(null);
  const mountedRef = useRef(true);
  const [castleFailed, setCastleFailed] = useState(false);

  const level = hero?.level ?? 0;
  const aether = hero?.aether ?? 0;
  const tagLen = tag.trim().length;
  const tagState = tagLen === 0 ? "empty" : tagLen >= 2 && tagLen <= 5 ? "valid" : "invalid";

  const canSubmit =
    nom.trim().length >= 2 &&
    tagLen >= 2 && tagLen <= 5 &&
    level >= 10 &&
    aether >= 1000 &&
    !loading;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key === "Tab") {
        const root = containerRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll('button, input, textarea, select, [href], [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.disabled && el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 40);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await onFonder?.({ nom: nom.trim(), tag: tag.trim(), devise: devise.trim(), couleur });
    } catch (e) {
      if (mountedRef.current) {
        setError(e?.response?.data?.detail || e?.message || "Une erreur est survenue.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const insufficient = level < 10 || aether < 1000;

  const inputBorder = (state) =>
    state === "invalid" ? "#f87171" : state === "valid" ? "#00d4ff" : undefined;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} data-testid="fonder-ordre-overlay">
      <div
        className={styles.modal}
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Fonder un Ordre"
        onClick={(e) => e.stopPropagation()}
        data-testid="fonder-ordre-modal"
      >
        {/* Coins dorés */}
        <span className={`${styles.corner} ${styles.cTL}`}><CornerSVG /></span>
        <span className={`${styles.corner} ${styles.cTR}`}><CornerSVG /></span>
        <span className={`${styles.corner} ${styles.cBL}`}><CornerSVG /></span>
        <span className={`${styles.corner} ${styles.cBR}`}><CornerSVG /></span>
        {/* Cristaux violets intérieurs */}
        <Diamond size={10} className={`${styles.crystal} ${styles.crTL}`} style={{ filter: "drop-shadow(0 0 4px rgba(124,58,237,0.8))" }} />
        <Diamond size={10} className={`${styles.crystal} ${styles.crTR}`} style={{ filter: "drop-shadow(0 0 4px rgba(124,58,237,0.8))" }} />
        <Diamond size={10} className={`${styles.crystal} ${styles.crBL}`} style={{ filter: "drop-shadow(0 0 4px rgba(124,58,237,0.8))" }} />
        <Diamond size={10} className={`${styles.crystal} ${styles.crBR}`} style={{ filter: "drop-shadow(0 0 4px rgba(124,58,237,0.8))" }} />

        {/* HEADER */}
        <div className={styles.header}>
          {loading ? (
            <Spinner />
          ) : castleFailed ? (
            <span className={styles.castleEmoji}>🏰</span>
          ) : (
            <img
              src={`${BASE}/assets/icons/castle.png`}
              alt=""
              className={styles.castleImg}
              onError={() => setCastleFailed(true)}
              draggable={false}
            />
          )}
          <h2 className={styles.title}>Fonder un Ordre</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer" data-testid="fonder-ordre-close">
            ×
          </button>
        </div>

        {/* INFOS COÛT */}
        <div className={styles.costBox}>
          <div className={styles.costLine}>
            <span className={styles.costMuted}>Coût : </span>
            <span className={styles.costGold}>1000 Écus</span>
            <span className={styles.costMuted}> · Requiert le niveau 10 minimum.</span>
          </div>
          <div className={styles.costLine}>
            <span className={styles.costMuted}>Niveau actuel : </span>
            <span className={styles.costCyan}>{level}</span>
            <span className={styles.costMuted}> · Écus : </span>
            <span className={styles.costGold}>{aether}</span>
          </div>
          {insufficient && (
            <div className={styles.errBanner}>
              {level < 10
                ? "Tu dois atteindre le niveau 10 pour fonder un ordre."
                : "Tu n'as pas assez d'Écus (1000 requis)."}
            </div>
          )}
          {error && <div className={styles.errBanner}>{error}</div>}
        </div>

        {/* FORMULAIRE */}
        <div className={styles.form}>
          {/* NOM */}
          <div className={styles.field}>
            <input
              ref={firstFieldRef}
              className={styles.input}
              value={nom}
              maxLength={NOM_MAX}
              placeholder="Nom de l'Ordre"
              onChange={(e) => setNom(e.target.value)}
              data-testid="guild-name"
            />
            <span className={styles.rune}>ᚱ</span>
            <span className={styles.counter}>{nom.length}/{NOM_MAX}</span>
          </div>

          {/* TAG */}
          <div className={styles.field}>
            <input
              className={`${styles.input} ${styles.inputTag}`}
              value={tag}
              maxLength={TAG_MAX}
              placeholder="TAG (2-5 lettres, ex : ZEN)"
              onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              style={{ borderColor: inputBorder(tagState) }}
              data-testid="guild-tag"
            />
            <span className={`${styles.rune} ${styles.runeSmall}`}>ᚦᛈ</span>
            <span className={styles.counter}>{tagLen}/{TAG_MAX}</span>
          </div>

          {/* DEVISE */}
          <div className={styles.field}>
            <textarea
              className={styles.textarea}
              value={devise}
              maxLength={DEVISE_MAX}
              placeholder="Devise de l'ordre..."
              onChange={(e) => setDevise(e.target.value)}
              data-testid="guild-desc"
            />
            <span className={`${styles.rune} ${styles.runeTR}`}>᚜</span>
            <span className={`${styles.rune} ${styles.runeBL}`}>ᛗ</span>
            <svg className={styles.resizeIcon} width={10} height={10} viewBox="0 0 10 10" aria-hidden="true">
              <path d="M9 1 L1 9 M9 5 L5 9" stroke="rgba(180,130,20,0.3)" strokeWidth="1" />
            </svg>
            <span className={styles.counterDevise}>{devise.length}/{DEVISE_MAX}</span>
          </div>

          {/* COULEUR */}
          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>Couleur</span>
            <div className={styles.gems}>
              {GEMS.map((g) => {
                const selected = couleur === g.color;
                return (
                  <button
                    key={g.color}
                    type="button"
                    className={`${styles.gem} ${selected ? styles.gemSelected : ""}`}
                    style={
                      selected
                        ? {
                            borderColor: g.color,
                            background: `${g.color}26`,
                            boxShadow: `0 0 0 1px ${g.color}, 0 0 12px ${g.color}99`,
                          }
                        : { "--gem": g.color }
                    }
                    onClick={() => setCouleur(g.color)}
                    aria-label={`Couleur ${g.name}`}
                    data-testid={`guild-color-${g.name}`}
                  >
                    <GemIcon name={g.name} color={g.color} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* BOUTON FONDER */}
          <div className={styles.submitWrap}>
            <span className={`${styles.wing} ${styles.wingL}`}>
              <Wing />
              <Diamond size={12} className={styles.wingDiaTop} style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.8))" }} />
              <Diamond size={12} className={styles.wingDiaBot} style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.8))" }} />
            </span>
            <span className={`${styles.wing} ${styles.wingR}`}>
              <Wing mirror />
              <Diamond size={12} className={styles.wingDiaTop} style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.8))" }} />
              <Diamond size={12} className={styles.wingDiaBot} style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.8))" }} />
            </span>

            <Diamond size={14} className={styles.submitTopDiamond} stroke="#a855f7" style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.8))" }} />
            <Diamond size={14} className={styles.submitBotDiamond} stroke="#a855f7" style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.8))" }} />

            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!canSubmit}
              data-testid="guild-create-submit"
            >
              <span className={styles.submitBg} />
              <span className={styles.submitGlow} />
              <span className={styles.submitBorder} />
              <span className={styles.submitText}>
                <span className={styles.submitLine1}>
                  {loading ? "Fondation en cours…" : "Fonder l'Ordre"}
                </span>
                {!loading && <span className={styles.submitLine2}>(-1000 Écus)</span>}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
