"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Pause, RotateCcw, Volume1, Volume2, VolumeX } from "lucide-react";
import {
  Balloon,
  CategoryScene,
  ItemArt,
  Mascot,
  PlayBadge,
  WorldBackdrop,
} from "@/components/art";
import { CoverImage } from "@/components/cover";
import { FlashcardPlayer } from "@/components/flashcard";
import { toyPlayer, type LineInfo } from "@/lib/audio";
import {
  cardsFor,
  categories,
  enSongs,
  getCategory,
  isLesson,
  stories,
  zhSongs,
  type CategoryId,
  type LessonStep,
  type Song,
  type Story,
} from "@/lib/content";

type View =
  | { name: "welcome" }
  | { name: "home" }
  | { name: "library"; category: CategoryId }
  | { name: "player"; category: CategoryId; itemId: string };

const VOLUME_STEPS = [0, 0.45, 0.82] as const;

function songOrStory(category: CategoryId, itemId: string) {
  if (category === "zh-songs") return zhSongs.find((s) => s.id === itemId);
  if (category === "en-songs") return enSongs.find((s) => s.id === itemId);
  return stories.find((s) => s.id === itemId);
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
    const story = stories.find((s) => s.id === itemId);
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
  const rest = categories.slice(1);

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col overflow-y-auto px-4 pb-10 pt-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-white/70 shadow-[0_8px_20px_rgba(42,39,64,0.12)]">
            <Mascot pose="wave" className="h-14 w-14" />
          </div>
          <div>
            <p className="font-rounded text-xs font-semibold tracking-wider text-[#5B7CFF]">
              XIAO GUAI GUAI
            </p>
            <h1 className="text-2xl font-black text-[#2A2740] sm:text-3xl">先听汪汪汪？</h1>
          </div>
        </div>
        {volume}
      </header>

      <button type="button" onClick={() => onOpen(featured.id)} className="island-card group mt-5 text-left">
        <span className="relative block h-44 overflow-hidden sm:h-52">
          <CategoryScene id={featured.id} />
          <CoverImage src="/art/dog.png" alt="狗" className="absolute right-2 bottom-0 h-[92%] w-auto object-contain drop-shadow-xl" />
          <span className="absolute bottom-3 right-3">
            <PlayBadge className="h-12 w-12" />
          </span>
        </span>
        <span className="block bg-white px-4 py-3">
          <span className="block text-[11px] font-bold tracking-wide text-[#8A84A3]">{featured.place}</span>
          <span className="mt-0.5 block text-2xl font-black text-[#2A2740]">{featured.title}</span>
          <span className="mt-0.5 block text-sm font-medium text-[#6B6580]">狗 · dog · 汪汪汪，点一下再叫</span>
        </span>
      </button>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        {rest.map((cat) => (
          <button key={cat.id} type="button" onClick={() => onOpen(cat.id)} className="island-card group text-left">
            <span className="relative block aspect-[1.2] overflow-hidden">
              <CategoryScene id={cat.id} />
              <span className="absolute bottom-2 right-2">
                <PlayBadge className="h-9 w-9" />
              </span>
            </span>
            <span className="block bg-white px-3 py-3">
              <span className="block text-[11px] font-bold tracking-wide text-[#8A84A3]">{cat.place}</span>
              <span className="mt-0.5 block text-lg font-black leading-tight text-[#2A2740]">{cat.title}</span>
              <span className="mt-0.5 block text-xs font-medium text-[#6B6580]">{cat.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </main>
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
  const taleItems = category === "stories" ? stories : [];

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
        <div className="relative h-36 sm:h-40">
          <CategoryScene id={category} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="font-rounded text-xs font-bold tracking-wider text-white/80">{cat.english}</p>
            <h1 className="text-3xl font-black text-white drop-shadow">{cat.place}</h1>
            <p className="text-sm font-medium text-white/90">{cat.hint}</p>
          </div>
        </div>
      </section>

      {lesson && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <button type="button" onClick={() => onPlay(card.id)} className="island-card w-full text-left">
                <span className="relative block aspect-square overflow-hidden bg-white">
                  <CoverImage src={card.image} alt={card.zh} />
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
          {(songs.length ? songs : taleItems).map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => onPlay(item.id)} className="island-card w-full text-left">
                <span className="relative block aspect-[4/3] overflow-hidden">
                  <ItemArt id={item.id} />
                  <span className="absolute bottom-2 right-2">
                    <PlayBadge className="h-9 w-9" />
                  </span>
                </span>
                <span className="block bg-white px-2.5 py-2.5">
                  <span className="block text-[15px] font-black text-[#2A2740]">{item.title}</span>
                  <span className="text-xs font-medium text-[#8A84A3]">{item.subtitle}</span>
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
  const item = songOrStory(category, itemId);
  if (!item) return null;
  const song = category === "zh-songs" || category === "en-songs" ? (item as Song) : null;
  const story = category === "stories" ? (item as Story) : null;

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
        <div className="relative h-36">
          <CategoryScene id={category} />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
        </div>
        <div className="relative -mt-16 flex flex-1 flex-col items-center px-5 pb-6 text-center">
          <div className={`relative h-32 w-32 overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_30px_rgba(42,39,64,0.16)] ${playing ? "animate-[bob_1.1s_ease-in-out_infinite]" : ""}`}>
            <ItemArt id={itemId} />
          </div>
          <h1 className="mt-3 text-3xl font-black text-[#2A2740]">{item.title}</h1>
          <div className="story-page mt-5 w-full max-w-md">
            {line ? (
              <p className="text-xl font-bold leading-relaxed text-[#2A2740]" lang={line.lang}>
                {line.text}
              </p>
            ) : (
              <p className="text-base font-medium text-[#8A84A3]">{story?.subtitle ?? "再听一遍，或者换一首"}</p>
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
