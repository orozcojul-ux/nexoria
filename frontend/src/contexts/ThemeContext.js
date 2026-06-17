import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { getToken } from "@/lib/api";

export const THEMES = {
  dark: {
    id: "dark",
    label: "Nébuleuse",
    icon: "🌌",
    desc: "Violet cosmique — thème par défaut",
    class: "theme-dark",
    sonner: "dark",
  },
  midnight: {
    id: "midnight",
    label: "Minuit",
    icon: "🌙",
    desc: "Bleu profond, contrastes doux",
    class: "theme-midnight",
    sonner: "dark",
  },
  amethyst: {
    id: "amethyst",
    label: "Améthyste",
    icon: "💜",
    desc: "Pourpre royal et or",
    class: "theme-amethyst",
    sonner: "dark",
  },
};

const STORAGE_KEY = "nexoria_theme";
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES[saved] ? saved : "dark";
  });

  const theme = THEMES[themeId] || THEMES.dark;

  const applyTheme = useCallback((id) => {
    const t = THEMES[id] || THEMES.dark;
    const root = document.documentElement;
    Object.values(THEMES).forEach((th) => root.classList.remove(th.class));
    root.classList.add(t.class);
    root.dataset.theme = id;
    localStorage.setItem(STORAGE_KEY, id);
    setThemeId(id);
    root.classList.add("theme-flash");
    window.setTimeout(() => root.classList.remove("theme-flash"), 600);
    if (getToken()) {
      api.put("/profile", { theme: id }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    Object.values(THEMES).forEach((th) => root.classList.remove(th.class));
    root.classList.add(theme.class);
    root.dataset.theme = themeId;
  }, [theme.class, themeId]);

  const syncFromUser = useCallback((user) => {
    if (user?.theme && THEMES[user.theme]) {
      const root = document.documentElement;
      Object.values(THEMES).forEach((th) => root.classList.remove(th.class));
      root.classList.add(THEMES[user.theme].class);
      root.dataset.theme = user.theme;
      localStorage.setItem(STORAGE_KEY, user.theme);
      setThemeId(user.theme);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ themeId, theme, themes: THEMES, setTheme: applyTheme, syncFromUser }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
