"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { getPhoto } from "@/lib/grow/media";
import { clockOf, dayOf, eventsOfKind, kindSpec } from "@/lib/grow/records";
import type { RecordEvent } from "@/lib/grow/records";
import type { BabyData } from "@/lib/grow/store";
import { dateKey } from "@/lib/grow/tasks";

/**
 * 4.3.2 每日饮食记录, MVP shape only (8.1): a photo and a timestamp.
 *
 * No meal-time tags, no album view, and explicitly no dish recognition or
 * nutrition analysis — 4.3 and 11.6 both single that out as the obvious next
 * step that would quietly turn a diary into an advisor. The comment is here
 * so the next person adding to this file has to decide to cross that line
 * rather than drift over it.
 */
export function MealPanel({
  data,
  onDelete,
  onPick,
}: {
  data: BabyData;
  onDelete: (id: string) => void;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const all = useMemo(() => eventsOfKind(data.events, "meal").sort((a, b) => b.at - a.at), [data.events]);

  const byDay = useMemo(() => {
    const map = new Map<string, RecordEvent[]>();
    for (const e of all) {
      const day = dayOf(e.at);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return [...map.entries()];
  }, [all]);

  return (
    <div className="g-scroll">
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">拍一下吃了什么</h2>
          <span className="g-count">今天 {all.filter((e) => dayOf(e.at) === dateKey()).length} 张</span>
        </div>
        <p className="g-body">
          不用选食材、不用写菜名，拍下来就行，时间自己会记上。以后翻回来看，本身就是一段成长记录。
        </p>
        <input
          ref={input}
          id="meal-photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
        <button type="button" className="g-btn g-btn-go g-btn-big" onClick={() => input.current?.click()}>
          <Camera className="size-5" strokeWidth={2.6} />
          拍一张 · 当天首次 +{kindSpec("meal").points} 分
        </button>
      </section>

      {byDay.length === 0 ? (
        <section className="g-card">
          <div className="g-empty">
            <span className="g-empty-ring" />
            <p className="g-empty-title">还没有照片</p>
            <p className="g-empty-sub">照片只存在这台设备上，不上传，也不做任何识别。</p>
          </div>
        </section>
      ) : (
        byDay.slice(0, 20).map(([day, events]) => (
          <section className="g-card" key={day}>
            <div className="g-card-head">
              <h2 className="g-h2">{day === dateKey() ? "今天" : day}</h2>
              <span className="g-count">{events.length} 张</span>
            </div>
            <ul className="meal-grid">
              {events.map((e) => (
                <MealTile key={e.id} event={e} onDelete={onDelete} />
              ))}
            </ul>
          </section>
        ))
      )}

      <p className="g-legal">
        不做菜品识别，不做营养分析，也不会说这一餐均衡不均衡。照片留在本机，删掉就是真的删掉。
      </p>
    </div>
  );
}

function MealTile({ event, onDelete }: { event: RecordEvent; onDelete: (id: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!event.photo) return;
    let revoke: string | null = null;
    let live = true;
    getPhoto(event.photo, "thumb")
      .then((blob) => {
        if (!live || !blob) return;
        revoke = URL.createObjectURL(blob);
        setUrl(revoke);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [event.photo]);

  return (
    <li className="meal-tile">
      <span className="meal-shot">
        {url ? (
          // The blob lives in IndexedDB on this device; next/image cannot take it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${clockOf(event.at)} 吃的`} />
        ) : (
          <i className="meal-blank" />
        )}
      </span>
      <span className="meal-time">{clockOf(event.at)}</span>
      <button type="button" className="meal-del" onClick={() => setConfirming(true)} aria-label="删除这张照片">
        <Trash2 className="size-3.5" />
      </button>
      {confirming && (
        <div className="row-confirm meal-confirm">
          <span>连照片一起删掉？</span>
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
