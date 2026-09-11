"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ageLabel, monthsBetween } from "@/lib/grow/growth";
import type { Profile, Sex } from "@/lib/grow/store";

const today = () => new Date().toISOString().slice(0, 10);

export function Onboard({ onDone }: { onDone: (profile: Profile) => void }) {
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [birthday, setBirthday] = useState("");
  const [touched, setTouched] = useState(false);

  const months = birthday ? monthsBetween(birthday) : null;
  const futureDate = Boolean(birthday) && birthday > today();
  const tooOld = months != null && months > 36;
  const ready = name.trim().length > 0 && sex != null && Boolean(birthday) && !futureDate;

  return (
    <main className="grow-page grow-onboard">
      <div className="grow-shell">
        <header className="onboard-head">
          <p className="grow-kicker">一起长大</p>
          <h1 className="grow-title">先认识一下宝宝</h1>
          <p className="grow-sub">
            只存在这台设备上，不上传。填了生日才能按月龄推任务，也才能把身高体重放到对的参考曲线上。
          </p>
        </header>

        <div className="grow-card onboard-form">
          <div className="onboard-field">
            <Label htmlFor="baby-name">宝宝怎么称呼</Label>
            <Input
              id="baby-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="小名就行"
              maxLength={12}
              autoComplete="off"
            />
          </div>

          <div className="onboard-field">
            <Label>性别</Label>
            <div className="onboard-sex">
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
                  className={`onboard-pick ${sex === o.id ? "on" : ""}`}
                  aria-pressed={sex === o.id}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="onboard-hint">WHO 的生长曲线男女分开，选错了参考线会偏。</p>
          </div>

          <div className="onboard-field">
            <Label htmlFor="baby-birthday">出生日期</Label>
            <Input
              id="baby-birthday"
              type="date"
              value={birthday}
              max={today()}
              onChange={(e) => setBirthday(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            {futureDate && <p className="onboard-error">出生日期不能晚于今天。</p>}
            {!futureDate && months != null && (
              <p className="onboard-hint">
                {ageLabel(months)}
                {tooOld && " · 早教任务目前做到 3 岁，健康记录仍然可用。"}
                {months < 12 && " · 任务库从 12 月龄开始，先给你看 Q1-Q2 的内容。"}
              </p>
            )}
            {touched && !birthday && <p className="onboard-error">还没填出生日期。</p>}
          </div>

          <Button
            className="grow-primary"
            disabled={!ready}
            onClick={() => ready && onDone({ name: name.trim(), sex: sex!, birthday })}
          >
            开始
          </Button>
        </div>

        <p className="grow-legal">
          这个 App 只做记录和提醒，不提供任何诊断或治疗建议。宝宝的情况请以儿保医生的判断为准。
        </p>
      </div>
    </main>
  );
}
