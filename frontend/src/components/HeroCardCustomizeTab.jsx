import React, { useEffect, useRef, useState } from "react";
import { Upload, Loader2, Save, Palette, User } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";
import { resolveMediaUrl } from "@/lib/user-avatar";
import { IMAGE_UPLOAD_ACCEPT, isAllowedImageFile, imageUploadErrorMessage, uploadProfileAvatar } from "@/lib/image-upload";
import styles from "./HeroCard.module.css";

const ACCENT_PRESETS = ["#7B2FF7", "#00E5FF", "#FCD34D", "#10B981", "#F97316", "#EC4899", "#6366F1"];

function buildForm(user) {
  return {
    status_message: user.status_message || "",
    bio: user.bio || "",
    avatar_url: user.avatar_url || "",
    banner_url: user.banner_url || "",
    profile_accent: user.profile_accent || "#7B2FF7",
    active_frame: user.active_frame || "",
    active_title: user.active_title || "novice",
  };
}

export default function HeroCardCustomizeTab({
  user,
  targetUserId,
  isSelf,
  isStaffEdit,
  onSaved,
}) {
  const [form, setForm] = useState(() => buildForm(user));
  const [frames, setFrames] = useState([]);
  const [titles, setTitles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef(null);

  useEffect(() => {
    setForm(buildForm(user));
  }, [user]);

  useEffect(() => {
    if (isSelf) {
      Promise.all([
        api.get("/shop/inventory"),
        api.get("/shop/items"),
        api.get("/game/titles"),
      ]).then(([inv, items, tRes]) => {
        const ownedSkus = (inv.data?.cosmetics || []).map((c) => c.sku);
        setFrames((items.data || []).filter((i) => i.sku?.includes("frame") && ownedSkus.includes(i.sku)));
        setTitles(tRes.data || []);
      }).catch(() => {});
    } else {
      api.get("/game/titles").then((r) => setTitles(r.data || [])).catch(() => {});
    }
  }, [isSelf]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      toast.error("Format non supporté (JPG, PNG, GIF, WebP)");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image trop lourde (max 15 Mo)");
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadProfileAvatar(file, {
        targetUserId: isSelf ? undefined : targetUserId,
        isStaffEdit: Boolean(isStaffEdit && !isSelf),
      });
      set("avatar_url", url);
      sfx.success?.();
      toast.success(isStaffEdit ? "Avatar mis à jour (staff)" : "Photo de profil importée");
      await onSaved?.({ avatar_url: url });
    } catch (err) {
      toast.error(imageUploadErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isSelf) {
        await api.put("/profile", {
          status_message: form.status_message.trim(),
          bio: form.bio.trim(),
          avatar_url: form.avatar_url.trim() || null,
          banner_url: form.banner_url.trim() || null,
          profile_accent: form.profile_accent,
          active_frame: form.active_frame || null,
        });
        if (form.active_title !== user.active_title) {
          await api.put("/profile/title", { title_id: form.active_title });
        }
      } else {
        await api.put(`/admin/users/${targetUserId}/profile`, {
          status_message: form.status_message.trim(),
          bio: form.bio.trim(),
          avatar_url: form.avatar_url.trim() || null,
          banner_url: form.banner_url.trim() || null,
          profile_accent: form.profile_accent,
          active_frame: form.active_frame || null,
          active_title: form.active_title,
        });
      }
      sfx.success?.();
      toast.success("Profil mis à jour");
      await onSaved?.(form);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className={styles.customizeForm} data-testid="hero-card-customize">
      {isStaffEdit && (
        <p className={styles.customizeStaffNote}>
          Modification staff — les changements s&apos;appliquent au profil de <strong>{user.username}</strong>.
        </p>
      )}

      <section className={styles.customizeSection}>
        <h4 className={styles.customizeSectionTitle}><User className="w-3.5 h-3.5" /> Photo de profil</h4>
        <div className={styles.customizeAvatarRow}>
          <div
            className={styles.customizeAvatarPreview}
            style={{ borderColor: form.profile_accent }}
          >
            {form.avatar_url ? (
              <img src={resolveMediaUrl(form.avatar_url)} alt="" className={styles.customizeAvatarImg} />
            ) : (
              <span>{user.username?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className={styles.customizeAvatarActions}>
            <input
              ref={avatarFileRef}
              type="file"
              accept={IMAGE_UPLOAD_ACCEPT}
              className="hidden"
              onChange={handleAvatarFile}
              data-testid="hero-card-avatar-file"
            />
            <button
              type="button"
              onClick={() => avatarFileRef.current?.click()}
              disabled={uploadingAvatar}
              className={styles.customizeUploadBtn}
              data-testid="hero-card-avatar-upload"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingAvatar ? "Import…" : "Importer une image"}
            </button>
            <span className={styles.customizeHint}>JPG, PNG, GIF, WebP — max 15 Mo</span>
          </div>
        </div>
        <label className={styles.customizeLabel}>URL avatar (optionnel)</label>
        <input
          value={form.avatar_url}
          onChange={(e) => set("avatar_url", e.target.value)}
          placeholder="https://…"
          className={styles.customizeInput}
          data-testid="hero-card-avatar-url"
        />
      </section>

      <section className={styles.customizeSection}>
        <h4 className={styles.customizeSectionTitle}><Palette className="w-3.5 h-3.5" /> Apparence</h4>
        <label className={styles.customizeLabel}>Bannière (URL)</label>
        <input
          value={form.banner_url}
          onChange={(e) => set("banner_url", e.target.value)}
          placeholder="https://…"
          className={styles.customizeInput}
          data-testid="hero-card-banner-url"
        />
        <label className={styles.customizeLabel}>Couleur d&apos;accent</label>
        <div className={styles.customizeAccentRow}>
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("profile_accent", c)}
              className={`${styles.customizeAccentSwatch} ${form.profile_accent === c ? styles.customizeAccentSwatchActive : ""}`}
              style={{ background: c }}
              data-testid={`hero-card-accent-${c}`}
            />
          ))}
          <input
            type="color"
            value={form.profile_accent}
            onChange={(e) => set("profile_accent", e.target.value)}
            className={styles.customizeColorPicker}
          />
        </div>
        {isSelf && frames.length > 0 && (
          <>
            <label className={styles.customizeLabel}>Cadre cosmétique</label>
            <select
              value={form.active_frame}
              onChange={(e) => set("active_frame", e.target.value)}
              className={styles.customizeInput}
              data-testid="hero-card-frame-select"
            >
              <option value="">Aucun</option>
              {frames.map((f) => <option key={f.sku} value={f.sku}>{f.name}</option>)}
            </select>
          </>
        )}
      </section>

      <section className={styles.customizeSection}>
        <h4 className={styles.customizeSectionTitle}>Identité</h4>
        <label className={styles.customizeLabel}>Statut / humeur</label>
        <input
          value={form.status_message}
          onChange={(e) => set("status_message", e.target.value)}
          maxLength={140}
          placeholder="En quête dans le Nexus…"
          className={styles.customizeInput}
          data-testid="hero-card-status"
        />
        <label className={styles.customizeLabel}>Bio</label>
        <textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Quelques mots sur vous…"
          className={`${styles.customizeInput} ${styles.customizeTextarea}`}
          data-testid="hero-card-bio"
        />
        <label className={styles.customizeLabel}>Titre affiché</label>
        <select
          value={form.active_title}
          onChange={(e) => set("active_title", e.target.value)}
          className={styles.customizeInput}
          data-testid="hero-card-title-select"
        >
          {titles.map((tit) => {
            const unlocked = isStaffEdit || tit.unlocked || (user.level || 1) >= (tit.unlock_level || 1);
            return (
              <option key={tit.id} value={tit.id} disabled={!unlocked && tit.id !== user.active_title}>
                {tit.name}{!unlocked ? ` (Niv. ${tit.unlock_level})` : ""}
              </option>
            );
          })}
        </select>
      </section>

      <button
        type="submit"
        disabled={saving || uploadingAvatar}
        className={styles.customizeSaveBtn}
        data-testid="hero-card-save-profile"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
