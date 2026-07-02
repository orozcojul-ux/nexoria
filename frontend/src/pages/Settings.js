import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Globe, Trash2, Save, AlertTriangle, KeyRound, Mail, AtSign, UserPlus, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { getDiscordDisplayName } from "@/lib/discord-display";
import { startDiscordLinkOAuth } from "@/lib/discordLink";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { sfx } from "@/lib/sfx";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CountryPicker from "@/components/CountryPicker";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import InstallAppButton from "@/components/InstallAppButton";
import TwoFASetup from "@/components/admin/TwoFASetup";
import { PageShell, PremiumSidebar, PremiumCard } from "@/components/ui-premium";
import ProfileCustomizeForm from "@/components/profile/ProfileCustomizeForm";
import { usePageBanner } from "@/lib/page-banners";
import { openOnboarding, useOnboardingOptional } from "@/contexts/OnboardingContext";
import { isTutorialPermanentlyFinished } from "@/lib/onboarding-lock";
import { Sparkles, Trophy } from "lucide-react";
import { isStaffRole } from "@/lib/staff-roles";

const BASE_SECTIONS = [
  { id: "profile",     icon: User,      key: "settings.profile" },
  { id: "account",     icon: Mail,      key: "settings.account" },
  { id: "security",    icon: Lock,      key: "settings.security" },
  { id: "preferences", icon: Globe,     key: "settings.preferences" },
  { id: "parrainage",  icon: UserPlus,  key: "settings.referral" },
  { id: "danger",      icon: AlertTriangle, key: "settings.danger" },
];

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const { t } = useI18n();
  const banner = usePageBanner("settings");
  const navigate = useNavigate();
  const [section, setSection] = useState("profile");
  const isStaff = isStaffRole(user);
  const sections = BASE_SECTIONS.filter((s) => !s.staffOnly || isStaff);

  if (!user) return null;

  return (
    <PageShell
      testid="settings-page"
      banner={banner}
    >

      <div className="grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <PremiumSidebar
            items={sections.map((s) => ({ id: s.id, label: t(s.key), icon: s.icon }))}
            active={section}
            onSelect={setSection}
            testidPrefix="settings-tab"
          />
        </aside>

        <main className="lg:col-span-9">
          <PremiumCard tone="cyan" className="p-6">
          {section === "profile" && <ProfileCustomizeForm user={user} refresh={refresh} t={t} />}
          {section === "account" && <AccountSection user={user} refresh={refresh} t={t} />}
          {section === "security" && <SecuritySection t={t} />}
          {section === "preferences" && <PreferencesSection user={user} refresh={refresh} t={t} />}
          {section === "parrainage" && <ReferralSection t={t} />}
          {section === "danger" && <DangerSection logout={logout} navigate={navigate} t={t} />}
          </PremiumCard>
        </main>
      </div>
    </PageShell>
  );
}

function AccountSection({ user, refresh, t }) {
  const [emailForm, setEmailForm] = useState({ current_password: "", new_email: "" });
  const [nameForm, setNameForm] = useState({ new_username: "" });

  const changeEmail = async (e) => {
    e.preventDefault();
    try {
      await api.post("/profile/change-email", emailForm);
      sfx.success(); toast.success(t("settings.email.updated"));
      setEmailForm({ current_password: "", new_email: "" });
      await refresh();
    } catch (err) { toast.error(err.response?.data?.detail || t("settings.error.generic")); }
  };

  const changeName = async (e) => {
    e.preventDefault();
    try {
      await api.post("/profile/change-username", nameForm);
      sfx.success(); toast.success(t("settings.username.updated"));
      setNameForm({ new_username: "" });
      await refresh();
    } catch (err) { toast.error(err.response?.data?.detail || t("settings.username.scrollError")); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl mb-3">{t("settings.email.title")}</h2>
        {(user.email || "").endsWith("@nexoria.local") && (
          <div
            className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200 leading-relaxed"
            data-testid="email-provisional-warning"
          >
            ⚠️ {t("settings.email.provisional")}
          </div>
        )}
        <div className="text-xs text-zinc-500 mb-3 font-mono-stat">{t("settings.email.current")} {user.email}</div>
        <form onSubmit={changeEmail} className="space-y-3">
          <Field label={t("settings.current_password")} type="password" value={emailForm.current_password} onChange={(v) => setEmailForm({ ...emailForm, current_password: v })} testid="email-current-pwd" />
          <Field label={t("settings.email.new")} type="email" value={emailForm.new_email} onChange={(v) => setEmailForm({ ...emailForm, new_email: v })} testid="new-email" />
          <button type="submit" data-testid="change-email-btn"
            className="px-4 py-2 rounded-md border border-cyan-500/40 text-cyan-300 font-bold text-sm">
            <Mail className="w-3 h-3 inline mr-1" /> {t("settings.email.update")}
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-display font-bold text-xl mb-2">{t("settings.username.title")}</h2>
        <div className="text-xs text-zinc-500 mb-3 font-mono-stat">{t("settings.username.current")} {user.username} <span className="text-yellow-500">{t("settings.username.scrollRequired")}</span></div>
        <form onSubmit={changeName} className="space-y-3">
          <Field label={t("settings.username.new")} value={nameForm.new_username} onChange={(v) => setNameForm({ new_username: v })} testid="new-username" />
          <button type="submit" data-testid="change-username-btn"
            className="px-4 py-2 rounded-md border border-violet-500/40 text-violet-300 font-bold text-sm">
            <AtSign className="w-3 h-3 inline mr-1" /> {t("settings.username.update")}
          </button>
        </form>
      </div>

      <DiscordLinkSection user={user} refresh={refresh} />
    </div>
  );
}

function DiscordLinkSection({ user, refresh }) {
  const { t } = useI18n();
  const [discordUrl, setDiscordUrl] = React.useState(null);
  const [syncing, setSyncing] = React.useState(false);
  const [unlinking, setUnlinking] = React.useState(false);
  const linked = !!user.discord_id;
  const discordAvatar = user.discord_avatar_url || (user.avatar_url?.includes("cdn.discordapp.com") ? user.avatar_url : null);
  const discordLabel = getDiscordDisplayName(user);

  React.useEffect(() => {
    if (!linked) api.get("/auth/discord/url").then((r) => setDiscordUrl(r.data.url)).catch(() => {});
  }, [linked]);

  const sync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post("/discord/sync-me");
      if (data.profile_updated && data.discord_display_name) {
        toast.success(`Profil Discord mis à jour : ${data.discord_display_name}`);
      } else if (data.ok && data.applied) toast.success(t("discord.settings.sync_ok"));
      else if (data.ok) toast.success(t("discord.settings.sync_uptodate"));
      else if (data.skipped) toast.info(`${t("discord.settings.sync_skipped")} : ${data.reason}`);
      else if (data.error === "not_in_guild") toast.error(t("discord.settings.not_in_guild"));
      else toast.error(data.error || t("discord.settings.sync_error"));
      await refresh();
    } catch (err) { toast.error(formatApiError(err) || t("discord.settings.sync_error")); }
    finally { setSyncing(false); }
  };

  const unlink = async () => {
    if (!window.confirm(t("discord.settings.unlink_confirm"))) return;
    setUnlinking(true);
    try {
      await api.delete("/auth/discord/unlink");
      toast.success(t("discord.settings.unlinked"));
      await refresh();
    } catch (err) {
      toast.error(formatApiError(err) || t("discord.settings.unlink_error"));
    } finally {
      setUnlinking(false);
    }
  };

  const startDiscordOAuth = async () => {
    try {
      await startDiscordLinkOAuth();
    } catch (err) {
      toast.error(formatApiError(err) || t("login.discord_error"));
    }
  };

  return (
    <div data-testid="discord-link-section">
      <h2 className="font-display font-bold text-xl mb-2 flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#5865F2"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
        Discord
      </h2>

      {linked ? (
        <div className="flex items-start gap-4 mb-4">
          {discordAvatar && (
            <img src={discordAvatar} alt="" className="w-14 h-14 rounded-xl border border-[#5865F2]/40 object-cover" data-testid="discord-linked-avatar" />
          )}
          <div className="text-xs text-zinc-500 font-mono-stat space-y-1">
            <div>{t("discord.settings.linked")} <span className="text-green-400">{user.discord_id}</span></div>
            {discordLabel && <div className="text-[#5865F2]">{discordLabel}</div>}
            {user.discord_username && user.discord_global_name && (
              <div className="text-zinc-600">@{user.discord_username}</div>
            )}
            {user.discord_roles_synced_at && (
              <span className="text-zinc-600 block">· {t("discord.settings.last_sync")} {new Date(user.discord_roles_synced_at).toLocaleString()}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-xs text-zinc-500 mb-3 font-mono-stat">{t("discord.settings.not_linked")}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {linked ? (
          <>
            <button onClick={sync} disabled={syncing} data-testid="discord-sync-me-btn"
              className="px-4 py-2 rounded-md text-white font-bold text-sm flex items-center gap-2 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #5865F2 0%, #404EED 100%)" }}>
              {syncing ? t("discord.settings.syncing") : t("discord.settings.sync_roles")}
            </button>
            <button onClick={unlink} disabled={unlinking} data-testid="discord-unlink-btn"
              className="px-4 py-2 rounded-md border border-red-500/40 text-red-300 font-bold text-sm disabled:opacity-40">
              {unlinking ? t("discord.settings.unlinking") : t("discord.settings.unlink")}
            </button>
          </>
        ) : (
          <button type="button" onClick={startDiscordOAuth} disabled={!discordUrl} data-testid="discord-link-btn"
            className={`px-4 py-2 rounded-md text-white font-bold text-sm inline-flex items-center gap-2 ${discordUrl ? "" : "opacity-40"}`}
            style={{ background: "linear-gradient(135deg, #5865F2 0%, #404EED 100%)" }}>
            {t("auth.continue_discord")}
          </button>
        )}
      </div>
    </div>
  );
}

function SecuritySection({ t }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) { toast.error(t("settings.password.mismatch")); return; }
    try {
      await api.post("/profile/change-password", { current_password: form.current_password, new_password: form.new_password });
      sfx.success(); toast.success(t("settings.password.changed"));
      setForm({ current_password: "", new_password: "", confirm: "" });
      setTimeout(() => { window.location.href = "/login"; }, 1500);
    } catch (err) { toast.error(err.response?.data?.detail || t("settings.error.generic")); }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <h2 className="font-display font-bold text-xl mb-2">{t("settings.change_password")}</h2>
        <Field label={t("settings.current_password")} type="password" value={form.current_password} onChange={(v) => setForm({ ...form, current_password: v })} testid="current-pwd" />
        <Field label={t("settings.new_password")} type="password" value={form.new_password} onChange={(v) => setForm({ ...form, new_password: v })} testid="new-pwd" />
        <Field label={t("common.confirm")} type="password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} testid="confirm-pwd" />
        <button type="submit" data-testid="change-pwd-btn"
          className="px-5 py-2.5 rounded-md border border-cyan-500/50 text-cyan-300 font-bold font-display tracking-wide hover:shadow-[0_0_18px_rgba(0,229,255,0.3)] flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> {t("settings.change_password")}
        </button>
      </form>

      {isStaff && (
        <div>
          <div className="border-t border-white/10 pt-6">
            <h2 className="font-display font-bold text-xl mb-1 flex items-center gap-2">
              <span className="w-5 h-5 text-violet-400">🔐</span>
              {t("settings.2fa.title")}
            </h2>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              {t("settings.2fa.desc")}
            </p>
            <TwoFASetup />
          </div>
        </div>
      )}
    </div>
  );
}

function PreferencesSection({ user, refresh, t }) {
  const onboarding = useOnboardingOptional();
  const tutorialFinished = isTutorialPermanentlyFinished(user, onboarding?.state);
  const [savingPresence, setSavingPresence] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);
  const appearOnline = user?.appear_offline !== true;
  const autoConnect = user?.nexus_auto_connect !== false;

  const togglePresence = async () => {
    const nextHidden = appearOnline; // currently visible → hide
    setSavingPresence(true);
    try {
      await api.put("/profile", { appear_offline: nextHidden });
      sfx.success();
      toast.success(nextHidden
        ? t("settings.presence.hidden")
        : t("settings.presence.visible"));
      await refresh();
    } catch (err) {
      toast.error(formatApiError(err) || t("settings.error.generic"));
    } finally {
      setSavingPresence(false);
    }
  };

  const toggleAuto = async () => {
    const next = !autoConnect;
    setSavingAuto(true);
    try {
      await api.put("/profile", { nexus_auto_connect: next });
      sfx.success();
      toast.success(next
        ? t("settings.nexusAuto.on")
        : t("settings.nexusAuto.off"));
      await refresh();
    } catch (err) {
      toast.error(formatApiError(err) || t("settings.error.generic"));
    } finally {
      setSavingAuto(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-preferences-section">
      <h2 className="font-display font-bold text-xl mb-2">{t("settings.preferences")}</h2>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-3">{t("settings.language")}</div>
        <LanguageSwitcher variant="pills" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400 font-bold mb-3">{t("settings.country")}</div>
        <CountryPicker user={user} refresh={refresh} variant="pills" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold mb-2">{t("settings.theme")}</div>
        <ThemeSwitcher />
      </div>

      <InstallAppButton variant="settings" />

      <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
        <div className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-300" />
          {t("settings.tutorial.title")}
        </div>
        {tutorialFinished ? (
          <div
            className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-violet-500/5 px-3 py-3"
            data-testid="settings-tutorial-completed"
          >
            <Trophy className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-bold text-amber-100">{t("settings.tutorial.completedTitle")}</p>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">{t("settings.tutorial.completedDesc")}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">{t("settings.tutorial.desc")}</p>
            <button
              type="button"
              className="text-[10px] uppercase tracking-widest font-bold text-violet-200 border border-violet-500/35 rounded-lg px-3 py-2 hover:bg-violet-500/10"
              data-testid="settings-replay-tutorial"
              onClick={() => openOnboarding()}
            >
              {t("settings.tutorial.continue")}
            </button>
          </>
        )}
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-3">{t("settings.presence.title")}</div>
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white mb-1">{t("settings.presence.online")}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t("settings.presence.onlineDesc")}
                </p>
              </div>
              <ToggleSwitch
                checked={appearOnline}
                disabled={savingPresence}
                onClick={togglePresence}
                testid="settings-presence-toggle"
              />
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white mb-1">{t("settings.nexusAuto.title")}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t("settings.nexusAuto.desc")}
                </p>
              </div>
              <ToggleSwitch
                checked={autoConnect}
                disabled={savingAuto}
                onClick={toggleAuto}
                testid="settings-nexus-auto-toggle"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onClick, disabled, testid }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      data-testid={testid}
      className={`relative shrink-0 w-11 h-6 rounded-full border transition-colors disabled:opacity-50 ${
        checked ? "bg-emerald-500/30 border-emerald-400/50" : "bg-black/40 border-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ReferralSection({ t }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    api.get("/referral/me")
      .then((r) => setData(r.data))
      .catch(() => {});
  }, []);

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const MILESTONE_ICONS = { 1: "🎁", 3: "🏅", 5: "💰", 10: "👑", 15: "🌟", 25: "💎", 50: "⚡" };

  return (
    <div className="space-y-6" data-testid="settings-referral-section">
      <div>
        <h2 className="font-display font-bold text-xl mb-1 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-emerald-400" /> {t("referral.title")}
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          {t("settings.referral.desc")}
        </p>
      </div>

      {!data ? (
        <div className="text-xs text-zinc-500 italic">{t("common.loading")}</div>
      ) : (
        <>
          {/* Code + lien */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-2">{t("settings.referral.yourCode")}</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-black tracking-widest text-white bg-black/40 border border-white/15 rounded-lg px-4 py-2" data-testid="referral-code">
                  {data.code}
                </span>
                <button
                  onClick={() => copy(data.code)}
                  className="p-2 rounded-lg border border-white/15 text-zinc-400 hover:text-white hover:border-emerald-400/50 transition-colors"
                  title={t("settings.referral.copyCode")}
                  data-testid="referral-copy-code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">{t("settings.referral.inviteLink")}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 bg-black/40 border border-white/10 rounded px-3 py-2 flex-1 truncate font-mono" data-testid="referral-link">
                  {data.link}
                </span>
                <button
                  onClick={() => copy(data.link)}
                  className="p-2 rounded-lg border border-white/15 text-zinc-400 hover:text-white hover:border-cyan-400/50 transition-colors"
                  title={t("settings.referral.copyLink")}
                  data-testid="referral-copy-link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={data.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-white/15 text-zinc-400 hover:text-white transition-colors"
                  title={t("settings.referral.openLink")}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-white/10">
              <span className="text-sm text-zinc-300">{t("settings.referral.referrals")}</span>
              <span className="font-mono-stat text-2xl font-black text-emerald-300" data-testid="referral-count">{data.count}</span>
            </div>
          </div>

          {/* Paliers */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400 font-bold mb-3">{t("referral.milestones")}</div>
            <div className="space-y-2">
              {(data.milestones || []).map((ms) => {
                const icon = MILESTONE_ICONS[ms.threshold] || "🎯";
                return (
                  <div
                    key={ms.threshold}
                    data-testid={`referral-milestone-${ms.threshold}`}
                    className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                      ms.claimed
                        ? "border-emerald-500/40 bg-emerald-500/8 opacity-70"
                        : ms.reached
                          ? "border-amber-400/60 bg-amber-400/10 shadow-[0_0_14px_rgba(251,191,36,0.2)]"
                          : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <span className="text-xl shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">{t("settings.referral.milestoneCount", { count: ms.threshold })}</div>
                      <div className="text-xs text-zinc-400">{t(`referral.milestone.${ms.threshold}`, ms.label)}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      {ms.claimed ? (
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                          <Check className="w-3 h-3" /> {t("referral.obtained")}
                        </span>
                      ) : ms.reached ? (
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">{t("settings.referral.milestonePending")}</span>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono-stat">{data.count} / {ms.threshold}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DangerSection({ logout, navigate, t }) {
  const del = async () => {
    if (!window.confirm(t("settings.delete.confirm1"))) return;
    if (!window.confirm(t("settings.delete.confirm2"))) return;
    try {
      await api.delete("/profile");
      toast.success(t("settings.delete.done"));
      const dest = await logout();
      navigate(dest);
    } catch (err) { toast.error(err.response?.data?.detail || t("settings.error.generic")); }
  };
  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-xl text-red-300 mb-2">{t("settings.danger")}</h2>
      <PremiumCard tone="violet" className="p-4 border-red-500/30" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
        <p className="text-sm text-red-200 italic mb-4">{t("settings.delete_warning")}</p>
        <button onClick={del} data-testid="delete-account-btn"
          className="px-4 py-2 rounded-md border border-red-500/50 text-red-300 hover:bg-red-500/10 font-bold text-sm flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> {t("settings.delete_account")}
        </button>
      </PremiumCard>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", testid, placeholder, textarea }) {
  const Cmp = textarea ? "textarea" : "input";
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">{label}</label>
      <Cmp
        type={type}
        value={value}
        placeholder={placeholder}
        rows={textarea ? 3 : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
        data-testid={testid}
      />
    </div>
  );
}
