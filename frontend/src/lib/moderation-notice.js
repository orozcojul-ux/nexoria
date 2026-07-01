import { toast } from "sonner";
import { Shield, ShieldAlert } from "lucide-react";
import React from "react";

/** Affiche un avertissement Naria/Shumi bien visible (toast long + événement global). */
export function showModerationNotice({ message, actor, blocked = false }) {
  if (!message) return;
  const title = actor ? `${actor} — Sentinelle` : "Modération";

  window.dispatchEvent(new CustomEvent("nexoria:moderation-notice", {
    detail: { message, actor, title, blocked },
  }));

  toast.custom(
    () => (
      <div
        className={`flex gap-3 p-4 rounded-xl border shadow-lg max-w-md ${
          blocked
            ? "border-red-500/40 bg-red-950/95"
            : "border-amber-500/40 bg-amber-950/95"
        }`}
        role="alert"
      >
        <div className={`shrink-0 mt-0.5 ${blocked ? "text-red-400" : "text-amber-400"}`}>
          {blocked ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-sm text-white mb-1">{title}</p>
          <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    ),
    { duration: blocked ? 14000 : 10000, id: "naria-moderation-notice" },
  );
}

/** Extrait et affiche une alerte modération depuis une réponse API ou une erreur. */
export function handleModerationApiResult(dataOrErr, { isError = false } = {}) {
  if (isError) {
    const detail = dataOrErr?.response?.data?.detail;
    if (detail?.moderation_blocked || detail?.naria) {
      showModerationNotice({
        message: detail.message,
        actor: detail.actor,
        blocked: true,
      });
      return true;
    }
    return false;
  }
  const naria = dataOrErr?.naria;
  if (naria?.message) {
    showModerationNotice({
      message: naria.message,
      actor: naria.actor,
      blocked: !!naria.blocked,
    });
    return true;
  }
  return false;
}
