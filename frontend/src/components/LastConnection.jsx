import React from "react";
import { useI18n } from "@/contexts/I18nContext";
import { formatLastConnection, formatLastSeenDateTime } from "@/lib/last-connection";

/**
 * Affiche la dernière connexion d'un héros.
 * - layout="inline" : « En ligne » ou « Dernière connexion · … »
 * - layout="stacked" : date/heure puis statut En ligne / Hors ligne en dessous
 */
export default function LastConnection({
  user,
  online,
  className = "",
  onlineClassName = "",
  offlineClassName = "",
  showOnline = true,
  layout = "inline",
  datetimeClassName = "",
  statusClassName = "",
}) {
  const { t, locale } = useI18n();
  const isOnline = online ?? user?.online;

  if (layout === "stacked") {
    const datetime = formatLastSeenDateTime(user?.last_seen, {
      locale: locale || "fr-FR",
      unknown: t("profile.last_connection_unknown"),
    });
    const statusOnline = showOnline && isOnline;
    const statusLabel = statusOnline ? t("common.online") : t("common.offline");
    const statusTone = statusOnline
      ? (onlineClassName || "text-emerald-400")
      : (offlineClassName || "text-zinc-500");

    return (
      <div className={className} data-testid="last-connection-stacked">
        <div
          className={datetimeClassName || "font-semibold leading-snug"}
          data-testid="last-connection-datetime"
          title={user?.last_seen || undefined}
        >
          {datetime}
        </div>
        <div
          className={[statusClassName, statusTone].filter(Boolean).join(" ") || statusTone}
          data-testid={statusOnline ? "last-connection-online" : "last-connection-offline"}
        >
          {statusLabel}
        </div>
      </div>
    );
  }

  if (showOnline && isOnline) {
    return (
      <span className={onlineClassName || className} data-testid="last-connection-online">
        {t("common.online")}
      </span>
    );
  }

  const text = formatLastConnection(user?.last_seen, {
    locale: locale || "fr-FR",
    unknown: t("profile.last_connection_unknown"),
    prefix: t("profile.last_connection"),
  });

  return (
    <span className={offlineClassName || className} data-testid="last-connection-offline" title={text}>
      {text}
    </span>
  );
}
