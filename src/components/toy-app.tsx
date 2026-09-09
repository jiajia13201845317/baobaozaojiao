"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Moon, Pause, RotateCcw, Sun, Volume1, Volume2, VolumeX } from "lucide-react";
import { CozyBackdrop, ItemArt, Mascot, PlayBadge } from "@/components/art";
import { CoverImage, Portrait, RoomHero } from "@/components/cover";
import { FlashcardPlayer } from "@/components/flashcard";
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
import { readLastPlay, readVolumeIndex, titleFor, writeLastPlay, writeVolumeIndex, type LastPlay } from "@/lib/progress";

type View =
  | { name: "welcome" }
  | { name: "home" }
  | { name: "world"; world: WorldId }
  | { name: "library"; category: CategoryId; world?: WorldId }
  | { name: "player"; category: CategoryId; itemId: string; world?: WorldId };

const VOLUME_STEPS = [0, 0.45, 0.82] as const;

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
  const { night, toggleNight } = useNightMode();

  useEffect(() => {
    toyPlayer.onLine = (info) => setLine(info);
    toyPlayer.onEnded = () => setPlaying(false);
    toyPlayer.onStep = (next) => setStep(next);
    return () => {
      toyPlayer.onLine = null;
      toyPlayer.onEnded = null;
      toyPlayer.onStep = null;
      toyPlayer.stop();
    };
  }, []);

  useEffect(() => {
    setLastPlay(readLastPlay());
    setVolumeIndex(readVolumeIndex(2));
    setVolumeReady(true);
    const go = new URLSearchParams(window.location.search).get("go");
    if (go === "home") {
      setView({ name: "home" });
      return;
    }
    if (go && worlds.some((w) => w.id === go)) {
      setView({ name: "world", world: go as WorldId });
      return;
    }
    if (go && categories.some((c) => c.id === go)) {
      setView({ name: "library", category: go as CategoryId });
    }
  }, []);

  useEffect(() => {
    toyPlayer.setVolume(VOLUME_STEPS[volumeIndex]);
    if (volumeReady) writeVolumeIndex(volumeIndex);
  }, [volumeIndex, volumeReady]);

  const playItem = useCallback(async (category: CategoryId, itemId: string, world?: WorldId) => {
    await toyPlayer.unlock();
    setLine(null);
    setStep(null);
    setPlaying(true);
    const last = { category, itemId, title: titleFor(category, itemId), world };
    writeLastPlay(last);
    setLastPlay(last);
    setView({ name: "player", category, itemId, world });
    if (isLesson(category)) {
      const card = cardsFor(category).find((c) => c.id === itemId);
      if (card) await toyPlayer.playLesson(card);
      return;
    }
    if (category === "zh-songs" || category === "en-songs") {
      const song = (category === "zh-songs" ? zhSongs : enSongs).find((s) => s.id === itemId);
      if (song) await toyPlayer.playSong(song);
      return;
    }
    if (category === "poems") {
      const poem = poems.find((s) => s.id === itemId);
      if (poem) await toyPlayer.playPoem(poem);
      return;
    }
    const story = storiesFor(category).find((s) => s.id === itemId);
    if (story) await toyPlayer.playStory(story);
  }, []);

  const start = useCallback(async () => {
    await playItem("animals", "dog");
  }, [playItem]);

  const tapCard = useCallback(async (category: CategoryId, itemId: string) => {
    await toyPlayer.unlock();
    setPlaying(true);
    const card = cardsFor(category).find((c) => c.id === itemId);
    if (card) await toyPlayer.playCry(card);
  }, []);

  const stop = useCallback(() => {
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
      <NightChip night={night} onClick={toggleNight} />
      <VolumeChip
        index={volumeIndex}
        onClick={() => setVolumeIndex((i) => (i + 1) % VOLUME_STEPS.length)}
      />
    </div>
  );

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden">
      {view.name !== "welcome" && <CozyBackdrop />}

      {view.name === "welcome" && (
        <Welcome onStart={start} night={night} onToggleNight={toggleNight} />
      )}
      {view.name === "home" && (
        <Home
          volume={tools}
          lastPlay={lastPlay}
          onPlayDog={() => void playItem("animals", "dog")}
          onContinue={(item) => void playItem(item.category, item.itemId, item.world)}
          onOpenWorld={goWorld}
        />
      )}
      {view.name === "world" && (
        <WorldGate worldId={view.world} volume={tools} onBack={goHome} onOpen={goLibrary} />
      )}
      {view.name === "library" && (
        <Library
          category={view.category}
          backLabel={view.world ? getWorld(view.world).title : "乐园"}
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
        />
      )}
    </div>
  );
}

function NightChip({ night, onClick }: { night: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={night ? "关掉夜间模式" : "打开夜间模式"} className="glass-chip">
      {night ? <Sun className="size-5" /> : <Moon className="size-5" />}
      <span className="hidden sm:inline">{night ? "白天" : "夜里"}</span>
    </button>
  );
}

function VolumeChip({ index, onClick }: { index: number; onClick: () => void }) {
  const Icon = index === 0 ? VolumeX : index === 1 ? Volume1 : Volume2;
  const label = index === 0 ? "静音" : index === 1 ? "小声" : "大声";
  return (
    <button type="button" onClick={onClick} aria-label={`音量：${label}，点一下切换`} className="glass-chip">
      <Icon className="size-5" />
      <span>{label}</span>
    </button>
  );
}

function Home({
  volume,
  lastPlay,
  onPlayDog,
  onContinue,
  onOpenWorld,
}: {
  volume: ReactNode;
  lastPlay: LastPlay | null;
  onPlayDog: () => void;
  onContinue: (item: LastPlay) => void;
  onOpenWorld: (id: WorldId) => void;
}) {
  const showContinue = Boolean(lastPlay && !(lastPlay.category === "animals" && lastPlay.itemId === "dog"));

  return (
    <main className="page-shell relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col overflow-y-auto px-4 pb-12 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--bg)] shadow-[0_8px_18px_var(--shadow)]">
            <Mascot pose="wave" className="h-14 w-14" />
          </div>
          <div className="min-w-0">
            <h1 className="ink truncate text-[26px] font-black leading-tight">
              宝宝，{greeting()}
            </h1>
            <p className="ink-soft truncate text-sm font-bold">想听就点最大的卡片</p>
          </div>
        </div>
        {volume}
      </header>

      {showContinue && lastPlay && (
        <button type="button" onClick={() => onContinue(lastPlay)} className="continue-chip mt-5">
          <PlayBadge className="h-9 w-9" />
          <span className="min-w-0 text-left">
            <span className="block text-[11px] font-bold text-[var(--ink-soft)]">接着听</span>
            <span className="ink block truncate text-[17px] font-black">{lastPlay.title}</span>
          </span>
        </button>
      )}

      <button type="button" onClick={onPlayDog} className={`hero-tile text-left ${showContinue ? "mt-3" : "mt-5"}`}>
        <span className="hero-tile-inner">
          <span className="hero-tile-art">
            <CoverImage src="/art/hero-dog.png" alt="小狗" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="hero-tile-badge">先听这个</span>
            <span className="ink mt-1.5 block text-[26px] font-black leading-tight">小狗汪汪汪</span>
            <span className="ink-soft mt-1 block text-[15px] font-bold">狗 → dog → 汪汪汪</span>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--bg)] px-3 py-1.5 shadow-sm">
              <PlayBadge className="h-8 w-8" />
              <span className="pr-1 text-sm font-black text-[var(--accent-deep)]">点一下就叫</span>
            </span>
          </span>
        </span>
      </button>

      <p className="ink mt-7 text-lg font-black">还想听什么</p>
      <p className="ink-soft mb-3 text-sm font-bold">进一扇门就好</p>
      <div className="flex flex-col gap-3">
        {worlds.map((world) => (
          <button
            key={world.id}
            type="button"
            onClick={() => onOpenWorld(world.id)}
            className="world-door"
            style={{ ["--room-shadow" as string]: world.shadow }}
          >
            <span className="world-door-art" style={{ background: world.tint }}>
              <CoverImage src={world.hero} alt={world.title} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="ink block text-[22px] font-black leading-tight">{world.title}</span>
              <span className="ink-soft mt-0.5 block text-sm font-bold">{world.hint}</span>
            </span>
            <PlayBadge className="h-10 w-10 shrink-0" />
          </button>
        ))}
      </div>

      <p className="ink-soft mt-8 text-center text-sm font-bold">陪宝宝一起听，效果最好</p>
    </main>
  );
}

function WorldGate({
  worldId,
  volume,
  onBack,
  onOpen,
}: {
  worldId: WorldId;
  volume: ReactNode;
  onBack: () => void;
  onOpen: (id: CategoryId, world: WorldId) => void;
}) {
  const world = getWorld(worldId);
  const rooms = world.rooms.map((id) => getCategory(id));

  return (
    <main className="page-shell relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col overflow-y-auto px-4 pb-12 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          乐园
        </button>
        {volume}
      </header>

      <section className="island-card mt-4 overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-3" style={{ background: world.tint }}>
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-[var(--bg)] p-2">
            <CoverImage src={world.hero} alt={world.title} />
          </span>
          <div>
            <p className="ink-soft text-xs font-bold tracking-wider">点一张，就开始听</p>
            <h1 className="ink text-2xl font-black">{world.title}</h1>
            <p className="ink-soft text-sm font-medium">{world.hint}</p>
          </div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        {rooms.map((cat) => (
          <RoomButton key={cat.id} cat={cat} onOpen={(id) => onOpen(id, worldId)} />
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
  onBack,
  onPlay,
  volume,
}: {
  category: CategoryId;
  backLabel: string;
  onBack: () => void;
  onPlay: (id: string) => void;
  volume: ReactNode;
}) {
  const cat = getCategory(category);
  const lesson = isLesson(category);
  const cards = lesson ? cardsFor(category) : [];
  const songs = category === "zh-songs" ? zhSongs : category === "en-songs" ? enSongs : [];
  const poemItems = category === "poems" ? poems : [];
  const taleItems = storiesFor(category);

  return (
    <main className="page-shell relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto px-4 pb-10 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          {backLabel}
        </button>
        {volume}
      </header>

      <section className="island-card mt-4 overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-3" style={{ background: cat.tint }}>
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-[var(--bg)] p-2">
            <CoverImage src={cat.hero} alt={cat.title} />
          </span>
          <div>
            <p className="ink-soft font-rounded text-xs font-bold tracking-wider">{cat.english}</p>
            <h1 className="ink text-2xl font-black">{cat.place}</h1>
            <p className="ink-soft text-sm font-medium">{cat.hint}</p>
          </div>
        </div>
      </section>

      {lesson && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <button type="button" onClick={() => onPlay(card.id)} className="island-card w-full text-left">
                <span className="relative block aspect-square overflow-hidden">
                  <Portrait card={card} className="h-full w-full" />
                  {category === "animals" && card.id === "dog" && (
                    <span className="hero-tile-badge absolute left-2 top-2">先听</span>
                  )}
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
              <button type="button" onClick={() => onPlay(item.id)} className="island-card w-full text-left">
                <span className="relative block aspect-square overflow-hidden" style={{ background: item.color }}>
                  {"image" in item && item.image ? (
                    <CoverImage src={item.image} alt={item.title} className="p-3" />
                  ) : (
                    <ItemArt id={item.id} />
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
      onTap={onTap}
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
}) {
  const cat = getCategory(category);
  const item = listenItem(category, itemId);
  if (!item) return null;
  const song = category === "zh-songs" || category === "en-songs" ? (item as Song) : null;
  const poem = category === "poems" ? (item as Poem) : null;
  const story = category === "stories" || category === "tales" ? (item as Story) : null;
  const cover = ("image" in item && item.image) || cat.hero;
  const place = itemPlace(category, itemId);

  return (
    <main className="page-shell relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          {cat.place}
        </button>
        {volume}
      </header>
      <section className="island-card relative mt-4 flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col items-center px-5 py-6 text-center" style={{ background: cat.tint }}>
          <div className={`relative h-36 w-36 overflow-hidden rounded-[2rem] bg-[var(--bg)] p-2 shadow-[0_10px_22px_var(--shadow)] ${playing ? "animate-[bob_4s_ease-in-out_infinite]" : ""}`}>
            <CoverImage src={cover} alt={item.title} />
          </div>
          <p className="ink-mute mt-3 text-xs font-bold tracking-wider">
            {place.total > 1 ? `${place.index + 1} / ${place.total}` : poem ? poem.author : cat.title}
          </p>
          <h1 className="ink mt-1 text-3xl font-black">{item.title}</h1>
          {line?.kind === "fun" && (
            <p className="mt-2 rounded-full bg-[var(--bg)] px-3 py-1 text-xs font-black text-[var(--accent-deep)]">好玩的翻译</p>
          )}
          <div className="story-page mt-4 w-full max-w-md">
            {line ? (
              <p className="ink text-xl font-bold leading-relaxed" lang={line.lang}>
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
        <button type="button" onClick={onStop} disabled={!playing} className="control-round stop" aria-label="停下">
          <Pause className="size-7 fill-current" />
        </button>
        <button type="button" onClick={onReplay} className="control-round replay" aria-label="再听一遍">
          <RotateCcw className="size-7" />
        </button>
      </div>
      {place.total > 1 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onPrev} className="nav-pill">
            上一首
          </button>
          <button type="button" onClick={onNext} className="nav-pill">
            下一首
          </button>
        </div>
      )}
    </main>
  );
}
