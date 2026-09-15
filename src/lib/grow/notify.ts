/**
 * 12.5 / 7.6 — one scheduler for every reminder in the app.
 *
 * The plan's reason for a single layer is not code tidiness, it is that a
 * parenting app that fires vaccine, temperature and streak reminders from
 * three independent timers will eventually deliver three notifications in one
 * minute, and the parent turns all of them off forever. So every reminder in
 * the product is declared here, the layer decides what is due, and it hands
 * back at most one at a time.
 *
 * What this build can actually deliver: the app is a static site with no
 * server and no push credentials, so there is no background delivery. That is
 * a real limit and the UI says so rather than implying otherwise. What works
 * is an in-app 提醒 surface plus, once the parent grants permission, a system
 * notification while the app is open. The queue, the quiet hours, the
 * per-kind mute and the once-a-day ceiling are all real, so wiring a push
 * transport later means replacing `deliver` and nothing else.
 */
import { type Baby, type BabyData } from "./store";
import { nextVaccine } from "./vaccines";
import { monthsBetween } from "./growth";
import { KINDS, dayOf, eventsOfKind } from "./records";
import { isDoneToday } from "./store";
import type { Settings } from "./settings";

export type ReminderKind = "vaccine" | "temp" | "streak" | "records";

export type Reminder = {
  id: string;
  kind: ReminderKind;
  title: string;
  body: string;
  /** Sort key: smaller goes first when several are due at once. */
  weight: number;
  /** Which tab answers it, so tapping the card lands somewhere useful. */
  goto: "records" | "learn" | "home";
};

/**
 * Nothing fires outside these hours. A reminder that wakes a household with a
 * small child in it has done more harm than the reminder was worth.
 */
export const QUIET_FROM = 21;
export const QUIET_TO = 8;

export function inQuietHours(now = new Date()) {
  const h = now.getHours();
  return h >= QUIET_FROM || h < QUIET_TO;
}

const MUTE_KEY = "grow-notify-mute";
const SENT_KEY = "grow-notify-sent";

type Muted = Partial<Record<ReminderKind, true>>;
/** Reminder id → the local day it was last delivered. One per day, per reminder. */
type Sent = Record<string, string>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — reminders degrade to showing every session */
  }
}

export function mutedKinds(): Muted {
  return readJson<Muted>(MUTE_KEY, {});
}

export function toggleMute(kind: ReminderKind) {
  const next = { ...mutedKinds() };
  if (next[kind]) delete next[kind];
  else next[kind] = true;
  writeJson(MUTE_KEY, next);
  return next;
}

/** Collect everything the app would like to say, before any filtering. */
export function pending(baby: Baby, data: BabyData, settings: Settings, now = new Date()): Reminder[] {
  const out: Reminder[] = [];

  const vaccine = nextVaccine(monthsBetween(baby.birthday, now), data.vaccines);
  if (vaccine && (vaccine.status === "due" || vaccine.status === "soon")) {
    out.push({
      id: `vaccine-${vaccine.vaccine.id}`,
      kind: "vaccine",
      title: "疫苗月龄到了",
      body: `${vaccine.vaccine.name}的建议月龄在这附近。具体打不打、什么时候打，按接种点的安排。`,
      weight: 0,
      goto: "records",
    });
  }

  if (settings.tempReminder.on) {
    const temps = eventsOfKind(data.events, "temp");
    const last = temps[temps.length - 1];
    const gap = last ? now.getTime() - last.at : Infinity;
    if (last && gap >= settings.tempReminder.every * 60000) {
      out.push({
        id: `temp-${dayOf(now.getTime())}-${Math.floor(gap / (settings.tempReminder.every * 60000))}`,
        kind: "temp",
        title: "到复测体温的时间了",
        body: `上次记录是 ${settings.tempReminder.every} 分钟前。要不要再量一次记下来。`,
        weight: 1,
        goto: "records",
      });
    }
  }

  if (!isDoneToday(data)) {
    out.push({
      id: `streak-${dayOf(now.getTime())}`,
      kind: "streak",
      title: "今天还没打卡",
      body: "挑一个三五分钟的小任务就算。做不了也不要紧，明天接着来。",
      weight: 2,
      goto: "learn",
    });
  }

  const today = dayOf(now.getTime());
  const loggedToday = new Set(data.events.filter((e) => dayOf(e.at) === today).map((e) => e.kind));
  if (!loggedToday.size && data.events.length > 0) {
    out.push({
      id: `records-${today}`,
      kind: "records",
      title: "今天还没有记录",
      body: `${KINDS.map((k) => k.short).join("、")}，随手点一下就好。`,
      weight: 3,
      goto: "records",
    });
  }

  return out;
}

/**
 * The one reminder to actually show, or null. Filtering happens here so every
 * caller gets the same quiet hours, the same mute list and the same
 * once-a-day ceiling without having to remember them.
 */
export function due(baby: Baby, data: BabyData, settings: Settings, now = new Date()): Reminder | null {
  if (!settings.consent.notify) return null;
  if (inQuietHours(now)) return null;
  const muted = mutedKinds();
  const sent = readJson<Sent>(SENT_KEY, {});
  const today = dayOf(now.getTime());
  const queue = pending(baby, data, settings, now)
    .filter((r) => !muted[r.kind] && sent[r.id] !== today)
    .sort((a, b) => a.weight - b.weight);
  return queue[0] ?? null;
}

/** Marks a reminder as delivered for today so it does not come back this afternoon. */
export function markSent(reminder: Reminder, now = new Date()) {
  const sent = readJson<Sent>(SENT_KEY, {});
  const today = dayOf(now.getTime());
  const kept: Sent = {};
  for (const [id, day] of Object.entries(sent)) if (day === today) kept[id] = day;
  kept[reminder.id] = today;
  writeJson(SENT_KEY, kept);
}

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

export function permission(): PermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PermissionState;
}

export async function ask(): Promise<PermissionState> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return (await Notification.requestPermission()) as PermissionState;
  } catch {
    return "denied";
  }
}

/**
 * Hands the reminder to the system if we are allowed to. The in-app card is
 * shown either way, so a refused permission never silently loses a reminder.
 */
export function deliver(reminder: Reminder) {
  if (permission() !== "granted") return false;
  try {
    new Notification(reminder.title, { body: reminder.body, tag: reminder.id });
    return true;
  } catch {
    return false;
  }
}
