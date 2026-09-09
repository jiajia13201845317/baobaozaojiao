"use client";

import { Moon, Repeat, Sun, Timer, Volume1, Volume2, VolumeX, X } from "lucide-react";
import {
  PLAY_MODE_HINT,
  PLAY_MODE_LABEL,
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
  sleepMinutes,
  remainingLabel,
  onClose,
  onToggleNight,
  onCycleVolume,
  onCycleMode,
  onSleepMinutes,
}: {
  open: boolean;
  night: boolean;
  volumeIndex: number;
  playMode: PlayMode;
  sleepMinutes: number;
  remainingLabel?: string | null;
  onClose: () => void;
  onToggleNight: () => void;
  onCycleVolume: () => void;
  onCycleMode: () => void;
  onSleepMinutes: (minutes: number) => void;
}) {
  if (!open) return null;
  const VolumeIcon = volumeIndex === 0 ? VolumeX : volumeIndex === 1 ? Volume1 : Volume2;

  return (
    <div className="parent-layer" role="dialog" aria-label="家长设置">
      <button type="button" className="parent-backdrop" aria-label="关掉设置" onClick={onClose} />
      <div className="parent-sheet">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="ink text-xl font-black">家长设置</h2>
          <button type="button" onClick={onClose} className="glass-chip" aria-label="关掉">
            <X className="size-5" />
          </button>
        </div>
        <p className="ink-soft mb-4 text-sm font-bold">宝宝拍大按钮，这些给大人调。音量、连播、定时都记在这台机器上。</p>

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
