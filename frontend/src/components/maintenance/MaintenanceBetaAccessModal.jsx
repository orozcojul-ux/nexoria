import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import api, { formatApiError, setBetaKey, setToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import MaintenanceModalShell from "./MaintenanceModalShell";
import MaintenanceDiscordOAuthButton from "./MaintenanceDiscordOAuthButton";
import {
  MAINT_DISCORD_FLOW_BETA,
  applyMaintenanceDiscordSession,
  shouldRedirectFeedAfterMaintDiscord,
} from "@/lib/maintenanceDiscordOAuth";

export default function MaintenanceBetaAccessModal({ onClose, onSuccess, onSwitchToCreate }) {
  const { setUser } = useAuth();
  const [form, setForm] = useState({ login: "", password: "", betaKey: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const finishSuccess = (data) => {
    if (data.session_token) {
      setToken(data.session_token);
      setUser(data);
    }
    if (form.betaKey.trim()) {
      setBetaKey(form.betaKey.trim().toUpperCase());
    }
    onSuccess(data.message || "Accès bêta activé. Bienvenue dans le Nexus.");
    onClose();
    if (shouldRedirectFeedAfterMaintDiscord(data)) {
      setTimeout(() => window.location.replace("/feed"), 800);
    }
  };

  const handleDiscordComplete = ({ data }) => {
    applyMaintenanceDiscordSession(data, { setUser });
    finishSuccess(data);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.login.trim() || !form.password || !form.betaKey.trim()) {
      setError("Remplis tous les champs.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/activate-beta-access", {
        login: form.login.trim(),
        password: form.password,
        beta_key: form.betaKey.trim(),
      });
      finishSuccess(data);
    } catch (err) {
      setError(formatApiError(err) || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MaintenanceModalShell
      title="Débloquer mon accès bêta"
      onClose={onClose}
      testId="maintenance-beta-access-modal"
    >
      <form onSubmit={submit} className="maint-modal-form">
        <p className="maint-modal-lead">
          Connecte-toi avec le compte créé pendant la maintenance, puis saisis ta clé bêta.
          Sans clé valide, l&apos;accès au site reste bloqué.
        </p>

        <label className="maint-modal-field">
          <span>Clé bêta</span>
          <input
            value={form.betaKey}
            onChange={(e) => set("betaKey", e.target.value.toUpperCase())}
            placeholder="BETA-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            maxLength={32}
            className="maint-modal-mono"
            data-testid="maint-beta-key"
          />
        </label>

        <MaintenanceDiscordOAuthButton
          flow={MAINT_DISCORD_FLOW_BETA}
          betaKey={form.betaKey}
          disabled={loading}
          label="Se connecter avec Discord"
          testId="maint-beta-discord"
          onComplete={handleDiscordComplete}
          onError={(err) => setError(err?.message || formatApiError(err) || "Connexion Discord impossible")}
        />

        <div className="maint-modal-divider">
          <span>ou par email</span>
        </div>

        <label className="maint-modal-field">
          <span>Email ou pseudo</span>
          <input
            value={form.login}
            onChange={(e) => set("login", e.target.value)}
            autoComplete="username"
            data-testid="maint-beta-login"
          />
        </label>
        <label className="maint-modal-field">
          <span>Mot de passe</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="current-password"
            data-testid="maint-beta-password"
          />
        </label>
        {error && <p className="maint-modal-error" data-testid="maint-beta-error">{error}</p>}
        <button type="submit" className="maint-modal-primary" disabled={loading} data-testid="maint-beta-submit">
          {loading ? <Loader2 className="maint-modal-spin" strokeWidth={2} /> : "Débloquer l'accès"}
        </button>
        <button type="button" className="maint-modal-link" onClick={onSwitchToCreate}>
          Créer un compte
        </button>
      </form>
    </MaintenanceModalShell>
  );
}
