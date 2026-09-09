"use client";

import { Moon, Settings2, Sun } from "lucide-react";
import { CoverImage } from "@/components/cover";
import { PlayBadge } from "@/components/art";

const FRIENDS = [
  { src: "/art/cat.png", alt: "小猫", label: "喵" },
  { src: "/art/chick.png", alt: "小鸡", label: "叽" },
  { src: "/art/pig-baby.png", alt: "小猪", label: "哼" },
  { src: "/art/lion.png", alt: "狮子", label: "吼" },
] as const;

export function Welcome({
  onStart,
  night,
  onToggleNight,
  onOpenParent,
}: {
  onStart: () => void;
  night: boolean;
  onToggleNight: () => void;
  onOpenParent: () => void;
}) {
  return (
    <main className="welcome-page relative z-10 flex min-h-dvh flex-1 items-center justify-center p-2 sm:p-5">
      <div className="machine-shell">
        <div className="machine-lens" aria-hidden />
        <div className="machine-screen" onClick={onStart} role="presentation">
          <PlayroomBackdrop />

          <div className="welcome-tools">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleNight();
              }}
              className="welcome-night"
              aria-label={night ? "关掉夜间模式" : "打开夜间模式"}
            >
              {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenParent();
              }}
              className="welcome-night welcome-parent"
              aria-label="家长设置"
            >
              <Settings2 className="size-4" />
              家长
            </button>
          </div>

          <div className="welcome-stack">
            <p className="welcome-kicker">小乖乖早教机</p>
            <h1 className="welcome-title">宝宝听听</h1>
            <p className="welcome-sub">像一台真的机器，点一下小狗就叫</p>

            <div className="welcome-hero">
              <span className="welcome-hero-glow" />
              <CoverImage src="/art/hero-dog.png" alt="小狗在等你" />
            </div>
            <p className="welcome-bubble">汪汪汪，来玩呀</p>

            <div className="welcome-friends" aria-label="一起来的朋友">
              {FRIENDS.map((friend) => (
                <div key={friend.src} className="welcome-friend">
                  <CoverImage src={friend.src} alt={friend.alt} />
                  <span>{friend.label}</span>
                </div>
              ))}
            </div>

            <button type="button" onClick={(event) => { event.stopPropagation(); onStart(); }} className="toy-start">
              <PlayBadge className="h-12 w-12" />
              <span>开始听</span>
            </button>
            <p className="welcome-hint">屏幕哪里都可以点，这一下喇叭会醒</p>
          </div>
        </div>
        <div className="machine-chin" aria-hidden>
          <span className="machine-dot bg-[#FF8A5C]" />
          <span className="machine-home" />
          <span className="machine-dot bg-[#5CB8E8]" />
        </div>
      </div>
    </main>
  );
}

function PlayroomBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="welcome-sky absolute inset-0" />
      <svg className="welcome-land absolute inset-0 h-full w-full" viewBox="0 0 390 780" preserveAspectRatio="xMidYMid slice">
        <circle cx="320" cy="78" r="36" fill="#FFE27A" />
        <circle cx="320" cy="78" r="24" fill="#FFF3B0" />
        <ellipse cx="64" cy="72" rx="32" ry="14" fill="#FFFFFF" opacity="0.88" />
        <ellipse cx="90" cy="68" rx="20" ry="11" fill="#FFFFFF" opacity="0.7" />
        <path d="M-10 430 Q 195 360 410 430 L 410 800 L -10 800 Z" fill="#8FDE7A" />
        <path d="M-10 500 Q 195 440 410 500 L 410 800 L -10 800 Z" fill="#6FCC62" />
      </svg>
    </div>
  );
}
