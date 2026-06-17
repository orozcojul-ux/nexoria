import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Globe, Trash2, Save, AlertTriangle, KeyRound, Mail, AtSign, Server } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { getDiscordDisplayName } from "@/lib/discord-display";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { sfx } from "@/lib/sfx";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { PageShell, PremiumSidebar, PremiumCard } from "@/components/ui-premium";
import ProfileCustomizeForm from "@/components/profile/ProfileCustomizeForm";
import { usePageBanner } from "@/lib/page-banners";
import { isStaffRole } from "@/lib/staff-roles";

const BASE_SECTIONS = [
  { id: "profile",     icon: User,    key: "settings.profile" },
  { id: "account",     icon: Mail,    key: "settings.account" },
  { id: "security",    icon: Lock,    key: "settings.security" },
  { id: "preferences", icon: Globe,   key: "settings.preferences" },
  { id: "server",      icon: Server,  key: "settings.server" },
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
          {section === "preferences" && <PreferencesSection t={t} />}
          {section === "server" && <ServerSection user={user} refresh={refresh} t={t} isStaff={isStaff} />}
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
      sfx.success(); toast.success("Email mis à jour");
      setEmailForm({ current_password: "", new_email: "" });
      await refresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const changeName = async (e) => {
    e.preventDefault();
    try {
      await api.post("/profile/change-username", nameForm);
      sfx.success(); toast.success("Pseudo mis à jour");
      setNameForm({ new_username: "" });
      await refresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur (Parchemin de Renommée requis)"); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl mb-3">Email</h2>
        {(user.email || "").endsWith("@nexoria.local") && (
          <div
            className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200 leading-relaxed"
            data-testid="email-provisional-warning"
          >
            ⚠️ Votre adresse e-mail est <strong>provisoire</strong> (générée via Discord). Vous devez
            obligatoirement la remplacer par une adresse e-mail valide ci-dessous pour sécuriser et
            pouvoir récupérer votre compte.
          </div>
        )}
        <div className="text-xs text-zinc-500 mb-3 font-mono-stat">Actuel : {user.email}</div>
        <form onSubmit={changeEmail} className="space-y-3">
          <Field label={t("settings.current_password")} type="password" value={emailForm.current_password} onChange={(v) => setEmailForm({ ...emailForm, current_password: v })} testid="email-current-pwd" />
          <Field label="Nouvel email" type="email" value={emailForm.new_email} onChange={(v) => setEmailForm({ ...emailForm, new_email: v })} testid="new-email" />
          <button type="submit" data-testid="change-email-btn"
            className="px-4 py-2 rounded-md border border-cyan-500/40 text-cyan-300 font-bold text-sm">
            <Mail className="w-3 h-3 inline mr-1" /> Mettre à jour l'email
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-display font-bold text-xl mb-2">Pseudo</h2>
        <div className="text-xs text-zinc-500 mb-3 font-mono-stat">Actuel : {user.username} <span className="text-yellow-500">· nécessite un Parchemin de Renommée</span></div>
        <form onSubmit={changeName} className="space-y-3">
          <Field label="Nouveau pseudo" value={nameForm.new_username} onChange={(v) => setNameForm({ new_username: v })} testid="new-username" />
          <button type="submit" data-testid="change-username-btn"
            className="px-4 py-2 rounded-md border border-violet-500/40 text-violet-300 font-bold text-sm">
            <AtSign className="w-3 h-3 inline mr-1" /> Renommer mon héros
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
      const { data } = await api.get("/auth/discord/url");
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error(t("login.discord_error"));
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
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    try {
      await api.post("/profile/change-password", { current_password: form.current_password, new_password: form.new_password });
      sfx.success(); toast.success("Mot de passe modifié — reconnectez-vous");
      setForm({ current_password: "", new_password: "", confirm: "" });
      setTimeout(() => { window.location.href = "/login"; }, 1500);
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <h2 className="font-display font-bold text-xl mb-2">{t("settings.change_password")}</h2>
      <Field label={t("settings.current_password")} type="password" value={form.current_password} onChange={(v) => setForm({ ...form, current_password: v })} testid="current-pwd" />
      <Field label={t("settings.new_password")} type="password" value={form.new_password} onChange={(v) => setForm({ ...form, new_password: v })} testid="new-pwd" />
      <Field label="Confirmer" type="password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} testid="confirm-pwd" />
      <button type="submit" data-testid="change-pwd-btn"
        className="px-5 py-2.5 rounded-md border border-cyan-500/50 text-cyan-300 font-bold font-display tracking-wide hover:shadow-[0_0_18px_rgba(0,229,255,0.3)] flex items-center gap-2">
        <KeyRound className="w-4 h-4" /> {t("settings.change_password")}
      </button>
    </form>
  );
}

function PreferencesSection({ t }) {
  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-xl mb-2">{t("settings.preferences")}</h2>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-3">{t("settings.language")}</div>
        <LanguageSwitcher variant="pills" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold mb-2">{t("settings.theme")}</div>
        <ThemeSwitcher />
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

function ServerSection({ user, refresh, t, isStaff }) {
  const [saving, setSaving] = useState(false);
  const [savingPresence, setSavingPresence] = useState(false);
  const enabled = user?.staff_nexus_auto_connect !== false;
  const appearOnline = user?.appear_offline !== true;

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    try {
      await api.put("/profile", { staff_nexus_auto_connect: next });
      sfx.success();
      toast.success(t(next ? "settings.server.nexus_auto_on" : "settings.server.nexus_auto_off"));
      await refresh();
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const togglePresence = async () => {
    const nextHidden = appearOnline; // currently visible → hide
    setSavingPresence(true);
    try {
      await api.put("/profile", { appear_offline: nextHidden });
      sfx.success();
      toast.success(nextHidden ? "Votre présence est désormais masquée" : "Vous apparaissez en ligne");
      await refresh();
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur");
    } finally {
      setSavingPresence(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-server-section">
      <h2 className="font-display font-bold text-xl mb-2">{t("settings.server")}</h2>

      <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-white mb-1">
              {appearOnline ? "Apparaître en ligne" : "Présence masquée"}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Lorsque votre présence est masquée, vous n'apparaissez plus dans le compteur de
              joueurs en ligne ni sur la carte du Nexus pour les autres héros.
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

      {isStaff && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white mb-1">{t("settings.server.nexus_auto")}</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{t("settings.server.nexus_auto_hint")}</p>
            </div>
            <ToggleSwitch
              checked={enabled}
              disabled={saving}
              onClick={toggle}
              testid="settings-staff-nexus-auto-toggle"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DangerSection({ logout, navigate, t }) {
  const del = async () => {
    if (!window.confirm("Cette action est IRRÉVERSIBLE. Confirmer ?")) return;
    if (!window.confirm("Vraiment vraiment sûr(e) ?")) return;
    try {
      await api.delete("/profile");
      toast.success("Compte supprimé");
      await logout();
      navigate("/");
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
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
