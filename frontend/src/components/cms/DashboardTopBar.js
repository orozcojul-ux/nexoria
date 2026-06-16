import React from "react";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import PlayerSearchBar from "@/components/PlayerSearchBar";

export default function DashboardTopBar() {
  return (
    <div
      className="sticky top-0 z-20 bg-transparent"
      data-testid="dashboard-topbar"
    >
      <div className="relative flex items-center justify-center min-h-[56px] px-4 sm:px-6 lg:px-8 py-3">
        <PlayerSearchBar />

        <div className="absolute right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <ThemeSwitcher compact />
          <LanguageSwitcher compact />
          <NotificationsBell />
        </div>
      </div>
    </div>
  );
}
