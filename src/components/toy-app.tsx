"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, Pause, RotateCcw, Volume1, Volume2, VolumeX } from "lucide-react";
import {
  Balloon,
  CategoryScene,
  ItemArt,
  Mascot,
  PlayBadge,
  WorldBackdrop,
} from "@/components/art";
import { toyPlayer, type LineInfo } from "@/lib/audio";
import {
  animals,
  categories,
  enSongs,
  getCategory,
  stories,
  zhSongs,
  type Animal,
  type CategoryId,
  type Song,
  type Story,
} from "@/lib/content";

type View =
  | { name: "welcome" }
  | { name: "home" }
  | { name: "library"; category: CategoryId }
  | { name: "player"; category: CategoryId; itemId: string };

const VOLUME_STEPS = [0, 0.45, 0.82] as const;

function itemTitle(category: CategoryId, itemId: string) {
  if (category === "zh-songs") return zhSongs.find((s) => s.id === itemId);
  if (category === "en-songs") return enSongs.find((s) => s.id === itemId);
  if (category === "animals") return animals.find((s) => s.id === itemId);
  return stories.find((s) => s.id === itemId);
}

export function ToyApp() {
  const [view, setView] = useState<View>({ name: "welcome" });
  const [line, setLine] = useState<LineInfo | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volumeIndex, setVolumeIndex] = useState(2);
  const [speechReady, setSpeechReady] = useState(true);

  useEffect(() => {
    toyPlayer.onLine = (info) => setLine(info);
    toyPlayer.onEnded = () => setPlaying(false);
    return () => {
      toyPlayer.onLine = null;
      toyPlayer.onEnded = null;
      toyPlayer.stop();
    };
  }, []);

  useEffect(() => {
    toyPlayer.setVolume(VOLUME_STEPS[volumeIndex]);
  }, [volumeIndex]);

  const start = useCallback(async () => {
    await toyPlayer.unlock();
    const voices = window.speechSynthesis?.getVoices() ?? [];
    setSpeechReady(voices.length > 0 || Boolean(window.speechSynthesis));
    setView({ name: "home" });
  }, []);

  const playItem = useCallback(async (category: CategoryId, itemId: string) => {
    await toyPlayer.unlock();
    setLine(null);
    setPlaying(true);
    setView({ name: "player", category, itemId });
    if (category === "zh-songs" || category === "en-songs") {
      const song = (category === "zh-songs" ? zhSongs : enSongs).find((s) => s.id === itemId);
      if (song) await toyPlayer.playSong(song);
      return;
    }
    if (category === "animals") {
      const animal = animals.find((s) => s.id === itemId);
      if (animal) await toyPlayer.playAnimal(animal);
      return;
    }
    const story = stories.find((s) => s.id === itemId);
    if (story) await toyPlayer.playStory(story);
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

  const mood = view.name === "player" && view.category === "en-songs"
    ? "night"
    : view.name === "player" && view.category === "stories"
      ? "dusk"
      : "day";

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <WorldBackdrop mood={mood} />
      <Balloon color="#FF6B4A" className="pointer-events-none absolute left-[8%] top-16 h-16 w-10 animate-[float_7s_ease-in-out_infinite] opacity-90" />
      <Balloon color="#5B7CFF" className="pointer-events-none absolute right-[10%] top-24 h-14 w-9 animate-[float_9s_ease-in-out_infinite_reverse] opacity-80" />

      {view.name === "welcome" && <Welcome onStart={start} />}
      {view.name === "home" && (
        <Home
          volumeIndex={volumeIndex}
          onVolume={() => setVolumeIndex((i) => (i + 1) % VOLUME_STEPS.length)}
          onOpen={goLibrary}
        />
      )}
      {view.name === "library" && (
        <Library
          category={view.category}
          onBack={goHome}
          onPlay={(id) => void playItem(view.category, id)}
          volumeIndex={volumeIndex}
          onVolume={() => setVolumeIndex((i) => (i + 1) % VOLUME_STEPS.length)}
        />
      )}
      {view.name === "player" && (
        <Player
          category={view.category}
          itemId={view.itemId}
          line={line}
          playing={playing}
          speechReady={speechReady}
          onBack={() => goLibrary(view.category)}
          onStop={stop}
          onReplay={() => void playItem(view.category, view.itemId)}
          volumeIndex={volumeIndex}
          onVolume={() => setVolumeIndex((i) => (i + 1) % VOLUME_STEPS.length)}
        />
      )}
    </div>
  );
}

function VolumeChip({ index, onClick }: { index: number; onClick: () => void }) {
  const Icon = index === 0 ? VolumeX : index === 1 ? Volume1 : Volume2;
  const label = index === 0 ? "静音" : index === 1 ? "小声" : "大声";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`音量：${label}，点一下切换`}
      className="glass-chip"
    >
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
        <p className="font-rounded text-xs font-bold tracking-[0.22em] text-[#5B7CFF]">
          XIAO GUAI GUAI
        </p>
        <h1 className="text-4xl font-black tracking-tight text-[#2A2740] sm:text-5xl">宝宝听听</h1>
      </div>
      <p className="mt-3 max-w-[16rem] text-base font-semibold leading-relaxed text-[#2A2740]/75">
        小乖乖的声音乐园
        <br />
        唱歌、英文、动物、故事
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
  volumeIndex,
  onVolume,
}: {
  onOpen: (id: CategoryId) => void;
  volumeIndex: number;
  onVolume: () => void;
}) {
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-10 pt-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-white/70 shadow-[0_8px_20px_rgba(42,39,64,0.12)]">
            <Mascot pose="wave" className="h-14 w-14" />
          </div>
          <div>
            <p className="font-rounded text-xs font-semibold tracking-wider text-[#5B7CFF]">
              XIAO GUAI GUAI
            </p>
            <h1 className="text-2xl font-black text-[#2A2740] sm:text-3xl">嗨，想去哪儿玩？</h1>
          </div>
        </div>
        <VolumeChip index={volumeIndex} onClick={onVolume} />
      </header>

      <div className="mt-5 grid flex-1 grid-cols-2 content-start gap-3 sm:gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onOpen(cat.id)}
            className="island-card group text-left"
          >
            <span className="relative block aspect-[1.15] overflow-hidden">
              <CategoryScene id={cat.id} />
              <span className="absolute bottom-2 right-2 drop-shadow-md transition-transform group-active:scale-95">
                <PlayBadge className="h-10 w-10" />
              </span>
            </span>
            <span className="block bg-white px-3 py-3">
              <span className="block text-[11px] font-bold tracking-wide text-[#8A84A3]">
                {cat.place}
              </span>
              <span className="mt-0.5 block text-lg font-black leading-tight text-[#2A2740]">
                {cat.title}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-[#6B6580]">
                {cat.hint}
              </span>
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
  volumeIndex,
  onVolume,
}: {
  category: CategoryId;
  onBack: () => void;
  onPlay: (id: string) => void;
  volumeIndex: number;
  onVolume: () => void;
}) {
  const cat = getCategory(category);
  const items = useMemo(() => {
    if (category === "zh-songs") return zhSongs;
    if (category === "en-songs") return enSongs;
    if (category === "animals") return animals;
    return stories;
  }, [category]);

  const pose =
    category === "zh-songs"
      ? "sing"
      : category === "en-songs"
        ? "listen"
        : category === "stories"
          ? "read"
          : "wave";

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-10 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          乐园
        </button>
        <VolumeChip index={volumeIndex} onClick={onVolume} />
      </header>

      <section className="island-card mt-4 overflow-hidden">
        <div className="relative h-36 sm:h-40">
          <CategoryScene id={category} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <p className="font-rounded text-xs font-bold tracking-wider text-white/80">
                {cat.english}
              </p>
              <h1 className="text-3xl font-black text-white drop-shadow">{cat.place}</h1>
              <p className="text-sm font-medium text-white/90">{cat.hint}</p>
            </div>
            <Mascot pose={pose} className="h-20 w-20 drop-shadow-lg" />
          </div>
        </div>
      </section>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const title = "title" in item ? item.title : (item as Animal).zh;
          const sub = "subtitle" in item ? item.subtitle : (item as Animal).en;
          return (
            <li key={item.id}>
              <button type="button" onClick={() => onPlay(item.id)} className="island-card group w-full text-left">
                <span className="relative block aspect-[4/3] overflow-hidden">
                  <ItemArt id={item.id} />
                  <span className="absolute bottom-2 right-2">
                    <PlayBadge className="h-9 w-9" />
                  </span>
                </span>
                <span className="block bg-white px-2.5 py-2.5">
                  <span className="block text-[15px] font-black leading-tight text-[#2A2740]">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-[#8A84A3]">{sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function Player({
  category,
  itemId,
  line,
  playing,
  speechReady,
  onBack,
  onStop,
  onReplay,
  volumeIndex,
  onVolume,
}: {
  category: CategoryId;
  itemId: string;
  line: LineInfo | null;
  playing: boolean;
  speechReady: boolean;
  onBack: () => void;
  onStop: () => void;
  onReplay: () => void;
  volumeIndex: number;
  onVolume: () => void;
}) {
  const cat = getCategory(category);
  const item = itemTitle(category, itemId);
  if (!item) return null;

  const title =
    "title" in item ? item.title : `${(item as Animal).zh}  ·  ${(item as Animal).en}`;
  const bilingual = category === "animals" ? (item as Animal) : null;
  const song = category === "zh-songs" || category === "en-songs" ? (item as Song) : null;
  const story = category === "stories" ? (item as Story) : null;

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          {cat.place}
        </button>
        <VolumeChip index={volumeIndex} onClick={onVolume} />
      </header>

      <section className="island-card relative mt-4 flex flex-1 flex-col overflow-hidden">
        <div className="relative h-36">
          <CategoryScene id={category} />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
        </div>

        <div className="relative -mt-16 flex flex-1 flex-col items-center px-5 pb-6 text-center">
          <div className="relative grid h-36 w-36 place-items-center">
            {playing && (
              <>
                <span className="absolute h-36 w-36 rounded-full bg-[#FF6B4A]/20 animate-[pulse-ring_1.8s_ease-out_infinite]" />
                <span className="absolute h-44 w-44 rounded-full bg-[#5B7CFF]/15 animate-[pulse-ring_1.8s_ease-out_infinite] [animation-delay:400ms]" />
              </>
            )}
            <div className={`relative h-32 w-32 overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_30px_rgba(42,39,64,0.16)] ${playing ? "animate-[bob_1.1s_ease-in-out_infinite]" : ""}`}>
              <ItemArt id={itemId} />
            </div>
          </div>

          <p className="font-rounded mt-3 text-xs font-bold tracking-wider text-[#8A84A3]">
            {cat.title}
          </p>
          <h1 className="mt-1 text-3xl font-black text-[#2A2740] sm:text-4xl">{title}</h1>

          {bilingual && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-[#FFF1E6] px-4 py-1.5 text-sm font-bold text-[#FF6B4A]">
                中文 {bilingual.zh}
              </span>
              <span className="rounded-full bg-[#E8EEFF] px-4 py-1.5 text-sm font-bold text-[#5B7CFF]">
                English {bilingual.en}
              </span>
            </div>
          )}

          <div className="story-page mt-5 w-full max-w-md">
            {line ? (
              <p className="text-xl font-bold leading-relaxed text-[#2A2740] sm:text-2xl" lang={line.lang}>
                {line.text}
              </p>
            ) : playing ? (
              <p className="text-base font-medium text-[#8A84A3]">小乖乖正在开口…</p>
            ) : (
              <p className="text-base font-medium text-[#8A84A3]">再听一遍，或者换一首</p>
            )}
            {story && !line && (
              <p className="mt-2 text-sm text-[#8A84A3]">{story.subtitle}</p>
            )}
            {song && line && (
              <p className="mt-2 text-xs font-medium text-[#B0AABC]">{song.subtitle}</p>
            )}
          </div>

          {!speechReady && (
            <p className="mt-3 text-xs text-[#8A84A3]">这段会先放旋律。请打开系统声音。</p>
          )}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onStop}
          disabled={!playing}
          className="control-round stop"
          aria-label="停下"
        >
          <Pause className="size-7 fill-current" />
        </button>
        <button type="button" onClick={onReplay} className="control-round replay" aria-label="再听一遍">
          <RotateCcw className="size-7" />
        </button>
      </div>
      <div className="mt-2 flex justify-center gap-10 text-xs font-bold text-[#6B6580]">
        <span>停下</span>
        <span>再听一遍</span>
      </div>
    </main>
  );
}
