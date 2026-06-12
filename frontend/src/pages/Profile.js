import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import { Crown, UserPlus, UserCheck, Share2, Camera, Flag, Check, X } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import HeroName from "@/components/HeroName";

export default function Profile() {
  const { username } = useParams();
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [chronicle, setChronicle] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [following, setFollowing] = useState(false);
  const [editAvatar, setEditAvatar] = useState(false);
  const [editBanner, setEditBanner] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c, ab] = await Promise.all([
        api.get(`/profile/${username}`),
        api.get(`/chronicle/${username}`),
        api.get("/game/badges"),
      ]);
      setProfile(p.data.profile);
      setBadges(p.data.badges);
      setChronicle(c.data);
      setAllBadges(ab.data);
    } catch (err) {
      console.error("Profile load failed", err);
      toast.error("Héros introuvable");
    }
  }, [username]);
  useEffect(() => { load(); }, [load]);

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

  if (!profile) return <div className="p-12 text-center text-zinc-500">Chargement...</div>;

  const isSelf = user?.username === username;
  const reloadAll = async () => { await load(); await refresh(); };

  const dna = profile.dna || {};
  const radar = [
    { stat: "Créativité", value: dna.creativity || 0 },
    { stat: "Ambition", value: dna.ambition || 0 },
    { stat: "Sociabilité", value: dna.sociability || 0 },
    { stat: "Curiosité", value: dna.curiosity || 0 },
    { stat: "Persévérance", value: dna.persistence || 0 },
    { stat: "Influence", value: dna.influence || 0 },
  ];

  const xpNext = profile.xp_next ?? profile.xp;
  const xpPct = profile.xp_pct ?? 0;
  const badgeMap = Object.fromEntries(allBadges.map((b) => [b.id, b]));

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6" data-testid="profile-page">
      <div className="glass glass-cyan rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Active banner (if equipped) */}
        {profile.active_banner && <ActiveBannerOverlay sku={profile.active_banner} />}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row gap-6 items-start">
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-5xl font-display font-black shadow-[0_0_30px_rgba(0,229,255,0.3)] overflow-hidden" data-testid="profile-avatar">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile.username[0]?.toUpperCase()}
            </div>
            {isSelf && (
              <button onClick={() => setEditAvatar(true)} data-testid="edit-avatar-btn"
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-[#0A0A0E] border border-cyan-500/60 flex items-center justify-center hover:shadow-[0_0_15px_rgba(0,229,255,0.6)] transition-all">
                <Camera className="w-4 h-4 text-cyan-300" />
              </button>
            )}
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold flex items-center gap-1">
              <Crown className="w-3 h-3" /> {profile.active_title || "novice"}
            </div>
            <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight" data-testid="profile-username">
              <HeroName user={profile} size="lg" className="text-4xl sm:text-5xl" />
            </h1>
            <div className="text-cyan-400 font-bold mt-1">
              {profile.class_name} · Niveau <span data-testid="profile-level">{profile.level}</span> · <span data-testid="profile-rank">{profile.rank}</span>
              {profile.role === "admin" && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 text-yellow-300 text-[10px] uppercase tracking-[0.25em] font-bold align-middle" data-testid="role-badge-admin">
                  <Crown className="w-3 h-3" /> Archonte
                </span>
              )}
              {profile.role === "moderator" && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-orange-500/40 bg-orange-500/10 text-orange-300 text-[10px] uppercase tracking-[0.25em] font-bold align-middle" data-testid="role-badge-mod">
                  <Crown className="w-3 h-3" /> Sentinelle
                </span>
              )}
            </div>
            {profile.bio && <div className="text-zinc-400 mt-3 max-w-xl">{profile.bio}</div>}
            <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3 font-mono-stat text-sm max-w-2xl">
              <div><div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">XP</div><div className="text-cyan-300 font-bold">{profile.xp.toLocaleString()}</div></div>
              <div><div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Réputation</div><div className="text-violet-300 font-bold">{profile.reputation}</div></div>
              <div><div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Aether</div><div className="text-yellow-400 font-bold">{profile.aether}</div></div>
              <div><div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Abonnés</div><div className="text-white font-bold">{profile.followers || 0}</div></div>
              <div><div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Badges</div><div className="text-white font-bold">{badges.length}</div></div>
            </div>
            <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden max-w-md">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shimmer" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isSelf && (
              <button onClick={() => setEditBanner(true)} data-testid="edit-banner-btn"
                className="px-4 py-2 rounded-md border border-violet-500/40 text-violet-300 hover:shadow-[0_0_18px_rgba(157,76,221,0.4)] text-sm font-bold flex items-center gap-2">
                <Flag className="w-3 h-3" /> Bannière
              </button>
            )}
            {!isSelf && (
              <button onClick={toggleFollow} className="px-4 py-2 rounded-md border border-cyan-500/40 text-cyan-300 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] text-sm font-bold flex items-center gap-2" data-testid="follow-btn">
                {following ? <><UserCheck className="w-3 h-3" />Suivi</> : <><UserPlus className="w-3 h-3" />Suivre</>}
              </button>
            )}
            <button onClick={share} className="px-3 py-2 rounded-md border border-white/10 hover:border-white/30" data-testid="share-profile-btn">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-4">ADN</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: "#71717A", fontSize: 10 }} />
                <Radar dataKey="value" stroke="#00E5FF" strokeWidth={2} fill="#00E5FF" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-4">Badges ({badges.length})</div>
          <div className="grid grid-cols-6 gap-2">
            {badges.slice(0, 18).map((b) => {
              const def = badgeMap[b.badge_id];
              if (!def) return null;
              const I = Lucide[def.icon] || Lucide.Award;
              return (
                <div key={b.badge_id} title={def.name} className={`aspect-square rounded-lg border flex items-center justify-center rarity-${def.rarity}`}>
                  <I className="w-4 h-4" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-4">Chronique</div>
        <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="profile-chronicle">
          {chronicle.map((c) => (
            <div key={c.chronicle_id || c.created_at} className="flex gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="w-1 bg-gradient-to-b from-violet-500 to-cyan-400 rounded-full" />
              <div className="flex-1">
                <div className="text-sm text-zinc-200">{c.text}</div>
                <div className="text-[10px] font-mono-stat text-zinc-500">{new Date(c.created_at).toLocaleString("fr-FR")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {editAvatar && <AvatarDialog current={profile.avatar_url} onClose={() => setEditAvatar(false)} onSave={reloadAll} />}
        {editBanner && <BannerDialog current={profile.active_banner} onClose={() => setEditBanner(false)} onSave={reloadAll} />}
      </AnimatePresence>
    </div>
  );
}

function ActiveBannerOverlay({ sku }) {
  // Visual treatment per banner SKU
  const cfg = {
    banner_dragon: { from: "#7F1D1D", via: "#DC2626", to: "transparent" },
    banner_phoenix: { from: "#7C2D12", via: "#EA580C", to: "transparent" },
  }[sku] || { from: "#312E81", via: "#7C3AED", to: "transparent" };
  return (
    <div className="absolute inset-0 pointer-events-none opacity-30"
      style={{ background: `linear-gradient(135deg, ${cfg.from} 0%, ${cfg.via} 35%, ${cfg.to} 80%)` }}
      data-testid={`banner-overlay-${sku}`} />
  );
}

function AvatarDialog({ current, onClose, onSave }) {
  const [url, setUrl] = useState(current || "");
  const [saving, setSaving] = useState(false);
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="rune-border rounded-2xl p-6 max-w-md w-full space-y-4" data-testid="avatar-dialog">
        <div className="flex justify-between">
          <h3 className="font-display font-black text-xl ancient-text">Changer d'avatar</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-zinc-500 hover:text-white" /></button>
        </div>
        <div className="text-xs text-zinc-500 italic">Collez l'URL d'une image (avatar 256×256 conseillé) — JPG/PNG/WebP/GIF.</div>
        {url && (
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-cyan-500/30 bg-zinc-900">
              <img src={url} alt="preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div>
          </div>
        )}
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat" data-testid="avatar-url-input" />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setUrl("")} className="px-3 py-2 rounded border border-white/10 text-xs">Effacer</button>
          <button type="submit" disabled={saving} data-testid="avatar-save"
            className="px-4 py-2 rounded border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 font-bold text-sm">
            Enregistrer
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function BannerDialog({ current, onClose, onSave }) {
  const [owned, setOwned] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [selected, setSelected] = useState(current || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/shop/inventory"), api.get("/shop/items")]).then(([inv, sh]) => {
      const ownedSkus = inv.data.cosmetics.map((c) => c.sku);
      const banners = sh.data.filter((i) => i.category === "cosmetic" && i.icon?.toLowerCase().includes("flag") || (i.sku && i.sku.includes("banner")));
      setAllItems(banners);
      setOwned(banners.filter((b) => ownedSkus.includes(b.sku)));
    });
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      await api.put("/profile", { active_banner: selected || null });
      toast.success(selected ? "Bannière équipée" : "Bannière retirée");
      sfx.success();
      await onSave();
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="rune-border rounded-2xl p-6 max-w-lg w-full space-y-4" data-testid="banner-dialog">
        <div className="flex justify-between">
          <h3 className="font-display font-black text-xl ancient-text">Équiper une bannière</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-zinc-500 hover:text-white" /></button>
        </div>
        {owned.length === 0 ? (
          <div className="text-sm text-zinc-400 italic text-center py-6">
            Vous ne possédez aucune bannière. Visitez la <a href="/shop" className="text-yellow-400 underline">Boutique d'Aether</a> pour en acquérir.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setSelected("")} data-testid="banner-option-none"
              className={`p-3 rounded-md border text-left ${!selected ? "border-cyan-500/60 bg-cyan-500/10" : "border-white/10 hover:border-white/20"}`}>
              <div className="font-display font-bold text-sm">Aucune</div>
              <div className="text-[10px] text-zinc-500">Retirer la bannière</div>
            </button>
            {owned.map((b) => (
              <button key={b.sku} onClick={() => setSelected(b.sku)} data-testid={`banner-option-${b.sku}`}
                className={`p-3 rounded-md border text-left relative overflow-hidden ${selected === b.sku ? "border-cyan-500/60 bg-cyan-500/10" : "border-white/10 hover:border-white/20"}`}>
                <ActiveBannerOverlay sku={b.sku} />
                <div className="relative">
                  <div className="font-display font-bold text-sm">{b.name}</div>
                  <div className="text-[10px] text-zinc-400 italic">{b.description}</div>
                  {selected === b.sku && <Check className="absolute top-0 right-0 w-3 h-3 text-cyan-300" />}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded border border-white/10 text-xs">Fermer</button>
          <button onClick={submit} disabled={saving} data-testid="banner-save"
            className="px-4 py-2 rounded border border-violet-500/50 text-violet-300 hover:bg-violet-500/10 font-bold text-sm">
            Équiper
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Continued body (original)
function _OldProfileBody() { return null; }
