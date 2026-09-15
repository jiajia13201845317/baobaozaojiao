/**
 * 统一「记录事件」模型 (plan 12.3).
 *
 * The health module already covers growth, temperature, nappies and meals,
 * and the plan is explicit that more types are coming. So none of them get
 * their own table: every record is one event carrying a kind, a timestamp,
 * whatever structured numbers it needs, and an optional media reference.
 * Adding a type means adding an entry to KINDS and a display template —
 * never a new store shape, a new migration or a new points rule.
 *
 * The boundary from chapters 4 and 7 is enforced here rather than left to
 * each screen: a kind may declare units and parent-chosen labels, but there
 * is deliberately nowhere to put a threshold, a normal range or a verdict.
 */
import { dateKey } from "./tasks";

export type RecordKind = "growth" | "temp" | "poop" | "pee" | "meal";

export type RecordEvent = {
  id: string;
  kind: RecordKind;
  /** Epoch ms. Every record carries a real time, not just a date. */
  at: number;
  /** 6.1 记录人. Single-carer today, but the field is the point. */
  by?: string;
  /** Structured values, e.g. { height: 78.5 } or { temp: 37.2 }. */
  num?: Record<string, number>;
  /** One enumerated choice, e.g. how the temperature was taken. */
  pick?: string;
  /** The parent's own labels. The app never reads meaning out of these. */
  tags?: string[];
  note?: string;
  /** Key into the local media store, never an inline data URL. */
  photo?: string;
};

export type KindSpec = {
  id: RecordKind;
  name: string;
  /** Shown on the big one-tap buttons (6.3 适老化). */
  short: string;
  /** One tap logs it outright; others open a small form. */
  instant: boolean;
  /**
   * ch.5: health logging scores below a 早教 task on purpose, so inventing
   * records is never the cheap way to grow the pet.
   */
  points: number;
  hint: string;
};

export const KINDS: KindSpec[] = [
  { id: "growth", name: "身高体重头围", short: "量身体", instant: false, points: 4, hint: "量了就记一笔，曲线自己会长出来。" },
  { id: "temp", name: "体温", short: "量体温", instant: false, points: 2, hint: "只记数字和时间，不判断高低。" },
  { id: "poop", name: "拉屎", short: "拉屎", instant: true, points: 1, hint: "一按就记下时间。" },
  { id: "pee", name: "尿尿", short: "尿尿", instant: true, points: 1, hint: "一按就记下时间。" },
  { id: "meal", name: "吃饭", short: "拍一下", instant: false, points: 2, hint: "拍张照就行，不用选食材。" },
];

export function kindSpec(kind: RecordKind) {
  return KINDS.find((k) => k.id === kind) ?? KINDS[0]!;
}

/**
 * 4.8 测量方式 only ever labels the reading. The plan is explicit that the app
 * must not convert between sites or treat one as the authority, because doing
 * either is a medical interpretation.
 */
export const TEMP_WAYS = [
  { id: "armpit", name: "腋温" },
  { id: "ear", name: "耳温" },
  { id: "forehead", name: "额温" },
  { id: "mouth", name: "口温" },
] as const;

export function tempWayName(id?: string) {
  return TEMP_WAYS.find((w) => w.id === id)?.name ?? "未标注";
}

/** 4.8 体温上下限只用于挡明显的输入错误，不表示任何医学区间。 */
export const TEMP_RANGE = { min: 33, max: 43, step: 0.1 };

/**
 * 4.4 家长自选的描述标签，纯属个人备注。App 不据此给出任何判断。
 */
export const POOP_TAGS = ["水样", "偏软", "成形", "偏干", "带奶瓣"] as const;

export function dayOf(at: number) {
  return dateKey(new Date(at));
}

export function eventsOfKind(events: RecordEvent[], kind: RecordKind) {
  return events.filter((e) => e.kind === kind);
}

export function eventsOnDay(events: RecordEvent[], day = dateKey()) {
  return events.filter((e) => dayOf(e.at) === day).sort((a, b) => b.at - a.at);
}

export function countOnDay(events: RecordEvent[], kind: RecordKind, day = dateKey()) {
  return events.filter((e) => e.kind === kind && dayOf(e.at) === day).length;
}

export function clockOf(at: number) {
  const d = new Date(at);
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

/**
 * 12.9 防刷分: a kind scores at most once a day. Tapping 拉屎 twenty times
 * records twenty nappies — which is the honest thing to do — but earns the
 * same one point as tapping it once, so there is nothing to farm.
 */
export function scoringDays(events: RecordEvent[]) {
  const seen = new Set<string>();
  for (const e of events) seen.add(`${e.kind}:${dayOf(e.at)}`);
  return seen;
}

export function recordPoints(events: RecordEvent[]) {
  let sum = 0;
  for (const key of scoringDays(events)) {
    sum += kindSpec(key.split(":")[0] as RecordKind).points;
  }
  return sum;
}
