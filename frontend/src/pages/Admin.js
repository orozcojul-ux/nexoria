import React, { useEffect, useState } from "react";
import { Shield, Trash2, Users, MessageSquare, ScrollText, Sparkles, Ban, Edit3, Hammer, Megaphone, Crown, ShieldCheck, UserCog, ShoppingBag, Plus, X, ChevronLeft, Activity, Pin, Lock, Zap, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_TAB_META, getActiveAdminTab, resolveAdminTab, MOD_TABS } from "@/lib/admin-nav";
import { PageShell, PremiumCard, PremiumStat, PremiumButton } from "@/components/ui-premium";
import StaffChat from "@/components/StaffChat";
import BroadcastPanel from "@/components/BroadcastPanel";
import HeroName from "@/components/HeroName";
import MaintenanceTextField from "@/components/admin/MaintenanceTextField";
import MaintenancePreview from "@/components/admin/MaintenancePreview";
import BetaKeysAdmin from "@/components/admin/BetaKeysAdmin";
import ForumModerationAdmin from "@/components/admin/ForumModerationAdmin";
import NewsAdmin from "@/components/admin/NewsAdmin";
import TeamPageAdmin from "@/components/admin/TeamPageAdmin";
import AdminEditHeroDialog from "@/components/admin/AdminEditHeroDialog";
import ReportsAdmin from "@/components/admin/ReportsAdmin";
import NariaModerationAdmin from "@/components/admin/NariaModerationAdmin";
import EventsAdmin from "@/components/admin/EventsAdmin";
import EconomyAdmin from "@/components/admin/EconomyAdmin";
import TwoFAGate from "@/components/admin/TwoFAGate";
import { MAINTENANCE_HTML_FIELDS, DEFAULT_MAINTENANCE_HTML, normalizeMaintenanceHtml, normalizeMaintenanceSystems } from "@/lib/maintenance-content";
import { ONLINE_GATE_HTML_FIELDS, DEFAULT_ONLINE_GATE_HTML, normalizeOnlineGateHtml } from "@/lib/online-gate-content";
import "@/pages/Maintenance.css";

const SURFACE = "relative rounded-xl border border-white/10 bg-gradient-to-br from-[#0F0820]/80 via-[#0A0613]/80 to-[#1A0B3D]/80 backdrop-blur";
// Higher-contrast, near-opaque surface for dense configuration panels
// (maintenance / online gate) so all text stays clearly readable.
const SURFACE_SOLID = "relative rounded-xl border border-violet-500/20 bg-[#0b0713]/95 shadow-[0_8px_40px_rgba(0,0,0,0.55)]";

/** Convertit un ISO (UTC) en valeur locale pour <input type="datetime-local">. */
function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function Admin() {
  const { t } = useI18n();
  const { user: me, refresh: refreshAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = me?.role === "admin";
  const isMod = me?.role === "moderator";
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [banHistory, setBanHistory] = useState([]);
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    html: {},
    systems: {},
    subtitle: "",
    open_at: "",
  });
  const [onlineGate, setOnlineGate] = useState({
    open: true,
    html: {},
  });
  const tab = resolveAdminTab(getActiveAdminTab(searchParams.toString()), isAdmin);
  const tabMeta = ADMIN_TAB_META[tab];
  const heroSearch = (searchParams.get("q") || "").trim();
  const filteredUsers = heroSearch
    ? users.filter((u) => u.username?.toLowerCase().includes(heroSearch.toLowerCase()))
    : users;
  const [banTarget, setBanTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const setTab = (nextTab) => {
    const resolved = resolveAdminTab(nextTab, isAdmin);
    if (resolved === "pulse") setSearchParams({});
    else setSearchParams({ tab: resolved });
  };

  const load = async () => {
    try {
      const [u, l, bh, m, og] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/logs"),
        api.get("/admin/ban-history"),
        api.get("/system/maintenance"),
        api.get("/system/online-gate"),
      ]);
      setUsers(u.data); setLogs(l.data); setBanHistory(bh.data);
      setMaintenance({
        enabled: Boolean(m.data?.enabled),
        html: normalizeMaintenanceHtml(m.data?.html),
        systems: normalizeMaintenanceSystems(m.data?.systems),
        subtitle: m.data?.subtitle || "",
        open_at: m.data?.open_at || "",
      });
      setOnlineGate({
        open: og.data?.open !== false,
        html: normalizeOnlineGateHtml(og.data?.html),
      });
    } catch (err) { toast.error(formatApiError(err) || t("admin.access_denied")); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { refreshAuth?.(); }, [refreshAuth]);

  useEffect(() => {
    const active = getActiveAdminTab(searchParams.toString());
    const resolved = resolveAdminTab(active, isAdmin);
    if (active !== resolved) setTab(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAdmin]);

  useEffect(() => {
    if (tab !== "users" || !heroSearch) return;
    if (users.length > 0 && filteredUsers.length === 0) {
      toast.error(`Aucun héros trouvé pour « ${heroSearch} »`);
    }
  }, [tab, heroSearch, users.length, filteredUsers.length]);

  const buildMaintenancePayload = (enabled) => ({
    enabled,
    html: normalizeMaintenanceHtml(maintenance.html),
    systems: normalizeMaintenanceSystems(maintenance.systems),
    subtitle: (maintenance.subtitle || "").slice(0, 300),
    open_at: maintenance.open_at || null,
  });

  const toggleMaintenance = async () => {
    const newState = !maintenance.enabled;
    try {
      await api.post("/admin/maintenance", buildMaintenancePayload(newState));
      toast.success(newState ? "Maintenance ACTIVÉE" : "Maintenance désactivée");
      await load();
    } catch { toast.error("Erreur"); }
  };

  const saveMaintenanceContent = async () => {
    try {
      await api.post("/admin/maintenance", buildMaintenancePayload(maintenance.enabled));
      toast.success("Contenu maintenance enregistré");
      await load();
    } catch { toast.error("Erreur"); }
  };

  const buildOnlineGatePayload = (open) => ({
    open,
    html: normalizeOnlineGateHtml(onlineGate.html),
  });

  const toggleOnlineGate = async () => {
    const newOpen = !onlineGate.open;
    try {
      await api.post("/admin/online-gate", buildOnlineGatePayload(newOpen));
      toast.success(newOpen ? "Serveur Nexus OUVERT — la communauté peut entrer" : "Serveur Nexus FERMÉ — le site reste accessible, staff autorisé");
      await load();
    } catch { toast.error("Erreur"); }
  };

  const saveOnlineGateContent = async () => {
    try {
      await api.post("/admin/online-gate", buildOnlineGatePayload(onlineGate.open));
      toast.success("Message « portes fermées » enregistré");
      await load();
    } catch { toast.error("Erreur"); }
  };

  const updateOnlineHtml = (key, value) => {
    setOnlineGate((prev) => ({
      ...prev,
      html: { ...(prev.html || {}), [key]: value },
    }));
  };

  const resetOnlineGateStyle = () => {
    setOnlineGate((prev) => ({ ...prev, html: { ...DEFAULT_ONLINE_GATE_HTML } }));
    toast.message("Textes par défaut restaurés — cliquez Enregistrer pour publier");
  };

  const onlineGateHtml = normalizeOnlineGateHtml(onlineGate.html);

  const updateHtml = (key, value) => {
    setMaintenance((prev) => ({
      ...prev,
      html: { ...(prev.html || {}), [key]: value },
    }));
  };

  const maintenanceHtml = normalizeMaintenanceHtml(maintenance.html);
  const maintenanceSystems = normalizeMaintenanceSystems(maintenance.systems);

  const updateSystem = (key, patch) => {
    setMaintenance((prev) => ({
      ...prev,
      systems: {
        ...(prev.systems || {}),
        [key]: { ...(prev.systems?.[key] || {}), ...patch },
      },
    }));
  };

  const resetMaintenanceStyle = () => {
    setMaintenance((prev) => ({ ...prev, html: { ...DEFAULT_MAINTENANCE_HTML } }));
    toast.message("Style Nexoria restauré — cliquez Enregistrer pour publier");
  };

  const MAINTENANCE_SYSTEM_KEYS = [
    { key: "database", label: "Base de données", defaultProgress: 50 },
    { key: "site", label: "Site", defaultProgress: 30 },
    { key: "international", label: "Mode international (traduction)", defaultProgress: 85 },
    { key: "server", label: "Serveur Online", defaultProgress: 10 },
  ];

  const unban = async (uid) => {
    try { await api.post(`/admin/users/${uid}/unban`); toast.success(t("admin.ban_lifted")); await load(); }
    catch (err) { toast.error(formatApiError(err) || "Erreur"); }
  };

  return (
    <PageShell
      wide
      testid="admin-page"
      banner={{
        pageKey: "admin",
        subtitle: t("admin.subtitle"),
        pixelTheme: "gold",
      }}
    >
      <TwoFAGate>
      <div className="flex items-center justify-end flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-amber-400/40 bg-amber-500/10">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-amber-200 font-bold">{t("admin.mode_label")} {isAdmin ? t("admin.mode.admin") : t("admin.mode.mod")}</span>
        </div>
      </div>

      {/* Sélecteur mobile — la navigation principale est dans la sidebar */}
      <div className="lg:hidden flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {Object.entries(ADMIN_TAB_META)
          .filter(([id]) => isAdmin || MOD_TABS.has(id))
          .map(([id, meta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              data-testid={`admin-tab-${id}`}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                tab === id
                  ? "border-violet-500/60 text-violet-200 bg-violet-500/15"
                  : "border-white/10 text-zinc-500"
              }`}
            >
              {t(meta.labelKey)}
            </button>
          ))}
      </div>

      {isMod && (
        <PremiumCard tone="gold" className="p-3 mb-6 max-w-2xl mx-auto text-center border-orange-500/30" testid="mod-banner">
          <div className="text-[10px] uppercase tracking-[0.3em] text-orange-400 font-bold font-display">
            <ShieldCheck className="w-3 h-3 inline mr-1" /> Mode Modérateur
          </div>
          <div className="text-xs text-zinc-400 italic mt-1">Vous pouvez consulter, bannir et lever les bans des héros standards. L'édition complète est réservée aux Archontes.</div>
        </PremiumCard>
      )}

      {tab === "pulse" && <PulseAdmin onNavigate={setTab} />}
      {tab === "users" && (
        <div className="space-y-3">
          {heroSearch && (
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-sm text-zinc-400">
                Résultats pour <span className="text-violet-300 font-semibold">« {heroSearch} »</span>
                {" — "}
                <span className="font-mono-stat text-white">{filteredUsers.length}</span> héros
              </p>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete("q");
                  setSearchParams(params);
                }}
                className="text-xs text-zinc-500 hover:text-violet-300 transition-colors"
                data-testid="clear-hero-search"
              >
                Effacer la recherche
              </button>
            </div>
          )}
          <div className={`${SURFACE} rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead className="border-b border-white/5">
                <tr className="text-left text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-display">
                  <th className="p-3">Pseudo</th>
                  <th className="p-3 hidden sm:table-cell">Classe</th>
                  <th className="p-3">Niveau</th>
                  <th className="p-3 hidden sm:table-cell">Écus</th>
                  <th className="p-3 hidden md:table-cell">Statut</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500 italic">
                      {heroSearch ? `Aucun héros ne correspond à « ${heroSearch} »` : "Aucun héros enregistré"}
                    </td>
                  </tr>
                )}
                {filteredUsers.map((u) => {
                const banned = u.banned_until && new Date(u.banned_until) > new Date();
                return (
                <tr key={u.user_id} className={`border-b border-white/5 hover:bg-white/[0.03] ${banned ? "bg-red-500/5" : ""}`} data-testid={`admin-user-${u.user_id}`}>
                  <td className="p-3"><HeroName user={u} size="sm" /> {banned && <span className="text-red-400 text-xs ml-1">[banni]</span>}</td>
                  <td className="p-3 hidden sm:table-cell text-zinc-400">{u.class_name}</td>
                  <td className="p-3 font-mono-stat text-cyan-300">{u.level}</td>
                  <td className="p-3 hidden sm:table-cell font-mono-stat text-yellow-300">{u.aether ?? 0} ✦</td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={`text-[10px] uppercase tracking-[0.25em] font-bold ${u.role === "admin" ? "text-violet-300" : u.role === "moderator" ? "text-orange-300" : "text-zinc-400"}`}>
                      {u.role === "admin" ? "Sage" : u.role === "moderator" ? "Modérateur" : "Voyageur"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {isAdmin && (
                        <button onClick={() => setEditTarget(u)} className="text-cyan-400 hover:text-cyan-300 p-1" title="Modifier" data-testid={`edit-user-${u.user_id}`}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Mods can ban regular users only — admins can ban anyone except other admins */}
                      {u.role !== "admin" && (isMod ? u.role !== "moderator" : true) && (banned ? (
                        <button onClick={() => unban(u.user_id)} className="text-orange-400 hover:text-orange-300 p-1" title="Lever ban" data-testid={`unban-${u.user_id}`}>
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => setBanTarget(u)} className="text-red-400 hover:text-red-300 p-1" title="Bannir" data-testid={`ban-${u.user_id}`}>
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === "bans" && (
        <div className={`${SURFACE} rounded-2xl p-4 space-y-2 max-h-[600px] overflow-y-auto`} data-testid="ban-history">
          {banHistory.length === 0 && <div className="text-center text-zinc-500 italic py-12">Aucun bannissement enregistré</div>}
          {banHistory.map((b) => (
            <div key={b.ban_id} className={`p-3 rounded border ${b.lifted ? "border-white/5 opacity-50" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-display font-bold"><HeroName user={b} size="sm" /></div>
                  <div className="text-xs text-zinc-400">Par {b.banned_by} · {b.duration_hours}h · « {b.reason} »</div>
                  <div className="text-[10px] font-mono-stat text-zinc-500 mt-1">Jusqu'au {new Date(b.banned_until).toLocaleString()}</div>
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${b.lifted ? "text-zinc-500" : "text-red-400"}`}>
                  {b.lifted ? "Levé" : "Actif"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div className={`${SURFACE} rounded-2xl p-4 max-h-[600px] overflow-y-auto`}>
          {logs.map((l) => (
            <div key={l.chronicle_id || `${l.created_at}-${l.kind}`} className="py-2 border-b border-white/5 last:border-0 flex gap-3">
              <div className="w-1 bg-gradient-to-b from-violet-500 to-cyan-400 rounded-full" />
              <div className="flex-1">
                <div className="text-sm text-zinc-200">{l.text}</div>
                <div className="text-[10px] font-mono-stat text-zinc-500 uppercase tracking-widest">[{l.kind}] {new Date(l.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "broadcast" && <BroadcastPanel />}
      {tab === "chat" && <StaffChat />}
      {tab === "forum-mod" && <ForumModerationAdmin />}
      {tab === "shop" && <ShopAdmin />}
      {tab === "news" && <NewsAdmin />}
      {tab === "team" && <TeamPageAdmin />}
      {tab === "events" && <EventsAdmin />}
      {tab === "seasons" && <SeasonsAdmin />}
      {tab === "tickets" && <TicketsAdmin />}
      {tab === "reports" && <ReportsAdmin />}
      {tab === "moderation" && <NariaModerationAdmin />}
      {tab === "grant" && <AetherGrantAdmin />}
      {tab === "economy" && <EconomyAdmin />}
      {tab === "discord" && <DiscordSyncAdmin />}
      {tab === "legend" && <AdminLegend />}
      {tab === "roles" && <RolesGuide />}

      {tab === "system" && (
        <div className="space-y-6 max-w-5xl">
          <div className={`${SURFACE_SOLID} rounded-2xl p-6 space-y-6`}>
            <h2 className="font-display font-bold text-xl flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" /> Serveur Online (événements)
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Ferme uniquement le <strong className="text-zinc-200">serveur Nexus</strong> (monde multijoueur temps réel).
              Le reste du site — feed, forum, boutique, profil — reste accessible.
              Les <strong className="text-violet-300">Sentinelles</strong> (admin & modérateurs) gardent l&apos;accès au Nexus.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={toggleOnlineGate}
                data-testid="online-gate-toggle"
                className={`px-5 py-2.5 rounded-md font-bold font-display tracking-wide border transition-all ${onlineGate.open ? "border-green-500/50 text-green-300 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]" : "border-amber-500/50 text-amber-300 hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"}`}>
                {onlineGate.open ? "FERMER le serveur Online" : "OUVRIR le serveur Online"}
              </button>
              <span className={`text-xs font-mono-stat ${onlineGate.open ? "text-green-400" : "text-amber-400"}`}>
                Statut : {onlineGate.open ? "OUVERT 🌐" : "FERMÉ 🔒"}
              </span>
            </div>

            <div className="space-y-5 pt-4 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400 font-bold">Message affiché quand le serveur est fermé</p>
              {ONLINE_GATE_HTML_FIELDS.map((field) => (
                <MaintenanceTextField
                  key={field.key}
                  label={field.label}
                  hint={field.hint}
                  rows={Math.max(2, Math.round((field.minHeight || 56) / 28))}
                  value={onlineGateHtml[field.key] || ""}
                  onChange={(v) => updateOnlineHtml(field.key, v)}
                  testid={`online-gate-html-${field.key}`}
                />
              ))}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={saveOnlineGateContent} data-testid="online-gate-save"
                  className="px-4 py-2 rounded-md text-xs font-bold border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">
                  Enregistrer le message
                </button>
                <button type="button" onClick={resetOnlineGateStyle} data-testid="online-gate-reset"
                  className="px-4 py-2 rounded-md text-xs font-bold border border-white/15 text-zinc-400 hover:bg-white/5">
                  Restaurer textes par défaut
                </button>
              </div>
            </div>
          </div>

        <div className={`${SURFACE_SOLID} rounded-2xl p-6 space-y-6`}>
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <Hammer className="w-5 h-5 text-yellow-400" /> {t("admin.maintenance_mode")}
          </h2>

          <div className="space-y-5">
            <MaintenancePreview html={maintenanceHtml} />

            <p className="text-[10px] uppercase tracking-[0.35em] text-violet-400 font-bold">Textes de la page maintenance</p>
            {MAINTENANCE_HTML_FIELDS.map((field) => (
              <MaintenanceTextField
                key={field.key}
                label={field.label}
                hint={field.hint}
                rows={Math.max(2, Math.round((field.minHeight || 56) / 28))}
                value={maintenanceHtml[field.key] || ""}
                onChange={(v) => updateHtml(field.key, v)}
                testid={`maintenance-html-${field.key}`}
              />
            ))}

            <MaintenanceTextField
              label="Note — Avancement global"
              hint="Texte court affiché dans le widget « Avancement global » (optionnel)"
              rows={2}
              value={maintenance.subtitle || ""}
              onChange={(v) => setMaintenance((prev) => ({ ...prev, subtitle: v }))}
              testid="maintenance-subtitle"
            />

            <div className="pt-2 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400 font-bold mb-2">Compte à rebours d'ouverture</p>
              <p className="text-xs text-zinc-500 mb-2">Date/heure d'ouverture affichée sur la page maintenance. Laissez vide pour masquer le compte à rebours.</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="datetime-local"
                  value={isoToLocalInput(maintenance.open_at)}
                  onChange={(e) => setMaintenance((prev) => ({ ...prev, open_at: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
                  className="bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
                  data-testid="maintenance-open-at"
                />
                {maintenance.open_at && (
                  <button
                    type="button"
                    onClick={() => setMaintenance((prev) => ({ ...prev, open_at: "" }))}
                    className="px-3 py-1.5 rounded-md text-xs border border-white/15 text-zinc-400 hover:bg-white/5"
                    data-testid="maintenance-open-at-clear"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400 font-bold mb-3">Avancement des systèmes</p>
              <div className="space-y-5">
                {MAINTENANCE_SYSTEM_KEYS.map(({ key, label, defaultProgress }) => {
                  const sys = maintenanceSystems[key] || {};
                  const progress = sys.progress ?? defaultProgress;
                  const status = sys.status || "maintenance";
                  const labelText = sys.label || label;
                  return (
                    <div key={key} className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-3">
                      <MaintenanceTextField
                        label={`Nom affiché — ${label}`}
                        hint="Libellé visible dans la carte systèmes"
                        rows={1}
                        value={labelText}
                        onChange={(v) => updateSystem(key, { label: v, status, progress })}
                        testid={`maintenance-system-label-${key}`}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Statut</span>
                        <select
                          value={status}
                          onChange={(e) => updateSystem(key, { status: e.target.value, label: labelText, progress })}
                          className="bg-[#0A0A0E] border border-white/10 rounded px-2 py-1 text-xs"
                          data-testid={`maintenance-system-status-${key}`}
                        >
                          <option value="operational">Opérationnel</option>
                          <option value="sync">Synchronisation</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="offline">Hors ligne</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={progress}
                          onChange={(e) => updateSystem(key, { progress: Number(e.target.value), status, label: labelText })}
                          className="flex-1 accent-cyan-400"
                          data-testid={`maintenance-system-progress-${key}`}
                        />
                        <span className="text-xs font-mono text-cyan-300 w-10 text-right">{progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={saveMaintenanceContent}
                data-testid="maintenance-save"
                className="px-4 py-2 rounded-md text-sm font-bold border border-cyan-500/40 text-cyan-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)] transition-all"
              >
                Enregistrer le contenu
              </button>
              <button
                type="button"
                onClick={resetMaintenanceStyle}
                data-testid="maintenance-reset-style"
                className="px-4 py-2 rounded-md text-sm border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 transition-all"
              >
                Restaurer le style Nexoria
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <BetaKeysAdmin />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            <button
              onClick={toggleMaintenance}
              data-testid="maintenance-toggle"
              className={`px-5 py-2.5 rounded-md font-bold font-display tracking-wide border transition-all ${maintenance.enabled ? "border-green-500/50 text-green-300 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]" : "border-yellow-500/50 text-yellow-300 hover:shadow-[0_0_16px_rgba(234,179,8,0.3)]"}`}>
              {maintenance.enabled ? "Désactiver la maintenance" : "ACTIVER la maintenance"}
            </button>
            <span className={`text-xs font-mono-stat ${maintenance.enabled ? "text-yellow-400" : "text-zinc-500"}`}>
              Statut: {maintenance.enabled ? "ON 🔧" : "OFF"}
            </span>
          </div>
        </div>
        </div>
      )}

      {/* Ban dialog */}
      <AnimatePresence>
        {banTarget && <BanDialog target={banTarget} onClose={() => setBanTarget(null)} onDone={async () => { setBanTarget(null); await load(); }} t={t} />}
        {editTarget && (
          <AdminEditHeroDialog
            target={editTarget}
            onClose={() => setEditTarget(null)}
            onDone={async (patch) => {
              setEditTarget(null);
              if (patch?.deleted) {
                setUsers((prev) => prev.filter((u) => u.user_id !== patch.user_id));
              } else if (patch) {
                setUsers((prev) => prev.map((u) => (u.user_id === patch.user_id ? { ...u, ...patch } : u)));
              }
              await load();
            }}
            t={t}
          />
        )}
      </AnimatePresence>
      </TwoFAGate>
    </PageShell>
  );
}

function RolesGuide() {
  const roles = [
    {
      id: "user", name: "Voyageur", icon: Users, color: "#9CA3AF",
      desc: "L'utilisateur standard de NEXORIA.",
      perms: ["Poster, commenter, réagir", "Compléter quêtes et gagner XP", "Acheter à la Boutique d'Écus", "Consulter le Sanctuaire", "Construire son royaume"],
    },
    {
      id: "moderator", name: "Modérateur", icon: ShieldCheck, color: "#F97316",
      desc: "Veille sur la communauté. Accès partiel au Conseil.",
      perms: [
        "Tous les droits du Voyageur",
        "Accès à la Salle du Conseil (lecture)",
        "Accès Chat Staff (lecture + écriture)",
        "Accès à la page Maintenance",
        "Bannir / lever ban des héros standards (pas admin ni modérateur)",
        "Consulter l'historique des sanctions",
        "Modération forum (épingler, verrouiller, supprimer)",
        "PAS de droit : modifier des héros, lancer une proclamation, basculer la maintenance",
      ],
    },
    {
      id: "admin", name: "Sage (Admin)", icon: Crown, color: "#9D4CDD",
      desc: "Autorité suprême. Tous les pouvoirs.",
      perms: [
        "Tous les droits du Modérateur",
        "Bannir / lever ban (1h → 10 ans)",
        "Modifier tout héros (pseudo, email, classe, niveau, XP, Écus, titre, bio, rôle…)",
        "Supprimer des héros",
        "Activer / désactiver le mode Maintenance",
        "Lancer des Proclamations Royales (alertes broadcast)",
        "Voir tous les logs et l'historique des bans",
      ],
    },
  ];
  return (
    <div className="space-y-4" data-testid="roles-guide">
      <p className="text-sm text-zinc-400 italic">
        Pour modifier un héros (pseudo, classe, progression, sanctions…), ouvrez l&apos;onglet <span className="text-violet-300 font-semibold">Joueurs</span> et cliquez sur l&apos;icône crayon à droite de la ligne.
      </p>
      <div className="grid md:grid-cols-3 gap-4">
      {roles.map((r) => (
        <div key={r.id} className={`${SURFACE} rounded-2xl p-5`} style={{ borderColor: `${r.color}40` }}>
          <div className="flex items-center gap-2 mb-2">
            <r.icon className="w-6 h-6" style={{ color: r.color, filter: `drop-shadow(0 0 8px ${r.color}66)` }} />
            <div className="font-display font-bold text-xl">{r.name}</div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: r.color }}>{r.id}</div>
          <p className="text-sm text-zinc-300 italic mb-4 scroll-paragraph">{r.desc}</p>
          <ul className="space-y-1.5 text-xs">
            {r.perms.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-cyan-400 shrink-0">▸</span>
                <span className={p.startsWith("PAS") ? "text-red-300" : "text-zinc-300"}>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      </div>
    </div>
  );
}

function BanDialog({ target, onClose, onDone, t }) {
  const [hours, setHours] = useState(24);
  const [reason, setReason] = useState("");
  const alreadyBanned = target.banned_until && new Date(target.banned_until) > new Date();
  const submit = async (e) => {
    e.preventDefault();
    if (alreadyBanned) {
      toast.error("Ce héros est déjà banni — levez le ban avant d'en appliquer un nouveau.");
      return;
    }
    if (!reason.trim()) { toast.error("Raison requise"); return; }
    try {
      await api.post(`/admin/users/${target.user_id}/ban`, { duration_hours: hours, reason });
      toast.success(`${target.username} banni pour ${hours}h`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className={`${SURFACE} rounded-2xl p-6 max-w-md w-full space-y-4`} data-testid="ban-dialog">
        <h3 className="font-display font-black text-2xl text-red-300">Bannir {target.username}</h3>
        {alreadyBanned && (
          <p className="text-sm text-amber-300/90 italic">
            Ce héros est déjà banni — levez le ban existant avant d&apos;en appliquer un nouveau.
          </p>
        )}
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">{t("admin.ban_duration")}</label>
          <input type="number" min="1" max="87600" value={hours} onChange={(e) => setHours(parseInt(e.target.value) || 1)}
            className="w-full bg-[#0A0A0E] border border-red-500/30 rounded-md px-3 py-2" data-testid="ban-duration-input" />
          <div className="flex gap-2 mt-2">
            {[1, 24, 168, 720].map((h) => (
              <button key={h} type="button" onClick={() => setHours(h)} className="px-2 py-1 text-xs border border-white/10 rounded hover:border-red-500/40">
                {h < 24 ? `${h}h` : h < 168 ? `${h/24}j` : h < 720 ? `${h/168}sem` : `${h/720}mois`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">{t("admin.ban_reason")}</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full bg-[#0A0A0E] border border-red-500/30 rounded-md px-3 py-2" rows={3} data-testid="ban-reason-input" />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-white/10 text-sm">{t("common.cancel")}</button>
          <button type="submit" disabled={alreadyBanned} data-testid="confirm-ban-btn" className="px-4 py-2 rounded border border-red-500/50 text-red-300 hover:bg-red-500/10 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Ban className="w-3 h-3 inline mr-1" /> Bannir
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}


// ---------- Shop Admin (CRUD) ----------
function ShopAdmin() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | item object
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/shop");
      setItems(data);
    } catch { toast.error("Erreur de chargement"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const removeItem = async (sku) => {
    if (!window.confirm(`Supprimer définitivement « ${sku} » ?`)) return;
    try {
      await api.delete(`/admin/shop/${sku}`);
      toast.success("Item supprimé");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };

  const byCat = items.reduce((acc, it) => {
    (acc[it.category] = acc[it.category] || []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="shop-admin">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-yellow-400" /> Gestion de la Boutique
          </h2>
          <p className="text-xs text-zinc-500 italic mt-1">
            Les items <span className="text-cyan-400 font-bold">statiques</span> sont immuables. Les items <span className="text-yellow-400 font-bold">custom</span> peuvent être modifiés / supprimés.
          </p>
        </div>
        <button onClick={() => setEditing("new")} data-testid="shop-add-btn"
          className="px-4 py-2 rounded-md border border-yellow-500/50 text-yellow-300 font-bold font-display tracking-wide hover:shadow-[0_0_18px_rgba(255,215,0,0.4)] flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nouvel item
        </button>
      </div>

      {loading && <div className="text-center py-8 text-zinc-500 italic">Chargement...</div>}

      {Object.keys(byCat).sort().map((cat) => (
        <div key={cat} className={`${SURFACE} rounded-2xl overflow-hidden`}>
          <div className="px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold font-display border-b border-white/5 bg-white/[0.02]">
            {cat} ({byCat[cat].length})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[9px] uppercase tracking-widest text-zinc-500 border-b border-white/5">
                <th className="p-2">SKU</th>
                <th className="p-2">Nom</th>
                <th className="p-2">Rareté</th>
                <th className="p-2 text-center">Niv.</th>
                <th className="p-2 text-right">Prix</th>
                <th className="p-2 text-center">Source</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {byCat[cat].map((it) => (
                <tr key={it.sku} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]" data-testid={`shop-admin-row-${it.sku}`}>
                  <td className="p-2 font-mono-stat text-xs text-zinc-400">{it.sku}</td>
                  <td className="p-2 font-display font-bold">{it.name}</td>
                  <td className="p-2"><span className={`text-[9px] uppercase tracking-widest font-bold rarity-${it.rarity}`}>{it.rarity}</span></td>
                  <td className="p-2 text-center font-mono-stat text-cyan-300 font-bold">{it.unlock_level || 1}</td>
                  <td className="p-2 text-right font-mono-stat text-yellow-300 font-bold">{it.price}</td>
                  <td className="p-2 text-center">
                    <span className={`text-[9px] uppercase tracking-widest font-bold ${it.source === "custom" ? "text-yellow-400" : "text-cyan-400"}`}>
                      {it.source || "static"}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    {it.source === "custom" ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setEditing(it)} className="text-cyan-400 hover:text-cyan-300 p-1" title="Modifier" data-testid={`shop-edit-${it.sku}`}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeItem(it.sku)} className="text-red-400 hover:text-red-300 p-1" title="Supprimer" data-testid={`shop-delete-${it.sku}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] uppercase tracking-widest text-zinc-600">verrouillé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <AnimatePresence>
        {editing && (
          <ShopItemDialog
            item={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onDone={() => { setEditing(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ShopItemDialog({ item, onClose, onDone }) {
  const isNew = !item;
  const [form, setForm] = useState({
    sku: item?.sku || "",
    name: item?.name || "",
    category: item?.category || "cosmetic",
    price: item?.price || 100,
    icon: item?.icon || "Sparkles",
    rarity: item?.rarity || "common",
    description: item?.description || "",
    boost_type: item?.boost_type || "",
    boost_value: item?.boost_value || 0,
    duration_minutes: item?.duration_minutes || 0,
    unlock_level: item?.unlock_level || 1,
  });

  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form, price: parseInt(form.price) || 0, unlock_level: parseInt(form.unlock_level) || 1 };
    if (payload.category === "boost") {
      payload.boost_value = parseFloat(form.boost_value) || 1;
      payload.duration_minutes = parseInt(form.duration_minutes) || 60;
    } else {
      payload.boost_type = null;
      payload.boost_value = null;
      payload.duration_minutes = null;
    }
    try {
      if (isNew) {
        await api.post("/admin/shop", payload);
        toast.success(`« ${form.name} » ajouté à la boutique`);
      } else {
        await api.put(`/admin/shop/${item.sku}`, payload);
        toast.success("Item mis à jour");
      }
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className={`${SURFACE} rounded-2xl p-6 max-w-lg w-full space-y-3 max-h-[90vh] overflow-y-auto`} data-testid="shop-item-dialog">
        <div className="flex justify-between items-start">
          <h3 className="font-display font-black text-xl text-gradient">
            {isNew ? "Nouvel item de boutique" : `Modifier « ${item.name} »`}
          </h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <Field label="SKU (identifiant unique)" required>
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
            disabled={!isNew} placeholder="ex: cosmic_aura_special"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat disabled:opacity-50" data-testid="shop-sku" />
        </Field>

        <Field label="Nom affiché">
          <input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-name" />
        </Field>

        <Field label="Description (poétique)">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2} className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-desc" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Catégorie">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-category">
              <option value="cosmetic">Cosmétique</option>
              <option value="boost">Élixir (boost)</option>
              <option value="consumable">Consommable</option>
              <option value="kingdom">Royaume</option>
            </select>
          </Field>
          <Field label="Rareté">
            <select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-rarity">
              {["common", "rare", "epic", "legendary", "mythic", "divine", "cosmic"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix (Écus)">
            <input type="number" min="1" value={form.price} required onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat" data-testid="shop-price" />
          </Field>
          <Field label="Icône (Lucide)">
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="ex: Sparkles, Crown, Sword..." className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="shop-icon" />
          </Field>
        </div>

        <Field label="Niveau requis pour acquérir">
          <input type="number" min="1" max="999" value={form.unlock_level} onChange={(e) => setForm({ ...form, unlock_level: e.target.value })}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat" data-testid="shop-unlock-level" />
        </Field>

        {form.category === "boost" && (
          <div className="grid grid-cols-3 gap-2 p-3 rounded-md border border-violet-500/30 bg-violet-500/5">
            <Field label="Type">
              <select value={form.boost_type} onChange={(e) => setForm({ ...form, boost_type: e.target.value })}
                className="w-full bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs" data-testid="shop-boost-type">
                <option value="xp_multiplier">XP x</option>
                <option value="aether_multiplier">Écus x</option>
                <option value="luck">Chance</option>
              </select>
            </Field>
            <Field label="Valeur">
              <input type="number" step="0.1" value={form.boost_value} onChange={(e) => setForm({ ...form, boost_value: e.target.value })}
                className="w-full bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs" data-testid="shop-boost-value" />
            </Field>
            <Field label="Durée (min)">
              <input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                className="w-full bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs" data-testid="shop-boost-duration" />
            </Field>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-white/10 text-sm">Annuler</button>
          <button type="submit" data-testid="shop-save" className="px-4 py-2 rounded border border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10 font-bold text-sm">
            {isNew ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

// ---------- Seasons Admin ----------
function SeasonsAdmin() {
  const [seasons, setSeasons] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [leaderboard, setLeaderboard] = useState({ rows: [], seasonId: null });

  const load = async () => {
    try {
      const { data } = await api.get("/seasons");
      setSeasons(data);
    } catch { toast.error("Erreur chargement saisons"); }
  };
  useEffect(() => { load(); }, []);

  const loadLB = async (sid) => {
    const { data } = await api.get(`/seasons/${sid}/leaderboard`);
    setLeaderboard({ rows: data, seasonId: sid });
  };

  const endSeason = async (sid) => {
    if (!window.confirm("Clôturer cette saison ? Les récompenses seront distribuées immédiatement.")) return;
    try {
      const { data } = await api.post(`/admin/seasons/${sid}/end`);
      toast.success(`Saison clôturée — ${data.ranked} héros récompensés`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };

  return (
    <div className="space-y-6" data-testid="seasons-admin">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold text-xl">📅 Cycles du Cosmos</h2>
          <p className="text-xs text-zinc-500 italic mt-1">Une seule saison peut être active à la fois. Démarrer une nouvelle clôture la précédente sans distribuer ses récompenses.</p>
        </div>
        <button onClick={() => setShowCreate(true)} data-testid="open-create-season"
          className="px-4 py-2 rounded-md border border-cyan-500/50 text-cyan-300 font-bold flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nouvelle saison
        </button>
      </div>

      <div className="space-y-2">
        {seasons.length === 0 && <div className="text-center text-zinc-500 italic py-12">Aucune saison enregistrée</div>}
        {seasons.map((s) => (
          <div key={s.season_id} className={`${SURFACE} rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap ${s.active ? "border-2 border-green-500/40" : ""}`} data-testid={`season-row-${s.season_id}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <h3 className="font-display font-bold">{s.name}</h3>
                {s.active && <span className="text-[10px] uppercase tracking-widest font-bold text-green-400">● Active</span>}
              </div>
              <div className="text-xs text-zinc-400 italic">{s.description || "—"}</div>
              <div className="text-[10px] font-mono-stat text-zinc-500 mt-1">
                {new Date(s.started_at).toLocaleDateString("fr-FR")} → {new Date(s.ends_at).toLocaleDateString("fr-FR")} ({s.duration_days}j)
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => loadLB(s.season_id)} className="px-3 py-1.5 rounded border border-cyan-500/40 text-cyan-300 text-xs font-bold" data-testid={`view-lb-${s.season_id}`}>Classement</button>
              {s.active && (
                <button onClick={() => endSeason(s.season_id)} className="px-3 py-1.5 rounded border border-red-500/40 text-red-300 text-xs font-bold" data-testid={`end-season-${s.season_id}`}>Clôturer</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {leaderboard.seasonId && (
        <div className={`${SURFACE} rounded-xl p-4`}>
          <div className="flex justify-between mb-3">
            <h3 className="font-display font-bold">Classement</h3>
            <button onClick={() => setLeaderboard({ rows: [], seasonId: null })}><X className="w-4 h-4 text-zinc-500" /></button>
          </div>
          {leaderboard.rows.length === 0 ? (
            <div className="text-center text-zinc-500 italic py-4">Aucun score enregistré</div>
          ) : (
            <div className="space-y-1">
              {leaderboard.rows.map((r, i) => (
                <div key={r.user_id} className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-stat text-cyan-300 font-bold w-6">#{i + 1}</span>
                    <HeroName user={r.user} size="sm" />
                  </div>
                  <span className="font-mono-stat text-violet-300 font-bold">{r.season_xp} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateSeasonDialog onClose={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await load(); }} />}
      </AnimatePresence>
    </div>
  );
}

function CreateSeasonDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", duration_days: 30 });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/seasons", { ...form, duration_days: parseInt(form.duration_days) || 30 });
      toast.success("Saison ouverte — tous les héros notifiés");
      await onCreated();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className={`${SURFACE} rounded-2xl p-6 max-w-md w-full space-y-3`} data-testid="create-season-dialog">
        <h3 className="font-display font-black text-xl text-gradient">Ouvrir une saison</h3>
        <input value={form.name} required minLength={3} placeholder="Nom (ex: L'Éveil du Dragon)"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="season-name" />
        <textarea value={form.description} rows={3} placeholder="Présage de cette saison..."
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="season-desc" />
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Durée (jours)</label>
          <input type="number" min="1" max="365" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat mt-1" data-testid="season-days" />
        </div>
        <div className="text-[10px] text-zinc-500 italic">
          Récompenses automatiques à la clôture : Top 1 → 5000 ✦ + badge Champion · Top 10 → 1500 ✦ + badge Elite · Top 50 → 500 ✦
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded border border-white/10 text-xs">Annuler</button>
          <button type="submit" className="px-4 py-2 rounded border border-cyan-500/40 text-cyan-300 font-bold text-sm" data-testid="season-create-submit">Ouvrir</button>
        </div>
      </motion.form>
    </motion.div>
  );
}


// ---------- Tickets Admin (visible to staff) ----------
function TicketsAdmin() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/tickets", { params: { status: filter } });
      setTickets(data);
    } catch { toast.error("Erreur"); }
  };
  useEffect(() => { load(); }, [filter]);

  if (selected) return <AdminTicketDetail ticketId={selected} onBack={() => { setSelected(null); load(); }} />;

  const STATUS = { open: "Ouvert", in_progress: "En cours", resolved: "Résolu", closed: "Clos" };
  const COLOR = { open: "#3B82F6", in_progress: "#EAB308", resolved: "#10B981", closed: "#71717A" };

  return (
    <div className="space-y-4" data-testid="tickets-admin">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="font-display font-bold text-xl">📨 Doléances du royaume</h2>
        <div className="flex gap-1 flex-wrap">
          {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} data-testid={`tk-filter-${s}`}
              className={`px-3 py-1 rounded text-xs font-bold border ${filter === s ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10" : "border-white/10 text-zinc-400"}`}>
              {s === "all" ? "Toutes" : STATUS[s]}
            </button>
          ))}
        </div>
      </div>
      {tickets.length === 0 ? (
        <div className="text-center text-zinc-500 italic py-8">Aucune doléance pour ce filtre.</div>
      ) : tickets.map((t) => (
        <button key={t.ticket_id} onClick={() => setSelected(t.ticket_id)} data-testid={`admin-ticket-${t.ticket_id}`}
          className={`w-full ${SURFACE} rounded-xl p-3 text-left hover:bg-white/[0.03] flex justify-between items-center gap-3`}>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold truncate">{t.subject}</div>
            <div className="text-[10px] text-zinc-500 font-mono-stat">{t.username} · {t.category} · {new Date(t.updated_at).toLocaleString("fr-FR")}</div>
          </div>
          <span className="px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold shrink-0"
            style={{ background: `${COLOR[t.status]}20`, color: COLOR[t.status] }}>{STATUS[t.status]}</span>
        </button>
      ))}
    </div>
  );
}

function AdminTicketDetail({ ticketId, onBack }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const load = async () => { const r = await api.get(`/tickets/${ticketId}`); setData(r.data); };
  useEffect(() => { load(); }, [ticketId]);
  const reply = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api.post(`/tickets/${ticketId}/replies`, { content: text.trim() });
    setText(""); load();
  };
  const setStatus = async (status) => { await api.put(`/tickets/${ticketId}/status`, { status }); toast.success("Statut mis à jour"); load(); };
  if (!data) return <div className="text-center text-zinc-500 py-8">Chargement...</div>;
  const t = data.ticket;
  const COLOR = { open: "#3B82F6", in_progress: "#EAB308", resolved: "#10B981", closed: "#71717A" };
  return (
    <div data-testid="admin-ticket-detail">
      <button onClick={onBack} className="mb-3 text-cyan-400 text-sm flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Retour</button>
      <div className={`${SURFACE} rounded-xl p-4 mb-3 border-2`} style={{ borderColor: `${COLOR[t.status]}40` }}>
        <h3 className="font-display font-bold text-lg mb-1">{t.subject}</h3>
        <div className="text-xs text-zinc-500 mb-2"><HeroName user={t.author} size="sm" /> · {t.category} · {new Date(t.created_at).toLocaleString("fr-FR")}</div>
        <div className="text-sm text-zinc-200 whitespace-pre-wrap">{t.body}</div>
        <div className="flex gap-1 mt-3 flex-wrap">
          {["open", "in_progress", "resolved", "closed"].map((s) => (
            <button key={s} onClick={() => setStatus(s)} disabled={t.status === s}
              className="px-2.5 py-1 rounded border text-[10px] uppercase tracking-widest font-bold disabled:opacity-40"
              style={{ borderColor: `${COLOR[s]}40`, color: COLOR[s] }}
              data-testid={`admin-status-${s}`}>
              {{ open: "Ouvrir", in_progress: "En cours", resolved: "Résoudre", closed: "Clore" }[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {data.replies.map((r) => (
          <div key={r.reply_id} className={`${SURFACE} rounded-xl p-3 ${r.is_staff ? "border border-violet-500/30 bg-violet-500/5" : ""}`}>
            <div className="text-xs text-zinc-500 mb-1"><HeroName user={r.author} size="sm" /> {r.is_staff && <span className="text-violet-300 text-[9px] uppercase tracking-widest font-bold">· Conseil</span>}</div>
            <div className="text-sm text-zinc-200 whitespace-pre-wrap">{r.content}</div>
          </div>
        ))}
      </div>
      <form onSubmit={reply} className={`${SURFACE} rounded-xl p-3 space-y-2`}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Réponse du Conseil..."
          rows={3} className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="admin-treply-input" />
        <button type="submit" className="px-3 py-1.5 rounded border border-cyan-500/40 text-cyan-300 text-sm font-bold" data-testid="admin-treply-submit">Répondre</button>
      </form>
    </div>
  );
}


// ---------- Aether Grant ----------
function AetherGrantAdmin() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState(null);
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data || []);
    } catch (err) {
      const msg = formatApiError(err) || "Impossible de charger les héros";
      setUsersError(msg);
      toast.error(msg);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter((u) => u.username?.toLowerCase().includes(search.toLowerCase())).slice(0, 20);

  const submit = async (e) => {
    e.preventDefault();
    if (!target) return toast.error("Choisir un héros");
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) return toast.error("Montant invalide (non nul requis)");
    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/grant-aether", {
        target_user_id: target.user_id, amount: parsedAmount, reason: reason.trim(),
      });
      toast.success(`Écus distribués à ${target.username} — nouveau solde : ${data.new_aether} ✦`);
      setReason("");
      setAmount(100);
      setTarget(null);
      setSearch("");
      await loadUsers();
    } catch (err) { toast.error(formatApiError(err) || "Erreur"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4" data-testid="aether-grant-admin">
      <div>
        <h2 className="font-display font-bold text-xl">💎 Distribution d'Écus</h2>
        <p className="text-xs text-zinc-500 italic mt-1">Accordez (positif) ou retirez (négatif) des Écus à un héros. Une notification + une chronique sont créées automatiquement.</p>
      </div>
      <form onSubmit={submit} className={`${SURFACE} rounded-xl p-5 space-y-3`}>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">Héros cible</label>
          <input
            value={search}
            onChange={(e) => {
              const v = e.target.value;
              setSearch(v);
              if (target && v.trim().toLowerCase() !== target.username?.toLowerCase()) setTarget(null);
            }}
            placeholder="Rechercher par pseudo..."
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
            data-testid="grant-search"
          />
          {usersLoading && <p className="text-xs text-zinc-500 italic mt-1">Chargement des héros…</p>}
          {usersError && !usersLoading && (
            <p className="text-xs text-red-400 mt-1">{usersError}</p>
          )}
          {target && (
            <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded border border-yellow-500/30 bg-yellow-500/5 text-sm">
              <span>Cible : <HeroName user={target} size="sm" /> · <span className="font-mono-stat text-yellow-300">{target.aether ?? 0} ✦</span></span>
              <button type="button" onClick={() => { setTarget(null); setSearch(""); }} className="text-xs text-zinc-500 hover:text-white">Changer</button>
            </div>
          )}
          {search && !target && !usersLoading && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded border border-white/5 bg-[#080810]">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-500 italic">Aucun héros trouvé</div>
              ) : filtered.map((u) => (
                <button type="button" key={u.user_id} onClick={() => { setTarget(u); setSearch(u.username); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/[0.04] text-sm flex justify-between" data-testid={`grant-pick-${u.user_id}`}>
                  <span><HeroName user={u} size="sm" /></span>
                  <span className="text-yellow-400 font-mono-stat text-xs">{u.aether ?? 0} ✦</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">Montant (peut être négatif)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat" data-testid="grant-amount" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">Motif</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="ex: gagnant concours" className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="grant-reason" />
          </div>
        </div>
        <button type="submit" disabled={!target || submitting}
          className="px-4 py-2 rounded border border-yellow-500/50 text-yellow-300 font-bold text-sm disabled:opacity-40" data-testid="grant-submit">
          {submitting
            ? "Distribution en cours…"
            : target
              ? `Accorder ${Number(amount) > 0 ? "+" : ""}${amount} ✦ à ${target.username}`
              : "Choisir d'abord un héros"}
        </button>
      </form>
    </div>
  );
}


// ---------- Admin Legend ----------
function AdminLegend() {
  const sections = [
    { id: "pulse", title: "Pulse du royaume", body: "Tableau de bord temps réel — sessions, doléances, forum, bans, alertes système et actions rapides." },
    { id: "users", title: "Héros", body: "Liste de tous les comptes. Admin : édition complète, ban/unban, gestion des rôles. Modérateur : consultation + ban/unban des héros standards seulement." },
    { id: "bans", title: "Bannissements", body: "Historique de tous les bans : qui, quand, raison, durée. Accessible aux modérateurs." },
    { id: "logs", title: "Chroniques", body: "100 derniers événements globaux : level-ups, badges obtenus, modérations, achats. Sert d'audit trail." },
    { id: "broadcast", title: "Proclamation", body: "[Admin] Envoie un message visuel + sonore en plein écran à tous les héros connectés. Idéal pour annonces majeures (maintenance, événement, lancement de saison)." },
    { id: "chat", title: "Chat Staff", body: "Salon privé entre admins et modérateurs. Polling 5s. Persiste 7 jours." },
    { id: "shop", title: "Boutique", body: "[Admin] CRUD des items custom de la boutique. Les items statiques (déclarés en dur dans shop_data.py) sont verrouillés et ne peuvent être ni modifiés ni supprimés." },
    { id: "news", title: "Actualités", body: "[Admin] Publie des articles à la une sur la page d'accueil. Les articles mis en avant déclenchent une alerte sur le site pour tous les joueurs." },
    { id: "team", title: "Page équipe", body: "[Admin] Édite la présentation publique des membres staff sur la page Communauté (rôle précis, nationalité, bio, spécialités). Ne modifie pas les grades Sage/Sentinelle." },
    { id: "seasons", title: "Saisons", body: "[Admin] Cycles de jeu compétitifs. Une saison active à la fois. À la clôture, les Top 1/10/50 reçoivent Écus + badges. L'XP gagné pendant une saison est mirroré dans season_scores." },
    { id: "tickets", title: "Doléances (Missives)", body: "Tickets d'aide soumis par les héros. Les staff peuvent répondre, changer le statut (Ouvert → En cours → Résolu → Clos). Les héros reçoivent une notification à chaque mise à jour." },
    { id: "grant", title: "Don d'Écus", body: "[Admin] Distribution manuelle d'Écus (positif = don, négatif = ponction). Une chronique est créée et le héros est notifié." },
    { id: "roles", title: "Rôles", body: "[Admin] Promotion / rétrogradation entre user, moderator, admin. Un admin ne peut pas se rétrograder lui-même." },
    { id: "system", title: "Système", body: "[Admin] Ouvre/ferme le serveur Nexus (hub multijoueur événementiel, sans bloquer le site) et bascule la maintenance globale. Accès staff maintenance : rune discrète ou Ctrl+Shift+S sur /maintenance." },
    { id: "legend", title: "Légende", body: "Ce panneau d'aide. À consulter sans modération." },
  ];
  return (
    <div className="space-y-3" data-testid="admin-legend">
      <div>
        <h2 className="font-display font-bold text-xl">📖 Codex du Conseil</h2>
        <p className="text-xs text-zinc-500 italic mt-1">Description de chaque onglet du panel administratif.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((s) => (
          <div key={s.id} className={`${SURFACE} rounded-xl p-4`} data-testid={`legend-${s.id}`}>
            <div className="font-display font-bold text-sm mb-1 text-cyan-300">{s.title}</div>
            <div className="text-xs text-zinc-400 italic scroll-paragraph">{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ---------- Discord Sync Admin ----------
function DiscordSyncAdmin() {
  const [status, setStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [log, setLog] = useState([]);
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [autoSync, setAutoSync] = useState(true);
  const [lastAutoSync, setLastAutoSync] = useState(null);
  const runningRef = React.useRef(false);

  const load = async () => {
    const [s, u, l] = await Promise.all([
      api.get("/discord/status"),
      api.get("/admin/users"),
      api.get("/admin/discord/log"),
    ]);
    setStatus(s.data); setUsers(u.data); setLog(l.data);
  };
  useEffect(() => { load(); }, []);

  const syncAll = React.useCallback(async (silent = false) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    try {
      const { data } = await api.post("/admin/discord/sync-all");
      setResult(data);
      setLastAutoSync(new Date());
      if (!silent) {
        toast.success(`${data.ok}/${data.total} synchronisés (${data.errors} erreurs, ${data.skipped} skip)`);
      }
      await load();
    } catch (e) {
      if (!silent) toast.error(e.response?.data?.detail || "Erreur");
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (!autoSync || !status?.configured) return undefined;
    syncAll(true);
    const id = setInterval(() => syncAll(true), 60_000);
    return () => clearInterval(id);
  }, [autoSync, status?.configured, syncAll]);

  const syncUser = async (uid, username) => {
    setRunning(true); setResult(null);
    try {
      const { data } = await api.post(`/admin/discord/sync-user/${uid}`);
      setResult(data);
      if (data.ok && data.applied) toast.success(`Rôles synchronisés pour ${username}`);
      else if (data.profile_updated) toast.success(`Profil Discord mis à jour : ${data.discord_display_name || username}`);
      else if (data.skipped) toast.info(`Skip ${username} : ${data.reason}`);
      else if (data.error) toast.error(`Erreur ${username} : ${data.error}`);
      else toast.success(`${username} déjà à jour`);
      await load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
    finally { setRunning(false); }
  };

  const syncAllManual = async () => {
    if (!window.confirm("Resynchroniser TOUS les comptes Discord liés ? Cette opération peut prendre du temps.")) return;
    await syncAll(false);
  };

  const filtered = users.filter((u) => u.discord_id && u.username?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5" data-testid="discord-sync-admin">
      <div>
        <h2 className="font-display font-bold text-xl">🔗 Synchronisation Discord</h2>
        <p className="text-xs text-zinc-500 italic mt-1">
          Aligne les rôles Discord avec la classe et le rang de chaque héros, et rafraîchit le pseudo serveur, le display name et l&apos;avatar Discord sur le profil NEXORIA. Les rôles staff (Gardien Suprême, Sage, Sentinelle) ne sont JAMAIS modifiés.
        </p>
        <div className="mt-2 text-[10px] uppercase tracking-[0.3em] font-bold space-y-1">
          <div>
            État du bot :
            {status === null ? <span className="text-zinc-500"> chargement...</span> :
              status.configured ? <span className="text-green-400"> ● Configuré</span> :
                <span className="text-red-400"> ● Token absent</span>}
          </div>
          <div className="flex items-center gap-3 flex-wrap normal-case tracking-normal">
            <label className="inline-flex items-center gap-2 text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                data-testid="discord-auto-sync-toggle"
              />
              Sync auto toutes les 1 min
            </label>
            {lastAutoSync && (
              <span className="text-zinc-500 font-mono-stat">
                Dernière sync auto : {lastAutoSync.toLocaleTimeString("fr-FR")}
              </span>
            )}
            {running && <span className="text-cyan-400 animate-pulse">Synchronisation…</span>}
          </div>
        </div>
      </div>

      <div className={`${SURFACE} rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap`}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Comptes Discord liés</div>
          <div className="font-mono-stat text-2xl text-cyan-300 font-bold">{filtered.length}</div>
        </div>
        <button onClick={syncAllManual} disabled={running || !status?.configured}
          className="px-4 py-2 rounded border border-violet-500/50 text-violet-300 font-bold text-sm disabled:opacity-40 flex items-center gap-2"
          data-testid="discord-sync-all">
          {running ? "..." : "🌐 Tout resynchroniser"}
        </button>
      </div>

      <div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer par pseudo..." className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm mb-2" data-testid="discord-search" />
        <div className={`${SURFACE} rounded-xl divide-y divide-white/5 max-h-[400px] overflow-y-auto`}>
          {filtered.length === 0 && <div className="p-6 text-center text-zinc-500 italic text-sm">Aucun compte lié</div>}
          {filtered.slice(0, 100).map((u) => (
            <div key={u.user_id} className="p-3 flex items-center justify-between gap-3" data-testid={`discord-row-${u.user_id}`}>
              <div className="flex-1 min-w-0">
                <HeroName user={u} size="sm" />
                <div className="text-[10px] font-mono-stat text-zinc-500">
                  Niv. {u.level} · {u.class_name} · Discord: {u.discord_guild_nick || u.discord_global_name || u.discord_username || u.discord_id}
                  {u.discord_roles_synced_at && <span className="text-green-400 ml-2">● sync {new Date(u.discord_roles_synced_at).toLocaleString("fr-FR")}</span>}
                </div>
              </div>
              <button onClick={() => syncUser(u.user_id, u.username)} disabled={running}
                className="px-3 py-1.5 rounded border border-cyan-500/40 text-cyan-300 text-xs font-bold disabled:opacity-40" data-testid={`discord-sync-${u.user_id}`}>
                Sync
              </button>
            </div>
          ))}
        </div>
      </div>

      {result && (
        <div className={`${SURFACE} rounded-xl p-3 text-xs font-mono-stat`} data-testid="discord-result">
          <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-1">Dernier résultat</div>
          <pre className="text-zinc-400 overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2">Journal de synchronisation ({log.length})</div>
        <div className={`${SURFACE} rounded-xl divide-y divide-white/5 max-h-[300px] overflow-y-auto`}>
          {log.length === 0 && <div className="p-4 text-center text-zinc-500 italic text-xs">Aucune entrée</div>}
          {log.map((entry, i) => (
            <div key={i} className="px-3 py-2 text-xs flex items-baseline gap-2" data-testid={`discord-log-${i}`}>
              <span className={`text-[10px] font-bold ${entry.success ? "text-green-400" : "text-red-400"}`}>
                {entry.success ? "✓" : "✗"}
              </span>
              <span className="font-mono-stat text-zinc-500">{new Date(entry.created_at).toLocaleString("fr-FR")}</span>
              <span className="font-mono-stat text-zinc-400 truncate flex-1">{entry.user_id}</span>
              <span className="text-zinc-300 truncate">{entry.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PulseAdmin({ onNavigate }) {
  const [pulse, setPulse] = useState(null);
  const load = async () => {
    try {
      const r = await api.get("/admin/pulse");
      setPulse(r.data);
    } catch {
      toast.error("Impossible de charger le pulse");
    }
  };
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);

  if (!pulse) {
    return <PremiumCard tone="cyan" className="p-10 text-center text-zinc-500 italic">Analyse du royaume...</PremiumCard>;
  }

  const alerts = [
    pulse.maintenance_enabled && { tone: "gold", text: "Maintenance active — le site est en mode verrouillage" },
    !pulse.maintenance_enabled && pulse.online_open === false && { tone: "cyan", text: "Serveur Nexus fermé — hub multijoueur réservé aux événements (le site reste ouvert, staff autorisé)" },
    pulse.open_tickets > 5 && { tone: "violet", text: `${pulse.open_tickets} doléances ouvertes — file support chargée` },
    pulse.banned_users > 0 && { tone: "red", text: `${pulse.banned_users} héros actuellement bannis` },
  ].filter(Boolean);

  return (
    <div className="space-y-5" data-testid="admin-pulse">
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <PremiumCard key={i} tone={a.tone} className="p-3 flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 shrink-0" />
              {a.text}
            </PremiumCard>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Sessions actives", value: pulse.active_sessions, tone: "cyan", icon: Activity },
          { label: "Nouveaux (7j)", value: pulse.new_users_week, tone: "emerald", icon: Users },
          { label: "Doléances ouvertes", value: pulse.open_tickets, tone: "violet", icon: MessageSquare },
          { label: "Bans actifs", value: pulse.banned_users, tone: "gold", icon: Ban },
          { label: "Sujets forum", value: pulse.forum_threads, tone: "gold", icon: ScrollText },
          { label: "Réponses forum", value: pulse.forum_replies, tone: "cyan", icon: MessageSquare },
          { label: "Sujets aujourd'hui", value: pulse.threads_today, tone: "emerald", icon: Sparkles },
          { label: "Réponses aujourd'hui", value: pulse.replies_today, tone: "violet", icon: Sparkles },
        ].map((s) => (
          <PremiumStat key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
        ))}
      </div>

      <PremiumCard tone="gold" className="p-5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-bold mb-4">Actions rapides</div>
        <div className="flex flex-wrap gap-2">
          <PremiumButton variant="violet" size="sm" onClick={() => onNavigate("tickets")} testid="pulse-goto-tickets">
            Doléances
          </PremiumButton>
          <PremiumButton variant="cyan" size="sm" onClick={() => onNavigate("forum-mod")} testid="pulse-goto-forum">
            Modération forum
          </PremiumButton>
          <PremiumButton variant="gold" size="sm" onClick={() => onNavigate("broadcast")} testid="pulse-goto-broadcast">
            Proclamation
          </PremiumButton>
          <PremiumButton variant="cyan" size="sm" onClick={() => onNavigate("system")} testid="pulse-goto-system">
            Maintenance
          </PremiumButton>
          <a href="/forum" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Voir le forum
          </a>
        </div>
        <p className="text-[10px] text-zinc-600 mt-3 italic">Rafraîchissement automatique toutes les 30 secondes</p>
      </PremiumCard>
    </div>
  );
}
