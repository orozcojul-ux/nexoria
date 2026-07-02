import React from "react";

export default function TutorialOverlay({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="tutorial-overlay"
      role="dialog"
      aria-modal="true"
      data-testid="tutorial-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="tutorial-overlay-vignette" aria-hidden />
      <div className="tutorial-overlay-motes" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="tutorial-mote" style={{ "--i": i }} />
        ))}
      </div>
      {children}
    </div>
  );
}
