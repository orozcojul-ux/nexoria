import React, { useState } from "react";
import { KeyRound, UserPlus, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { translateMaintenanceApiSuccess } from "@/lib/maintenance-i18n";
import MaintenanceCreateAccountModal from "./MaintenanceCreateAccountModal";
import MaintenanceBetaAccessModal from "./MaintenanceBetaAccessModal";

export default function MaintenanceAnticipationPanel() {
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [betaOpen, setBetaOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const openCreate = () => { setBetaOpen(false); setCreateOpen(true); };
  const openBeta = () => { setCreateOpen(false); setBetaOpen(true); };

  const handleSuccess = (message) => {
    setSuccessMsg(translateMaintenanceApiSuccess(t, message) || message);
  };

  return (
    <>
      <div className="maint-panel maint-anticipation-panel" data-testid="maintenance-anticipation">
        <h2 className="maint-panel-title maint-anticipation-title">{t("maintenance.anticipation.title")}</h2>

        <p className="maint-anticipation-lead">{t("maintenance.anticipation.lead")}</p>
        <p className="maint-anticipation-body">{t("maintenance.anticipation.body")}</p>

        {successMsg && (
          <div className="maint-anticipation-success" data-testid="maint-register-success">
            <CheckCircle2 className="maint-anticipation-success-icon" strokeWidth={1.75} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="maint-anticipation-actions">
          <button
            type="button"
            className="maint-anticipation-btn maint-anticipation-btn--primary"
            onClick={openCreate}
            data-testid="maint-btn-create-account"
          >
            <UserPlus strokeWidth={1.75} />
            {t("maintenance.btn.create_account")}
          </button>
          <button
            type="button"
            className="maint-anticipation-btn maint-anticipation-btn--secondary"
            onClick={openBeta}
            data-testid="maint-btn-beta-key"
          >
            <KeyRound strokeWidth={1.75} />
            {t("maintenance.btn.beta_key")}
          </button>
        </div>
      </div>

      {createOpen && (
        <MaintenanceCreateAccountModal
          onClose={() => setCreateOpen(false)}
          onSuccess={handleSuccess}
          onSwitchToBeta={openBeta}
        />
      )}
      {betaOpen && (
        <MaintenanceBetaAccessModal
          onClose={() => setBetaOpen(false)}
          onSuccess={handleSuccess}
          onSwitchToCreate={openCreate}
        />
      )}
    </>
  );
}
