import React from "react";
import { useI18n } from "@/contexts/I18nContext";

/** Pass Ascendant (VIP) : Oui / Non — style aligné sur LastConnection. */
export default function VipPassStatus({
  user,
  isVip,
  className = "",
  labelClassName = "",
  yesClassName = "",
  noClassName = "",
  stacked = false,
  valueOnly = false,
}) {
  const { t } = useI18n();
  const active = Boolean(isVip ?? user?.is_vip);
  const valueText = active ? t("common.yes") : t("common.no");
  const valueClass = active
    ? (yesClassName || "text-amber-300 font-semibold")
    : (noClassName || "text-red-400 font-semibold");

  if (valueOnly) {
    return (
      <span className={valueClass} data-testid={active ? "vip-pass-yes" : "vip-pass-no"}>
        {valueText}
      </span>
    );
  }

  if (stacked) {
    return (
      <span className={`inline-flex flex-col gap-0.5 leading-tight ${className}`} data-testid="vip-pass-status">
        <span className={labelClassName || "text-inherit"}>{t("profile.vip_pass")} :</span>
        <span className={valueClass} data-testid={active ? "vip-pass-yes" : "vip-pass-no"}>
          {valueText}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-1 leading-tight ${className}`} data-testid="vip-pass-status">
      <span className={labelClassName || "text-inherit"}>{t("profile.vip_pass")} :</span>
      <span className={valueClass} data-testid={active ? "vip-pass-yes" : "vip-pass-no"}>
        {valueText}
      </span>
    </span>
  );
}
