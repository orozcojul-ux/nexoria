import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Globe, Bell, Trash2, Save, AlertTriangle, KeyRound, Mail, AtSign } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { sfx } from "@/lib/sfx";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";

const SECTIONS = [
  { id: "profile",     icon: User,    key: "settings.profile" },
  { id: "account",     icon: Mail,    key: "settings.account" },
  { id: "security",    icon: Lock,    key: "settings.security" },
  { id: "preferences", icon: Globe,   key: "settings.preferences" },
  { id: "danger",      icon: AlertTriangle, key: "settings.danger" },
];

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [section, setSection] = useState("profile");

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="settings-page">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3"><RuneSeal icon={User} color="#00E5FF" size={44} /></div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
          {t("settings.title")}
        </h1>
        <RuneDivider className="mt-6 mb-6 max-w-md mx-auto" />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3 space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              data-testid={`settings-tab-${s.id}`}
              className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-all ${section === s.id ? (s.id === "danger" ? "bg-red-500/10 border border-red-500/40 text-red-300" : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300") : "border border-transparent text-zinc-400 hover:bg-white/[0.03]"}`}
            >
              <s.icon className="w-4 h-4" /> {t(s.key)}
            </button>
          ))}
        </aside>

        <main className="lg:col-span-9 glass rounded-2xl p-6">
          {section === "profile" && <ProfileSection user={user} refresh={refresh} t={t} />}
          {section === "account" && <AccountSection user={user} refresh={refresh} t={t} />}
          {section === "security" && <SecuritySection t={t} />}
          {section === "preferences" && <PreferencesSection t={t} />}
          {section === "danger" && <DangerSection logout={logout} navigate={navigate} t={t} />}
        </main>
      </div>
    </div>
  );
}

function ProfileSection({ user, refresh, t }) {
  const [form, setForm] = useState({
    bio: user.bio || "", quote: user.quote || "", story: user.story || "",
    avatar_url: user.avatar_url || "", banner_url: user.banner_url || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put("/profile", form);
      sfx.success(); toast.success(t("common.save") + " ✓");
      await refresh();
    } catch { toast.error("Erreur"); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <h2 className="font-display font-bold text-xl ancient-text mb-2">{t("settings.profile")}</h2>
      <Field label={t("settings.bio")} value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} testid="bio-input" textarea />
      <Field label={t("settings.quote")} value={form.quote} onChange={(v) => setForm({ ...form, quote: v })} testid="quote-input" />
      <Field label={t("settings.story")} value={form.story} onChange={(v) => setForm({ ...form, story: v })} testid="story-input" textarea />
      <Field label="URL Avatar" value={form.avatar_url} onChange={(v) => setForm({ ...form, avatar_url: v })} testid="avatar-input" placeholder="https://..." />
      <Field label="URL Bannière" value={form.banner_url} onChange={(v) => setForm({ ...form, banner_url: v })} testid="banner-input" placeholder="https://..." />
      <button type="submit" disabled={saving} data-testid="save-profile-btn"
        className="px-5 py-2.5 rounded-md border border-cyan-500/50 text-cyan-300 font-bold font-display tracking-wide hover:shadow-[0_0_18px_rgba(0,229,255,0.3)] disabled:opacity-40 flex items-center gap-2">
        <Save className="w-4 h-4" /> {t("common.save")}
      </button>
    </form>
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
        <h2 className="font-display font-bold text-xl ancient-text mb-3">Email</h2>
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
        <h2 className="font-display font-bold text-xl ancient-text mb-2">Pseudo</h2>
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
  const [discordUrl, setDiscordUrl] = React.useState(null);
  const [syncing, setSyncing] = React.useState(false);
  const linked = !!user.discord_id;

  React.useEffect(() => {
    if (!linked) api.get("/auth/discord/url").then((r) => setDiscordUrl(r.data.url)).catch(() => {});
  }, [linked]);

  const sync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post("/discord/sync-me");
      if (data.ok && data.applied) toast.success("Rôles Discord synchronisés !");
      else if (data.ok) toast.success("Vos rôles Discord sont déjà à jour");
      else if (data.skipped) toast.info(`Sync ignorée : ${data.reason}`);
      else if (data.error === "not_in_guild") toast.error("Vous n'êtes pas membre du serveur Discord NEXORIA");
      else toast.error(data.error || "Erreur de sync");
      await refresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setSyncing(false); }
  };

  return (
    <div data-testid="discord-link-section">
      <h2 className="font-display font-bold text-xl ancient-text mb-2 flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#5865F2"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
        Discord
      </h2>
      <div className="text-xs text-zinc-500 mb-3 font-mono-stat">
        {linked ? <>Compte lié : <span className="text-green-400">{user.discord_id}</span></> : "Aucun compte Discord lié pour le moment."}
        {user.discord_roles_synced_at && <span className="text-zinc-600 block">· dernière sync {new Date(user.discord_roles_synced_at).toLocaleString("fr-FR")}</span>}
      </div>
      {linked ? (
        <button onClick={sync} disabled={syncing} data-testid="discord-sync-me-btn"
          className="px-4 py-2 rounded-md text-white font-bold text-sm flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #5865F2 0%, #404EED 100%)" }}>
          {syncing ? "Synchronisation..." : "Synchroniser mes rôles Discord"}
        </button>
      ) : (
        <a href={discordUrl || "#"} data-testid="discord-link-btn"
          className={`px-4 py-2 rounded-md text-white font-bold text-sm inline-flex items-center gap-2 ${discordUrl ? "" : "opacity-40 pointer-events-none"}`}
          style={{ background: "linear-gradient(135deg, #5865F2 0%, #404EED 100%)" }}>
          Lier mon compte Discord
        </a>
      )}
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
      <h2 className="font-display font-bold text-xl ancient-text mb-2">{t("settings.change_password")}</h2>
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
      <h2 className="font-display font-bold text-xl ancient-text mb-2">{t("settings.preferences")}</h2>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">{t("settings.language")}</div>
        <LanguageSwitcher />
      </div>
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
      <div className="rune-border rounded-xl p-4 border-red-500/30">
        <p className="text-sm text-red-200 italic mb-4">{t("settings.delete_warning")}</p>
        <button onClick={del} data-testid="delete-account-btn"
          className="px-4 py-2 rounded-md border border-red-500/50 text-red-300 hover:bg-red-500/10 font-bold text-sm flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> {t("settings.delete_account")}
        </button>
      </div>
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
