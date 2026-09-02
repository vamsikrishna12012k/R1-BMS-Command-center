import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const KEY = "bms-theme";

/** Inline script: applies the stored theme before paint to avoid a flash. */
export const themeBootScript = `(function(){try{var t=localStorage.getItem('${KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`;

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as ThemeMode | null;
    const initial: ThemeMode =
      stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    localStorage.setItem(KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      localStorage.setItem(KEY, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  return { theme, setTheme, toggle };
}
