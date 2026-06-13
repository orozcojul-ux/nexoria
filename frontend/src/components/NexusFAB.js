import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe2, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";

/**
 * Floating action button to enter the Nexus from any authenticated page.
 * Persistent across navigation. Hidden while the overlay is open.
 */
export default function NexusFAB() {
  const { user } = useAuth();
  const ns = useNexusSocket();
  const [hover, setHover] = useState(false);

  if (!user || !ns) return null;
  if (ns.overlayOpen) return null;

  const connected = ns.status === "online";
  const StatusIcon = connected ? Wifi : WifiOff;
  // Use global presence count if available, otherwise fall back to room count
  const onlineCount = ns.presence?.total ?? (ns.players?.length || 0);

  return (
    <div className="fixed bottom-6 right-24 z-[60] flex flex-col items-end gap-2">
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="px-3 py-2 rounded-lg glass border border-cyan-500/30 text-xs font-display whitespace-nowrap pointer-events-none"
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
        type="button"
        whileHover={{ scale: 1.08 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => ns.setOverlayOpen(true)}
        data-testid="nexus-fab"
        aria-label="Entrer dans le Nexus"
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 via-violet-700 to-cyan-600 border-2 border-cyan-300/50 shadow-[0_0_20px_rgba(124,58,237,0.6)] flex items-center justify-center transition-transform active:scale-95"
      >
        <Globe2 className="w-6 h-6 text-white pointer-events-none" />
        {connected && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-[#0A0613] animate-pulse pointer-events-none" />
        )}
        {onlineCount > 0 && (
          <span className="absolute -bottom-1 -left-1 px-1.5 h-4 rounded-full bg-cyan-500 text-[9px] font-bold text-white flex items-center justify-center min-w-[16px] border border-cyan-300/60 pointer-events-none">
            {onlineCount > 99 ? "99+" : onlineCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
