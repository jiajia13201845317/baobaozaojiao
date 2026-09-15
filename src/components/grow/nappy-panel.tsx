"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { POOP_TAGS, clockOf, dayOf } from "@/lib/grow/records";
import type { RecordEvent } from "@/lib/grow/records";
import type { BabyData } from "@/lib/grow/store";
import { dateKey } from "@/lib/grow/tasks";

const NAMES: Record<string, string> = { poop: "拉屎", pee: "尿尿" };

/**
 * 4.4 排便与排尿记录.
 *
 * Counts and timestamps only. The optional labels are the parent's own words
 * kept as a personal note — the app never reads them, never scores them and
 * never puts a 正常/异常 next to them. Photos are out of the MVP entirely
 * (8.1), which also keeps this screen free of the media consent question.
 */
export function NappyPanel({
  data,
  onTag,
  onDelete,
}: {
  data: BabyData;
  onTag: (id: string, tags: string[]) => void;
  onDelete: (id: string) => void;
}) {
  const all = useMemo(
    () => data.events.filter((e) => e.kind === "poop" || e.kind === "pee").sort((a, b) => b.at - a.at),
    [data.events],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, RecordEvent[]>();
    for (const e of all) {
      const day = dayOf(e.at);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return [...map.entries()].slice(0, 14);
  }, [all]);

  const today = byDay.find(([day]) => day === dateKey())?.[1] ?? [];

  return (
    <div className="g-scroll">
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">今天</h2>
          <span className="g-count">
            拉屎 {today.filter((e) => e.kind === "poop").length} · 尿尿{" "}
            {today.filter((e) => e.kind === "pee").length}
          </span>
        </div>
        {today.length === 0 ? (
          <div className="g-empty">
            <span className="g-empty-ring" />
            <p className="g-empty-title">今天还没记</p>
            <p className="g-empty-sub">在「记录」页上面那两个大按钮，一按就记下时间。</p>
          </div>
        ) : (
          <ul className="nappy-list">
            {today.map((e) => (
              <NappyRow key={e.id} event={e} onTag={onTag} onDelete={onDelete} />
            ))}
          </ul>
        )}
      </section>

      {byDay.filter(([day]) => day !== dateKey()).length > 0 && (
        <section className="g-card">
          <h2 className="g-h2">前几天</h2>
          <ul className="nappy-days">
            {byDay
              .filter(([day]) => day !== dateKey())
              .map(([day, events]) => (
                <li key={day}>
                  <span>{day}</span>
                  <span>
                    拉屎 {events.filter((e) => e.kind === "poop").length} · 尿尿{" "}
                    {events.filter((e) => e.kind === "pee").length}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <p className="g-legal">
        这里只记次数和时间。你加的描述是给自己看的备注，App 不会据此判断是否正常，也不会提醒你该怎么做。
      </p>
    </div>
  );
}

function NappyRow({
  event,
  onTag,
  onDelete,
}: {
  event: RecordEvent;
  onTag: (id: string, tags: string[]) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const tags = event.tags ?? [];

  return (
    <li>
      <div className="nappy-top">
        <span className={`nappy-kind kind-${event.kind}`}>{NAMES[event.kind]}</span>
        <span className="nappy-time">{clockOf(event.at)}</span>
        {/* Always present so the actions stay pinned right whether or not
            the parent added a label. */}
        <span className="nappy-tags">{tags.join(" · ")}</span>
        {event.kind === "poop" && (
          <button type="button" className="nappy-note" onClick={() => setOpen((v) => !v)}>
            {tags.length ? "改备注" : "加备注"}
          </button>
        )}
        <button type="button" className="row-del" onClick={() => setConfirming(true)} aria-label="删除这条记录">
          <Trash2 className="size-4" />
        </button>
      </div>

      {open && event.kind === "poop" && (
        <div className="nappy-picker">
          {POOP_TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                className={`pick ${on ? "on" : ""}`}
                aria-pressed={on}
                onClick={() => onTag(event.id, on ? tags.filter((v) => v !== t) : [...tags, t])}
              >
                {t}
              </button>
            );
          })}
          <i className="g-hint">你自己的描述，App 不解读。</i>
        </div>
      )}

      {/* 7.5 高风险操作二次确认 */}
      {confirming && (
        <div className="row-confirm">
          <span>删掉这条记录？删了就找不回来了。</span>
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
