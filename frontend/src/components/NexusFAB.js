import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe2, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";

/**
 * Floating action button to enter the Nexus from any authenticated page.
 * Placed bottom-right, above (vertically) the Discord floating button.
 */
export default function NexusFAB() {
  const { user } = useAuth();
  const { status, overlayOpen, setOverlayOpen, players } = useNexusSocket() || {};
  const [hover, setHover] = useState(false);

  if (!user) return null;

  // Hidden while overlay is open (we don't want it sticking out on top of the world)
  if (overlayOpen) return null;

  const connected = status === "online";
  const StatusIcon = connected ? Wifi : WifiOff;
  const onlineCount = players?.length || 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 right-24 z-40 flex flex-col items-end gap-2"
        data-testid="nexus-fab-wrapper"
      >
        <AnimatePresence>
          {hover && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="px-3 py-2 rounded-lg glass border border-cyan-500/30 text-xs font-display whitespace-nowrap"
            >
              <div className="font-bold text-cyan-300">Entrer dans le Nexus</div>
              <div className="text-zinc-400 text-[10px] flex items-center gap-1 mt-0.5">
                <StatusIcon className={`w-3 h-3 ${connected ? "text-green-400" : "text-zinc-500"}`} />
                {connected ? `${onlineCount} héros en ligne` : "Connexion..."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.08, rotate: 6 }}
          whileTap={{ scale: 0.92 }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => setOverlayOpen(true)}
          data-testid="nexus-fab"
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 via-violet-700 to-cyan-600 border-2 border-cyan-300/50 shadow-[0_0_20px_rgba(124,58,237,0.6)] flex items-center justify-center group"
          aria-label="Entrer dans le Nexus"
        >
          <Globe2 className="w-6 h-6 text-white" />
          {connected && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-[#0A0613] animate-pulse" />
          )}
          {onlineCount > 0 && (
            <span className="absolute -bottom-1 -left-1 px-1.5 h-4 rounded-full bg-cyan-500 text-[9px] font-bold text-white flex items-center justify-center min-w-[16px] border border-cyan-300/60">
              {onlineCount > 99 ? "99+" : onlineCount}
            </span>
          )}
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
