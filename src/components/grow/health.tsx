"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { GrowthCurve } from "@/components/grow/curve";
import {
  METRIC_LABEL,
  METRIC_RANGE,
  METRIC_UNIT,
  type Metric,
  ageLabel,
  monthsBetween,
  percentileFromZ,
  readPercentile,
  zScore,
} from "@/lib/grow/growth";
import { POINTS } from "@/lib/grow/pet";
import { type GrowState, type Measure, latest, seriesOf } from "@/lib/grow/store";
import { STATUS_LABEL, VACCINES, dueDate, vaccineStatus } from "@/lib/grow/vaccines";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function Health({
  state,
  onAdd,
  onToggleVaccine,
}: {
  state: GrowState;
  onAdd: (m: Omit<Measure, "id">) => void;
  onToggleVaccine: (id: string) => void;
}) {
  const profile = state.profile!;
  const months = monthsBetween(profile.birthday);
  const [metric, setMetric] = useState<Metric>("height");
  const [adding, setAdding] = useState(false);

  const series = seriesOf(state, metric);
  const last = latest(state, metric);
  const lastValue = last?.[metric];
  const lastMonths = last ? monthsBetween(profile.birthday, last.date) : null;
  const read =
    lastValue != null && lastMonths != null && lastMonths <= 36
      ? readPercentile(percentileFromZ(zScore(metric, profile.sex, lastMonths, lastValue)))
      : null;

  const done = VACCINES.filter((v) => state.vaccines.includes(v.id)).length;

  return (
    <div className="g-scroll">
      <header className="g-hero">
        <h1 className="g-hero-title">健康记录</h1>
        <p className="g-hero-sub">
          {profile.name} · {ageLabel(months)} · 只记录，不下判断
        </p>
      </header>

      <section className="g-card">
        <div className="metric-switch" role="tablist" aria-label="选择指标">
          {(["height", "weight"] as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={metric === m}
              className={metric === m ? "on" : ""}
              onClick={() => setMetric(m)}
            >
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>

        {series.length === 0 ? (
          <div className="g-empty">
            <span className="g-empty-ring" />
            <p className="g-empty-title">还没有{METRIC_LABEL[metric]}记录</p>
            <p className="g-empty-sub">记两次以上才看得出趋势。曲线看的是走向，不是某一次落在哪一格。</p>
          </div>
        ) : (
          <>
            {months <= 36 && (
              <GrowthCurve metric={metric} sex={profile.sex} birthday={profile.birthday} points={series} />
            )}
            {read && lastValue != null && (
              <div className={`read-box tone-${read.tone}`}>
                <p className="read-top">
                  最近一次 <b>{lastValue}</b> {METRIC_UNIT[metric]} · {read.short}
                </p>
                <p className="read-note">{read.note}</p>
              </div>
            )}
            {months > 36 && lastValue != null && (
              <div className="read-box tone-normal">
                <p className="read-top">
                  最近一次 <b>{lastValue}</b> {METRIC_UNIT[metric]}
                </p>
                <p className="read-note">
                  WHO 的这套参考曲线只到 3 岁，所以这里不再给百分位。记录会继续留着，儿保时给医生看就行。
                </p>
              </div>
            )}
          </>
        )}

        {adding ? (
          <MeasureForm
            birthday={profile.birthday}
            onCancel={() => setAdding(false)}
            onSave={(m) => {
              onAdd(m);
              setAdding(false);
            }}
          />
        ) : (
          <button type="button" className="g-btn g-btn-go" onClick={() => setAdding(true)}>
            <Plus className="size-4" strokeWidth={3} />
            记一次 · +{POINTS.health} 分
          </button>
        )}

        {series.length > 0 && (
          <ul className="measure-list">
            {[...series].reverse().slice(0, 6).map((s) => (
              <li key={s.date}>
                <span>{s.date}</span>
                <span>
                  {s.value} {METRIC_UNIT[metric]}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="g-note">
          2 岁前量的是躺着的身长，2 岁后量站着的身高，站着会比躺着矮 0.7 厘米左右。WHO 的参考曲线也是这么分的，所以换姿势那次出现一个小台阶是正常的。
        </p>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">疫苗</h2>
          <span className="g-count">
            已记 {done}/{VACCINES.length}
          </span>
        </div>
        <p className="g-body">
          按《国家免疫规划疫苗儿童免疫程序表（2021 年版）》排的免费疫苗。接种以社区门诊和接种证为准，这里只帮你记着别漏。
        </p>
        <ul className="vaccine-list">
          {VACCINES.filter((v) => v.dueMonth <= Math.max(36, months + 12)).map((v) => {
            const ok = state.vaccines.includes(v.id);
            const status = vaccineStatus(v, months, ok);
            const at = dueDate(profile.birthday, v.dueMonth);
            return (
              <li key={v.id}>
                <button
                  type="button"
                  className={`vaccine ${ok ? "on" : ""}`}
                  onClick={() => onToggleVaccine(v.id)}
                  aria-pressed={ok}
                >
                  <span className="g-box">{ok && <Check className="size-3.5" strokeWidth={3.5} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="vaccine-title">
                      {v.name} <span className="vaccine-dose">{v.dose}</span>
                    </span>
                    <span className="vaccine-sub">
                      {v.dueMonth === 0 ? "出生时" : v.dueMonth < 24 ? `${v.dueMonth} 月龄` : `${v.dueMonth / 12} 周岁`}
                      {at ? ` · ${at.getFullYear()}.${at.getMonth() + 1}` : ""}
                      {v.note ? ` · ${v.note}` : ""}
                    </span>
                  </span>
                  <span className={`vaccine-status status-${status}`}>{STATUS_LABEL[status]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="g-legal">这里只做记录和提醒，不提供诊断或治疗建议。宝宝有任何不舒服，请直接找医生。</p>
    </div>
  );
}

function MeasureForm({
  birthday,
  onSave,
  onCancel,
}: {
  birthday: string;
  onSave: (m: Omit<Measure, "id">) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const h = Number(height);
  const w = Number(weight);
  const hasH = height.trim() !== "" && Number.isFinite(h);
  const hasW = weight.trim() !== "" && Number.isFinite(w);
  const hBad = hasH && (h < METRIC_RANGE.height.min || h > METRIC_RANGE.height.max);
  const wBad = hasW && (w < METRIC_RANGE.weight.min || w > METRIC_RANGE.weight.max);
  const beforeBirth = date < birthday;
  const future = date > todayStr();
  const ready = (hasH || hasW) && !hBad && !wBad && !beforeBirth && !future;

  return (
    <div className="measure-form">
      <div className="measure-row">
        <label className="g-field">
          <span>身长/身高 (cm)</span>
          <input
            id="m-height"
            type="number"
            inputMode="decimal"
            step={METRIC_RANGE.height.step}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="例 82.5"
          />
        </label>
        <label className="g-field">
          <span>体重 (kg)</span>
          <input
            id="m-weight"
            type="number"
            inputMode="decimal"
            step={METRIC_RANGE.weight.step}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="例 10.8"
          />
        </label>
      </div>
      <label className="g-field">
        <span>测量日期</span>
        <input id="m-date" type="date" value={date} min={birthday} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
      </label>

      {hBad && (
        <p className="g-error">
          身高请填 {METRIC_RANGE.height.min}-{METRIC_RANGE.height.max} cm 之间。
        </p>
      )}
      {wBad && (
        <p className="g-error">
          体重请填 {METRIC_RANGE.weight.min}-{METRIC_RANGE.weight.max} kg 之间。
        </p>
      )}
      {beforeBirth && <p className="g-error">测量日期比出生日期还早。</p>}
      {future && <p className="g-error">测量日期不能是将来。</p>}

      <div className="measure-actions">
        <button type="button" className="g-btn g-btn-ghost" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="g-btn g-btn-go"
          disabled={!ready}
          onClick={() =>
            ready &&
            onSave({
              date,
              ...(hasH ? { height: Math.round(h * 10) / 10 } : {}),
              ...(hasW ? { weight: Math.round(w * 10) / 10 } : {}),
            })
          }
        >
          保存
        </button>
      </div>
    </div>
  );
}
