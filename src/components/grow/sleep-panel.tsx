"use client";

import { useState } from "react";
import { Droplet, Milk, Moon, Sun, Trash2 } from "lucide-react";
import {
  FEEDS,
  clockOf,
  dayOf,
  durationText,
  eventsOfKind,
  feedName,
  napMinutes,
  napsOf,
  napsOnDay,
  asleepNow,
  type RecordEvent,
} from "@/lib/grow/records";
import { dateKey } from "@/lib/grow/tasks";
import type { BabyData } from "@/lib/grow/store";

/**
 * 4.5 睡眠与喂养记录.
 *
 * Both are one tap, for the same reason the nappy buttons are: the parent
 * doing the recording usually has a child on the other arm. Sleep is a pair
 * of taps rather than a duration field so nobody has to subtract two times at
 * 3am, and the totals are simply added up — there is no target hours, no
 * "enough sleep" line and no comparison, because sleep is the single thing
 * parents of small children are most anxious about and a number to fall short
 * of would do real harm.
 */
export function SleepPanel({
  data,
  onSleep,
  onFeed,
  onDelete,
}: {
  data: BabyData;
  onSleep: (state: "down" | "up") => void;
  onFeed: (what: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const today = dateKey();
  const open = asleepNow(data.events);
  const naps = napsOnDay(data.events, today);
  const done = naps.filter((n) => n.to != null);
  const totalMinutes = done.reduce((sum, n) => sum + napMinutes(n), 0);
  const feeds = eventsOfKind(data.events, "feed").filter((e) => dayOf(e.at) === today);

  return (
    <div className="g-scroll">
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">睡觉</h2>
          <span className="g-sub">{open ? "正在睡" : `今天 ${done.length} 觉`}</span>
        </div>

        {open ? (
          <button type="button" className="tap-btn tap-wake" onClick={() => onSleep("up")}>
            <Sun className="size-8" />
            <span className="tap-name">醒了</span>
            <span className="tap-sub">已经睡了 {durationText(napMinutes(open))}</span>
          </button>
        ) : (
          <button type="button" className="tap-btn tap-sleep" onClick={() => onSleep("down")}>
            <Moon className="size-8" />
            <span className="tap-name">睡了</span>
            <span className="tap-sub">醒了再按一次，时长自己算</span>
          </button>
        )}

        {done.length > 0 && (
          <div className="sleep-total">
            今天睡了 <b>{durationText(totalMinutes)}</b>，分 {done.length} 觉
          </div>
        )}

        {!naps.length && (
          <p className="g-hint">按一下「睡了」，等宝宝醒了再按「醒了」，这一觉多久就自己出来了。</p>
        )}

        {naps.length > 0 && (
          <ul className="sleep-list">
            {[...naps].reverse().map((nap) => (
              <li key={nap.id} className="sleep-row">
                <span className="sleep-when">
                  {clockOf(nap.from)}
                  {nap.to ? ` – ${clockOf(nap.to)}` : " – 还在睡"}
                </span>
                <span className="sleep-len">{nap.to ? durationText(napMinutes(nap)) : "…"}</span>
                {confirm === nap.id ? (
                  <span className="row-confirm">
                    <button
                      type="button"
                      className="g-btn g-btn-warn"
                      onClick={() => {
                        onDelete(nap.id);
                        setConfirm(null);
                      }}
                    >
                      删掉
                    </button>
                    <button type="button" className="g-btn g-btn-ghost" onClick={() => setConfirm(null)}>
                      算了
                    </button>
                  </span>
                ) : (
                  <button type="button" className="row-del" onClick={() => setConfirm(nap.id)} aria-label="删掉这一觉">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="g-hint">
          这里只把你按下的时间加起来，不设应该睡多久，也不和别的宝宝比。每个宝宝的觉都不一样，数字只是给你自己回看的。
        </p>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">喂奶喝水</h2>
          <span className="g-sub">今天 {feeds.length} 次</span>
        </div>
        <div className="feed-row">
          {FEEDS.map((f) => (
            <button key={f.id} type="button" className="feed-btn" onClick={() => onFeed(f.id)}>
              {f.id === "water" ? <Droplet className="size-6" /> : <Milk className="size-6" />}
              <span>{f.name}</span>
            </button>
          ))}
        </div>
        <p className="g-hint">只记时间和次数，不记毫升——量不量、喂多少，你比这个 App 清楚。</p>

        {feeds.length > 0 && (
          <ul className="feed-list">
            {[...feeds].reverse().map((e) => (
              <FeedRow key={e.id} event={e} confirm={confirm} onConfirm={setConfirm} onDelete={onDelete} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FeedRow({
  event,
  confirm,
  onConfirm,
  onDelete,
}: {
  event: RecordEvent;
  confirm: string | null;
  onConfirm: (id: string | null) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="feed-entry">
      <span className="feed-kind">{feedName(event.pick)}</span>
      <span className="feed-time">{clockOf(event.at)}</span>
      {confirm === event.id ? (
        <span className="row-confirm">
          <button
            type="button"
            className="g-btn g-btn-warn"
            onClick={() => {
              onDelete(event.id);
              onConfirm(null);
            }}
          >
            删掉
          </button>
          <button type="button" className="g-btn g-btn-ghost" onClick={() => onConfirm(null)}>
            算了
          </button>
        </span>
      ) : (
        <button type="button" className="row-del" onClick={() => onConfirm(event.id)} aria-label="删掉这一次">
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}

/** Past days, so a parent can see a week at a glance without a chart. */
export function sleepByDay(data: BabyData) {
  const byDay = new Map<string, { naps: number; minutes: number }>();
  for (const nap of napsOf(data.events)) {
    if (nap.to == null) continue;
    const day = dayOf(nap.from);
    const row = byDay.get(day) ?? { naps: 0, minutes: 0 };
    row.naps += 1;
    row.minutes += napMinutes(nap);
    byDay.set(day, row);
  }
  return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
