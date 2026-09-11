"use client";

import Link from "next/link";
import { CheckCheck, ChevronRight, Flame, Ruler, Syringe } from "lucide-react";
import { PetCard } from "@/components/grow/pet-card";
import { METRIC_UNIT, ageLabel, monthsBetween } from "@/lib/grow/growth";
import { POINTS, streakOf } from "@/lib/grow/pet";
import { CREATURES, type CareId, type CareState, type PetView } from "@/lib/grow/pets";
import {
  type GrowState,
  activeDays,
  doneToday,
  latest,
  spendablePoints,
  totalPoints,
} from "@/lib/grow/store";
import { DAILY_COUNT, dateKey, dayIndexOf, dimensionOf, stageForMonths, tasksForDay } from "@/lib/grow/tasks";
import { STATUS_LABEL, dueDate, nextVaccine } from "@/lib/grow/vaccines";

export function Home({
  state,
  view,
  care,
  onCare,
  onGo,
  onEditProfile,
}: {
  state: GrowState;
  view: PetView;
  care: CareState;
  onCare: (id: CareId) => void;
  onGo: (tab: "pets" | "learn" | "health") => void;
  onEditProfile: () => void;
}) {
  const profile = state.profile!;
  const months = monthsBetween(profile.birthday);
  const stage = stageForMonths(months);
  const today = dateKey();
  const tasks = tasksForDay(stage, dayIndexOf());
  const done = doneToday(state, today);
  const streak = streakOf(activeDays(state), today);
  const total = totalPoints(state);
  const spendable = spendablePoints(state);
  const vaccine = nextVaccine(months, state.vaccines);
  const vaccineAt = vaccine ? dueDate(profile.birthday, vaccine.vaccine.dueMonth) : null;
  const height = latest(state, "height");

  return (
    <div className="g-scroll">
      <button type="button" className="g-card who-card" onClick={onEditProfile}>
        <span className="who-face" style={{ background: view.series.color }}>
          {profile.name.slice(0, 1)}
        </span>
        <span className="who-text">
          <b className="who-name">
            {profile.name}
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
        care={care}
        spendable={spendable}
        collected={state.pets.length}
        total={CREATURES.length}
        onCare={onCare}
        onOpenPets={() => onGo("pets")}
      />

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
        <button type="button" className="g-card mini-card" onClick={() => onGo("health")}>
          <span className="mini-icon" style={{ background: "#E3F1FF", color: "#2F86D6" }}>
            <Ruler className="size-4" />
          </span>
          <b className="mini-value">
            {height?.height != null ? `${height.height}` : "—"}
            <i>{height?.height != null ? METRIC_UNIT.height : ""}</i>
          </b>
          <i className="mini-label">{height ? `${height.date} 量的` : "还没记过身高"}</i>
        </button>
        <button type="button" className="g-card mini-card" onClick={() => onGo("health")}>
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

      <Link href="/" className="g-back">
        回到宝宝听听
      </Link>
    </div>
  );
}
