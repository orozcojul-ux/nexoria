import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMaintenance } from "@/contexts/MaintenanceContext";
import { useI18n } from "@/contexts/I18nContext";
import { PremiumModal } from "@/components/ui-premium";
import { needsBetaDiscordLink, startDiscordLinkOAuth } from "@/lib/discordLink";
import { formatApiError } from "@/lib/api";

function DiscordIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#5865F2" aria-hidden="true">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function BetaDiscordLinkModal({ user, maintenanceEnabled }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const open = needsBetaDiscordLink(user, { maintenanceEnabled });

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [open]);

  const handleLink = async () => {
    setLoading(true);
    try {
      await startDiscordLinkOAuth();
    } catch (err) {
      toast.error(formatApiError(err) || t("login.discord_error"));
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <PremiumModal
      open
      blocking
      title={t("discord.beta_link.title")}
      maxWidth="max-w-lg"
      testid="beta-discord-link-modal"
    >
      <div className="p-6 space-y-5">
        <p className="text-sm text-zinc-300 leading-relaxed">{t("discord.beta_link.lead")}</p>
        <ul className="text-xs text-zinc-400 space-y-2">
          <li className="flex gap-2">
            <Shield className="w-3.5 h-3.5 text-[#5865F2] shrink-0 mt-0.5" />
            {t("discord.beta_link.reason_roles")}
          </li>
          <li className="flex gap-2">
            <Shield className="w-3.5 h-3.5 text-[#5865F2] shrink-0 mt-0.5" />
            {t("discord.beta_link.reason_community")}
          </li>
          <li className="flex gap-2">
            <Shield className="w-3.5 h-3.5 text-[#5865F2] shrink-0 mt-0.5" />
            {t("discord.beta_link.reason_beta")}
          </li>
        </ul>
        <button
          type="button"
          onClick={handleLink}
          disabled={loading}
          data-testid="beta-discord-link-btn"
          className="w-full px-4 py-3 rounded-lg text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #5865F2 0%, #404EED 100%)" }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("discord.beta_link.linking")}
            </>
          ) : (
            <>
              <DiscordIcon />
              {t("discord.beta_link.cta")}
            </>
          )}
        </button>
        <p className="text-[11px] text-zinc-500 text-center italic">{t("discord.beta_link.required")}</p>
      </div>
    </PremiumModal>
  );
}

/** Popup obligatoire Discord — uniquement pendant la maintenance (phase bêta). */
export function BetaDiscordLinkHost() {
  const { user, loading } = useAuth();
  const maint = useMaintenance();
  const location = useLocation();

  if (loading || !user || maint.loading || !maint.enabled) return null;
  if (location.pathname.startsWith("/auth/discord/callback")) return null;

  return <BetaDiscordLinkModal user={user} maintenanceEnabled={maint.enabled} />;
}
