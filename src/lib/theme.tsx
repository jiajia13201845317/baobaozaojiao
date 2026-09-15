"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "bao-night";

function shouldStartNight() {
  try {
    const forced = new URLSearchParams(window.location.search).get("night");
    if (forced === "1") return true;
    if (forced === "0") return false;
    const saved = localStorage.getItem(KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
  } catch {
    /* ignore */
  }
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7;
}

/**
 * Night mode is read from the URL, then storage, then the clock — none of
 * which exist when the static export is rendered at build time. An external
 * store keeps that read out of render and out of an effect, so the first paint
 * is the server value and the real one arrives with hydration.
 */
let cache: boolean | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  cache ??= shouldStartNight();
  return cache;
}

function serverSnapshot() {
  return false;
}

function set(next: boolean) {
  cache = next;
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  for (const listener of listeners) listener();
}

export function useNightMode() {
  const night = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle("night", night);
  }, [night]);

  const toggleNight = useCallback(() => set(!snapshot()), []);

  return { night, toggleNight };
}
