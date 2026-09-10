"use client";

import { Moon, Settings2, Sun } from "lucide-react";
import { CareToys, PupOutfit, SkyBuddy, bubbleFor, useCare } from "@/components/care-toys";
import type { SkyKind } from "@/lib/care";
import { CoverImage } from "@/components/cover";
import { PartyEgg, PlayBadge } from "@/components/art";

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
  onTalk,
}: {
  onStart: () => void;
  night: boolean;
  onToggleNight: () => void;
  onOpenParent: () => void;
  onTalk: (text: string) => void;
}) {
  const care = useCare(night);

  return (
    <main className="welcome-page relative z-10 flex min-h-dvh flex-1 items-center justify-center">
      <div className="machine-shell">
        <div className="machine-lens" aria-hidden />
        <div className="machine-screen" role="presentation">
          <PlayroomBackdrop sky={care.sky} />
          <SkyBuddy care={care} onTalk={onTalk} />

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
            <div className="welcome-head">
              <p className="welcome-kicker">蛋仔乐园</p>
              <h1 className="welcome-title">宝宝听听</h1>
            </div>

            <div className="welcome-hero">
              <span className="welcome-hero-glow" />
              <CoverImage src="/art/hero-dog.png" alt="小狗在等你" />
              <PupOutfit kind={care.dressKind} />
            </div>
            <p className="welcome-bubble">{bubbleFor(care)}</p>

            <CareToys care={care} onTalk={onTalk} />

            <div className="welcome-friends" aria-label="一起来的朋友">
              <div className="welcome-friend welcome-egg">
                <PartyEgg className="h-11 w-11" fill="#FFF6D8" />
                <span>蛋</span>
              </div>
              {FRIENDS.map((friend) => (
                <div key={friend.src} className="welcome-friend">
                  <CoverImage src={friend.src} alt={friend.alt} />
                  <span>{friend.label}</span>
                </div>
              ))}
            </div>

            <button type="button" onClick={(event) => { event.stopPropagation(); onStart(); }} className="toy-start">
              <PlayBadge className="h-9 w-9" />
              <span>开始听</span>
            </button>
            <p className="welcome-hint">点太阳、衣服或小碗，会说话</p>
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

function PlayroomBackdrop({ sky }: { sky: SkyKind }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className={`welcome-sky sky-${sky} absolute inset-0`} />
      <svg className="welcome-land absolute inset-0 h-full w-full" viewBox="0 0 390 780" preserveAspectRatio="xMidYMid slice">
        {sky === "rain" && (
          <g stroke="#7EC8FF" strokeWidth="3" strokeLinecap="round" opacity="0.7">
            <path d="M40 90 l-8 28" />
            <path d="M90 70 l-8 28" />
            <path d="M150 88 l-8 28" />
            <path d="M220 64 l-8 28" />
            <path d="M280 92 l-8 28" />
            <path d="M340 76 l-8 28" />
          </g>
        )}
        <ellipse cx="64" cy="72" rx="32" ry="14" fill="#FFFFFF" opacity={sky === "sun" ? 0.55 : 0.88} />
        <ellipse cx="90" cy="68" rx="20" ry="11" fill="#FFFFFF" opacity="0.7" />
        <path d="M-10 430 Q 195 360 410 430 L 410 800 L -10 800 Z" fill="#8FDE7A" />
        <path d="M-10 500 Q 195 440 410 500 L 410 800 L -10 800 Z" fill="#6FCC62" />
      </svg>
    </div>
  );
}
