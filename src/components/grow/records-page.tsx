"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Ruler,
  Syringe,
  Thermometer,
  Toilet,
  Trash2,
  Undo2,
  Utensils,
} from "lucide-react";
import { GrowthPanel } from "@/components/grow/growth-panel";
import { MealPanel } from "@/components/grow/meal-panel";
import { NappyPanel } from "@/components/grow/nappy-panel";
import { TempPanel } from "@/components/grow/temp-panel";
import { VaccinePanel } from "@/components/grow/vaccine-panel";
import { ageLabel, monthsBetween } from "@/lib/grow/growth";
import type { Metric } from "@/lib/grow/growth";
import { clockOf, countOnDay, eventsOnDay, kindSpec, tempWayName } from "@/lib/grow/records";
import type { RecordEvent } from "@/lib/grow/records";
import type { Baby, BabyData } from "@/lib/grow/store";
import { VACCINES } from "@/lib/grow/vaccines";

export type RecordView = "hub" | "growth" | "temp" | "nappy" | "meal" | "vaccine";

const TITLES: Record<RecordView, string> = {
  hub: "记录",
  growth: "身高体重头围",
  temp: "体温",
  nappy: "拉屎尿尿",
  meal: "吃饭",
  vaccine: "疫苗",
};

/** How long the undo stays up after a one-tap record (4.4). */
const UNDO_MS = 6000;

const ROW_ICON: Record<string, typeof Ruler> = {
  growth: Ruler,
  temp: Thermometer,
  poop: Toilet,
  pee: Droplet,
  meal: Utensils,
};

/**
 * The 记录 tab.
 *
 * 6.3 适老化 drives the layout: the two things logged most often are a single
 * oversized tap at the very top, before any navigation, because grandparents
 * are heavy contributors and should never have to find a sub-page to log a
 * nappy. Everything that needs a number or a photo sits behind a row below.
 */
export function RecordsPage({
  baby,
  data,
  view,
  onView,
  onInstant,
  onUndo,
  onSaveGrowth,
  onSaveTemp,
  onTagEvent,
  onDeleteEvent,
  onPickMeal,
  onToggleVaccine,
}: {
  baby: Baby;
  data: BabyData;
  view: RecordView;
  onView: (v: RecordView) => void;
  /** Returns the new record's id so the undo has something to point at. */
  onInstant: (kind: "poop" | "pee") => string;
  onUndo: (id: string) => void;
  onSaveGrowth: (values: Partial<Record<Metric, number>>, date: string) => void;
  onSaveTemp: (temp: number, way: string, at: number) => void;
  onTagEvent: (id: string, tags: string[]) => void;
  onDeleteEvent: (id: string) => void;
  onPickMeal: (file: File) => void;
  onToggleVaccine: (id: string) => void;
}) {
  if (view === "growth") return <GrowthPanel baby={baby} data={data} onSave={onSaveGrowth} />;
  if (view === "temp") return <TempPanel data={data} onSave={onSaveTemp} onDelete={onDeleteEvent} />;
  if (view === "nappy") return <NappyPanel data={data} onTag={onTagEvent} onDelete={onDeleteEvent} />;
  if (view === "meal") return <MealPanel data={data} onDelete={onDeleteEvent} onPick={onPickMeal} />;
  if (view === "vaccine") return <VaccinePanel baby={baby} data={data} onToggle={onToggleVaccine} />;

  return (
    <Hub
      baby={baby}
      data={data}
      onView={onView}
      onInstant={onInstant}
      onUndo={onUndo}
      onDeleteEvent={onDeleteEvent}
      onPickMeal={onPickMeal}
    />
  );
}

export function RecordsHeader({ view, onBack }: { view: RecordView; onBack: () => void }) {
  if (view === "hub") return null;
  return (
    <button type="button" className="g-back" onClick={onBack}>
      <ChevronLeft className="size-4" strokeWidth={3} />
      记录
    </button>
  );
}

export function recordTitle(view: RecordView) {
  return TITLES[view];
}

function Hub({
  baby,
  data,
  onView,
  onInstant,
  onUndo,
  onDeleteEvent,
  onPickMeal,
}: {
  baby: Baby;
  data: BabyData;
  onView: (v: RecordView) => void;
  onInstant: (kind: "poop" | "pee") => string;
  onUndo: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onPickMeal: (file: File) => void;
}) {
  const [undo, setUndo] = useState<{ id: string; label: string } | null>(null);
  const timer = useRef<number | null>(null);
  const mealInput = useRef<HTMLInputElement>(null);
  const today = eventsOnDay(data.events);
  const vaccineDone = VACCINES.filter((v) => data.vaccines.includes(v.id)).length;

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const tap = (kind: "poop" | "pee") => {
    const id = onInstant(kind);
    if (timer.current) window.clearTimeout(timer.current);
    setUndo({ id, label: kindSpec(kind).name });
    timer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
  };

  return (
    <div className="g-scroll">
      <header className="g-hero">
        <h1 className="g-hero-title">记录</h1>
        <p className="g-hero-sub">
          {baby.name} · {ageLabel(monthsBetween(baby.birthday))} · 只记录，不下判断
        </p>
      </header>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">一按就记</h2>
          <span className="g-count">
            今天 拉屎 {countOnDay(data.events, "poop")} · 尿尿 {countOnDay(data.events, "pee")}
          </span>
        </div>
        <div className="tap-row">
          <button type="button" className="tap-btn tap-poop" onClick={() => tap("poop")}>
            <Toilet className="size-7" strokeWidth={2.4} />
            拉屎
          </button>
          <button type="button" className="tap-btn tap-pee" onClick={() => tap("pee")}>
            <Droplet className="size-7" strokeWidth={2.4} />
            尿尿
          </button>
        </div>

        {/* 4.4 打卡后提供几秒内撤销入口 */}
        {undo && (
          <div className="undo-bar" role="status">
            <span>记下一次{undo.label}了</span>
            <button
              type="button"
              onClick={() => {
                onUndo(undo.id);
                setUndo(null);
              }}
            >
              <Undo2 className="size-4" strokeWidth={2.8} />
              撤销
            </button>
          </div>
        )}

        <input
          ref={mealInput}
          id="hub-meal-photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickMeal(file);
            e.target.value = "";
          }}
        />
        <div className="tap-row tap-row-sm">
          <button type="button" className="tap-btn tap-temp" onClick={() => onView("temp")}>
            <Thermometer className="size-6" strokeWidth={2.4} />
            量体温
          </button>
          <button type="button" className="tap-btn tap-meal" onClick={() => mealInput.current?.click()}>
            <Camera className="size-6" strokeWidth={2.4} />
            拍吃的
          </button>
        </div>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">今天记了什么</h2>
          <span className="g-count">{today.length} 条</span>
        </div>
        {today.length === 0 ? (
          <div className="g-empty">
            <span className="g-empty-ring" />
            <p className="g-empty-title">今天还是空的</p>
            <p className="g-empty-sub">记一笔，宠物就长一点。漏了也没关系，积分不会掉。</p>
          </div>
        ) : (
          <ul className="today-log">
            {today.map((e) => (
              <LogRow key={e.id} event={e} onDelete={onDeleteEvent} />
            ))}
          </ul>
        )}
      </section>

      <section className="g-card">
        <h2 className="g-h2">分项记录</h2>
        <ul className="entry-list">
          <EntryRow
            icon={Ruler}
            title="身高 · 体重 · 头围"
            sub={`${data.events.filter((e) => e.kind === "growth").length} 次 · 放在 WHO 参考曲线上`}
            onClick={() => onView("growth")}
          />
          <EntryRow
            icon={Thermometer}
            title="体温"
            sub={`${data.events.filter((e) => e.kind === "temp").length} 次 · 只记数字和时间`}
            onClick={() => onView("temp")}
          />
          <EntryRow
            icon={Droplet}
            title="拉屎 · 尿尿"
            sub={`${data.events.filter((e) => e.kind === "poop" || e.kind === "pee").length} 次 · 次数与时间`}
            onClick={() => onView("nappy")}
          />
          <EntryRow
            icon={Camera}
            title="吃饭"
            sub={`${data.events.filter((e) => e.kind === "meal").length} 张 · 拍了就算`}
            onClick={() => onView("meal")}
          />
          <EntryRow
            icon={Syringe}
            title="疫苗"
            sub={`已记 ${vaccineDone}/${VACCINES.length} 针`}
            onClick={() => onView("vaccine")}
          />
        </ul>
      </section>

      <p className="g-legal">
        这个 App 只做记录和提醒，不提供诊断或治疗建议。所有记录都只存在这台设备上，不上传。
      </p>
    </div>
  );
}

function EntryRow({
  icon: Icon,
  title,
  sub,
  onClick,
}: {
  icon: typeof Ruler;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" className="entry-row" onClick={onClick}>
        <span className="entry-orb">
          <Icon className="size-5" strokeWidth={2.4} />
        </span>
        <span className="entry-text">
          <b>{title}</b>
          <i>{sub}</i>
        </span>
        <ChevronRight className="size-4 shrink-0" />
      </button>
    </li>
  );
}

function LogRow({ event, onDelete }: { event: RecordEvent; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const Icon = ROW_ICON[event.kind] ?? Ruler;
  const spec = kindSpec(event.kind);

  const detail =
    event.kind === "temp"
      ? `${event.num?.temp?.toFixed(1)} °C · ${tempWayName(event.pick)}`
      : event.kind === "growth"
        ? [
            event.num?.height != null ? `身高 ${event.num.height}` : null,
            event.num?.weight != null ? `体重 ${event.num.weight}` : null,
            event.num?.head != null ? `头围 ${event.num.head}` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : event.kind === "meal"
          ? "拍了一张"
          : (event.tags ?? []).join(" · ") || "记下了";

  return (
    <li>
      <div className="log-top">
        <span className={`log-orb kind-${event.kind}`}>
          <Icon className="size-4" strokeWidth={2.6} />
        </span>
        <span className="log-text">
          <b>{spec.name}</b>
          <i>{detail}</i>
        </span>
        <span className="log-time">{clockOf(event.at)}</span>
        <button type="button" className="row-del" onClick={() => setConfirming(true)} aria-label="删除这条记录">
          <Trash2 className="size-4" />
        </button>
      </div>
      {confirming && (
        <div className="row-confirm">
          <span>删掉这条记录？</span>
          <button type="button" className="g-btn g-btn-ghost" onClick={() => setConfirming(false)}>
            不删
          </button>
          <button type="button" className="g-btn g-btn-warn" onClick={() => onDelete(event.id)}>
            删掉
          </button>
        </div>
      )}
    </li>
  );
}
