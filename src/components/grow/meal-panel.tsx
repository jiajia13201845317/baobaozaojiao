"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CircleAlert, Plus, Trash2, Utensils } from "lucide-react";
import { getPhoto } from "@/lib/grow/media";
import {
  MEALS,
  MEAL_TAGS,
  clockOf,
  dayOf,
  eventsOfKind,
  mealForHour,
  mealName,
  type MealId,
  type RecordEvent,
} from "@/lib/grow/records";
import { ALLERGENS, weaningStageFor } from "@/lib/grow/weaning";
import { correctedMonths, monthsBetween } from "@/lib/grow/growth";
import type { Baby, BabyData } from "@/lib/grow/store";
import { dateKey } from "@/lib/grow/tasks";

type Tab = "log" | "album" | "stage" | "allergen";

const TABS: { id: Tab; name: string }[] = [
  { id: "log", name: "记一餐" },
  { id: "album", name: "时间线" },
  { id: "stage", name: "辅食阶段" },
  { id: "allergen", name: "过敏原" },
];

/**
 * 4.3 饮食记录, full version.
 *
 * The 4.3 / 11.6 boundary is the whole design of this screen. A diet log is
 * one small step from a nutrition advisor, and that step is the one that would
 * turn this app into something that tells a parent their child ate wrong. So:
 * the parent picks a 餐次 label and may add their own words, and that is all
 * the structure there is. Nothing here identifies a dish, scores a meal,
 * balances a day, or reads a reaction. 辅食阶段 is reference text about
 * texture, and 过敏原 is a label-reading aid — neither decides anything.
 */
export function MealPanel({
  baby,
  data,
  photosOn,
  onDelete,
  onPick,
  onLog,
  onTag,
}: {
  baby: Baby;
  data: BabyData;
  photosOn: boolean;
  onDelete: (id: string) => void;
  onPick: (meal: MealId, file: File) => void;
  onLog: (meal: MealId) => void;
  onTag: (id: string, tags: string[]) => void;
}) {
  const [tab, setTab] = useState<Tab>("log");

  return (
    <div className="g-scroll">
      <div className="meal-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`pick${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
            {t.name}
          </button>
        ))}
      </div>

      {tab === "log" && (
        <LogTab data={data} photosOn={photosOn} onPick={onPick} onLog={onLog} onTag={onTag} onDelete={onDelete} />
      )}
      {tab === "album" && <AlbumTab data={data} onDelete={onDelete} />}
      {tab === "stage" && <StageTab baby={baby} />}
      {tab === "allergen" && <AllergenTab />}
    </div>
  );
}

function LogTab({
  data,
  photosOn,
  onPick,
  onLog,
  onTag,
  onDelete,
}: {
  data: BabyData;
  photosOn: boolean;
  onPick: (meal: MealId, file: File) => void;
  onLog: (meal: MealId) => void;
  onTag: (id: string, tags: string[]) => void;
  onDelete: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [meal, setMeal] = useState<MealId>(() => mealForHour());
  const today = dateKey();
  const mine = eventsOfKind(data.events, "meal")
    .filter((e) => dayOf(e.at) === today)
    .sort((a, b) => b.at - a.at);

  return (
    <>
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">哪一餐</h2>
          <span className="g-count">今天 {mine.length} 笔</span>
        </div>
        <div className="pick-row">
          {MEALS.map((m) => (
            <button key={m.id} type="button" className={`pick${meal === m.id ? " on" : ""}`} onClick={() => setMeal(m.id)}>
              {m.name}
            </button>
          ))}
        </div>

        <button type="button" className="g-btn g-btn-go g-btn-big" onClick={() => onLog(meal)}>
          <Utensils className="size-5" strokeWidth={2.6} />
          记下这一餐
        </button>

        {photosOn ? (
          <>
            <input
              ref={input}
              id="meal-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPick(meal, file);
                e.target.value = "";
              }}
            />
            <button type="button" className="g-btn g-btn-ghost" onClick={() => input.current?.click()}>
              <Camera className="size-4" />
              顺手拍一张
            </button>
          </>
        ) : (
          <p className="g-hint">
            想留照片的话，去「我的 → 照片记录」把它打开。默认关着，因为宝宝的照片是这个 App 里最敏感的东西。
          </p>
        )}
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">今天</h2>
        </div>
        {!mine.length && (
          <div className="g-empty">
            <span className="g-empty-ring" />
            <p className="g-empty-title">今天还没记</p>
            <p className="g-empty-sub">选个餐次点一下就好，写不写备注随你。</p>
          </div>
        )}
        <ul className="meal-log">
          {mine.map((e) => (
            <MealRow key={e.id} event={e} onTag={onTag} onDelete={onDelete} />
          ))}
        </ul>
      </section>

      <p className="g-legal">
        不做菜品识别，不做营养分析，也不会说哪一餐够不够均衡。要不要调整吃法，请问儿保医生。
      </p>
    </>
  );
}

function MealRow({
  event,
  onTag,
  onDelete,
}: {
  event: RecordEvent;
  onTag: (id: string, tags: string[]) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const tags = event.tags ?? [];

  return (
    <li className="meal-log-row">
      <div className="meal-log-top">
        <span className="meal-badge">{mealName(event.pick)}</span>
        <span className="meal-log-time">{clockOf(event.at)}</span>
        <span className="meal-log-tags">
          {tags.join(" · ")}
          {event.photo ? (tags.length ? " · 有照片" : "有照片") : ""}
        </span>
        {confirm ? (
          <span className="row-confirm">
            <button type="button" className="g-btn g-btn-warn" onClick={() => onDelete(event.id)}>
              删掉
            </button>
            <button type="button" className="g-btn g-btn-ghost" onClick={() => setConfirm(false)}>
              算了
            </button>
          </span>
        ) : (
          <>
            <button type="button" className="meal-note-btn" onClick={() => setOpen(!open)}>
              {open ? "收起" : "备注"}
            </button>
            <button type="button" className="row-del" onClick={() => setConfirm(true)} aria-label="删掉这一餐">
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </div>
      {open && (
        <div className="meal-tag-pick">
          {MEAL_TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                className={`pick${on ? " on" : ""}`}
                onClick={() => onTag(event.id, on ? tags.filter((x) => x !== t) : [...tags, t])}
              >
                {on ? t : <><Plus className="size-3" />{t}</>}
              </button>
            );
          })}
          <p className="g-hint">这些是你自己的描述，App 不会照着它下任何结论。</p>
        </div>
      )}
    </li>
  );
}

function AlbumTab({ data, onDelete }: { data: BabyData; onDelete: (id: string) => void }) {
  const byDay = useMemo(() => {
    const map = new Map<string, RecordEvent[]>();
    for (const e of eventsOfKind(data.events, "meal").sort((a, b) => b.at - a.at)) {
      const day = dayOf(e.at);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return [...map.entries()];
  }, [data.events]);

  if (!byDay.length) {
    return (
      <section className="g-card">
        <div className="g-empty">
          <span className="g-empty-ring" />
          <p className="g-empty-title">还没有可回看的</p>
          <p className="g-empty-sub">记过几天之后，这里会按天排成一条时间线。</p>
        </div>
      </section>
    );
  }

  return (
    <>
      {byDay.slice(0, 40).map(([day, events]) => (
        <section className="g-card" key={day}>
          <div className="g-card-head">
            <h2 className="g-h2">{day === dateKey() ? "今天" : day}</h2>
            <span className="g-count">{events.length} 笔</span>
          </div>
          <ul className="meal-grid">
            {events.map((e) => (
              <MealTile key={e.id} event={e} onDelete={onDelete} />
            ))}
          </ul>
        </section>
      ))}
      <p className="g-legal">照片只存在这台设备上，删掉就是真的删掉，不留副本。</p>
    </>
  );
}

function StageTab({ baby }: { baby: Baby }) {
  const raw = monthsBetween(baby.birthday);
  const months = baby.useCorrected ? correctedMonths(raw, baby.pretermWeeks) : raw;
  const now = weaningStageFor(months);

  return (
    <>
      {now ? (
        <section className="g-card">
          <div className="g-card-head">
            <h2 className="g-h2">{now.name}</h2>
            <span className="g-sub">
              {now.fromMonth}–{now.toMonth} 月
            </span>
          </div>
          <p className="g-body">性状参考</p>
          <ul className="stage-list">
            {now.texture.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="g-body">常见的尝试</p>
          <ul className="stage-list">
            {now.tries.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="g-note">{now.note}</p>
        </section>
      ) : (
        <section className="g-card">
          <div className="g-card-head">
            <h2 className="g-h2">已经吃家常饭了</h2>
          </div>
          <p className="g-body">
            过了两岁，宝宝基本跟着家里一起吃，阶段标签就没什么用了。直接用「记一餐」记下来，比对着阶段看更贴近实际。
          </p>
        </section>
      )}

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">四个阶段</h2>
        </div>
        <p className="g-hint">全部列在这里，方便你往前往后翻，不是时间表。</p>
        <ul className="stage-all">
          {ALL_STAGES.map((s) => (
            <li key={s.id} className={now?.id === s.id ? "on" : ""}>
              <span className="stage-when">
                {s.fromMonth}–{s.toMonth} 月
              </span>
              <span className="stage-name">{s.name}</span>
              <span className="stage-text">{s.texture[0]}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="g-legal">
        这些只是性状上的参考信息。什么时候加、加什么、加多少，由你和儿保医生决定，这个 App 不做建议也不做判断。
      </p>
    </>
  );
}

function AllergenTab() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">常被留意的几样</h2>
        </div>
        <p className="g-note">
          这一页只帮你在食品标签上把它们认出来。它不判断宝宝有没有过敏，也不给该不该吃、什么时候吃的建议——那些要问医生。
        </p>
        <ul className="allergen-list">
          {ALLERGENS.map((a) => (
            <li key={a.id} className="allergen-row">
              <button type="button" className="allergen-top" onClick={() => setOpen(open === a.id ? null : a.id)}>
                <span className="allergen-name">{a.name}</span>
                <span className="allergen-more">{open === a.id ? "收起" : "常见于"}</span>
              </button>
              {open === a.id && (
                <div className="allergen-body">
                  <div className="allergen-also">
                    {a.also.map((x) => (
                      <span key={x}>{x}</span>
                    ))}
                  </div>
                  <p className="g-hint">{a.note}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="g-card allergen-warn">
        <CircleAlert className="size-5 shrink-0" />
        <p>
          如果宝宝吃完某样东西后出现你觉得不对的反应，请直接联系医生或就近就医，不要靠这个 App 判断。着急的时候，先看孩子，别看手机。
        </p>
      </section>
    </>
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
          <i className="meal-blank">{mealName(event.pick)}</i>
        )}
      </span>
      <span className="meal-time">{clockOf(event.at)}</span>
      <button type="button" className="meal-del" onClick={() => setConfirming(true)} aria-label="删除这一笔">
        <Trash2 className="size-3.5" />
      </button>
      {confirming && (
        <div className="row-confirm meal-confirm">
          <span>{event.photo ? "连照片一起删掉？" : "删掉这一笔？"}</span>
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

const ALL_STAGES = [6, 8, 10, 18].map((m) => weaningStageFor(m)!).filter(Boolean);
