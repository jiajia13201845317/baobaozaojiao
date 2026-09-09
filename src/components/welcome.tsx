"use client";

import { CoverImage } from "@/components/cover";
import { PlayBadge } from "@/components/art";

const FRIENDS = [
  { src: "/art/cat.png", alt: "小猫", label: "喵", className: "left-[5%] top-[13%] h-[5rem] w-[5rem] sm:h-[6.2rem] sm:w-[6.2rem]", delay: "0s" },
  { src: "/art/chick.png", alt: "小鸡", label: "叽", className: "right-[5%] top-[13%] h-[4.8rem] w-[4.8rem] sm:h-24 sm:w-24", delay: "0.35s" },
  { src: "/art/cow.png", alt: "奶牛", label: "哞", className: "left-[3%] top-[41%] h-[4.6rem] w-[4.6rem] sm:h-[5.6rem] sm:w-[5.6rem]", delay: "0.7s" },
  { src: "/art/pig-baby.png", alt: "小猪宝宝", label: "哼", className: "right-[3%] top-[40%] h-[4.8rem] w-[4.8rem] sm:h-[5.8rem] sm:w-[5.8rem]", delay: "1s" },
  { src: "/art/frog.png", alt: "青蛙", label: "呱", className: "left-[22%] top-[52%] h-[3.6rem] w-[3.6rem] sm:h-[4.4rem] sm:w-[4.4rem]", delay: "0.2s" },
  { src: "/art/lion.png", alt: "狮子", label: "吼", className: "right-[21%] top-[52%] h-[3.6rem] w-[3.6rem] sm:h-[4.4rem] sm:w-[4.4rem]", delay: "1.3s" },
] as const;

export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <main className="welcome-page relative z-10 flex min-h-dvh flex-1 items-center justify-center p-2 sm:p-5">
      <div className="machine-shell">
        <div className="machine-lens" aria-hidden />
        <div className="machine-screen">
          <PlayroomBackdrop />
          <Bunting />
          <Sparkles />

          {FRIENDS.map((friend) => (
            <FriendBubble key={friend.src} {...friend} />
          ))}

          <div className="absolute inset-x-0 top-[22%] flex flex-col items-center px-4 sm:top-[20%]">
            <div className="welcome-hero">
              <span className="welcome-hero-glow" />
              <CoverImage src="/art/hero-dog.png" alt="小狗在等你" />
            </div>
            <p className="mt-1.5 rounded-full bg-white/90 px-3 py-0.5 text-[11px] font-black tracking-wide text-[#E24A2C] shadow-sm">
              汪汪汪，来玩呀
            </p>
          </div>

          <div className="absolute inset-x-5 bottom-[7.4rem] sm:bottom-[8.2rem]">
            <div className="welcome-sign">
              <p className="font-rounded text-[10px] font-bold tracking-[0.28em] text-[#C45C2A]">XIAO GUAI GUAI</p>
              <h1 className="text-[2.15rem] font-black leading-none tracking-tight text-[#4A3228] sm:text-5xl">
                宝宝听听
              </h1>
              <p className="mt-1.5 text-[13px] font-bold leading-snug text-[#8A5A3A]">
                小狗小猫小鸡都来了，一起听
              </p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-5 flex flex-col items-center px-5">
            <button type="button" onClick={onStart} className="toy-start">
              <PlayBadge className="h-12 w-12" />
              <span>开始听</span>
            </button>
            <p className="mt-2.5 text-[11px] font-bold text-[#8A5A3A]/80">大人先点一下，喇叭才会出声</p>
          </div>
        </div>
        <div className="machine-chin" aria-hidden>
          <span className="machine-dot bg-[#FF6B4A]" />
          <span className="machine-dot bg-[#FFD84A]" />
          <span className="machine-home" />
          <span className="machine-dot bg-[#7ED957]" />
          <span className="machine-dot bg-[#5B7CFF]" />
        </div>
      </div>
    </main>
  );
}

function FriendBubble({
  src,
  alt,
  label,
  className,
  delay,
}: {
  src: string;
  alt: string;
  label: string;
  className: string;
  delay: string;
}) {
  return (
    <div
      className={`friend-bubble ${className}`}
      style={{ animationDelay: delay }}
    >
      <CoverImage src={src} alt={alt} />
      <span className="friend-bubble-tag">{label}</span>
    </div>
  );
}

function Bunting() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 h-16 w-full sm:h-20"
      viewBox="0 0 390 70"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d="M8 10 H382" stroke="#C67A3A" strokeWidth="3.2" strokeLinecap="round" />
      {[
        [18, "#FF6B4A"],
        [58, "#FFD84A"],
        [98, "#7ED957"],
        [138, "#5B7CFF"],
        [178, "#FF8AD4"],
        [218, "#FF9A4A"],
        [258, "#7ED957"],
        [298, "#5B7CFF"],
        [338, "#FF6B4A"],
      ].map(([x, color], i) => (
        <polygon
          key={i}
          points={`${Number(x)},12 ${Number(x) + 28},12 ${Number(x) + 14},38`}
          fill={String(color)}
          opacity="0.95"
        />
      ))}
    </svg>
  );
}

function Sparkles() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="sparkle left-[22%] top-[20%]" />
      <span className="sparkle left-[74%] top-[22%] [animation-delay:0.6s]" />
      <span className="sparkle left-[12%] top-[48%] [animation-delay:1.1s]" />
      <span className="sparkle right-[14%] top-[46%] [animation-delay:1.7s]" />
      <svg className="absolute left-[10%] top-[28%] h-7 w-7 animate-[float_6s_ease-in-out_infinite]" viewBox="0 0 32 32">
        <path d="M8 22 c 8 -10 6 -16 2 -18" fill="none" stroke="#FF8A5B" strokeWidth="2.4" strokeLinecap="round" />
        <ellipse cx="22" cy="10" rx="6" ry="4" fill="#FF8A5B" />
      </svg>
      <svg className="absolute right-[11%] top-[30%] h-7 w-7 animate-[float_7s_ease-in-out_infinite_reverse]" viewBox="0 0 32 32">
        <path d="M8 22 c 8 -10 6 -16 2 -18" fill="none" stroke="#5B7CFF" strokeWidth="2.4" strokeLinecap="round" />
        <ellipse cx="22" cy="10" rx="6" ry="4" fill="#5B7CFF" />
      </svg>
    </div>
  );
}

function PlayroomBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #7EC8FF 0%, #BFE4FF 18%, #FFE7C2 42%, #FFD2A8 68%, #F4B183 100%)",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 780" preserveAspectRatio="xMidYMid slice">
        <circle cx="328" cy="92" r="42" fill="#FFE566" />
        <circle cx="328" cy="92" r="28" fill="#FFF3A0" />
        <ellipse cx="70" cy="86" rx="34" ry="16" fill="white" opacity="0.9" />
        <ellipse cx="98" cy="82" rx="22" ry="12" fill="white" opacity="0.8" />
        <path d="M40 210 C 80 170, 140 190, 195 150 C 250 112, 300 150, 390 128 L 390 250 L 40 250 Z" fill="#9BE36A" />
        <path d="M-10 248 C 90 210, 170 250, 270 220 C 330 200, 380 230, 410 220 L 410 340 L -10 340 Z" fill="#7ED957" />
        <rect x="248" y="198" width="58" height="40" rx="4" fill="#F2C14E" />
        <polygon points="240,204 277,172 314,204" fill="#E24A2C" />
        <rect x="270" y="216" width="14" height="22" fill="#8A4A22" />
        <circle cx="56" cy="300" r="7" fill="#FF7AB0" />
        <circle cx="78" cy="312" r="6" fill="#FFD84A" />
        <circle cx="330" cy="296" r="7" fill="#FF8AD4" />
        <circle cx="352" cy="314" r="6" fill="#5B7CFF" />
        <path d="M-20 430 Q 195 360 410 430 L 410 800 L -20 800 Z" fill="#E7A46A" />
        <path d="M-20 470 Q 195 410 410 470 L 410 800 L -20 800 Z" fill="#D4894E" />
        <ellipse cx="195" cy="520" rx="150" ry="46" fill="#F2C14E" />
        <ellipse cx="195" cy="520" rx="128" ry="34" fill="#FFE08A" />
        <path d="M30 200 C 70 240, 40 300, 70 340" fill="none" stroke="#49B53A" strokeWidth="10" />
        <circle cx="36" cy="196" r="16" fill="#62C94A" />
        <circle cx="58" cy="210" r="14" fill="#7ED957" />
        <circle cx="28" cy="222" r="12" fill="#39C15B" />
        <path d="M360 210 C 330 250, 360 300, 330 340" fill="none" stroke="#49B53A" strokeWidth="10" />
        <circle cx="354" cy="204" r="16" fill="#62C94A" />
        <circle cx="332" cy="220" r="14" fill="#7ED957" />
        <path d="M70 150 A 125 70 0 0 1 320 150" fill="none" stroke="#FF6B4A" strokeWidth="10" />
        <path d="M80 156 A 115 62 0 0 1 310 156" fill="none" stroke="#FFD84A" strokeWidth="10" />
        <path d="M90 162 A 105 54 0 0 1 300 162" fill="none" stroke="#7ED957" strokeWidth="10" />
        <path d="M100 168 A 95 46 0 0 1 290 168" fill="none" stroke="#5B7CFF" strokeWidth="10" />
        <path d="M110 174 A 85 38 0 0 1 280 174" fill="none" stroke="#FF8AD4" strokeWidth="10" />
        <rect x="42" y="600" width="36" height="36" rx="8" fill="#FF6B4A" />
        <rect x="78" y="618" width="28" height="28" rx="7" fill="#5B7CFF" />
        <rect x="312" y="604" width="34" height="34" rx="8" fill="#FFD84A" />
        <circle cx="58" cy="668" r="12" fill="#FF8AD4" />
        <circle cx="330" cy="662" r="11" fill="#7ED957" />
        <circle cx="88" cy="680" r="8" fill="#FFE566" />
      </svg>
    </div>
  );
}
