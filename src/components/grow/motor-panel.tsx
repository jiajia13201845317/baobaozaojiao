"use client";

import { useState } from "react";
import { Check, Footprints } from "lucide-react";
import { MOTOR_NOTE, motorRefsFor, type MotorRef } from "@/lib/grow/motor";
import { correctedMonths, monthsBetween } from "@/lib/grow/growth";
import { dayOf, eventsOfKind } from "@/lib/grow/records";
import type { Baby, BabyData } from "@/lib/grow/store";

/**
 * 4.6 大运动发展记录.
 *
 * The plan asks for month reference ranges, and this is the screen where a
 * reference range most easily turns into a verdict. Two decisions keep it from
 * doing so. Ranges are wide and shown as "常在这段出现" rather than a deadline,
 * and an item the child has not done yet is simply untouched — there is no
 * overdue state, no red, no count of what is missing. The only thing the app
 * says about a long gap is that a 儿保医生 is the person to ask.
 */
export function MotorPanel({
  baby,
  data,
  onSeen,
  onUnsee,
}: {
  baby: Baby;
  data: BabyData;
  onSeen: (refId: string, what: string) => void;
  onUnsee: (id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const raw = monthsBetween(baby.birthday);
  const months = baby.useCorrected ? correctedMonths(raw, baby.pretermWeeks) : raw;
  const { arriving, earlier, later } = motorRefsFor(months);

  const logged = new Map(
    eventsOfKind(data.events, "motor").map((e) => [e.pick ?? "", { id: e.id, day: dayOf(e.at) }]),
  );

  const section = (title: string, sub: string, refs: MotorRef[]) =>
    refs.length > 0 && (
      <section className="g-card" key={title}>
        <div className="g-card-head">
          <h2 className="g-h2">{title}</h2>
          <span className="g-sub">{sub}</span>
        </div>
        <ul className="motor-list">
          {refs.map((ref) => {
            const hit = logged.get(ref.id);
            return (
              <li key={ref.id} className={`motor-row${hit ? " on" : ""}`}>
                <button
                  type="button"
                  className="motor-tap"
                  onClick={() => (hit ? onUnsee(hit.id) : onSeen(ref.id, ref.what))}
                  aria-pressed={Boolean(hit)}
                >
                  <span className={`motor-box${hit ? " on" : ""}`}>{hit ? <Check className="size-4" /> : null}</span>
                  <span className="motor-text">
                    <span className="motor-what">{ref.what}</span>
                    <span className="motor-range">
                      常在 {ref.fromMonth}–{ref.toMonth} 月龄出现
                      {hit ? ` · 你记的是 ${hit.day}` : ""}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="motor-why"
                  onClick={() => setOpen(open === ref.id ? null : ref.id)}
                  aria-expanded={open === ref.id}
                >
                  {open === ref.id ? "收起" : "说明"}
                </button>
                {open === ref.id && <p className="motor-hint">{ref.hint}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <div className="g-scroll">
      <section className="g-card motor-head">
        <span className="motor-face">
          <Footprints className="size-7" />
        </span>
        <div>
          <p className="motor-age">
            {baby.name}现在 {Math.max(0, Math.round(months))} 个月
            {baby.useCorrected && baby.pretermWeeks ? "（矫正月龄）" : ""}
          </p>
          <p className="g-hint">
            看到哪个动作出现了，点一下记下日期。没点的就是还没点，这里没有「欠着」这回事。
          </p>
        </div>
      </section>

      {section("这段时间常出现", `${Math.max(0, Math.round(months))} 个月左右`, arriving)}
      {section("更早一些的", "有些宝宝会晚一点才出现，点一下补记就好", earlier)}
      {section("再往后的", "先看看，不用现在做什么", later)}

      <p className="g-legal">{MOTOR_NOTE}</p>
    </div>
  );
}
