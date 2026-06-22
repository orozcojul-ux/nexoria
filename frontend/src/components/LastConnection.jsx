import React from "react";
import { useI18n } from "@/contexts/I18nContext";
import { formatLastConnection } from "@/lib/last-connection";

/**
 * Affiche « En ligne » ou « Dernière connexion · … » sur les profils.
 */
export default function LastConnection({
  user,
  online,
  className = "",
  onlineClassName = "",
  offlineClassName = "",
  showOnline = true,
}) {
  const { t, locale } = useI18n();
  const isOnline = online ?? user?.online;

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
