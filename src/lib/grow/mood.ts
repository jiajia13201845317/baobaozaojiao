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
import { CARES, type CareId, type CareState, meterOf, themedPetArt } from "./pets";

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

/**
 * The render each mood wears.
 *
 * 开心 and 舒服 share the original grin — that is the face the creature was
 * drawn with, and it is the right one for both. The other three have their own
 * render of the same creature, generated from that one so that changing mood
 * changes the expression without changing who it is.
 *
 * This is the part that used to be missing. The card said 饱腹、心情、干净
 * 只影响它的表情和动作 while there was exactly one render per creature, so
 * whatever the chip claimed, the face was always beaming. Posture and weather
 * were carrying the whole mood, and the face — the first place anyone looks —
 * was contradicting them.
 */
const MOOD_FACE: Record<MoodId, string> = {
  happy: "",
  content: "",
  flat: "-flat",
  down: "-sad",
  sleepy: "-sleepy",
};

/** Every face a creature can pull, so the card can stack and cross-fade them. */
export const FACES: { mood: MoodId; key: string }[] = [
  { mood: "happy", key: "happy" },
  { mood: "flat", key: "flat" },
  { mood: "down", key: "down" },
  { mood: "sleepy", key: "sleepy" },
];

export function moodPetArt(art: string, sex: "boy" | "girl", mood: MoodId) {
  const face = MOOD_FACE[mood];
  return themedPetArt(face ? art.replace(/\.webp$/, `${face}.webp`) : art, sex);
}

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

/*
 * One rule for everything below: a line may only describe something that is
 * actually on the screen while it is showing.
 *
 * It used to promise things the card could not do — it stared at you, it
 * circled you twice, it nuzzled your finger, it pushed a ball over — none of
 * which existed as a pose, a prop or a gaze. Read next to a pet that was in
 * fact breathing in place, the words were not flavour, they were wrong, and
 * they made the whole thing feel like a slideshow with captions. So each line
 * now points at a real pose from `grow.css`, a real particle from
 * `public/art/prop/`, the mood's own render, or the gaze in `use-pet-look.ts`.
 * If you add a line, name what it is describing first.
 */

/** What it says while resting: breathing, the mood's posture, its face. */
const IDLE_LINES: Record<MoodId, string[]> = {
  /* bounce-idle keeps it off the ground; the sparkles sit over its head. */
  happy: ["它一直在原地弹。", "它朝你这边转过来了。", "头顶上一闪一闪的。", "心情好得停不下来。"],
  /* breathe, and the grin it was drawn with. */
  content: ["它安安静静地呼吸。", "这样就挺好。", "它的眼睛跟着你在动。", "它笑着，一下一下地起伏。"],
  /* The flat render: eyes open, mouth a straight little line. */
  flat: ["它在发呆。", "它没什么表情地看着你。", "它慢慢地呼吸。", "有点无聊的样子。"],
  /* droop sinks and tilts it; the sad render drops its eyes; a rain cloud. */
  down: ["它蹲下来了，没什么精神。", "它耷着脑袋。", "头顶上飘着一小片雨云。", "它抬起眼看了看你。"],
  /* doze, and the sleepy render has its eyes closed and its head tipped over. */
  sleepy: ["它眼睛闭上了。", "它歪着头，一点一点地打瞌睡。", "天黑了，它撑不住了。", "它睡得很安稳。"],
};

/**
 * What it says when a meter is thin. Asking, never scolding.
 *
 * With no pointer on the card the gaze rests on whichever care button it
 * wants, so "往喂食那边看" is describing where it is actually facing.
 */
const WANT_LINES: Record<CareId, string[]> = {
  food: ["肚子有点空空的。", "它一直往喂食那边看。", "你的手一动，它就跟着看。"],
  play: ["它想跟你玩一会儿。", "它朝陪玩那边转过去了。", "它在原地扭来扭去。"],
  bath: ["身上有点痒痒的。", "它朝洗澡那边看。", "它看看自己，又看看你。"],
};

/** The immediate answer to being cared for, matching each act's own sequence. */
const CARE_LINES: Record<CareId, string[]> = {
  /* The eat sequence is exactly two bites and a swallow. */
  food: ["吃饱啦，谢谢你！", "它咬了两口，全吃完了。", "它咽下去，抬头看你。"],
  /* romp throws it side to side, and hearts come up. */
  play: ["玩得好开心！", "它左右蹦了好几下。", "它头顶上冒出好多爱心。"],
  /* shake, with bubbles. */
  bath: ["洗得香香的。", "它抖了一身的泡泡。", "干净了，它自己都精神了。"],
};

/**
 * The unprompted acts get their own lines, so the caption is describing the
 * pose that is playing rather than whatever the resting mood would have said.
 * A pet mid-spin captioned 它在发呆 is the same mismatch in miniature.
 */
const ACT_LINES: Partial<Record<ActId, string[]>> = {
  stretch: ["它伸了个懒腰。", "它把自己抻得长长的。"],
  hop: ["它蹦了一下。", "它跳起来了！"],
  wiggle: ["它左右晃了晃。", "它扭了扭身子。"],
  peek: ["它探出身子往旁边看。", "它伸着头看外面。"],
  spin: ["它转了一圈。", "它自己转了个圈圈。"],
  yawn: ["它打了个大哈欠。", "它张着嘴打了个长长的哈欠。"],
};

/**
 * The answer to being poked, which is what a child will do most. The poke also
 * pulls the gaze to wherever the finger landed, which is what "转过头来找你"
 * is pointing at.
 */
const POKE_LINES = [
  "诶？",
  "它被戳得晃了一下。",
  "它转过头来找你。",
  "它以为你要给它吃的。",
  "它缩了一下又弹回来。",
];

/** Asleep, and the sleepy render's eyes stay shut through all of it. */
const POKE_LINES_SLEEPY = ["别吵…它在睡。", "它动了动，没睁眼。", "它晃了一下，又歪回去了。"];

/** The gaze lean is a real few pixels towards you, which is all this claims. */
const POKE_LINES_DOWN = ["它抬头看了你一眼。", "它朝你这边挪了一点。", "它轻轻靠了过来。"];

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
  const acting = ACT_LINES[act];
  if (acting) return pick(acting, seed);
  // A thin meter is the most useful thing to say, but not to the exclusion of
  // everything else — every third line stays flavour so it is not a nag.
  if (want && seed % 3 !== 2) return pick(WANT_LINES[want], seed);
  if (seed % 4 === 3) return levelLine;
  return pick(IDLE_LINES[mood], seed);
}
