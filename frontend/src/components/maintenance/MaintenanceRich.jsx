import React from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

/** Affiche du HTML maintenance nettoyé */
export default function MaintenanceRich({ html, className = "", testid, as: Tag = "div" }) {
  if (!html) return null;
  return (
    <Tag
      className={`maintenance-rich ${className}`.trim()}
      data-testid={testid}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
