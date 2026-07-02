import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, AlertTriangle, MessageCircle, Sparkles, LayoutDashboard, Shield, User } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { isSupremeCouncil } from "@/lib/staff-roles";
import { PremiumButton } from "@/components/ui-premium";
import SentinelLogsPanel, { StatBox } from "@/components/admin/SentinelLogsPanel";
import PrivateMessagesLogsPanel from "@/components/admin/PrivateMessagesLogsPanel";

function NavSection({ label, children }) {
  if (!children) return null;
  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-[9px] uppercase tracking-[0.35em] text-zinc-600 font-bold px-1 pt-2 first:pt-0">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold border transition-all w-full ${
        active
          ? "border-violet-500/60 text-violet-100 bg-violet-500/15"
          : "border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
      }`}
      style={active && accent ? { borderColor: `${accent}99`, color: accent } : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function sentinelIcon(s) {
  if (s.kind === "system" && s.key === "naria") return Eye;
  if (s.kind === "system" && s.key === "shumi") return Sparkles;
  return User;
}

export default function NariaModerationAdmin() {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const supreme = isSupremeCouncil(me);
  const isMod = me?.role === "moderator";

  const [sentinels, setSentinels] = useState([]);
  const [panel, setPanel] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [loadingSentinels, setLoadingSentinels] = useState(true);

  const loadSentinels = useCallback(async () => {
    setLoadingSentinels(true);
    try {
      const { data } = await api.get("/admin/moderation/sentinels");
      setSentinels(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur chargement sentinelles");
      setSentinels([]);
    } finally {
      setLoadingSentinels(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!supreme) return;
    setLoadingDash(true);
    try {
      const { data } = await api.get("/admin/moderation/dashboard");
      setDashboard(data);
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur chargement tableau de bord");
    } finally {
      setLoadingDash(false);
    }
  }, [supreme]);

  useEffect(() => {
    loadSentinels();
    loadDashboard();
  }, [loadSentinels, loadDashboard]);

  const systemSentinels = useMemo(
    () => sentinels.filter((s) => s.kind === "system"),
    [sentinels],
  );
  const humanSentinels = useMemo(
    () => sentinels.filter((s) => s.kind !== "system"),
    [sentinels],
  );

  const activeSentinel = useMemo(
    () => sentinels.find((s) => s.key === panel) || null,
    [sentinels, panel],
  );

  const defaultSentinelKey = useMemo(() => {
    if (supreme && sentinels.some((s) => s.key === "naria")) return "naria";
    if (isMod) {
      const own = sentinels.find((s) => s.user_id === me?.user_id);
      if (own) return own.key;
    }
    return sentinels[0]?.key || "pm";
  }, [supreme, isMod, sentinels, me?.user_id]);

  useEffect(() => {
    if (panel != null) return;
    if (!sentinels.length) {
      setPanel("pm");
      return;
    }
    setPanel(defaultSentinelKey === "pm" ? "pm" : defaultSentinelKey);
  }, [panel, sentinels, defaultSentinelKey]);

  useEffect(() => {
    if (panel == null || panel === "pm" || panel === "overview") return;
    if (sentinels.length && !sentinels.some((s) => s.key === panel)) {
      setPanel(defaultSentinelKey);
    }
  }, [sentinels, panel, defaultSentinelKey]);

  const refreshAll = () => {
    loadSentinels();
    loadDashboard();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl" data-testid="naria-moderation-admin">
      <aside className="lg:w-52 shrink-0">
        <div className="mb-4">
          <h2 className="font-display font-bold text-xl text-cyan-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            {t("admin.tab.moderation")}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {t("admin.mod.subtitle")}
          </p>
        </div>

        <nav className="space-y-3">
          <NavSection label={t("admin.mod.section.watch")}>
            <NavButton
              active={panel === "pm"}
              onClick={() => setPanel("pm")}
              icon={MessageCircle}
              label={t("admin.mod.panel.pm")}
            />
          </NavSection>

          <NavSection label={t("admin.mod.section.sentinel")}>
            {loadingSentinels && (
              <p className="text-xs text-zinc-600 px-1 italic">Chargement…</p>
            )}
            {!loadingSentinels && humanSentinels.length === 0 && (
              <p className="text-xs text-zinc-600 px-1 italic">Aucune sentinelle humaine.</p>
            )}
            {humanSentinels.map((s) => (
              <NavButton
                key={s.key}
                active={panel === s.key}
                onClick={() => setPanel(s.key)}
                icon={sentinelIcon(s)}
                label={s.label}
                accent={s.accent}
              />
            ))}
          </NavSection>

          {supreme && (
            <NavSection label={t("admin.mod.section.auto")}>
              {systemSentinels.map((s) => (
                <NavButton
                  key={s.key}
                  active={panel === s.key}
                  onClick={() => setPanel(s.key)}
                  icon={sentinelIcon(s)}
                  label={s.label}
                  accent={s.accent}
                />
              ))}
              <NavButton
                active={panel === "overview"}
                onClick={() => setPanel("overview")}
                icon={LayoutDashboard}
                label={t("admin.mod.panel.overview")}
              />
            </NavSection>
          )}
        </nav>

        {(supreme || isMod) && (
          <PremiumButton
            variant="ghost"
            size="sm"
            className="mt-4 w-full"
            onClick={refreshAll}
            disabled={loadingDash || loadingSentinels}
          >
            <RefreshCw className={`w-4 h-4 ${loadingDash || loadingSentinels ? "animate-spin" : ""}`} />
            <span className="ml-2">Rafraîchir</span>
          </PremiumButton>
        )}
      </aside>

      <div className="flex-1 min-w-0 space-y-6">
        {panel === "overview" && supreme && (
          <section className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-lg text-violet-100">{t("admin.mod.panel.overview")}</h3>
              <p className="text-sm text-zinc-500 mt-1">Statistiques globales — Naria, Shumi et mesures du royaume.</p>
            </div>
            {dashboard ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <StatBox label="Alertes en attente" value={dashboard.pending_alerts} accent="#F59E0B" />
                  <StatBox label="Avertissements" value={dashboard.warnings_recent} accent="#A855F7" />
                  <StatBox label="Contenus masqués" value={dashboard.hidden_content} accent="#EF4444" />
                  <StatBox label="Restreints" value={dashboard.restricted_users} accent="#F97316" />
                  <StatBox label="Scores élevés" value={dashboard.high_score_users} accent="#22D3EE" />
                  <StatBox label="Bans / proposés" value={dashboard.ban_events} accent="#DC2626" />
                </div>
                {!dashboard.auto_ban_enabled && (
                  <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Mode prudent : confiance faible = log seul ; ban sentinelle désactivé.
                  </div>
                )}
              </>
            ) : (
              <div className="text-zinc-500 text-sm py-4">{loadingDash ? "Chargement…" : "Aucune donnée."}</div>
            )}
          </section>
        )}

        {activeSentinel && (
          <SentinelLogsPanel
            sentinel={activeSentinel.key}
            title={activeSentinel.label}
            subtitle={activeSentinel.subtitleKey ? t(activeSentinel.subtitleKey) : activeSentinel.subtitle}
            accent={activeSentinel.accent}
            showScores={supreme && activeSentinel.key === "naria"}
            humanSentinel={activeSentinel.kind !== "system"}
            supremeCanReview={supreme}
          />
        )}

        {panel === "pm" && <PrivateMessagesLogsPanel />}
      </div>
    </div>
  );
}
