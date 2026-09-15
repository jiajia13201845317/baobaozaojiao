"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Bath, ChevronRight, Cookie, Gamepad2 } from "lucide-react";
import { POINTS } from "@/lib/grow/pet";
import { CARES, type CareId, type PetView, meterOf, themedPetArt } from "@/lib/grow/pets";
import type { CareState } from "@/lib/grow/pets";

const ICONS: Record<CareId, typeof Cookie> = { food: Cookie, play: Gamepad2, bath: Bath };

/**
 * The home pet card. Levelling up is the payoff the whole point system exists
 * to deliver, so it gets a held celebration rather than a silent image swap.
 */
export function PetCard({
  view,
  sex,
  care,
  spendable,
  collected,
  total,
  onCare,
  onOpenPets,
}: {
  view: PetView;
  sex: "boy" | "girl";
  care: CareState;
  spendable: number;
  collected: number;
  total: number;
  onCare: (id: CareId) => void;
  onOpenPets: () => void;
}) {
  const [party, setParty] = useState(false);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    const key = `${view.pet.id}:${view.level.lv}`;
    if (seen.current == null || seen.current === key) {
      seen.current = key;
      return;
    }
    seen.current = key;
    setParty(true);
    const id = window.setTimeout(() => setParty(false), 2800);
    return () => window.clearTimeout(id);
  }, [view.pet.id, view.level.lv]);

  const cheapest = Math.min(...CARES.map((c) => c.cost));
  const blocked = CARES.every((c) => meterOf(care, c.id) >= 100)
    ? "三样都满着，它现在很舒服，明天再来。"
    : spendable < cheapest
      ? `可用积分不够了。去「早教」做一个小任务就有 ${POINTS.task} 分，累计积分不会因为照顾它而减少。`
      : null;

  return (
    <section className={`g-card pet-card ${party ? "is-party" : ""}`}>
      <div className="pet-card-top">
        <span className="pet-name">{view.name}</span>
        <span className="pet-lv" style={view.revealed ? { background: view.series.color } : undefined}>
          Lv{view.level.lv}
        </span>
        <button type="button" className="pet-book" onClick={onOpenPets}>
          图鉴 {collected}/{total}
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      {/*
       * Before the reveal the window has no series colour to show — painting it
       * would give away which creature is inside — so it borrows the baby's own
       * theme and the 蛋仔 sits in matching light.
       */}
      <div
        className="pet-window"
        style={view.revealed ? { background: `linear-gradient(160deg, ${view.series.tint}, #ffffff 78%)` } : undefined}
      >
        <span className="pet-window-glow" style={view.revealed ? { background: view.series.color } : undefined} />
        <div className="pet-figure">
          <Image src={themedPetArt(view.art, sex)} alt={view.name} width={448} height={448} priority />
        </div>
        {party && (
          <div className="pet-confetti" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
        )}
        <p className="pet-say" aria-live="polite">
          {party ? `升到 Lv${view.level.lv} 啦！` : view.line}
        </p>
      </div>

      <div className="pet-meters">
        {CARES.map((c) => {
          const value = meterOf(care, c.id);
          return (
            <div key={c.id} className="pet-meter">
              <span className="pet-meter-top">
                <span>{c.meter}</span>
                <b>{value}</b>
              </span>
              <span className="pet-bar">
                <i style={{ width: `${value}%`, background: c.color }} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="pet-actions">
        {CARES.map((c) => {
          const Icon = ICONS[c.id];
          const full = meterOf(care, c.id) >= 100;
          const poor = spendable < c.cost;
          return (
            <button
              key={c.id}
              type="button"
              className="g-chip-btn"
              disabled={full || poor}
              onClick={() => onCare(c.id)}
              title={full ? "已经满了" : poor ? "可用积分不够" : undefined}
            >
              <Icon className="size-4" style={{ color: c.color }} />
              {c.name}
              <em>{c.cost}</em>
            </button>
          );
        })}
      </div>

      {/* A greyed-out button that says nothing reads as a broken button. */}
      {blocked && <p className="pet-blocked">{blocked}</p>}

      <div className="pet-eva">
        <div className="pet-eva-top">
          <span>进化进度</span>
          <b>{view.next ? `距 Lv${view.next.lv} 还需 ${view.need} 累计积分` : "已经是最终形态"}</b>
        </div>
        <span className="pet-eva-bar">
          <i style={{ width: `${Math.round(view.ratio * 100)}%` }} />
        </span>
        {!view.revealed && <p className="pet-eva-hint">壳里是谁，破壳那天才知道。</p>}
      </div>
    </section>
  );
}
