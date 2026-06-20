import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import SiteBackground from "./SiteBackground";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import NexoriaDrawer from "./NexoriaDrawer";
import DiscordFab from "./DiscordFab";
import GuildInvitePrompt from "./GuildInvitePrompt";
import GameLegendModal, { useGameLegend, GameLegendAutoOpen } from "./GameLegendModal";

export default function Layout({ children }) {
  const { user } = useAuth();
  const ns = useNexusSocket();
  const nexusOpen = Boolean(ns?.overlayOpen);
  const { open, openLegend, closeLegend } = useGameLegend();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (nexusOpen) setDrawerOpen(false);
  }, [nexusOpen]);

  React.useEffect(() => {
    const onOpen = () => openLegend();
    window.addEventListener("nexoria:open-legend", onOpen);
    return () => window.removeEventListener("nexoria:open-legend", onOpen);
  }, [openLegend]);

  if (!user) return children;

  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-white relative">
      <SiteBackground variant="app" />

      {!nexusOpen && <SiteHeader />}

      {!nexusOpen && (
        <NexoriaDrawer
          isOpen={drawerOpen}
          onOpen={() => setDrawerOpen(true)}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      <main className={`min-w-0 pb-12 relative z-10 ${nexusOpen ? "" : "pt-16"}`}>
        <div className="min-h-screen bg-gradient-to-br from-[#0c0a18]/25 via-transparent to-[#0e0820]/30">
          {children}
        </div>
        <SiteFooter />
      </main>

      {!nexusOpen && <DiscordFab className="right-4 bottom-8" />}

      <GuildInvitePrompt />

      <GameLegendModal open={open} onClose={closeLegend} />
      <GameLegendAutoOpen openLegend={openLegend} />
    </div>
  );
}
