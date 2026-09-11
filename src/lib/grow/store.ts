import { type CareState, type OwnedPet, type SeriesId, pickCreature } from "./pets";
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
  /** Task ids finished, keyed by local date. */
  done: Record<string, string[]>;
  milestones: string[];
  measures: Measure[];
  vaccines: string[];
  pets: OwnedPet[];
  active: string | null;
  care: Record<string, CareState>;
  /** 可用积分 already spent on adoption and care. Never touches 累计. */
  spent: number;
};

const KEY = "grow-state";

export const EMPTY: GrowState = {
  profile: null,
  done: {},
  milestones: [],
  measures: [],
  vaccines: [],
  pets: [],
  active: null,
  care: {},
  spent: 0,
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

type Legacy = Partial<GrowState> & { doneDays?: unknown };

/** Anything unreadable falls back to empty rather than throwing on boot. */
export function readState(): GrowState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const data = JSON.parse(raw) as Legacy;
    const p = data.profile;
    const profile: Profile | null =
      p && typeof p.name === "string" && typeof p.birthday === "string" && (p.sex === "boy" || p.sex === "girl")
        ? { name: p.name, sex: p.sex, birthday: p.birthday }
        : null;

    const done: Record<string, string[]> = {};
    if (data.done && typeof data.done === "object") {
      for (const [day, ids] of Object.entries(data.done)) done[day] = asStringArray(ids);
    }
    // Before the day offered three tasks, a day was just a tick.
    for (const day of asStringArray(data.doneDays)) done[day] ??= ["legacy"];

    const measures = Array.isArray(data.measures)
      ? data.measures.filter(
          (m): m is Measure =>
            !!m &&
            typeof m.id === "string" &&
            typeof m.date === "string" &&
            (typeof m.height === "number" || typeof m.weight === "number"),
        )
      : [];

    const pets = Array.isArray(data.pets)
      ? data.pets.filter(
          (v): v is OwnedPet =>
            !!v && typeof v.id === "string" && typeof v.creature === "string" && typeof v.from === "number",
        )
      : [];

    const care: Record<string, CareState> = {};
    if (data.care && typeof data.care === "object") {
      for (const [id, value] of Object.entries(data.care)) {
        if (value && typeof value === "object") care[id] = value as CareState;
      }
    }

    const state: GrowState = {
      profile,
      done,
      milestones: asStringArray(data.milestones),
      measures,
      vaccines: asStringArray(data.vaccines),
      pets,
      active: typeof data.active === "string" ? data.active : null,
      care,
      spent: typeof data.spent === "number" && data.spent >= 0 ? data.spent : 0,
    };
    return withFirstEgg(state);
  } catch {
    return EMPTY;
  }
}

/** Everyone with a profile has at least one egg; the first one is on the house. */
export function withFirstEgg(state: GrowState): GrowState {
  if (!state.profile || state.pets.length) {
    return state.pets.length && !state.active ? { ...state, active: state.pets[0]!.id } : state;
  }
  const pet: OwnedPet = { id: newId(), creature: pickCreature("forest", []), from: 0 };
  return { ...state, pets: [pet], active: pet.id };
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
  if (!cache) {
    cache = readState();
    // Migration and the free first egg both happen on read. Without writing
    // them back, a saved file from before the pets would roll a different
    // creature on every reload.
    if (cache !== EMPTY) writeState(cache);
  }
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

export function activeDays(state: GrowState) {
  return Object.keys(state.done).filter((day) => state.done[day]!.length > 0);
}

export function taskCount(state: GrowState) {
  return Object.values(state.done).reduce((sum, ids) => sum + ids.length, 0);
}

export type PointLine = { label: string; detail: string; points: number };

/**
 * Points are always recomputed from the records, never stored. A stored
 * counter can drift from what the parent can see, and the plan is explicit
 * that points must never shrink — deriving them makes both impossible.
 */
export function pointBreakdown(state: GrowState): PointLine[] {
  const days = activeDays(state);
  const runs = streakRuns(days);
  const bonuses = runs.reduce((sum, run) => sum + Math.floor(run / POINTS.streakEvery), 0);
  const tasks = taskCount(state);
  const firsts = [
    tasks > 0,
    state.milestones.length > 0,
    state.measures.length > 0,
    state.vaccines.length > 0,
  ].filter(Boolean).length;

  return [
    { label: "早教小任务", detail: `${tasks} 个 × ${POINTS.task} 分`, points: tasks * POINTS.task },
    {
      label: "连续打卡奖励",
      detail: `${bonuses} 次满 ${POINTS.streakEvery} 天 × ${POINTS.streakBonus} 分`,
      points: bonuses * POINTS.streakBonus,
    },
    { label: "里程碑", detail: `${state.milestones.length} 个 × ${POINTS.milestone} 分`, points: state.milestones.length * POINTS.milestone },
    { label: "健康记录", detail: `${state.measures.length} 次 × ${POINTS.health} 分`, points: state.measures.length * POINTS.health },
    { label: "第一次使用", detail: `${firsts} 个功能 × ${POINTS.firstTime} 分`, points: firsts * POINTS.firstTime },
  ];
}

/** 累计积分: only ever goes up, and is the only thing pets level on. */
export function totalPoints(state: GrowState) {
  return pointBreakdown(state).reduce((sum, line) => sum + line.points, 0);
}

/** 可用积分: what is left to spend. Spending never reduces 累计. */
export function spendablePoints(state: GrowState) {
  return Math.max(0, totalPoints(state) - state.spent);
}

export function doneToday(state: GrowState, today = dateKey()) {
  return state.done[today] ?? [];
}

export function isDoneToday(state: GrowState, today = dateKey()) {
  return doneToday(state, today).length > 0;
}

export function activePet(state: GrowState) {
  return state.pets.find((p) => p.id === state.active) ?? state.pets[0] ?? null;
}

export function ownedCreatures(state: GrowState) {
  return state.pets.map((p) => p.creature);
}

export function adopt(state: GrowState, series: SeriesId, cost: number): GrowState {
  const pet: OwnedPet = {
    id: newId(),
    creature: pickCreature(series, ownedCreatures(state)),
    from: totalPoints(state),
  };
  return { ...state, pets: [...state.pets, pet], active: pet.id, spent: state.spent + cost };
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
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
