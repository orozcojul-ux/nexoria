import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Crown, Shield, Package, Award, History, Users, BarChart3,
  MessageCircle, UserPlus, Sword, Trophy, Compass, Flame, Star, Frame, Flag, Gem,
  Settings2, Pencil, Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api, { getToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RARITY } from "@/lib/design-tokens";
import { PremiumBadge } from "@/components/ui-premium";
import HeroName from "@/components/HeroName";
import { useInventorySync } from "@/hooks/useInventorySync";
import { getHeroAvatarDataURL } from "@/lib/NexusPixelArt";
import { getTitleLabel } from "@/lib/title-labels";
import { getUserAvatarUrl } from "@/lib/user-avatar";
import ClassImage from "@/components/ClassImage";
import ClassChangeModal from "@/components/ClassChangeModal";
import HeroCardCustomizeTab from "@/components/HeroCardCustomizeTab";
import styles from "./HeroCard.module.css";

/** @deprecated Use PremiumBadge — kept for backward compatibility */
export function BadgeCard({ badge, size = "md" }) {
  return <PremiumBadge badge={badge} size={size} />;
}

const BASE_TABS = [
  { id: "overview", label: "Aperçu", icon: Crown },
  { id: "info", label: "Infos", icon: BarChart3 },
  { id: "inventory", label: "Inventaire", icon: Package },
  { id: "badges", label: "Badges", icon: Award },
  { id: "history", label: "Historique", icon: History },
  { id: "relations", label: "Relations", icon: Users },
  { id: "customize", label: "Personnaliser", icon: Settings2 },
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

const DNA_AXES = [
  { key: "creativity", label: "Créativité" },
  { key: "ambition", label: "Ambition" },
  { key: "sociability", label: "Sociabilité" },
  { key: "curiosity", label: "Curiosité" },
  { key: "persistence", label: "Persévérance" },
  { key: "influence", label: "Influence" },
];

function FrameCorner({ className }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M2 2h8v2H4v6H2V2z" stroke="currentColor" strokeWidth="1.2" fill="rgba(245,166,35,0.15)" />
      <path d="M14 2l4 4-2 2-4-4 2-2z" fill="currentColor" />
      <path d="M2 14l4-4 2 2-4 4-2-2z" fill="#c0c8d4" opacity="0.85" />
    </svg>
  );
}

function HeroDnaRadar({ dna }) {
  const cx = 180;
  const cy = 150;
  const maxR = 72;
  const levels = [0.33, 0.66, 1];

  const points = DNA_AXES.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / DNA_AXES.length - Math.PI / 2;
    const raw = dna?.[axis.key] ?? 0;
    const norm = Math.min(1, Math.max(0, raw / 100));
    const r = maxR * norm;
    return {
      label: axis.label,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      lx: cx + (maxR + 28) * Math.cos(angle),
      ly: cy + (maxR + 28) * Math.sin(angle),
    };
  });

  const poly = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={styles.radarWrap}>
      <svg viewBox="0 0 360 300" width="100%" height="auto" role="img" aria-label="ADN du héros">
        {levels.map((lv) => (
          <polygon
            key={lv}
            points={DNA_AXES.map((_, i) => {
              const angle = (Math.PI * 2 * i) / DNA_AXES.length - Math.PI / 2;
              const r = maxR * lv;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        {DNA_AXES.map((_, i) => {
          const angle = (Math.PI * 2 * i) / DNA_AXES.length - Math.PI / 2;
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
            key={p.label}
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

export default function HeroCard({ userId, open, onClose }) {
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
  const tabs = canEditProfile ? BASE_TABS : BASE_TABS.filter((t) => t.id !== "customize");

  const loadCard = useCallback(async (retry = false) => {
    if (!userId) return;
    if (!getToken()) {
      toast.error("Session expirée — reconnectez-vous");
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
        toast.error("Session expirée — reconnectez-vous");
        onClose?.();
        return;
      }
      toast.error("Impossible de charger la carte héros");
    } finally {
      setLoading(false);
    }
  }, [userId, onClose, checkAuth]);

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
      toast.success("Demande d'amitié envoyée");
      loadCard();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Impossible d'envoyer la demande");
    }
  };

  const acceptIncomingRequest = async () => {
    const rid = data?.incoming_friend_request?.request_id;
    if (!rid) return;
    try {
      await api.post(`/friends/requests/${rid}/accept`);
      toast.success("Pacte d'amitié forgé");
      window.dispatchEvent(new CustomEvent("nexoria:friends-updated"));
      loadCard();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Acceptation impossible");
    }
  };

  const declineIncomingRequest = async () => {
    const rid = data?.incoming_friend_request?.request_id;
    if (!rid) return;
    try {
      await api.post(`/friends/requests/${rid}/decline`);
      toast.info("Demande refusée");
      window.dispatchEvent(new CustomEvent("nexoria:friends-updated"));
      loadCard();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  const sendMessage = () => {
    if (data?.is_friend && u) {
      navigate(`/friends?chat=${u.user_id}`);
      onClose?.();
      return;
    }
    toast.info("Message privé : ajoutez cet aventurier en ami pour lui écrire.");
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
                Carte Héros
              </div>
              <button
                type="button"
                onClick={onClose}
                data-testid="hero-card-close"
                className={styles.closeBtn}
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>Chargement de la carte...</div>
            ) : data?.hidden ? (
              <div className={styles.hiddenPanel}>
                <Shield className="w-12 h-12 mx-auto opacity-60" style={{ color: "#00e5cc" }} />
                <h3 className={styles.hiddenTitle}>Carte scellée</h3>
                <p className={styles.empty}>
                  {data.reason === "friends_only"
                    ? "Cette carte héros est réservée aux compagnons de l'aventurier."
                    : "Ce héros a choisi de garder sa carte confidentielle."}
                </p>
                <p style={{ fontSize: 12, color: "#8892a0" }}>{data.username}</p>
              </div>
            ) : !u ? (
              <div className={styles.empty}>Carte introuvable</div>
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
                      {canEditProfile && (
                        <button
                          type="button"
                          className={styles.portraitEditBtn}
                          onClick={() => setTab("customize")}
                          title="Modifier le profil"
                          data-testid="hero-card-edit-portrait"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

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
                  <p className={styles.heroSubtitle}>{getTitleLabel(u)}</p>
                  {u.is_vip && (
                    <div
                      data-testid="hero-vip-banner"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        margin: "6px auto 0", padding: "4px 12px", borderRadius: 999,
                        border: "1px solid rgba(251,191,36,0.5)",
                        background: "linear-gradient(92deg,rgba(251,191,36,0.14),rgba(168,85,247,0.14))",
                        color: "#fde68a", fontSize: 11, fontWeight: 800,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                      }}
                    >
                      <Gem className="w-3.5 h-3.5" /> VIP Nexus
                    </div>
                  )}
                  {u.is_vip && u.vip_until && (
                    <p style={{ fontSize: 11, color: "#c4b5fd", marginTop: 4 }}>
                      Pass ascendant actif jusqu'au {new Date(u.vip_until).toLocaleDateString("fr-FR")}
                    </p>
                  )}
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
                        {u.class_name}
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
                          <Repeat className="w-3 h-3" /> Changer
                        </button>
                      )}
                    </div>
                  )}
                  <p className={styles.levelLine}>
                    <span className={styles.levelLabel}>Niveau </span>
                    <span className={styles.levelNum}>{u.level || 1}</span>
                    <span className={styles.levelLabel}> – </span>
                    <span className={styles.levelRank}>{u.rank || "Novice"}</span>
                  </p>

                  <div className={styles.xpBlock}>
                    <div className={styles.xpTrack}>
                      <div className={styles.xpFill} style={{ width: `${xpPct}%` }} />
                    </div>
                    <div className={styles.xpText}>
                      XP : {u.xp || 0}{u.xp_next ? ` / ${u.xp_next}` : ""}
                    </div>
                  </div>

                  <div className={styles.sidebarInfo}>
                    <SidebarRow label="Pseudo" value={u.username} />
                    <SidebarRow label="Classe" value={u.class_name} color={classColor} />
                    <SidebarRow label="Faction" value="NEXORIA" />
                    <SidebarRow
                      label="Guilde"
                      value={data.guild?.name ? `${data.guild.name}${data.guild.rank ? ` · ${data.guild.rank}` : ""}` : "—"}
                      color={data.guild?.color || undefined}
                    />
                    {data.active_aura && (
                      <SidebarRow label="Aura" value={data.active_aura.title_name} color="#00d4ff" />
                    )}
                    <SidebarRow
                      label="Inscription"
                      value={u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    />
                    <SidebarRow
                      label="Dernière connexion"
                      value={data.location ? "En ligne" : "Hors-ligne"}
                      color={data.location ? "#6ee7b7" : undefined}
                    />
                    <SidebarRow
                      label="Localisation"
                      value={data.location ? prettyRoom(data.location.room) : "—"}
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
                            Accepter
                          </button>
                          <button
                            type="button"
                            onClick={declineIncomingRequest}
                            data-testid="hero-card-decline-friend"
                            className={styles.actionBtn}
                          >
                            Refuser
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
                          Ajouter ami
                        </button>
                      )}
                      {data.friend_request_pending && (
                        <span className={`${styles.actionBtn} ${styles.actionBtnMuted}`}>Demande envoyée</span>
                      )}
                      {data.is_friend && (
                        <span className={`${styles.actionBtn} ${styles.actionBtnAccent}`}>
                          <Users className="w-3 h-3 inline mr-1" />
                          Ami
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={sendMessage}
                        data-testid="hero-card-message"
                        className={styles.actionBtn}
                      >
                        <MessageCircle className="w-3 h-3 inline mr-1" />
                        Message
                      </button>
                    </div>
                  )}
                </aside>

                <main className={styles.rightCol}>
                  <div className={styles.tabs}>
                    {tabs.map((t) => {
                      const Ico = t.icon;
                      const active = tab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTab(t.id)}
                          data-testid={`hero-tab-${t.id}`}
                          className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                        >
                          <Ico className="w-3.5 h-3.5" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className={styles.tabContent}>
                    {tab === "overview" && (
                      <OverviewTab data={data} u={u} classColor={classColor} onViewBadges={() => setTab("badges")} />
                    )}
                    {tab === "info" && <InfoTab u={u} guild={data.guild} location={data.location} />}
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
        onChanged={async () => {
          await loadCard();
          if (data?.is_self) {
            try { await refreshAuth(); } catch { /* silent */ }
          }
        }}
      />
    </AnimatePresence>
  );
}

function SidebarRow({ label, value, color }) {
  return (
    <div className={styles.sidebarRow}>
      <span className={styles.sidebarLabel}>{label}</span>
      <span className={styles.sidebarValue} style={color ? { color } : undefined}>{value}</span>
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
  const badges = data.badges || [];
  const titles = (data.titles_progress || []).slice(-4);
  const dna = data.dna || {};
  const cosmetics = Object.values(data.equipped_cosmetics || {});
  const isOnline = Boolean(data.location);

  return (
    <>
      <Section title="Titres & Progression">
        <div className={styles.titlesGrid}>
          {titles.map((t) => {
            const aura = TITLE_AURA[t.id] || TITLE_AURA.novice;
            const locked = !t.unlocked;
            return (
              <div key={t.id} className={`${styles.titleCell} ${t.active ? styles.titleActive : ""}`}>
                <span
                  className={`${styles.titleIcon} ${locked ? styles.titleIconLocked : ""}`}
                  style={{ color: locked ? "#8892a0" : aura.color, filter: locked ? undefined : `drop-shadow(0 0 8px ${aura.color})` }}
                >
                  {aura.icon}
                </span>
                <div className={locked ? styles.titleNameLocked : styles.titleName} style={locked ? undefined : { color: aura.color }}>
                  {t.name}
                </div>
                <div className={styles.titleLevel}>niv {t.unlock_level}{t.active ? " · actif" : ""}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {cosmetics.length > 0 && (
        <Section title="Cosmétiques équipés">
          <div className={styles.titlesGrid}>
            {cosmetics.map((c) => {
              const r = RARITY[c.rarity] || RARITY.common;
              const SlotIcon = c.slot === "banner" ? Flag : Frame;
              return (
                <div key={c.sku} className={styles.titleCell} style={{ border: `1px solid ${r.color}44`, borderRadius: 8, padding: 8 }}>
                  <SlotIcon className="w-6 h-6 mx-auto mb-1" style={{ color: r.color }} />
                  <div className={styles.titleName} style={{ color: r.color }}>{c.name}</div>
                  <div className={styles.titleLevel}>{r.fr}</div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="ADN du Héros">
        <HeroDnaRadar dna={dna} />
      </Section>

      <Section
        title={`Badges (${badges.length})`}
        action={
          badges.length > 6 ? (
            <button type="button" className={styles.sectionLink} onClick={onViewBadges}>
              Voir tous
            </button>
          ) : null
        }
      >
        {badges.length === 0 ? (
          <div className={styles.empty}>Aucun badge — Explorez le monde !</div>
        ) : (
          <div className={styles.badgesRow}>
            {badges.slice(0, 6).map((b, i) => (
              <div key={b.badge_id || b.id || i} className={`${styles.badgeSlot} ${badgeGlowClass(b.rarity)}`}>
                <PremiumBadge badge={b} size="sm" />
              </div>
            ))}
            {badges.length > 6 && (
              <span className={styles.badgeMore}>+{badges.length - 6} autres</span>
            )}
          </div>
        )}
      </Section>

      <Section title="Informations détaillées">
        <div className={styles.infoGrid}>
          <div className={styles.infoCol}>
            <InfoEntry label="Pseudo" value={u.username} />
            <InfoEntry label="Classe" value={u.class_name} color={classColor} />
            <InfoEntry label="Serveur" value="NEXORIA" bold />
            <InfoEntry label="Guilde" value={data.guild?.name || "—"} muted={!data.guild?.name} />
          </div>
          <div className={styles.infoDivider} aria-hidden>
            <span className={styles.infoDividerDiamond} />
          </div>
          <div className={styles.infoCol}>
            <InfoEntry label="Rang" value={getTitleLabel(u)} color="#00d4ff" />
            <InfoEntry
              label="Inscription"
              value={u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
            />
            <InfoEntry label="Statut" value={isOnline ? "En ligne" : "Hors-ligne"} muted={!isOnline} />
            <InfoEntry
              label="Localisation"
              value={data.location ? prettyRoom(data.location.room) : "—"}
              muted={!data.location}
            />
          </div>
        </div>
      </Section>

      <Section title="Statistiques">
        <div className={styles.statsGrid}>
          <StatCell icon={Sword} label="Combat" value={u.combat_wins || u.pvp_wins || 0} sub="Victoires" color="#EF4444" />
          <StatCell icon={Flame} label="Boss" value={u.boss_kills || 0} sub="Vaincus" color="#7c3aed" />
          <StatCell icon={Trophy} label="Quêtes" value={u.quests_completed || 0} sub="Complétées" color="#f5a623" />
          <StatCell icon={Compass} label="Exploration" value={`${u.exploration || 0}%`} sub="Carte" color="#00d4ff" />
          <StatCell icon={Package} label="Collections" value={(data.inventory || []).length} sub="Objets" color="#10B981" />
        </div>
      </Section>
    </>
  );
}

function InfoEntry({ label, value, color, bold, muted }) {
  return (
    <div className={styles.infoEntry}>
      <label>{label}</label>
      <span style={{ color: muted ? "#8892a0" : color || "#e8eaf0", fontWeight: bold ? 800 : 600 }}>
        {value}
      </span>
    </div>
  );
}

function InfoTab({ u, guild, location }) {
  return (
    <Section title="Fiche détaillée">
      <div className={styles.grid2}>
        <InfoBlock label="Pseudo" value={u.username} />
        <InfoBlock label="Titre actif" value={getTitleLabel(u)} />
        <InfoBlock label="Classe" value={u.class_name} />
        <InfoBlock label="Classe secondaire" value={u.secondary_class_id || "—"} />
        <InfoBlock label="Faction" value="NEXORIA" />
        <InfoBlock label="Guilde" value={guild?.name ? `${guild.name}${guild.tag ? ` [${guild.tag}]` : ""}` : "Sans guilde"} />
        <InfoBlock label="Niveau" value={u.level} />
        <InfoBlock label="XP totale" value={u.xp || 0} />
        <InfoBlock label="Écus" value={`${u.aether || 0} ⟡`} />
        <InfoBlock label="Réputation" value={u.reputation || 0} />
        <InfoBlock label="Inscription" value={u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"} />
        <InfoBlock label="Localisation" value={location ? prettyRoom(location.room) : "Hors-ligne"} />
        <InfoBlock label="Followers" value={u.followers || 0} />
        <InfoBlock label="Following" value={u.following || 0} />
        <InfoBlock label="Rôle" value={u.role || "user"} />
        <InfoBlock label="Posts" value={u.posts_count || 0} />
      </div>
    </Section>
  );
}

function InventoryTab({ inv }) {
  if (!inv?.length) return <div className={styles.empty}>Inventaire vide.</div>;
  return (
    <Section title="Reliques & objets">
      <div className={styles.gridInv}>
        {inv.map((it, i) => {
          const r = RARITY[it.rarity] || RARITY.common;
          return (
            <div key={i} className={styles.itemCard} style={{ borderColor: `${r.color}55`, boxShadow: `0 0 10px ${r.glow}` }}>
              <div className={styles.itemIcon}>{it.icon || "✨"}</div>
              <div className={styles.itemName} style={{ color: r.color }}>{it.name}</div>
              <div className={styles.itemRarity}>{r.fr}</div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function BadgesTab({ badges }) {
  if (!badges?.length) return <div className={styles.empty}>Aucun badge débloqué.</div>;
  const groups = {};
  badges.forEach((b) => { (groups[b.rarity || "common"] = groups[b.rarity || "common"] || []).push(b); });
  const order = ["cosmic", "divine", "mythic", "legendary", "epic", "rare", "common"];
  return (
    <>
      {order.filter((r) => groups[r]).map((r) => {
        const cfg = RARITY[r];
        return (
          <Section key={r} title={`${cfg.fr} (${groups[r].length})`}>
            <div className={styles.badgesRow}>
              {groups[r].map((b, i) => (
                <div key={b.badge_id || b.id || i} className={`${styles.badgeSlot} ${badgeGlowClass(r)}`}>
                  <PremiumBadge badge={b} size="sm" />
                </div>
              ))}
            </div>
          </Section>
        );
      })}
    </>
  );
}

function HistoryTab({ chronicles }) {
  if (!chronicles?.length) return <div className={styles.empty}>Aucun historique.</div>;
  return (
    <Section title="Chroniques">
      {chronicles.map((c, i) => (
        <div key={i} className={styles.chronicleItem}>
          <div className={styles.chronicleText}>{c.text}</div>
          <div className={styles.chronicleDate}>
            {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
          </div>
        </div>
      ))}
    </Section>
  );
}

function RelationsTab({ data }) {
  const friends = data.friends || [];
  return (
    <>
      <Section title="Aperçu social">
        <div className={styles.statsGrid}>
          <StatCell icon={Users} label="Amis" value={data.friends_count || 0} sub="Liens forgés" color="#10B981" />
          <StatCell icon={Shield} label="Guilde" value={data.guild?.name || "—"} sub={data.guild?.rank || data.guild_tag || ""} color="#7c3aed" />
          <StatCell icon={Star} label="Followers" value={data.user?.followers || 0} sub="Influence" color="#f5a623" />
        </div>
      </Section>
      <Section title={`Amis (${friends.length})`}>
        {friends.length === 0 ? (
          <div className={styles.empty}>Aucun ami lié pour le moment.</div>
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
                      {f.class_name} · niv {f.level}{f.rank ? ` · ${f.rank}` : ""}
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

function InfoBlock({ label, value }) {
  return (
    <div className={styles.infoBlock}>
      <div className={styles.infoBlockLabel}>{label}</div>
      <div className={styles.infoBlockValue}>{value ?? "—"}</div>
    </div>
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

function prettyRoom(r) {
  const map = {
    place_centrale: "Place Centrale", taverne_etoilee: "Taverne Étoilée",
    marche_astral: "Marché Astral", quartier_guildes: "Quartier des Guildes",
    arene: "Arène Cosmique", vallee_boss: "Vallée des Boss",
    hall_legendes: "Hall des Légendes", bibliotheque_infinie: "Bibliothèque Infinie",
    archives: "Archives", sanctuaire_oracle: "Sanctuaire de l'Oracle",
    sanctuaire_failles: "Sanctuaire des Failles",
    laboratoire_alchimistes: "Laboratoire", atelier_inventeurs: "Atelier",
    temple_temps: "Temple du Temps", necropole: "Nécropole",
    jardin_songes: "Jardin des Songes", observatoire: "Observatoire",
    camp_aventuriers: "Camp des Aventuriers", chambre_reliques: "Chambre des Reliques",
    pantheon: "Panthéon", nexus_cosmique: "Nexus Cosmique", salle_conseil: "Salle du Conseil",
  };
  return map[r] || r;
}
