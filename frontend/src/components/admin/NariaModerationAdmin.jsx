import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, AlertTriangle, MessageCircle, Sparkles, LayoutDashboard, Shield } from "lucide-react";
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

function NavButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold border transition-all w-full ${
        active
          ? "border-violet-500/60 text-violet-100 bg-violet-500/15"
          : "border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}

export default function NariaModerationAdmin() {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const supreme = isSupremeCouncil(me);

  const defaultPanel = supreme ? "overview" : "pm";
  const [panel, setPanel] = useState(defaultPanel);
  const [dashboard, setDashboard] = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);

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
    loadDashboard();
  }, [loadDashboard]);

  const allowedPanels = useMemo(() => {
    const ids = supreme ? ["overview", "naria", "shumi", "pm"] : ["pm"];
    return new Set(ids);
  }, [supreme]);

  useEffect(() => {
    if (!allowedPanels.has(panel)) {
      setPanel(supreme ? "overview" : "pm");
    }
  }, [allowedPanels, panel, supreme]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl" data-testid="naria-moderation-admin">
      <aside className="lg:w-52 shrink-0">
        <div className="mb-4">
          <h2 className="font-display font-bold text-xl text-cyan-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            {t("admin.tab.moderation")}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Naria & Shumi — modération automatisée, messagerie privée.
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

          {supreme && (
            <NavSection label={t("admin.mod.section.auto")}>
              <NavButton
                active={panel === "overview"}
                onClick={() => setPanel("overview")}
                icon={LayoutDashboard}
                label={t("admin.mod.panel.overview")}
              />
              <NavButton
                active={panel === "naria"}
                onClick={() => setPanel("naria")}
                icon={Eye}
                label={t("admin.mod.panel.naria")}
              />
              <NavButton
                active={panel === "shumi"}
                onClick={() => setPanel("shumi")}
                icon={Sparkles}
                label={t("admin.mod.panel.shumi")}
              />
            </NavSection>
          )}
        </nav>

        {supreme && (
          <PremiumButton
            variant="ghost"
            size="sm"
            className="mt-4 w-full"
            onClick={loadDashboard}
            disabled={loadingDash}
          >
            <RefreshCw className={`w-4 h-4 ${loadingDash ? "animate-spin" : ""}`} />
            <span className="ml-2">Rafraîchir</span>
          </PremiumButton>
        )}
      </aside>

      <div className="flex-1 min-w-0 space-y-6">
        {panel === "overview" && supreme && (
          <section className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-lg text-violet-100">{t("admin.mod.panel.overview")}</h3>
              <p className="text-sm text-zinc-500 mt-1">Statistiques globales de la modération automatisée.</p>
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
                    Mode prudent : confiance faible = log seul ; ban auto désactivé.
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <PremiumButton variant="ghost" size="sm" onClick={() => setPanel("naria")}>
                    Voir logs Naria
                  </PremiumButton>
                  <PremiumButton variant="ghost" size="sm" onClick={() => setPanel("shumi")}>
                    Voir logs Shumi
                  </PremiumButton>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-sm py-4">{loadingDash ? "Chargement…" : "Aucune donnée."}</div>
            )}
          </section>
        )}

        {panel === "naria" && supreme && (
          <SentinelLogsPanel
            sentinel="naria"
            title={t("admin.mod.panel.naria")}
            subtitle="Forum, profils, fil social, articles, guildes."
            accent="#A855F7"
            showScores
          />
        )}

        {panel === "shumi" && supreme && (
          <SentinelLogsPanel
            sentinel="shumi"
            title={t("admin.mod.panel.shumi")}
            subtitle="Nexus Online — salons temps réel, trade, guildes."
            accent="#22D3EE"
          />
        )}

        {panel === "pm" && <PrivateMessagesLogsPanel />}
      </div>
    </div>
  );
}
