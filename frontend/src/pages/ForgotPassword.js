import React, { useState } from "react";
import { Link } from "react-router-dom";
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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { t } = useI18n();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSent(true);
      if (data.reset_link) {
        toast.success(t("login.forgot.dev_link"), { duration: 12000 });
        console.info("[NEXORIA] Reset link:", data.reset_link);
      } else {
        toast.success(data.message || t("login.forgot.sent"));
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFantasyPage testid="forgot-password-page">
      <AuthFantasyFormLayout showLogo={false}>
        <AuthFantasyPanel>
          <h2 className="af-subtitle">{t("login.forgot.title")}</h2>

          {sent ? (
            <div className="af-panel-body">
              <p className="af-subtitle-desc">{t("login.forgot.sent_detail")}</p>
              <p className="af-subtitle-desc">{t("login.forgot.oauth_hint")}</p>
              <Link to="/login" className="af-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", justifyContent: "center", width: "100%" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> {t("login.forgot.back")}
              </Link>
            </div>
          ) : (
            <form className="af-panel-body" onSubmit={handleSubmit}>
              <p className="af-subtitle-desc">{t("login.forgot.subtitle")}</p>
              <AuthFantasyField
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email")}
                testid="forgot-password-email"
                required
                autoComplete="email"
              />
              <AuthFantasyPrimaryBtn type="submit" disabled={loading} testid="forgot-password-submit">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("login.forgot.submit")}
              </AuthFantasyPrimaryBtn>
              <Link to="/login" className="af-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", justifyContent: "center" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> {t("login.forgot.back")}
              </Link>
            </form>
          )}
        </AuthFantasyPanel>
      </AuthFantasyFormLayout>
    </AuthFantasyPage>
  );
}
