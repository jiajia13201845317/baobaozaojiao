import { cardsFor, isLesson, itemsFor, type CategoryId, type WorldId } from "@/lib/content";

const LAST_KEY = "bao-last";
const VOL_KEY = "bao-vol";
const CHAIN_KEY = "bao-chain";
const MODE_KEY = "bao-mode";
const TIMER_KEY = "bao-timer";
const SEEN_KEY = "bao-seen";
const SOURCE_KEY = "bao-source";
const CRY_KEY = "bao-cry";

export type MusicSource = "netease" | "local";

export const MUSIC_SOURCE_LABEL: Record<MusicSource, string> = {
  netease: "网易云",
  local: "本地录音",
};

export const MUSIC_SOURCE_HINT: Record<MusicSource, string> = {
  netease: "儿歌走网易云官方外链，听正版成片。",
  local: "儿歌用本地钢琴加童声，不用联网。",
};

export type CrySource = "real" | "soft";

export const CRY_SOURCE_LABEL: Record<CrySource, string> = {
  real: "真声",
  soft: "合成",
};

export const CRY_SOURCE_HINT: Record<CrySource, string> = {
  real: "真动物录音，只留一声，压柔了，听着像小奶狗、小狮子。",
  soft: "本机合成的软叫声，比真声还轻，宝宝更不容易被惊到。",
};

export function readCrySource(): CrySource {
  try {
    if (localStorage.getItem(CRY_KEY) === "soft") return "soft";
  } catch {
    /* ignore */
  }
  return "real";
}

export function writeCrySource(source: CrySource) {
  try {
    localStorage.setItem(CRY_KEY, source);
  } catch {
    /* ignore */
  }
}

export function cycleCrySource(source: CrySource): CrySource {
  return source === "real" ? "soft" : "real";
}

export function readMusicSource(): MusicSource {
  try {
    if (localStorage.getItem(SOURCE_KEY) === "local") return "local";
  } catch {
    /* ignore */
  }
  return "netease";
}

export function writeMusicSource(source: MusicSource) {
  try {
    localStorage.setItem(SOURCE_KEY, source);
  } catch {
    /* ignore */
  }
}

export function cycleMusicSource(source: MusicSource): MusicSource {
  return source === "netease" ? "local" : "netease";
}

export type PlayMode = "chain" | "loop" | "once";

export const PLAY_MODE_LABEL: Record<PlayMode, string> = {
  chain: "连播",
  loop: "单曲",
  once: "听完停",
};

export const PLAY_MODE_HINT: Record<PlayMode, string> = {
  chain: "听完自动下一首，像早教机",
  loop: "同一首反复听",
  once: "听完停在这一页",
};

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

export function readChain() {
  return readPlayMode() === "chain";
}

export function writeChain(on: boolean) {
  writePlayMode(on ? "chain" : "once");
}

export function readPlayMode(): PlayMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "chain" || raw === "loop" || raw === "once") return raw;
    const legacy = localStorage.getItem(CHAIN_KEY);
    if (legacy === "0") return "once";
    if (legacy === "1") return "chain";
  } catch {
    /* ignore */
  }
  return "chain";
}

export function writePlayMode(mode: PlayMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
    localStorage.setItem(CHAIN_KEY, mode === "chain" ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function cyclePlayMode(mode: PlayMode): PlayMode {
  if (mode === "chain") return "loop";
  if (mode === "loop") return "once";
  return "chain";
}

export function readSleepMinutes() {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (raw === "10" || raw === "20" || raw === "30") return Number(raw);
  } catch {
    /* ignore */
  }
  return 0;
}

export function writeSleepMinutes(minutes: number) {
  try {
    localStorage.setItem(TIMER_KEY, String(minutes));
  } catch {
    /* ignore */
  }
}

export function readHasPlayed() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHasPlayed() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
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
