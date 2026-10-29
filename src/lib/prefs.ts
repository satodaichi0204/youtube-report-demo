"use client";
// 期間、日次と週次の切り替えを、ブラウザの localStorage に保存する（ページを移っても同じ表示にするため）
import { useCallback, useSyncExternalStore } from "react";
import type { Period } from "./fakeData";

export type Grain = "day" | "week";
export type Prefs = { period: Period; grain: Grain };
const KEY = "youtube_report_demo_prefs_v1";
export const DEFAULT_PREFS: Prefs = { period: "28", grain: "day" };
let cache: Prefs | null = null;
const listeners = new Set<() => void>();

const PERIOD_IDS = ["7", "28", "90", "all"];
export function parsePrefs(raw: string | null): Prefs {
  try {
    const x = JSON.parse(raw ?? "{}");
    return { period: PERIOD_IDS.includes(x.period) ? x.period : DEFAULT_PREFS.period, grain: x.grain === "week" ? "week" : "day" };
  } catch {
    return DEFAULT_PREFS;
  }
}
function read(): Prefs {
  if (cache) return cache;
  try {
    cache = parsePrefs(localStorage.getItem(KEY));
  } catch {
    cache = DEFAULT_PREFS;
  }
  return cache;
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function usePrefs(): [Prefs, (p: Partial<Prefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
  const set = useCallback((p: Partial<Prefs>) => {
    cache = { ...read(), ...p };
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      // 保存できない環境でも、このタブの中では動く
    }
    listeners.forEach((l) => l());
  }, []);
  return [prefs, set];
}
