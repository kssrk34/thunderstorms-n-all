import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pad = (n: number) => String(n).padStart(2, "0");

export function dstr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const today = () => dstr(new Date());

export function parseD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(s: string, n: number): string {
  const d = parseD(s);
  d.setDate(d.getDate() + n);
  return dstr(d);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseD(b).getTime() - parseD(a).getTime()) / 86400000);
}
export function weekStart(s: string): string {
  const d = parseD(s);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(s, -dow);
}
export function monthStart(s: string): string {
  return s.slice(0, 8) + "01";
}
export function fmtShort(s: string): string {
  return parseD(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
export function fmtDay(s: string): string {
  return parseD(s).toLocaleDateString("en-IN", { weekday: "short" });
}
/** "1 day", "3 days" */
export const plural = (n: number, word: string, many = word + "s") => `${n} ${n === 1 ? word : many}`;
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const uid = () => Math.random().toString(36).slice(2, 10);

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
