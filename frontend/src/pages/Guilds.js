import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Castle, Users, Crown, ShieldCheck, Send, Coins, UserPlus, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import StarField from "@/components/StarField";
import HeroName from "@/components/HeroName";
import { sfx } from "@/lib/sfx";
import {
  PageShell,
  PremiumCard,
  PremiumButton,
  PremiumModal,
} from "@/components/ui-premium";
import GuildesPage from "@/pages/GuildesPage";
import FonderOrdreModal from "@/components/FonderOrdreModal";

const ROLE_COLOR = { chef: "#FFD700", officier: "#F97316", membre: "#9CA3AF" };

export default function Guilds() {
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const [mine, setMine] = useState({ guild: null, membership: null });
  const [guilds, setGuilds] = useState([]);
  const [invites, setInvites] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [browseList, setBrowseList] = useState(false);

  const load = async () => {
    const [m, g, inv] = await Promise.all([
      api.get("/guilds/mine"),
      api.get("/guilds"),
      api.get("/guilds/invites/mine"),
    ]);
    setMine(m.data); setGuilds(g.data); setInvites(inv.data);
  };
  useEffect(() => { load(); }, []);

  if (mine.guild && !browseList) {
    return <GuildDashboard data={mine} reload={async () => { await load(); await refresh(); }} onBrowse={() => setBrowseList(true)} />;
  }

  const totalMembers = guilds.reduce((acc, g) => acc + (g.member_count || 0), 0);
  const topGuild = [...guilds].sort((a, b) => (b.level || 0) - (a.level || 0))[0];

  const myGuildId = mine.guild?.guild_id;
  const guildes = guilds.map((g, i) => {
    const isMine = !!myGuildId && g.guild_id === myGuildId;
    return {
      id: g.guild_id,
      name: g.name,
      emblem_url: g.emblem_url,
      banner_color: g.banner_color,
      tag: g.tag,
      level: g.level,
      member_count: g.member_count,
      rank: i + 1,
      isMine,
      onClick: isMine ? () => setBrowseList(false) : undefined,
    };
  });

  const stats = {
    ordres_fondes: guilds.length,
    heros_enroles: totalMembers,
    ordre_dominant: topGuild?.tag || "–",
    invitations: invites.length,
  };

  return (
    <>
      <GuildesPage
        guildes={guildes}
        stats={stats}
        onFonder={() => setShowCreate(true)}
      />

      <FonderOrdreModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        hero={{ level: user?.level || 1, aether: user?.aether || 0 }}
        onFonder={async ({ nom, tag, devise, couleur }) => {
          await api.post("/guilds", { name: nom, tag, description: devise, banner_color: couleur });
          toast.success(t("guilds.founded", { name: nom }));
          sfx.success();
          setShowCreate(false);
          await load();
          await refresh();
        }}
      />
    </>
  );
}

function GuildDashboard({ data, reload, onBrowse }) {
  const { t } = useI18n();
  const { guild, membership } = data;
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("members");
  const isLeader = membership.role === "chef";
  const isOfficer = ["chef", "officier"].includes(membership.role);
  const [showInvite, setShowInvite] = useState(false);

  const ROLE_LABEL = {
    chef: t("guilds.role.chef"),
    officier: t("guilds.role.officer"),
    membre: t("guilds.role.member"),
  };

  const loadDetail = async () => {
    const { data } = await api.get(`/guilds/${guild.guild_id}`);
    setDetail(data);
  };
  useEffect(() => { loadDetail(); }, [guild.guild_id]);

  const leave = async () => {
    if (!window.confirm(t("guilds.leave_confirm"))) return;
    try {
      const { data } = await api.post(`/guilds/${guild.guild_id}/leave`);
      toast.success(data.disbanded ? t("guilds.disbanded_msg") : t("guilds.left_msg"));
      await reload();
    } catch (e) { toast.error(e.response?.data?.detail || t("common.error")); }
  };

  const tabs = [
    { id: "members", l: t("guilds.members"), i: Users },
    { id: "chat", l: t("guilds.chat"), i: Send },
    { id: "vault", l: t("guilds.vault_tab"), i: Coins },
  ];

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
              <span className="text-cyan-300">{t("guilds.level", { level: guild.level })}</span>
              <span className="text-violet-300">{guild.xp} XP</span>
              <span className="text-yellow-400">{t("guilds.vault_amount", { amount: guild.vault_aether })}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => onBrowse?.()} data-testid="browse-guilds"
              className="px-3 py-1.5 rounded border border-violet-500/40 text-violet-300 text-xs font-bold flex items-center gap-1">
              <Castle className="w-3 h-3" /> {t("guilds.all_orders")}
            </button>
            {isOfficer && (
              <button onClick={() => setShowInvite(true)} data-testid="open-invite"
                className="px-3 py-1.5 rounded border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> {t("guilds.invite")}
              </button>
            )}
            <button onClick={leave} data-testid="leave-guild"
              className="px-3 py-1.5 rounded border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1">
              <LogOut className="w-3 h-3" /> {isLeader ? t("guilds.abandon") : t("guilds.leave")}
            </button>
          </div>
        </div>
      </PremiumCard>

      <div className="flex gap-2 mb-4 flex-wrap justify-center">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} data-testid={`tab-${tb.id}`}
            className={`px-4 py-2 rounded text-sm font-bold font-display border ${tab === tb.id ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10" : "border-white/10 text-zinc-400"}`}>
            <tb.i className="w-3 h-3 inline mr-1" /> {tb.l}
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
                  <button onClick={async () => { await api.post(`/guilds/${guild.guild_id}/kick/${m.user_id}`); toast.success(t("guilds.member_kicked")); loadDetail(); reload(); }}
                    className="text-red-400 hover:text-red-300 p-1" title={t("guilds.kick_title")}><Trash2 className="w-3.5 h-3.5" /></button>
                )}
                {isLeader && m.role !== "chef" && (
                  <button onClick={async () => {
                    const newRole = m.role === "officier" ? "membre" : "officier";
                    await api.put(`/guilds/${guild.guild_id}/members/${m.user_id}/role`, { role: newRole });
                    toast.success(t("guilds.promoted", { role: newRole })); loadDetail();
                  }} className="text-cyan-400 p-1" title={t("guilds.change_role")}>
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
  const { t, locale } = useI18n();
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
        {msgs.length === 0 && <div className="text-zinc-500 italic text-center py-8">{t("guilds.no_messages")}</div>}
        {msgs.map((m) => (
          <div key={m.message_id} className="text-sm" data-testid={`gmsg-${m.message_id}`}>
            <HeroName user={m.author} size="sm" />
            <span className="text-zinc-300 ml-2">{m.content}</span>
            <span className="text-[10px] text-zinc-600 ml-2">{new Date(m.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("guilds.chat_placeholder")}
          className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="guild-chat-input" />
        <button type="submit" className="px-3 py-2 rounded border border-cyan-500/40 text-cyan-300 text-sm" data-testid="guild-chat-send">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </PremiumCard>
  );
}

function GuildVault({ guild, members, isOfficer, reload }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(100);
  const [targetId, setTargetId] = useState("");
  const deposit = async () => {
    try { await api.post(`/guilds/${guild.guild_id}/deposit`, { amount: parseInt(amount) }); toast.success(t("guilds.deposit_ok")); await reload(); }
    catch (e) { toast.error(e.response?.data?.detail || t("common.error")); }
  };
  const reward = async () => {
    if (!targetId) return toast.error(t("guilds.choose_member_error"));
    try { await api.post(`/guilds/${guild.guild_id}/withdraw/${targetId}`, { amount: parseInt(amount) }); toast.success(t("guilds.reward_sent")); await reload(); }
    catch (e) { toast.error(e.response?.data?.detail || t("common.error")); }
  };
  return (
    <PremiumCard tone="gold" className="p-5 space-y-4" testid="guild-vault">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">{t("guilds.common_vault")}</div>
        <div className="font-mono-stat text-4xl font-bold text-yellow-400">{guild.vault_aether} ✦</div>
      </div>
      <div className="border-t border-white/10 my-2" />
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2">{t("guilds.deposit_xp")}</div>
        <div className="flex gap-2">
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat" data-testid="vault-amount" />
          <button onClick={deposit} className="px-4 py-2 rounded border border-yellow-500/50 text-yellow-300 text-sm font-bold" data-testid="vault-deposit">{t("guilds.deposit_btn")}</button>
        </div>
      </div>
      {isOfficer && (
        <div className="pt-3 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-bold mb-2">{t("guilds.reward_member")}</div>
          <div className="flex gap-2">
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="vault-target">
              <option value="">{t("guilds.choose_member")}</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user?.username}</option>)}
            </select>
            <button onClick={reward} className="px-4 py-2 rounded border border-cyan-500/40 text-cyan-300 text-sm font-bold" data-testid="vault-reward">{t("guilds.reward_btn")}</button>
          </div>
        </div>
      )}
    </PremiumCard>
  );
}

function InviteDialog({ guildId, onClose }) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/guilds/${guildId}/invite`, { target_username: username.trim() });
      toast.success(t("guilds.invite_to", { username }));
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || t("common.error")); }
  };
  return (
    <PremiumModal open onClose={onClose} title={t("guilds.invite_title")} icon={UserPlus} maxWidth="max-w-sm" testid="invite-dialog">
      <form onSubmit={submit} className="p-5 space-y-3">
        <input value={username} onChange={(e) => setUsername(e.target.value)} required
          placeholder={t("guilds.exact_username")} className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="invite-username" />
        <div className="flex gap-2 justify-end">
          <PremiumButton variant="ghost" size="sm" onClick={onClose}>{t("common.cancel")}</PremiumButton>
          <PremiumButton type="submit" variant="cyan" size="sm" testid="invite-submit">{t("guilds.send")}</PremiumButton>
        </div>
      </form>
    </PremiumModal>
  );
}
