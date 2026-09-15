"use client";

import { useMemo } from "react";
import {
  METRIC_SHORT,
  METRIC_UNIT,
  type Metric,
  type Sex,
  bandCurve,
  correctedMonths,
  monthsBetween,
  valueAtZ,
} from "@/lib/grow/growth";
import { WHO_MAX_MONTH } from "@/lib/grow/who-data";

type Point = { date: string; value: number };

const W = 520;
const H = 300;
const PAD = { top: 14, right: 46, bottom: 30, left: 38 };

/**
 * WHO reference bands with the child's own measurements on top. The bands are
 * the point: a single dot means very little, the shape of the line over time
 * is what a parent (and a doctor) actually reads.
 */
export function GrowthCurve({
  metric,
  sex,
  birthday,
  points,
  pretermWeeks = null,
}: {
  metric: Metric;
  sex: Sex;
  birthday: string;
  points: Point[];
  /** 4.7 — plot a preterm baby against corrected age, not the calendar. */
  pretermWeeks?: number | null;
}) {
  const chart = useMemo(() => {
    const age = (date?: string) => correctedMonths(monthsBetween(birthday, date), pretermWeeks);
    const mine = points
      .map((p) => ({ month: age(p.date), value: p.value }))
      .filter((p) => Number.isFinite(p.month) && p.month >= 0 && p.month <= WHO_MAX_MONTH)
      .sort((a, b) => a.month - b.month);

    const now = age();
    // The reference data stops at 36 months, so the window has to stay inside
    // it even when the child is older — otherwise from would run past to and
    // every band would come back empty.
    const centre = Math.min(WHO_MAX_MONTH, mine.length ? mine[mine.length - 1]!.month : now);
    const wanted = Math.floor(Math.min(centre, mine[0]?.month ?? centre) - 2);
    const to = Math.min(WHO_MAX_MONTH, Math.max(8, Math.ceil(centre + 4)));
    const from = Math.min(Math.max(0, wanted), Math.max(0, to - 8));

    const low = bandCurve(metric, sex, -1.8808, from, to);
    const high = bandCurve(metric, sex, 1.8808, from, to);
    const inner = bandCurve(metric, sex, -1.0364, from, to);
    const innerHigh = bandCurve(metric, sex, 1.0364, from, to);
    const mid = bandCurve(metric, sex, 0, from, to);

    let yMin = Math.min(...low.map((p) => p.value));
    let yMax = Math.max(...high.map((p) => p.value));
    for (const p of mine) {
      yMin = Math.min(yMin, p.value);
      yMax = Math.max(yMax, p.value);
    }
    const pad = (yMax - yMin) * 0.08 || 1;
    yMin -= pad;
    yMax += pad;

    const x = (month: number) => PAD.left + ((month - from) / (to - from)) * (W - PAD.left - PAD.right);
    const y = (value: number) => PAD.top + (1 - (value - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
    const line = (pts: { month: number; value: number }[]) =>
      pts.map((p, i) => `${i ? "L" : "M"}${x(p.month).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
    const area = (a: { month: number; value: number }[], b: { month: number; value: number }[]) =>
      `${line(a)} L${x(b[b.length - 1]!.month).toFixed(1)} ${y(b[b.length - 1]!.value).toFixed(1)} ${b
        .slice(0, -1)
        .reverse()
        .map((p) => `L${x(p.month).toFixed(1)} ${y(p.value).toFixed(1)}`)
        .join(" ")} Z`;

    const ticks: number[] = [];
    const step = to - from > 16 ? 6 : to - from > 8 ? 3 : 2;
    for (let m = Math.ceil(from / step) * step; m <= to; m += step) ticks.push(m);

    const yTicks: number[] = [];
    const rough = (yMax - yMin) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const gridStep = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= rough) ?? mag * 10;
    for (let v = Math.ceil(yMin / gridStep) * gridStep; v <= yMax; v += gridStep) yTicks.push(v);

    return {
      from,
      to,
      x,
      y,
      ticks,
      yTicks,
      mine,
      outer: area(low, high),
      band: area(inner, innerHigh),
      mid: line(mid),
      mineLine: line(mine),
      nowX: now >= from && now <= to ? x(now) : null,
      medianNow: valueAtZ(metric, sex, Math.min(WHO_MAX_MONTH, now), 0),
    };
  }, [metric, sex, birthday, points, pretermWeeks]);

  return (
    <figure className="grow-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${METRIC_SHORT[metric]}生长曲线`}>
        <path d={chart.outer} className="curve-outer" />
        <path d={chart.band} className="curve-band" />
        {chart.yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={chart.y(v)} y2={chart.y(v)} className="curve-grid" />
            <text x={PAD.left - 6} y={chart.y(v) + 3.5} className="curve-axis" textAnchor="end">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        ))}
        {chart.ticks.map((m) => (
          <text key={m} x={chart.x(m)} y={H - 10} className="curve-axis" textAnchor="middle">
            {m}月
          </text>
        ))}
        <path d={chart.mid} className="curve-mid" />
        {chart.nowX != null && (
          <line x1={chart.nowX} x2={chart.nowX} y1={PAD.top} y2={H - PAD.bottom} className="curve-now" />
        )}
        <path d={chart.mineLine} className="curve-mine" />
        {chart.mine.map((p, i) => (
          <circle key={i} cx={chart.x(p.month)} cy={chart.y(p.value)} r={i === chart.mine.length - 1 ? 5 : 3.5} className="curve-dot" />
        ))}
        <text x={W - PAD.right + 4} y={chart.y(chart.mine[chart.mine.length - 1]?.value ?? chart.medianNow) + 3.5} className="curve-tag">
          {METRIC_UNIT[metric]}
        </text>
      </svg>
      <figcaption className="grow-chart-key">
        <span><i className="key-band" />P3 - P97</span>
        <span><i className="key-inner" />P15 - P85</span>
        <span><i className="key-mid" />P50 中位</span>
        <span><i className="key-mine" />{"宝宝"}</span>
      </figcaption>
    </figure>
  );
}
