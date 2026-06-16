import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import {
  AuthFantasyPage,
  AuthFantasyFormLayout,
  AuthFantasyPanel,
  AuthFantasyField,
  AuthFantasyPrimaryBtn,
} from "@/components/auth/AuthFantasy";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error(t("login.reset.missing_token"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("login.reset.mismatch"));
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      toast.success(data.message || t("login.reset.success"));
      navigate("/login");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFantasyPage testid="reset-password-page">
      <AuthFantasyFormLayout showLogo={false}>
        <AuthFantasyPanel>
          <h2 className="af-subtitle">{t("login.reset.title")}</h2>

          {!token ? (
            <div className="af-panel-body">
              <p className="af-subtitle-desc">{t("login.reset.missing_token")}</p>
              <Link to="/forgot-password" className="af-link">{t("login.forgot.title")}</Link>
            </div>
          ) : (
            <form className="af-panel-body" onSubmit={handleSubmit}>
              <AuthFantasyField
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.reset.new_password")}
                testid="reset-password-input"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <AuthFantasyField
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("login.reset.confirm")}
                testid="reset-password-confirm"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <AuthFantasyPrimaryBtn type="submit" disabled={loading} testid="reset-password-submit">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("login.reset.submit")}
              </AuthFantasyPrimaryBtn>
            </form>
          )}

          <Link to="/login" className="af-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", marginTop: "1rem" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> {t("login.forgot.back")}
          </Link>
        </AuthFantasyPanel>
      </AuthFantasyFormLayout>
    </AuthFantasyPage>
  );
}
