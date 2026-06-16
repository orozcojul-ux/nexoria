import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe2, ArrowRight, Wifi, Loader2, Lock } from "lucide-react";
import api from "@/lib/api";
import { PageShell, PremiumCard, PremiumStat, PremiumButton } from "@/components/ui-premium";
import StaffOnlinePanel from "@/components/StaffOnlinePanel";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { usePageBanner } from "@/lib/page-banners";
import { resolveOnlineClosedText } from "@/lib/online-gate-content";
import { EMPTY_STAFF_ONLINE } from "@/lib/staff-roles";

/**
 * Route /nexus — ouvre automatiquement l'overlay du monde isométrique.
 */
export default function Nexus() {
  const banner = usePageBanner("nexus");
  const ns = useNexusSocket();
  const { openNexus, status, presence = {}, nexusGate = {} } = ns || {};
  const closed = status === "nexus_closed";
  const closedText = closed ? resolveOnlineClosedText(nexusGate.html) : null;
  const [polledStaff, setPolledStaff] = useState(EMPTY_STAFF_ONLINE);

  useEffect(() => {
    openNexus?.();
  }, [openNexus]);

  useEffect(() => {
    const load = () => {
      api.get("/stats/public")
        .then((r) => setPolledStaff(r.data?.staff_online || EMPTY_STAFF_ONLINE))
        .catch(() => setPolledStaff(EMPTY_STAFF_ONLINE));
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const staffOnline = presence?.staff_online ?? polledStaff;
  const enterNexus = () => openNexus?.();

  return (
    <PageShell
      testid="nexus-page"
      banner={banner}
    >
      {closed ? (
        <PremiumCard tone="amber" className="max-w-xl mx-auto text-center space-y-3" testid="nexus-closed-card">
          <Lock className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="text-xs uppercase tracking-widest text-amber-300/80">{closedText?.badge}</p>
          <h2 className="font-display text-xl text-zinc-100">{closedText?.title_line1}</h2>
          <p className="text-sm text-zinc-400">{closedText?.body}</p>
          {closedText?.body_sub && <p className="text-xs text-zinc-500">{closedText.body_sub}</p>}
          <p className="text-xs text-cyan-400/80 pt-2">Le reste du site reste accessible — feed, forum, boutique, etc.</p>
        </PremiumCard>
      ) : (
        <div className="text-center">
          <motion.div whileHover={{ scale: 1.02 }} className="inline-block mt-2">
            <PremiumButton variant="cyan" size="lg" icon={status === "connecting" ? Loader2 : Globe2} onClick={enterNexus} testid="nexus-enter-button">
              {status === "connecting" ? "Connexion au Nexus…" : "Entrer dans le Nexus"} <ArrowRight className="w-5 h-5" />
            </PremiumButton>
          </motion.div>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-400 justify-center">
            <Wifi className={`w-3 h-3 ${status === "online" ? "text-green-400" : "text-zinc-500"}`} />
            {status === "online" ? "Connecté au royaume" : status === "connecting" ? "Connexion..." : status === "error" ? "Serveur inaccessible — vérifiez que le backend tourne sur :8000" : "Hors ligne"}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <StaffOnlinePanel staffOnline={staffOnline} closed={closed} compact testid="nexus-staff-online" />
        <PremiumStat icon={Globe2} label="Salles actives" value={closed ? "—" : (presence.active_rooms || 0)} tone="violet" />
        <PremiumStat icon={Globe2} label="Statut" value={closed ? "Fermé" : status === "online" ? "Live" : "—"} tone="emerald" />
      </div>

      <PremiumCard tone="violet" className="max-w-xl mx-auto text-center text-sm text-zinc-400">
        Le monde isométrique s&apos;ouvre en plein écran lors des événements. Le serveur Nexus n&apos;est pas ouvert en permanence.
      </PremiumCard>
    </PageShell>
  );
}
