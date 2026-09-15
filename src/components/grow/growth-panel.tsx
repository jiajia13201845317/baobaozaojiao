"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { GrowthCurve } from "@/components/grow/curve";
import {
  METRICS,
  METRIC_LABEL,
  METRIC_RANGE,
  METRIC_SHORT,
  METRIC_UNIT,
  type Metric,
  correctedMonths,
  monthsBetween,
  percentileFromZ,
  readPercentile,
  zScore,
} from "@/lib/grow/growth";
import { kindSpec } from "@/lib/grow/records";
import { type Baby, type BabyData, latest, seriesOf } from "@/lib/grow/store";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function GrowthPanel({
  baby,
  data,
  onSave,
}: {
  baby: Baby;
  data: BabyData;
  onSave: (values: Partial<Record<Metric, number>>, date: string) => void;
}) {
  const [metric, setMetric] = useState<Metric>("height");
  const [adding, setAdding] = useState(false);

  const raw = monthsBetween(baby.birthday);
  const corrected = baby.useCorrected ? correctedMonths(raw, baby.pretermWeeks) : raw;
  const series = seriesOf(data, metric);
  const last = latest(data, metric);
  const lastRaw = last ? monthsBetween(baby.birthday, last.date) : null;
  const lastMonths = lastRaw == null ? null : baby.useCorrected ? correctedMonths(lastRaw, baby.pretermWeeks) : lastRaw;
  const read =
    last && lastMonths != null && lastMonths <= 36
      ? readPercentile(percentileFromZ(zScore(metric, baby.sex, lastMonths, last.value)))
      : null;

  return (
    <div className="g-scroll">
      <section className="g-card">
        <div className="metric-switch" role="tablist" aria-label="选择指标">
          {METRICS.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={metric === m}
              className={metric === m ? "on" : ""}
              onClick={() => setMetric(m)}
            >
              {METRIC_SHORT[m]}
            </button>
          ))}
        </div>

        {baby.pretermWeeks != null && (
          <p className="g-note">
            {baby.useCorrected
              ? `按矫正月龄放在曲线上（出生 ${baby.pretermWeeks} 周，矫正后约 ${Math.floor(corrected)} 个月）。可以在资料里切回实际月龄。`
              : `按实际月龄放在曲线上。WHO 这套参考线描述的是足月宝宝，早产宝宝一般看矫正月龄。`}
          </p>
        )}

        {series.length === 0 ? (
          <div className="g-empty">
            <span className="g-empty-ring" />
            <p className="g-empty-title">还没有{METRIC_LABEL[metric]}记录</p>
            <p className="g-empty-sub">记两次以上才看得出趋势。曲线看的是走向，不是某一次落在哪一格。</p>
          </div>
        ) : (
          <>
            {corrected <= 36 && (
              <GrowthCurve
                metric={metric}
                sex={baby.sex}
                birthday={baby.birthday}
                points={series}
                pretermWeeks={baby.useCorrected ? baby.pretermWeeks : null}
              />
            )}
            {read && last && (
              <div className={`read-box tone-${read.tone}`}>
                <p className="read-top">
                  最近一次 <b>{last.value}</b> {METRIC_UNIT[metric]} · {read.short}
                </p>
                <p className="read-note">{read.note}</p>
              </div>
            )}
            {corrected > 36 && last && (
              <div className="read-box tone-normal">
                <p className="read-top">
                  最近一次 <b>{last.value}</b> {METRIC_UNIT[metric]}
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
            birthday={baby.birthday}
            onCancel={() => setAdding(false)}
            onSave={(values, date) => {
              onSave(values, date);
              setAdding(false);
            }}
          />
        ) : (
          <button type="button" className="g-btn g-btn-go" onClick={() => setAdding(true)}>
            <Plus className="size-4" strokeWidth={3} />
            记一次 · 当天首次 +{kindSpec("growth").points} 分
          </button>
        )}

        {series.length > 0 && (
          <ul className="measure-list">
            {[...series]
              .reverse()
              .slice(0, 8)
              .map((s) => (
                <li key={`${s.date}-${s.value}`}>
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

      <p className="g-legal">这里只把数字放到参考曲线上，不判断高矮胖瘦，也不给任何结论。</p>
    </div>
  );
}

function MeasureForm({
  birthday,
  onSave,
  onCancel,
}: {
  birthday: string;
  onSave: (values: Partial<Record<Metric, number>>, date: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [raw, setRaw] = useState<Record<Metric, string>>({ height: "", weight: "", head: "" });

  const parsed = METRICS.map((m) => {
    const text = raw[m].trim();
    const value = Number(text);
    const has = text !== "" && Number.isFinite(value);
    const bad = has && (value < METRIC_RANGE[m].min || value > METRIC_RANGE[m].max);
    return { metric: m, has, bad, value };
  });
  const beforeBirth = date < birthday;
  const future = date > todayStr();
  const ready = parsed.some((p) => p.has) && !parsed.some((p) => p.bad) && !beforeBirth && !future;

  return (
    <div className="measure-form">
      {METRICS.map((m) => (
        <label className="g-field" key={m}>
          <span>
            {METRIC_LABEL[m]} ({METRIC_UNIT[m]})
          </span>
          <input
            id={`m-${m}`}
            type="number"
            inputMode="decimal"
            step={METRIC_RANGE[m].step}
            value={raw[m]}
            onChange={(e) => setRaw((prev) => ({ ...prev, [m]: e.target.value }))}
            placeholder={m === "height" ? "例 82.5" : m === "weight" ? "例 10.8" : "例 47.5"}
          />
        </label>
      ))}
      <label className="g-field">
        <span>测量日期</span>
        <input
          id="m-date"
          type="date"
          value={date}
          min={birthday}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      {parsed
        .filter((p) => p.bad)
        .map((p) => (
          <p className="g-error" key={p.metric}>
            {METRIC_LABEL[p.metric]}请填 {METRIC_RANGE[p.metric].min}-{METRIC_RANGE[p.metric].max}{" "}
            {METRIC_UNIT[p.metric]} 之间。
          </p>
        ))}
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
          onClick={() => {
            if (!ready) return;
            const values: Partial<Record<Metric, number>> = {};
            for (const p of parsed) {
              if (p.has && !p.bad) values[p.metric] = Math.round(p.value * 10) / 10;
            }
            onSave(values, date);
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}
