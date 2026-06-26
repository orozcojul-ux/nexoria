import React, { useMemo } from "react";
import { Globe, Twitter, Twitch, Youtube } from "lucide-react";
import { PremiumBadge } from "@/components/ui-premium";
import { useI18n } from "@/contexts/I18nContext";
import { getTitleLabel } from "@/lib/title-labels";
import { translateClassName } from "@/lib/translate-class";
import { translateDnaStat } from "@/lib/translate-game";
import { translateChronicle } from "@/lib/translate-chronicle";
import ClassImage from "@/components/ClassImage";
import LastConnection from "@/components/LastConnection";
import UserCountryFlag from "@/components/UserCountryFlag";
import VipPassStatus from "@/components/VipPassStatus";
import { getUserAvatarUrl } from "@/lib/user-avatar";
import { getDiscordDisplayName } from "@/lib/discord-display";
import styles from "./ProfilePage.module.css";

/* Normalise un identifiant social en URL absolue cliquable. */
function buildSocialUrl(kind, raw) {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  switch (kind) {
    case "twitter": return `https://x.com/${handle}`;
    case "twitch": return `https://twitch.tv/${handle}`;
    case "youtube": return handle.startsWith("@") ? `https://youtube.com/${handle}` : `https://youtube.com/@${handle}`;
    case "website": return `https://${v}`;
    default: return v;
  }
}

/* ============================================================
   Décor partagé : coins fleur-de-lys + runes de bordure
   ============================================================ */
const RUNE_BORDER = "᚛ᚁᚂᚃᚄᚅᚆᚇᚈᚉᚊᚋᚌᚍᚎ᚜ ᚛ᚁᚂᚃᚄᚅᚆᚇᚈᚉᚊᚋᚌᚍᚎ᚜ ᚛ᚁᚂᚃᚄᚅᚆᚇᚈᚉᚊᚋᚌᚍᚎ᚜";
const RUNE_SCROLL = "᛭ ᚦᚢᚱᛁᛋᚨᛉ ᚹᚢᚾᛃᛟ ᛒᛖᚱᚲᚨᚾᚨᚾ ᛗᚨᚾᚾᚨᛉ ᛭";

/* Coin ornemental anguleux (orienté haut-gauche, miroir via CSS pour les autres) */
function CornerOrnament({ className }) {
  return (
    <svg className={className} viewBox="0 0 54 54" fill="none" aria-hidden="true">
      <g stroke="#6e5418" strokeWidth="0.8" strokeLinejoin="round">
        {/* gemme losange à l'apex */}
        <path d="M11 1 L19 9 L11 17 L3 9 Z" fill="#e8c66a" />
        <path d="M11 5 L15 9 L11 13 L7 9 Z" fill="#9a7522" stroke="none" />
        {/* barre dorée le long du bord haut */}
        <path d="M19 6 L46 6 L46 9.5 L19 9.5 Z" fill="#c9a44c" />
        <path d="M44 6 L50 6 L50 9.5 L44 9.5 Z" fill="#e8c66a" stroke="none" />
        {/* barre dorée le long du bord gauche */}
        <path d="M6 19 L9.5 19 L9.5 46 L6 46 Z" fill="#c9a44c" />
        <path d="M6 44 L9.5 44 L9.5 50 L6 50 Z" fill="#e8c66a" stroke="none" />
        {/* diagonale reliant l'apex au liseré intérieur */}
        <path d="M14 12 L24 22 L21 25 L11 15 Z" fill="#c9a44c" />
        {/* petit losange secondaire intérieur */}
        <path d="M26 22 L31 27 L26 32 L21 27 Z" fill="#e8c66a" />
        <path d="M26 25.5 L27.5 27 L26 28.5 L24.5 27 Z" fill="#6e5418" stroke="none" />
      </g>
    </svg>
  );
}

function FrameDecor() {
  return (
    <>
      <CornerOrnament className={`${styles.corner} ${styles.cornerTL}`} />
      <CornerOrnament className={`${styles.corner} ${styles.cornerTR}`} />
      <CornerOrnament className={`${styles.corner} ${styles.cornerBL}`} />
      <CornerOrnament className={`${styles.corner} ${styles.cornerBR}`} />
      <span className={`${styles.midDiamond} ${styles.midTop}`} />
      <span className={`${styles.midDiamond} ${styles.midBottom}`} />
      <span className={`${styles.midDiamond} ${styles.midLeft}`} />
      <span className={`${styles.midDiamond} ${styles.midRight}`} />
      <div className={styles.runeTop}>{RUNE_BORDER}</div>
      <div className={styles.runeBottom}>{RUNE_BORDER}</div>
      <div className={styles.runeLeft}>{RUNE_BORDER}</div>
      <div className={styles.runeRight}>{RUNE_BORDER}</div>
    </>
  );
}

/* ============================================================
   Radar ADN — SVG pur, trigonométrie maison
   ============================================================ */
const DNA_AXIS_KEYS = ["creativity", "ambition", "sociability", "curiosity", "persistence", "influence"];

function DnaRadar({ dna, t }) {
  const axes = DNA_AXIS_KEYS.map((key) => ({ key, label: translateDnaStat(t, key) }));
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 95;
  const n = axes.length;

  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const ringPoints = (factor) =>
    axes.map((_, i) => {
      const a = angleFor(i);
      const r = maxR * factor;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");

  const data = axes.map((axis, i) => {
    const a = angleFor(i);
    const raw = Number(dna?.[axis.key] ?? 0);
    const norm = Math.min(1, Math.max(0, raw / 100));
    return {
      ...axis,
      x: cx + maxR * norm * Math.cos(a),
      y: cy + maxR * norm * Math.sin(a),
      lx: cx + (maxR + 26) * Math.cos(a),
      ly: cy + (maxR + 26) * Math.sin(a),
    };
  });

  const polygon = data.map((d) => `${d.x},${d.y}`).join(" ");

  return (
    <svg className={styles.radarSvg} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={t("profile.dna.aria")}>
      <defs>
        <filter id="dnaGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dnaBlurRing" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <circle cx={cx} cy={cy} r={maxR + 14} fill="none" stroke="rgba(0,229,200,0.3)" strokeWidth="8" filter="url(#dnaBlurRing)" />
      <circle cx={cx} cy={cy} r={maxR + 14} fill="none" stroke="rgba(0,200,180,0.6)" strokeWidth="1.5" />

      {[0.33, 0.66, 1].map((f) => (
        <polygon key={f} points={ringPoints(f)} fill="none" stroke="rgba(0,229,200,0.12)" strokeWidth="1" />
      ))}

      {DNA_AXIS_KEYS.map((_, i) => {
        const a = angleFor(i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + maxR * Math.cos(a)}
            y2={cy + maxR * Math.sin(a)}
            stroke="rgba(0,229,200,0.15)"
            strokeWidth="1"
          />
        );
      })}

      <polygon
        points={polygon}
        fill="rgba(0,229,200,0.1)"
        stroke="#00e5c8"
        strokeWidth="2"
        filter="url(#dnaGlow)"
      />

      {data.map((d) => (
        <circle key={`p-${d.key}`} cx={d.x} cy={d.y} r="4" fill="#00e5c8" filter="url(#dnaGlow)" />
      ))}

      {data.map((d) => (
        <text
          key={`l-${d.key}`}
          x={d.lx}
          y={d.ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#a0c0c0"
          fontSize="12"
          fontFamily="Rajdhani, sans-serif"
          fontWeight="500"
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}

/* ============================================================
   Boutons navigation scroll (triangles violets)
   ============================================================ */
function NavTriangle({ up }) {
  return (
    <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true">
      {up ? (
        <path d="M6 2 L11 12 L1 12 Z" fill="#7c3aed" />
      ) : (
        <path d="M1 8 L11 8 L6 18 Z" fill="#7c3aed" />
      )}
    </svg>
  );
}

/* ============================================================
   ProfilePage
   ============================================================ */
export default function ProfilePage({
  hero = {},
  badges = [],
  chronique = [],
  isSelf = false,
  following = false,
  showHeroCard = true,
  onEditProfile,
  onEditBanner,
  onShare,
  onOpenHeroCard,
  onEditAvatar,
  onToggleFollow,
  reportSlot = null,
}) {
  const { t, fmtDate } = useI18n();
  const name = hero.username || t("profile.defaultHero");
  const accent = hero.profile_accent || "#7B2FF7";
  const statusMessage = hero.status_message || "";
  const bio = hero.bio || "";
  const quote = hero.quote || "";
  const story = hero.story || "";
  const rankTitle = getTitleLabel(hero, null, t).toUpperCase();
  const discordLabel = getDiscordDisplayName(hero);

  const socials = hero.social_links || {};
  const socialLinks = [
    { key: "website", url: buildSocialUrl("website", hero.website_url), Icon: Globe, label: t("profile.social.website") },
    { key: "twitter", url: buildSocialUrl("twitter", socials.twitter), Icon: Twitter, label: t("profile.social.twitter") },
    { key: "twitch", url: buildSocialUrl("twitch", socials.twitch), Icon: Twitch, label: t("profile.social.twitch") },
    { key: "youtube", url: buildSocialUrl("youtube", socials.youtube), Icon: Youtube, label: t("profile.social.youtube") },
  ].filter((s) => s.url);
  const hasAbout = !!(bio || quote || story || socialLinks.length);
  const className = translateClassName(t, hero.class_id || hero.class_name) || t("profile.defaultAdventurer");
  const level = hero.level ?? 1;
  const cosmicRank = hero.rank || "Cosmique";
  const archonteLabel =
    hero.role === "admin" ? t("profile.role.admin") : hero.role === "moderator" ? t("profile.role.moderator") : (hero.rank || t("profile.role.admin")).toUpperCase();

  const avatarSrc = getUserAvatarUrl(hero);
  const bannerUrl = hero.banner_url;

  const xp = Number(hero.xp ?? 0);
  const reputation = Number(hero.reputation ?? 0);
  const aether = Number(hero.aether ?? 0);
  const followers = Number(hero.followers ?? 0);
  const badgeCount = badges.length;

  const dna = hero.dna || {};

  const headerStyle = useMemo(
    () => (bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined),
    [bannerUrl]
  );

  const pageBg = `${process.env.PUBLIC_URL || ""}/assets/backgrounds/nexoria-bg.jpg`;

  return (
    <div
      className={styles.page}
      data-testid="profile-page"
      style={{ backgroundImage: `url(${pageBg})`, "--profile-accent": accent }}
    >
      {/* ===================== BLOC 1 — HEADER ===================== */}
      <header className={`${styles.frame} ${styles.header}`} style={headerStyle}>
        <div className={styles.headerOverlay} />
        <FrameDecor />

        <div className={styles.headerInner}>
          {/* Avatar */}
          <div className={styles.avatarWrap}>
            <div className={styles.avatarRing}>
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className={styles.avatarImg} />
              ) : (
                name[0]?.toUpperCase()
              )}
            </div>
            <div className={styles.logoBadge} title="NEXORIA">
              <span className={styles.logoHex}>⬡</span>
              <span className={styles.logoText}>NEXORIA</span>
            </div>
            {isSelf && (
              <button type="button" className={styles.camBtn} onClick={onEditAvatar} aria-label={t("profile.editAvatar")} data-testid="edit-avatar-btn">
                📷
              </button>
            )}
          </div>

          {/* Infos */}
          <div className={styles.info}>
            <div className={styles.rankLine}>
              <span>👑</span>
              {rankTitle}
            </div>
            <h1 className={`${styles.heroName} ${styles.heroNameWithFlag}`} data-testid="profile-username" style={{ textShadow: `0 0 18px ${accent}88` }}>
              {name}
              <UserCountryFlag user={hero} size="lg" />
            </h1>
            {discordLabel && (
              <div className={styles.discordLine} data-testid="profile-discord-name">{t("profile.discordPrefix")} {discordLabel}</div>
            )}
            <div className={styles.lastSeenLine} data-testid="profile-last-connection">
              <LastConnection
                user={hero}
                dateTimeClassName={styles.lastSeenDate}
                onlineClassName={styles.lastSeenOnline}
                offlineClassName={styles.lastSeenOffline}
                nexusOnlineClassName={styles.lastSeenNexusOnline}
                nexusOfflineClassName={styles.lastSeenNexusOffline}
              />
            </div>
            <div className={styles.vipPassLine} data-testid="profile-vip-pass">
              <VipPassStatus
                user={hero}
                stacked
                labelClassName={styles.lastSeenDate}
                yesClassName={styles.vipPassYes}
                noClassName={styles.vipPassNo}
              />
            </div>
            {statusMessage && (
              <div
                className={styles.statusLine}
                data-testid="profile-status"
                style={{ borderColor: `${accent}66`, color: "#e8e0f0" }}
              >
                <span style={{ color: accent }}>“</span>{statusMessage}<span style={{ color: accent }}>”</span>
              </div>
            )}
            {socialLinks.length > 0 && (
              <div className={styles.socialRow} data-testid="profile-socials">
                {socialLinks.map(({ key, url, Icon, label }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={label}
                    aria-label={label}
                    className={styles.socialLink}
                    style={{ borderColor: `${accent}66`, color: accent }}
                    data-testid={`profile-social-${key}`}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            )}
            <div className={styles.classLine}>
              <ClassImage
                classId={hero.class_id || hero.class_name}
                color="#e8c66a"
                size={30}
                alt={className}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              <span>{className} · {t("profile.level")} <span data-testid="profile-level">{level}</span></span>
              <span className={styles.classArrow}>▶</span>
              <span className={styles.rankWord}>{cosmicRank}</span>
            </div>
            <div className={styles.titlePill}>
              <span>☆</span>
              {archonteLabel}
            </div>

            {/* Stats rapides */}
            <div className={styles.stats}>
              <div className={styles.statCol}>
                <span className={styles.statLabel}>XP</span>
                <span className={`${styles.statValue} ${styles.statXp}`}>
                  {xp.toLocaleString("fr-FR")}
                  <span className={styles.hexIcon}>⬡</span>
                </span>
              </div>
              <div className={styles.statCol}>
                <span className={styles.statLabel}>{t("profile.stats.reputation")}</span>
                <span className={`${styles.statValue} ${styles.statNeutral}`}>{reputation.toLocaleString("fr-FR")}</span>
              </div>
              <div className={styles.statCol}>
                <span className={styles.statLabel}>{t("profile.stats.ecus")}</span>
                <span className={`${styles.statValue} ${styles.statNeutral}`}>{aether.toLocaleString("fr-FR")}</span>
              </div>
              <div className={styles.statCol}>
                <span className={styles.statLabel}>{t("profile.stats.followers")}</span>
                <span className={`${styles.statValue} ${styles.statNeutral}`}>{followers}</span>
              </div>
              <div className={styles.statCol}>
                <span className={styles.statLabel}>{t("profile.stats.badges")}</span>
                <span className={`${styles.statValue} ${styles.statNeutral}`}>{badgeCount}</span>
              </div>
            </div>
            <div className={styles.xpBar} />
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            {isSelf ? (
              <>
                <button type="button" className={styles.actionBtn} onClick={onEditProfile} data-testid="edit-profile-btn">
                  <span>⚙</span> {t("profile.editProfile")}
                </button>
                <button type="button" className={styles.actionBtn} onClick={onEditBanner} data-testid="edit-banner-btn">
                  <span>🏳</span> {t("profile.editBanner")}
                </button>
              </>
            ) : (
              <>
                <button type="button" className={styles.actionBtn} onClick={onToggleFollow} data-testid="follow-btn">
                  <span>{following ? "✓" : "+"}</span> {following ? t("profile.following") : t("profile.follow")}
                </button>
                {reportSlot}
              </>
            )}
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionIcon}`}
              onClick={onShare}
              aria-label={t("profile.share")}
              data-testid="share-profile-btn"
            >
              ↗
            </button>
            {showHeroCard && (
              <button type="button" className={styles.actionBtn} onClick={onOpenHeroCard} data-testid="open-hero-card-btn">
                <span>👑</span> {t("profile.heroCard")}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ===================== BLOC 2 — ADN + BADGES ===================== */}
      <div className={styles.grid2}>
        {/* Panel ADN */}
        <section className={`${styles.frame} ${styles.panel}`}>
          <FrameDecor />
          <div className={styles.panelLabel}>{t("profile.dna.title")}</div>
          <div className={styles.radarWrap}>
            <DnaRadar dna={dna} t={t} />
          </div>
        </section>

        {/* Panel Badges */}
        <section className={`${styles.frame} ${styles.panel}`}>
          <FrameDecor />
          <div className={styles.panelLabel}>{t("profile.badges.title")} ({badgeCount})</div>

          {badgeCount === 0 ? (
            <div className={styles.badgeEmpty}>{t("profile.badges.empty")}</div>
          ) : (
            <div className={styles.badgesGrid}>
              {badges.slice(0, 18).map((b, i) => (
                <div key={b.badge_id || b.id || i} className={styles.badgeCell}>
                  <PremiumBadge badge={b} size="md" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ===================== BLOC 2.5 — À PROPOS ===================== */}
      {hasAbout && (
        <section className={`${styles.frame} ${styles.panel} ${styles.aboutPanel}`}>
          <FrameDecor />
          <div className={styles.panelLabel} style={{ color: accent }}>{t("profile.about.title")}</div>

          {quote && (
            <blockquote className={styles.aboutQuote} data-testid="profile-quote" style={{ borderColor: accent, color: "#f0e9d6" }}>
              {quote}
            </blockquote>
          )}

          {bio && (
            <div className={styles.aboutBlock} data-testid="profile-bio">
              <div className={styles.aboutHeading} style={{ color: accent }}>{t("profile.about.bio")}</div>
              <p className={styles.aboutText}>{bio}</p>
            </div>
          )}

          {story && (
            <div className={styles.aboutBlock} data-testid="profile-story">
              <div className={styles.aboutHeading} style={{ color: accent }}>{t("profile.about.story")}</div>
              <p className={styles.aboutText}>{story}</p>
            </div>
          )}
        </section>
      )}

      {/* ===================== BLOC 3 — CHRONIQUE ===================== */}
      <section>
        <h2 className={styles.chronTitle}>{t("profile.chronicle.title")}</h2>
        <div className={styles.scrollWrap}>
          <div className={styles.scrollTop} />
          <div className={styles.scrollBody}>
            <div className={styles.scrollRunes}>{RUNE_SCROLL}</div>
            <div className={styles.chronList} data-testid="profile-chronicle">
              {chronique.length === 0 ? (
                <div className={styles.chronEntry}>
                  <div className={styles.chronText}>{t("profile.chronicle.empty")}</div>
                </div>
              ) : (
                chronique.map((c, i) => (
                  <div key={c.chronicle_id || c.created_at || i} className={styles.chronEntry}>
                    <span className={styles.chronBar} />
                    <div className={styles.chronText}>{translateChronicle(t, c)}</div>
                    <div className={styles.chronDate}>
                      {c.created_at ? fmtDate(c.created_at) : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className={styles.scrollBottom} />

          <div className={`${styles.scrollNav} ${styles.scrollNavTop}`}>
            <NavTriangle up />
          </div>
          <div className={`${styles.scrollNav} ${styles.scrollNavBottom}`}>
            <NavTriangle />
          </div>
        </div>
      </section>
    </div>
  );
}
