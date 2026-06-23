import React, { useState } from "react";
import { KeyRound, UserPlus, CheckCircle2 } from "lucide-react";
import MaintenanceCreateAccountModal from "./MaintenanceCreateAccountModal";
import MaintenanceBetaAccessModal from "./MaintenanceBetaAccessModal";

export default function MaintenanceAnticipationPanel() {
  const [createOpen, setCreateOpen] = useState(false);
  const [betaOpen, setBetaOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const openCreate = () => { setBetaOpen(false); setCreateOpen(true); };
  const openBeta = () => { setCreateOpen(false); setBetaOpen(true); };

  return (
    <>
      <div className="maint-panel maint-anticipation-panel" data-testid="maintenance-anticipation">
        <h2 className="maint-panel-title maint-anticipation-title">Le Nexus se prépare.</h2>

        <p className="maint-anticipation-lead">
          Le Nexus est encore scellé. Crée ton compte dès maintenant afin d&apos;être prêt pour l&apos;ouverture.
          Si tu es sélectionné comme bêta-testeur, une clé bêta te permettra de débloquer l&apos;accès complet.
        </p>
        <p className="maint-anticipation-body">
          Les comptes créés pendant la maintenance seront prêts pour l&apos;ouverture.
          Si tu es sélectionné pour la bêta, une clé d&apos;accès te permettra de débloquer le royaume avant l&apos;ouverture officielle.
        </p>

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
            Créer mon compte
          </button>
          <button
            type="button"
            className="maint-anticipation-btn maint-anticipation-btn--secondary"
            onClick={openBeta}
            data-testid="maint-btn-beta-key"
          >
            <KeyRound strokeWidth={1.75} />
            J&apos;ai une clé bêta
          </button>
        </div>
      </div>

      {createOpen && (
        <MaintenanceCreateAccountModal
          onClose={() => setCreateOpen(false)}
          onSuccess={setSuccessMsg}
          onSwitchToBeta={openBeta}
        />
      )}
      {betaOpen && (
        <MaintenanceBetaAccessModal
          onClose={() => setBetaOpen(false)}
          onSuccess={setSuccessMsg}
          onSwitchToCreate={openCreate}
        />
      )}
    </>
  );
}
