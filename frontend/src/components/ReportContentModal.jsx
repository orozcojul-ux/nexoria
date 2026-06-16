import React, { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { PremiumModal, PremiumButton } from "@/components/ui-premium";

const REASONS = [
  { id: "spam", label: "Spam / publicité" },
  { id: "harassment", label: "Harcèlement / insultes" },
  { id: "inappropriate", label: "Contenu inapproprié" },
  { id: "cheating", label: "Triche / abus" },
  { id: "other", label: "Autre" },
];

/**
 * Signaler un contenu ou un joueur aux modérateurs.
 * targetType: forum_thread | forum_reply | user | news_article
 */
export function ReportButton({
  targetType,
  targetId,
  reportedUserId,
  contextLabel,
  className = "",
  size = "sm",
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-zinc-500 hover:text-red-400 transition-colors ${size === "sm" ? "text-[10px]" : "text-xs"} ${className}`}
        title="Signaler aux modérateurs"
        data-testid={`report-btn-${targetType}-${targetId}`}
      >
        <Flag className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span className="uppercase tracking-wider font-bold">Signaler</span>
      </button>
      {open && (
        <ReportContentModal
          open
          onClose={() => setOpen(false)}
          targetType={targetType}
          targetId={targetId}
          reportedUserId={reportedUserId}
          contextLabel={contextLabel}
        />
      )}
    </>
  );
}

export default function ReportContentModal({
  open,
  onClose,
  targetType,
  targetId,
  reportedUserId,
  contextLabel,
}) {
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (details.trim().length < 5) {
      toast.error("Décrivez le problème (5 caractères minimum)");
      return;
    }
    setSaving(true);
    try {
      await api.post("/reports", {
        target_type: targetType,
        target_id: targetId,
        reported_user_id: reportedUserId || null,
        reason,
        details: details.trim(),
      });
      toast.success("Signalement envoyé au Conseil des modérateurs");
      onClose();
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur lors de l'envoi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      title="Signaler aux modérateurs"
      icon={Flag}
      maxWidth="max-w-md"
      testid="report-modal"
    >
      <form onSubmit={submit} className="p-5 space-y-4">
        {contextLabel && (
          <p className="text-xs text-zinc-500 italic border-l-2 border-red-500/30 pl-3">
            Contexte : {contextLabel}
          </p>
        )}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Motif</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
            data-testid="report-reason"
          >
            {REASONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Détails</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Expliquez le problème pour aider les modérateurs…"
            rows={4}
            maxLength={1000}
            required
            minLength={5}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm resize-y"
            data-testid="report-details"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-zinc-400">Annuler</button>
          <PremiumButton type="submit" variant="gold" size="sm" disabled={saving} testid="report-submit">
            Envoyer le signalement
          </PremiumButton>
        </div>
      </form>
    </PremiumModal>
  );
}
