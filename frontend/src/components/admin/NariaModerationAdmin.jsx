import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, AlertTriangle, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { isSupremeCouncil } from "@/lib/staff-roles";
import { PremiumButton } from "@/components/ui-premium";
import SentinelLogsPanel, { StatBox } from "@/components/admin/SentinelLogsPanel";
import PrivateMessagesLogsPanel from "@/components/admin/PrivateMessagesLogsPanel";

const PANELS = {
  naria: {
    id: "naria",
    label: "Logs de Naria",
    supremeOnly: true,
    icon: Eye,
  },
  shumi: {
    id: "shumi",
    label: "Logs de Shumi",
    supremeOnly: true,
    icon: Sparkles,
  },
  pm: {
    id: "pm",
    label: "Logs messagerie privée",
    supremeOnly: false,
    icon: MessageCircle,
  },
};

export default function NariaModerationAdmin() {
  const { user: me } = useAuth();
  const supreme = isSupremeCouncil(me);

  const menuItems = useMemo(() => {
    const items = [];
    if (supreme) {
      items.push(PANELS.naria, PANELS.shumi);
    }
    items.push(PANELS.pm);
    return items;
  }, [supreme]);

  const defaultPanel = supreme ? "naria" : "pm";
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

  useEffect(() => {
    if (!menuItems.some((m) => m.id === panel)) {
      setPanel(menuItems[0]?.id || "pm");
    }
  }, [menuItems, panel]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl" data-testid="naria-moderation-admin">
      <aside className="lg:w-56 shrink-0">
        <div className="mb-4">
          <h2 className="font-display font-bold text-xl text-cyan-100">Modération</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Sentinelles automatisées et messagerie privée.
          </p>
        </div>
        <nav className="flex lg:flex-col flex-wrap gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = panel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPanel(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold border transition-all w-full ${
                  active
                    ? "border-violet-500/60 text-violet-100 bg-violet-500/15"
                    : "border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
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
            <span className="ml-2">Rafraîchir stats</span>
          </PremiumButton>
        )}
      </aside>

      <div className="flex-1 min-w-0 space-y-6">
        {supreme && dashboard && (
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
          </>
        )}

        {panel === "naria" && supreme && (
          <SentinelLogsPanel
            sentinel="naria"
            title="Logs de Naria"
            subtitle="Forum, profils, fil social, articles, guildes, messagerie privée (modération auto)."
            accent="#A855F7"
          />
        )}

        {panel === "shumi" && supreme && (
          <SentinelLogsPanel
            sentinel="shumi"
            title="Logs de Shumi"
            subtitle="Nexus Online — salons temps réel, trade, guildes."
            accent="#22D3EE"
          />
        )}

        {panel === "pm" && <PrivateMessagesLogsPanel />}
      </div>
    </div>
  );
}
