import React, { useEffect, useState, useRef } from "react";
import { X, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import "@/components/BroadcastOverlay.css";

const KIND_CLASS = {
  season: "broadcast-scroll--season",
  news: "broadcast-scroll--news",
};

const KIND_LABEL = {
  season: "Saison ouverte",
  news: "Héraut du royaume",
  broadcast: "Édit royal",
};

/** Site-wide royal proclamations — hidden for staff (they get StaffAlertOverlay instead). */
export default function BroadcastOverlay() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const [alert, setAlert] = useState(null);
  const seenIds = useRef(new Set(JSON.parse(localStorage.getItem("nexoria_seen_alerts") || "[]")));

  useEffect(() => {
    if (isStaff) return undefined;

    const check = async () => {
      try {
        const { data } = await api.get("/broadcasts/active");
        for (const a of data) {
          if (!seenIds.current.has(a.alert_id)) {
            seenIds.current.add(a.alert_id);
            localStorage.setItem("nexoria_seen_alerts", JSON.stringify([...seenIds.current]));
            setAlert(a);
            const soundFn = sfx[a.sound];
            if (soundFn) soundFn();
            else sfx.fanfare();
            const duration = a.kind === "season" ? 15000 : 12000;
            setTimeout(() => setAlert(null), duration);
            break;
          }
        }
      } catch {
        /* ignore */
      }
    };
    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, [isStaff]);

  if (isStaff) return null;

  const kind = alert?.kind || "broadcast";
  const kindClass = KIND_CLASS[kind] || "";
  const label = KIND_LABEL[kind] || KIND_LABEL.broadcast;
  const duration = kind === "season" ? 15000 : 12000;

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-16 lg:pt-6 px-4 pointer-events-none"
          data-testid="broadcast-overlay"
        >
          <div className={`broadcast-scroll ${kindClass}`}>
            <div className="broadcast-scroll-inner relative overflow-hidden">
              <div className="broadcast-ribbon" aria-hidden />
              <button
                type="button"
                onClick={() => setAlert(null)}
                className="broadcast-close"
                data-testid="alert-close"
                aria-label="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="broadcast-crown">
                <Crown className="w-7 h-7 text-amber-400/90" strokeWidth={1.5} />
              </div>

              <div className="flex justify-center mb-2">
                <span className="broadcast-seal">{label}</span>
              </div>

              <h2 className="broadcast-title">{alert.title}</h2>

              <p className="broadcast-body scroll-paragraph">{alert.message}</p>

              {alert.issued_by && (
                <p className="broadcast-issuer">— Par décret de {alert.issued_by} —</p>
              )}

              <motion.div
                className="broadcast-timer"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: duration / 1000, ease: "linear" }}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
