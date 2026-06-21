import React from "react";
import styles from "./SiteHeader.module.css";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import PlayerSearchBar from "@/components/PlayerSearchBar";

export default function SiteHeader() {
  return (
    <header className={styles.header} data-testid="site-header">
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
