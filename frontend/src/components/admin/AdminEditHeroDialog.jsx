import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import HeroCardOpener from "@/components/HeroCardOpener";

const SURFACE = "relative rounded-xl border border-white/10 bg-gradient-to-br from-[#0F0820]/80 via-[#0A0613]/80 to-[#1A0B3D]/80 backdrop-blur";

const FIELD_LABELS = {
  username: "Pseudo",
  email: "Email",
  display_name: "Nom affiché",
  class_id: "Classe",
  secondary_class_id: "Classe secondaire",
  active_title: "Titre actif",
  level: "Niveau",
  xp: "XP",
  skill_points: "Points de compétence",
  aether: "Écus",
  reputation: "Réputation",
  role: "Rôle",
  bio: "Bio",
  avatar_url: "Avatar (URL)",
  banner_url: "Bannière (URL)",
};

function Section({ title, children }) {
  return (
    <div className="space-y-3 pt-1">
      <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400/90 font-bold border-b border-white/5 pb-1.5">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm text-zinc-100 focus:border-cyan-500/40 outline-none";

function buildForm(target) {
  return {
    username: target.username ?? "",
    email: target.email ?? "",
    display_name: target.display_name ?? "",
    class_id: target.class_id ?? "explorer",
    secondary_class_id: target.secondary_class_id ?? "",
    active_title: target.active_title ?? "novice",
    level: target.level ?? 1,
    xp: target.xp ?? 0,
    skill_points: target.skill_points ?? 0,
    aether: target.aether ?? 0,
    reputation: target.reputation ?? 0,
    role: target.role ?? "user",
    bio: target.bio ?? "",
    avatar_url: target.avatar_url ?? "",
    banner_url: target.banner_url ?? "",
    clear_ban: false,
  };
}

export default function AdminEditHeroDialog({ target, onClose, onDone, t }) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [titles, setTitles] = useState([]);
  const [form, setForm] = useState(() => buildForm(target));

  const banned = target.banned_until && new Date(target.banned_until) > new Date();

  useEffect(() => {
    Promise.all([
      api.get("/game/classes").then((r) => setClasses(r.data || [])).catch(() => {}),
      api.get("/game/titles").then((r) => setTitles(r.data || [])).catch(() => {}),
    ]);
  }, []);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const meta = useMemo(() => [
    { label: "Rang", value: target.rank || "—" },
    { label: "Classe", value: target.class_name || "—" },
    { label: "Inscrit le", value: target.created_at ? new Date(target.created_at).toLocaleDateString() : "—" },
    { label: "Auth", value: target.auth_provider || "local" },
  ], [target]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username.trim()) return toast.error("Pseudo requis");
    const payload = {
      username: form.username.trim(),
      email: form.email.trim(),
      display_name: form.display_name.trim(),
      class_id: form.class_id,
      secondary_class_id: form.secondary_class_id || null,
      active_title: form.active_title,
      level: Number(form.level),
      xp: Number(form.xp),
      skill_points: Number(form.skill_points),
      aether: Number(form.aether),
      reputation: Number(form.reputation),
      role: form.role,
      bio: form.bio.trim(),
      avatar_url: form.avatar_url.trim() || null,
      banner_url: form.banner_url.trim() || null,
    };
    if (form.clear_ban) payload.clear_ban = true;

    if (!Number.isFinite(payload.level) || payload.level < 1) return toast.error("Niveau invalide");
    if (Object.entries(payload).some(([k, v]) => typeof v === "number" && !Number.isFinite(v))) {
      return toast.error("Valeurs numériques invalides");
    }

    setSaving(true);
    try {
      const { data } = await api.put(`/admin/users/${target.user_id}`, payload);
      const fields = (data?.updated_fields || []).join(", ") || "profil";
      toast.success(`Héros modifié (${fields})`);
      await onDone({ user_id: target.user_id, ...payload, banned_until: form.clear_ban ? null : target.banned_until });
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const removeHero = async () => {
    if (!window.confirm(`Supprimer définitivement « ${target.username} » ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${target.user_id}`);
      toast.success("Héros supprimé");
      await onDone({ deleted: true, user_id: target.user_id });
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        className={`${SURFACE} rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4`}
        data-testid="edit-dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-black text-xl text-gradient">
              {t("admin.edit_user")} — {target.username}
            </h3>
            <p className="text-xs text-zinc-500 font-mono-stat mt-1">{target.user_id}</p>
          </div>
          <HeroCardOpener
            userId={target.user_id}
            username={target.username}
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-cyan-400 hover:text-cyan-300 shrink-0"
          >
            Carte héros <ExternalLink className="w-3 h-3" />
          </HeroCardOpener>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {meta.map((m) => (
            <div key={m.label} className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2">
              <div className="text-[9px] uppercase tracking-widest text-zinc-600">{m.label}</div>
              <div className="text-xs text-zinc-300 truncate">{m.value}</div>
            </div>
          ))}
        </div>

        {banned && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            Banni jusqu&apos;au {new Date(target.banned_until).toLocaleString()}
            {target.ban_reason ? ` — « ${target.ban_reason} »` : ""}
          </div>
        )}

        <Section title="Identité">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={FIELD_LABELS.username}>
              <input value={form.username} onChange={(e) => set("username", e.target.value)} className={inputCls} data-testid="edit-username" />
            </Field>
            <Field label={FIELD_LABELS.email}>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} data-testid="edit-email" />
            </Field>
            <Field label={FIELD_LABELS.display_name} className="sm:col-span-2">
              <input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} className={inputCls} data-testid="edit-display_name" />
            </Field>
          </div>
        </Section>

        <Section title="Classe & titre">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={FIELD_LABELS.class_id}>
              <select value={form.class_id} onChange={(e) => set("class_id", e.target.value)} className={inputCls} data-testid="edit-class_id">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label={FIELD_LABELS.secondary_class_id}>
              <select value={form.secondary_class_id} onChange={(e) => set("secondary_class_id", e.target.value)} className={inputCls} data-testid="edit-secondary_class_id">
                <option value="">— Aucune —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label={FIELD_LABELS.active_title} className="sm:col-span-2">
              <select value={form.active_title} onChange={(e) => set("active_title", e.target.value)} className={inputCls} data-testid="edit-active_title">
                {titles.map((ti) => (
                  <option key={ti.id} value={ti.id}>{ti.name}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Progression">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {["level", "xp", "skill_points", "aether", "reputation"].map((f) => (
              <Field key={f} label={FIELD_LABELS[f]}>
                <input
                  type="number"
                  value={form[f]}
                  onChange={(e) => set(f, e.target.value)}
                  className={inputCls}
                  data-testid={`edit-${f}`}
                />
              </Field>
            ))}
          </div>
        </Section>

        <Section title="Rôle & sanctions">
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <Field label={FIELD_LABELS.role}>
              <select value={form.role} onChange={(e) => set("role", e.target.value)} className={inputCls} data-testid="edit-role">
                <option value="user">Voyageur</option>
                <option value="moderator">Modérateur</option>
                <option value="admin">Sage (admin)</option>
              </select>
            </Field>
            {banned && (
              <label className="flex items-center gap-2 text-sm text-orange-200 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.clear_ban}
                  onChange={(e) => set("clear_ban", e.target.checked)}
                  className="rounded border-white/20"
                  data-testid="edit-clear_ban"
                />
                Lever le bannissement
              </label>
            )}
          </div>
        </Section>

        <Section title="Profil">
          <div className="space-y-3">
            <Field label={FIELD_LABELS.bio}>
              <textarea
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                rows={3}
                maxLength={500}
                className={`${inputCls} resize-y min-h-[72px]`}
                data-testid="edit-bio"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={FIELD_LABELS.avatar_url}>
                <input value={form.avatar_url} onChange={(e) => set("avatar_url", e.target.value)} className={inputCls} data-testid="edit-avatar_url" placeholder="https://…" />
              </Field>
              <Field label={FIELD_LABELS.banner_url}>
                <input value={form.banner_url} onChange={(e) => set("banner_url", e.target.value)} className={inputCls} data-testid="edit-banner_url" placeholder="https://…" />
              </Field>
            </div>
          </div>
        </Section>

        <div className="flex flex-wrap gap-2 justify-between items-center pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={removeHero}
            disabled={deleting || saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded border border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs font-bold disabled:opacity-50"
            data-testid="delete-user-btn"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Suppression…" : "Supprimer le héros"}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-white/10 text-sm text-zinc-400 hover:text-white">
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              data-testid="confirm-edit-btn"
              className="px-4 py-2 rounded border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 font-bold text-sm disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : t("common.save")}
            </button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}
