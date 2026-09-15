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
  local: "本机童声",
};

export const MUSIC_SOURCE_HINT: Record<MusicSource, string> = {
  netease: "儿歌走网易云官方外链，听正版成片。外链在部分设备上要手动点一下才出声。",
  local: "儿歌是本机合成的童声演唱，一个字一个音地唱在调上，不用联网。",
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

/**
 * The local tracks by default.
 *
 * The outchain player used to be the default, on the grounds that a real
 * recording beats anything synthesised here. It does — when it plays. It is a
 * cross-origin iframe, so there is no way to find out whether it ever made a
 * sound, and nothing to fall back to if it did not; on a device that blocks
 * autoplay in frames, picking a song simply produced silence. The local
 * tracks sing now, and they always play.
 */
export function readMusicSource(): MusicSource {
  try {
    if (localStorage.getItem(SOURCE_KEY) === "netease") return "netease";
  } catch {
    /* ignore */
  }
  return "local";
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

/**
 * The listening app's saved preferences, as one external store.
 *
 * They all come from localStorage and the query string, neither of which
 * exists when this static export is rendered at build time. Reading them in a
 * mount effect worked but meant six setState calls on the first commit; an
 * external store keeps the read out of both render and effects, which is the
 * same shape the records store uses.
 */
export type Prefs = {
  lastPlay: LastPlay | null;
  volumeIndex: number;
  playMode: PlayMode;
  musicSource: MusicSource;
  crySource: CrySource;
  sleepMinutes: number;
  /** ?go=home — an explicit bypass of the welcome gate, for bookmarks and tests. */
  go: string | null;
};

const DEFAULT_PREFS: Prefs = {
  lastPlay: null,
  volumeIndex: 2,
  playMode: "chain",
  musicSource: "netease",
  crySource: "real",
  sleepMinutes: 0,
  go: null,
};

function loadPrefs(): Prefs {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return DEFAULT_PREFS;
  }
  const source = params.get("source");
  const musicSource: MusicSource = source === "local" || source === "netease" ? source : readMusicSource();
  writeMusicSource(musicSource);
  const cry = params.get("cry");
  const crySource: CrySource = cry === "soft" || cry === "real" ? cry : readCrySource();
  writeCrySource(crySource);
  return {
    lastPlay: readLastPlay(),
    volumeIndex: readVolumeIndex(2),
    playMode: readPlayMode(),
    musicSource,
    crySource,
    sleepMinutes: readSleepMinutes(),
    go: params.get("go"),
  };
}

let prefs: Prefs | null = null;
const prefsListeners = new Set<() => void>();

export function subscribePrefs(listener: () => void) {
  prefsListeners.add(listener);
  return () => {
    prefsListeners.delete(listener);
  };
}

export function prefsSnapshot(): Prefs {
  prefs ??= loadPrefs();
  return prefs;
}

export function prefsServer(): Prefs {
  return DEFAULT_PREFS;
}

export function prefsReady() {
  return true;
}

export function prefsNotReady() {
  return false;
}

/** Writes through to storage so the next open agrees with what is on screen. */
export function patchPrefs(patch: Partial<Prefs>) {
  const next = { ...prefsSnapshot(), ...patch };
  prefs = next;
  if (patch.volumeIndex != null) writeVolumeIndex(next.volumeIndex);
  if (patch.playMode != null) writePlayMode(next.playMode);
  if (patch.musicSource != null) writeMusicSource(next.musicSource);
  if (patch.crySource != null) writeCrySource(next.crySource);
  if (patch.sleepMinutes != null) writeSleepMinutes(next.sleepMinutes);
  if (patch.lastPlay !== undefined && patch.lastPlay) writeLastPlay(patch.lastPlay);
  for (const listener of prefsListeners) listener();
}
