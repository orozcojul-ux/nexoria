import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Globe2, ArrowRight, Wifi } from "lucide-react";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";
import StarField from "@/components/StarField";
import { useNexusSocket } from "@/contexts/NexusSocketContext";

/**
 * The /nexus route is now a thin CTA page. The actual world UI lives in
 * <NexusOverlay /> mounted at the App level, so the socket connection and
 * Phaser scene persist across navigation.
 */
export default function Nexus() {
  const ns = useNexusSocket();
  const open = ns?.overlayOpen;
  const setOpen = ns?.setOverlayOpen;
  const status = ns?.status;
  const players = ns?.players || [];

  // Auto-open on first visit
  useEffect(() => {
    if (ns && !open) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10 relative" data-testid="nexus-page">
      <StarField density={60} />
      <div className="text-center relative">
        <div className="flex justify-center mb-3"><RuneSeal icon={Globe2} color="#00E5FF" size={56} /></div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300 font-bold mb-2">Hub Social MMORPG</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
          Nexus <span className="text-gradient">Online</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-3 italic max-w-xl mx-auto">
          « Une dimension parallèle où les héros se rencontrent en chair et en éther. »
        </p>
        <RuneDivider className="my-6 max-w-md mx-auto" />

        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => setOpen?.(true)}
          data-testid="nexus-enter-button"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-700 via-violet-700 to-cyan-600 border-2 border-cyan-300/40 text-white font-display font-black text-lg shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(0,229,255,0.5)] transition-shadow">
          <Globe2 className="w-5 h-5" /> Entrer dans le Nexus <ArrowRight className="w-5 h-5" />
        </motion.button>

        <div className="mt-6 inline-flex items-center gap-2 text-xs text-zinc-400">
          <Wifi className={`w-3 h-3 ${status === "online" ? "text-green-400" : "text-zinc-500"}`} />
          {status === "online" ? (
            <>Connexion permanente · <span className="text-cyan-300 font-bold">{players.length} héros</span> dans le Nexus</>
          ) : status === "connecting" ? "Connexion en cours..." : "Hors-ligne"}
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
          <Hint title="Plein écran" body="Le Nexus s'ouvre par-dessus le site. Quitter ne déconnecte pas." />
          <Hint title="Multi-canaux" body="Global · Salle · Guilde · Chuchoter · Commerce · Événement" />
          <Hint title="Temps réel" body="Aucun rafraîchissement. Tout est poussé en WebSocket." />
        </div>
      </div>
    </div>
  );
}

function Hint({ title, body }) {
  return (
    <div className="p-3 rounded-lg border border-white/10 bg-white/5">
      <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">{title}</div>
      <div className="text-xs text-zinc-400 mt-1">{body}</div>
    </div>
  );
}
