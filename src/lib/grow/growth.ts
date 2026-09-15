import {
  WHO_HEAD_BOYS,
  WHO_HEAD_GIRLS,
  WHO_HEIGHT_BOYS,
  WHO_HEIGHT_GIRLS,
  WHO_MAX_MONTH,
  WHO_WEIGHT_BOYS,
  WHO_WEIGHT_GIRLS,
  type Lms,
} from "./who-data";

export type Sex = "boy" | "girl";
export type Metric = "height" | "weight" | "head";

export const METRICS: Metric[] = ["height", "weight", "head"];

export const METRIC_LABEL: Record<Metric, string> = {
  height: "身长/身高",
  weight: "体重",
  head: "头围",
};
export const METRIC_SHORT: Record<Metric, string> = { height: "身高", weight: "体重", head: "头围" };
export const METRIC_UNIT: Record<Metric, string> = { height: "cm", weight: "kg", head: "cm" };

/** Plausible entry range, wide enough for any 0-3 year old, tight enough to catch a typo. */
export const METRIC_RANGE: Record<Metric, { min: number; max: number; step: number }> = {
  height: { min: 40, max: 120, step: 0.1 },
  weight: { min: 1.5, max: 30, step: 0.1 },
  head: { min: 30, max: 60, step: 0.1 },
};

function table(metric: Metric, sex: Sex): readonly Lms[] {
  if (metric === "weight") return sex === "boy" ? WHO_WEIGHT_BOYS : WHO_WEIGHT_GIRLS;
  if (metric === "head") return sex === "boy" ? WHO_HEAD_BOYS : WHO_HEAD_GIRLS;
  return sex === "boy" ? WHO_HEIGHT_BOYS : WHO_HEIGHT_GIRLS;
}

/** WHO publishes one row per whole month; read between them for a part-month age. */
function lmsAt(metric: Metric, sex: Sex, month: number): Lms {
  const rows = table(metric, sex);
  const clamped = Math.min(Math.max(month, 0), WHO_MAX_MONTH);
  const low = Math.floor(clamped);
  const high = Math.min(low + 1, WHO_MAX_MONTH);
  const t = clamped - low;
  const a = rows[low]!;
  const b = rows[high]!;
  if (t === 0) return a;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** The measurement that sits at z standard deviations, per the WHO LMS model. */
export function valueAtZ(metric: Metric, sex: Sex, month: number, z: number) {
  const [l, m, s] = lmsAt(metric, sex, month);
  if (Math.abs(l) < 1e-7) return m * Math.exp(s * z);
  return m * Math.pow(1 + l * s * z, 1 / l);
}

export function zScore(metric: Metric, sex: Sex, month: number, value: number) {
  const [l, m, s] = lmsAt(metric, sex, month);
  if (Math.abs(l) < 1e-7) return Math.log(value / m) / s;
  return (Math.pow(value / m, l) - 1) / (l * s);
}

/** Abramowitz & Stegun 7.1.26; plenty accurate for a percentile readout. */
function normalCdf(z: number) {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

export function percentileFromZ(z: number) {
  return normalCdf(z) * 100;
}

/** The bands we draw behind the child's own line. */
export const CURVE_BANDS = [
  { z: -1.8808, label: "P3" },
  { z: -1.0364, label: "P15" },
  { z: 0, label: "P50" },
  { z: 1.0364, label: "P85" },
  { z: 1.8808, label: "P97" },
] as const;

export function bandCurve(metric: Metric, sex: Sex, z: number, from: number, to: number) {
  const points: { month: number; value: number }[] = [];
  for (let month = Math.floor(from); month <= Math.ceil(to); month++) {
    points.push({ month, value: valueAtZ(metric, sex, month, z) });
  }
  return points;
}

export function monthsBetween(birthday: string, at: Date | string = new Date()) {
  const born = new Date(`${birthday}T00:00:00`);
  const now = typeof at === "string" ? new Date(`${at}T00:00:00`) : at;
  if (Number.isNaN(born.getTime()) || Number.isNaN(now.getTime())) return 0;
  const days = (now.getTime() - born.getTime()) / 86400000;
  return Math.max(0, days / 30.4375);
}

/**
 * 4.7 矫正月龄. Term is 40 weeks, so a baby born at 32 weeks is eight weeks
 * behind the calendar. WHO's standards describe term infants, so comparing a
 * preterm baby on chronological age reads as a shortfall that is not one.
 */
export function correctedMonths(months: number, pretermWeeks: number | null) {
  if (pretermWeeks == null || pretermWeeks >= 40) return months;
  return Math.max(0, months - ((40 - pretermWeeks) * 7) / 30.4375);
}

export function ageLabel(months: number) {
  const whole = Math.floor(months);
  if (whole < 12) return `${whole} 个月`;
  const years = Math.floor(whole / 12);
  const rest = whole % 12;
  return rest ? `${years} 岁 ${rest} 个月` : `${years} 岁`;
}

/**
 * Plain-language read of where a measurement sits. This is deliberately not a
 * judgement: the app records and, at the extremes, suggests asking a doctor.
 * It never says a child is underweight, short, or unwell.
 */
export function readPercentile(percentile: number) {
  const p = Math.round(percentile);
  if (p < 3) {
    return {
      tone: "ask" as const,
      short: `低于 P3`,
      note: "这次的数字在 WHO 参考曲线的最下面一档。单次测量不说明什么，可能只是量的姿势或时间不同。下次儿保时带上记录，请医生看看就好。",
    };
  }
  if (p > 97) {
    return {
      tone: "ask" as const,
      short: `高于 P97`,
      note: "这次的数字在 WHO 参考曲线的最上面一档。单次测量不说明什么。下次儿保时带上记录，请医生看看就好。",
    };
  }
  return {
    tone: "normal" as const,
    short: `P${Math.max(1, p)}`,
    note: `同月龄同性别的宝宝里，大约 ${Math.max(1, p)}% 比这个数字小。曲线的形状比某一次的位置更值得看。`,
  };
}
