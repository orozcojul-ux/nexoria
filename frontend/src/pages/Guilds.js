import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Castle, Users, Crown, ShieldCheck, Send, Coins, UserPlus, LogOut, X, Plus, Mail, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import StarField from "@/components/StarField";
import HeroName from "@/components/HeroName";
import { sfx } from "@/lib/sfx";
import {
  PageShell,
  PremiumSection,
  PremiumStat,
  PremiumCard,
  PremiumButton,
  PremiumModal,
} from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";

const ROLE_LABEL = { chef: "Chef", officier: "Officier", membre: "Membre" };
const ROLE_COLOR = { chef: "#FFD700", officier: "#F97316", membre: "#9CA3AF" };

export default function Guilds() {
  const banner = usePageBanner("guilds");
  const { user, refresh } = useAuth();
  const [mine, setMine] = useState({ guild: null, membership: null });
  const [guilds, setGuilds] = useState([]);
  const [invites, setInvites] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const [m, g, inv] = await Promise.all([
      api.get("/guilds/mine"),
      api.get("/guilds"),
      api.get("/guilds/invites/mine"),
    ]);
    setMine(m.data); setGuilds(g.data); setInvites(inv.data);
  };
  useEffect(() => { load(); }, []);

  const accept = async (inviteId) => {
    try {
      await api.post(`/guilds/invites/${inviteId}/accept`);
      toast.success("Vous avez rejoint l'ordre !");
      sfx.success();
      await load(); await refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };
  const decline = async (inviteId) => {
    await api.post(`/guilds/invites/${inviteId}/decline`);
    await load();
  };

  if (mine.guild) return <GuildDashboard data={mine} reload={async () => { await load(); await refresh(); }} />;

  const totalMembers = guilds.reduce((acc, g) => acc + (g.member_count || 0), 0);
  const topGuild = [...guilds].sort((a, b) => (b.level || 0) - (a.level || 0))[0];

  return (
    <PageShell
      testid="guilds-page"
      banner={banner}
    >
      <StarField density={50} />
      <div className="space-y-8">
        <div>
          <PremiumButton variant="violet" size="lg" icon={Plus} onClick={() => setShowCreate(true)} testid="open-create-guild">
            Fonder un Ordre
          </PremiumButton>
        </div>

        {/* STATS */}
        <PremiumSection title="Pulse des Ordres" subtitle="Vue globale" icon={Shield} tone="violet">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PremiumStat icon={Castle} label="Ordres fondés" value={guilds.length} sub="Bannières dressées" tone="violet" testid="guild-stat-count" />
            <PremiumStat icon={Users} label="Héros enrôlés" value={totalMembers} sub="Tous ordres confondus" tone="cyan" testid="guild-stat-members" />
            <PremiumStat icon={Crown} label="Ordre dominant" value={topGuild?.tag || "—"} sub={topGuild ? `Niveau ${topGuild.level}` : "Aucun"} tone="gold" testid="guild-stat-top" />
            <PremiumStat icon={Mail} label="Invitations" value={invites.length} sub="En attente" tone="emerald" testid="guild-stat-invites" />
          </div>
        </PremiumSection>

        {/* INVITES */}
        {invites.length > 0 && (
          <PremiumSection title="Invitations reçues" subtitle="Réponds avant qu'elles n'expirent" icon={Mail} tone="gold">
            <div className="space-y-2" data-testid="guild-invites">
              {invites.map((inv) => (
                <PremiumCard key={inv.invite_id} tone="gold" className="flex items-center justify-between gap-3 flex-wrap" testid={`invite-${inv.invite_id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-base text-yellow-100">
                      {inv.guild?.name} <span className="text-zinc-500 text-sm">[{inv.guild?.tag}]</span>
                    </div>
                    <div className="text-xs text-zinc-400 italic mt-1 truncate">{inv.guild?.description || "—"}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <PremiumButton variant="cyan" size="sm" onClick={() => accept(inv.invite_id)} testid={`invite-accept-${inv.invite_id}`}>
                      Accepter
                    </PremiumButton>
                    <PremiumButton variant="ghost" size="sm" onClick={() => decline(inv.invite_id)}>
                      Refuser
                    </PremiumButton>
                  </div>
                </PremiumCard>
              ))}
            </div>
          </PremiumSection>
        )}

        {/* GUILDS LIST */}
        <PremiumSection title="Ordres existants" subtitle={`${guilds.length} bannière(s)`} icon={Castle} tone="violet">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guilds.length === 0 && (
              <PremiumCard tone="violet" hover={false} className="col-span-full text-center py-10">
                <Castle className="w-12 h-12 text-purple-400/60 mx-auto mb-2" />
                <p className="text-zinc-400 italic">Aucun ordre n'a encore été fondé…</p>
                <p className="text-zinc-600 text-xs mt-1">Sois le premier à hisser ta bannière.</p>
              </PremiumCard>
            )}
            {guilds.map((g) => (
              <motion.div
                key={g.guild_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-2xl border-2 p-5 overflow-hidden bg-gradient-to-br from-[#0F0820]/90 via-[#0A0613]/90 to-[#1A0B3D]/70 backdrop-blur"
                style={{
                  borderColor: `${g.banner_color}66`,
                  boxShadow: `0 0 24px ${g.banner_color}33, inset 0 0 12px ${g.banner_color}11`,
                }}
                data-testid={`guild-card-${g.guild_id}`}
              >
                <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-30" style={{ background: g.banner_color }} />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-black text-xs shrink-0 text-white tracking-tight"
                      style={{
                        background: `radial-gradient(circle, white 0%, ${g.banner_color} 70%)`,
                        boxShadow: `0 0 18px ${g.banner_color}88`,
                      }}
                    >
                      {g.tag}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-black text-base text-white truncate">{g.name}</h3>
                      <div className="text-[10px] uppercase tracking-[0.3em] font-bold truncate" style={{ color: g.banner_color }}>
                        [{g.tag}] · Niv. {g.level}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 italic mb-3 line-clamp-2 min-h-[2.4em]">
                    {g.description || "—"}
                  </div>
                  <div className="flex justify-between font-mono-stat text-xs pt-2 border-t border-white/5">
                    <span className="text-cyan-300"><Users className="w-3 h-3 inline mr-1" /> {g.member_count}/{g.max_members}</span>
                    <span className="text-violet-300">{g.xp || 0} XP</span>
                    <span className="text-yellow-300">{g.vault_aether} ✦</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </PremiumSection>
      </div>

      <AnimatePresence>
        {showCreate && <CreateGuildDialog onClose={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await load(); await refresh(); }} userLevel={user?.level || 1} userAether={user?.aether || 0} />}
      </AnimatePresence>
    </PageShell>
  );
}

function CreateGuildDialog({ onClose, onCreated, userLevel, userAether }) {
  const [form, setForm] = useState({ name: "", tag: "", description: "", banner_color: "#7C3AED" });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/guilds", form);
      toast.success(`L'ordre « ${form.name} » est fondé !`);
      sfx.success();
      await onCreated();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setSaving(false); }
  };
  return (
    <PremiumModal open onClose={onClose} title="Fonder un Ordre" icon={Castle} maxWidth="max-w-md" testid="create-guild-dialog">
      <form onSubmit={submit} className="p-5 space-y-3">
        <div className="text-xs text-zinc-500 italic">Coût : 1000 Aether · Requiert le niveau 10 minimum.</div>
        <div className="text-[10px] font-mono-stat font-bold">
          Niveau actuel : <span className={userLevel >= 10 ? "text-green-400" : "text-red-400"}>{userLevel}</span> ·
          Aether : <span className={userAether >= 1000 ? "text-green-400" : "text-red-400"}>{userAether}</span>
        </div>
        <input value={form.name} required minLength={3} maxLength={30} placeholder="Nom de l'Ordre"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="guild-name" />
        <input value={form.tag} required minLength={2} maxLength={5} placeholder="Tag (2-5 lettres, ex: ZEN)"
          onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat uppercase" data-testid="guild-tag" />
        <textarea value={form.description} maxLength={500} placeholder="Devise de l'ordre..." rows={3}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="guild-desc" />
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Couleur :</label>
          <input type="color" value={form.banner_color} onChange={(e) => setForm({ ...form, banner_color: e.target.value })}
            className="w-10 h-8 rounded border border-white/10" data-testid="guild-color" />
        </div>
        <PremiumButton type="submit" variant="violet" size="sm" disabled={saving || userLevel < 10 || userAether < 1000} className="w-full" testid="guild-create-submit">
          Fonder l'Ordre (-1000 ✦)
        </PremiumButton>
      </form>
    </PremiumModal>
  );
}

function GuildDashboard({ data, reload }) {
  const { guild, membership } = data;
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("members"); // members | chat | vault
  const isLeader = membership.role === "chef";
  const isOfficer = ["chef", "officier"].includes(membership.role);
  const [showInvite, setShowInvite] = useState(false);

  const loadDetail = async () => {
    const { data } = await api.get(`/guilds/${guild.guild_id}`);
    setDetail(data);
  };
  useEffect(() => { loadDetail(); }, [guild.guild_id]);

  const leave = async () => {
    if (!window.confirm("Quitter cet ordre ?")) return;
    try {
      const { data } = await api.post(`/guilds/${guild.guild_id}/leave`);
      toast.success(data.disbanded ? "L'ordre a été dissous" : "Vous avez quitté l'ordre");
      await reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };

  return (
    <PageShell testid="guild-dashboard">
      <StarField density={40} />
      <PremiumCard tone="violet" className="p-6 mb-6 relative overflow-hidden" style={{ borderColor: `${guild.banner_color}40` }}>
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-30" style={{ background: guild.banner_color }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-black text-2xl shrink-0"
            style={{ background: `radial-gradient(circle, white 0%, ${guild.banner_color} 70%)`, boxShadow: `0 0 30px ${guild.banner_color}` }}>
            {guild.tag}
          </div>
          <div className="flex-1">
            <h1 className="font-display font-black text-3xl">{guild.name}</h1>
            <div className="text-zinc-400 text-sm italic">{guild.description}</div>
            <div className="flex gap-4 mt-2 font-mono-stat text-xs flex-wrap">
              <span><Users className="w-3 h-3 inline" /> {guild.member_count}/{guild.max_members}</span>
              <span className="text-cyan-300">Niveau {guild.level}</span>
              <span className="text-violet-300">{guild.xp} XP</span>
              <span className="text-yellow-400">Coffre : {guild.vault_aether} ✦</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isOfficer && (
              <button onClick={() => setShowInvite(true)} data-testid="open-invite"
                className="px-3 py-1.5 rounded border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> Inviter
              </button>
            )}
            <button onClick={leave} data-testid="leave-guild"
              className="px-3 py-1.5 rounded border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1">
              <LogOut className="w-3 h-3" /> {isLeader ? "Abandonner" : "Quitter"}
            </button>
          </div>
        </div>
      </PremiumCard>

      <div className="flex gap-2 mb-4 flex-wrap justify-center">
        {[{ id: "members", l: "Membres", i: Users }, { id: "chat", l: "Chat", i: Send }, { id: "vault", l: "Coffre", i: Coins }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}
            className={`px-4 py-2 rounded text-sm font-bold font-display border ${tab === t.id ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10" : "border-white/10 text-zinc-400"}`}>
            <t.i className="w-3 h-3 inline mr-1" /> {t.l}
          </button>
        ))}
      </div>

      {tab === "members" && detail && (
        <PremiumCard tone="cyan" className="p-4 space-y-2" testid="members-list">
          {detail.members.sort((a, b) => (a.role === "chef" ? -1 : 1)).map((m) => (
            <div key={m.user_id} className="flex items-center justify-between p-2 rounded hover:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                {m.role === "chef" && <Crown className="w-4 h-4 text-yellow-400" />}
                {m.role === "officier" && <ShieldCheck className="w-4 h-4 text-orange-400" />}
                <HeroName user={m.user} size="sm" />
                <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: ROLE_COLOR[m.role] }}>{ROLE_LABEL[m.role]}</span>
              </div>
              <div className="flex gap-1">
                {isOfficer && m.user_id !== membership.user_id && m.role !== "chef" && (
                  <button onClick={async () => { await api.post(`/guilds/${guild.guild_id}/kick/${m.user_id}`); toast.success("Membre exclu"); loadDetail(); reload(); }}
                    className="text-red-400 hover:text-red-300 p-1" title="Exclure"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
                {isLeader && m.role !== "chef" && (
                  <button onClick={async () => {
                    const newRole = m.role === "officier" ? "membre" : "officier";
                    await api.put(`/guilds/${guild.guild_id}/members/${m.user_id}/role`, { role: newRole });
                    toast.success(`Promu ${newRole}`); loadDetail();
                  }} className="text-cyan-400 p-1" title="Changer rôle">
                    <Crown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </PremiumCard>
      )}
      {tab === "chat" && <GuildChat guildId={guild.guild_id} />}
      {tab === "vault" && <GuildVault guild={guild} members={detail?.members || []} isOfficer={isOfficer} reload={async () => { await loadDetail(); await reload(); }} />}

      <AnimatePresence>
        {showInvite && <InviteDialog guildId={guild.guild_id} onClose={() => setShowInvite(false)} />}
      </AnimatePresence>
    </PageShell>
  );
}

function GuildChat({ guildId }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const load = async () => {
    const { data } = await api.get(`/guilds/${guildId}/chat`);
    setMsgs(data);
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [guildId]);
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api.post(`/guilds/${guildId}/chat`, { content: text.trim() });
    setText(""); load();
  };
  return (
    <PremiumCard tone="cyan" className="p-4 flex flex-col h-[500px]" testid="guild-chat">
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-2">
        {msgs.length === 0 && <div className="text-zinc-500 italic text-center py-8">Aucun message — entamez la conversation</div>}
        {msgs.map((m) => (
          <div key={m.message_id} className="text-sm" data-testid={`gmsg-${m.message_id}`}>
            <HeroName user={m.author} size="sm" />
            <span className="text-zinc-300 ml-2">{m.content}</span>
            <span className="text-[10px] text-zinc-600 ml-2">{new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Parler à l'ordre..."
          className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="guild-chat-input" />
        <button type="submit" className="px-3 py-2 rounded border border-cyan-500/40 text-cyan-300 text-sm" data-testid="guild-chat-send">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </PremiumCard>
  );
}

function GuildVault({ guild, members, isOfficer, reload }) {
  const [amount, setAmount] = useState(100);
  const [targetId, setTargetId] = useState("");
  const deposit = async () => {
    try { await api.post(`/guilds/${guild.guild_id}/deposit`, { amount: parseInt(amount) }); toast.success("Dépôt effectué"); await reload(); }
    catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };
  const reward = async () => {
    if (!targetId) return toast.error("Choisir un membre");
    try { await api.post(`/guilds/${guild.guild_id}/withdraw/${targetId}`, { amount: parseInt(amount) }); toast.success("Récompense versée"); await reload(); }
    catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };
  return (
    <PremiumCard tone="gold" className="p-5 space-y-4" testid="guild-vault">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Coffre commun</div>
        <div className="font-mono-stat text-4xl font-bold text-yellow-400">{guild.vault_aether} ✦</div>
      </div>
      <div className="border-t border-white/10 my-2" />
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2">Déposer (gagne de l'XP pour l'ordre)</div>
        <div className="flex gap-2">
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat" data-testid="vault-amount" />
          <button onClick={deposit} className="px-4 py-2 rounded border border-yellow-500/50 text-yellow-300 text-sm font-bold" data-testid="vault-deposit">Déposer</button>
        </div>
      </div>
      {isOfficer && (
        <div className="pt-3 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-bold mb-2">Récompenser un membre</div>
          <div className="flex gap-2">
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="vault-target">
              <option value="">Choisir un membre...</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user?.username}</option>)}
            </select>
            <button onClick={reward} className="px-4 py-2 rounded border border-cyan-500/40 text-cyan-300 text-sm font-bold" data-testid="vault-reward">Récompenser</button>
          </div>
        </div>
      )}
    </PremiumCard>
  );
}

function InviteDialog({ guildId, onClose }) {
  const [username, setUsername] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/guilds/${guildId}/invite`, { target_username: username.trim() });
      toast.success(`Invitation envoyée à ${username}`);
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };
  return (
    <PremiumModal open onClose={onClose} title="Inviter un héros" icon={UserPlus} maxWidth="max-w-sm" testid="invite-dialog">
      <form onSubmit={submit} className="p-5 space-y-3">
        <input value={username} onChange={(e) => setUsername(e.target.value)} required
          placeholder="Pseudo exact" className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="invite-username" />
        <div className="flex gap-2 justify-end">
          <PremiumButton variant="ghost" size="sm" onClick={onClose}>Annuler</PremiumButton>
          <PremiumButton type="submit" variant="cyan" size="sm" testid="invite-submit">Envoyer</PremiumButton>
        </div>
      </form>
    </PremiumModal>
  );
}
