"use client";

import { useCallback, useEffect, useState } from "react";
import { ACTS, KIND_ACTS, PLEASED_TAIL, nextIdleDelay, randomIdleAct, type ActId, type MoodId } from "./mood";

/**
 * Drives the pet's current pose.
 *
 * Two things run here. A deliberate act (feeding, a poke) is set by the caller
 * and returns to rest when its time is up. In between, a timer fires
 * unprompted idle actions, which is the part that makes the pet feel like it
 * is doing something rather than waiting to be used.
 *
 * The idle timer is not an interval. Each act schedules the next one with a
 * fresh random delay, so the pet never settles into a period the eye can lock
 * onto — a pet that stretches on an exact eight-second beat stops reading as
 * alive within about a minute of watching it.
 *
 * Every act animation loops and both starts and ends at the resting pose.
 * That is what lets a repeat — a child tapping the pet over and over — extend
 * the current act instead of needing the animation restarted, which CSS
 * cannot do for an unchanged animation-name without a remount.
 */
export function usePetAct(mood: MoodId, enabled: boolean) {
  const [act, setAct] = useState<ActId>("idle");
  /** Bumped on every pose change, so the speech line rotates along with it. */
  const [seed, setSeed] = useState(0);
  /**
   * Outlives the act that set it. Being fed has to feel good even when the
   * other two meters are empty, so the delight is held past the chewing
   * instead of snapping straight back to a flat resting face.
   */
  const [pleased, setPleased] = useState(false);

  const play = useCallback((next: ActId) => {
    setAct(next);
    setSeed((n) => n + 1);
    if (KIND_ACTS.includes(next)) setPleased(true);
  }, []);

  useEffect(() => {
    if (!pleased) return;
    const id = window.setTimeout(() => setPleased(false), PLEASED_TAIL);
    return () => window.clearTimeout(id);
  }, [pleased, seed]);

  // Anything other than resting hands control back when its time is up.
  useEffect(() => {
    if (act === "idle") return;
    const id = window.setTimeout(() => setAct("idle"), ACTS[act]);
    return () => window.clearTimeout(id);
  }, [act]);

  // Unprompted idle actions. Re-arms on its own because returning to rest
  // changes `act`, which re-runs this effect with a new random delay.
  useEffect(() => {
    if (!enabled || act !== "idle") return;
    const id = window.setTimeout(() => {
      setAct(randomIdleAct(pleased ? "happy" : mood));
      setSeed((n) => n + 1);
    }, nextIdleDelay(mood));
    return () => window.clearTimeout(id);
  }, [act, mood, enabled, pleased]);

  return { act, seed, play, pleased };
}
