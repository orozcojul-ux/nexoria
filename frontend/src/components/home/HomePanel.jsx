import React from "react";

/** Panel empilé — style maquette accueil NEXORIA. */
export default function HomePanel({
  label,
  color = "var(--home-gold)",
  icon: Icon,
  count,
  extra,
  variant = "",
  children,
  className = "",
  testid,
}) {
  return (
    <div
      className={`feed-panel feed-panel--${variant} ${className}`.trim()}
      data-testid={testid}
    >
      <div className="feed-panel-head">
        <div className="feed-panel-label" style={{ color }}>
          {Icon && <Icon className="w-3 h-3" />}
          {label}
        </div>
        <div className="flex items-center gap-2">
          {extra}
          {count != null && <span className="feed-panel-count">{count}</span>}
        </div>
      </div>
      <div className="feed-panel-body">{children}</div>
    </div>
  );
}
