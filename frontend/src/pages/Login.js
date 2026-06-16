import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError, extractBanDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { sfx } from "@/lib/sfx";
import {
  AuthFantasyPage,
  AuthFantasyFormLayout,
  AuthFantasyPanel,
  AuthFantasyField,
  AuthFantasyOAuth,
  AuthFantasyPrimaryBtn,
  AuthFantasyFooterLink,
} from "@/components/auth/AuthFantasy";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser, setBanInfo } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      sfx.success();
      toast.success(t("login.welcome_back", { name: data.username }));
      navigate("/feed");
    } catch (err) {
      const ban = extractBanDetail(err);
      if (ban) { setBanInfo(ban); return; }
      toast.error(formatApiError(err));
    } finally { setLoading(false); }
  };

  const googleLogin = () => {
    const redirectUrl = window.location.origin + "/feed";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const discordLogin = async () => {
    try {
      const { data } = await api.get("/auth/discord/url");
      window.location.href = data.url;
    } catch {
      toast.error(t("login.discord_error"));
    }
  };

  return (
    <AuthFantasyPage testid="login-page">
      <AuthFantasyFormLayout>
        <AuthFantasyPanel>
          <form className="af-panel-body" onSubmit={handleSubmit}>
            <AuthFantasyField
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.email")}
              testid="login-email-input"
              required
              autoComplete="username email"
            />

            <AuthFantasyField
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.password")}
              testid="login-password-input"
              required
              autoComplete="current-password"
              extra={
                <Link to="/forgot-password" className="af-link" data-testid="login-forgot-password-link">
                  {t("login.forgot.link")}
                </Link>
              }
            />

            <AuthFantasyOAuth
              onGoogle={googleLogin}
              onDiscord={discordLogin}
              googleTestid="login-google-btn"
              discordTestid="login-discord-btn"
            />

            <AuthFantasyPrimaryBtn type="submit" disabled={loading} testid="login-submit-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("login.submit")}
            </AuthFantasyPrimaryBtn>
          </form>

          <AuthFantasyFooterLink>
            {t("login.no_account")}{" "}
            <Link to="/register" data-testid="login-to-register">{t("login.to_register")}</Link>
          </AuthFantasyFooterLink>
        </AuthFantasyPanel>
      </AuthFantasyFormLayout>
    </AuthFantasyPage>
  );
}
