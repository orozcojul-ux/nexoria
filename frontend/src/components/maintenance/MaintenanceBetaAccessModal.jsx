import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import api, { formatApiError, setBetaKey, setToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/LanguageProvider";
import { translateMaintenanceApiError, translateMaintenanceApiSuccess } from "@/lib/maintenance-i18n";
import MaintenanceModalShell from "./MaintenanceModalShell";
import MaintenanceDiscordOAuthButton from "./MaintenanceDiscordOAuthButton";
import {
  MAINT_DISCORD_FLOW_BETA,
  applyMaintenanceDiscordSession,
  shouldRedirectFeedAfterMaintDiscord,
} from "@/lib/maintenanceDiscordOAuth";

export default function MaintenanceBetaAccessModal({ onClose, onSuccess, onSwitchToCreate }) {
  const { setUser } = useAuth();
  const { t } = useI18n();
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
    } else if (data.beta_key_used) {
      setBetaKey(String(data.beta_key_used).toUpperCase());
    }
    onSuccess(translateMaintenanceApiSuccess(t, data.message) || t("maintenance.success.beta_activated"));
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
      setError(t("maintenance.error.all_fields"));
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
      setError(translateMaintenanceApiError(t, formatApiError(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MaintenanceModalShell
      title={t("maintenance.modal.beta.title")}
      onClose={onClose}
      testId="maintenance-beta-access-modal"
    >
      <form onSubmit={submit} className="maint-modal-form">
        <p className="maint-modal-lead">{t("maintenance.modal.beta.lead")}</p>

        <label className="maint-modal-field">
          <span>{t("maintenance.modal.field.beta_key")}</span>
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
          login={form.login}
          password={form.password}
          disabled={loading}
          label={t("maintenance.modal.beta.discord")}
          testId="maint-beta-discord"
          onComplete={handleDiscordComplete}
          onError={(err) => setError(translateMaintenanceApiError(t, err?.message || formatApiError(err)))}
        />

        <p className="maint-modal-hint text-[11px] text-zinc-500 italic">
          {t("maintenance.modal.beta.discord_hint")}
        </p>

        <div className="maint-modal-divider">
          <span>{t("maintenance.modal.divider_or_email")}</span>
        </div>

        <label className="maint-modal-field">
          <span>{t("maintenance.modal.field.login")}</span>
          <input
            value={form.login}
            onChange={(e) => set("login", e.target.value)}
            autoComplete="username"
            data-testid="maint-beta-login"
          />
        </label>
        <label className="maint-modal-field">
          <span>{t("maintenance.modal.field.password")}</span>
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
          {loading ? <Loader2 className="maint-modal-spin" strokeWidth={2} /> : t("maintenance.modal.beta.submit")}
        </button>
        <button type="button" className="maint-modal-link" onClick={onSwitchToCreate}>
          {t("maintenance.modal.beta.create_account")}
        </button>
      </form>
    </MaintenanceModalShell>
  );
}
