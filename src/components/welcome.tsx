"use client";

import { Moon, Settings2, Sun } from "lucide-react";
import { CareStrip, PupOutfit, useCare, bubbleFor } from "@/components/care-toys";
import { CoverImage } from "@/components/cover";
import { PartyEgg, PlayBadge } from "@/components/art";

const FRIENDS = [
  { src: "/art/cat.png", alt: "小猫", label: "猫" },
  { src: "/art/chick.png", alt: "小鸡", label: "鸡" },
  { src: "/art/pig-baby.png", alt: "小猪", label: "猪" },
  { src: "/art/lion.png", alt: "狮子", label: "狮" },
] as const;

/**
 * The gate into 宝宝听听. It exists because this is the one screen a toddler
 * holds the phone for: sound may only start from a deliberate 开始听, never
 * from landing here. Restyled to the shared 蛋仔 skin so the tab does not look
 * like a different product from the rest of the app.
 */
export function Welcome({
  onStart,
  night,
  onToggleNight,
  onOpenParent,
  onTalk,
  embedded = false,
}: {
  onStart: () => void;
  night: boolean;
  onToggleNight: () => void;
  onOpenParent: () => void;
  onTalk: (text: string) => void;
  embedded?: boolean;
}) {
  const care = useCare(night);

  return (
    <main className={`lw-page${embedded ? " is-embedded" : ""}`}>
      <div className="lw-tools">
        <button
          type="button"
          onClick={onToggleNight}
          className="lw-chip"
          aria-label={night ? "关掉夜间模式" : "打开夜间模式"}
        >
          {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <button type="button" onClick={onOpenParent} className="lw-chip" aria-label="家长设置">
          <Settings2 className="size-4" />
          家长
        </button>
      </div>

      <div className="lw-card">
        <p className="lw-kicker">声音乐园</p>
        <h1 className="lw-title">宝宝听听</h1>

        <div className="lw-window">
          <span className="lw-glow" aria-hidden />
          <div className="lw-figure">
            <CoverImage src="/art/hero-dog.png" alt="小狗在等你" />
            <PupOutfit kind={care.dressKind} />
          </div>
          <p className="lw-bubble">{bubbleFor(care)}</p>
        </div>

        <CareStrip care={care} onTalk={onTalk} />

        <div className="lw-friends" aria-label="一起来的朋友">
          <span className="lw-friend is-egg">
            <PartyEgg className="h-10 w-10" fill="#FFF6D8" />
            <span>蛋</span>
          </span>
          {FRIENDS.map((friend) => (
            <span key={friend.src} className="lw-friend">
              <CoverImage src={friend.src} alt={friend.alt} />
              <span>{friend.label}</span>
            </span>
          ))}
        </div>

        <button type="button" onClick={onStart} className="lw-go">
          <PlayBadge className="h-9 w-9" />
          开始听
        </button>
        <p className="lw-hint">点上面的天气、衣服或小碗，它们会说话</p>
      </div>
    </main>
  );
}
