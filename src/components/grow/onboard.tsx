"use client";

import Image from "next/image";
import { useState } from "react";
import { ageLabel, correctedMonths, monthsBetween } from "@/lib/grow/growth";
import { LEVELS, themedPetArt } from "@/lib/grow/pets";
import type { Baby, Sex } from "@/lib/grow/store";

const today = () => new Date().toISOString().slice(0, 10);

export type BabyFields = Omit<Baby, "id" | "createdAt">;

/** 4.7 — WHO calls 37 weeks term; below 22 is outside any reference data. */
const WEEK_RANGE = { min: 22, max: 36 };

export function Onboard({
  initial,
  onDone,
  onCancel,
  onSexChange,
  onDelete,
  canDelete,
}: {
  initial?: Baby | null;
  onDone: (fields: BabyFields) => void;
  onCancel?: () => void;
  onSexChange?: (sex: Sex) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null);
  const [birthday, setBirthday] = useState(initial?.birthday ?? "");
  const [preterm, setPreterm] = useState(initial?.pretermWeeks != null);
  const [weeks, setWeeks] = useState(initial?.pretermWeeks != null ? String(initial.pretermWeeks) : "");
  const [useCorrected, setUseCorrected] = useState(initial?.useCorrected ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const months = birthday ? monthsBetween(birthday) : null;
  const futureDate = Boolean(birthday) && birthday > today();
  const tooOld = months != null && months > 36;

  const weekNum = Number(weeks);
  const weeksOk = !preterm || (weeks.trim() !== "" && Number.isFinite(weekNum) && weekNum >= WEEK_RANGE.min && weekNum <= WEEK_RANGE.max);
  const pretermWeeks = preterm && weeksOk ? Math.round(weekNum) : null;

  const ready = name.trim().length > 0 && sex != null && Boolean(birthday) && !futureDate && weeksOk;
  const missing = [name.trim() ? null : "称呼", sex ? null : "性别", birthday ? null : "出生日期"].filter(
    (v): v is string => v != null,
  );

  return (
    <div className="g-scroll g-onboard">
      <header className="g-hero">
        <div className="onboard-egg">
          <Image
            key={sex ?? "boy"}
            src={themedPetArt(LEVELS[0]!.art!, sex ?? "boy")}
            alt="一颗等着孵的蛋"
            width={448}
            height={448}
            priority
          />
        </div>
        <h1 className="g-hero-title">{initial ? "改一下资料" : "先认识一下宝宝"}</h1>
        <p className="g-hero-sub">
          只存在这台设备上，不上传。填了生日才能按月龄推玩法，也才能把身高体重放到对的参考曲线上。
        </p>
      </header>

      <div className="g-card">
        <label className="g-field">
          <span>宝宝怎么称呼</span>
          <input
            id="baby-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="小名就行"
            maxLength={12}
            autoComplete="off"
          />
        </label>

        <div className="g-field">
          <span>性别</span>
          <div className="pick-row">
            {(
              [
                { id: "boy", label: "男宝" },
                { id: "girl", label: "女宝" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setSex(o.id);
                  onSexChange?.(o.id);
                }}
                className={`pick ${sex === o.id ? "on" : ""}`}
                aria-pressed={sex === o.id}
              >
                {o.label}
              </button>
            ))}
          </div>
          <i className="g-hint">决定蛋仔的颜色和整个界面的配色，也决定 WHO 生长曲线用哪条参考线。</i>
        </div>

        <label className="g-field">
          <span>出生日期</span>
          <input
            id="baby-birthday"
            type="date"
            value={birthday}
            max={today()}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </label>
        {futureDate && <p className="g-error">出生日期不能晚于今天。</p>}
        {!futureDate && months != null && (
          <p className="g-hint">
            {ageLabel(months)}
            {tooOld && " · 早教玩法目前做到 3 岁，健康记录仍然可用。"}
            {months < 12 && " · 玩法库从 12 月龄开始，先给你看 Q1-Q2 的内容。"}
          </p>
        )}

        {/* 4.7 早产儿矫正月龄 */}
        <div className="g-field">
          <span>是否早产</span>
          <div className="pick-row">
            <button
              type="button"
              className={`pick ${!preterm ? "on" : ""}`}
              aria-pressed={!preterm}
              onClick={() => setPreterm(false)}
            >
              足月
            </button>
            <button
              type="button"
              className={`pick ${preterm ? "on" : ""}`}
              aria-pressed={preterm}
              onClick={() => setPreterm(true)}
            >
              早产
            </button>
          </div>
        </div>

        {preterm && (
          <>
            <label className="g-field">
              <span>出生时孕周</span>
              <input
                id="baby-weeks"
                type="number"
                inputMode="numeric"
                min={WEEK_RANGE.min}
                max={WEEK_RANGE.max}
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                placeholder="例 34"
              />
            </label>
            {!weeksOk && weeks.trim() !== "" && (
              <p className="g-error">
                孕周请填 {WEEK_RANGE.min}-{WEEK_RANGE.max} 周之间。满 37 周一般算足月。
              </p>
            )}
            <button
              type="button"
              className={`toggle-row ${useCorrected ? "on" : ""}`}
              aria-pressed={useCorrected}
              onClick={() => setUseCorrected((v) => !v)}
            >
              <span>
                <b>按矫正月龄看曲线和玩法</b>
                <i>
                  {pretermWeeks && months != null
                    ? `实际 ${Math.floor(months)} 个月，矫正后约 ${Math.floor(correctedMonths(months, pretermWeeks))} 个月`
                    : "WHO 的参考线描述的是足月宝宝，早产宝宝一般看矫正月龄"}
                </i>
              </span>
              <i className="toggle-dot" />
            </button>
          </>
        )}

        {!ready && !futureDate && missing.length > 0 && <p className="g-hint">还差{missing.join("、")}。</p>}

        <div className="measure-actions">
          {onCancel && (
            <button type="button" className="g-btn g-btn-ghost" onClick={onCancel}>
              取消
            </button>
          )}
          <button
            type="button"
            className="g-btn g-btn-go"
            disabled={!ready}
            onClick={() =>
              ready &&
              onDone({
                name: name.trim(),
                sex: sex!,
                birthday,
                pretermWeeks,
                useCorrected: pretermWeeks != null ? useCorrected : false,
              })
            }
          >
            {initial ? "保存" : "开始"}
          </button>
        </div>
      </div>

      {/* 7.3 注销颗粒度: 多宝宝账号可以只删掉某一个档案 */}
      {initial && canDelete && onDelete && (
        <div className="g-card">
          <h2 className="g-h2">删掉这个档案</h2>
          <p className="g-body">
            会删掉 {initial.name} 的全部记录、宠物和积分，其他宝宝的不受影响。删了找不回来。
          </p>
          {confirmDelete ? (
            <div className="measure-actions">
              <button type="button" className="g-btn g-btn-ghost" onClick={() => setConfirmDelete(false)}>
                算了
              </button>
              <button type="button" className="g-btn g-btn-warn" onClick={onDelete}>
                确认删掉
              </button>
            </div>
          ) : (
            <button type="button" className="g-btn g-btn-ghost" onClick={() => setConfirmDelete(true)}>
              删掉 {initial.name} 的档案
            </button>
          )}
        </div>
      )}

      <p className="g-legal">
        这个 App 只做记录和提醒，不提供任何诊断或治疗建议。宝宝的情况请以儿保医生的判断为准。
      </p>
    </div>
  );
}
