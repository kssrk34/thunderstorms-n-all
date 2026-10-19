"use client";

import { useEffect, useState } from "react";

/**
 * Per-device preferences: sound and decorative effects. They describe this
 * browser, not the account, so they live in localStorage (and fall back to
 * defaults when storage is blocked).
 */
export interface DevicePrefs { sound: boolean; effects: boolean }
const KEY = "tna-device";
const DEFAULTS: DevicePrefs = { sound: true, effects: true };
const listeners = new Set<(p: DevicePrefs) => void>();
let current: DevicePrefs | null = null;

export function devicePrefs(): DevicePrefs {
  if (current) return current;
  try {
    current = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    current = { ...DEFAULTS };
  }
  return current!;
}

export function setDevicePrefs(patch: Partial<DevicePrefs>) {
  current = { ...devicePrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* storage blocked */ }
  document.documentElement.classList.toggle("fx-off", !current.effects);
  listeners.forEach((l) => l(current!));
}

export function useDevicePrefs(): [DevicePrefs, (p: Partial<DevicePrefs>) => void] {
  const [p, setP] = useState<DevicePrefs>(DEFAULTS);
  useEffect(() => {
    setP(devicePrefs());
    listeners.add(setP);
    return () => { listeners.delete(setP); };
  }, []);
  return [p, setDevicePrefs];
}

/** True when decorative motion should play: effects on, and the OS doesn't ask for reduced motion. */
export function motionAllowed(): boolean {
  if (typeof window === "undefined") return false;
  return devicePrefs().effects && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
