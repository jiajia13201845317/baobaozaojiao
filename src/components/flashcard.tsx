"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, RotateCcw } from "lucide-react";
import { Portrait } from "@/components/cover";
import type { CategoryId, Flashcard, LessonStep } from "@/lib/content";
import { getCategory } from "@/lib/content";
import type { MusicSource } from "@/lib/progress";

export function ProgressDots({ total, index }: { total: number; index: number }) {
  if (total < 2) return null;
  return (
    <div className="dots" aria-hidden>
      {Array.from({ length: Math.min(total, 12) }, (_, i) => (
        <i key={i} className={i === index ? "dot on" : "dot"} />
      ))}
    </div>
  );
}

export function FlashcardPlayer({
  category,
  card,
  step,
  playing,
  index,
  total,
  hasPrev,
  hasNext,
  onBack,
  onPrev,
  onNext,
  onTap,
  onStop,
  onReplayAll,
  volume,
  musicSource = "local",
}: {
  category: CategoryId;
  card: Flashcard;
  step: LessonStep | null;
  playing: boolean;
  index: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTap: () => void;
  onStop: () => void;
  onReplayAll: () => void;
  volume: ReactNode;
  musicSource?: MusicSource;
}) {
  const cat = getCategory(category);
  const showSound = Boolean(card.cry);
  const unit = category === "animals" ? "只" : "张";

  return (
    <main className="page-shell relative z-10 mx-auto flex w-full flex-1 flex-col px-3 pb-5">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          {cat.place}
        </button>
        {volume}
      </header>

      <section className="island-card party-play mt-4 flex flex-1 flex-col overflow-hidden">
        <div className="party-play-band relative flex flex-1 flex-col items-center justify-center px-3 pt-3 pb-2">
          {total > 1 && (
            <p className="ink-soft mb-2 text-sm font-bold">
              第 {index + 1} {unit} / 共 {total} {unit}
              {playing ? <span className="now-dot"> · 正在听</span> : null}
            </p>
          )}
          <button
            type="button"
            onPointerDown={onTap}
            onClick={onTap}
            className="relative grid h-[var(--hero)] w-[var(--hero)] place-items-center"
            aria-label={card.cry ? `点${card.zh}，听真叫声` : `点${card.zh}，再听一遍`}
          >
            {playing && (
              <span className="absolute h-[108%] w-[108%] rounded-full bg-[var(--sage)]/50" />
            )}
            <div
              className={`party-cover relative h-full w-full overflow-hidden ${playing ? "animate-[bob_4s_ease-in-out_infinite]" : ""}`}
            >
              <Portrait card={card} className="h-full w-full" />
            </div>
          </button>
          <p className="ink-soft mt-2 text-sm font-bold">
            {card.cry
              ? musicSource === "netease"
                ? `点${card.zh}，听网易云叫声`
                : `点${card.zh}，听真叫声`
              : `点图片，再听 ${card.zh}`}
          </p>
          <ProgressDots total={total} index={index} />
          {card.cry && musicSource === "netease" && (
            <div id="bao-netease-slot" className="netease-slot" hidden={step !== "sound" && !playing} />
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2 px-4 pb-5">
          <WordChip
            label={card.zh}
            hint="中文"
            active={step === "zh"}
            tone="var(--accent-deep)"
            bg="var(--apricot)"
          />
          <WordChip
            label={card.en}
            hint="英文"
            active={step === "en"}
            tone="var(--ink)"
            bg="var(--mist)"
          />
          {showSound && (
            <WordChip
              label={card.cry!}
              hint={musicSource === "netease" ? "网易云" : "真叫声"}
              active={step === "sound"}
              tone="var(--ink)"
              bg="var(--sage)"
            />
          )}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button type="button" onClick={onStop} disabled={!playing} className="control-round stop" aria-label="停下">
          <Pause className="size-7 fill-current" />
        </button>
        <button type="button" onClick={onReplayAll} className="control-round replay" aria-label="再听一遍">
          <RotateCcw className="size-7" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onPrev} disabled={!hasPrev} className="nav-pill">
          <ChevronLeft className="size-5" />
          {category === "animals" ? "上一只" : "上一张"}
        </button>
        <button type="button" onClick={onNext} disabled={!hasNext} className="nav-pill">
          {category === "animals" ? "下一只" : "下一张"}
          <ChevronRight className="size-5" />
        </button>
      </div>
    </main>
  );
}

function WordChip({
  label,
  hint,
  active,
  tone,
  bg,
}: {
  label: string;
  hint: string;
  active: boolean;
  tone: string;
  bg: string;
}) {
  return (
    <span
      className={`party-word ${active ? "on" : "opacity-80"}`}
      style={{ background: bg, color: tone }}
    >
      <span className="block text-[10px] font-bold tracking-wider">{hint}</span>
      <span className="block text-2xl font-black leading-tight">{label}</span>
    </span>
  );
}
