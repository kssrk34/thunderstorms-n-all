"use client";

import { useEffect, useState } from "react";

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

/**
 * App-wide browser plumbing: registers the service worker (for installing
 * the app, offline fallback and push) and keeps the browser's install prompt
 * for the Install button. Renders nothing.
 */
export function AppRuntime() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* not fatal: the app works without it */ });
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      listeners.forEach((l) => l());
    };
    const onInstalled = () => { deferred = null; listeners.forEach((l) => l()); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  return null;
}

export function useInstallPrompt() {
  const [, rerender] = useState(0);
  const [env, setEnv] = useState({ installed: false, ios: false });
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setEnv({ installed: standalone, ios: /iphone|ipad|ipod/i.test(navigator.userAgent) });
    return () => { listeners.delete(l); };
  }, []);
  return {
    canPrompt: !!deferred,
    installed: env.installed,
    ios: env.ios,
    prompt: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      rerender((n) => n + 1);
    },
  };
}
