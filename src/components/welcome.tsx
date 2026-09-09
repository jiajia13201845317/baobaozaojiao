"use client";

import { Moon, Sun, Volume2 } from "lucide-react";
import { CoverImage } from "@/components/cover";
import { PlayBadge } from "@/components/art";

export function Welcome({
  onStart,
  night,
  onToggleNight,
}: {
  onStart: () => void;
  night: boolean;
  onToggleNight: () => void;
}) {
  return (
    <main className="welcome-page relative z-10 flex min-h-dvh flex-1 items-center justify-center p-2 sm:p-5">
      <div className="machine-shell">
        <div className="machine-lens" aria-hidden />
        <div className="machine-screen">
          <PlayroomBackdrop />
          <Bunting />

          <button
            type="button"
            onClick={onToggleNight}
            className="glass-chip absolute right-3 top-3 z-20"
            aria-label={night ? "关掉夜间模式" : "打开夜间模式"}
          >
            {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span className="hidden sm:inline">{night ? "白天" : "夜里"}</span>
          </button>

          <div className="relative z-10 flex h-full flex-col items-center px-5 pb-4 pt-14">
            <div className="welcome-hero">
              <span className="welcome-hero-glow" />
              <CoverImage src="/art/hero-dog.png" alt="小乖乖的小狗" />
            </div>
            <p className="mt-3 rounded-full bg-[var(--bg)] px-3 py-1 text-xs font-black text-[var(--accent-deep)] shadow-sm">
              乐园门口的小狗
            </p>

            <div className="welcome-sign mt-4 w-full">
              <p className="font-rounded text-[11px] font-bold tracking-[0.22em] text-[var(--ink-soft)]">
                XIAO GUAI GUAI
              </p>
              <h1 className="mt-0.5 text-[2.1rem] font-black leading-none tracking-tight text-[var(--ink)] sm:text-5xl">
                宝宝听听
              </h1>
              <p className="mt-2 text-[15px] font-bold leading-snug text-[var(--ink)]">
                点下面进乐园，先听小狗汪汪汪
              </p>
            </div>

            <div className="welcome-hint mt-4 w-full" role="status">
              <Volume2 className="size-5 shrink-0" />
              <p>大人先点一下，喇叭才会出声。孩子再拍也听得到。</p>
            </div>

            <button type="button" onClick={onStart} className="toy-start mt-4 w-full max-w-sm justify-center">
              <PlayBadge className="h-12 w-12 shrink-0" />
              <span className="text-left leading-tight">
                <span className="block text-[1.45rem]">进入乐园</span>
                <span className="block text-[13px] font-bold opacity-90">下一步听狗 → dog → 汪汪汪</span>
              </span>
            </button>
          </div>
        </div>
        <div className="machine-chin" aria-hidden>
          <span className="machine-grill" />
          <span className="machine-home" />
          <span className="machine-grill" />
        </div>
      </div>
    </main>
  );
}

function Bunting() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 h-12 w-full sm:h-14"
      viewBox="0 0 390 56"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d="M8 8 H382" stroke="#B8A08A" strokeWidth="2.6" strokeLinecap="round" />
      {[
        [28, "#D4B49A"],
        [78, "#D8C89A"],
        [128, "#B5C9B4"],
        [178, "#A8B8C8"],
        [228, "#C8B8C8"],
        [278, "#B5C9B4"],
        [328, "#D4B49A"],
      ].map(([x, color], i) => (
        <polygon
          key={i}
          points={`${Number(x)},10 ${Number(x) + 24},10 ${Number(x) + 12},30`}
          fill={String(color)}
          opacity="0.88"
        />
      ))}
    </svg>
  );
}

function PlayroomBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, var(--mist) 0%, var(--bg) 36%, var(--beige) 100%)",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 780" preserveAspectRatio="xMidYMid slice">
        <circle cx="328" cy="78" r="34" fill="#E6D7B8" />
        <circle cx="328" cy="78" r="22" fill="#F0E6D0" />
        <ellipse cx="64" cy="80" rx="30" ry="14" fill="#F5F3EE" opacity="0.8" />
        <path d="M-10 430 Q 195 370 410 430 L 410 800 L -10 800 Z" fill="var(--beige)" />
        <path d="M-10 500 Q 195 450 410 500 L 410 800 L -10 800 Z" fill="var(--apricot)" />
      </svg>
    </div>
  );
}
