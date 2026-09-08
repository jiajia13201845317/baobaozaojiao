"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, RotateCcw, Square, Volume1, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Cloud, SoundRings, Sun } from "@/components/decor";
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

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 toy-sky" />
      <Cloud className="pointer-events-none absolute -left-6 top-16 h-16 w-32 opacity-70 animate-[float_8s_ease-in-out_infinite]" />
      <Cloud className="pointer-events-none absolute right-0 top-28 h-12 w-24 opacity-50 animate-[float_10s_ease-in-out_infinite_reverse]" />

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

function VolumeButton({
  index,
  onClick,
}: {
  index: number;
  onClick: () => void;
}) {
  const Icon = index === 0 ? VolumeX : index === 1 ? Volume1 : Volume2;
  const label = index === 0 ? "静音" : index === 1 ? "小声" : "大声";
  return (
    <Button
      variant="secondary"
      size="lg"
      onClick={onClick}
      aria-label={`音量：${label}，点一下切换`}
      className="h-12 rounded-full border-2 border-white/80 bg-white/80 px-4 text-base text-[#5C4033] shadow-sm"
    >
      <Icon className="size-5" />
      <span className="font-medium">{label}</span>
    </Button>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <Sun />
      <h1 className="font-display mt-4 text-5xl text-[#5C4033] sm:text-6xl">宝宝听听</h1>
      <p className="mt-3 max-w-xs text-lg leading-relaxed text-[#7A5644]">
        给一岁宝宝的小电台
        <br />
        儿歌、英文歌、动物叫声、小故事
      </p>
      <button type="button" onClick={onStart} className="toy-press mt-10">
        <span
          className="toy-knob grid h-40 w-40 place-items-center rounded-full text-2xl font-display text-white"
          style={{ background: "#E56B4A", boxShadow: "0 10px 0 #C24F33" }}
        >
          点一下
          <br />
          开始听
        </span>
      </button>
      <p className="mt-8 text-sm text-[#9A7460]">大人先点一下，喇叭才会出声</p>
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
    <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 pt-6 sm:px-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sun />
          <div>
            <h1 className="font-display text-3xl text-[#5C4033] sm:text-4xl">宝宝听听</h1>
            <p className="text-sm text-[#8B6448]">点大大的按钮，就能听</p>
          </div>
        </div>
        <VolumeButton index={volumeIndex} onClick={onVolume} />
      </header>

      <div className="mt-6 grid flex-1 grid-cols-2 content-center gap-4 sm:gap-5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onOpen(cat.id)}
            className="toy-press group text-left"
          >
            <span
              className="flex min-h-[42vw] flex-col items-center justify-center rounded-[2rem] px-3 py-6 text-center sm:min-h-56"
              style={{
                background: cat.tint,
                boxShadow: `0 8px 0 ${cat.shadow}`,
              }}
            >
              <span className="text-6xl leading-none sm:text-7xl" aria-hidden>
                {cat.emoji}
              </span>
              <span className="font-display mt-3 text-2xl text-[#4A3228] sm:text-3xl">
                {cat.title}
              </span>
              <span className="mt-1 text-sm text-[#6B4A3A]">{cat.hint}</span>
              <span className="mt-0.5 text-xs tracking-wide text-[#8B6448]/80">
                {cat.english}
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

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-8 pt-5 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="lg"
          onClick={onBack}
          className="h-12 rounded-full border-2 border-white/80 bg-white/80 px-4 text-base text-[#5C4033]"
        >
          <ChevronLeft className="size-5" />
          回家
        </Button>
        <VolumeButton index={volumeIndex} onClick={onVolume} />
      </header>

      <div
        className="mt-5 rounded-[1.8rem] px-5 py-4"
        style={{ background: cat.tint, boxShadow: `0 6px 0 ${cat.shadow}` }}
      >
        <p className="text-4xl leading-none">{cat.emoji}</p>
        <h1 className="font-display mt-1 text-3xl text-[#4A3228]">{cat.title}</h1>
        <p className="text-sm text-[#6B4A3A]">{cat.hint}</p>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const title =
            "title" in item ? item.title : `${(item as Animal).zh}`;
          const sub =
            "subtitle" in item ? item.subtitle : (item as Animal).en;
          return (
            <li key={item.id}>
              <button type="button" onClick={() => onPlay(item.id)} className="toy-press w-full">
                <span
                  className="flex min-h-36 w-full flex-col items-center justify-center rounded-[1.6rem] px-2 py-4 text-center"
                  style={{
                    background: item.color,
                    boxShadow: `0 6px 0 ${item.accent}`,
                  }}
                >
                  <span className="text-5xl leading-none">{item.emoji}</span>
                  <span className="font-display mt-2 text-xl text-[#4A3228]">{title}</span>
                  <span className="text-xs text-[#6B4A3A]">{sub}</span>
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
  const emoji = item.emoji;
  const color = item.color;
  const accent = item.accent;

  const bilingual = category === "animals" ? (item as Animal) : null;
  const song = category === "zh-songs" || category === "en-songs" ? (item as Song) : null;
  const story = category === "stories" ? (item as Story) : null;

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 pt-5 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="lg"
          onClick={onBack}
          className="h-12 rounded-full border-2 border-white/80 bg-white/80 px-4 text-base text-[#5C4033]"
        >
          <ChevronLeft className="size-5" />
          返回
        </Button>
        <VolumeButton index={volumeIndex} onClick={onVolume} />
      </header>

      <section
        className="relative mt-5 flex flex-1 flex-col items-center rounded-[2rem] px-5 py-8 text-center"
        style={{ background: color, boxShadow: `0 8px 0 ${accent}` }}
      >
        <p className="text-sm font-medium tracking-wide text-[#6B4A3A]">{cat.title}</p>
        <div className="relative mt-4 grid h-44 w-44 place-items-center">
          {playing && <SoundRings color={accent} />}
          <span
            className={`relative text-8xl leading-none ${playing ? "animate-bounce" : ""}`}
            aria-hidden
          >
            {emoji}
          </span>
        </div>
        <h1 className="font-display mt-2 text-3xl text-[#4A3228] sm:text-4xl">{title}</h1>

        {bilingual && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-white/80 px-4 py-2 text-lg text-[#4A3228]">
              中文 · {bilingual.zh}
            </span>
            <span className="rounded-full bg-white/80 px-4 py-2 text-lg text-[#4A3228]">
              English · {bilingual.en}
            </span>
          </div>
        )}

        <div className="mt-5 min-h-24 w-full max-w-md rounded-3xl bg-white/75 px-5 py-4">
          {line ? (
            <p
              className="text-xl leading-relaxed text-[#4A3228] sm:text-2xl"
              lang={line.lang}
            >
              {line.text}
            </p>
          ) : playing ? (
            <p className="text-lg text-[#8B6448]">正在叫醒小喇叭…</p>
          ) : (
            <p className="text-lg text-[#8B6448]">点下面，再听一遍</p>
          )}
        </div>

        {!speechReady && (
          <p className="mt-3 text-sm text-[#8B6448]">
            这段会先放旋律。如果没有听到说话，请打开系统声音。
          </p>
        )}

        {song && (
          <ol className="mt-4 hidden w-full max-w-md space-y-1 text-left text-sm text-[#6B4A3A]/80 sm:block">
            {song.lyrics.slice(0, 3).map((lyric) => (
              <li key={lyric}>{lyric}</li>
            ))}
          </ol>
        )}
        {story && !line && (
          <p className="mt-3 text-sm text-[#6B4A3A]">{story.subtitle}</p>
        )}
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={onStop} className="toy-press" disabled={!playing}>
          <span
            className="flex h-20 items-center justify-center gap-2 rounded-[1.4rem] text-xl font-display text-white"
            style={{
              background: playing ? "#E05656" : "#C4A99A",
              boxShadow: playing ? "0 7px 0 #B53C3C" : "0 7px 0 #A08878",
            }}
          >
            <Square className="size-6 fill-current" />
            停下
          </span>
        </button>
        <button type="button" onClick={onReplay} className="toy-press">
          <span
            className="flex h-20 items-center justify-center gap-2 rounded-[1.4rem] text-xl font-display text-white"
            style={{ background: accent, boxShadow: `0 7px 0 ${cat.shadow}` }}
          >
            <RotateCcw className="size-6" />
            再听一遍
          </span>
        </button>
      </div>
    </main>
  );
}
