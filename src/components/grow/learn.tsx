"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";
import { enContentFor } from "@/lib/grow/bilingual";
import { ageLabel, monthsBetween } from "@/lib/grow/growth";
import { POINTS, streakOf } from "@/lib/grow/pet";
import {
  type Baby,
  type BabyData,
  activeDays,
  doneToday,
  pointBreakdown,
  spendablePoints,
  taskCount,
  totalPoints,
} from "@/lib/grow/store";
import {
  DAILY_COUNT,
  DIMENSIONS,
  NEXT_STAGE_NOTE,
  type Dimension,
  dateKey,
  dayIndexOf,
  dimensionOf,
  stageForMonths,
  tasksForDay,
} from "@/lib/grow/tasks";

function greeting(hour = new Date().getHours()) {
  if (hour < 6) return "还没睡呀";
  if (hour < 11) return "早上好";
  if (hour < 13) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export function Learn({
  baby,
  data,
  onDo,
  onToggleMilestone,
  bilingual,
}: {
  baby: Baby;
  data: BabyData;
  onDo: (taskId: string) => void;
  onToggleMilestone: (id: string) => void;
  bilingual: boolean;
}) {
  const months = monthsBetween(baby.birthday);
  const stage = stageForMonths(months);
  const en = enContentFor(stage.id);
  const today = dateKey();
  const todays = tasksForDay(stage, dayIndexOf());
  const done = doneToday(data, today);
  const streak = streakOf(activeDays(data), today);
  const [filter, setFilter] = useState<Dimension | "all">("all");
  const [openPoints, setOpenPoints] = useState(false);

  const library = filter === "all" ? stage.tasks : stage.tasks.filter((t) => t.dim === filter);
  const lines = pointBreakdown(data);

  return (
    <div className="g-scroll">
      <header className="g-hero">
        <h1 className="g-hero-title">
          {greeting()}，{baby.name} 👋
        </h1>
        <p className="g-hero-sub">
          {stage.quarters} · {stage.name} · {ageLabel(months)}
        </p>
      </header>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">今日早教积分</h2>
          <span className="g-count">
            <b>{done.length * POINTS.task}</b>/{DAILY_COUNT * POINTS.task}
          </span>
        </div>
        <span className="g-bar">
          <i style={{ width: `${(done.length / DAILY_COUNT) * 100}%` }} />
        </span>
        <p className="g-note">
          {done.length === 0
            ? "今天还没开始，先挑一个玩 3 分钟 🌱"
            : done.length < DAILY_COUNT
              ? `已经做了 ${done.length} 个，够了。剩下的当备选，不用都做完。`
              : "三个都玩过了，今天很充实。"}
        </p>
      </section>

      <div className="stat-row">
        <div className="g-card stat-tile">
          <b>{done.length * POINTS.task}</b>
          <i>今日积分</i>
        </div>
        <div className="g-card stat-tile">
          <b>{taskCount(data)}</b>
          <i>累计任务</i>
        </div>
        <div className="g-card stat-tile">
          <b>{streak}</b>
          <i>连续天数</i>
        </div>
      </div>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">今天的三个玩法</h2>
          <span className="g-count">做一个就算打卡</span>
        </div>
        <ul className="play-list">
          {todays.map((t) => {
            const d = dimensionOf(t.dim);
            const ok = done.includes(t.id);
            return (
              <li key={t.id} className={ok ? "on" : ""}>
                <div className="play-top">
                  <span className="play-chip" style={{ background: d.tint, color: d.color }}>
                    {d.name}
                  </span>
                  <span className="play-award" style={{ color: d.color }}>
                    {ok ? "已得分" : `可获 ${POINTS.task} 分`}
                  </span>
                </div>
                <p className="play-title">{t.title}</p>
                <p className="play-tip">{t.tip}</p>
                <button
                  type="button"
                  className={`g-btn ${ok ? "g-btn-done" : "g-btn-go"}`}
                  onClick={() => onDo(t.id)}
                  aria-pressed={ok}
                >
                  {ok ? (
                    <>
                      <Check className="size-4" strokeWidth={3.5} />
                      陪他玩过了
                    </>
                  ) : (
                    `陪他玩过了 · +${POINTS.task} 分`
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {bilingual && en && (
        <section className="g-card">
          <div className="g-card-head">
            <h2 className="g-h2">英语启蒙</h2>
            <span className="g-count">和中文一样，只分做没做</span>
          </div>
          <p className="g-hint">{en.focus}</p>
          <ul className="en-list">
            {en.tasks.map((t) => {
              const ok = done.includes(t.id);
              return (
                <li key={t.id} className={ok ? "on" : ""}>
                  <button type="button" className="en-tap" onClick={() => onDo(t.id)} aria-pressed={ok}>
                    <span className={`en-box${ok ? " on" : ""}`}>{ok ? <Check className="size-4" strokeWidth={3.5} /> : null}</span>
                    <span className="en-text">
                      <span className="en-title">{t.title}</span>
                      {t.say && <span className="en-say">{t.say}</span>}
                      <span className="en-tip">{t.tip}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="g-card-head">
            <h2 className="g-h2">这个季度听过多少</h2>
          </div>
          <ul className="milestone-list">
            {en.milestones.map((m) => {
              const ok = data.milestones.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`milestone${ok ? " on" : ""}`}
                    onClick={() => onToggleMilestone(m.id)}
                    aria-pressed={ok}
                  >
                    <span className="milestone-title">{m.title}</span>
                    <span className="milestone-hint">{m.hint}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="g-legal">
            这里记的是「听过、玩过多少」，不是「会了多少」。英语在这个年纪只求耳朵熟悉，没有进度要赶。
          </p>
        </section>
      )}

      <section className="g-card">
        <h2 className="g-h2">本季度发展速览</h2>
        {stage.overview.map((line) => (
          <p key={line} className="g-body">
            {line}
          </p>
        ))}
        {months > 24 && <p className="g-note">{NEXT_STAGE_NOTE}</p>}
      </section>

      <section className="g-card">
        <h2 className="g-h2">这个阶段的四个方向</h2>
        <ul className="focus-list">
          {stage.focus.map((f) => {
            const d = dimensionOf(f.dim);
            return (
              <li key={f.dim}>
                <span className="focus-chip" style={{ background: d.color }}>
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

      <section className="g-card">
        <h2 className="g-h2">里程碑</h2>
        <p className="g-body">
          这个阶段比较有代表性的几个动作。做到了就勾上，每个 {POINTS.milestone} 分。没做到也完全不用急，前后差几个月都很常见。
        </p>
        <ul className="milestone-list">
          {stage.milestones.map((m) => {
            const ok = data.milestones.includes(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={`milestone ${ok ? "on" : ""}`}
                  onClick={() => onToggleMilestone(m.id)}
                  aria-pressed={ok}
                >
                  <span className="g-box">{ok && <Check className="size-3.5" strokeWidth={3.5} />}</span>
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

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">任务库</h2>
          <span className="g-count">{stage.tasks.length} 个</span>
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
              style={filter === d.id ? { background: d.color, borderColor: d.color, color: "#fff" } : undefined}
            >
              {d.name}
            </button>
          ))}
        </div>
        <ul className="task-lib">
          {library.map((t) => {
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

      <section className="g-card">
        <button type="button" className="points-head" onClick={() => setOpenPoints((v) => !v)} aria-expanded={openPoints}>
          <div>
            <h2 className="g-h2 mb-0">累计 {totalPoints(data)} · 可用 {spendablePoints(data)}</h2>
            <p className="g-sub">{openPoints ? "收起明细" : "看看分是怎么来的"}</p>
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
              <li className="points-spent">
                <span className="points-label">领养和照顾花掉</span>
                <span className="points-detail">只扣可用，不扣累计</span>
                <span className="points-value">-{data.spent}</span>
              </li>
            </ul>
            <p className="g-note">
              积分不会过期，也不会清零。累计积分只增不减，宠物升级只看它，所以领养和喂食永远不会让已经养大的宠物退回去。健康记录的分值刻意压得比早教任务低，是为了不让记录变成刷分，记的数字才有用。
            </p>
          </>
        )}
      </section>
    </div>
  );
}
