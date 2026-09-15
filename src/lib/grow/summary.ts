/**
 * 10.3 三年成长总结 and the numbers behind 11.7 成长海报.
 *
 * The plan describes this as the app's emotional payoff, and the trap is
 * obvious: a year-in-review that grades the family is worse than no review at
 * all. So everything here is a count of what the household actually did — days
 * shown up, records kept, first times noticed — and never a score, a
 * comparison, or a statement about the child's development. There is no
 * "you only managed 40%". A family that opened the app twelve times gets a
 * summary that is glad about twelve.
 */
import { METRIC_LABEL, monthsBetween, type Metric } from "./growth";
import { KINDS, dayOf, eventsOfKind } from "./records";
import { type Baby, type BabyData, activeDays, latest, recordDays, revealedCreatures, taskCount, totalPoints } from "./store";

export type SummaryStat = { label: string; value: string; note: string };

function firstAndLast(days: string[]) {
  const sorted = [...days].sort();
  return { first: sorted[0] ?? null, last: sorted[sorted.length - 1] ?? null };
}

/** Longest run of consecutive days with a task ticked. */
export function longestStreak(data: BabyData) {
  const sorted = [...new Set(activeDays(data))].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of sorted) {
    const t = new Date(`${day}T00:00:00`).getTime();
    if (Number.isNaN(t)) continue;
    run = prev != null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
    prev = t;
    best = Math.max(best, run);
  }
  return best;
}

export function summaryStats(baby: Baby, data: BabyData): SummaryStat[] {
  const days = activeDays(data);
  const { first } = firstAndLast([...days, ...data.events.map((e) => dayOf(e.at))]);
  const withUs = first ? Math.max(1, Math.round((Date.now() - new Date(`${first}T00:00:00`).getTime()) / 86400000)) : 0;

  return [
    { label: "一起走过", value: `${withUs} 天`, note: first ? `从 ${first} 开始记` : "今天就是第一天" },
    { label: "打卡天数", value: `${days.length} 天`, note: `完成了 ${taskCount(data)} 个小任务` },
    { label: "最长连续", value: `${longestStreak(data)} 天`, note: "断了再接上也算，不清零" },
    { label: "记录条数", value: `${data.events.length} 条`, note: `${recordDays(data)} 天有记录` },
    { label: "里程碑", value: `${data.milestones.length} 个`, note: "你注意到的第一次" },
    { label: "图鉴", value: `${revealedCreatures(data).size} 只`, note: `累计 ${totalPoints(data)} 分换来的` },
  ];
}

export type GrowthLine = { label: string; text: string };

/**
 * Height and weight are reported as "what you measured, and how much it
 * changed" — never as a position in a distribution. A percentile on a keepsake
 * poster is exactly the kind of number a parent screenshots and worries about.
 */
export function growthLines(data: BabyData): GrowthLine[] {
  const out: GrowthLine[] = [];
  for (const metric of ["height", "weight", "head"] as Metric[]) {
    const series = data.events
      .filter((e) => e.kind === "growth" && typeof e.num?.[metric] === "number")
      .map((e) => e.num![metric]!);
    const now = latest(data, metric);
    if (!now || series.length === 0) continue;
    const unit = metric === "weight" ? "kg" : "cm";
    const gain = series.length > 1 ? now.value - series[0]! : null;
    out.push({
      label: METRIC_LABEL[metric],
      text: gain != null ? `${now.value}${unit}（比第一次记的时候 ${gain >= 0 ? "+" : ""}${gain.toFixed(1)}${unit}）` : `${now.value}${unit}`,
    });
  }
  return out;
}

export function kindCounts(data: BabyData) {
  return KINDS.map((k) => ({ name: k.name, count: eventsOfKind(data.events, k.id).length })).filter((k) => k.count > 0);
}

/** One warm line for the top of the poster, keyed off how far along the family is. */
export function headline(baby: Baby, data: BabyData) {
  const months = Math.max(0, Math.round(monthsBetween(baby.birthday)));
  const days = activeDays(data).length;
  if (days === 0) return `${baby.name} ${months} 个月啦`;
  if (days < 7) return `陪 ${baby.name} 记了 ${days} 天`;
  if (days < 30) return `和 ${baby.name} 一起坚持了 ${days} 天`;
  return `${baby.name} 的第 ${months} 个月`;
}

export const SUMMARY_NOTE =
  "这里的数字只统计你自己填过的内容，不做任何评价，也不和别的宝宝比较。少记几天不影响什么，记下来的都还在。";
