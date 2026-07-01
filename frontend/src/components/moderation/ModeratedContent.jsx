import React from "react";
import { Shield } from "lucide-react";

/** Texte masqué par Naria/Shumi — style distinctif. */
export default function ModeratedContent({ text, className = "" }) {
  const hidden = typeof text === "string" && /masqu[ée] par/i.test(text);
  if (!hidden) {
    return <span className={className}>{text}</span>;
  }
  return (
    <span
      className={`inline-flex items-start gap-1.5 italic text-zinc-500 ${className}`}
      data-testid="moderated-content-placeholder"
    >
      <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500/80" />
      <span>{text}</span>
    </span>
  );
}
