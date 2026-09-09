import { cardsFor, isLesson, itemsFor, type CategoryId, type WorldId } from "@/lib/content";

const LAST_KEY = "bao-last";
const VOL_KEY = "bao-vol";

export type LastPlay = {
  category: CategoryId;
  itemId: string;
  title: string;
  world?: WorldId;
};

export function readLastPlay(): LastPlay | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastPlay;
    if (!parsed.category || !parsed.itemId || !parsed.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastPlay(next: LastPlay) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readVolumeIndex(fallback = 2) {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    if (raw === "0" || raw === "1" || raw === "2") return Number(raw);
  } catch {
    /* ignore */
  }
  return fallback;
}

export function writeVolumeIndex(index: number) {
  try {
    localStorage.setItem(VOL_KEY, String(index));
  } catch {
    /* ignore */
  }
}

export function titleFor(category: CategoryId, itemId: string) {
  if (isLesson(category)) {
    return cardsFor(category).find((card) => card.id === itemId)?.zh ?? "这一张";
  }
  const item = itemsFor(category).find((entry) => entry.id === itemId);
  return item && "title" in item ? item.title : "这一段";
}
