import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function MaintenanceModalShell({ title, onClose, children, testId }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="maint-modal-overlay" onClick={onClose} data-testid={testId}>
      <div
        className="maint-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="maint-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="maint-modal-head">
          <h2 id="maint-modal-title" className="maint-modal-title">{title}</h2>
          <button type="button" className="maint-modal-close" onClick={onClose} aria-label="Fermer">
            <X strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
