"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Pause, RotateCcw, Volume1, Volume2, VolumeX } from "lucide-react";
import {
  Balloon,
  ItemArt,
  Mascot,
  PlayBadge,
  WorldBackdrop,
} from "@/components/art";
import { CoverImage, Portrait, RoomHero } from "@/components/cover";
import { FlashcardPlayer } from "@/components/flashcard";
import { toyPlayer, type LineInfo } from "@/lib/audio";
import {
  cardsFor,
  categories,
  enSongs,
  getCategory,
  isLesson,
  poems,
  storiesFor,
  zhSongs,
  type CategoryId,
  type LessonStep,
  type Poem,
  type Song,
  type Story,
} from "@/lib/content";

type View =
  | { name: "welcome" }
  | { name: "home" }
  | { name: "library"; category: CategoryId }
  | { name: "player"; category: CategoryId; itemId: string };

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
    toyPlayer.setVolume(VOLUME_STEPS[volumeIndex]);
  }, [volumeIndex]);

  const start = useCallback(async () => {
    await toyPlayer.unlock();
    setView({ name: "home" });
  }, []);

  const playItem = useCallback(async (category: CategoryId, itemId: string) => {
    await toyPlayer.unlock();
    setLine(null);
    setStep(null);
    setPlaying(true);
    setView({ name: "player", category, itemId });
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

  const goLibrary = useCallback(
    (category: CategoryId) => {
      stop();
      setView({ name: "library", category });
    },
    [stop]
  );

  const volumeChip = (
    <VolumeChip
      index={volumeIndex}
      onClick={() => setVolumeIndex((i) => (i + 1) % VOLUME_STEPS.length)}
    />
  );

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden">
      <WorldBackdrop />
      <Balloon color="#FF6B4A" className="pointer-events-none absolute left-[8%] top-16 h-16 w-10 animate-[float_7s_ease-in-out_infinite] opacity-90" />
      <Balloon color="#5B7CFF" className="pointer-events-none absolute right-[10%] top-24 h-14 w-9 animate-[float_9s_ease-in-out_infinite_reverse] opacity-80" />

      {view.name === "welcome" && <Welcome onStart={start} />}
      {view.name === "home" && <Home volume={volumeChip} onOpen={goLibrary} />}
      {view.name === "library" && (
        <Library
          category={view.category}
          onBack={goHome}
          onPlay={(id) => void playItem(view.category, id)}
          volume={volumeChip}
        />
      )}
      {view.name === "player" && isLesson(view.category) && (
        <LessonView
          category={view.category}
          itemId={view.itemId}
          step={step}
          playing={playing}
          volume={volumeChip}
          onBack={() => goLibrary(view.category)}
          onOpen={(id) => void playItem(view.category, id)}
          onTap={() => void tapCard(view.category, view.itemId)}
          onReplay={() => void playItem(view.category, view.itemId)}
        />
      )}
      {view.name === "player" && !isLesson(view.category) && (
        <Player
          category={view.category}
          itemId={view.itemId}
          line={line}
          playing={playing}
          onBack={() => goLibrary(view.category)}
          onStop={stop}
          onReplay={() => void playItem(view.category, view.itemId)}
          volume={volumeChip}
        />
      )}
    </div>
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

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-10 text-center">
      <div className="relative">
        <div className="absolute inset-x-6 top-10 h-28 rounded-full bg-white/30 blur-2xl" />
        <Mascot pose="wave" className="relative h-44 w-44 sm:h-52 sm:w-52" />
      </div>
      <div className="relative mt-1 rounded-[1.8rem] bg-white px-7 py-3 shadow-[0_12px_28px_rgba(42,39,64,0.14)]">
        <p className="font-rounded text-xs font-bold tracking-[0.22em] text-[#5B7CFF]">XIAO GUAI GUAI</p>
        <h1 className="text-4xl font-black tracking-tight text-[#2A2740] sm:text-5xl">宝宝听听</h1>
      </div>
      <p className="mt-3 max-w-[17rem] text-base font-semibold leading-relaxed text-[#2A2740]/75">
        先听汪汪汪，再认眼睛和爸爸妈妈
      </p>
      <button type="button" onClick={onStart} className="candy-btn mt-8">
        <PlayBadge className="h-12 w-12" />
        <span>开始听</span>
      </button>
      <p className="mt-5 text-sm font-medium text-[#2A2740]/55">大人先点一下，喇叭才会出声</p>
    </main>
  );
}

function Home({
  onOpen,
  volume,
}: {
  onOpen: (id: CategoryId) => void;
  volume: ReactNode;
}) {
  const featured = categories[0]!;
  const learn = categories.filter((c) => c.group === "learn" && c.id !== "animals");
  const listen = categories.filter((c) => c.group === "listen");

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col overflow-y-auto px-4 pb-12 pt-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-white shadow-[0_8px_20px_rgba(42,39,64,0.12)]">
            <Mascot pose="wave" className="h-12 w-12" />
          </div>
          <div>
            <p className="font-rounded text-xs font-semibold tracking-wider text-[#5B7CFF]">
              XIAO GUAI GUAI
            </p>
            <h1 className="text-2xl font-black text-[#2A2740]">今天听什么？</h1>
          </div>
        </div>
        {volume}
      </header>

      <button type="button" onClick={() => onOpen(featured.id)} className="island-card mt-5 text-left">
        <span className="flex items-center gap-4 bg-[#E4F8DC] px-4 py-4">
          <span className="grid h-32 w-32 shrink-0 place-items-center rounded-[2rem] bg-white p-2 shadow-sm sm:h-36 sm:w-36">
            <CoverImage src={featured.hero} alt="狗" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold tracking-wide text-[#249A40]">{featured.place}</span>
            <span className="mt-1 block text-2xl font-black leading-tight text-[#2A2740]">{featured.title}</span>
            <span className="mt-2 block text-sm font-bold text-[#4A3228]">
              狗 → dog → 汪汪汪
            </span>
            <span className="mt-3 inline-flex">
              <PlayBadge className="h-11 w-11" />
            </span>
          </span>
        </span>
      </button>

      <p className="mt-6 mb-2 text-sm font-black text-[#2A2740]/70">认一认</p>
      <div className="grid grid-cols-2 gap-3">
        {learn.map((cat) => (
          <RoomButton key={cat.id} cat={cat} onOpen={onOpen} />
        ))}
      </div>

      <p className="mt-6 mb-2 text-sm font-black text-[#2A2740]/70">听一听</p>
      <div className="grid grid-cols-2 gap-3">
        {listen.map((cat) => (
          <RoomButton key={cat.id} cat={cat} onOpen={onOpen} />
        ))}
      </div>
    </main>
  );
}

function RoomButton({
  cat,
  onOpen,
}: {
  cat: (typeof categories)[number];
  onOpen: (id: CategoryId) => void;
}) {
  return (
    <button type="button" onClick={() => onOpen(cat.id)} className="island-card text-left">
      <span className="relative block">
        <RoomHero src={cat.hero} tint={cat.tint} alt={cat.title} />
        <span className="absolute bottom-2 right-2">
          <PlayBadge className="h-9 w-9" />
        </span>
      </span>
      <span className="block bg-white px-3 py-2.5">
        <span className="block text-[11px] font-bold tracking-wide text-[#8A84A3]">{cat.place}</span>
        <span className="mt-0.5 block text-[17px] font-black leading-tight text-[#2A2740]">{cat.title}</span>
      </span>
    </button>
  );
}

function Library({
  category,
  onBack,
  onPlay,
  volume,
}: {
  category: CategoryId;
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
    <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto px-4 pb-10 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          乐园
        </button>
        {volume}
      </header>

      <section className="island-card mt-4 overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-3" style={{ background: cat.tint }}>
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-white p-2">
            <CoverImage src={cat.hero} alt={cat.title} />
          </span>
          <div>
            <p className="font-rounded text-xs font-bold tracking-wider text-[#6B6580]">{cat.english}</p>
            <h1 className="text-2xl font-black text-[#2A2740]">{cat.place}</h1>
            <p className="text-sm font-medium text-[#6B6580]">{cat.hint}</p>
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
                  <span className="absolute bottom-2 right-2">
                    <PlayBadge className="h-9 w-9" />
                  </span>
                </span>
                <span className="block bg-white px-2.5 py-2.5">
                  <span className="block text-[15px] font-black text-[#2A2740]">{card.zh}</span>
                  <span className="text-xs font-medium text-[#8A84A3]">
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
                <span className="block bg-white px-2.5 py-2.5">
                  <span className="block text-[15px] font-black text-[#2A2740]">{item.title}</span>
                  <span className="text-xs font-medium text-[#8A84A3]">
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

  return (
    <FlashcardPlayer
      category={category}
      card={card}
      step={step}
      playing={playing}
      hasPrev={index > 0}
      hasNext={index < list.length - 1}
      onBack={onBack}
      onPrev={() => index > 0 && onOpen(list[index - 1].id)}
      onNext={() => index < list.length - 1 && onOpen(list[index + 1].id)}
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
  volume,
}: {
  category: CategoryId;
  itemId: string;
  line: LineInfo | null;
  playing: boolean;
  onBack: () => void;
  onStop: () => void;
  onReplay: () => void;
  volume: ReactNode;
}) {
  const cat = getCategory(category);
  const item = listenItem(category, itemId);
  if (!item) return null;
  const song = category === "zh-songs" || category === "en-songs" ? (item as Song) : null;
  const poem = category === "poems" ? (item as Poem) : null;
  const story = category === "stories" || category === "tales" ? (item as Story) : null;
  const cover = ("image" in item && item.image) || cat.hero;

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          {cat.place}
        </button>
        {volume}
      </header>
      <section className="island-card relative mt-4 flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col items-center px-5 py-6 text-center" style={{ background: cat.tint }}>
          <div className={`relative h-36 w-36 overflow-hidden rounded-[2rem] bg-white p-2 shadow-[0_12px_30px_rgba(42,39,64,0.16)] ${playing ? "animate-[bob_1.1s_ease-in-out_infinite]" : ""}`}>
            <CoverImage src={cover} alt={item.title} />
          </div>
          <p className="mt-3 text-xs font-bold tracking-wider text-[#8A84A3]">{poem ? poem.author : cat.title}</p>
          <h1 className="mt-1 text-3xl font-black text-[#2A2740]">{item.title}</h1>
          {line?.kind === "fun" && (
            <p className="mt-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-[#D49020]">好玩的翻译</p>
          )}
          <div className="story-page mt-4 w-full max-w-md">
            {line ? (
              <p className="text-xl font-bold leading-relaxed text-[#2A2740]" lang={line.lang}>
                {line.text}
              </p>
            ) : (
              <p className="text-base font-medium text-[#8A84A3]">
                {poem ? "先背古诗，再听好玩的话" : story?.subtitle ?? "再听一遍"}
              </p>
            )}
            {song && line && <p className="mt-2 text-xs font-medium text-[#B0AABC]">{song.subtitle}</p>}
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
    </main>
  );
}
