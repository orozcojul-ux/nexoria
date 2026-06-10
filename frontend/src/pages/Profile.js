import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { Crown, UserPlus, UserCheck, Share2 } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [chronicle, setChronicle] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [following, setFollowing] = useState(false);

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

  const dna = profile.dna || {};
  const radar = [
    { stat: "Créativité", value: dna.creativity || 0 },
    { stat: "Ambition", value: dna.ambition || 0 },
    { stat: "Sociabilité", value: dna.sociability || 0 },
    { stat: "Curiosité", value: dna.curiosity || 0 },
    { stat: "Persévérance", value: dna.persistence || 0 },
    { stat: "Influence", value: dna.influence || 0 },
  ];

  const xpForLevel = (l) => Math.floor(100 * Math.pow(l, 1.5));
  const xpNext = profile.level < 999 ? xpForLevel(profile.level + 1) : profile.xp;
  const xpPct = profile.level < 999 ? Math.min(100, (profile.xp / xpNext) * 100) : 100;
  const badgeMap = Object.fromEntries(allBadges.map((b) => [b.id, b]));
  const isSelf = user?.username === username;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6" data-testid="profile-page">
      <div className="glass glass-cyan rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row gap-6 items-start">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-5xl font-display font-black shrink-0 shadow-[0_0_30px_rgba(0,229,255,0.3)]" data-testid="profile-avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" /> : profile.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold flex items-center gap-1">
              <Crown className="w-3 h-3" /> {profile.active_title || "novice"}
            </div>
            <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight" data-testid="profile-username">{profile.username}</h1>
            <div className="text-cyan-400 font-bold mt-1">{profile.class_name} · Niveau <span data-testid="profile-level">{profile.level}</span> · {profile.rank}</div>
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
          <div className="flex gap-2">
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
    </div>
  );
}
