import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/LanguageProvider";
import { translateMaintenanceApiError, translateMaintenanceApiSuccess } from "@/lib/maintenance-i18n";
import MaintenanceModalShell from "./MaintenanceModalShell";
import MaintenanceDiscordOAuthButton from "./MaintenanceDiscordOAuthButton";
import {
  MAINT_DISCORD_FLOW_REGISTER,
  applyMaintenanceDiscordSession,
  shouldRedirectFeedAfterMaintDiscord,
} from "@/lib/maintenanceDiscordOAuth";

export default function MaintenanceCreateAccountModal({ onClose, onSuccess, onSwitchToBeta }) {
  const { setUser } = useAuth();
  const { t } = useI18n();
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
    onSuccess(translateMaintenanceApiSuccess(t, data.message) || data.message || t("maintenance.success.account_discord"));
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.email.trim() || form.password.length < 6) {
      setError(t("maintenance.error.fill_fields"));
      return;
    }
    if (form.password !== form.confirm) {
      setError(t("maintenance.error.password_mismatch"));
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register-from-maintenance", {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      onSuccess(translateMaintenanceApiSuccess(t, data.message) || t("maintenance.success.account_created"));
      onClose();
    } catch (err) {
      setError(translateMaintenanceApiError(t, formatApiError(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MaintenanceModalShell
      title={t("maintenance.modal.create.title")}
      onClose={onClose}
      testId="maintenance-create-account-modal"
    >
      <form onSubmit={submit} className="maint-modal-form">
        <p className="maint-modal-notice">{t("maintenance.modal.create.notice")}</p>

        <MaintenanceDiscordOAuthButton
          flow={MAINT_DISCORD_FLOW_REGISTER}
          disabled={loading}
          label={t("maintenance.modal.create.discord")}
          testId="maint-register-discord"
          onComplete={handleDiscordComplete}
          onError={(err) => setError(translateMaintenanceApiError(t, err?.message || formatApiError(err)))}
        />

        <div className="maint-modal-divider">
          <span>{t("maintenance.modal.divider_or_email")}</span>
        </div>

        <label className="maint-modal-field">
          <span>{t("maintenance.modal.field.username")}</span>
          <input
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            autoComplete="username"
            maxLength={20}
            data-testid="maint-register-username"
          />
        </label>
        <label className="maint-modal-field">
          <span>{t("maintenance.modal.field.email")}</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
            data-testid="maint-register-email"
          />
        </label>
        <label className="maint-modal-field">
          <span>{t("maintenance.modal.field.password")}</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="new-password"
            data-testid="maint-register-password"
          />
        </label>
        <label className="maint-modal-field">
          <span>{t("maintenance.modal.field.confirm")}</span>
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
          {loading ? <Loader2 className="maint-modal-spin" strokeWidth={2} /> : t("maintenance.modal.create.submit")}
        </button>
        <button type="button" className="maint-modal-link" onClick={onSwitchToBeta}>
          {t("maintenance.modal.create.has_account")}
        </button>
      </form>
    </MaintenanceModalShell>
  );
}
