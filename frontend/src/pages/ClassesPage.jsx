import React, { useMemo, useState } from "react";
import styles from "./ClassesPage.module.css";
import { getClassImageSrc } from "@/lib/badge-assets";
import { useI18n } from "@/i18n/LanguageProvider";
import { translateClassName } from "@/lib/translate-class";
import { translateAffinityLabel } from "@/lib/translate-game";

const CLASSES = [
  { id: "mage", color: "#00d4ff",
    affinites: [{ stat: "creativity", pct: 82 }, { stat: "expertise", pct: 60 }, { stat: "discovery", pct: 55 }] },
  { id: "guerrier", color: "#f5a623",
    affinites: [{ stat: "creativity", pct: 45 }, { stat: "expertise", pct: 70 }, { stat: "leadership", pct: 80 }] },
  { id: "assassin", color: "#a855f7",
    affinites: [{ stat: "creativity", pct: 65 }, { stat: "expertise", pct: 55 }, { stat: "ambition", pct: 78 }] },
  { id: "paladin", color: "#f5c842",
    affinites: [{ stat: "creativity", pct: 50 }, { stat: "expertise", pct: 68 }, { stat: "sociability", pct: 85 }] },
  { id: "alchimiste", color: "#00e57a",
    affinites: [{ stat: "creativity", pct: 78 }, { stat: "expertise", pct: 72 }, { stat: "discovery", pct: 60 }] },
  { id: "explorateur", color: "#00e5c8",
    affinites: [{ stat: "creativity", pct: 70 }, { stat: "expertise", pct: 58 }] },
  { id: "necromancien", color: "#c855f7",
    affinites: [{ stat: "ambition", pct: 85 }, { stat: "expertise", pct: 65 }] },
  { id: "architecte", color: "#f5a623",
    affinites: [{ stat: "creativity", pct: 90 }, { stat: "expertise", pct: 75 }] },
  { id: "chronomancien", color: "#00d4ff",
    affinites: [{ stat: "creativity", pct: 72 }, { stat: "curiosity", pct: 80 }] },
  { id: "inventeur", color: "#a855f7",
    affinites: [{ stat: "creativity", pct: 68 }, { stat: "ambition", pct: 62 }] },
];

const AFFINITY_COLORS = {
  creativity: "#00d4ff",
  expertise: "#00d4ff",
  discovery: "#00e57a",
  leadership: "#f5a623",
  ambition: "#a855f7",
  sociability: "#f5c842",
  curiosity: "#00e5c8",
  persistence: "#f5a623",
};

const FILTER_STATS = ["ALL", "creativity", "persistence", "curiosity", "leadership", "ambition", "expertise", "discovery"];

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

function ClassCard({ cls, isCurrent, onGrimoire, t }) {
  const displayName = translateClassName(t, cls.id);
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
      {isCurrent && <span className={styles.taClasse}>{t("page.classes.currentBadge")}</span>}

      <div className={styles.heroImg} style={heroBg}>
        <div className={styles.heroImgFade} />
      </div>

      <div
        className={styles.className}
        style={{ color: cls.color, textShadow: `0 2px 8px rgba(0,0,0,0.8), 0 0 20px ${hexToRgba(cls.color, 0.5)}` }}
      >
        {displayName}
      </div>

      <div className={styles.info}>
        {cls.affinites.map((aff, i) => (
          <div className={styles.affRow} key={`${aff.stat}-${i}`}>
            <span className={styles.affLabel}>{translateAffinityLabel(t, aff.stat).toUpperCase()}</span>
            <span className={styles.affTrack}>
              <span
                className={styles.affFill}
                style={{ width: `${aff.pct}%`, background: AFFINITY_COLORS[aff.stat] || "#00d4ff" }}
              />
            </span>
          </div>
        ))}
      </div>
      <button type="button" className={styles.grimoire} onClick={() => onGrimoire?.(cls)}>
        {t("page.classes.viewGrimoire")}
      </button>
    </div>
  );
}

export default function ClassesPage({ heroClass = "", onGrimoire }) {
  const { t } = useI18n();
  const [selectedFilter, setSelectedFilter] = useState("ALL");

  const normalizedHero = (heroClass || "").toLowerCase();
  const currentId = CLASS_ALIASES[normalizedHero] || normalizedHero;
  const currentClass = CLASSES.find((c) => c.id === currentId || c.name?.toLowerCase?.() === normalizedHero);

  const visible = useMemo(() => {
    if (selectedFilter === "ALL") return CLASSES;
    return CLASSES.filter((c) => c.affinites.some((a) => a.stat === selectedFilter));
  }, [selectedFilter]);

  const filterLabel = (stat) => {
    if (stat === "ALL") return t("page.classes.filterAll");
    return translateAffinityLabel(t, stat).toUpperCase();
  };

  return (
    <div className={styles.page} data-testid="classes-page">
      <div className={styles.inner}>
        <div className={styles.banner} style={{ backgroundImage: `url(${BANNER_SRC})` }}>
          <BannerCorners />
          <div className={styles.bannerOverlay} />
          <h1 className={styles.bannerTitle}>{t("page.classes.bannerTitle")}</h1>
        </div>
        <div className={styles.bannerSub}>{t("page.classes.bannerSub")}</div>

        {currentClass && (
          <div className={styles.currentBadge}>
            <span className={styles.currentStar}>✦</span>
            <span className={styles.currentLabel}>
              {t("page.classes.currentLabel")}{" "}
              <span className={styles.currentValue}>{translateClassName(t, currentClass.id)}</span>
            </span>
          </div>
        )}

        <div className={styles.codexHead}>
          <span className={styles.codexStar}>✦</span>
          <span className={styles.codexTitle}>{t("page.classes.codexTitle")}</span>
          <span className={styles.codexSub}>{t("page.classes.codexSub")}</span>
        </div>

        <div className={styles.filters}>
          {FILTER_STATS.map((stat) => (
            <button
              key={stat}
              type="button"
              className={`${styles.filter} ${selectedFilter === stat ? styles.filterActive : ""}`}
              onClick={() => setSelectedFilter(stat)}
              data-testid={`affinity-filter-${stat}`}
            >
              {filterLabel(stat)}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {visible.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              isCurrent={currentClass?.id === cls.id}
              onGrimoire={onGrimoire}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
