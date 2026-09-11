"use client";

import { Check, ChevronRight, Flame, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetHero } from "@/components/grow/pet-hero";
import { ageLabel, monthsBetween } from "@/lib/grow/growth";
import { POINTS, streakOf } from "@/lib/grow/pet";
import { type GrowState, isDoneToday, totalPoints } from "@/lib/grow/store";
import { dateKey, dayIndexOf, dimensionOf, stageForMonths, taskForDay } from "@/lib/grow/tasks";
import { STATUS_LABEL, dueDate, nextVaccine } from "@/lib/grow/vaccines";

export function Today({
  state,
  onComplete,
  onGoPlan,
  onGoHealth,
}: {
  state: GrowState;
  onComplete: () => void;
  onGoPlan: () => void;
  onGoHealth: () => void;
}) {
  const profile = state.profile!;
  const months = monthsBetween(profile.birthday);
  const stage = stageForMonths(months);
  const task = taskForDay(stage, dayIndexOf());
  const dim = dimensionOf(task.dim);
  const today = dateKey();
  const done = isDoneToday(state, today);
  const streak = streakOf(state.doneDays, today);
  const points = totalPoints(state);
  const toBonus = POINTS.streakEvery - (streak % POINTS.streakEvery);
  const vaccine = nextVaccine(months, state.vaccines);
  const vaccineDate = vaccine ? dueDate(profile.birthday, vaccine.vaccine.dueMonth) : null;

  return (
    <div className="grow-scroll">
      <header className="grow-hud">
        <div className="min-w-0">
          <p className="grow-kicker">一起长大</p>
          <h1 className="grow-hello truncate">
            {profile.name} · {ageLabel(months)}
          </h1>
        </div>
        {streak > 0 && (
          <span className="grow-streak" title={`连续 ${streak} 天`}>
            <Flame className="size-4" />
            {streak} 天
          </span>
        )}
      </header>

      <PetHero points={points} />

      <section className={`grow-card task-card ${done ? "is-done" : ""}`}>
        <div className="task-top">
          <span className="task-dim" style={{ background: dim.tint, color: dim.color }}>
            {dim.name}
          </span>
          <span className="task-quarter">
            {stage.quarters} · {stage.name}
          </span>
        </div>
        <h2 className="task-title">{task.title}</h2>
        <p className="task-tip">{task.tip}</p>

        {done ? (
          <div className="task-done-row">
            <span className="task-done-mark">
              <Check className="size-4" />
              今天完成了
            </span>
            <span className="task-done-note">+{POINTS.task} 分已记上</span>
          </div>
        ) : (
          <Button className="grow-primary" onClick={onComplete}>
            陪他玩过了 · +{POINTS.task} 分
          </Button>
        )}

        <p className="task-foot">
          {done
            ? streak % POINTS.streakEvery === 0
              ? `连续 ${streak} 天，额外拿到了 ${POINTS.streakBonus} 分。`
              : `连续 ${streak} 天，再 ${toBonus} 天多拿 ${POINTS.streakBonus} 分。`
            : "3 到 5 分钟就够。今天实在没空就跳过，明天换一个维度。"}
        </p>
      </section>

      <button type="button" className="grow-card grow-row" onClick={onGoPlan}>
        <div className="min-w-0">
          <p className="grow-row-title">本季度要点与任务库</p>
          <p className="grow-row-sub">
            {stage.tasks.length} 个任务 · 里程碑 {state.milestones.length}/{stage.milestones.length}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 opacity-40" />
      </button>

      {vaccine && (
        <button type="button" className="grow-card grow-row" onClick={onGoHealth}>
          <span className={`grow-row-icon status-${vaccine.status}`}>
            <Syringe className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="grow-row-title truncate">
              {vaccine.vaccine.name} {vaccine.vaccine.dose}
            </p>
            <p className="grow-row-sub">
              {STATUS_LABEL[vaccine.status]}
              {vaccineDate ? ` · 约 ${vaccineDate.getFullYear()} 年 ${vaccineDate.getMonth() + 1} 月` : ""}
              {vaccine.behind > 0 ? ` · 早些的 ${vaccine.behind} 针还没勾上` : ""}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 opacity-40" />
        </button>
      )}

      <a href="/" className="grow-back">
        回到宝宝听听
      </a>
    </div>
  );
}
