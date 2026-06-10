import React, { useEffect, useState, useRef } from "react";
import { Megaphone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";

export default function BroadcastOverlay() {
  const [alert, setAlert] = useState(null);
  const seenIds = useRef(new Set(JSON.parse(localStorage.getItem("nexoria_seen_alerts") || "[]")));

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await api.get("/broadcasts/active");
        for (const a of data) {
          if (!seenIds.current.has(a.alert_id)) {
            seenIds.current.add(a.alert_id);
            localStorage.setItem("nexoria_seen_alerts", JSON.stringify([...seenIds.current]));
            setAlert(a);
            sfx[a.sound] ? sfx[a.sound]() : sfx.fanfare();
            setTimeout(() => setAlert(null), 12000);
            break;
          }
        }
      } catch {}
    };
    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-16 lg:pt-4 px-4 pointer-events-none"
          data-testid="broadcast-overlay"
        >
          <div className="rune-border rounded-2xl px-6 py-4 max-w-2xl w-full bg-[#0a0610]/95 backdrop-blur-md pointer-events-auto relative">
            <div className="absolute inset-0 mist rounded-2xl pointer-events-none" />
            <button onClick={() => setAlert(null)} className="absolute top-2 right-2 text-zinc-500 hover:text-white" data-testid="alert-close">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 relative">
              <Megaphone className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_12px_rgba(255,215,0,0.8)] animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold font-display">Édit Royal · {alert.issued_by}</div>
                <div className="font-display font-black text-xl ancient-text mt-0.5">{alert.title}</div>
                <div className="text-sm text-zinc-200 italic mt-1 scroll-paragraph">{alert.message}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
