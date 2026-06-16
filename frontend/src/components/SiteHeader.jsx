import React from "react";
import styles from "./SiteHeader.module.css";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import PlayerSearchBar from "@/components/PlayerSearchBar";

const BASE = process.env.PUBLIC_URL || "";
const HEADER_ART = `${BASE}/assets/ui/site-header.png`;

/** Emblème ailé doré/cyan (écho du header art). */
function WingedCrest() {
  return (
    <svg width={34} height={26} viewBox="0 0 34 26" fill="none" aria-hidden="true" className={styles.crest}>
      <g stroke="#00d4ff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 4 L21 8 L17 20 L13 8 Z" />
        <path d="M21 8 C26 7 30 9 33 13 C28 12 24 12 21 14" />
        <path d="M13 8 C8 7 4 9 1 13 C6 12 10 12 13 14" />
      </g>
      <path d="M17 2 L20 6 L17 10 L14 6 Z" fill="#c8960a" stroke="#7a5a10" strokeWidth="0.8" />
    </svg>
  );
}

/** Bande ornementale supérieure — style salle des bannières Nexoria. */
export default function SiteHeader() {
  return (
    <header className={styles.header} data-testid="site-header">
      <div
        className={styles.art}
        style={{ backgroundImage: `url(${HEADER_ART})` }}
        aria-hidden
      />
      <div className={styles.brand}>
        <span className={`${styles.rule} ${styles.ruleL}`} />
        <WingedCrest />
        <span className={styles.word}>NEXORIA</span>
        <WingedCrest />
        <span className={`${styles.rule} ${styles.ruleR}`} />
      </div>

      <div className={styles.controls}>
        <div className={styles.search}>
          <PlayerSearchBar />
        </div>
        <ThemeSwitcher compact />
        <LanguageSwitcher compact />
        <NotificationsBell />
      </div>
    </header>
  );
}
