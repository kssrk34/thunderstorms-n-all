"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_KEY as KEY } from "@/lib/theme-script";

export type ThemePref = "system" | "light" | "dark";

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Appearance is a per-device preference, so it lives in this browser only. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => {
    try { setPref((localStorage.getItem(KEY) as ThemePref) || "system"); } catch { /* storage blocked */ }
  }, []);
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);
  const set = useCallback((p: ThemePref) => {
    setPref(p);
    try { localStorage.setItem(KEY, p); } catch { /* storage blocked */ }
    apply(p);
  }, []);
  return { pref, set };
}

/** Keeps the page in sync when the system appearance changes. Mount once. */
export function ThemeWatcher() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => {
      let p: ThemePref = "system";
      try { p = (localStorage.getItem(KEY) as ThemePref) || "system"; } catch { /* storage blocked */ }
      if (p === "system") apply("system");
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return null;
}
