"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Bath, ChevronRight, Cookie, Gamepad2 } from "lucide-react";
import { POINTS } from "@/lib/grow/pet";
import { CARES, type CareId, type PetView, meterOf, themedPetArt } from "@/lib/grow/pets";
import type { CareState } from "@/lib/grow/pets";
import { CARE_ACT, MOODS, lineFor, moodFor, wantOf } from "@/lib/grow/mood";
import { mouthOf } from "@/lib/grow/mouths";
import { usePetAct } from "@/lib/grow/use-pet-act";

const ICONS: Record<CareId, typeof Cookie> = { food: Cookie, play: Gamepad2, bath: Bath };

/**
 * The home pet card.
 *
 * The pet is the reason the point system exists, so it behaves like a pet
 * rather than an illustration: it breathes, it does small things on its own,
 * its posture carries its mood, and everything the parent does to it gets an
 * answer within the same second. See `lib/grow/mood.ts` for where the line
 * between "alive" and "guilt-tripping" is drawn.
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
  const seenLevel = useRef<string | null>(null);

  const resting = moodFor(care);
  const want = wantOf(care);
  // Idle fidgeting stops during the level-up celebration so the two animations
  // never fight over the same element.
  const { act, seed, play, pleased } = usePetAct(resting.id, !party);
  const mood = pleased ? MOODS.happy : resting;
  const overcast = mood.id === "down" || mood.id === "sleepy";

  useEffect(() => {
    const key = `${view.pet.id}:${view.level.lv}`;
    if (seenLevel.current == null || seenLevel.current === key) {
      seenLevel.current = key;
      return;
    }
    seenLevel.current = key;
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

  const say = lineFor({
    act,
    mood: mood.id,
    want,
    seed,
    levelLine: view.line,
    levelUpTo: party ? view.level.lv : null,
  });

  return (
    <section className={`g-card pet-card ${party ? "is-party" : ""}`}>
      <div className="pet-card-top">
        <span className="pet-name">{view.name}</span>
        <span className="pet-lv" style={view.revealed ? { background: view.series.color } : undefined}>
          Lv{view.level.lv}
        </span>
        <span className="pet-mood" style={{ color: mood.color, background: `${mood.color}1f` }}>
          <i style={{ background: mood.color }} aria-hidden />
          {mood.name}
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
       *
       * A low mood drops the series colour too and lets the stylesheet's
       * overcast light through: the room going grey along with the pet is half
       * of why the mood reads at a glance, and an inline colour would win over
       * the rule that does it.
       */}
      <div
        className={`pet-window mood-${mood.id}`}
        style={view.revealed && !overcast ? { background: `linear-gradient(160deg, ${view.series.tint}, #ffffff 78%)` } : undefined}
      >
        <span
          className="pet-window-glow"
          style={view.revealed && !overcast ? { background: view.series.color } : undefined}
        />

        {/*
         * Tapping the pet is the first thing anyone tries, and a pet that does
         * not answer a poke is the fastest way to stop feeling like a pet.
         * Free, so a child can do it as much as they like.
         */}
        <button
          type="button"
          className={`pet-figure act-${act}`}
          onClick={() => play("poke")}
          aria-label={`戳一下${view.name}`}
        >
          <span className="pet-shadow" aria-hidden />
          <Image src={themedPetArt(view.art, sex)} alt={view.name} width={448} height={448} priority />
        </button>

        <Weather mood={mood.id} act={act} />
        <Bits act={act} mouth={mouthOf(themedPetArt(view.art, sex))} />

        {party && (
          <div className="pet-confetti" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
        )}
        <p className="pet-say" aria-live="polite">
          {say}
        </p>
      </div>

      <div className="pet-meters">
        {CARES.map((c) => {
          const value = meterOf(care, c.id);
          return (
            <div key={c.id} className={`pet-meter${want === c.id ? " is-want" : ""}`}>
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
              className={`g-chip-btn${want === c.id && !full && !poor ? " is-want" : ""}`}
              disabled={full || poor}
              onClick={() => {
                onCare(c.id);
                play(CARE_ACT[c.id]);
              }}
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
        <p className="pet-eva-note">
          饱腹、心情、干净只影响它的表情和动作，不影响进化——放几天没管，它只是想你了。
        </p>
      </div>
    </section>
  );
}

/**
 * The mood symbol above the pet's head.
 *
 * There is one render per creature and it is always smiling, so the mood has
 * to be told somewhere other than the face. Above the head is the one region
 * every creature's art leaves empty, and a grey rain cloud there reads as
 * miserable no matter what the face below it is doing.
 *
 * Hidden while an act is playing — the act is already saying something more
 * specific, and a rain cloud over a pet mid-hop is just noise.
 */
function Weather({ mood, act }: { mood: string; act: string }) {
  if (act !== "idle") return null;
  if (mood === "down") {
    return (
      <span className="pet-weather" aria-hidden>
        <span className="pet-cloud" />
        <span className="pet-rain">
          {[0, 1, 2].map((i) => (
            <i key={i} style={{ ["--i" as string]: i }} />
          ))}
        </span>
      </span>
    );
  }
  if (mood === "happy") {
    return (
      <span className="pet-weather pet-spark" aria-hidden>
        {[0, 1, 2].map((i) => (
          <i key={i} style={{ ["--i" as string]: i }} />
        ))}
      </span>
    );
  }
  return null;
}

/**
 * The particles that tell you which act is playing. A pose alone is ambiguous
 * at this size: a chewing wobble and a shiver look the same until crumbs or
 * bubbles say which one it is.
 */
function Bits({ act, mouth }: { act: string; mouth: [number, number] }) {
  /*
   * Eating is the one act with a subject as well as a reaction. The first
   * version only had crumbs falling out of the mouth, which read as the pet
   * dropping its food rather than eating it. So the food itself is here: `b`
   * is the biscuit, carried up to the mouth and taken away in two bites, and
   * the crumbs are only what flies off when it bites.
   *
   * The mouth is measured per image rather than assumed to be in the middle —
   * see `lib/grow/mouths.ts`. The figure is a square image of known height, so
   * the fractions convert straight into the window's own coordinates.
   */
  if (act === "eat") {
    const [mx, my] = mouth;
    return (
      <span
        className="pet-bits bits-eat"
        style={{ ["--mouth-x" as string]: mx, ["--mouth-y" as string]: my }}
        aria-hidden
      >
        <b />
        {[0, 1, 2, 3].map((i) => (
          <i key={i} />
        ))}
      </span>
    );
  }
  if (act === "play") {
    return (
      <span className="pet-bits bits-play" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i key={i} style={{ ["--i" as string]: i }} />
        ))}
      </span>
    );
  }
  if (act === "bath") {
    return (
      <span className="pet-bits bits-bath" aria-hidden>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <i key={i} style={{ ["--i" as string]: i }} />
        ))}
      </span>
    );
  }
  if (act === "yawn") {
    return (
      <span className="pet-bits bits-zzz" aria-hidden>
        {[0, 1, 2].map((i) => (
          <i key={i} style={{ ["--i" as string]: i }}>
            z
          </i>
        ))}
      </span>
    );
  }
  return null;
}
