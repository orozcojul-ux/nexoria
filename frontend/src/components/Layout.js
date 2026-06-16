import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SiteBackground from "./SiteBackground";
import DashboardTopBar from "./cms/DashboardTopBar";
import NexoriaDrawer from "./NexoriaDrawer";
import DiscordFab from "./DiscordFab";
import GameLegendModal, { useGameLegend, GameLegendAutoOpen } from "./GameLegendModal";

export default function Layout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const { open, openLegend, closeLegend } = useGameLegend();
  const [drawerOpen, setDrawerOpen] = useState(false);

  React.useEffect(() => {
    const onOpen = () => openLegend();
    window.addEventListener("nexoria:open-legend", onOpen);
    return () => window.removeEventListener("nexoria:open-legend", onOpen);
  }, [openLegend]);

  if (!user) return children;

  const showTopBar = ["/feed", "/admin", "/friends"].some((p) => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-white relative">
      <SiteBackground variant="app" />

      <NexoriaDrawer
        isOpen={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
      />

      <main className="min-w-0 pt-16 pb-12 relative z-10">
        <div className="min-h-screen bg-gradient-to-br from-[#0c0a18]/25 via-transparent to-[#0e0820]/30">
          {showTopBar && <DashboardTopBar />}
          {children}
        </div>
      </main>

      <DiscordFab className="right-4 bottom-8" />

      <GameLegendModal open={open} onClose={closeLegend} />
      <GameLegendAutoOpen openLegend={openLegend} />
    </div>
  );
}
