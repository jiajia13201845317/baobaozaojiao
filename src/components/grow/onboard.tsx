"use client";

import Image from "next/image";
import { useState } from "react";
import { ageLabel, monthsBetween } from "@/lib/grow/growth";
import { LEVELS } from "@/lib/grow/pets";
import type { Profile, Sex } from "@/lib/grow/store";

const today = () => new Date().toISOString().slice(0, 10);

export function Onboard({ initial, onDone, onCancel }: { initial?: Profile | null; onDone: (profile: Profile) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null);
  const [birthday, setBirthday] = useState(initial?.birthday ?? "");

  const months = birthday ? monthsBetween(birthday) : null;
  const futureDate = Boolean(birthday) && birthday > today();
  const tooOld = months != null && months > 36;
  const ready = name.trim().length > 0 && sex != null && Boolean(birthday) && !futureDate;
  const missing = [
    name.trim() ? null : "称呼",
    sex ? null : "性别",
    birthday ? null : "出生日期",
  ].filter((v): v is string => v != null);

  return (
    <div className="g-scroll g-onboard">
      <header className="g-hero">
        <div className="onboard-egg">
          <Image src={LEVELS[0]!.art!} alt="一颗等着孵的蛋" width={448} height={448} priority />
        </div>
        <h1 className="g-hero-title">{initial ? "改一下资料" : "先认识一下宝宝"}</h1>
        <p className="g-hero-sub">
          只存在这台设备上，不上传。填了生日才能按月龄推玩法，也才能把身高体重放到对的参考曲线上。
        </p>
      </header>

      <div className="g-card">
        <label className="g-field">
          <span>宝宝怎么称呼</span>
          <input
            id="baby-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="小名就行"
            maxLength={12}
            autoComplete="off"
          />
        </label>

        <div className="g-field">
          <span>性别</span>
          <div className="pick-row">
            {(
              [
                { id: "boy", label: "男宝" },
                { id: "girl", label: "女宝" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSex(o.id)}
                className={`pick ${sex === o.id ? "on" : ""}`}
                aria-pressed={sex === o.id}
              >
                {o.label}
              </button>
            ))}
          </div>
          <i className="g-hint">WHO 的生长曲线男女分开，选错了参考线会偏。</i>
        </div>

        <label className="g-field">
          <span>出生日期</span>
          <input
            id="baby-birthday"
            type="date"
            value={birthday}
            max={today()}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </label>
        {futureDate && <p className="g-error">出生日期不能晚于今天。</p>}
        {!futureDate && months != null && (
          <p className="g-hint">
            {ageLabel(months)}
            {tooOld && " · 早教玩法目前做到 3 岁，健康记录仍然可用。"}
            {months < 12 && " · 玩法库从 12 月龄开始，先给你看 Q1-Q2 的内容。"}
          </p>
        )}
        {/* The button is disabled until the form is usable, which on its own
            just looks broken. Name what is still missing. */}
        {!ready && !futureDate && missing.length > 0 && <p className="g-hint">还差{missing.join("、")}。</p>}

        <div className="measure-actions">
          {onCancel && (
            <button type="button" className="g-btn g-btn-ghost" onClick={onCancel}>
              取消
            </button>
          )}
          <button
            type="button"
            className="g-btn g-btn-go"
            disabled={!ready}
            onClick={() => ready && onDone({ name: name.trim(), sex: sex!, birthday })}
          >
            {initial ? "保存" : "开始"}
          </button>
        </div>
      </div>

      <p className="g-legal">
        这个 App 只做记录和提醒，不提供任何诊断或治疗建议。宝宝的情况请以儿保医生的判断为准。
      </p>
    </div>
  );
}
