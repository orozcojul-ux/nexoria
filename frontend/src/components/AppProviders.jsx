import React, { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";

/** Must render inside AuthProvider + ThemeProvider + I18nProvider */
export function UserPrefsSync({ children }) {
  const auth = useAuth();
  const user = auth?.user;
  const { syncFromUser: syncTheme } = useTheme();
  const { syncFromUser: syncLang } = useI18n();

  useEffect(() => {
    if (user) {
      syncTheme(user);
      syncLang(user);
    }
  }, [user, syncTheme, syncLang]);

  return children;
}
