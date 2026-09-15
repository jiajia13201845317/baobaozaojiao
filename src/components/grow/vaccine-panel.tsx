"use client";

import { Check } from "lucide-react";
import { correctedMonths, monthsBetween } from "@/lib/grow/growth";
import type { Baby, BabyData } from "@/lib/grow/store";
import { STATUS_LABEL, VACCINES, dueDate, nextVaccine, vaccineStatus } from "@/lib/grow/vaccines";

/**
 * 4.2 疫苗登记 — a tick list plus an inferred next dose, nothing more. The
 * plan is explicit that this does not try to match the specialist apps, and
 * that an overdue dose gets "建议尽快补种" rather than a warning.
 *
 * Vaccine schedules go by chronological age even for preterm babies, which is
 * why this screen uses the real age while the growth curve uses corrected.
 */
export function VaccinePanel({
  baby,
  data,
  onToggle,
}: {
  baby: Baby;
  data: BabyData;
  onToggle: (id: string) => void;
}) {
  const months = monthsBetween(baby.birthday);
  const done = VACCINES.filter((v) => data.vaccines.includes(v.id)).length;
  const next = nextVaccine(months, data.vaccines);

  return (
    <div className="g-scroll">
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">疫苗打卡墙</h2>
          <span className="g-count">
            已记 {done}/{VACCINES.length}
          </span>
        </div>
        <p className="g-body">
          按《国家免疫规划疫苗儿童免疫程序表（2021 年版）》排的免费疫苗。接种以社区门诊和接种证为准，这里只帮你记着别漏。
        </p>
        {next && (
          <div className="read-box tone-normal">
            <p className="read-top">
              下一针 <b>{next.vaccine.name}</b> {next.vaccine.dose}
            </p>
            <p className="read-note">
              建议月龄 {next.vaccine.dueMonth === 0 ? "出生时" : `${next.vaccine.dueMonth} 个月`}
              {next.behind > 0 ? ` · 早些的 ${next.behind} 针还没勾上，可以补勾，也可以问问门诊要不要补种。` : ""}
            </p>
          </div>
        )}
        {baby.pretermWeeks != null && (
          <p className="g-note">
            早产宝宝的疫苗一般还是按出生日期算的实际月龄走（生长曲线才看矫正月龄）。具体以接种门诊的安排为准。
          </p>
        )}
        <ul className="vaccine-list">
          {VACCINES.filter((v) => v.dueMonth <= Math.max(36, months + 12)).map((v) => {
            const ok = data.vaccines.includes(v.id);
            const status = vaccineStatus(v, months, ok);
            const at = dueDate(baby.birthday, v.dueMonth);
            return (
              <li key={v.id}>
                <button
                  type="button"
                  className={`vaccine ${ok ? "on" : ""}`}
                  onClick={() => onToggle(v.id)}
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

      <p className="g-legal">
        逾期只提示可以尽快补种，不催也不评判。要不要补、怎么补，听接种门诊的。
        {baby.useCorrected && baby.pretermWeeks != null
          ? `（这一页用的是实际月龄 ${Math.floor(months)} 个月，不是矫正后的 ${Math.floor(correctedMonths(months, baby.pretermWeeks))} 个月。）`
          : ""}
      </p>
    </div>
  );
}
