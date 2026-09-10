"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, Home as HomeIcon, Pause, Play, RotateCcw, Settings2, Timer } from "lucide-react";
import { CozyBackdrop, ItemArt, PartyEgg, PlayBadge } from "@/components/art";
import { CoverImage, Portrait, RoomHero } from "@/components/cover";
import { FlashcardPlayer, ProgressDots } from "@/components/flashcard";
import { ParentPanel } from "@/components/parent-panel";
import { CareStrip, useCare } from "@/components/care-toys";
import { Welcome } from "@/components/welcome";
import { toyPlayer, type LineInfo } from "@/lib/audio";
import { useNightMode } from "@/lib/theme";
import {
  cardsFor,
  categories,
  enSongs,
  getCategory,
  getWorld,
  isLesson,
  itemPlace,
  playlist,
  poems,
  siblingId,
  storiesFor,
  worlds,
  zhSongs,
  type CategoryId,
  type LessonStep,
  type Poem,
  type Song,
  type Story,
  type WorldId,
} from "@/lib/content";
import {
  cycleMusicSource,
  cyclePlayMode,
  MUSIC_SOURCE_LABEL,
  PLAY_MODE_LABEL,
  readLastPlay,
  readMusicSource,
  readPlayMode,
  readSleepMinutes,
  readVolumeIndex,
  titleFor,
  writeHasPlayed,
  writeLastPlay,
  writeMusicSource,
  writePlayMode,
  writeSleepMinutes,
  writeVolumeIndex,
  type LastPlay,
  type MusicSource,
  type PlayMode,
} from "@/lib/progress";

type View =
  | { name: "welcome" }
  | { name: "home" }
  | { name: "world"; world: WorldId }
  | { name: "library"; category: CategoryId; world?: WorldId }
  | { name: "player"; category: CategoryId; itemId: string; world?: WorldId };

const VOLUME_STEPS = [0, 0.45, 0.82] as const;

function useTapQuiet(key: string, ms = 700) {
  const until = useRef(0);
  useEffect(() => {
    until.current = Date.now() + ms;
  }, [key, ms]);
  return (fn: () => void) => {
    if (Date.now() < until.current) return;
    fn();
  };
}

function listenItem(category: CategoryId, itemId: string) {
  if (category === "zh-songs") return zhSongs.find((s) => s.id === itemId);
  if (category === "en-songs") return enSongs.find((s) => s.id === itemId);
  if (category === "poems") return poems.find((s) => s.id === itemId);
  return storiesFor(category).find((s) => s.id === itemId);
}

export function ToyApp() {
  const [view, setView] = useState<View>({ name: "welcome" });
  const [line, setLine] = useState<LineInfo | null>(null);
  const [step, setStep] = useState<LessonStep | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volumeIndex, setVolumeIndex] = useState(2);
  const [volumeReady, setVolumeReady] = useState(false);
  const [lastPlay, setLastPlay] = useState<LastPlay | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>("chain");
  const [musicSource, setMusicSource] = useState<MusicSource>("netease");
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [parentOpen, setParentOpen] = useState(false);
  const { night, toggleNight } = useNightMode();
  const viewRef = useRef(view);
  const modeRef = useRef(playMode);
  const playItemRef = useRef<(category: CategoryId, itemId: string, world?: WorldId) => Promise<void>>(async () => {});
  const sleepTimer = useRef<number | null>(null);
  const playGen = useRef(0);
  const holdRef = useRef(false);
  const pinRef = useRef<string | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const allowWelcome = useTapQuiet("welcome", 1000);
  viewRef.current = view;
  modeRef.current = playMode;

  const cancelAdvance = () => {
    if (advanceTimer.current != null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  useEffect(() => {
    toyPlayer.onLine = (info) => setLine(info);
    toyPlayer.onStep = (next) => setStep(next);
    toyPlayer.onEnded = (kind) => {
      setPlaying(false);
      if (kind === "tap" || holdRef.current || pinRef.current) {
        cancelAdvance();
        return;
      }
      const current = viewRef.current;
      if (current.name !== "player") return;
      if (modeRef.current === "once") return;
      const gen = playGen.current;
      cancelAdvance();
      const delay = 2400;
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        if (holdRef.current || pinRef.current || playGen.current !== gen) return;
        if (modeRef.current === "loop") {
          void playItemRef.current(current.category, current.itemId, current.world);
          return;
        }
        const next = siblingId(current.category, current.itemId, 1);
        if (next) void playItemRef.current(current.category, next, current.world);
      }, delay);
    };
    return () => {
      toyPlayer.onLine = null;
      toyPlayer.onEnded = null;
      toyPlayer.onStep = null;
      toyPlayer.stop();
      if (sleepTimer.current) window.clearTimeout(sleepTimer.current);
    };
  }, []);

  useEffect(() => {
    setLastPlay(readLastPlay());
    setVolumeIndex(readVolumeIndex(2));
    setPlayMode(readPlayMode());
    setSleepMinutes(readSleepMinutes());
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    const nextSource = source === "local" || source === "netease" ? source : readMusicSource();
    setMusicSource(nextSource);
    writeMusicSource(nextSource);
    setVolumeReady(true);
    const go = params.get("go");
    if (go === "home") {
      setView({ name: "home" });
      return;
    }
    if (go === "welcome") {
      setView({ name: "welcome" });
      return;
    }
    if (go === "fables") {
      setView({ name: "library", category: "stories" });
      return;
    }
    if (go && worlds.some((w) => w.id === go)) {
      setView({ name: "world", world: go as WorldId });
      return;
    }
    if (go && categories.some((c) => c.id === go)) {
      setView({ name: "library", category: go as CategoryId });
      return;
    }
  }, []);

  useEffect(() => {
    toyPlayer.setVolume(VOLUME_STEPS[volumeIndex]);
    if (volumeReady) writeVolumeIndex(volumeIndex);
  }, [volumeIndex, volumeReady]);

  useEffect(() => {
    toyPlayer.setSource(musicSource);
  }, [musicSource]);

  const armSleep = useCallback((minutes: number) => {
    if (sleepTimer.current) window.clearTimeout(sleepTimer.current);
    if (!minutes) {
      setSleepEndsAt(null);
      return;
    }
    const ends = Date.now() + minutes * 60 * 1000;
    setSleepEndsAt(ends);
    sleepTimer.current = window.setTimeout(() => {
      void toyPlayer.sayGoodnight();
      setPlaying(false);
      setSleepEndsAt(null);
    }, minutes * 60 * 1000);
  }, []);

  useEffect(() => {
    if (!sleepEndsAt) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 15000);
    setNowTick(Date.now());
    return () => window.clearInterval(id);
  }, [sleepEndsAt]);

  const remainingLabel = sleepEndsAt
    ? Math.max(0, Math.ceil((sleepEndsAt - (nowTick || Date.now())) / 60000))
    : null;
  const remainingText =
    remainingLabel === null ? null : remainingLabel <= 0 ? "马上停" : `${remainingLabel}分`;

  const playItem = useCallback(async (
    category: CategoryId,
    itemId: string,
    world?: WorldId,
    source: "user" | "chain" = "user",
  ) => {
    if (source === "chain" && (holdRef.current || pinRef.current)) return;
    if (source === "user") {
      holdRef.current = false;
      pinRef.current = null;
      cancelAdvance();
    }
    const gen = ++playGen.current;
    toyPlayer.stop();
    await toyPlayer.unlock();
    if (gen !== playGen.current || (source === "chain" && (holdRef.current || pinRef.current))) return;
    toyPlayer.tap();
    if (source === "chain" && (holdRef.current || pinRef.current)) return;
    writeHasPlayed();
    setLine(null);
    setStep(null);
    setPlaying(true);
    const last = { category, itemId, title: titleFor(category, itemId), world };
    writeLastPlay(last);
    setLastPlay(last);
    setView({ name: "player", category, itemId, world });
    armSleep(sleepMinutes);
    if (isLesson(category)) {
      const card = cardsFor(category).find((c) => c.id === itemId);
      if (card && gen === playGen.current && !holdRef.current && !pinRef.current) await toyPlayer.playLesson(card);
      return;
    }
    if (category === "zh-songs" || category === "en-songs") {
      const song = (category === "zh-songs" ? zhSongs : enSongs).find((s) => s.id === itemId);
      if (song && gen === playGen.current) await toyPlayer.playSong(song);
      return;
    }
    if (category === "poems") {
      const poem = poems.find((s) => s.id === itemId);
      if (poem && gen === playGen.current) await toyPlayer.playPoem(poem);
      return;
    }
    const story = storiesFor(category).find((s) => s.id === itemId);
    if (story && gen === playGen.current) await toyPlayer.playStory(story);
  }, [armSleep, sleepMinutes]);

  playItemRef.current = (category, itemId, world) => playItem(category, itemId, world, "chain");

  const start = useCallback(async () => {
    await playItem("animals", "dog");
  }, [playItem]);

  const talk = useCallback(async (text: string) => {
    await toyPlayer.unlock();
    toyPlayer.tap();
    await toyPlayer.sayLine(text);
  }, []);

  const tapCard = useCallback(async (category: CategoryId, itemId: string) => {
    cancelAdvance();
    holdRef.current = true;
    pinRef.current = `${category}:${itemId}`;
    playGen.current += 1;
    toyPlayer.stop();
    await toyPlayer.unlock();
    toyPlayer.tap();
    setPlaying(true);
    setView((current) =>
      current.name === "player" ? { ...current, category, itemId } : { name: "player", category, itemId }
    );
    armSleep(sleepMinutes);
    const card = cardsFor(category).find((c) => c.id === itemId);
    if (card) await toyPlayer.playCry(card);
  }, [armSleep, sleepMinutes]);

  const stop = useCallback(() => {
    cancelAdvance();
    playGen.current += 1;
    holdRef.current = true;
    const current = viewRef.current;
    if (current.name === "player") pinRef.current = `${current.category}:${current.itemId}`;
    toyPlayer.stop();
    setPlaying(false);
  }, []);

  const goHome = useCallback(() => {
    stop();
    setView({ name: "home" });
  }, [stop]);

  const goWorld = useCallback(
    (world: WorldId) => {
      stop();
      setView({ name: "world", world });
    },
    [stop]
  );

  const goLibrary = useCallback(
    (category: CategoryId, world?: WorldId) => {
      stop();
      setView({ name: "library", category, world });
    },
    [stop]
  );

  const tools = (
    <div className="flex shrink-0 items-center gap-2">
      {remainingText && (
        <span className="status-chip" aria-label={`定时还剩 ${remainingText}`}>
          <Timer className="size-4" />
          {remainingText}
        </span>
      )}
      {view.name !== "home" && view.name !== "welcome" && (
        <button type="button" onClick={goHome} className="glass-chip" aria-label="回乐园">
          <HomeIcon className="size-5" />
        </button>
      )}
      <button type="button" onClick={() => setParentOpen(true)} className="glass-chip" aria-label="家长设置">
        <Settings2 className="size-5" />
        家长
      </button>
    </div>
  );

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden">
      {view.name !== "welcome" && <CozyBackdrop />}

      {view.name === "welcome" && (
        <Welcome
          onStart={() => allowWelcome(() => void start())}
          night={night}
          onToggleNight={toggleNight}
          onOpenParent={() => setParentOpen(true)}
          onTalk={(text) => void talk(text)}
        />
      )}
      {view.name === "home" && (
        <Home
          volume={tools}
          lastPlay={lastPlay}
          playMode={playMode}
          sleepMinutes={sleepMinutes}
          onPlayDog={() => void playItem("animals", "dog")}
          onContinue={(item) => void playItem(item.category, item.itemId, item.world)}
          onOpenWorld={goWorld}
          onTalk={(text) => void talk(text)}
          night={night}
        />
      )}
      {view.name === "world" && (
        <WorldGate
          worldId={view.world}
          volume={tools}
          onBack={goHome}
          onOpen={goLibrary}
          onPlayFirst={() => {
            const firstRoom = getWorld(view.world).rooms[0];
            const first = playlist(firstRoom)[0];
            if (first) void playItem(firstRoom, first.id, view.world);
          }}
        />
      )}
      {view.name === "library" && (
        <Library
          category={view.category}
          backLabel={view.world ? getWorld(view.world).title : "乐园"}
          lastId={lastPlay?.category === view.category ? lastPlay.itemId : null}
          onBack={() => (view.world ? goWorld(view.world) : goHome())}
          onPlay={(id) => void playItem(view.category, id, view.world)}
          volume={tools}
        />
      )}
      {view.name === "player" && isLesson(view.category) && (
        <LessonView
          category={view.category}
          itemId={view.itemId}
          step={step}
          playing={playing}
          volume={tools}
          onBack={() => goLibrary(view.category, view.world)}
          onOpen={(id) => void playItem(view.category, id, view.world)}
          onTap={() => void tapCard(view.category, view.itemId)}
          onStop={stop}
          onReplay={() => void playItem(view.category, view.itemId, view.world)}
        />
      )}
      {view.name === "player" && !isLesson(view.category) && (
        <Player
          category={view.category}
          itemId={view.itemId}
          line={line}
          playing={playing}
          onBack={() => goLibrary(view.category, view.world)}
          onStop={stop}
          onReplay={() => void playItem(view.category, view.itemId, view.world)}
          onPrev={() => {
            const id = siblingId(view.category, view.itemId, -1);
            if (id) void playItem(view.category, id, view.world);
          }}
          onNext={() => {
            const id = siblingId(view.category, view.itemId, 1);
            if (id) void playItem(view.category, id, view.world);
          }}
          volume={tools}
          playMode={playMode}
          musicSource={musicSource}
        />
      )}

      <ParentPanel
        open={parentOpen}
        night={night}
        volumeIndex={volumeIndex}
        playMode={playMode}
        musicSource={musicSource}
        sleepMinutes={sleepMinutes}
        remainingLabel={remainingText}
        onClose={() => setParentOpen(false)}
        onToggleNight={toggleNight}
        onCycleVolume={() => setVolumeIndex((i) => (i + 1) % VOLUME_STEPS.length)}
        onCycleMode={() => {
          setPlayMode((mode) => {
            const next = cyclePlayMode(mode);
            writePlayMode(next);
            return next;
          });
        }}
        onCycleSource={() => {
          setMusicSource((source) => {
            const next = cycleMusicSource(source);
            writeMusicSource(next);
            return next;
          });
        }}
        onSleepMinutes={(minutes) => {
          writeSleepMinutes(minutes);
          setSleepMinutes(minutes);
          armSleep(minutes);
        }}
      />
    </div>
  );
}

function Home({
  volume,
  lastPlay,
  playMode,
  sleepMinutes,
  onPlayDog,
  onContinue,
  onOpenWorld,
  onTalk,
  night,
}: {
  volume: ReactNode;
  lastPlay: LastPlay | null;
  playMode: PlayMode;
  sleepMinutes: number;
  onPlayDog: () => void;
  onContinue: (item: LastPlay) => void;
  onOpenWorld: (id: WorldId) => void;
  onTalk: (text: string) => void;
  night: boolean;
}) {
  const allow = useTapQuiet("home");
  const care = useCare(night);
  const showContinue = Boolean(lastPlay && !(lastPlay.category === "animals" && lastPlay.itemId === "dog"));
  const status = [
    PLAY_MODE_LABEL[playMode],
    sleepMinutes ? `${sleepMinutes}分后停下` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="page-shell party-lobby relative z-10 mx-auto flex w-full flex-1 flex-col overflow-y-auto px-3 pb-6">
      <section className="party-hud">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="party-egg-wrap">
            <PartyEgg className="h-12 w-12" />
          </span>
          <div className="min-w-0">
            <p className="home-brand">蛋仔乐园</p>
            <h1 className="party-hello truncate">{greeting()}</h1>
            <p className="ink-soft truncate text-[11px] font-semibold">{status}</p>
          </div>
        </div>
        {volume}
      </section>
      <CareStrip care={care} onTalk={(text) => allow(() => onTalk(text))} />

      {showContinue && lastPlay && (
        <button type="button" onClick={() => allow(() => onContinue(lastPlay))} className="party-continue">
          <PlayBadge className="h-9 w-9" />
          <span className="min-w-0 text-left">
            <span className="block text-[11px] font-bold text-[var(--ink-soft)]">接着听</span>
            <span className="ink block truncate text-[17px] font-black">{lastPlay.title}</span>
          </span>
        </button>
      )}

      <button type="button" onClick={() => allow(onPlayDog)} className="party-stage">
        <span className="party-stage-island">
          <CoverImage src="/art/hero-dog.png" alt="小狗" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="party-badge">派对开场</span>
          <span className="party-stage-title">小狗软软地叫</span>
          <span className="ink-soft mt-0.5 block text-[13px] font-bold">狗 → dog → 轻轻的汪汪</span>
          <span className="party-cta">
            <PlayBadge className="h-7 w-7" />
            点一下就叫
          </span>
        </span>
      </button>

      <p className="party-label">还想听</p>
      <div className="flex flex-col gap-3">
        {worlds.map((world, index) => (
          <button
            key={world.id}
            type="button"
            onClick={() => allow(() => onOpenWorld(world.id))}
            className={`party-gate gate-${index}`}
            style={{
              ["--room-shadow" as string]: world.shadow,
              ["--door-tint" as string]: world.tint,
            }}
          >
            <span className="party-gate-art">
              <CoverImage src={world.hero} alt={world.title} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="ink block text-[18px] font-black leading-tight">{world.title}</span>
              <span className="ink-soft mt-0.5 block text-xs font-bold">{world.hint}</span>
            </span>
            <span className="party-gate-go">进</span>
          </button>
        ))}
      </div>

      <p className="ink-soft mt-5 text-center text-xs font-bold">陪着听一遍，宝宝会跟着张嘴</p>
    </main>
  );
}

function WorldGate({
  worldId,
  volume,
  onBack,
  onOpen,
  onPlayFirst,
}: {
  worldId: WorldId;
  volume: ReactNode;
  onBack: () => void;
  onOpen: (id: CategoryId, world: WorldId) => void;
  onPlayFirst: () => void;
}) {
  const allow = useTapQuiet(worldId);
  const world = getWorld(worldId);
  const rooms = world.rooms.map((id) => getCategory(id));

  return (
    <main className="page-shell relative z-10 mx-auto flex w-full flex-1 flex-col overflow-y-auto px-3 pb-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          乐园
        </button>
        {volume}
      </header>

      <section className="island-card party-hero mt-4 overflow-hidden">
        <div className="party-hero-band flex items-center gap-3 px-3 py-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl p-1.5" style={{ background: world.tint }}>
            <CoverImage src={world.hero} alt={world.title} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="ink-soft text-xs font-bold tracking-wider">点一张，就开始听</p>
            <h1 className="ink text-2xl font-black">{world.title}</h1>
            <p className="ink-soft text-sm font-medium">{world.hint}</p>
          </div>
        </div>
        <button type="button" onClick={() => allow(onPlayFirst)} className="playall-btn">
          <PlayBadge className="h-8 w-8" />
          先听一张
        </button>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        {rooms.map((cat) => (
          <RoomButton key={cat.id} cat={cat} onOpen={(id) => allow(() => onOpen(id, worldId))} />
        ))}
      </div>
    </main>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
}

function homeHint() {
  const h = new Date().getHours();
  if (h >= 19 || h < 7) return "夜里先听一个短故事，再睡觉";
  if (h < 11) return "早上先听小狗，再认一认";
  return "点最大的卡片，右上角给大人";
}

function RoomButton({
  cat,
  onOpen,
}: {
  cat: (typeof categories)[number];
  onOpen: (id: CategoryId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(cat.id)}
      className="room-tile text-left"
      style={{ ["--room-shadow" as string]: cat.shadow }}
    >
      <span className="block rounded-[1.7rem] bg-[var(--bg)] p-2.5">
        <span className="relative block overflow-hidden rounded-[1.3rem]">
          <RoomHero src={cat.hero} tint={cat.tint} alt={cat.title} />
        </span>
        <span className="mt-2 flex items-center justify-between gap-1 px-1 pb-0.5">
          <span className="min-w-0">
            <span className="ink block truncate text-[17px] font-black leading-tight">
              {cat.title}
            </span>
            <span className="ink-soft block truncate text-[11px] font-bold">{cat.place}</span>
          </span>
          <PlayBadge className="h-8 w-8 shrink-0" />
        </span>
      </span>
    </button>
  );
}

function Library({
  category,
  backLabel,
  lastId,
  onBack,
  onPlay,
  volume,
}: {
  category: CategoryId;
  backLabel: string;
  lastId: string | null;
  onBack: () => void;
  onPlay: (id: string) => void;
  volume: ReactNode;
}) {
  const allow = useTapQuiet(category);
  const cat = getCategory(category);
  const lesson = isLesson(category);
  const cards = lesson ? cardsFor(category) : [];
  const songs = category === "zh-songs" ? zhSongs : category === "en-songs" ? enSongs : [];
  const poemItems = category === "poems" ? poems : [];
  const taleItems = storiesFor(category);
  const first = playlist(category)[0];
  const unit = category === "animals" ? "只" : lesson ? "张" : "首";

  return (
    <main className="page-shell relative z-10 mx-auto flex w-full flex-1 flex-col overflow-y-auto px-3 pb-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          {backLabel}
        </button>
        {volume}
      </header>

      <section className="island-card party-hero mt-4 overflow-hidden">
        <div className="party-hero-band flex items-center gap-3 px-3 py-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl p-1.5" style={{ background: cat.tint }}>
            <CoverImage src={cat.hero} alt={cat.title} />
          </span>
          <div>
            <p className="ink-soft font-rounded text-xs font-bold tracking-wider">{cat.english}</p>
            <h1 className="ink text-2xl font-black">{cat.place}</h1>
            <p className="ink-soft text-sm font-medium">{cat.hint}</p>
          </div>
        </div>
      </section>

      {first && (
        <button type="button" onClick={() => allow(() => onPlay(first.id))} className="playall-btn mt-4">
          <PlayBadge className="h-8 w-8" />
          从第一{unit}听
        </button>
      )}

      {lesson && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <button type="button" onClick={() => allow(() => onPlay(card.id))} className={`island-card w-full text-left ${lastId === card.id ? "now-card" : ""}`}>
                <span className="relative block aspect-square overflow-hidden">
                  <Portrait card={card} className="h-full w-full" />
                  {lastId === card.id ? (
                    <span className="hero-tile-badge absolute left-2 top-2">上次听</span>
                  ) : category === "animals" && card.id === "dog" ? (
                    <span className="hero-tile-badge absolute left-2 top-2">先听</span>
                  ) : null}
                  <span className="absolute bottom-2 right-2">
                    <PlayBadge className="h-9 w-9" />
                  </span>
                </span>
                <span className="block bg-[var(--bg)] px-2.5 py-2.5">
                  <span className="ink block text-[15px] font-black">{card.zh}</span>
                  <span className="ink-mute text-xs font-medium">
                    {card.en}
                    {card.cry ? ` · ${card.cry}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!lesson && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(songs.length ? songs : poemItems.length ? poemItems : taleItems).map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => allow(() => onPlay(item.id))} className={`island-card w-full text-left ${lastId === item.id ? "now-card" : ""}`}>
                <span className="relative block aspect-square overflow-hidden" style={{ background: item.color }}>
                  {"image" in item && item.image ? (
                    <CoverImage src={item.image} alt={item.title} className="p-3" />
                  ) : (
                    <ItemArt id={item.id} />
                  )}
                  {lastId === item.id && (
                    <span className="hero-tile-badge absolute left-2 top-2">上次听</span>
                  )}
                  <span className="absolute bottom-2 right-2">
                    <PlayBadge className="h-9 w-9" />
                  </span>
                </span>
                <span className="block bg-[var(--bg)] px-2.5 py-2.5">
                  <span className="ink block text-[15px] font-black">{item.title}</span>
                  <span className="ink-mute text-xs font-medium">
                    {"subtitle" in item ? item.subtitle : "author" in item ? item.author : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function LessonView({
  category,
  itemId,
  step,
  playing,
  volume,
  onBack,
  onOpen,
  onTap,
  onStop,
  onReplay,
}: {
  category: CategoryId;
  itemId: string;
  step: LessonStep | null;
  playing: boolean;
  volume: ReactNode;
  onBack: () => void;
  onOpen: (id: string) => void;
  onTap: () => void;
  onStop: () => void;
  onReplay: () => void;
}) {
  const list = cardsFor(category);
  const index = list.findIndex((c) => c.id === itemId);
  const card = list[index];
  if (!card) return null;
  const canFlip = list.length > 1;

  return (
    <FlashcardPlayer
      category={category}
      card={card}
      step={step}
      playing={playing}
      index={index}
      total={list.length}
      hasPrev={canFlip}
      hasNext={canFlip}
      onBack={onBack}
      onPrev={() => canFlip && onOpen(list[(index - 1 + list.length) % list.length]!.id)}
      onNext={() => canFlip && onOpen(list[(index + 1) % list.length]!.id)}
      onTap={() => onTap()}
      onStop={onStop}
      onReplayAll={onReplay}
      volume={volume}
    />
  );
}

function Player({
  category,
  itemId,
  line,
  playing,
  onBack,
  onStop,
  onReplay,
  onPrev,
  onNext,
  volume,
  playMode,
  musicSource,
}: {
  category: CategoryId;
  itemId: string;
  line: LineInfo | null;
  playing: boolean;
  onBack: () => void;
  onStop: () => void;
  onReplay: () => void;
  onPrev: () => void;
  onNext: () => void;
  volume: ReactNode;
  playMode: PlayMode;
  musicSource: MusicSource;
}) {
  const ignoreStopUntil = useRef(0);
  const allow = useTapQuiet(itemId, 1400);
  useEffect(() => {
    ignoreStopUntil.current = Date.now() + 1400;
  }, [itemId]);
  const cat = getCategory(category);
  const item = listenItem(category, itemId);
  if (!item) return null;
  const song = category === "zh-songs" || category === "en-songs" ? (item as Song) : null;
  const poem = category === "poems" ? (item as Poem) : null;
  const story = category === "stories" || category === "tales" ? (item as Story) : null;
  const cover = ("image" in item && item.image) || cat.hero;
  const place = itemPlace(category, itemId);

  return (
    <main className="page-shell relative z-10 mx-auto flex w-full flex-1 flex-col px-3 pb-5">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => allow(onBack)} className="glass-chip">
          <ChevronLeft className="size-5" />
          {cat.place}
        </button>
        {volume}
      </header>
      <section className="island-card party-play relative mt-4 flex flex-1 flex-col overflow-hidden">
        <div className="party-play-band flex flex-1 flex-col items-center px-3 py-4 text-center">
          <button
            type="button"
            onClick={() => {
              if (playing && Date.now() < ignoreStopUntil.current) return;
              if (playing) onStop();
              else onReplay();
            }}
            className={`cover-hit party-cover relative h-[var(--hero)] w-[var(--hero)] overflow-hidden p-1.5 ${playing ? "animate-[bob_4s_ease-in-out_infinite]" : ""}`}
            aria-label={playing ? "点图停下" : "点图再听"}
          >
            <CoverImage src={cover} alt={item.title} />
            <span className="cover-play">
              {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
            </span>
          </button>
          <p className="ink-mute mt-3 text-xs font-bold tracking-wider">
            {place.total > 1 ? `${place.index + 1} / ${place.total}` : poem ? poem.author : cat.title}
            {playing ? " · 正在听" : ""}
          </p>
          <h1 className="ink mt-1 text-2xl font-black">{item.title}</h1>
          <p className="ink-soft mt-1 text-xs font-bold">
            点图{playing ? "停下" : "再听"}
            {song ? ` · ${MUSIC_SOURCE_LABEL[musicSource]}` : ""} · {PLAY_MODE_LABEL[playMode]}
          </p>
          <ProgressDots total={place.total} index={place.index} />
          {song && musicSource === "netease" && (
            <div id="bao-netease-slot" className="netease-slot" hidden={!playing} />
          )}
          {line?.kind === "fun" && (
            <p className="mt-2 rounded-full bg-[var(--bg)] px-3 py-1 text-xs font-black text-[var(--accent-deep)]">好玩的翻译</p>
          )}
          <div className="story-page mt-4 w-full max-w-md">
            {line ? (
              <p className="ink text-lg font-bold leading-relaxed" lang={line.lang}>
                {line.text}
              </p>
            ) : (
              <p className="ink-mute text-base font-medium">
                {playing ? "正在听…" : poem ? "先背古诗，再听好玩的话" : story?.subtitle ?? "听完啦，再听一遍或下一首"}
              </p>
            )}
            {song && line && <p className="ink-mute mt-2 text-xs font-medium">{song.subtitle}</p>}
          </div>
        </div>
      </section>
      <div className="mt-5 flex items-center justify-center gap-4">
        <button type="button" onClick={() => allow(onStop)} disabled={!playing} className="control-round stop" aria-label="停下">
          <Pause className="size-7 fill-current" />
        </button>
        <button type="button" onClick={() => allow(onReplay)} className="control-round replay" aria-label="再听一遍">
          <RotateCcw className="size-7" />
        </button>
      </div>
      {place.total > 1 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => allow(onPrev)} className="nav-pill">
            上一首
          </button>
          <button type="button" onClick={() => allow(onNext)} className="nav-pill">
            下一首
          </button>
        </div>
      )}
    </main>
  );
}
