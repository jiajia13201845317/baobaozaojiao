import { cardsFor, isLesson, itemsFor, type CategoryId } from "@/lib/content";

const KEY = "bao-last";

export type LastPlay = {
  category: CategoryId;
  itemId: string;
  title: string;
};

export function readLastPlay(): LastPlay | null {
  try {
    const raw = localStorage.getItem(KEY);
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
    localStorage.setItem(KEY, JSON.stringify(next));
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
