"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Portrait } from "@/components/cover";
import type { CategoryId, Flashcard, LessonStep } from "@/lib/content";
import { getCategory } from "@/lib/content";

export function FlashcardPlayer({
  category,
  card,
  step,
  playing,
  hasPrev,
  hasNext,
  onBack,
  onPrev,
  onNext,
  onTap,
  onReplayAll,
  volume,
}: {
  category: CategoryId;
  card: Flashcard;
  step: LessonStep | null;
  playing: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTap: () => void;
  onReplayAll: () => void;
  volume: ReactNode;
}) {
  const cat = getCategory(category);
  const showSound = Boolean(card.cry);

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="glass-chip">
          <ChevronLeft className="size-5" />
          {cat.place}
        </button>
        {volume}
      </header>

      <section className="island-card mt-4 flex flex-1 flex-col overflow-hidden bg-[var(--card-bg)]">
        <button
          type="button"
          onClick={onTap}
          className="relative flex flex-1 flex-col items-center justify-center px-4 pt-5 pb-3"
          aria-label={card.cry ? `点${card.zh}，听${card.cry}` : `点${card.zh}，再听一遍`}
        >
          <div className="relative grid h-[46vw] max-h-72 w-[46vw] max-w-72 place-items-center sm:h-72 sm:w-72">
            {playing && (
              <span className="absolute h-[108%] w-[108%] rounded-full bg-[var(--sage)]/50" />
            )}
            <div
              className={`relative h-full w-full overflow-hidden rounded-[2.2rem] bg-[var(--bg)] shadow-[0_12px_24px_var(--shadow)] ${playing ? "animate-[bob_4s_ease-in-out_infinite]" : ""}`}
            >
              <Portrait card={card} className="h-full w-full" />
            </div>
          </div>
          <p className="ink-soft mt-4 text-sm font-bold">
            {card.cry ? `点${card.zh}，再听 ${card.cry}` : `点图片，再听 ${card.zh}`}
          </p>
        </button>

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
            hint="English"
            active={step === "en"}
            tone="var(--ink)"
            bg="var(--mist)"
          />
          {showSound && (
            <WordChip
              label={card.cry!}
              hint="叫声"
              active={step === "sound"}
              tone="var(--ink)"
              bg="var(--sage)"
            />
          )}
        </div>
      </section>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button type="button" onClick={onPrev} disabled={!hasPrev} className="nav-pill">
          <ChevronLeft className="size-5" />
          上一张
        </button>
        <button type="button" onClick={onReplayAll} className="nav-pill nav-pill-strong">
          再听名字
        </button>
        <button type="button" onClick={onNext} disabled={!hasNext} className="nav-pill">
          下一张
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
      className={`min-w-24 rounded-2xl px-4 py-2 text-center ${active ? "scale-105 shadow-[0_4px_0_var(--shadow)]" : "opacity-75"}`}
      style={{ background: bg, color: tone }}
    >
      <span className="block text-[10px] font-bold tracking-wider uppercase">{hint}</span>
      <span className="block text-2xl font-black leading-tight">{label}</span>
    </span>
  );
}
