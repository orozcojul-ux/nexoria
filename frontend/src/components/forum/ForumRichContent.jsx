import React from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

const EMOTES = {
  ":sword:": "⚔️",
  ":shield:": "🛡️",
  ":crown:": "👑",
  ":fire:": "🔥",
  ":star:": "⭐",
  ":heart:": "❤️",
  ":skull:": "💀",
  ":sparkles:": "✨",
};

function renderEmotes(text) {
  if (!text) return text;
  return text.replace(/:[a-z]+:/g, (m) => EMOTES[m] || m);
}

/** Affichage sécurisé du contenu HTML forum (sujets & réponses). */
export default function ForumRichContent({ html, plain, className = "" }) {
  let safe = sanitizeHtml(html || "");
  if (safe) {
    safe = renderEmotes(safe);
  }
  if (safe && safe.replace(/<[^>]+>/g, "").trim()) {
    return (
      <div
        className={`forum-rich text-zinc-200 leading-relaxed text-sm ${className}`}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }
  return (
    <div className={`text-zinc-200 whitespace-pre-wrap leading-relaxed text-sm ${className}`}>
      {renderEmotes(plain)}
    </div>
  );
}
