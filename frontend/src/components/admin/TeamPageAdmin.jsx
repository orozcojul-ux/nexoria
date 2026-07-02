import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Eye, EyeOff, ExternalLink, Loader2, Save, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { getUserAvatarUrl } from "@/lib/user-avatar";
import { getStaffVisuals } from "@/lib/staff-roles";
import { useI18n } from "@/contexts/I18nContext";

const EMPTY_PROFILE = {
  visible: true,
  sort_order: 100,
  role_label: "",
  nationality: "",
  tagline: "",
  bio: "",
  specialties: [],
  moderator_trial: false,
};

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</span>
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
      {children}
    </label>
  );
}

const inputCls = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50";

function TeamCardPreview({ member, form, t }) {
  const visuals = getStaffVisuals(member);
  const accent = getStaffVisuals(member)?.color || (member.is_nexus_supreme ? "#FBBF24" : "#A78BFA");
  const avatar = getUserAvatarUrl(member);
  const specialties = String(form.specialtiesText || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const showModBadge = member.role === "moderator" && !member.is_official_sentinel;
  const modBadgeLabel = form.moderator_trial
    ? t("community.teamModerator.trial")
    : t("community.teamModerator.label");

  return (
    <div
      className="rounded-xl border border-white/10 bg-gradient-to-br from-black/50 to-violet-950/20 p-4 space-y-3"
      style={{ borderColor: `${accent}44` }}
    >
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Aperçu carte publique</p>
      <div className="flex gap-3">
        <div
          className="w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 flex items-center justify-center bg-black/40"
          style={{ borderColor: accent }}
        >
          {member.is_official_sentinel ? (
            avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <Shield className="w-7 h-7" style={{ color: accent }} />
          ) : avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold">{member.username?.[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-base truncate">{member.display_name || member.username}</div>
          {form.role_label && <p className="text-xs text-zinc-400 mt-0.5">{form.role_label}</p>}
          {showModBadge && (
            <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: accent }}>
              {modBadgeLabel}
            </p>
          )}
          {form.nationality && (
            <p className="text-[11px] text-zinc-500 mt-1">{form.nationality}</p>
          )}
        </div>
      </div>
      {form.tagline && (
        <blockquote className="text-xs italic text-violet-200/80 border-l-2 pl-3" style={{ borderColor: accent }}>
          {form.tagline.startsWith("«") ? form.tagline : `« ${form.tagline} »`}
        </blockquote>
      )}
      {form.bio && <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{form.bio}</p>}
      {specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {specialties.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-300">
              {tag}
            </span>
          ))}
        </div>
      )}
      {member.is_official_sentinel ? (
        <p className="text-[10px] flex items-center gap-1" style={{ color: `${accent}bb` }}>
          <ExternalLink className="w-3 h-3" />
          Clic sur la carte → fiche Sentinelle (profil fermé)
        </p>
      ) : (
        <p className="text-[10px] text-violet-300/70 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Clic sur la carte → profil héros
        </p>
      )}
    </div>
  );
}

export default function TeamPageAdmin() {
  const { t } = useI18n();
  const [settings, setSettings] = useState({ title: "", subtitle: "", intro: "" });
  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMember, setSavingMember] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/team-page");
      setSettings(data.settings || {});
      setMembers(data.members || []);
      if (selectedId) {
        const m = (data.members || []).find((x) => x.user_id === selectedId);
        if (m) setForm({ ...EMPTY_PROFILE, ...m.profile });
      }
    } catch {
      toast.error("Impossible de charger la page équipe");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectMember = (m) => {
    setSelectedId(m.user_id);
    const profile = { ...EMPTY_PROFILE, ...(m.profile || {}) };
    setForm({
      ...profile,
      specialtiesText: (profile.specialties || []).join(", "),
    });
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const { data } = await api.put("/admin/team-page/settings", settings);
      setSettings(data);
      toast.success("Textes de la page équipe enregistrés");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erreur");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveMember = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setSavingMember(true);
    try {
      const specialties = String(form.specialtiesText || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const { data } = await api.put(`/admin/team-page/members/${selectedId}`, {
        visible: form.visible,
        sort_order: Number(form.sort_order) || 100,
        role_label: form.role_label,
        nationality: form.nationality,
        tagline: form.tagline,
        bio: form.bio,
        specialties,
        moderator_trial: Boolean(form.moderator_trial),
      });
      setMembers((prev) => prev.map((m) => (
        m.user_id === selectedId ? { ...m, profile: data } : m
      )));
      setForm({ ...EMPTY_PROFILE, ...data, specialtiesText: (data.specialties || []).join(", ") });
      toast.success("Fiche équipe mise à jour");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erreur");
    } finally {
      setSavingMember(false);
    }
  };

  const selected = members.find((m) => m.user_id === selectedId);

  if (loading) {
    return <div className="text-zinc-500 text-sm py-8">Chargement…</div>;
  }

  return (
    <div className="space-y-6" data-testid="team-page-admin">
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/90 flex flex-wrap items-center justify-between gap-3">
        <span>
          <strong>Rangs verrouillés.</strong> Cet écran ne modifie pas les grades Sage / Sentinelle — uniquement la présentation publique sur la page Communauté.
        </span>
        <Link
          to="/community"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200 hover:text-amber-100 shrink-0"
        >
          Voir la page Communauté <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <form onSubmit={saveSettings} className="rounded-xl border border-white/10 bg-black/30 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-300" />
          <h3 className="font-display font-bold text-lg">En-tête de la section équipe</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Titre">
            <input className={inputCls} value={settings.title || ""} onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))} maxLength={80} data-testid="team-page-title" />
          </Field>
          <Field label="Sous-titre">
            <input className={inputCls} value={settings.subtitle || ""} onChange={(e) => setSettings((s) => ({ ...s, subtitle: e.target.value }))} maxLength={200} data-testid="team-page-subtitle" />
          </Field>
        </div>
        <Field label="Introduction" hint="Texte affiché sous le titre sur la page Communauté.">
          <textarea className={`${inputCls} min-h-[88px] resize-y`} value={settings.intro || ""} onChange={(e) => setSettings((s) => ({ ...s, intro: e.target.value }))} maxLength={800} data-testid="team-page-intro" />
        </Field>
        <button type="submit" disabled={savingSettings} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/40 text-amber-200 text-sm font-bold hover:bg-amber-500/10 disabled:opacity-50" data-testid="team-page-save-settings">
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer les textes
        </button>
      </form>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-5">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
          <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">Membres staff ({members.length})</h4>
          {members.map((m) => {
            const visuals = getStaffVisuals(m);
            const active = selectedId === m.user_id;
            const avatar = m.is_automated_sentinel ? null : getUserAvatarUrl(m);
            const gradeLabel = m.is_official_sentinel
              ? (m.system_key === "shumi" ? t("community.shumi.badge") : t("community.naria.badge"))
              : m.role === "moderator"
                ? (m.profile?.moderator_trial ? t("community.teamModerator.trial") : t("community.teamModerator.label"))
                : m.is_nexus_supreme
                  ? "Gardien Suprême"
                  : (visuals?.label || m.role);
            const accent = getStaffVisuals(m)?.color || (visuals?.color || "#888");
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => selectMember(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${active ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 hover:border-white/20 bg-black/20"}`}
                data-testid={`team-admin-member-${m.user_id}`}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center bg-black/30" style={{ borderColor: accent }}>
                  {m.is_official_sentinel ? (
                    avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <Shield className="w-5 h-5 text-violet-300" />
                  ) : avatar ? (
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center h-full text-xs font-bold">{m.username?.[0]}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{m.display_name || m.username}</div>
                  <div className="text-[10px] uppercase tracking-wider truncate" style={{ color: accent }}>{gradeLabel}</div>
                </div>
                {m.profile?.visible === false ? <EyeOff className="w-4 h-4 text-zinc-500 shrink-0" /> : <Eye className="w-4 h-4 text-emerald-400/80 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-5">
          {!selected ? (
            <p className="text-sm text-zinc-500 italic py-8 text-center">Sélectionnez un membre pour éditer sa fiche publique.</p>
          ) : (
            <form onSubmit={saveMember} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-display font-bold text-lg">{selected.display_name || selected.username}</h4>
                  <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                    {selected.is_official_sentinel ? (
                      <>
                        <Shield className="w-3 h-3 text-violet-300" />
                        Sentinelle officielle du Nexus — fiche publique éditable, sans profil joueur
                      </>
                    ) : (
                      <>
                        {selected.is_nexus_supreme ? <Crown className="w-3 h-3 text-amber-300" /> : <Shield className="w-3 h-3 text-violet-300" />}
                        Grade actuel : {selected.is_nexus_supreme ? "Gardien Suprême" : (selected.role === "admin" ? "Sage" : "Sentinelle")} — non modifiable ici
                      </>
                    )}
                  </p>
                  {!selected.is_official_sentinel && selected.username && (
                    <Link
                      to={`/profile/${selected.username}`}
                      className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 mt-2"
                    >
                      Voir le profil public <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-400 shrink-0 cursor-pointer">
                  <input type="checkbox" checked={form.visible !== false} onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))} data-testid="team-member-visible" />
                  Visible
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Ordre d'affichage" hint="Plus petit = plus haut.">
                  <input type="number" min={0} max={9999} className={inputCls} value={form.sort_order ?? 100} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} data-testid="team-member-sort" />
                </Field>
                <Field label="Nationalité" hint="Ex. France, Belgique, Québec…">
                  <input className={inputCls} value={form.nationality || ""} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} maxLength={64} placeholder="France" data-testid="team-member-nationality" />
                </Field>
              </div>

              <Field label="Rôle précis" hint="Fonction réelle — distinct du grade Sage/Sentinelle.">
                <input className={inputCls} value={form.role_label || ""} onChange={(e) => setForm((f) => ({ ...f, role_label: e.target.value }))} maxLength={80} placeholder="Fondateur · Game design & communauté" data-testid="team-member-role-label" />
              </Field>

              <Field label="Citation / accroche">
                <input className={inputCls} value={form.tagline || ""} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} maxLength={200} placeholder="« Forger des légendes, une session à la fois. »" data-testid="team-member-tagline" />
              </Field>

              <Field label="Bio (page équipe)">
                <textarea className={`${inputCls} min-h-[96px] resize-y`} value={form.bio || ""} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} maxLength={600} data-testid="team-member-bio" />
              </Field>

              <Field label="Spécialités" hint="Séparées par des virgules — affichées en badges.">
                <input className={inputCls} value={form.specialtiesText ?? (form.specialties || []).join(", ")} onChange={(e) => setForm((f) => ({ ...f, specialtiesText: e.target.value }))} placeholder="Modération, Discord, Événements" data-testid="team-member-specialties" />
              </Field>

              {selected.role === "moderator" && !selected.is_official_sentinel && (
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-orange-500/25 bg-orange-500/[0.06] px-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(form.moderator_trial)}
                    onChange={(e) => setForm((f) => ({ ...f, moderator_trial: e.target.checked }))}
                    data-testid="team-member-moderator-trial"
                  />
                  <span>
                    <span className="text-sm text-orange-100 font-semibold block">Modérateur(trice) en test</span>
                    <span className="text-[11px] text-zinc-500 block mt-0.5">
                      Affiche « Modérateur(trice) en test » sur la carte publique au lieu de « Modérateur(trice) ».
                    </span>
                  </span>
                </label>
              )}

              <TeamCardPreview member={selected} form={form} t={t} />

              <button type="submit" disabled={savingMember} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-500/40 text-violet-200 text-sm font-bold hover:bg-violet-500/10 disabled:opacity-50" data-testid="team-member-save">
                {savingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer la fiche
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
