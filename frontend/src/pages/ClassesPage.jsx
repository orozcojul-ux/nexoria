import React, { useMemo, useState } from "react";
import styles from "./ClassesPage.module.css";
import { getClassImageSrc } from "@/lib/badge-assets";

/* ============================================================
   Données des classes
   ============================================================ */
const CLASSES = [
  { id: "mage", name: "Mage", color: "#00d4ff",
    affinites: [{ label: "CRÉATIVITÉ", pct: 82 }, { label: "EXPERTISE", pct: 60 }, { label: "DÉCOUVERTE", pct: 55 }] },
  { id: "guerrier", name: "Guerrier", color: "#f5a623",
    affinites: [{ label: "CRÉATIVITÉ", pct: 45 }, { label: "EXPERTISE", pct: 70 }, { label: "LEADERSHIP", pct: 80 }] },
  { id: "assassin", name: "Assassin", color: "#a855f7",
    affinites: [{ label: "CRÉATIVITÉ", pct: 65 }, { label: "EXPERTISE", pct: 55 }, { label: "AMBITION", pct: 78 }] },
  { id: "paladin", name: "Paladin", color: "#f5c842",
    affinites: [{ label: "CRÉATIVITÉ", pct: 50 }, { label: "EXPERTISE", pct: 68 }, { label: "SOCIAULITÉ", pct: 85 }] },
  { id: "alchimiste", name: "Alchimiste", color: "#00e57a",
    affinites: [{ label: "CRÉATIVITÉ", pct: 78 }, { label: "EXPERTISE", pct: 72 }, { label: "DÉCOUVERTE", pct: 60 }] },
  { id: "explorateur", name: "Explorateur", color: "#00e5c8",
    affinites: [{ label: "CRÉATIVITÉ", pct: 70 }, { label: "EXPERTISE", pct: 58 }] },
  { id: "necromancien", name: "Nécromancien", color: "#c855f7",
    affinites: [{ label: "AMBITION", pct: 85 }, { label: "EXPERTISE", pct: 65 }] },
  { id: "architecte", name: "Architecte", color: "#f5a623",
    affinites: [{ label: "CRÉATIVITÉ", pct: 90 }, { label: "EXPERTISE", pct: 75 }] },
  { id: "chronomancien", name: "Chronomancien", color: "#00d4ff",
    affinites: [{ label: "CRÉATIVITÉ", pct: 72 }, { label: "CURIOSITÉ", pct: 80 }] },
  { id: "inventeur", name: "Inventeur", color: "#a855f7",
    affinites: [{ label: "CRÉATIVITÉ", pct: 68 }, { label: "AMBITION", pct: 62 }] },
];

const AFFINITY_COLORS = {
  "CRÉATIVITÉ": "#00d4ff",
  "EXPERTISE": "#00d4ff",
  "DÉCOUVERTE": "#00e57a",
  "LEADERSHIP": "#f5a623",
  "AMBITION": "#a855f7",
  "SOCIAULITÉ": "#f5c842",
  "CURIOSITÉ": "#00e5c8",
  "PERSÉVÉRANCE": "#f5a623",
};

const FILTERS = ["TOUTES", "CRÉATIVITÉ", "PERSÉVÉRANCE", "CURIOSITÉ", "LEADERSHIP", "AMBITION", "EXPERTISE", "DÉCOUVERTE"];

/* Alias classe héros (ids back-end EN → ids FR de cette page) */
const CLASS_ALIASES = {
  warrior: "guerrier",
  explorer: "explorateur",
  necromancer: "necromancien",
  architect: "architecte",
  chronomancer: "chronomancien",
  inventor: "inventeur",
  alchemist: "alchimiste",
};

const BANNER_SRC = "/assets/banners/classes.webp";
function hexToRgba(hex, a) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* ---- Coins ornementaux ---- */
function GoldCorner({ size, bar, dia, className }) {
  const off = size >= 50 ? 3 : 2;
  const th = size >= 50 ? 3 : 2.4;
  const dc = off + dia / 2 + 2;
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      <g fill="#c8960a" stroke="#8a6a1a" strokeWidth="1">
        <path d={`M${off} ${off} L${off + bar} ${off} L${off + bar} ${off + th} L${off} ${off + th} Z`} />
        <path d={`M${off} ${off} L${off + th} ${off} L${off + th} ${off + bar} L${off} ${off + bar} Z`} />
        <path d={`M${dc} ${dc - dia / 2} L${dc + dia / 2} ${dc} L${dc} ${dc + dia / 2} L${dc - dia / 2} ${dc} Z`} />
      </g>
    </svg>
  );
}

function Diamond({ size = 14, fill = "#c8960a", stroke = "#8a6a1a", className, style }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} style={style} aria-hidden="true">
      <path d={`M${c} 1 L${size - 1} ${c} L${c} ${size - 1} L1 ${c} Z`} fill={fill} stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

function BannerCorners() {
  return (
    <>
      <GoldCorner size={55} bar={35} dia={10} className={`${styles.corner} ${styles.cTL}`} />
      <GoldCorner size={55} bar={35} dia={10} className={`${styles.corner} ${styles.cTR}`} />
      <GoldCorner size={55} bar={35} dia={10} className={`${styles.corner} ${styles.cBL}`} />
      <GoldCorner size={55} bar={35} dia={10} className={`${styles.corner} ${styles.cBR}`} />
    </>
  );
}

function CardCorners() {
  return (
    <>
      <GoldCorner size={36} bar={22} dia={7} className={`${styles.corner} ${styles.cTL}`} />
      <GoldCorner size={36} bar={22} dia={7} className={`${styles.corner} ${styles.cTR}`} />
      <GoldCorner size={36} bar={22} dia={7} className={`${styles.corner} ${styles.cBL}`} />
      <GoldCorner size={36} bar={22} dia={7} className={`${styles.corner} ${styles.cBR}`} />
    </>
  );
}

/* ============================================================
   Carte de classe
   ============================================================ */
function ClassCard({ cls, isCurrent, onGrimoire }) {
  const heroBg = {
    backgroundImage: [
      `url(${getClassImageSrc(cls.id)})`,
      `radial-gradient(ellipse at 50% 35%, ${hexToRgba(cls.color, 0.35)} 0%, transparent 70%)`,
      `linear-gradient(180deg, ${hexToRgba(cls.color, 0.22)} 0%, #07081a 100%)`,
    ].join(", "),
    backgroundSize: "cover, cover, cover",
    backgroundPosition: "center top, center, center",
    backgroundRepeat: "no-repeat, no-repeat, no-repeat",
  };
  return (
    <div className={`${styles.card} ${isCurrent ? styles.cardCurrent : ""}`} data-testid={`class-card-${cls.id}`}>
      <CardCorners />
      <Diamond size={14} fill={cls.color} stroke="#8a6a1a" className={styles.topDiamond} style={{ filter: `drop-shadow(0 0 4px ${hexToRgba(cls.color, 0.6)})` }} />
      {isCurrent && <span className={styles.taClasse}>Ta classe</span>}

      <div className={styles.heroImg} style={heroBg}>
        <div className={styles.heroImgFade} />
      </div>

      <div
        className={styles.className}
        style={{ color: cls.color, textShadow: `0 2px 8px rgba(0,0,0,0.8), 0 0 20px ${hexToRgba(cls.color, 0.5)}` }}
      >
        {cls.name}
      </div>

      <div className={styles.info}>
        {cls.affinites.map((aff, i) => (
          <div className={styles.affRow} key={`${aff.label}-${i}`}>
            <span className={styles.affLabel}>{aff.label}</span>
            <span className={styles.affTrack}>
              <span
                className={styles.affFill}
                style={{ width: `${aff.pct}%`, background: AFFINITY_COLORS[aff.label] || "#00d4ff" }}
              />
            </span>
          </div>
        ))}
        <button type="button" className={styles.grimoire} onClick={() => onGrimoire?.(cls)}>
          Voir le grimoire
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ClassesPage
   ============================================================ */
export default function ClassesPage({ heroClass = "", onGrimoire }) {
  const [selectedAffinite, setSelectedAffinite] = useState("TOUTES");

  const normalizedHero = (heroClass || "").toLowerCase();
  const currentId = CLASS_ALIASES[normalizedHero] || normalizedHero;
  const currentClass = CLASSES.find((c) => c.id === currentId || c.name.toLowerCase() === normalizedHero);

  const visible = useMemo(() => {
    if (selectedAffinite === "TOUTES") return CLASSES;
    return CLASSES.filter((c) => c.affinites.some((a) => a.label === selectedAffinite));
  }, [selectedAffinite]);

  return (
    <div className={styles.page} data-testid="classes-page">
      <div className={styles.inner}>
        {/* ===== BANNIÈRE ===== */}
        <div className={styles.banner} style={{ backgroundImage: `url(${BANNER_SRC})` }}>
          <BannerCorners />
          <div className={styles.bannerOverlay} />
          <h1 className={styles.bannerTitle}>CLASSES HÉROÏQUES</h1>
        </div>
        <div className={styles.bannerSub}>12 archétypes — 6 affinités</div>

        {/* ===== BADGE CLASSE ACTUELLE ===== */}
        {currentClass && (
          <div className={styles.currentBadge}>
            <span className={styles.currentStar}>✦</span>
            <span className={styles.currentLabel}>
              Ta classe actuelle : <span className={styles.currentValue}>{currentClass.name}</span>
            </span>
          </div>
        )}

        {/* ===== CODEX ===== */}
        <div className={styles.codexHead}>
          <span className={styles.codexStar}>✦</span>
          <span className={styles.codexTitle}>Codex des Voies</span>
          <span className={styles.codexSub}>14 archétypes — 8 affinités</span>
        </div>

        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.filter} ${selectedAffinite === f ? styles.filterActive : ""}`}
              onClick={() => setSelectedAffinite(f)}
              data-testid={`affinity-filter-${f}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ===== GRILLE ===== */}
        <div className={styles.grid}>
          {visible.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              isCurrent={currentClass?.id === cls.id}
              onGrimoire={onGrimoire}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
