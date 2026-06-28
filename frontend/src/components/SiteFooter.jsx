import React from "react";
import { Link } from "react-router-dom";
import { Youtube, Instagram, Twitter } from "lucide-react";
import { DiscordIcon } from "@/components/auth/AuthMedievalCard";
import { useI18n } from "@/contexts/I18nContext";
import { openPwaTutorial } from "@/components/PwaTutorialHost";
import styles from "./SiteFooter.module.css";

const YEAR = new Date().getFullYear();

const SOCIALS = [
  { key: "discord", label: "Discord", href: "https://discord.gg", Icon: DiscordIcon },
  { key: "twitter", label: "Twitter / X", href: "https://twitter.com", Icon: Twitter },
  { key: "youtube", label: "YouTube", href: "https://youtube.com", Icon: Youtube },
  { key: "instagram", label: "Instagram", href: "https://instagram.com", Icon: Instagram },
];

function openGuide() {
  window.dispatchEvent(new CustomEvent("nexoria:open-legend"));
}

function CornerSVG() {
  const off = 3, th = 2.4, bar = 22, dia = 7;
  const dc = off + dia / 2 + 1;
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <g fill="#c8960a" stroke="#7a5a10" strokeWidth="1">
        <path d={`M${off} ${off} h${bar} v${th} h${-bar} Z`} />
        <path d={`M${off} ${off} v${bar} h${th} v${-bar} Z`} />
        <path d={`M${dc} ${dc - dia / 2} L${dc + dia / 2} ${dc} L${dc} ${dc + dia / 2} L${dc - dia / 2} ${dc} Z`} />
      </g>
    </svg>
  );
}

function TikTokIcon({ className }) {
  return (
    <svg className={className} width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 2.1 1.5 3.6 3.5 3.9V9c-1.3.1-2.5-.3-3.6-1v6.6c0 3.3-2.6 5.4-5.4 5.4S5.6 17.9 5.6 14.9c0-3 2.6-5 5.2-4.6v2.6c-.4-.1-.8-.2-1.1-.2-1.3 0-2.4 1-2.4 2.3 0 1.3 1 2.3 2.4 2.3 1.4 0 2.5-1 2.5-2.6V3h2.3z" />
    </svg>
  );
}

export default function SiteFooter() {
  const { t } = useI18n();

  const links = [
    { labelKey: "footer.help", action: "guide" },
    { labelKey: "footer.community", to: "/communaute" },
    { labelKey: "footer.mobile", action: "pwa" },
    { labelKey: "footer.support", to: "/tickets" },
    { labelKey: "footer.terms", to: "/conditions" },
    { labelKey: "footer.privacy", to: "/confidentialite" },
  ];

  return (
    <footer className={styles.footer} data-testid="site-footer">
      <span className={`${styles.aura} ${styles.auraL}`} aria-hidden />
      <span className={`${styles.aura} ${styles.auraR}`} aria-hidden />

      <div className={styles.panel}>
        <span className={`${styles.corner} ${styles.cTL}`}><CornerSVG /></span>
        <span className={`${styles.corner} ${styles.cTR}`}><CornerSVG /></span>
        <span className={`${styles.corner} ${styles.cBL}`}><CornerSVG /></span>
        <span className={`${styles.corner} ${styles.cBR}`}><CornerSVG /></span>
        <span className={styles.topDiamond} aria-hidden>
          <svg width={16} height={16} viewBox="0 0 16 16">
            <path d="M8 1 L15 8 L8 15 L1 8 Z" fill="#7c3aed" stroke="#a855f7" strokeWidth="1" />
          </svg>
        </span>

        <span className={`${styles.runes} ${styles.runesL}`} aria-hidden>ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾ</span>
        <span className={`${styles.runes} ${styles.runesR}`} aria-hidden>ᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗ</span>

        <div className={styles.cols}>
          <div className={styles.col}>
            <h3 className={styles.title}>{t("footer.socials")}</h3>
            <div className={styles.socials}>
              {SOCIALS.map(({ key, label, href, Icon }) => (
                <a key={key} href={href} target="_blank" rel="noreferrer noopener" className={styles.social} aria-label={label} title={label}>
                  <Icon className={styles.socialIcon} />
                </a>
              ))}
              <a href="https://www.tiktok.com" target="_blank" rel="noreferrer noopener" className={styles.social} aria-label="TikTok" title="TikTok">
                <TikTokIcon className={styles.socialIcon} />
              </a>
            </div>
          </div>

          <div className={styles.col}>
            <h3 className={styles.title}>{t("footer.useful_links")}</h3>
            <div className={styles.links}>
              {links.map((l) =>
                l.action === "guide" ? (
                  <button key={l.labelKey} type="button" className={styles.link} onClick={openGuide}>
                    {t(l.labelKey)}
                  </button>
                ) : l.action === "pwa" ? (
                  <button key={l.labelKey} type="button" className={styles.link} onClick={openPwaTutorial}>
                    {t(l.labelKey)}
                  </button>
                ) : (
                  <Link key={l.to} to={l.to} className={styles.link}>{t(l.labelKey)}</Link>
                )
              )}
            </div>
          </div>

          <div className={styles.col}>
            <h3 className={styles.title}>{t("footer.copyright_title")}</h3>
            <p className={styles.copy}>{t("footer.rights", { year: YEAR })}</p>
            <p className={styles.tagline}>{t("footer.tagline")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
