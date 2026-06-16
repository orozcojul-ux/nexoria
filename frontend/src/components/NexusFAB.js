import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import "./NexusFAB.css";

function NexusPortalIcon() {
  return (
    <svg className="nexus-fab-portal" viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="nexusFabViolet" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4B5FD" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="nexusFabCyan" x1="16" y1="10" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A5F3FC" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <radialGradient id="nexusFabCore" cx="16" cy="16" r="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF8E7" />
          <stop offset="0.5" stopColor="#E8C97A" />
          <stop offset="1" stopColor="rgba(201,165,101,0)" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="13" stroke="url(#nexusFabViolet)" strokeWidth="0.8" opacity="0.7" />
      <circle cx="16" cy="16" r="9" stroke="url(#nexusFabCyan)" strokeWidth="0.6" opacity="0.55" strokeDasharray="3 2" />
      <path
        d="M16 6 L18 14 L16 12 L14 14 Z M16 26 L18 18 L16 20 L14 18 Z M6 16 L14 18 L12 16 L14 14 Z M26 16 L18 18 L20 16 L18 14 Z"
        fill="url(#nexusFabCyan)"
        opacity="0.9"
      />
      <circle cx="16" cy="16" r="4" fill="url(#nexusFabCore)" />
      <circle cx="16" cy="16" r="1.5" fill="#FFF8E7" />
    </svg>
  );
}

/**
 * Bouton flottant — portail vers le Nexus Online.
 */
export default function NexusFAB() {
  const { user } = useAuth();
  const ns = useNexusSocket();
  const location = useLocation();
  const [hover, setHover] = useState(false);

  if (!user || !ns) return null;
  if (ns.overlayOpen) return null;
  if (location.pathname === "/maintenance") return null;

  const closed = ns.status === "nexus_closed";
  const connected = ns.status === "online";
  const onlineCount = ns.presence?.total ?? (ns.players?.length || 0);

  return (
    <div className="nexus-fab-root">
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="nexus-fab-tooltip"
          >
            <p className="nexus-fab-tooltip-title">Nexus Online</p>
            <p className="nexus-fab-tooltip-sub">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: closed ? "#f59e0b" : connected ? "#4ade80" : "#71717a",
                  boxShadow: connected ? "0 0 8px rgba(74,222,128,0.8)" : "none",
                }}
              />
              {closed
                ? "Serveur Nexus fermé — le site reste accessible"
                : connected
                  ? `${onlineCount} héros dans le Nexus`
                  : "Connexion au portail…"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => ns?.openNexus?.()}
        data-testid="nexus-fab"
        aria-label="Ouvrir le Nexus Online"
        className="nexus-fab-btn"
      >
        <span className="nexus-fab-ring" aria-hidden />
        <span className="nexus-fab-ring nexus-fab-ring--inner" aria-hidden />
        <NexusPortalIcon />
        {connected && <span className="nexus-fab-live" aria-hidden />}
        {connected && onlineCount > 0 && (
          <span className="nexus-fab-count" aria-hidden>
            {onlineCount > 99 ? "99+" : onlineCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
