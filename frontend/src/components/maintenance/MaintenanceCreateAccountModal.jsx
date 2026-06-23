import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import MaintenanceModalShell from "./MaintenanceModalShell";
import MaintenanceDiscordOAuthButton from "./MaintenanceDiscordOAuthButton";
import {
  MAINT_DISCORD_FLOW_REGISTER,
  applyMaintenanceDiscordSession,
  shouldRedirectFeedAfterMaintDiscord,
} from "@/lib/maintenanceDiscordOAuth";

export default function MaintenanceCreateAccountModal({ onClose, onSuccess, onSwitchToBeta }) {
  const { setUser } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleDiscordComplete = ({ data }) => {
    applyMaintenanceDiscordSession(data, { setUser });
    if (shouldRedirectFeedAfterMaintDiscord(data)) {
      onClose();
      window.location.replace("/feed");
      return;
    }
    onSuccess(data.message || "Compte créé via Discord.");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.email.trim() || form.password.length < 6) {
      setError("Remplis tous les champs (mot de passe ≥ 6 caractères).");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register-from-maintenance", {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      onSuccess(data.message || "Compte créé avec succès.");
      onClose();
    } catch (err) {
      setError(formatApiError(err) || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MaintenanceModalShell
      title="Créer mon compte NEXORIA"
      onClose={onClose}
      testId="maintenance-create-account-modal"
    >
      <form onSubmit={submit} className="maint-modal-form">
        <p className="maint-modal-notice">
          Inscription temporaire pour la bêta. Le choix de ta classe sera disponible dès l&apos;ouverture officielle du Nexus à tous les héros.
        </p>

        <MaintenanceDiscordOAuthButton
          flow={MAINT_DISCORD_FLOW_REGISTER}
          disabled={loading}
          label="S'inscrire avec Discord"
          testId="maint-register-discord"
          onComplete={handleDiscordComplete}
          onError={(err) => setError(err?.message || formatApiError(err) || "Connexion Discord impossible")}
        />

        <div className="maint-modal-divider">
          <span>ou par email</span>
        </div>

        <label className="maint-modal-field">
          <span>Pseudo</span>
          <input
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            autoComplete="username"
            maxLength={20}
            data-testid="maint-register-username"
          />
        </label>
        <label className="maint-modal-field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
            data-testid="maint-register-email"
          />
        </label>
        <label className="maint-modal-field">
          <span>Mot de passe</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="new-password"
            data-testid="maint-register-password"
          />
        </label>
        <label className="maint-modal-field">
          <span>Confirmer le mot de passe</span>
          <input
            type="password"
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            autoComplete="new-password"
            data-testid="maint-register-confirm"
          />
        </label>
        {error && <p className="maint-modal-error" data-testid="maint-register-error">{error}</p>}
        <button type="submit" className="maint-modal-primary" disabled={loading} data-testid="maint-register-submit">
          {loading ? <Loader2 className="maint-modal-spin" strokeWidth={2} /> : "Créer le compte"}
        </button>
        <button type="button" className="maint-modal-link" onClick={onSwitchToBeta}>
          J&apos;ai déjà un compte
        </button>
      </form>
    </MaintenanceModalShell>
  );
}
