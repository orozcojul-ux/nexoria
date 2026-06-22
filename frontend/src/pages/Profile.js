import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { resolveMediaUrl } from "@/lib/user-avatar";
import { IMAGE_UPLOAD_ACCEPT, isAllowedImageFile, imageUploadErrorMessage, uploadProfileAvatar } from "@/lib/image-upload";
import HeroCard from "@/components/HeroCard";
import { getTitleLabel } from "@/lib/title-labels";
import { ReportButton } from "@/components/ReportContentModal";
import ProfileHiddenView from "@/components/profile/ProfileHiddenView";
import { PremiumButton, PremiumModal } from "@/components/ui-premium";
import { BannerPreview } from "@/lib/banner-styles";
import { getDiscordDisplayName } from "@/lib/discord-display";
import ProfilePage from "@/pages/ProfilePage";

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [hiddenInfo, setHiddenInfo] = useState(null);
  const [badges, setBadges] = useState([]);
  const [chronicle, setChronicle] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [following, setFollowing] = useState(false);
  const [editAvatar, setEditAvatar] = useState(false);
  const [editBanner, setEditBanner] = useState(false);
  const [heroCardOpen, setHeroCardOpen] = useState(false);
  const [heroCardAvailable, setHeroCardAvailable] = useState(true);

  const load = useCallback(async () => {
    try {
      const p = await api.get(`/profile/${username}`);
      if (p.data?.hidden) {
        setHiddenInfo(p.data);
        setProfile(null);
        setBadges([]);
        setChronicle([]);
        return;
      }
      setHiddenInfo(null);
      const [c, ab] = await Promise.all([
        api.get(`/chronicle/${username}`),
        api.get("/game/badges"),
      ]);
      setProfile(p.data.profile);
      setHeroCardAvailable(p.data.hero_card_available !== false);
      setBadges(p.data.badges);
      setChronicle(c.data);
      setAllBadges(ab.data);
    } catch (err) {
      console.error("Profile load failed", err);
      setHiddenInfo(null);
      setProfile(null);
      toast.error("Héros introuvable");
    }
  }, [username]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const refreshSelfProfile = () => {
      if (user?.username === username) load();
    };
    window.addEventListener("nexoria:auth-login", refreshSelfProfile);
    return () => {
      window.removeEventListener("nexoria:auth-login", refreshSelfProfile);
    };
  }, [user?.username, username, load]);

  const toggleFollow = async () => {
    try {
      const { data } = await api.post(`/follow/${username}`);
      setFollowing(data.following);
      sfx.click();
      toast.success(data.following ? "Abonné!" : "Désabonné");
    } catch { toast.error("Erreur"); }
  };

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Lien copié");
  };

  if (hiddenInfo) {
    return (
      <ProfileHiddenView
        username={hiddenInfo.username}
        displayName={hiddenInfo.display_name}
        reason={hiddenInfo.reason}
      />
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-500" data-testid="profile-page">
        Chargement...
      </div>
    );
  }

  const isSelf = user?.username === username;
  const reloadAll = async () => { await load(); await refresh(); };
  const badgeMap = Object.fromEntries(allBadges.map((b) => [b.id, b]));

  const resolvedBadges = badges
    .map((b) => {
      const def = badgeMap[b.badge_id];
      return def ? { ...def, badge_id: b.badge_id } : null;
    })
    .filter(Boolean);

  const heroData = {
    ...profile,
    active_title_name: getTitleLabel(profile),
    discord_username: getDiscordDisplayName(profile) || profile.username,
  };

  const reportSlot =
    !isSelf && user && profile.user_id ? (
      <ReportButton
        targetType="user"
        targetId={profile.user_id}
        reportedUserId={profile.user_id}
        contextLabel={`Joueur ${profile.username}`}
      />
    ) : null;

  return (
    <>
      <ProfilePage
        hero={heroData}
        badges={resolvedBadges}
        chronique={profile.profile_show_chronicle !== false ? chronicle : []}
        isSelf={isSelf}
        following={following}
        showHeroCard={isSelf || heroCardAvailable}
        onEditProfile={() => navigate("/settings")}
        onEditBanner={() => setEditBanner(true)}
        onEditAvatar={() => setEditAvatar(true)}
        onShare={share}
        onToggleFollow={toggleFollow}
        onOpenHeroCard={() => setHeroCardOpen(true)}
        reportSlot={reportSlot}
      />

      <PremiumModal open={editAvatar} onClose={() => setEditAvatar(false)} title="Changer d'avatar" testid="avatar-dialog">
        <AvatarForm current={profile.avatar_url} onClose={() => setEditAvatar(false)} onSave={reloadAll} />
      </PremiumModal>
      <PremiumModal open={editBanner} onClose={() => setEditBanner(false)} title="Équiper une bannière" testid="banner-dialog">
        <BannerForm current={profile.active_banner} onClose={() => setEditBanner(false)} onSave={reloadAll} />
      </PremiumModal>

      <HeroCard userId={profile.user_id} open={heroCardOpen} onClose={() => setHeroCardOpen(false)} />
    </>
  );
}

function AvatarForm({ current, onClose, onSave }) {
  const [url, setUrl] = useState(current || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef(null);

  const uploadFile = async (file) => {
    if (!isAllowedImageFile(file)) {
      toast.error("Fichier image uniquement (JPG, PNG, GIF, WebP)");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image max 15 Mo");
      return;
    }
    setUploading(true);
    try {
      const avatarUrl = await uploadProfileAvatar(file);
      setUrl(avatarUrl);
      sfx.success();
      toast.success("Photo de profil importée");
      await onSave();
      onClose();
    } catch (err) {
      toast.error(imageUploadErrorMessage(err, "Échec upload"));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/profile", { avatar_url: url.trim() });
      toast.success("Avatar mis à jour");
      sfx.success();
      await onSave();
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="p-5 space-y-4">
      <div className="text-xs text-zinc-500">URL ou upload depuis votre PC (256×256 conseillé).</div>
      {url && (
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border border-cyan-500/30 bg-zinc-900">
            <img src={resolveMediaUrl(url)} alt="preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
        </div>
      )}
      <input type="file" ref={fileRef} accept={IMAGE_UPLOAD_ACCEPT} className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full py-2 rounded-lg border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-widest hover:bg-cyan-500/10 disabled:opacity-50"
        data-testid="avatar-upload-btn"
      >
        {uploading ? "Upload…" : "Choisir une image sur mon PC"}
      </button>
      <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="avatar-url-input" />
      <div className="flex gap-2 justify-end">
        <PremiumButton variant="ghost" size="sm" onClick={() => setUrl("")}>Effacer</PremiumButton>
        <PremiumButton type="submit" variant="cyan" size="sm" disabled={saving} testid="avatar-save">Enregistrer</PremiumButton>
      </div>
    </form>
  );
}

function BannerForm({ current, onClose, onSave }) {
  const [owned, setOwned] = useState([]);
  const [selected, setSelected] = useState(current || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/shop/inventory"), api.get("/shop/items")]).then(([inv, sh]) => {
      const ownedSkus = inv.data.cosmetics.map((c) => c.sku);
      const banners = sh.data.filter((i) => i.sku?.includes("banner"));
      setOwned(banners.filter((b) => ownedSkus.includes(b.sku)));
    });
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      await api.put("/profile", { active_banner: selected || "" });
      toast.success(selected ? "Bannière équipée" : "Bannière retirée");
      sfx.success();
      await onSave();
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-5 space-y-4">
      {owned.length === 0 ? (
        <div className="text-sm text-zinc-400 text-center py-6">
          Aucune bannière — visitez la <a href="/shop" className="text-yellow-400 underline">Boutique</a>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setSelected("")} data-testid="banner-option-none"
            className={`p-3 rounded-lg border text-left ${!selected ? "border-cyan-500/60 bg-cyan-500/10" : "border-white/10"}`}>
            <div className="font-display font-bold text-sm">Aucune</div>
          </button>
          {owned.map((b) => (
            <button key={b.sku} onClick={() => setSelected(b.sku)} data-testid={`banner-option-${b.sku}`}
              className={`p-3 rounded-lg border text-left relative overflow-hidden ${selected === b.sku ? "border-cyan-500/60 bg-cyan-500/10" : "border-white/10"}`}>
              <BannerPreview sku={b.sku} className="h-14 rounded-md mb-2" />
              <div className="relative">
                <div className="font-display font-bold text-sm">{b.name}</div>
                {selected === b.sku && <Check className="absolute top-0 right-0 w-3 h-3 text-cyan-300" />}
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <PremiumButton variant="ghost" size="sm" onClick={onClose}>Fermer</PremiumButton>
        <PremiumButton variant="violet" size="sm" onClick={submit} disabled={saving} testid="banner-save">Équiper</PremiumButton>
      </div>
    </div>
  );
}
