/**
 * Local store.
 *
 * Two structural decisions come straight from the plan and are worth keeping
 * even though nothing in this build has a server yet:
 *
 *   8.1 / 6.1 — a 宝宝档案 is its own entity, not fields on the account. Every
 *   record, pet, point and streak hangs off a baby id. There is no shared
 *   point pool between siblings (6.2), and adding carers later means adding a
 *   `by` on events rather than reshaping anything.
 *
 *   12.1 — offline first. Every write lands in localStorage synchronously and
 *   the UI reads back from memory, so a record made in a lift or a hospital
 *   basement is never waiting on a network call to count.
 */
import { type CareState, type OwnedPet, type SeriesId, pickCreature, viewPet } from "./pets";
import { POINTS } from "./pet";
import { type RecordEvent, type RecordKind, dayOf, recordPoints } from "./records";
import { dateKey } from "./tasks";

export type Sex = "boy" | "girl";
export type Metric = "height" | "weight" | "head";

export type Baby = {
  id: string;
  name: string;
  sex: Sex;
  birthday: string;
  /**
   * 4.7 早产儿: gestational weeks at birth, null for full term. Curves,
   * development references and task pushes read corrected age by default.
   */
  pretermWeeks: number | null;
  /** 4.7 保留切换实际月龄的选项. */
  useCorrected: boolean;
  createdAt: number;
};

/** Everything that belongs to one baby. Siblings never share any of it. */
export type BabyData = {
  /** Task ids finished, keyed by local date. */
  done: Record<string, string[]>;
  milestones: string[];
  vaccines: string[];
  events: RecordEvent[];
  pets: OwnedPet[];
  active: string | null;
  care: Record<string, CareState>;
  /** 可用积分 already spent on adoption and care. Never touches 累计. */
  spent: number;
};

export type GrowState = {
  babies: Baby[];
  current: string | null;
  data: Record<string, BabyData>;
};

const KEY = "grow-state";

export const EMPTY_BABY: BabyData = {
  done: {},
  milestones: [],
  vaccines: [],
  events: [],
  pets: [],
  active: null,
  care: {},
  spent: 0,
};

export const EMPTY: GrowState = { babies: [], current: null, data: {} };

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asNumberMap(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function readEvents(value: unknown): RecordEvent[] {
  if (!Array.isArray(value)) return [];
  const kinds = new Set<RecordKind>(["growth", "temp", "poop", "pee", "meal"]);
  return value
    .filter((e): e is RecordEvent => !!e && typeof e.id === "string" && typeof e.at === "number" && kinds.has(e.kind))
    .map((e) => ({
      id: e.id,
      kind: e.kind,
      at: e.at,
      by: typeof e.by === "string" ? e.by : undefined,
      num: asNumberMap(e.num),
      pick: typeof e.pick === "string" ? e.pick : undefined,
      tags: e.tags ? asStringArray(e.tags) : undefined,
      note: typeof e.note === "string" ? e.note : undefined,
      photo: typeof e.photo === "string" ? e.photo : undefined,
    }));
}

function readBabyData(value: unknown): BabyData {
  const data = (value ?? {}) as Partial<BabyData> & { doneDays?: unknown; measures?: unknown };

  const done: Record<string, string[]> = {};
  if (data.done && typeof data.done === "object") {
    for (const [day, ids] of Object.entries(data.done)) done[day] = asStringArray(ids);
  }
  // Before the day offered three tasks, a day was just a tick.
  for (const day of asStringArray(data.doneDays)) done[day] ??= ["legacy"];

  const events = readEvents(data.events);
  // Growth used to be its own `measures` array keyed by date (plan 12.3 folds
  // every record type into one event list).
  if (Array.isArray(data.measures)) {
    for (const m of data.measures as { id?: unknown; date?: unknown; height?: unknown; weight?: unknown }[]) {
      if (!m || typeof m.date !== "string") continue;
      const num = asNumberMap({ height: m.height, weight: m.weight });
      if (!num) continue;
      const at = new Date(`${m.date}T12:00:00`).getTime();
      if (Number.isNaN(at)) continue;
      events.push({ id: typeof m.id === "string" ? m.id : newId(), kind: "growth", at, num });
    }
  }

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

  return {
    done,
    milestones: asStringArray(data.milestones),
    vaccines: asStringArray(data.vaccines),
    events: events.sort((a, b) => a.at - b.at),
    pets,
    active: typeof data.active === "string" ? data.active : null,
    care,
    spent: typeof data.spent === "number" && data.spent >= 0 ? data.spent : 0,
  };
}

function readBaby(value: unknown): Baby | null {
  const b = value as Partial<Baby> | null;
  if (!b || typeof b.name !== "string" || typeof b.birthday !== "string") return null;
  if (b.sex !== "boy" && b.sex !== "girl") return null;
  const weeks = typeof b.pretermWeeks === "number" && b.pretermWeeks >= 22 && b.pretermWeeks < 40 ? b.pretermWeeks : null;
  return {
    id: typeof b.id === "string" ? b.id : newId(),
    name: b.name,
    sex: b.sex,
    birthday: b.birthday,
    pretermWeeks: weeks,
    useCorrected: weeks != null && b.useCorrected !== false,
    createdAt: typeof b.createdAt === "number" ? b.createdAt : Date.now(),
  };
}

type Legacy = Partial<GrowState> & { profile?: unknown };

/** Anything unreadable falls back to empty rather than throwing on boot. */
export function readState(): GrowState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Legacy;

    // The single-baby shape kept the profile and its records side by side at
    // the top level. Lift that into the first baby档案.
    if (parsed.profile && !Array.isArray(parsed.babies)) {
      const baby = readBaby({ ...(parsed.profile as object), id: "b1", createdAt: Date.now() });
      if (!baby) return EMPTY;
      return withFirstEgg({ babies: [baby], current: baby.id, data: { [baby.id]: readBabyData(parsed) } }, baby.id);
    }

    const babies = (Array.isArray(parsed.babies) ? parsed.babies : []).map(readBaby).filter((b): b is Baby => b != null);
    if (!babies.length) return EMPTY;
    const data: Record<string, BabyData> = {};
    for (const baby of babies) data[baby.id] = readBabyData((parsed.data ?? {})[baby.id]);
    const current = typeof parsed.current === "string" && data[parsed.current] ? parsed.current : babies[0]!.id;

    let state: GrowState = { babies, current, data };
    for (const baby of babies) state = withFirstEgg(state, baby.id);
    return state;
  } catch {
    return EMPTY;
  }
}

/** Every baby档案 has at least one egg; the first one is on the house. */
export function withFirstEgg(state: GrowState, babyId: string): GrowState {
  const data = state.data[babyId];
  if (!data) return state;
  if (data.pets.length) {
    if (data.active) return state;
    return setData(state, babyId, { ...data, active: data.pets[0]!.id });
  }
  const pet: OwnedPet = { id: newId(), creature: pickCreature("forest", []), from: 0 };
  return setData(state, babyId, { ...data, pets: [pet], active: pet.id });
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

// ---------- babies ----------

export function currentBaby(state: GrowState): Baby | null {
  return state.babies.find((b) => b.id === state.current) ?? state.babies[0] ?? null;
}

export function dataOf(state: GrowState, babyId: string | null | undefined): BabyData {
  return (babyId ? state.data[babyId] : null) ?? EMPTY_BABY;
}

export function currentData(state: GrowState): BabyData {
  return dataOf(state, currentBaby(state)?.id);
}

export function setData(state: GrowState, babyId: string, data: BabyData): GrowState {
  return { ...state, data: { ...state.data, [babyId]: data } };
}

export function addBaby(state: GrowState, fields: Omit<Baby, "id" | "createdAt">): GrowState {
  const baby: Baby = { ...fields, id: newId(), createdAt: Date.now() };
  const next: GrowState = {
    babies: [...state.babies, baby],
    current: baby.id,
    data: { ...state.data, [baby.id]: EMPTY_BABY },
  };
  return withFirstEgg(next, baby.id);
}

export function editBaby(state: GrowState, babyId: string, fields: Omit<Baby, "id" | "createdAt">): GrowState {
  return {
    ...state,
    babies: state.babies.map((b) => (b.id === babyId ? { ...b, ...fields } : b)),
  };
}

/**
 * 7.3 — deleting a baby档案 removes that baby's records outright rather than
 * hiding them, and never touches a sibling's.
 */
export function removeBaby(state: GrowState, babyId: string): GrowState {
  const babies = state.babies.filter((b) => b.id !== babyId);
  const data = { ...state.data };
  delete data[babyId];
  return { babies, data, current: babies.some((b) => b.id === state.current) ? state.current : (babies[0]?.id ?? null) };
}

// ---------- records ----------

export function addEvent(data: BabyData, event: Omit<RecordEvent, "id">): BabyData {
  const full: RecordEvent = { ...event, id: newId() };
  return { ...data, events: [...data.events, full].sort((a, b) => a.at - b.at) };
}

export function removeEvent(data: BabyData, id: string): BabyData {
  return { ...data, events: data.events.filter((e) => e.id !== id) };
}

export function lastEventId(data: BabyData, kind: RecordKind) {
  const of = data.events.filter((e) => e.kind === kind);
  return of[of.length - 1]?.id ?? null;
}

// ---------- points ----------

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

export function activeDays(data: BabyData) {
  return Object.keys(data.done).filter((day) => data.done[day]!.length > 0);
}

export function taskCount(data: BabyData) {
  return Object.values(data.done).reduce((sum, ids) => sum + ids.length, 0);
}

export function recordDays(data: BabyData) {
  return new Set(data.events.map((e) => dayOf(e.at))).size;
}

export type PointLine = { label: string; detail: string; points: number };

/**
 * Points are always recomputed from the records, never stored. A stored
 * counter can drift from what the parent can see, and the plan is explicit
 * that points must never shrink — deriving them makes both impossible. It
 * also satisfies 12.9's "keep a log, not just a balance" for free: the
 * records *are* the log.
 */
export function pointBreakdown(data: BabyData): PointLine[] {
  const days = activeDays(data);
  const runs = streakRuns(days);
  const bonuses = runs.reduce((sum, run) => sum + Math.floor(run / POINTS.streakEvery), 0);
  const tasks = taskCount(data);
  const firsts = [tasks > 0, data.milestones.length > 0, data.events.length > 0, data.vaccines.length > 0].filter(
    Boolean,
  ).length;

  return [
    { label: "早教小任务", detail: `${tasks} 个 × ${POINTS.task} 分`, points: tasks * POINTS.task },
    {
      label: "连续打卡奖励",
      detail: `${bonuses} 次满 ${POINTS.streakEvery} 天 × ${POINTS.streakBonus} 分`,
      points: bonuses * POINTS.streakBonus,
    },
    {
      label: "里程碑",
      detail: `${data.milestones.length} 个 × ${POINTS.milestone} 分`,
      points: data.milestones.length * POINTS.milestone,
    },
    {
      label: "健康记录",
      detail: `${recordDays(data)} 天有记录 · 每类每天只算一次`,
      points: recordPoints(data.events),
    },
    { label: "第一次使用", detail: `${firsts} 个功能 × ${POINTS.firstTime} 分`, points: firsts * POINTS.firstTime },
  ];
}

/** 累计积分: only ever goes up, and is the only thing pets level on. */
export function totalPoints(data: BabyData) {
  return pointBreakdown(data).reduce((sum, line) => sum + line.points, 0);
}

/** 可用积分: what is left to spend. Spending never reduces 累计. */
export function spendablePoints(data: BabyData) {
  return Math.max(0, totalPoints(data) - data.spent);
}

export function doneToday(data: BabyData, today = dateKey()) {
  return data.done[today] ?? [];
}

export function isDoneToday(data: BabyData, today = dateKey()) {
  return doneToday(data, today).length > 0;
}

// ---------- pets ----------

export function activePet(data: BabyData) {
  return data.pets.find((p) => p.id === data.active) ?? data.pets[0] ?? null;
}

export function ownedCreatures(data: BabyData) {
  return data.pets.map((p) => p.creature);
}

/** A slot in the 图鉴 only fills once the egg is open and the creature is known. */
export function revealedCreatures(data: BabyData) {
  const total = totalPoints(data);
  return new Set(data.pets.filter((p) => viewPet(p, total).revealed).map((p) => p.creature));
}

export function adopt(data: BabyData, series: SeriesId, cost: number): BabyData {
  const pet: OwnedPet = {
    id: newId(),
    creature: pickCreature(series, ownedCreatures(data)),
    from: totalPoints(data),
  };
  return { ...data, pets: [...data.pets, pet], active: pet.id, spent: data.spent + cost };
}

// ---------- growth ----------

export function growthEvents(data: BabyData, metric: Metric) {
  return data.events
    .filter((e) => e.kind === "growth" && typeof e.num?.[metric] === "number")
    .sort((a, b) => a.at - b.at);
}

export function latest(data: BabyData, metric: Metric) {
  const of = growthEvents(data, metric);
  const last = of[of.length - 1];
  return last ? { id: last.id, date: dayOf(last.at), value: last.num![metric]! } : null;
}

export function seriesOf(data: BabyData, metric: Metric) {
  return growthEvents(data, metric).map((e) => ({ date: dayOf(e.at), value: e.num![metric]! }));
}

export function newId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
