import React, { useEffect, useState } from "react";
import { Crown, Eye, EyeOff, Loader2, Save, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { getUserAvatarUrl } from "@/lib/user-avatar";
import { getStaffVisuals } from "@/lib/staff-roles";

const EMPTY_PROFILE = {
  visible: true,
  sort_order: 100,
  role_label: "",
  nationality: "",
  tagline: "",
  bio: "",
  specialties: [],
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

export default function TeamPageAdmin() {
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
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/90">
        <strong>Rangs verrouillés.</strong> Cet écran ne modifie pas les grades Sage / Sentinelle — uniquement la présentation publique sur la page Communauté.
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
            const avatar = getUserAvatarUrl(m);
            const gradeLabel = m.is_nexus_supreme ? "Gardien Suprême" : (visuals?.label || m.role);
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => selectMember(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${active ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 hover:border-white/20 bg-black/20"}`}
                data-testid={`team-admin-member-${m.user_id}`}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden border shrink-0" style={{ borderColor: visuals?.color || "#888" }}>
                  {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full text-xs font-bold">{m.username?.[0]}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{m.display_name || m.username}</div>
                  <div className="text-[10px] uppercase tracking-wider truncate" style={{ color: visuals?.color }}>{gradeLabel}</div>
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
                    {selected.is_nexus_supreme ? <Crown className="w-3 h-3 text-amber-300" /> : <Shield className="w-3 h-3 text-violet-300" />}
                    Grade actuel : {selected.is_nexus_supreme ? "Gardien Suprême" : (selected.role === "admin" ? "Sage" : "Sentinelle")} — non modifiable ici
                  </p>
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
