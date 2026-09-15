/**
 * 蛋仔的情绪与动作 — the behaviour layer that makes the home pet read as alive
 * rather than as a picture with progress bars under it.
 *
 * Borrowed from how desktop pets (Shimeji and the Tamagotchi lineage) hold
 * attention, which is three layers rather than one animation:
 *
 *   1. It is never still. A slow breath runs forever, so even an untouched
 *      card looks like something that is there.
 *   2. Every so often it does something small and unasked-for — a stretch, a
 *      hop, a lean. Randomised, so two people watching the same screen do not
 *      see the same loop, which is what makes it feel like a creature with its
 *      own idea rather than a GIF.
 *   3. Anything the parent does gets an immediate, specific answer. Feeding
 *      looks like eating and ends in a happy hop; a bath ends in a shake.
 *
 * Where this departs from a desktop pet, on purpose: a Tamagotchi can get
 * sick and die, and its whole design is the guilt of having let that happen.
 * This one lives in an app a parent opens while holding a baby, next to that
 * baby's growth records. So the bottom of the scale is 低落 — visibly missing
 * you, asking for nothing — and never ill, never in danger, never blaming.
 * The meters are also still entirely separate from levelling, so a pet left
 * alone for a week loses no progress. Only the face changes.
 */
import { CARES, type CareId, type CareState, meterOf } from "./pets";

export type MoodId = "happy" | "content" | "flat" | "down" | "sleepy";

export type Mood = {
  id: MoodId;
  /** For the mood chip, so the state is legible without reading the pose. */
  name: string;
  color: string;
};

export const MOODS: Record<MoodId, Mood> = {
  happy: { id: "happy", name: "开心", color: "#F2A93B" },
  content: { id: "content", name: "舒服", color: "#3FBF8F" },
  flat: { id: "flat", name: "一般", color: "#8B94AD" },
  down: { id: "down", name: "低落", color: "#7D87CF" },
  sleepy: { id: "sleepy", name: "困了", color: "#6C74B8" },
};

/** Night hours, matching the listening app's own idea of bedtime. */
function isNight(hour: number) {
  return hour >= 21 || hour < 7;
}

/**
 * How the pet feels, on the same 0-100 scale as the meters.
 *
 * Not the plain average, which hides the thing you most want to see: a pet
 * with an empty stomach and two full meters averages out to fine, and then
 * reads as fine, and "it says it is hungry while looking pleased" is the exact
 * contradiction that breaks the illusion.
 *
 * So three things can each hold the mood down, and the lowest wins:
 *
 *   the average, which is the general picture;
 *   an empty stomach, which outranks everything — a pet that has not been fed
 *     in a week is miserable however clean it is, the way a real one would be;
 *   the worst meter, loosely, so any single neglected thing still registers
 *     without being as decisive as hunger.
 */
export function scoreOf(care: CareState, now = Date.now()) {
  const values = CARES.map((c) => meterOf(care, c.id, now));
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const food = meterOf(care, "food", now);
  return Math.round(Math.min(avg, food + 8, Math.min(...values) + 22));
}

/**
 * The resting mood. `pleased` is the short window right after being cared
 * for, and it wins over everything: whatever the other meters say, a pet that
 * was just fed is happy about it this second, and the payoff for caring has to
 * land every time or there is no reason to press the button again.
 */
export function moodFor(care: CareState, now = Date.now(), pleased = false): Mood {
  if (pleased) return MOODS.happy;
  const score = scoreOf(care, now);
  const night = isNight(new Date(now).getHours());
  if (score >= 85) return MOODS.happy;
  if (night) return MOODS.sleepy;
  if (score >= 58) return MOODS.content;
  if (score >= 46) return MOODS.flat;
  return MOODS.down;
}

/** The thinnest meter, so the pet can hint at what it would like. */
export function wantOf(care: CareState, now = Date.now()): CareId | null {
  let worst: CareId | null = null;
  let low = 101;
  for (const c of CARES) {
    const value = meterOf(care, c.id, now);
    if (value < low) {
      low = value;
      worst = c.id;
    }
  }
  return low < 60 ? worst : null;
}

/**
 * One transient pose. `idle` is the resting state; everything else plays once
 * and hands control back.
 */
export type ActId =
  | "idle"
  | "stretch"
  | "hop"
  | "wiggle"
  | "peek"
  | "spin"
  | "yawn"
  | "eat"
  | "play"
  | "bath"
  | "poke"
  | "cheer";

export type Act = { id: ActId; ms: number };

/** Kept in one place so the CSS and the timer can never disagree. */
export const ACTS: Record<ActId, number> = {
  idle: 0,
  stretch: 1400,
  hop: 900,
  wiggle: 1100,
  peek: 1600,
  spin: 1000,
  yawn: 2000,
  /* Long enough for the whole sequence: the food is brought up, bitten twice
   * with chewing in between, and swallowed. */
  eat: 3000,
  play: 2000,
  bath: 2400,
  poke: 700,
  cheer: 2800,
};

export function actFor(id: ActId): Act {
  return { id, ms: ACTS[id] };
}

/** What a care action looks like. */
export const CARE_ACT: Record<CareId, ActId> = { food: "eat", play: "play", bath: "bath" };

/** The acts that mean the parent just did something nice. */
export const KIND_ACTS: ActId[] = ["eat", "play", "bath"];

/**
 * How long the pet stays visibly delighted after the act itself finishes.
 *
 * Long, and deliberately so. One feed cannot lift a pet that has been left a
 * week: two meters are still on the floor, so the resting mood is honestly
 * still low. At the first value — around three seconds — the rain cloud came
 * back while the parent was still looking at the card, which reads as the
 * feeding having accomplished nothing. Holding it this long means the reward
 * outlasts the glance, and any further care resets the timer.
 */
export const PLEASED_TAIL = 18000;

/**
 * The unprompted idle actions, weighted by mood. A down pet does not hop, and
 * a sleepy one mostly yawns — the mix is what communicates the state, more
 * than any single frame does.
 */
const IDLE_ACTS: Record<MoodId, ActId[]> = {
  happy: ["hop", "spin", "wiggle", "hop", "stretch", "peek"],
  content: ["wiggle", "stretch", "peek", "hop"],
  flat: ["peek", "stretch", "wiggle"],
  down: ["peek", "stretch"],
  sleepy: ["yawn", "yawn", "stretch", "peek"],
};

export function randomIdleAct(mood: MoodId): ActId {
  const pool = IDLE_ACTS[mood];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/**
 * How long until the next unprompted action. Randomised within a window so it
 * never falls into a rhythm the eye can predict, and slower when the pet is
 * flat or asleep, because a listless pet that fidgets constantly reads as
 * broken rather than as listless.
 */
export function nextIdleDelay(mood: MoodId) {
  const [min, max] = mood === "happy" ? [4000, 8000] : mood === "sleepy" || mood === "down" ? [9000, 16000] : [6500, 12000];
  return min + Math.random() * (max - min);
}

/** What it says while resting. Several per mood, rotated so it is not a slogan. */
const IDLE_LINES: Record<MoodId, string[]> = {
  happy: ["今天什么都顺！", "它绕着你转了两圈。", "心情好得想跳一下。", "它蹭了蹭你的手指。"],
  content: ["它靠过来待着。", "这样就挺好。", "它安安静静陪着你。", "它打了个小哈欠，又醒了。"],
  flat: ["它在发呆。", "它歪着头看你。", "它戳了戳地面。", "有点无聊的样子。"],
  down: ["它蹲下来了，有点没精神。", "它一直看着门口。", "它今天话很少。", "它好像在等你。"],
  sleepy: ["它眼睛快睁不开了。", "天黑了，它有点困。", "它缩成了一团。", "它打了个大哈欠。"],
};

/** What it says when a meter is thin. Asking, never scolding. */
const WANT_LINES: Record<CareId, string[]> = {
  food: ["肚子有点空空的。", "它盯着你的手看。", "它舔了舔嘴巴。"],
  play: ["它想跟你玩一会儿。", "它把球推到你面前。", "它在原地转圈，想找点事做。"],
  bath: ["身上有点痒痒的。", "它抖了抖，想洗洗。", "它蹭了蹭墙角。"],
};

/** The immediate answer to being cared for. */
const CARE_LINES: Record<CareId, string[]> = {
  food: ["吃饱啦，谢谢你！", "嚼得停不下来。", "它吃完抬头看你，还想要。"],
  play: ["玩得好开心！", "它跳起来撞了你一下。", "再来一次！再来一次！"],
  bath: ["洗得香香的。", "它甩了一身水珠。", "干净了，它自己都精神了。"],
};

/** The answer to being poked, which is what a child will do most. */
const POKE_LINES = [
  "诶？",
  "它被戳得晃了一下。",
  "它回头看你。",
  "它以为你要给它吃的。",
  "它笑了一下。",
];

const POKE_LINES_SLEEPY = ["别吵…它在睡。", "它眼睛睁了一半又闭上。", "它含含糊糊哼了一声。"];

const POKE_LINES_DOWN = ["它抬头看了你一眼。", "它往你这边挪了挪。", "它轻轻靠了过来。"];

function pick(list: string[], seed: number) {
  return list[seed % list.length]!;
}

/**
 * The line under the pet. `seed` is a counter the card bumps on every change,
 * so the rotation is deterministic for a given render instead of re-rolling on
 * every repaint.
 */
export function lineFor({
  act,
  mood,
  want,
  seed,
  levelLine,
  levelUpTo,
}: {
  act: ActId;
  mood: MoodId;
  want: CareId | null;
  seed: number;
  /** The level's own flavour text, worth showing while nothing else is going on. */
  levelLine: string;
  levelUpTo: number | null;
}) {
  if (levelUpTo != null) return `升到 Lv${levelUpTo} 啦！`;
  if (act === "eat" || act === "play" || act === "bath") {
    const id: CareId = act === "eat" ? "food" : act === "play" ? "play" : "bath";
    return pick(CARE_LINES[id], seed);
  }
  if (act === "poke") {
    if (mood === "sleepy") return pick(POKE_LINES_SLEEPY, seed);
    if (mood === "down") return pick(POKE_LINES_DOWN, seed);
    return pick(POKE_LINES, seed);
  }
  if (act === "yawn") return "它打了个大哈欠。";
  // A thin meter is the most useful thing to say, but not to the exclusion of
  // everything else — every third line stays flavour so it is not a nag.
  if (want && seed % 3 !== 2) return pick(WANT_LINES[want], seed);
  if (seed % 4 === 3) return levelLine;
  return pick(IDLE_LINES[mood], seed);
}
