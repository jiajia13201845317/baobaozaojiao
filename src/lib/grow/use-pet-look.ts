"use client";

import { useEffect, type RefObject } from "react";
import type { CareId } from "./pets";

/**
 * Where the pet is looking.
 *
 * The card kept saying 它盯着你的手看 and 它回头看你 while the art faced
 * dead ahead no matter what, which is the sort of gap you only have to notice
 * once before none of the other lines are believable either. Following the
 * pointer is the oldest trick desktop pets have — Shimeji and every Live2D
 * mascot since do some version of it — and it is the cheapest way for a
 * picture to admit it knows you are there.
 *
 * With no pointer on the card, which is every phone, it rests on whichever
 * care button it wants. So a hungry pet is genuinely facing the 喂食 button
 * when the line says so, and a finger dragged across the card is genuinely
 * followed.
 *
 * Two CSS custom properties, both -1..1, written straight to the node on an
 * animation frame. Going through React state instead would re-render the whole
 * card on every mouse move to move it five pixels.
 */

/** How far off-centre the pointer has to be before the gaze stops following. */
const REACH = 0.9;

/** The eyes sit in the top third of the art, and it looks from there. */
const EYES = 0.3;

const clamp = (v: number) => Math.max(-1, Math.min(1, v / REACH));

export function usePetLook({
  card,
  figure,
  look,
  want,
}: {
  /** The catch area: anywhere on the pet's card, including the care buttons. */
  card: RefObject<HTMLElement | null>;
  /** Measured for the pet's own position. Must be an element the gaze does
   * not move, or its own output feeds back into the next reading. */
  figure: RefObject<HTMLElement | null>;
  /** The element the gaze transform is written to. */
  look: RefObject<HTMLElement | null>;
  want: CareId | null;
}) {
  useEffect(() => {
    const cardEl = card.current;
    const figureEl = figure.current;
    const lookEl = look.current;
    if (!cardEl || !figureEl || !lookEl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let aim: [number, number] = [0, 0];
    /* Re-measured only when something can actually have moved it, rather than
     * on every pointer event. */
    let box: DOMRect | null = null;

    function write() {
      frame = 0;
      lookEl!.style.setProperty("--look-x", aim[0].toFixed(3));
      lookEl!.style.setProperty("--look-y", aim[1].toFixed(3));
    }

    function towards(x: number, y: number) {
      box ??= figureEl!.getBoundingClientRect();
      aim = [clamp((x - (box.left + box.width / 2)) / (box.width / 2)), clamp((y - (box.top + box.height * EYES)) / (box.height / 2))];
      if (!frame) frame = requestAnimationFrame(write);
    }

    /** No pointer: face whatever it is asking for, or straight ahead. */
    function rest() {
      const chip = want ? cardEl!.querySelector<HTMLElement>(".g-chip-btn.is-want") : null;
      if (!chip) {
        aim = [0, 0];
        if (!frame) frame = requestAnimationFrame(write);
        return;
      }
      const at = chip.getBoundingClientRect();
      towards(at.left + at.width / 2, at.top + at.height / 2);
    }

    const onMove = (e: PointerEvent) => towards(e.clientX, e.clientY);
    /* A finger leaves no pointer behind, so a tap ends by going back to rest. */
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") rest();
    };
    const forget = () => {
      box = null;
      rest();
    };

    cardEl.addEventListener("pointermove", onMove);
    cardEl.addEventListener("pointerleave", rest);
    cardEl.addEventListener("pointercancel", rest);
    cardEl.addEventListener("pointerup", onUp);
    window.addEventListener("resize", forget);
    window.addEventListener("scroll", forget, { passive: true });
    rest();

    return () => {
      cardEl.removeEventListener("pointermove", onMove);
      cardEl.removeEventListener("pointerleave", rest);
      cardEl.removeEventListener("pointercancel", rest);
      cardEl.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", forget);
      window.removeEventListener("scroll", forget);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [card, figure, look, want]);
}
