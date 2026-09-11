"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";
import { ageLabel, monthsBetween } from "@/lib/grow/growth";
import { POINTS } from "@/lib/grow/pet";
import { type GrowState, pointBreakdown, totalPoints } from "@/lib/grow/store";
import {
  DIMENSIONS,
  NEXT_STAGE_NOTE,
  type Dimension,
  dimensionOf,
  stageForMonths,
} from "@/lib/grow/tasks";

export function Plan({ state, onToggleMilestone }: { state: GrowState; onToggleMilestone: (id: string) => void }) {
  const profile = state.profile!;
  const months = monthsBetween(profile.birthday);
  const stage = stageForMonths(months);
  const [filter, setFilter] = useState<Dimension | "all">("all");
  const [openPoints, setOpenPoints] = useState(false);

  const tasks = filter === "all" ? stage.tasks : stage.tasks.filter((t) => t.dim === filter);
  const lines = pointBreakdown(state);
  const points = totalPoints(state);

  return (
    <div className="grow-scroll">
      <header className="grow-hud">
        <div className="min-w-0">
          <p className="grow-kicker">{stage.quarters} · {stage.fromMonth}-{stage.toMonth} 月龄</p>
          <h1 className="grow-hello truncate">{stage.name}</h1>
        </div>
        <span className="grow-age">{ageLabel(months)}</span>
      </header>

      <section className="grow-card">
        <h2 className="grow-h2">本季度发展速览</h2>
        {stage.overview.map((line) => (
          <p key={line} className="grow-body">
            {line}
          </p>
        ))}
        {months > 24 && <p className="grow-note">{NEXT_STAGE_NOTE}</p>}
      </section>

      <section className="grow-card">
        <h2 className="grow-h2">这个阶段的四个方向</h2>
        <ul className="focus-list">
          {stage.focus.map((f) => {
            const d = dimensionOf(f.dim);
            return (
              <li key={f.dim}>
                <span className="focus-chip" style={{ background: d.tint, color: d.color }}>
                  {d.short}
                </span>
                <div>
                  <p className="focus-name">{d.name}</p>
                  <p className="focus-text">{f.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grow-card">
        <h2 className="grow-h2">里程碑</h2>
        <p className="grow-body">
          这些是这个阶段比较有代表性的几个动作。做到了就勾上，每个 {POINTS.milestone} 分。没做到也完全不用急，前后差几个月都很常见。
        </p>
        <ul className="milestone-list">
          {stage.milestones.map((m) => {
            const done = state.milestones.includes(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={`milestone ${done ? "on" : ""}`}
                  onClick={() => onToggleMilestone(m.id)}
                  aria-pressed={done}
                >
                  <span className="milestone-box">{done && <Check className="size-3.5" strokeWidth={3.5} />}</span>
                  <span className="min-w-0">
                    <span className="milestone-title">{m.title}</span>
                    <span className="milestone-hint">{m.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grow-card">
        <div className="task-lib-head">
          <h2 className="grow-h2 mb-0">任务库</h2>
          <span className="grow-count">{stage.tasks.length} 个</span>
        </div>
        <div className="dim-filter">
          <button type="button" className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
            全部
          </button>
          {DIMENSIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={filter === d.id ? "on" : ""}
              onClick={() => setFilter(d.id)}
              style={filter === d.id ? { background: d.tint, color: d.color, borderColor: d.color } : undefined}
            >
              {d.name}
            </button>
          ))}
        </div>
        <ul className="task-lib">
          {tasks.map((t) => {
            const d = dimensionOf(t.dim);
            return (
              <li key={t.id}>
                <span className="task-lib-dot" style={{ background: d.color }} aria-hidden />
                <div className="min-w-0">
                  <p className="task-lib-title">{t.title}</p>
                  <p className="task-lib-tip">{t.tip}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grow-card">
        <button type="button" className="points-head" onClick={() => setOpenPoints((v) => !v)} aria-expanded={openPoints}>
          <div>
            <h2 className="grow-h2 mb-0">积分 {points}</h2>
            <p className="grow-row-sub">{openPoints ? "收起明细" : "看看分是怎么来的"}</p>
          </div>
          <Info className="size-5 shrink-0 opacity-40" />
        </button>
        {openPoints && (
          <>
            <ul className="points-list">
              {lines.map((l) => (
                <li key={l.label}>
                  <span className="points-label">{l.label}</span>
                  <span className="points-detail">{l.detail}</span>
                  <span className="points-value">{l.points}</span>
                </li>
              ))}
            </ul>
            <p className="grow-note">
              积分不会过期，也不会清零。健康记录的分值刻意压得比早教任务低，是为了不让记录变成刷分，记的数字才有用。
            </p>
          </>
        )}
      </section>
    </div>
  );
}
