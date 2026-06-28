import React, { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { PremiumModal, PremiumButton } from "@/components/ui-premium";

const REASON_IDS = ["spam", "harassment", "inappropriate", "cheating", "other"];

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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-zinc-500 hover:text-red-400 transition-colors ${size === "sm" ? "text-[10px]" : "text-xs"} ${className}`}
        title={t("report.buttonTitle")}
        data-testid={`report-btn-${targetType}-${targetId}`}
      >
        <Flag className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span className="uppercase tracking-wider font-bold">{t("report.button")}</span>
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
  const { t } = useI18n();
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (details.trim().length < 5) {
      toast.error(t("report.detailsMin"));
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
      toast.success(t("report.sent"));
      onClose();
    } catch (err) {
      toast.error(formatApiError(err) || t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      title={t("report.modalTitle")}
      icon={Flag}
      maxWidth="max-w-md"
      testid="report-modal"
    >
      <form onSubmit={submit} className="p-5 space-y-4">
        {contextLabel && (
          <p className="text-xs text-zinc-500 italic border-l-2 border-red-500/30 pl-3">
            {t("report.context", { label: contextLabel })}
          </p>
        )}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">{t("report.reasonLabel")}</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
            data-testid="report-reason"
          >
            {REASON_IDS.map((id) => (
              <option key={id} value={id}>{t(`report.reason.${id}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">{t("report.detailsLabel")}</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t("report.detailsPlaceholder")}
            rows={4}
            maxLength={1000}
            required
            minLength={5}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm resize-y"
            data-testid="report-details"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-zinc-400">{t("report.cancel")}</button>
          <PremiumButton type="submit" variant="gold" size="sm" disabled={saving} testid="report-submit">
            {t("report.submit")}
          </PremiumButton>
        </div>
      </form>
    </PremiumModal>
  );
}
