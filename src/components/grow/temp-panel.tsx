"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TEMP_RANGE, TEMP_WAYS, clockOf, dayOf, eventsOfKind, kindSpec, tempWayName } from "@/lib/grow/records";
import type { RecordEvent } from "@/lib/grow/records";
import type { BabyData } from "@/lib/grow/store";
import { dateKey } from "@/lib/grow/tasks";

const W = 520;
const H = 200;
const PAD = { top: 24, right: 34, bottom: 28, left: 42 };

/**
 * 4.8 体温记录.
 *
 * This is the one place the plan asks to be stricter than everywhere else, so
 * the restraint is deliberate and load-bearing:
 *   - the chart carries numbers and times and nothing else — no fever line,
 *     no shaded band, no colour that means "high"
 *   - the measurement site is a label, never converted or ranked
 *   - the app never suggests how often to measure
 * Reference information about sites lives on a separate help card, away from
 * the family's own data, so the chart itself cannot imply a verdict.
 */
export function TempPanel({
  data,
  onSave,
  onDelete,
}: {
  data: BabyData;
  onSave: (temp: number, way: string, at: number) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const all = useMemo(() => eventsOfKind(data.events, "temp").sort((a, b) => b.at - a.at), [data.events]);
  const today = all.filter((e) => dayOf(e.at) === dateKey()).sort((a, b) => a.at - b.at);

  return (
    <div className="g-scroll">
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">今天的体温</h2>
          <span className="g-count">{today.length} 次</span>
        </div>

        {today.length === 0 ? (
          <div className="g-empty">
            <span className="g-empty-ring" />
            <p className="g-empty-title">今天还没量</p>
            <p className="g-empty-sub">记下数字和时间就好。要不要量、多久量一次，你自己决定。</p>
          </div>
        ) : (
          <TempChart points={today} />
        )}

        {adding ? (
          <TempForm
            onCancel={() => setAdding(false)}
            onSave={(temp, way, at) => {
              onSave(temp, way, at);
              setAdding(false);
            }}
          />
        ) : (
          <button type="button" className="g-btn g-btn-go" onClick={() => setAdding(true)}>
            <Plus className="size-4" strokeWidth={3} />
            记一次 · 当天首次 +{kindSpec("temp").points} 分
          </button>
        )}
      </section>

      {all.length > 0 && (
        <section className="g-card">
          <div className="g-card-head">
            <h2 className="g-h2">全部记录</h2>
            <span className="g-count">{all.length} 条</span>
          </div>
          <ul className="temp-list">
            {all.slice(0, 40).map((e) => (
              <li key={e.id}>
                <span className="temp-when">
                  {dayOf(e.at)} {clockOf(e.at)}
                </span>
                <span className="temp-value">{e.num?.temp?.toFixed(1)}</span>
                <span className="temp-way">{tempWayName(e.pick)}</span>
                <button type="button" className="row-del" onClick={() => onDelete(e.id)} aria-label="删除这条记录">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="g-card">
        <h2 className="g-h2">关于测量方式</h2>
        <p className="g-body">
          腋温、耳温、额温、口温量的是不同部位，读数本来就不一样，所以这里只把你选的方式记在旁边，不做换算，也不把哪一种当标准。
          同一个宝宝前后对比时，尽量固定用同一种方式，数字才好比较。
        </p>
        <p className="g-body">
          具体多少度代表什么、要不要处理、隔多久量一次，这些是医生的判断，App 不给，也不会主动建议你多久量一次。
          定时提醒和「超过某个数值提醒我」要等通知功能做好再上，到时那个数值也由你自己定，App 只负责按你设的执行。
        </p>
      </section>

      <p className="g-legal">
        图上只有你记的数字和时间，没有发热参考线，也没有「正常 / 发烧」的标签。需要判断时请找医生，记录可以导给医生看。
      </p>
    </div>
  );
}

function TempChart({ points }: { points: RecordEvent[] }) {
  const values = points.map((p) => p.num?.temp ?? 0);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(0.4, (hi - lo) * 0.3);
  const yMin = lo - pad;
  const yMax = hi + pad;

  const first = points[0]!.at;
  const last = points[points.length - 1]!.at;
  const span = Math.max(last - first, 3600000);
  const x = (at: number) => PAD.left + ((at - first) / span) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
  /** Keep the first and last labels off the edges rather than half-cut. */
  const label = (at: number) => Math.min(W - PAD.right + 12, Math.max(PAD.left - 6, x(at)));

  const ticks: number[] = [];
  for (let v = Math.ceil(yMin * 2) / 2; v <= yMax; v += 0.5) ticks.push(Math.round(v * 10) / 10);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)} ${y(p.num!.temp!).toFixed(1)}`).join(" ");

  return (
    <figure className="temp-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="今天的体温记录">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="curve-grid" />
            <text x={PAD.left - 6} y={y(v) + 3.5} className="curve-axis" textAnchor="end">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        {points.length > 1 && <path d={line} className="temp-line" />}
        {points.map((p) => (
          <g key={p.id}>
            <circle cx={x(p.at)} cy={y(p.num!.temp!)} r={4.5} className="temp-dot" />
            <text x={label(p.at)} y={y(p.num!.temp!) - 11} className="temp-label" textAnchor="middle">
              {p.num!.temp!.toFixed(1)}
            </text>
            <text x={label(p.at)} y={H - 9} className="curve-axis" textAnchor="middle">
              {clockOf(p.at)}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

function TempForm({
  onSave,
  onCancel,
}: {
  onSave: (temp: number, way: string, at: number) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [way, setWay] = useState<string>(TEMP_WAYS[0].id);
  const value = Number(text);
  const has = text.trim() !== "" && Number.isFinite(value);
  const bad = has && (value < TEMP_RANGE.min || value > TEMP_RANGE.max);

  return (
    <div className="measure-form">
      <label className="g-field">
        <span>体温 (°C)</span>
        <input
          id="t-value"
          type="number"
          inputMode="decimal"
          step={TEMP_RANGE.step}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例 37.2"
        />
      </label>

      <div className="g-field">
        <span>测量方式</span>
        <div className="pick-row pick-wrap">
          {TEMP_WAYS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`pick ${way === w.id ? "on" : ""}`}
              aria-pressed={way === w.id}
              onClick={() => setWay(w.id)}
            >
              {w.name}
            </button>
          ))}
        </div>
        <i className="g-hint">只作标注，不做换算，也不代表哪种更准。</i>
      </div>

      {bad && (
        <p className="g-error">
          请填 {TEMP_RANGE.min}-{TEMP_RANGE.max} °C 之间的数字。
        </p>
      )}

      <div className="measure-actions">
        <button type="button" className="g-btn g-btn-ghost" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="g-btn g-btn-go"
          disabled={!has || bad}
          onClick={() => has && !bad && onSave(Math.round(value * 10) / 10, way, Date.now())}
        >
          保存
        </button>
      </div>
    </div>
  );
}
