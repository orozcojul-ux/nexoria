import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, Ticket, Flag, MessageCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";
import { markStaffAlertsSeen, publishStaffAlert, STAFF_ALERT_KINDS } from "@/lib/staff-alerts";
import "./StaffAlertOverlay.css";

const KIND_META = {
  staff_ticket: { icon: Ticket, color: "text-amber-400", label: "Doléance", panel: "" },
  staff_ticket_reply: { icon: MessageCircle, color: "text-cyan-400", label: "Réponse doléance", panel: "staff-alert-panel--reply" },
  staff_report: { icon: Flag, color: "text-red-400", label: "Signalement", panel: "staff-alert-panel--report" },
};

export default function StaffAlertOverlay() {
  const { user } = useAuth();
  const [alert, setAlert] = useState(null);
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  useEffect(() => {
    if (!isStaff) return undefined;

    let timer;
    const handler = (e) => {
      const doc = e.detail;
      if (!doc || !STAFF_ALERT_KINDS.has(doc.kind)) return;
      setAlert(doc);
      try { sfx.war?.() || sfx.fanfare?.(); } catch {}
      clearTimeout(timer);
      timer = setTimeout(() => setAlert(null), 18000);
    };

    window.addEventListener("nexoria:staff-alert", handler);
    return () => {
      window.removeEventListener("nexoria:staff-alert", handler);
      clearTimeout(timer);
    };
  }, [isStaff]);

  // Poll notifications when staff is not on the Nexus socket (alerts still reach moderators).
  useEffect(() => {
    if (!isStaff) return undefined;

    let bootstrapped = false;
    const poll = async () => {
      try {
        const { data } = await api.get("/notifications");
        const staffItems = (data.items || []).filter((n) => STAFF_ALERT_KINDS.has(n.kind));
        if (!bootstrapped) {
          markStaffAlertsSeen(staffItems);
          bootstrapped = true;
          return;
        }
        for (const n of staffItems) {
          if (n.read) continue;
          if (publishStaffAlert(n)) break;
        }
      } catch {
        /* ignore poll errors */
      }
    };

    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [isStaff]);

  if (!isStaff || typeof document === "undefined") return null;

  const meta = alert ? (KIND_META[alert.kind] || KIND_META.staff_ticket) : null;
  const Icon = meta?.icon || Shield;
  const link = alert?.link || "/admin?tab=reports";
  const panelClass = meta?.panel || "";

  return createPortal(
    <AnimatePresence>
      {alert && (
        <>
          <motion.div
            key="staff-alert-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="staff-alert-backdrop"
            aria-hidden
            onClick={() => setAlert(null)}
          />
          <div className="staff-alert-stage" data-testid="staff-alert-overlay">
            <motion.div
              key="staff-alert-panel"
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              className={`staff-alert-panel ${panelClass}`}
              role="alertdialog"
              aria-labelledby="staff-alert-title"
              aria-describedby="staff-alert-message"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="staff-alert-topbar">
                <div className="staff-alert-kicker">
                  <Shield className="w-4 h-4 shrink-0" aria-hidden />
                  Alerte modération
                </div>
                <button
                  type="button"
                  onClick={() => setAlert(null)}
                  className="staff-alert-close"
                  aria-label="Fermer"
                  data-testid="staff-alert-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="staff-alert-body">
                <span className="staff-alert-type">{meta?.label}</span>
                <div className="staff-alert-icon-wrap">
                  <Icon className={`w-6 h-6 ${meta?.color || "text-amber-400"}`} aria-hidden />
                </div>
                <h3 id="staff-alert-title" className="staff-alert-title">{alert.title}</h3>
                <p id="staff-alert-message" className="staff-alert-message">{alert.message}</p>

                <div className="staff-alert-actions">
                  <Link
                    to={link}
                    onClick={() => setAlert(null)}
                    className="staff-alert-cta"
                    data-testid="staff-alert-action"
                  >
                    Traiter maintenant
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAlert(null)}
                    className="staff-alert-dismiss"
                  >
                    Plus tard
                  </button>
                </div>
              </div>

              <motion.div
                className="staff-alert-timer"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 18, ease: "linear" }}
              />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
