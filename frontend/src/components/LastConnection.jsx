import React from "react";
import { useI18n } from "@/contexts/I18nContext";
import { formatLastConnection } from "@/lib/last-connection";

/**
 * Affiche la date/heure de dernière connexion, le statut site (En ligne / Hors ligne),
 * puis le statut Nexus en dessous.
 */
export default function LastConnection({
  user,
  online,
  nexusOnline,
  includePrefix = true,
  showNexusStatus = true,
  className = "",
  dateTimeClassName = "",
  onlineClassName = "",
  offlineClassName = "",
  nexusOnlineClassName = "",
  nexusOfflineClassName = "",
}) {
  const { t, locale } = useI18n();
  const isSiteOnline = Boolean(online ?? user?.online);
  const isNexusOnline = Boolean(nexusOnline ?? user?.nexus_online);

  const dateTimeText = formatLastConnection(user?.last_seen, {
    locale: locale || "fr-FR",
    unknown: includePrefix ? t("profile.last_connection_unknown") : "—",
    prefix: includePrefix ? t("profile.last_connection") : "",
  });

  const siteStatusText = isSiteOnline ? t("common.online") : t("common.offline");
  const siteStatusClass = isSiteOnline
    ? (onlineClassName || "text-emerald-400 font-semibold")
    : (offlineClassName || "text-zinc-500 font-medium");

  const nexusStatusText = isNexusOnline ? t("presence.nexus_online") : t("presence.nexus_offline");
  const nexusStatusClass = isNexusOnline
    ? (nexusOnlineClassName || onlineClassName || "text-cyan-400/90 font-medium")
    : (nexusOfflineClassName || offlineClassName || "text-zinc-500 font-medium");

  return (
    <span className={`inline-flex flex-col gap-0.5 leading-tight ${className}`} data-testid="last-connection">
      <span
        className={dateTimeClassName || "text-inherit"}
        data-testid="last-connection-datetime"
      >
        {dateTimeText}
      </span>
      <span
        className={siteStatusClass}
        data-testid={isSiteOnline ? "last-connection-online" : "last-connection-offline"}
      >
        {siteStatusText}
      </span>
      {showNexusStatus && (
        <span
          className={nexusStatusClass}
          data-testid={isNexusOnline ? "last-connection-nexus-online" : "last-connection-nexus-offline"}
        >
          {nexusStatusText}
        </span>
      )}
    </span>
  );
}
