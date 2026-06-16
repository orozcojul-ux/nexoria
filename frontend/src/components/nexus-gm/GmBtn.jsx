import React from "react";

const VARIANT = {
  cyan: "nexus-gm-btn--cyan",
  purple: "nexus-gm-btn--violet",
  orange: "nexus-gm-btn--orange",
  red: "nexus-gm-btn--danger",
  gold: "nexus-gm-btn--gold",
};

export default function GmBtn({ icon: Icon, label, color = "cyan", onClick, testid, className = "", active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`nexus-gm-btn ${VARIANT[color] || VARIANT.cyan} ${active ? "nexus-gm-btn--active" : ""} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {label}
    </button>
  );
}
