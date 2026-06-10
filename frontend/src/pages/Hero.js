import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { Sparkles, Crown, Share2, ChevronRight, Coins } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { toast } from "sonner";

export default function Hero() {
  const { user, refresh } = useAuth();
  const [badges, setBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [chronicle, setChronicle] = useState([]);
  const [titles, setTitles] = useState([]);
  const [rift, setRift] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get("/badges/mine"),
      api.get("/game/badges"),
      api.get("/chronicle"),
      api.get("/game/titles"),
      api.get("/rifts/check"),
      api.post("/quests/daily-login").catch(() => {}),
    ]).then(([b, ab, c, t, r]) => {
      setBadges(b.data); setAllBadges(ab.data); setChronicle(c.data); setTitles(t.data);
      if (r.data?.rift) { setRift(r.data.rift); sfx.rift(); }
    });
  }, [user]);

  if (!user) return null;

  const xpForLevel = (l) => Math.floor(100 * Math.pow(l, 1.5));
  const xpNext = user.level < 999 ? xpForLevel(user.level + 1) : user.xp;
  const xpPct = user.level < 999 ? Math.min(100, (user.xp / xpNext) * 100) : 100;

  const dna = user.dna || {};
  const radarData = [
    { stat: "Créativité", value: dna.creativity || 0, fullMark: 100 },
    { stat: "Ambition", value: dna.ambition || 0, fullMark: 100 },
    { stat: "Sociabilité", value: dna.sociability || 0, fullMark: 100 },
    { stat: "Curiosité", value: dna.curiosity || 0, fullMark: 100 },
    { stat: "Persévérance", value: dna.persistence || 0, fullMark: 100 },
    { stat: "Influence", value: dna.influence || 0, fullMark: 100 },
  ];

  const badgeMap = Object.fromEntries(allBadges.map((b) => [b.id, b]));
  const ownedBadges = badges.map((b) => badgeMap[b.badge_id]).filter(Boolean);
  const activeTitle = titles.find((t) => t.id === user.active_title);

  const claimRift = async () => {
    try {
      const { data } = await api.post(`/rifts/${rift.rift_id}/claim`);
      sfx.chest();
      toast.success(`Récompenses : ${data.rewards.join(", ")}`);
      setRift(null);
      await refresh();
    } catch (e) { toast.error("Erreur"); }
  };

  const setTitle = async (titleId) => {
    try {
      await api.put("/profile/title", { title_id: titleId });
      sfx.success();
      toast.success("Titre activé");
      await refresh();
    } catch { toast.error("Erreur"); }
  };

  const shareCard = () => {
    const url = `${window.location.origin}/profile/${user.username}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Lien de carte copié!"));
    sfx.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6" data-testid="hero-page">
      {rift && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass glass-violet rounded-xl p-4 flex items-center gap-4 animate-glow" data-testid="rift-notification">
          <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold">Faille Dimensionnelle</div>
            <div className="font-display font-bold text-lg">{rift.name}</div>
            <div className="text-sm text-zinc-400">{rift.description}</div>
          </div>
          <button onClick={claimRift} data-testid="claim-rift-btn"
            className="px-4 py-2 rounded-md border border-violet-500/50 text-violet-300 hover:shadow-[0_0_20px_rgba(157,76,221,0.4)] transition-all font-bold text-sm">
            Réclamer
          </button>
        </motion.div>
      )}

      {/* Hero Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass glass-cyan rounded-2xl p-6 relative overflow-hidden" data-testid="hero-card">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Carte de Héros</div>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-3xl font-display font-black border border-white/20 shadow-[0_0_24px_rgba(0,229,255,0.3)]" data-testid="hero-avatar">
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" /> : user.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-black text-2xl truncate" data-testid="hero-username">{user.username}</div>
                <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold" data-testid="hero-title">
                  {activeTitle?.name || "Novice"}
                </div>
                <div className="text-sm text-cyan-400 mt-1" data-testid="hero-class">{user.class_name}</div>
              </div>
            </div>

            <div className="space-y-3 font-mono-stat text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-400">Niveau <span className="text-cyan-300 text-lg" data-testid="hero-level">{user.level}</span>/999</span>
                  <span className="text-zinc-500 text-xs" data-testid="hero-xp">{user.xp.toLocaleString()} / {xpNext.toLocaleString()} XP</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.6)] shimmer" style={{ width: `${xpPct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Rang</div>
                  <div className="text-cyan-300 font-bold" data-testid="hero-rank">{user.rank}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Réputation</div>
                  <div className="text-violet-300 font-bold" data-testid="hero-reputation">{user.reputation}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Aether</div>
                  <div className="text-yellow-400 font-bold flex items-center justify-center gap-1" data-testid="hero-aether"><Coins className="w-3 h-3" />{user.aether}</div>
                </div>
              </div>
            </div>

            <button onClick={shareCard} data-testid="share-card-btn"
              className="mt-6 w-full py-2 rounded-md border border-white/10 hover:border-cyan-500/40 text-sm text-zinc-300 flex items-center justify-center gap-2 transition-all">
              <Share2 className="w-3 h-3" /> Partager ma carte
            </button>
          </div>
        </motion.div>

        {/* DNA Radar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6" data-testid="dna-radar">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">ADN du Joueur</div>
          <div className="font-display font-bold text-lg mb-2">Profil unique</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: "#71717A", fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: "#71717A", fontSize: 8 }} angle={90} domain={[0, 100]} />
                <Radar name="DNA" dataKey="value" stroke="#00E5FF" strokeWidth={2} fill="#00E5FF" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stats Quick */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 space-y-3" data-testid="stats-card">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Statistiques</div>
          {[
            { label: "Badges obtenus", value: `${badges.length}/${allBadges.length}`, link: null },
            { label: "Points de compétence", value: user.skill_points || 0, link: "/skills" },
            { label: "Abonnés", value: user.followers || 0, link: null },
            { label: "Suivis", value: user.following || 0, link: null },
          ].map((s) => (
            <div key={s.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-zinc-400">{s.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono-stat text-cyan-300 font-bold">{s.value}</span>
                {s.link && <Link to={s.link} className="text-cyan-500 hover:text-cyan-300"><ChevronRight className="w-4 h-4" /></Link>}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Badges grid */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold">Badges</div>
            <div className="font-display font-bold text-xl">Vos exploits ({badges.length}/{allBadges.length})</div>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3" data-testid="badges-grid">
          {allBadges.map((b) => {
            const owned = ownedBadges.find((o) => o?.id === b.id);
            const I = Lucide[b.icon] || Lucide.Award;
            return (
              <div key={b.id} title={`${b.name} — ${b.description}`}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-2 transition-all ${owned ? `rarity-${b.rarity}` : "border-white/5 grayscale opacity-30"}`}
                data-testid={`badge-${b.id}`}>
                <I className="w-5 h-5" />
                <div className="text-[8px] uppercase tracking-wider mt-1 text-center font-bold leading-tight">{b.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Titles */}
      <div className="glass rounded-2xl p-6" data-testid="titles-section">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Titres</div>
        <div className="font-display font-bold text-xl mb-4">Vos rangs honorifiques</div>
        <div className="flex flex-wrap gap-2">
          {titles.map((t) => {
            const unlocked = user.level >= t.unlock_level;
            const active = user.active_title === t.id;
            return (
              <button
                key={t.id}
                disabled={!unlocked}
                onClick={() => unlocked && setTitle(t.id)}
                data-testid={`title-${t.id}`}
                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${active ? "bg-cyan-500/15 border-cyan-500/60 text-cyan-300 glow-cyan" : unlocked ? "border-white/10 text-zinc-200 hover:border-cyan-500/30" : "border-white/5 text-zinc-600 cursor-not-allowed"}`}
              >
                <Crown className="w-3 h-3 inline mr-1" />
                {t.name}
                {!unlocked && <span className="ml-1 text-[10px] opacity-60">Niv. {t.unlock_level}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chronicle */}
      <div className="glass rounded-2xl p-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Chronique Vivante</div>
        <div className="font-display font-bold text-xl mb-4">Votre histoire dans NEXORIA</div>
        <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="chronicle-list">
          {chronicle.length === 0 && <div className="text-sm text-zinc-500 italic">Votre histoire commence à peine...</div>}
          {chronicle.map((c, i) => (
            <div key={i} className="flex gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="w-1 bg-gradient-to-b from-violet-500 to-cyan-400 rounded-full" />
              <div className="flex-1">
                <div className="text-sm text-zinc-200">{c.text}</div>
                <div className="text-[10px] font-mono-stat text-zinc-500 mt-0.5">{new Date(c.created_at).toLocaleString("fr-FR")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
