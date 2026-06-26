import React, { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import styles from "./GuildesPage.module.css";

const BASE = process.env.PUBLIC_URL || "";
const BANNER_SRC = `${BASE}/assets/banners/guilds.webp`;

/* ============================================================
   Décor SVG doré
   ============================================================ */
function CornerSVG({ size, bar, dia }) {
  const off = size >= 50 ? 4 : 3;
  const th = size >= 50 ? 3 : 2.2;
  const dc = off + dia / 2 + 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      <g fill="#c8960a" stroke="#7a5a10" strokeWidth="1">
        <path d={`M${off} ${off} h${bar} v${th} h${-bar} Z`} />
        <path d={`M${off} ${off} v${bar} h${th} v${-bar} Z`} />
        <path d={`M${dc} ${dc - dia / 2} L${dc + dia / 2} ${dc} L${dc} ${dc + dia / 2} L${dc - dia / 2} ${dc} Z`} />
      </g>
    </svg>
  );
}

function Corners({ size, bar, dia }) {
  return (
    <>
      <span className={`${styles.corner} ${styles.cTL}`}><CornerSVG size={size} bar={bar} dia={dia} /></span>
      <span className={`${styles.corner} ${styles.cTR}`}><CornerSVG size={size} bar={bar} dia={dia} /></span>
      <span className={`${styles.corner} ${styles.cBL}`}><CornerSVG size={size} bar={bar} dia={dia} /></span>
      <span className={`${styles.corner} ${styles.cBR}`}><CornerSVG size={size} bar={bar} dia={dia} /></span>
    </>
  );
}

function Diamond({ size = 14, fill = "#c8960a", stroke = "none", className, style }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} style={style} aria-hidden="true">
      <path d={`M${c} 1 L${size - 1} ${c} L${c} ${size - 1} L1 ${c} Z`} fill={fill} stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="#c8960a" strokeWidth="2" fill="none" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" stroke="#c8960a" strokeWidth="1.6" />
      <path d="M1.5 5.5h13M5.5 5.5v9" stroke="#c8960a" strokeWidth="1.4" />
    </svg>
  );
}

/* ============================================================
   Configuration des stats
   ============================================================ */
const STAT_CONFIG = [
  { key: "ordres_fondes", labelKey: "guilds.stat.founded", icon: `${BASE}/assets/icons/gants-cyan.png`, emoji: "🧤", iconGlow: "0 0 12px rgba(0,200,255,0.6)", valueColor: "#00d4ff" },
  { key: "heros_enroles", labelKey: "guilds.stat.enrolled", icon: `${BASE}/assets/icons/livre-violet.png`, emoji: "📖", iconGlow: "0 0 12px rgba(150,80,255,0.6)", valueColor: "#00d4ff" },
  { key: "ordre_dominant", labelKey: "guilds.stat.dominant", icon: `${BASE}/assets/icons/couronne-violet.png`, emoji: "👑", iconGlow: "0 0 12px rgba(180,100,255,0.7)", valueColor: "#c8960a" },
  { key: "invitations", labelKey: "guilds.stat.invitations", icon: `${BASE}/assets/icons/parchemin.png`, emoji: "📜", iconGlow: "0 0 10px rgba(200,150,80,0.5)", valueColor: "#00d4ff" },
];

function StatIcon({ src, emoji, glow }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <span className={styles.statEmoji} style={{ filter: `drop-shadow(${glow})` }}>{emoji}</span>;
  }
  return (
    <img
      src={src}
      alt=""
      className={styles.statImg}
      style={{ filter: `drop-shadow(${glow})` }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

function StatCard({ cfg, value, label }) {
  const isDash = value === "–" || value === "-" || value === null || value === undefined;
  const display = isDash ? "–" : String(value);
  const color = cfg.key === "ordre_dominant" && isDash ? "#4a4a6a" : cfg.valueColor;
  return (
    <div className={styles.statCard}>
      <Corners size={28} bar={16} dia={6} />
      <StatIcon src={cfg.icon} emoji={cfg.emoji} glow={cfg.iconGlow} />
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={{ color, textShadow: `0 0 12px ${color}99` }}>{display}</span>
    </div>
  );
}

/* ============================================================
   Emblème de guilde (liste)
   ============================================================ */
function GuildEmblem({ g }) {
  const [failed, setFailed] = useState(false);
  if (g.emblem_url && !failed) {
    return <img src={g.emblem_url} alt="" className={styles.rowEmblem} onError={() => setFailed(true)} draggable={false} />;
  }
  return (
    <span
      className={styles.rowEmblem}
      style={{ background: `radial-gradient(circle, #ffffff 0%, ${g.banner_color || "#7c3aed"} 72%)` }}
    >
      {g.tag || (g.name ? g.name[0] : "?")}
    </span>
  );
}

/* ============================================================
   GuildesPage
   ============================================================ */
export default function GuildesPage({ guildes = [], stats = {}, onFonder }) {
  const { t } = useI18n();
  const [, setModalOpen] = useState(false);

  const handleFonder = () => {
    setModalOpen(true);
    onFonder?.();
  };

  const statValues = {
    ordres_fondes: stats.ordres_fondes ?? 0,
    heros_enroles: stats.heros_enroles ?? 0,
    ordre_dominant: stats.ordre_dominant ?? "–",
    invitations: stats.invitations ?? 0,
  };

  return (
    <div className={styles.page} data-testid="guildes-page">
      <div className={styles.inner}>
        {/* ===== BLOC 1 — BANNIÈRE ===== */}
        <div className={styles.banner}>
          <img
            src={BANNER_SRC}
            alt=""
            className={styles.bannerImg}
            draggable={false}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <div className={styles.bannerOverlay} />
          <Corners size={58} bar={38} dia={10} />
          <Diamond size={18} className={styles.bannerTopDiamond} style={{ filter: "drop-shadow(0 0 6px rgba(200,150,10,0.7))" }} />
        </div>
        <p className={styles.bannerSub}>
          {t("guilds.bannerSub")}
        </p>

        {/* ===== BLOC 2 — BOUTON FONDER ===== */}
        <div className={styles.founderRow}>
          <button type="button" className={styles.founderBtn} onClick={handleFonder} data-testid="open-create-guild">
            <Corners size={34} bar={20} dia={8} />
            <Diamond size={16} className={styles.btnSideL} style={{ filter: "drop-shadow(0 0 6px rgba(200,150,10,0.8))" }} />
            <Diamond size={16} className={styles.btnSideR} style={{ filter: "drop-shadow(0 0 6px rgba(200,150,10,0.8))" }} />
            <Diamond size={12} className={styles.btnTopDiamond} />
            <Diamond size={12} className={styles.btnBottomDiamond} />
            <span className={styles.founderText}>{t("guilds.foundOrder")}</span>
          </button>
        </div>

        {/* ===== BLOC 3 — PULSE DES ORDRES ===== */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <CircleIcon />
            <span className={styles.sectionTitle}>{t("guilds.pulseTitle")}</span>
            <span className={styles.sectionSub}>{t("guilds.pulseSub")}</span>
          </div>
          <div className={styles.statsGrid}>
            {STAT_CONFIG.map((cfg) => (
              <StatCard key={cfg.key} cfg={cfg} value={statValues[cfg.key]} label={t(cfg.labelKey)} />
            ))}
          </div>
        </section>

        {/* ===== BLOC 4 — ORDRES EXISTANTS ===== */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <GridIcon />
            <span className={styles.sectionTitle}>{t("guilds.existingOrders")}</span>
            <span className={styles.sectionSub}>{t("guilds.bannerCount", { count: guildes.length })}</span>
          </div>

          <div className={styles.listBox} data-testid="guildes-list">
            <Corners size={38} bar={24} dia={8} />

            {guildes.length === 0 ? (
              <div className={styles.empty}>
                <CrownEmpty />
                <p className={styles.emptyMain}>{t("guilds.noOrdersYet")}</p>
                <p className={styles.emptySub}>{t("guilds.beFirst")}</p>
              </div>
            ) : (
              <div className={styles.list}>
                {guildes.map((g, i) => {
                  const clickable = typeof g.onClick === "function";
                  return (
                    <div
                      key={g.id ?? i}
                      className={`${styles.row} ${clickable ? styles.rowClickable : ""} ${g.isMine ? styles.rowMine : ""}`}
                      onClick={clickable ? () => g.onClick() : undefined}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); g.onClick(); } } : undefined}
                      data-testid={`guilde-row-${g.id ?? i}`}
                    >
                      <span className={styles.rowRank}>{g.rank ?? i + 1}</span>
                      <GuildEmblem g={g} />
                      <span className={styles.rowName}>
                        {g.name}
                        {g.isMine && <span className={styles.rowMineBadge}>{t("guilds.myOrder")}</span>}
                      </span>
                      <span className={styles.rowMembers}>{t("guilds.heroCount", { count: g.member_count ?? 0 })}</span>
                      <span className={styles.rowLevel}>{t("guilds.level", { level: g.level ?? 1 })}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===== LOSANGE BAS DE PAGE ===== */}
        <Diamond
          size={20}
          fill="#7c3aed"
          stroke="#a855f7"
          className={styles.footDiamond}
          style={{ filter: "drop-shadow(0 0 8px rgba(124,58,237,0.6))" }}
        />
      </div>
    </div>
  );
}

function CrownEmpty() {
  const [failed, setFailed] = useState(false);
  const glow = "drop-shadow(0 0 16px rgba(140,80,255,0.7))";
  if (failed) {
    return <span className={styles.emptyEmoji} style={{ filter: glow }}>👑</span>;
  }
  return (
    <img
      src={`${BASE}/assets/icons/orders.png`}
      alt=""
      className={styles.emptyIcon}
      style={{ filter: glow }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
