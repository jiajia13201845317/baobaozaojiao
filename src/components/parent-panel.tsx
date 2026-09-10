"use client";

import { Moon, PawPrint, Repeat, Sun, Timer, Volume1, Volume2, VolumeX, X, Music2 } from "lucide-react";
import { PartyEgg } from "@/components/art";
import {
  CRY_SOURCE_HINT,
  CRY_SOURCE_LABEL,
  MUSIC_SOURCE_HINT,
  MUSIC_SOURCE_LABEL,
  PLAY_MODE_HINT,
  PLAY_MODE_LABEL,
  type CrySource,
  type MusicSource,
  type PlayMode,
} from "@/lib/progress";

const VOLUME_LABEL = ["静音", "小声", "大声"] as const;
const TIMER_OPTS = [
  { m: 0, label: "不关" },
  { m: 10, label: "10分" },
  { m: 20, label: "20分" },
  { m: 30, label: "30分" },
] as const;

export function ParentPanel({
  open,
  night,
  volumeIndex,
  playMode,
  musicSource,
  crySource,
  sleepMinutes,
  remainingLabel,
  onClose,
  onToggleNight,
  onCycleVolume,
  onCycleMode,
  onCycleSource,
  onCycleCry,
  onSleepMinutes,
}: {
  open: boolean;
  night: boolean;
  volumeIndex: number;
  playMode: PlayMode;
  musicSource: MusicSource;
  crySource: CrySource;
  sleepMinutes: number;
  remainingLabel?: string | null;
  onClose: () => void;
  onToggleNight: () => void;
  onCycleVolume: () => void;
  onCycleMode: () => void;
  onCycleSource: () => void;
  onCycleCry: () => void;
  onSleepMinutes: (minutes: number) => void;
}) {
  if (!open) return null;
  const VolumeIcon = volumeIndex === 0 ? VolumeX : volumeIndex === 1 ? Volume1 : Volume2;

  return (
    <div className="parent-layer" role="dialog" aria-label="家长设置">
      <button type="button" className="parent-backdrop" aria-label="关掉设置" onClick={onClose} />
      <div className="parent-sheet">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PartyEgg className="h-10 w-10" />
            <h2 className="ink text-xl font-black">家长设置</h2>
          </div>
          <button type="button" onClick={onClose} className="glass-chip" aria-label="关掉">
            <X className="size-5" />
          </button>
        </div>
        <p className="ink-soft mb-4 text-sm font-bold">宝宝拍大按钮，这些给大人调。音量、连播、定时都记在这台机器上。觉得叫声还是有点吓人，就把「动物叫声」切成拟声。</p>

        <button type="button" onClick={onCycleVolume} className="parent-row">
          <VolumeIcon className="size-5" />
          <span className="flex-1 text-left">
            <span className="ink block font-black">音量</span>
            <span className="ink-soft text-sm font-bold">{VOLUME_LABEL[volumeIndex]} · 下次打开还是这样</span>
          </span>
          <span className="parent-pill">切换</span>
        </button>

        <button type="button" onClick={onToggleNight} className="parent-row">
          {night ? <Sun className="size-5" /> : <Moon className="size-5" />}
          <span className="flex-1 text-left">
            <span className="ink block font-black">夜间</span>
            <span className="ink-soft text-sm font-bold">{night ? "屏幕暗一点，不怕晃眼" : "白天亮亮的"}</span>
          </span>
          <span className="parent-pill">{night ? "白天" : "夜里"}</span>
        </button>

        <button type="button" onClick={onCycleSource} className="parent-row">
          <Music2 className="size-5" />
          <span className="flex-1 text-left">
            <span className="ink block font-black">儿歌音源</span>
            <span className="ink-soft text-sm font-bold">{MUSIC_SOURCE_HINT[musicSource]}</span>
          </span>
          <span className="parent-pill parent-pill-on">{MUSIC_SOURCE_LABEL[musicSource]}</span>
        </button>

        <button type="button" onClick={onCycleCry} className="parent-row">
          <PawPrint className="size-5" />
          <span className="flex-1 text-left">
            <span className="ink block font-black">动物叫声</span>
            <span className="ink-soft text-sm font-bold">{CRY_SOURCE_HINT[crySource]}</span>
          </span>
          <span className="parent-pill parent-pill-on">{CRY_SOURCE_LABEL[crySource]}</span>
        </button>

        <button type="button" onClick={onCycleMode} className="parent-row">
          <Repeat className="size-5" />
          <span className="flex-1 text-left">
            <span className="ink block font-black">播放方式</span>
            <span className="ink-soft text-sm font-bold">{PLAY_MODE_HINT[playMode]}</span>
          </span>
          <span className="parent-pill parent-pill-on">{PLAY_MODE_LABEL[playMode]}</span>
        </button>

        <div className="parent-row">
          <Timer className="size-5" />
          <span className="flex-1 text-left">
            <span className="ink block font-black">定时停下</span>
            <span className="ink-soft text-sm font-bold">
              {remainingLabel ? `这次还剩 ${remainingLabel}` : "到点会说：该睡觉啦"}
            </span>
          </span>
          <span className="flex flex-wrap justify-end gap-1">
            {TIMER_OPTS.map((opt) => (
              <button
                key={opt.m}
                type="button"
                onClick={() => onSleepMinutes(opt.m)}
                className={`parent-pill ${sleepMinutes === opt.m ? "parent-pill-on" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
