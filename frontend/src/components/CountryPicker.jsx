import React, { useRef, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import FlagIcon from "@/components/FlagIcon";
import { COUNTRIES } from "@/lib/countries";
import { sfx } from "@/lib/sfx";
import { syncDiscordPreferences } from "@/lib/discord-preferences-sync";

export default function CountryPicker({ user, refresh, variant = "pills" }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const pickingRef = useRef(false);
  const current = user?.country_code || null;
  const discordManaged = user?.discord_linked && user?.country_source === "discord";

  const pick = async (code) => {
    if (saving || pickingRef.current || code === current) return;
    pickingRef.current = true;
    setSaving(true);
    try {
      await api.put("/profile", { country_code: code });
      sfx.success();
      toast.success(t("settings.country.changed"));
      await syncDiscordPreferences();
      await refresh?.();
    } catch (err) {
      toast.error(formatApiError(err) || t("settings.error.generic"));
    } finally {
      setSaving(false);
      window.setTimeout(() => { pickingRef.current = false; }, 400);
    }
  };

  const clear = async () => {
    if (saving || !current) return;
    setSaving(true);
    try {
      await api.put("/profile", { country_code: "" });
      sfx.success();
      toast.success(t("settings.country.cleared"));
      await syncDiscordPreferences();
      await refresh?.();
    } catch (err) {
      toast.error(formatApiError(err) || t("settings.error.generic"));
    } finally {
      setSaving(false);
    }
  };

  if (variant !== "pills") return null;

  return (
    <div className="space-y-3" data-testid="country-picker">
      {discordManaged && (
        <p className="text-xs text-zinc-400 leading-relaxed">
          {t("settings.country.discordHint")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {COUNTRIES.map((c) => {
          const active = current === c.code;
          return (
            <button
              key={c.code}
              type="button"
              disabled={saving}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); pick(c.code); }}
              data-testid={`country-${c.code}`}
              title={t(`country.${c.code}`)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all disabled:opacity-50 ${
                active
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-100 shadow-[0_0_12px_rgba(245,166,35,0.15)]"
                  : "border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              {c.flagCode ? (
                <FlagIcon code={c.flagCode} />
              ) : (
                <span className="text-sm leading-none" aria-hidden>{c.flag}</span>
              )}
              <span>{t(`country.${c.code}`)}</span>
              {active && <Check className="w-3 h-3 shrink-0" />}
            </button>
          );
        })}
      </div>
      {current && !discordManaged && (
        <button
          type="button"
          disabled={saving}
          onClick={clear}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          data-testid="country-clear"
        >
          {t("settings.country.clear")}
        </button>
      )}
    </div>
  );
}
