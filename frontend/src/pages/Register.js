import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { sfx } from "@/lib/sfx";
import {
  AuthFantasyPage,
  AuthFantasyFormLayout,
  AuthFantasyPanel,
  AuthFantasyField,
  AuthFantasyOAuth,
  AuthFantasyDiscordNote,
  AuthFantasyPrimaryBtn,
  AuthFantasyFooterLink,
  AuthClassPage,
  AuthClassGrid,
  AuthClassFooter,
} from "@/components/auth/AuthFantasy";

export default function Register() {
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ email: "", username: "", password: "", class_id: null });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const { setUser } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    api.get("/game/classes").then((r) => setClasses(r.data)).catch(() => {});
  }, []);

  // Capture le code de parrainage (?ref=) pour l'inscription (email ou Discord).
  useEffect(() => {
    const ref = params.get("ref");
    if (ref) {
      try { localStorage.setItem("nexoria_ref", ref.trim().toUpperCase()); } catch {}
    }
  }, [params]);

  const discordLogin = async () => {
    try {
      const { data } = await api.get("/auth/discord/url");
      window.location.href = data.url;
    } catch {
      toast.error(t("login.discord_error"));
    }
  };

  const googleLogin = () => {
    const redirectUrl = window.location.origin + "/feed";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const next = async () => {
    if (!form.email || !form.username || form.password.length < 6) {
      toast.error(t("register.err_fields"));
      return;
    }
    setChecking(true);
    try {
      const { data } = await api.get("/auth/check-availability", {
        params: { email: form.email.trim(), username: form.username.trim() },
      });
      if (!data.email_available) {
        toast.error(t("register.err_email_taken"));
        return;
      }
      if (!data.username_available) {
        toast.error(t("register.err_username_taken"));
        return;
      }
      sfx.click();
      setStep(2);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    if (!form.class_id) { toast.error(t("register.err_class")); return; }
    setLoading(true);
    try {
      let referralCode = null;
      try { referralCode = localStorage.getItem("nexoria_ref"); } catch {}
      const { data } = await api.post("/auth/register", {
        ...form,
        email: form.email.trim(),
        username: form.username.trim(),
        referral_code: referralCode || undefined,
      });
      try { localStorage.removeItem("nexoria_ref"); } catch {}
      setUser(data);
      sfx.levelUp();
      toast.success(t("register.welcome", { name: data.username, class: data.class_name }));
      toast.info(t("register.discord.cta"), { duration: 6000 });
      navigate("/feed");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setLoading(false); }
  };

  if (step === 2) {
    return (
      <AuthFantasyPage testid="register-page" variant="class">
        <AuthClassPage
          title={t("register.step2.title")}
          footer={
            <AuthClassFooter
              backLabel={t("register.back")}
              onBack={() => setStep(1)}
              backTestid="register-back-btn"
              submitLabel={t("register.submit")}
              onSubmit={submit}
              submitDisabled={!form.class_id}
              submitLoading={loading}
              submitTestid="register-submit-btn"
            />
          }
        >
          <AuthClassGrid
            classes={classes}
            selectedId={form.class_id}
            onSelect={(id) => { setForm({ ...form, class_id: id }); sfx.click(); }}
          />
        </AuthClassPage>
      </AuthFantasyPage>
    );
  }

  return (
    <AuthFantasyPage testid="register-page">
      <AuthFantasyFormLayout>
        <AuthFantasyPanel>
          <div className="af-panel-body">
            <AuthFantasyField
              id="register-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t("auth.email")}
              testid="register-email-input"
              required
              autoComplete="email"
            />

            <AuthFantasyField
              id="register-username"
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, "") })}
              placeholder={t("auth.username")}
              testid="register-username-input"
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
            />

            <AuthFantasyField
              id="register-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t("auth.password")}
              testid="register-password-input"
              required
              minLength={6}
              autoComplete="new-password"
            />

            <AuthFantasyOAuth
              onGoogle={googleLogin}
              onDiscord={discordLogin}
              googleTestid="register-google-btn"
              discordTestid="register-discord-oauth-btn"
            />

            <AuthFantasyDiscordNote>{t("register.discord.note")}</AuthFantasyDiscordNote>

            <AuthFantasyPrimaryBtn onClick={next} disabled={checking} testid="register-next-btn">
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : t("register.continue")}
            </AuthFantasyPrimaryBtn>

            <AuthFantasyFooterLink>
              {t("register.has_account")}{" "}
              <Link to="/login" data-testid="register-to-login">{t("register.to_login")}</Link>
            </AuthFantasyFooterLink>
          </div>
        </AuthFantasyPanel>
      </AuthFantasyFormLayout>
    </AuthFantasyPage>
  );
}
