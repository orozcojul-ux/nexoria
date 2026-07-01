import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Crown, Shield, Package, Award, History, Users,
  MessageCircle, UserPlus, Sword, Trophy, Compass, Flame, Star, Frame, Flag,
  Settings2, Pencil, Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import api, { getToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RARITY } from "@/lib/design-tokens";
import { PremiumBadge } from "@/components/ui-premium";
import HeroName from "@/components/HeroName";
import { useInventorySync } from "@/hooks/useInventorySync";
import { getHeroAvatarDataURL } from "@/lib/NexusPixelArt";
import { getTitleLabel } from "@/lib/title-labels";
import { useI18n } from "@/contexts/I18nContext";
import { getUserAvatarUrl } from "@/lib/user-avatar";
import ClassImage from "@/components/ClassImage";
import ClassChangeModal from "@/components/ClassChangeModal";
import HeroCardCustomizeTab from "@/components/HeroCardCustomizeTab";
import LastConnection from "@/components/LastConnection";
import VipPassStatus from "@/components/VipPassStatus";
import { formatStaffMembership, getStaffVisuals } from "@/lib/staff-roles";
import { translateDnaStat, translateRarity, translateItem, translateTitle, translateShopItem } from "@/lib/translate-game";
import { translateClassName } from "@/lib/translate-class";
import { translateChronicle } from "@/lib/translate-chronicle";
import { translateApiError } from "@/lib/i18n-api";
import HeroCountryBadge from "@/components/HeroCountryBadge";
import UserCountryFlag from "@/components/UserCountryFlag";
import styles from "./HeroCard.module.css";

/** @deprecated Use PremiumBadge — kept for backward compatibility */
export function BadgeCard({ badge, size = "md" }) {
  return <PremiumBadge badge={badge} size={size} />;
}

const TAB_KEYS = [
  { id: "overview", key: "heroCard.tab.overview", icon: Crown },
  { id: "inventory", key: "heroCard.tab.inventory", icon: Package },
  { id: "badges", key: "heroCard.tab.badges", icon: Award },
  { id: "history", key: "heroCard.tab.history", icon: History },
  { id: "relations", key: "heroCard.tab.relations", icon: Users },
  { id: "customize", key: "heroCard.tab.customize", icon: Settings2 },
];

const CLASS_HEX = {
  mage: "#9D4CDD", warrior: "#EF4444", assassin: "#71717A", paladin: "#f5a623",
  alchemist: "#10B981", explorer: "#00BFFF", necromancer: "#7928CA",
  architect: "#A855F7", chronomancer: "#00E5FF", inventor: "#FFD700",
};

const TITLE_AURA = {
  elu_cosmique: { icon: "✨", color: "#00d4ff" },
  legende_vivante: { icon: "👑", color: "#f5a623" },
  roi_createurs: { icon: "🔥", color: "#f5a623" },
  seigneur_temps: { icon: "❄", color: "#00E5FF" },
  maitre_ombres: { icon: "🌑", color: "#9D4CDD" },
  veteran: { icon: "⚔", color: "#A855F7" },
  voyageur: { icon: "🧭", color: "#3B82F6" },
  novice: { icon: "🌱", color: "#8892a0" },
};

const DNA_AXIS_KEYS = ["creativity", "ambition", "sociability", "curiosity", "persistence", "influence"];

function FrameCorner({ className }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M2 2h8v2H4v6H2V2z" stroke="currentColor" strokeWidth="1.2" fill="rgba(245,166,35,0.15)" />
      <path d="M14 2l4 4-2 2-4-4 2-2z" fill="currentColor" />
      <path d="M2 14l4-4 2 2-4 4-2-2z" fill="#c0c8d4" opacity="0.85" />
    </svg>
  );
}

function HeroDnaRadar({ dna, t }) {
  const cx = 180;
  const cy = 150;
  const maxR = 72;
  const levels = [0.33, 0.66, 1];

  const points = DNA_AXIS_KEYS.map((axisKey, i) => {
    const angle = (Math.PI * 2 * i) / DNA_AXIS_KEYS.length - Math.PI / 2;
    const raw = dna?.[axisKey] ?? 0;
    const norm = Math.min(1, Math.max(0, raw / 100));
    const r = maxR * norm;
    const label = translateDnaStat(t, axisKey);
    return {
      label,
      axisKey,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      lx: cx + (maxR + 28) * Math.cos(angle),
      ly: cy + (maxR + 28) * Math.sin(angle),
    };
  });

  const poly = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={styles.radarWrap}>
      <svg viewBox="0 0 360 300" width="100%" height="auto" role="img" aria-label={t("profile.dna.aria")}>
        {levels.map((lv) => (
          <polygon
            key={lv}
            points={DNA_AXIS_KEYS.map((_, i) => {
              const angle = (Math.PI * 2 * i) / DNA_AXIS_KEYS.length - Math.PI / 2;
              const r = maxR * lv;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        {DNA_AXIS_KEYS.map((_, i) => {
          const angle = (Math.PI * 2 * i) / DNA_AXIS_KEYS.length - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + maxR * Math.cos(angle)}
              y2={cy + maxR * Math.sin(angle)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={poly}
          fill="rgba(0,229,204,0.15)"
          stroke="#00e5cc"
          strokeWidth="2"
        />
        {points.map((p) => (
          <text
            key={p.axisKey}
            x={p.lx}
            y={p.ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#8892a0"
            fontSize="11"
            fontFamily="Rajdhani, sans-serif"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function badgeGlowClass(rarity) {
  if (["cosmic", "divine", "mythic"].includes(rarity)) return styles.badgeGlowPurple;
  if (["legendary", "epic"].includes(rarity)) return styles.badgeGlowGold;
  if (rarity === "rare") return styles.badgeGlowCyan;
  return styles.badgeGlowDefault;
}

function ClosedProfilePanel({ user, t }) {
  const visuals = getStaffVisuals(user);
  const accent = visuals?.color || "#F97316";
  const avatarUrl = getUserAvatarUrl(user);

  return (
    <div className={styles.hiddenPanel}>
      <div className={styles.closedIdentity}>
        <div
          className={styles.closedAvatarWrap}
          style={{ borderColor: `${accent}66`, boxShadow: `0 0 20px ${accent}22` }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={styles.closedAvatarImg} />
          ) : (
            <Shield className="w-10 h-10" style={{ color: accent, opacity: 0.85 }} />
          )}
        </div>
        <HeroName user={user} size="lg" className={styles.closedHeroName} />
        {user.rank && <p className={styles.closedRankLine}>{user.rank}</p>}
      </div>
      <Shield className="w-12 h-12 mx-auto opacity-60" style={{ color: accent }} />
      <h3 className={styles.hiddenTitle}>{t("heroCard.profileClosedTitle")}</h3>
      <p className={styles.empty}>{t("heroCard.profileClosedBody")}</p>
    </div>
  );
}

export default function HeroCard({ userId, open, onClose }) {
  const { t, fmtDate } = useI18n();
  const { user: me, refresh: refreshAuth, loading: authLoading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [classModalOpen, setClassModalOpen] = useState(false);
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (!open) setClassModalOpen(false);
  }, [open]);

  const isStaff = me?.role === "admin" || me?.role === "moderator";
  const canEditProfile = Boolean(data?.can_edit_profile);
  const tabs = (canEditProfile ? TAB_KEYS : TAB_KEYS.filter((tab) => tab.id !== "customize"))
    .map((tab) => ({ ...tab, label: t(tab.key) }));

  const loadCard = useCallback(async (retry = false) => {
    if (!userId) return;
    if (!getToken()) {
      toast.error(t("heroCard.sessionExpired"));
      onClose?.();
      return;
    }
    setLoading(true);
    try {
      const { data: card } = await api.get(`/users/${userId}/card`);
      setData(card);
    } catch (err) {
      if (err?.response?.status === 401 && !retry) {
        try {
          await checkAuth();
          if (getToken()) {
            await loadCard(true);
            return;
          }
        } catch { /* fall through */ }
        toast.error(t("heroCard.sessionExpired"));
        onClose?.();
        return;
      }
      toast.error(t("heroCard.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [userId, onClose, checkAuth, t]);

  useEffect(() => {
    if (!open || !userId || authLoading) return;
    if (!me?.user_id) return;
    openedAtRef.current = Date.now();
    setTab("overview");
    loadCard();
  }, [open, userId, authLoading, me?.user_id, loadCard]);

  useInventorySync(useCallback(() => {
    if (open && data?.is_self) loadCard();
  }, [open, data?.is_self, loadCard]));

  const isClosedSentinel = Boolean(data?.closed && data?.reason === "official_sentinel");
  const u = data?.hidden ? null : data?.user;
  const classColor = u?.class_id ? CLASS_HEX[u.class_id] || "#f5a623" : "#f5a623";

  const spritePreview = useMemo(() => {
    if (!u) return null;
    return getHeroAvatarDataURL(u.class_id || "explorer", u.role || "user");
  }, [u]);

  const avatarUrl = u ? getUserAvatarUrl(u) : null;

  const xpPct = u ? Math.min(100, Math.round(((u.xp || 0) / Math.max(1, u.xp_next || 1)) * 100)) : 0;

  const sendFriendRequest = async () => {
    if (!u?.username) return;
    try {
      await api.post("/friends/request", { target_username: u.username });
      toast.success(t("friends.requestSent"));
      loadCard();
    } catch (e) {
      toast.error(translateApiError(t, e, "heroCard.friendRequestFailed"));
    }
  };

  const acceptIncomingRequest = async () => {
    const rid = data?.incoming_friend_request?.request_id;
    if (!rid) return;
    try {
      await api.post(`/friends/requests/${rid}/accept`);
      toast.success(t("friends.pactForged"));
      window.dispatchEvent(new CustomEvent("nexoria:friends-updated"));
      loadCard();
    } catch (e) {
      toast.error(translateApiError(t, e, "friends.acceptFailed"));
    }
  };

  const declineIncomingRequest = async () => {
    const rid = data?.incoming_friend_request?.request_id;
    if (!rid) return;
    try {
      await api.post(`/friends/requests/${rid}/decline`);
      toast.info(t("friends.requestDeclined"));
      window.dispatchEvent(new CustomEvent("nexoria:friends-updated"));
      loadCard();
    } catch (e) {
      toast.error(translateApiError(t, e));
    }
  };

  const sendMessage = () => {
    if (data?.is_friend && u) {
      navigate(`/friends?chat=${u.user_id}`);
      onClose?.();
      return;
    }
    toast.info(t("heroCard.messageNeedFriend"));
  };

  const frameCosmetic = data?.equipped_cosmetics?.frame;
  const frameBorder = frameCosmetic ? (RARITY[frameCosmetic.rarity]?.color || "#3a4a5a") : undefined;

  const handleProfileSaved = useCallback(async () => {
    loadCard();
    if (data?.is_self) {
      try { await refreshAuth(); } catch { /* silent */ }
    }
  }, [loadCard, data?.is_self, refreshAuth]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/88 backdrop-blur-md"
          onClick={() => {
            if (Date.now() - openedAtRef.current < 250) return;
            onClose();
          }}
          data-testid="hero-card-modal"
        >
          <motion.div
            initial={{ scale: 0.94, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className={styles.card}
          >
            <div className={styles.header}>
              <div className={styles.headerTitle}>
                <Crown className="w-5 h-5" style={{ color: "#f5a623" }} />
                {t("profile.heroCard")}
              </div>
              <button
                type="button"
                onClick={onClose}
                data-testid="hero-card-close"
                className={styles.closeBtn}
                aria-label={t("common.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>{t("heroCard.loading")}</div>
            ) : isClosedSentinel && u ? (
              <ClosedProfilePanel user={u} t={t} />
            ) : data?.hidden ? (
              <div className={styles.hiddenPanel}>
                <Shield className="w-12 h-12 mx-auto opacity-60" style={{ color: "#00e5cc" }} />
                <h3 className={styles.hiddenTitle}>{t("heroCard.hiddenTitle")}</h3>
                <p className={styles.empty}>
                  {data.reason === "friends_only"
                    ? t("heroCard.hiddenFriendsOnly")
                    : t("heroCard.hiddenPrivate")}
                </p>
                <p style={{ fontSize: 12, color: "#8892a0" }}>{data.username}</p>
              </div>
            ) : !u ? (
              <div className={styles.empty}>{t("heroCard.notFound")}</div>
            ) : (
              <div className={styles.body}>
                <aside className={styles.leftCol}>
                  <div className={styles.portraitWrap}>
                    <div
                      className={styles.portraitFrame}
                      style={frameBorder ? { borderColor: frameBorder, boxShadow: `inset 0 0 24px rgba(0,229,204,0.12), 0 0 16px ${RARITY[frameCosmetic.rarity]?.glow || "transparent"}` } : undefined}
                    >
                      <FrameCorner className={`${styles.corner} ${styles.cornerTl}`} />
                      <FrameCorner className={`${styles.corner} ${styles.cornerTr}`} />
                      <FrameCorner className={`${styles.corner} ${styles.cornerBl}`} />
                      <FrameCorner className={`${styles.corner} ${styles.cornerBr}`} />
                      <div className={styles.portraitInner}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className={styles.portraitImg} />
                        ) : spritePreview ? (
                          <img src={spritePreview} alt="" className={styles.portraitPixel} />
                        ) : (
                          <span style={{ fontSize: 64, opacity: 0.35 }}>⚔</span>
                        )}
                      </div>
                      <HeroCountryBadge user={u} />
                      {canEditProfile && (
                        <button
                          type="button"
                          className={styles.portraitEditBtn}
                          onClick={() => setTab("customize")}
                          title={t("profile.editProfile")}
                          data-testid="hero-card-edit-portrait"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={styles.heroNameRow}>
                    <h2
                      className={styles.heroName}
                      style={u.is_vip ? {
                        background: "linear-gradient(92deg,#fde68a,#fbbf24 40%,#a855f7)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                        textShadow: "0 0 18px rgba(251,191,36,0.35)",
                      } : undefined}
                    >
                      {u.username}
                    </h2>
                    <UserCountryFlag user={u} size="base" />
                  </div>
                  <p className={styles.heroSubtitle}>{getTitleLabel(u, null, t)}</p>
                  {(u.class_id || u.class_name) && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        margin: "10px 0 4px",
                        flexWrap: "wrap",
                      }}
                    >
                      <ClassImage
                        classId={u.class_id || u.class_name}
                        color={classColor}
                        size={44}
                        alt={u.class_name || ""}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          color: classColor,
                          textShadow: `0 0 12px ${classColor}66`,
                        }}
                      >
                        {translateClassName(t, u.class_id) || u.class_name}
                      </span>
                      {data?.is_self && (
                        <button
                          type="button"
                          onClick={() => setClassModalOpen(true)}
                          data-testid="hero-card-change-class-btn"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(167,139,250,0.45)",
                            background: "rgba(124,58,237,0.12)",
                            color: "#c4b5fd",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          <Repeat className="w-3 h-3" /> {t("page.hero.changeClassShort")}
                        </button>
                      )}
                    </div>
                  )}
                  <p className={styles.levelLine}>
                    <span className={styles.levelLabel}>{t("profile.level")} </span>
                    <span className={styles.levelNum}>{u.level || 1}</span>
                    <span className={styles.levelLabel}> – </span>
                    <span className={styles.levelRank}>{u.rank || t("page.hero.rank")}</span>
                  </p>

                  <div className={styles.xpBlock}>
                    <div className={styles.xpTrack}>
                      <div className={styles.xpFill} style={{ width: `${xpPct}%` }} />
                    </div>
                    <div className={styles.xpText}>
                      {t("heroCard.xpLabel", {
                        current: u.xp || 0,
                        max: u.xp_next ? ` / ${u.xp_next}` : "",
                      })}
                    </div>
                  </div>

                  <div className={styles.sidebarInfo}>
                    <SidebarRow label={t("heroCard.field.username")} value={u.username} />
                    <SidebarRow label={t("heroCard.field.class")} value={translateClassName(t, u.class_id) || u.class_name} color={classColor} />
                    <SidebarRow
                      label={t("heroCard.field.staff")}
                      value={formatStaffMembership(u)}
                      color={getStaffVisuals(u)?.color || "#8892a0"}
                    />
                    <SidebarRow
                      label={t("heroCard.field.guild")}
                      value={data.guild?.name ? `${data.guild.name}${data.guild.rank ? ` · ${data.guild.rank}` : ""}` : "—"}
                      color={data.guild?.color || undefined}
                    />
                    {data.active_aura && (
                      <SidebarRow label={t("heroCard.field.aura")} value={data.active_aura.title_name} color="#00d4ff" />
                    )}
                    <SidebarRow
                      label={t("heroCard.field.joined")}
                      value={u.created_at ? fmtDate(u.created_at, { hour: undefined, minute: undefined }) : "—"}
                    />
                    <SidebarRow label={t("heroCard.field.lastConnection")} stacked>
                      <LastConnection
                        user={u}
                        includePrefix={false}
                        dateTimeClassName={styles.sidebarLastSeenDate}
                        onlineClassName={styles.sidebarLastSeenOnline}
                        offlineClassName={styles.sidebarLastSeenOffline}
                        nexusOnlineClassName={styles.sidebarNexusOnline}
                        nexusOfflineClassName={styles.sidebarNexusOffline}
                      />
                    </SidebarRow>
                    <SidebarRow label={t("heroCard.field.vipPass")} stacked>
                      <VipPassStatus
                        user={u}
                        valueOnly
                        yesClassName={styles.vipPassYes}
                        noClassName={styles.vipPassNo}
                      />
                    </SidebarRow>
                    <SidebarRow
                      label={t("heroCard.field.location")}
                      value={data.location ? prettyRoom(t, data.location.room) : "—"}
                      color={data.location ? "#00d4ff" : undefined}
                    />
                  </div>

                  {!data.is_self && (
                    <div className={styles.actions}>
                      {data.incoming_friend_request && !data.is_friend && (
                        <>
                          <button
                            type="button"
                            onClick={acceptIncomingRequest}
                            data-testid="hero-card-accept-friend"
                            className={`${styles.actionBtn} ${styles.actionBtnAccent}`}
                          >
                            <UserPlus className="w-3 h-3 inline mr-1" />
                            {t("friends.accept")}
                          </button>
                          <button
                            type="button"
                            onClick={declineIncomingRequest}
                            data-testid="hero-card-decline-friend"
                            className={styles.actionBtn}
                          >
                            {t("friends.decline")}
                          </button>
                        </>
                      )}
                      {!data.is_friend && !data.friend_request_pending && !data.incoming_friend_request && (
                        <button
                          type="button"
                          onClick={sendFriendRequest}
                          data-testid="hero-card-add-friend"
                          className={styles.actionBtn}
                        >
                          <UserPlus className="w-3 h-3 inline mr-1" />
                          {t("heroCard.action.addFriend")}
                        </button>
                      )}
                      {data.friend_request_pending && (
                        <span className={`${styles.actionBtn} ${styles.actionBtnMuted}`}>{t("friends.requestSent")}</span>
                      )}
                      {data.is_friend && (
                        <span className={`${styles.actionBtn} ${styles.actionBtnAccent}`}>
                          <Users className="w-3 h-3 inline mr-1" />
                          {t("heroCard.action.friend")}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={sendMessage}
                        data-testid="hero-card-message"
                        className={styles.actionBtn}
                      >
                        <MessageCircle className="w-3 h-3 inline mr-1" />
                        {t("heroCard.action.message")}
                      </button>
                    </div>
                  )}
                </aside>

                <main className={styles.rightCol}>
                  <div className={styles.tabs}>
                    {tabs.map((tabDef) => {
                      const Ico = tabDef.icon;
                      const active = tab === tabDef.id;
                      return (
                        <button
                          key={tabDef.id}
                          type="button"
                          onClick={() => setTab(tabDef.id)}
                          data-testid={`hero-tab-${tabDef.id}`}
                          className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                        >
                          <Ico className="w-3.5 h-3.5" />
                          {tabDef.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className={styles.tabContent}>
                    {tab === "overview" && (
                      <OverviewTab data={data} u={u} classColor={classColor} onViewBadges={() => setTab("badges")} />
                    )}
                    {tab === "inventory" && <InventoryTab inv={data.inventory} />}
                    {tab === "badges" && <BadgesTab badges={data.badges} />}
                    {tab === "history" && <HistoryTab chronicles={data.chronicles} />}
                    {tab === "relations" && <RelationsTab data={data} />}
                    {tab === "customize" && canEditProfile && (
                      <HeroCardCustomizeTab
                        user={u}
                        targetUserId={userId}
                        isSelf={data.is_self}
                        isStaffEdit={!data.is_self && isStaff}
                        onSaved={handleProfileSaved}
                      />
                    )}
                  </div>
                </main>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      <ClassChangeModal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        user={u || me}
        onChanged={async (profile) => {
          await loadCard();
          if (data?.is_self) {
            try { await refreshAuth(); } catch { /* silent */ }
            if (profile?.class_id) {
              window.dispatchEvent(new CustomEvent("nexoria:nexus-class-changed", {
                detail: {
                  user_id: profile.user_id,
                  class_id: profile.class_id,
                  class_name: profile.class_name,
                  avatar_url: profile.avatar_url,
                },
              }));
            }
          }
        }}
      />
    </AnimatePresence>
  );
}

function SidebarRow({ label, value, color, children, stacked }) {
  return (
    <div className={`${styles.sidebarRow}${stacked ? ` ${styles.sidebarRowStacked}` : ""}`}>
      <span className={styles.sidebarLabel}>{label}</span>
      {children ? (
        <div className={styles.sidebarValueStack}>{children}</div>
      ) : (
        <span className={styles.sidebarValue} style={color ? { color } : undefined}>{value}</span>
      )}
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function OverviewTab({ data, u, classColor, onViewBadges }) {
  const { t, fmtDate } = useI18n();
  const badges = data.badges || [];
  const titles = (data.titles_progress || []).slice(-4);
  const dna = data.dna || {};
  const cosmetics = Object.values(data.equipped_cosmetics || {});

  return (
    <>
      <Section title={t("heroCard.section.titlesProgress")}>
        <div className={styles.titlesGrid}>
          {titles.map((titleRow) => {
            const aura = TITLE_AURA[titleRow.id] || TITLE_AURA.novice;
            const locked = !titleRow.unlocked;
            const localizedName = translateTitle(t, titleRow);
            return (
              <div key={titleRow.id} className={`${styles.titleCell} ${titleRow.active ? styles.titleActive : ""}`}>
                <span
                  className={`${styles.titleIcon} ${locked ? styles.titleIconLocked : ""}`}
                  style={{ color: locked ? "#8892a0" : aura.color, filter: locked ? undefined : `drop-shadow(0 0 8px ${aura.color})` }}
                >
                  {aura.icon}
                </span>
                <div className={locked ? styles.titleNameLocked : styles.titleName} style={locked ? undefined : { color: aura.color }}>
                  {localizedName}
                </div>
                <div className={styles.titleLevel}>
                  {t("heroCard.titleLevel", { level: titleRow.unlock_level })}
                  {titleRow.active ? ` · ${t("heroCard.titleActive")}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {cosmetics.length > 0 && (
        <Section title={t("heroCard.section.cosmeticsEquipped")}>
          <div className={styles.titlesGrid}>
            {cosmetics.map((c) => {
              const localized = translateShopItem(t, c);
              const r = RARITY[c.rarity] || RARITY.common;
              const SlotIcon = c.slot === "banner" ? Flag : Frame;
              return (
                <div key={c.sku} className={styles.titleCell} style={{ border: `1px solid ${r.color}44`, borderRadius: 8, padding: 8 }}>
                  <SlotIcon className="w-6 h-6 mx-auto mb-1" style={{ color: r.color }} />
                  <div className={styles.titleName} style={{ color: r.color }}>{localized.name}</div>
                  <div className={styles.titleLevel}>{translateRarity(t, c.rarity)}</div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title={t("page.hero.dnaTitle")}>
        <HeroDnaRadar dna={dna} t={t} />
      </Section>

      <Section
        title={t("heroCard.badgesCount", { count: badges.length })}
        action={
          badges.length > 6 ? (
            <button type="button" className={styles.sectionLink} onClick={onViewBadges}>
              {t("heroCard.viewAll")}
            </button>
          ) : null
        }
      >
        {badges.length === 0 ? (
          <div className={styles.empty}>{t("heroCard.badgesEmpty")}</div>
        ) : (
          <div className={styles.badgesRow}>
            {badges.slice(0, 6).map((b, i) => (
              <div key={b.badge_id || b.id || i} className={`${styles.badgeSlot} ${badgeGlowClass(b.rarity)}`}>
                <PremiumBadge badge={b} size="sm" />
              </div>
            ))}
            {badges.length > 6 && (
              <span className={styles.badgeMore}>{t("heroCard.badgesMore", { count: badges.length - 6 })}</span>
            )}
          </div>
        )}
      </Section>

      <Section title={t("heroCard.section.detailedInfo")}>
        <div className={styles.infoGrid}>
          <div className={styles.infoCol}>
            <InfoEntry label={t("heroCard.field.username")} value={u.username} />
            <InfoEntry label={t("heroCard.field.class")} value={translateClassName(t, u.class_id) || u.class_name} color={classColor} />
            <InfoEntry
              label={t("heroCard.field.staff")}
              value={formatStaffMembership(u)}
              color={getStaffVisuals(u)?.color || "#8892a0"}
            />
            <InfoEntry label={t("heroCard.field.guild")} value={data.guild?.name || "—"} muted={!data.guild?.name} />
          </div>
          <div className={styles.infoDivider} aria-hidden>
            <span className={styles.infoDividerDiamond} />
          </div>
          <div className={styles.infoCol}>
            <InfoEntry label={t("heroCard.field.rank")} value={getTitleLabel(u, null, t)} color="#00d4ff" />
            <InfoEntry
              label={t("heroCard.field.joined")}
              value={u.created_at ? fmtDate(u.created_at, { hour: undefined, minute: undefined }) : "—"}
            />
            <InfoEntry label={t("heroCard.field.lastConnection")}>
              <LastConnection user={u} includePrefix={false} />
            </InfoEntry>
            <InfoEntry
              label={t("heroCard.field.location")}
              value={data.location ? prettyRoom(t, data.location.room) : "—"}
              muted={!data.location}
            />
          </div>
        </div>
      </Section>

      <Section title={t("heroCard.section.stats")}>
        <div className={styles.statsGrid}>
          <StatCell icon={Sword} label={t("heroCard.stat.combat")} value={u.combat_wins || u.pvp_wins || 0} sub={t("heroCard.stat.combatSub")} color="#EF4444" />
          <StatCell icon={Flame} label={t("heroCard.stat.boss")} value={u.boss_kills || 0} sub={t("heroCard.stat.bossSub")} color="#7c3aed" />
          <StatCell icon={Trophy} label={t("heroCard.stat.quests")} value={u.quests_completed || 0} sub={t("heroCard.stat.questsSub")} color="#f5a623" />
          <StatCell icon={Compass} label={t("heroCard.stat.exploration")} value={`${u.exploration || 0}%`} sub={t("heroCard.stat.explorationSub")} color="#00d4ff" />
          <StatCell icon={Package} label={t("heroCard.stat.collections")} value={(data.inventory || []).length} sub={t("heroCard.stat.collectionsSub")} color="#10B981" />
        </div>
      </Section>
    </>
  );
}

function InfoEntry({ label, value, color, bold, muted, children }) {
  return (
    <div className={styles.infoEntry}>
      <label>{label}</label>
      {children ? (
        <span style={{ color: color || "#e8eaf0", fontWeight: bold ? 800 : 600 }}>{children}</span>
      ) : (
        <span style={{ color: muted ? "#8892a0" : color || "#e8eaf0", fontWeight: bold ? 800 : 600 }}>
          {value}
        </span>
      )}
    </div>
  );
}

function InventoryTab({ inv }) {
  const { t } = useI18n();
  if (!inv?.length) return <div className={styles.empty}>{t("heroCard.inventoryEmpty")}</div>;
  return (
    <Section title={t("heroCard.inventoryTitle")}>
      <div className={styles.gridInv}>
        {inv.map((it, i) => {
          const localized = translateItem(t, it);
          const r = RARITY[it.rarity] || RARITY.common;
          return (
            <div key={i} className={styles.itemCard} style={{ borderColor: `${r.color}55`, boxShadow: `0 0 10px ${r.glow}` }}>
              <div className={styles.itemIcon}>{it.icon || "✨"}</div>
              <div className={styles.itemName} style={{ color: r.color }}>{localized.name}</div>
              <div className={styles.itemRarity}>{translateRarity(t, it.rarity)}</div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function BadgesTab({ badges }) {
  const { t } = useI18n();
  if (!badges?.length) return <div className={styles.empty}>{t("heroCard.badgesNone")}</div>;
  const groups = {};
  badges.forEach((b) => { (groups[b.rarity || "common"] = groups[b.rarity || "common"] || []).push(b); });
  const order = ["cosmic", "divine", "mythic", "legendary", "epic", "rare", "common"];
  return (
    <>
      {order.filter((r) => groups[r]).map((r) => (
          <Section key={r} title={t("heroCard.rarityCount", { rarity: translateRarity(t, r), count: groups[r].length })}>
            <div className={styles.badgesRow}>
              {groups[r].map((b, i) => (
                <div key={b.badge_id || b.id || i} className={`${styles.badgeSlot} ${badgeGlowClass(r)}`}>
                  <PremiumBadge badge={b} size="sm" />
                </div>
              ))}
            </div>
          </Section>
        ))}
    </>
  );
}

function HistoryTab({ chronicles }) {
  const { t, fmtDate } = useI18n();
  if (!chronicles?.length) return <div className={styles.empty}>{t("heroCard.historyEmpty")}</div>;
  return (
    <Section title={t("profile.chronicle.title")}>
      {chronicles.map((c, i) => (
        <div key={c.chronicle_id || i} className={styles.chronicleItem}>
          <div className={styles.chronicleText}>{translateChronicle(t, c)}</div>
          <div className={styles.chronicleDate}>
            {c.created_at ? fmtDate(c.created_at) : ""}
          </div>
        </div>
      ))}
    </Section>
  );
}

function RelationsTab({ data }) {
  const { t } = useI18n();
  const friends = data.friends || [];
  return (
    <>
      <Section title={t("heroCard.socialOverview")}>
        <div className={styles.statsGrid}>
          <StatCell icon={Users} label={t("heroCard.friendsLabel")} value={data.friends_count || 0} sub={t("heroCard.friendsLinksForged")} color="#10B981" />
          <StatCell icon={Shield} label={t("heroCard.field.guild")} value={data.guild?.name || "—"} sub={data.guild?.rank || data.guild_tag || ""} color="#7c3aed" />
          <StatCell icon={Star} label={t("profile.stats.followers")} value={data.user?.followers || 0} sub={t("dna.influence")} color="#f5a623" />
        </div>
      </Section>
      <Section title={t("heroCard.friendsCount", { count: friends.length })}>
        {friends.length === 0 ? (
          <div className={styles.empty}>{t("heroCard.noFriends")}</div>
        ) : (
          <div className={styles.grid2}>
            {friends.map((f) => {
              const friendAvatar = getUserAvatarUrl(f);
              return (
                <div key={f.user_id} className={styles.friendRow}>
                  <div className={styles.friendAvatar}>
                    {friendAvatar ? (
                      <img src={friendAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      f.username?.[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <HeroName user={f} className="text-sm truncate" />
                    <div style={{ fontSize: 10, color: "#8892a0" }}>
                      {t("heroCard.friendMeta", {
                        className: translateClassName(t, f.class_id) || f.class_name || "",
                        level: f.level,
                        rank: f.rank ? ` · ${f.rank}` : "",
                      })}
                    </div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                      <LastConnection user={f} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}

function StatCell({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={styles.statCell}>
      <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
      <div className={styles.statValue} style={{ color }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

function prettyRoom(t, r) {
  const key = `heroCard.room.${r}`;
  const label = t(key);
  return label && label !== key ? label : r;
}
