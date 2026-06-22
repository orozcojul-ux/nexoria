import React, { useEffect, useRef, useState } from "react";
import { Save, Eye, Palette, Link2, User, BookOpen, Settings2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";
import { useHeroCard } from "@/contexts/HeroCardContext";
import HeroCardOpener from "@/components/HeroCardOpener";
import { resolveMediaUrl } from "@/lib/user-avatar";
import { IMAGE_UPLOAD_ACCEPT, IMAGE_UPLOAD_MAX_RAW_BYTES, isAllowedImageFile, imageUploadErrorMessage, uploadProfileAvatar } from "@/lib/image-upload";
import { PremiumButton } from "@/components/ui-premium";

const ACCENT_PRESETS = ["#7B2FF7", "#00E5FF", "#FCD34D", "#10B981", "#F97316", "#EC4899", "#6366F1"];

function emptySocial(links) {
  return {
    twitter: links?.twitter || "",
    twitch: links?.twitch || "",
    youtube: links?.youtube || "",
  };
}

export default function ProfileCustomizeForm({ user, refresh, t }) {
  const { openHeroCard } = useHeroCard();
  const [form, setForm] = useState({
    status_message: user.status_message || "",
    location: user.location || "",
    bio: user.bio || "",
    quote: user.quote || "",
    story: user.story || "",
    avatar_url: user.avatar_url || "",
    banner_url: user.banner_url || "",
    website_url: user.website_url || "",
    social_links: emptySocial(user.social_links),
    profile_accent: user.profile_accent || "#7B2FF7",
    profile_show_stats: user.profile_show_stats !== false,
    profile_show_dna: user.profile_show_dna !== false,
    profile_show_chronicle: user.profile_show_chronicle !== false,
    profile_visibility: user.profile_visibility || "public",
    profile_hide_hero_card: user.profile_hide_hero_card === true,
    active_frame: user.active_frame || "",
  });
  const [frames, setFrames] = useState([]);
  const [titles, setTitles] = useState([]);
  const [activeTitle, setActiveTitle] = useState(user.active_title || "novice");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef(null);

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      toast.error("Format non supporté (JPG, PNG, GIF, WebP)");
      return;
    }
    if (file.size > IMAGE_UPLOAD_MAX_RAW_BYTES) {
      toast.error("Image trop lourde (max 15 Mo)");
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadProfileAvatar(file);
      set("avatar_url", url);
      sfx.success?.();
      toast.success("Photo de profil importée");
      await refresh();
    } catch (err) {
      toast.error(imageUploadErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get("/shop/inventory"),
      api.get("/shop/items"),
      api.get("/game/titles"),
    ]).then(([inv, items, tRes]) => {
      const ownedSkus = (inv.data?.cosmetics || []).map((c) => c.sku);
      setFrames((items.data || []).filter((i) => i.sku?.includes("frame") && ownedSkus.includes(i.sku)));
      setTitles(tRes.data || []);
    }).catch(() => {});
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setSocial = (key, val) => setForm((f) => ({ ...f, social_links: { ...f.social_links, [key]: val } }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/profile", {
        status_message: form.status_message.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
        quote: form.quote.trim(),
        story: form.story.trim(),
        avatar_url: form.avatar_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
        website_url: form.website_url.trim() || null,
        social_links: form.social_links,
        profile_accent: form.profile_accent,
        profile_show_stats: form.profile_show_stats,
        profile_show_dna: form.profile_show_dna,
        profile_show_chronicle: form.profile_show_chronicle,
        profile_visibility: form.profile_visibility,
        profile_hide_hero_card: form.profile_hide_hero_card,
        active_frame: form.active_frame || null,
      });
      if (activeTitle !== user.active_title) {
        await api.put("/profile/title", { title_id: activeTitle });
      }
      sfx.success();
      toast.success("Profil mis à jour");
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const displayLabel = user.username;

  return (
    <form onSubmit={save} className="space-y-8" data-testid="profile-customize-form">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Personnaliser mon profil
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Personnalisation du profil public —{" "}
            <button
              type="button"
              onClick={() => openHeroCard(user.user_id)}
              className="text-violet-400 underline hover:text-violet-300"
            >
              voir la carte héros
            </button>
            .
          </p>
        </div>
        <HeroCardOpener userId={user.user_id} username={user.username} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Voir la carte héros
        </HeroCardOpener>
      </div>

      {/* Aperçu */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: `${form.profile_accent}44` }}
        data-testid="profile-preview"
      >
        <div className="h-20 relative" style={{ background: `linear-gradient(135deg, ${form.profile_accent}33, #0a0613)` }}>
          {form.banner_url && <img src={form.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
        </div>
        <div className="p-4 flex gap-3 -mt-8 relative">
          <div className="w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 bg-zinc-900" style={{ borderColor: form.profile_accent }}>
            {form.avatar_url ? (
              <img src={resolveMediaUrl(form.avatar_url)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-lg">{user.username?.[0]}</div>
            )}
          </div>
          <div className="pt-6 min-w-0">
            <div className="font-display font-bold text-white truncate">{displayLabel}</div>
            {form.status_message && <div className="text-xs text-zinc-400 truncate">{form.status_message}</div>}
          </div>
        </div>
      </div>

      <Section title="Identité" icon={User}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Statut / humeur" value={form.status_message} onChange={(v) => set("status_message", v)} testid="status-input" placeholder="En quête dans le Nexus…" hint="Affiché sur votre profil public" />
          <Field label="Localisation" value={form.location} onChange={(v) => set("location", v)} testid="location-input" placeholder="Royaume d'Aethermoor" />
        </div>
        <div className="mt-4">
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">Titre affiché</label>
          <select
            value={activeTitle}
            onChange={(e) => setActiveTitle(e.target.value)}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm"
            data-testid="profile-title-select"
          >
            {titles.map((tit) => {
              const unlocked = tit.unlocked ?? user.level >= (tit.unlock_level || 1);
              return (
                <option key={tit.id} value={tit.id} disabled={!unlocked && tit.id !== user.active_title}>
                  {tit.name}{tit.shop_only && !unlocked ? " (Boutique)" : !unlocked ? ` (Niv. ${tit.unlock_level})` : ""}
                </option>
              );
            })}
          </select>
        </div>
      </Section>

      <Section title="Médias" icon={Palette}>
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-bold mb-2 block">Photo de profil</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 bg-zinc-900" style={{ borderColor: form.profile_accent }}>
              {form.avatar_url ? (
                <img src={resolveMediaUrl(form.avatar_url)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xl text-zinc-500">
                  {user.username?.[0]}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={avatarFileRef}
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                className="hidden"
                onChange={handleAvatarFile}
                data-testid="avatar-file-input"
              />
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-500/40 text-violet-200 text-sm font-bold hover:bg-violet-500/10 disabled:opacity-50 transition-all"
                data-testid="avatar-upload-btn"
              >
                {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingAvatar ? "Import en cours…" : "Importer depuis mon ordinateur"}
              </button>
              <span className="text-xs text-zinc-500">JPG, PNG, GIF ou WebP — max 15 Mo.</span>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="URL Avatar (ou collez un lien)" value={form.avatar_url} onChange={(v) => set("avatar_url", v)} testid="avatar-input" placeholder="https://..." />
          <Field label="URL Bannière profil" value={form.banner_url} onChange={(v) => set("banner_url", v)} testid="banner-input" placeholder="https://..." hint="Bannière de votre page profil" />
        </div>
        <div className="mt-4">
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">Couleur d'accent</label>
          <div className="flex flex-wrap gap-2 items-center">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("profile_accent", c)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${form.profile_accent === c ? "border-white scale-110" : "border-transparent"}`}
                style={{ background: c }}
                data-testid={`accent-${c}`}
              />
            ))}
            <input
              type="color"
              value={form.profile_accent}
              onChange={(e) => set("profile_accent", e.target.value)}
              className="w-10 h-8 rounded cursor-pointer bg-transparent"
              data-testid="accent-picker"
            />
          </div>
        </div>
        {frames.length > 0 && (
          <div className="mt-4">
            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">Cadre de profil (cosmétique)</label>
            <select value={form.active_frame} onChange={(e) => set("active_frame", e.target.value)} className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm" data-testid="frame-select">
              <option value="">Aucun</option>
              {frames.map((f) => <option key={f.sku} value={f.sku}>{f.name}</option>)}
            </select>
          </div>
        )}
      </Section>

      <Section title="Récit" icon={BookOpen}>
        <Field label={t?.("settings.bio") || "Bio"} value={form.bio} onChange={(v) => set("bio", v)} testid="bio-input" textarea rows={3} placeholder="Quelques mots sur vous…" />
        <Field label={t?.("settings.quote") || "Citation"} value={form.quote} onChange={(v) => set("quote", v)} testid="quote-input" placeholder="« Ma devise… »" />
        <Field label={t?.("settings.story") || "Histoire"} value={form.story} onChange={(v) => set("story", v)} testid="story-input" textarea rows={5} placeholder="Votre légende personnelle…" />
      </Section>

      <Section title="Liens" icon={Link2}>
        <Field label="Site web" value={form.website_url} onChange={(v) => set("website_url", v)} testid="website-input" placeholder="https://..." />
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <Field label="Twitter / X" value={form.social_links.twitter} onChange={(v) => setSocial("twitter", v)} testid="twitter-input" placeholder="@pseudo" />
          <Field label="Twitch" value={form.social_links.twitch} onChange={(v) => setSocial("twitch", v)} testid="twitch-input" placeholder="pseudo" />
          <Field label="YouTube" value={form.social_links.youtube} onChange={(v) => setSocial("youtube", v)} testid="youtube-input" placeholder="chaîne ou URL" />
        </div>
      </Section>

      <Section title="Affichage & confidentialité" icon={Settings2}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Toggle label="Afficher les statistiques" checked={form.profile_show_stats} onChange={(v) => set("profile_show_stats", v)} testid="toggle-stats" />
          <Toggle label="Afficher l'ADN (radar)" checked={form.profile_show_dna} onChange={(v) => set("profile_show_dna", v)} testid="toggle-dna" />
          <Toggle label="Afficher la chronique" checked={form.profile_show_chronicle} onChange={(v) => set("profile_show_chronicle", v)} testid="toggle-chronicle" />
          <div>
            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">Visibilité</label>
            <select value={form.profile_visibility} onChange={(e) => set("profile_visibility", e.target.value)} className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm" data-testid="visibility-select">
              <option value="public">Public</option>
              <option value="friends">Amis uniquement</option>
              <option value="private">Privé</option>
            </select>
          </div>
          {form.profile_visibility !== "public" && (
            <Toggle
              label="Masquer aussi la carte héros"
              hint="La carte héros (Nexus, profil) suivra les mêmes règles de visibilité"
              checked={form.profile_hide_hero_card}
              onChange={(v) => set("profile_hide_hero_card", v)}
              testid="toggle-hide-hero-card"
            />
          )}
        </div>
      </Section>

      <PremiumButton type="submit" variant="cyan" disabled={saving} icon={Save} testid="save-profile-btn">
        {saving ? "Enregistrement…" : "Enregistrer le profil"}
      </PremiumButton>
    </form>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3 pt-2 border-t border-white/5">
      <h3 className="font-display font-semibold text-sm text-zinc-300 flex items-center gap-2">
        <Icon className="w-4 h-4 text-violet-400" /> {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, testid, placeholder, textarea, rows = 3, hint }) {
  const Cmp = textarea ? "textarea" : "input";
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">{label}</label>
      <Cmp
        value={value}
        placeholder={placeholder}
        rows={textarea ? rows : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
        data-testid={testid}
      />
      {hint && <p className="text-[10px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange, testid }) {
  return (
    <div data-testid={testid}>
      <label className="flex items-center justify-between gap-3 cursor-pointer py-1">
        <span>
          <span className="text-sm text-zinc-400 block">{label}</span>
          {hint && <span className="text-[10px] text-zinc-600 block mt-0.5">{hint}</span>}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${checked ? "bg-violet-600" : "bg-zinc-700"}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-5" : "left-0.5"}`} />
        </button>
      </label>
    </div>
  );
}
