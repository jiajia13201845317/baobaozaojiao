/**
 * 积分 × 宠物成长.
 *
 * The pet is not a side game. It is the only place the app shows accumulated
 * effort, which is what makes recording feel like raising something rather
 * than like bookkeeping.
 *
 * Point values follow the plan's reverse-engineering: roughly one task a day
 * at 8 points is ~720 a quarter, weekly streaks add ~360, milestones ~150, so
 * a quarter yields about 1000-1200. Thresholds sit below that on purpose, so
 * a parent who misses days still reaches the next form by the end of the
 * quarter. Health logging is scored low deliberately — it should never become
 * the cheapest way to farm points, or the numbers stop being true.
 */
export const POINTS = {
  task: 8,
  milestone: 75,
  health: 4,
  streakBonus: 30,
  streakEvery: 7,
  firstTime: 20,
} as const;

export type PetStageId = "egg" | "baby" | "grown";

export type PetStage = {
  id: PetStageId;
  name: string;
  at: number;
  image: string;
  blurb: string;
  /** What the pet "says" on the home screen at this stage. */
  line: string;
};

export const PET_STAGES: PetStage[] = [
  {
    id: "egg",
    name: "蛋",
    at: 0,
    image: "/art/grow/pet-egg.png",
    blurb: "壳上已经有一道细纹了。",
    line: "里面好像有动静。",
  },
  {
    id: "baby",
    name: "幼年",
    at: 380,
    image: "/art/grow/pet-baby.png",
    blurb: "壳顶还顶在头上，没舍得摘。",
    line: "我出来啦，今天玩什么？",
  },
  {
    id: "grown",
    name: "成年",
    at: 880,
    image: "/art/grow/pet-grown.png",
    blurb: "翅膀长齐了，站得稳稳的。",
    line: "这一路都是你陪我长大的。",
  },
];

export function stageForPoints(points: number) {
  let index = 0;
  for (let i = 0; i < PET_STAGES.length; i++) {
    if (points >= PET_STAGES[i]!.at) index = i;
  }
  return { index, stage: PET_STAGES[index]!, next: PET_STAGES[index + 1] ?? null };
}

export function stageProgress(points: number) {
  const { stage, next, index } = stageForPoints(points);
  if (!next) return { index, stage, next, ratio: 1, need: 0 };
  const span = next.at - stage.at;
  const done = points - stage.at;
  return {
    index,
    stage,
    next,
    ratio: Math.min(1, Math.max(0, done / span)),
    need: Math.max(0, next.at - points),
  };
}

/**
 * Consecutive days ending today (or yesterday — a streak is not broken until
 * the day is actually missed, otherwise the app would punish opening it in
 * the morning before the task is done).
 */
export function streakOf(days: string[], today: string) {
  const set = new Set(days);
  const cursor = new Date(`${today}T00:00:00`);
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (;;) {
    const y = cursor.getFullYear();
    const m = `${cursor.getMonth() + 1}`.padStart(2, "0");
    const d = `${cursor.getDate()}`.padStart(2, "0");
    if (!set.has(`${y}-${m}-${d}`)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
