"use client";

import { useCallback, useEffect, useState } from "react";

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

export function useNightMode() {
  const [night, setNight] = useState(false);

  useEffect(() => {
    const on = shouldStartNight();
    setNight(on);
    document.documentElement.classList.toggle("night", on);
  }, []);

  const toggleNight = useCallback(() => {
    setNight((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("night", next);
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { night, toggleNight };
}
