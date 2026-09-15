"use client";

import { CheckCheck, ChevronRight, Droplet, Flame, Plus, Ruler, Syringe, Toilet } from "lucide-react";
import { PetCard } from "@/components/grow/pet-card";
import { METRIC_UNIT, ageLabel, monthsBetween } from "@/lib/grow/growth";
import { POINTS, streakOf } from "@/lib/grow/pet";
import { CREATURES, type CareId, type CareState, type PetView } from "@/lib/grow/pets";
import { type RecordKind, countOnDay } from "@/lib/grow/records";
import {
  type Baby,
  type BabyData,
  activeDays,
  doneToday,
  latest,
  revealedCreatures,
  spendablePoints,
  totalPoints,
} from "@/lib/grow/store";
import { DAILY_COUNT, dateKey, dayIndexOf, dimensionOf, stageForMonths, tasksForDay } from "@/lib/grow/tasks";
import { STATUS_LABEL, dueDate, nextVaccine } from "@/lib/grow/vaccines";

export function Home({
  baby,
  babies,
  data,
  view,
  care,
  onCare,
  onGo,
  onRecord,
  onQuick,
  onEditProfile,
  onAddBaby,
  onSwitchBaby,
}: {
  baby: Baby;
  babies: Baby[];
  data: BabyData;
  view: PetView;
  care: CareState;
  onCare: (id: CareId) => void;
  onGo: (tab: "pets" | "learn" | "records") => void;
  onRecord: (kind: RecordKind) => void;
  onQuick: (kind: "poop" | "pee") => string;
  onEditProfile: () => void;
  onAddBaby: () => void;
  onSwitchBaby: (id: string) => void;
}) {
  const months = monthsBetween(baby.birthday);
  const stage = stageForMonths(months);
  const today = dateKey();
  const tasks = tasksForDay(stage, dayIndexOf());
  const done = doneToday(data, today);
  const streak = streakOf(activeDays(data), today);
  const total = totalPoints(data);
  const spendable = spendablePoints(data);
  const vaccine = nextVaccine(months, data.vaccines);
  const vaccineAt = vaccine ? dueDate(baby.birthday, vaccine.vaccine.dueMonth) : null;
  const height = latest(data, "height");

  return (
    <div className="g-scroll">
      {/* 6.2 多娃家庭: each档案 is its own world, so switching is explicit. */}
      {babies.length > 1 && (
        <div className="baby-switch" role="tablist" aria-label="选择宝宝">
          {babies.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={b.id === baby.id}
              className={b.id === baby.id ? "on" : ""}
              onClick={() => onSwitchBaby(b.id)}
            >
              {b.name}
            </button>
          ))}
          <button type="button" className="baby-add" onClick={onAddBaby} aria-label="加一个宝宝">
            <Plus className="size-4" strokeWidth={3} />
          </button>
        </div>
      )}

      <button type="button" className="g-card who-card" onClick={onEditProfile}>
        <span className="who-face">
          {baby.name.slice(0, 1)}
        </span>
        <span className="who-text">
          <b className="who-name">
            {baby.name}
            <i className="who-age">{ageLabel(months)}</i>
          </b>
          <i className="who-sub">
            点这里改资料
            <ChevronRight className="size-3" />
          </i>
        </span>
        <span className="who-points">
          <span>
            <b>{total}</b>
            <i>累计</i>
          </span>
          <span>
            <b>{spendable}</b>
            <i>可用</i>
          </span>
        </span>
      </button>

      <PetCard
        view={view}
        sex={baby.sex}
        care={care}
        spendable={spendable}
        collected={revealedCreatures(data).size}
        total={CREATURES.length}
        onCare={onCare}
        onOpenPets={() => onGo("pets")}
      />

      {/* 6.3 适老化: the two most frequent records are one tap from opening. */}
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">随手记一笔</h2>
          <span className="g-count">
            今天 拉屎 {countOnDay(data.events, "poop")} · 尿尿 {countOnDay(data.events, "pee")}
          </span>
        </div>
        <div className="tap-row tap-row-sm">
          <button type="button" className="tap-btn tap-poop" onClick={() => onQuick("poop")}>
            <Toilet className="size-6" strokeWidth={2.4} />
            拉屎
          </button>
          <button type="button" className="tap-btn tap-pee" onClick={() => onQuick("pee")}>
            <Droplet className="size-6" strokeWidth={2.4} />
            尿尿
          </button>
          <button type="button" className="tap-btn tap-more" onClick={() => onGo("records")}>
            <Plus className="size-6" strokeWidth={2.6} />
            更多
          </button>
        </div>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">今日早教</h2>
          <span className="g-count">
            <b>{done.length}</b>/{DAILY_COUNT}
          </span>
        </div>
        <div className="today-grid">
          {tasks.map((t) => {
            const d = dimensionOf(t.dim);
            const ok = done.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`today-tile ${ok ? "on" : ""}`}
                style={{ background: ok ? d.tint : undefined }}
                onClick={() => onGo("learn")}
              >
                <span className="today-dot" style={{ background: d.color }}>
                  {ok ? <CheckCheck className="size-3.5" /> : d.short}
                </span>
                <span className="today-name">{d.name}</span>
                <span className="today-sub">{ok ? "完成" : `+${POINTS.task}`}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="g-btn g-btn-ghost" onClick={() => onGo("learn")}>
          去看今天的玩法
          <ChevronRight className="size-4" />
        </button>
      </section>

      <section className={`g-card streak-card ${done.length ? "on" : ""}`}>
        <span className="streak-flame">
          <Flame className="size-6" />
        </span>
        <span className="streak-text">
          <b>连续 {streak} 天打卡</b>
          <i>
            {done.length
              ? `今天陪玩过了，明天再来。满 ${POINTS.streakEvery} 天多拿 ${POINTS.streakBonus} 分。`
              : "今天还没打卡，做一个小任务就算。"}
          </i>
        </span>
        <span className={`streak-pill ${done.length ? "on" : ""}`}>{done.length ? "已签" : "待签"}</span>
      </section>

      <div className="g-duo">
        <button type="button" className="g-card mini-card" onClick={() => onRecord("growth")}>
          <span className="mini-icon" style={{ background: "#E3F1FF", color: "#2F86D6" }}>
            <Ruler className="size-4" />
          </span>
          <b className="mini-value">
            {height ? `${height.value}` : "—"}
            <i>{height ? METRIC_UNIT.height : ""}</i>
          </b>
          <i className="mini-label">{height ? `${height.date} 量的` : "还没记过身高"}</i>
        </button>
        <button type="button" className="g-card mini-card" onClick={() => onGo("records")}>
          <span className="mini-icon" style={{ background: "#FFEBDD", color: "#E07A2F" }}>
            <Syringe className="size-4" />
          </span>
          <b className="mini-value mini-value-sm">{vaccine ? vaccine.vaccine.name : "都打完了"}</b>
          <i className="mini-label">
            {vaccine
              ? `${STATUS_LABEL[vaccine.status]}${vaccineAt ? ` · ${vaccineAt.getFullYear()}.${vaccineAt.getMonth() + 1}` : ""}`
              : "按国家程序表"}
          </i>
        </button>
      </div>

      {babies.length === 1 && (
        <button type="button" className="g-btn g-btn-ghost" onClick={onAddBaby}>
          <Plus className="size-4" strokeWidth={3} />
          再加一个宝宝
        </button>
      )}
    </div>
  );
}
