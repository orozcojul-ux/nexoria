import { toast } from "sonner";
import { updateUserPreferences, preferencesSyncToastKey, shouldToastDiscordWarning } from "@/lib/user-preferences";

export async function saveLanguagePreference(lang, { t, refresh } = {}) {
  const data = await updateUserPreferences({ language: lang });
  const status = data?.discordSyncStatus;
  const key = preferencesSyncToastKey(status);
  if (shouldToastDiscordWarning(status)) {
    toast.warning(t(key));
  } else {
    toast.success(t(key));
  }
  await refresh?.();
  return data;
}

export async function saveCountryPreference(country, { t, refresh } = {}) {
  const data = await updateUserPreferences({ country });
  const status = data?.discordSyncStatus;
  const key = preferencesSyncToastKey(status);
  if (shouldToastDiscordWarning(status)) {
    toast.warning(t(key));
  } else {
    toast.success(t(key));
  }
  await refresh?.();
  return data;
}
