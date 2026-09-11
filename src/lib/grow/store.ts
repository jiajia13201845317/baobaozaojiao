import { POINTS } from "./pet";
import { dateKey } from "./tasks";

export type Sex = "boy" | "girl";

export type Profile = {
  name: string;
  sex: Sex;
  birthday: string;
};

export type Measure = {
  id: string;
  date: string;
  height?: number;
  weight?: number;
};

export type GrowState = {
  profile: Profile | null;
  /** Dates the daily task was ticked off, newest last. */
  doneDays: string[];
  milestones: string[];
  measures: Measure[];
  vaccines: string[];
};

const KEY = "grow-state";

export const EMPTY: GrowState = {
  profile: null,
  doneDays: [],
  milestones: [],
  measures: [],
  vaccines: [],
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Anything unreadable falls back to empty rather than throwing on boot. */
export function readState(): GrowState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const data = JSON.parse(raw) as Partial<GrowState>;
    const p = data.profile;
    const profile: Profile | null =
      p && typeof p.name === "string" && typeof p.birthday === "string" && (p.sex === "boy" || p.sex === "girl")
        ? { name: p.name, sex: p.sex, birthday: p.birthday }
        : null;
    const measures = Array.isArray(data.measures)
      ? data.measures.filter(
          (m): m is Measure =>
            !!m && typeof m.id === "string" && typeof m.date === "string" && (typeof m.height === "number" || typeof m.weight === "number"),
        )
      : [];
    return {
      profile,
      doneDays: asStringArray(data.doneDays),
      milestones: asStringArray(data.milestones),
      measures,
      vaccines: asStringArray(data.vaccines),
    };
  } catch {
    return EMPTY;
  }
}

function writeState(state: GrowState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode, full disk — the app still works for this session */
  }
}

let cache: GrowState | null = null;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Must stay referentially stable between writes or React will loop. */
export function snapshot(): GrowState {
  if (!cache) cache = readState();
  return cache;
}

/** The export is static, so the first paint never has the records yet. */
export function serverSnapshot(): GrowState {
  return EMPTY;
}

export function hydrated() {
  return true;
}

export function notHydrated() {
  return false;
}

export function saveState(next: GrowState) {
  cache = next;
  writeState(next);
  for (const listener of listeners) listener();
}

/** Longest runs of consecutive days, used for the weekly streak bonus. */
function streakRuns(days: string[]) {
  const sorted = [...new Set(days)].sort();
  const runs: number[] = [];
  let run = 0;
  let prev: number | null = null;
  for (const day of sorted) {
    const t = new Date(`${day}T00:00:00`).getTime();
    if (Number.isNaN(t)) continue;
    if (prev != null && Math.round((t - prev) / 86400000) === 1) run += 1;
    else run = 1;
    prev = t;
    if (run === 1) runs.push(1);
    else runs[runs.length - 1] = run;
  }
  return runs;
}

export type PointLine = { label: string; detail: string; points: number };

/**
 * Points are always recomputed from the records, never stored. A stored
 * counter can drift from what the parent can see, and the plan is explicit
 * that points must never shrink — deriving them makes both impossible.
 */
export function pointBreakdown(state: GrowState): PointLine[] {
  const runs = streakRuns(state.doneDays);
  const bonuses = runs.reduce((sum, run) => sum + Math.floor(run / POINTS.streakEvery), 0);
  const firsts = [
    state.doneDays.length > 0,
    state.milestones.length > 0,
    state.measures.length > 0,
    state.vaccines.length > 0,
  ].filter(Boolean).length;

  return [
    {
      label: "每日小任务",
      detail: `${state.doneDays.length} 天 × ${POINTS.task} 分`,
      points: state.doneDays.length * POINTS.task,
    },
    {
      label: "连续打卡奖励",
      detail: `${bonuses} 次满 ${POINTS.streakEvery} 天 × ${POINTS.streakBonus} 分`,
      points: bonuses * POINTS.streakBonus,
    },
    {
      label: "里程碑",
      detail: `${state.milestones.length} 个 × ${POINTS.milestone} 分`,
      points: state.milestones.length * POINTS.milestone,
    },
    {
      label: "健康记录",
      detail: `${state.measures.length} 次 × ${POINTS.health} 分`,
      points: state.measures.length * POINTS.health,
    },
    {
      label: "第一次使用",
      detail: `${firsts} 个功能 × ${POINTS.firstTime} 分`,
      points: firsts * POINTS.firstTime,
    },
  ];
}

export function totalPoints(state: GrowState) {
  return pointBreakdown(state).reduce((sum, line) => sum + line.points, 0);
}

export function isDoneToday(state: GrowState, today = dateKey()) {
  return state.doneDays.includes(today);
}

export function latest(state: GrowState, metric: "height" | "weight") {
  const withValue = state.measures
    .filter((m) => typeof m[metric] === "number")
    .sort((a, b) => a.date.localeCompare(b.date));
  return withValue[withValue.length - 1] ?? null;
}

export function seriesOf(state: GrowState, metric: "height" | "weight") {
  return state.measures
    .filter((m) => typeof m[metric] === "number")
    .map((m) => ({ date: m.date, value: m[metric] as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function newId() {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
