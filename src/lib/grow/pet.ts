/**
 * 积分.
 *
 * The pet is not a side game. It is the only place the app shows accumulated
 * effort, which is what makes recording feel like raising something rather
 * than like bookkeeping.
 *
 * Point values follow the plan's reverse-engineering: roughly one task a day
 * at 8 points is ~720 a quarter, weekly streaks add ~360, milestones ~150, so
 * a quarter yields about 1000-1200. The level thresholds in pets.ts sit below
 * that on purpose, so a parent who misses days still gets the reveal within a
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
