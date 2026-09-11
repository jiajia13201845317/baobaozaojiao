"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Egg, Sparkles } from "lucide-react";
import {
  CREATURES,
  LEVELS,
  SERIES,
  type SeriesId,
  creaturesOf,
  seriesById,
  viewPet,
} from "@/lib/grow/pets";
import {
  type GrowState,
  activePet,
  ownedCreatures,
  revealedCreatures,
  spendablePoints,
  totalPoints,
} from "@/lib/grow/store";

export function PetsPage({
  state,
  onAdopt,
  onSetActive,
}: {
  state: GrowState;
  onAdopt: (series: SeriesId, cost: number) => void;
  onSetActive: (id: string) => void;
}) {
  const total = totalPoints(state);
  const spendable = spendablePoints(state);
  const owned = ownedCreatures(state);
  const active = activePet(state);
  const [confirm, setConfirm] = useState<SeriesId | null>(null);

  const revealed = revealedCreatures(state);

  return (
    <div className="g-scroll">
      <header className="g-hero">
        <h1 className="g-hero-title">
          <Sparkles className="size-5" />
          宠物图鉴
        </h1>
        <p className="g-hero-sub">
          已领养 {state.pets.length} 只，破壳 {revealed.size} 只，一共 {CREATURES.length} 只
        </p>
      </header>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">我的宠物</h2>
          <span className="g-count">点一下换出场</span>
        </div>
        <div className="mine-row">
          {state.pets.map((p) => {
            const v = viewPet(p, total);
            return (
              <button
                key={p.id}
                type="button"
                className={`mine-pet ${active?.id === p.id ? "on" : ""}`}
                style={{ background: v.series.tint }}
                onClick={() => onSetActive(p.id)}
                aria-pressed={active?.id === p.id}
              >
                <Image src={v.art} alt={v.name} width={224} height={224} />
                <span className="mine-name">{v.name}</span>
                <span className="mine-lv" style={{ background: v.series.color }}>
                  Lv{v.level.lv}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">领养新蛋</h2>
          <span className="g-count">可用 {spendable}</span>
        </div>
        <p className="g-body">
          每颗蛋长得都一样，破壳那天才知道是谁。花的是可用积分，累计积分一分不动，已经养大的不会退回去。
        </p>
        <ul className="series-grid">
          {SERIES.map((s) => {
            const pool = creaturesOf(s.id);
            const got = pool.filter((c) => owned.includes(c.id)).length;
            const all = got >= pool.length;
            const poor = spendable < s.cost;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`series-card ${all ? "done" : ""}`}
                  style={{ background: s.tint }}
                  disabled={all || poor}
                  onClick={() => setConfirm(s.id)}
                >
                  <span className="series-orb" style={{ background: s.color }}>
                    {all ? <Check className="size-5" strokeWidth={3.5} /> : <Egg className="size-5" />}
                  </span>
                  <b className="series-name">{s.name}</b>
                  <i className="series-sub">
                    {got}/{pool.length} 只 · {s.blurb}
                  </i>
                  <span className="series-cost" style={{ color: s.color }}>
                    {all ? "已集齐" : s.cost === 0 ? "免费" : `${s.cost} 积分`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">全部图鉴</h2>
          <span className="g-count">
            {revealed.size}/{CREATURES.length}
          </span>
        </div>
        <ul className="book-grid">
          {CREATURES.map((c) => {
            const s = seriesById(c.series);
            const has = revealed.has(c.id);
            const incubating = owned.includes(c.id) && !has;
            return (
              <li key={c.id} className={has ? "on" : ""}>
                <span className="book-art" style={{ background: has ? s.tint : undefined }}>
                  {has ? (
                    <Image src={`/art/pet/${c.id}.webp`} alt={c.name} width={224} height={224} />
                  ) : (
                    <Image
                      src={LEVELS[0]!.art!}
                      alt={incubating ? "孵化中" : "还没领养"}
                      width={224}
                      height={224}
                      className={incubating ? "book-egg" : "book-locked"}
                    />
                  )}
                </span>
                <b>{has ? c.name : incubating ? "孵化中" : "？？？"}</b>
                <i>{s.name}</i>
              </li>
            );
          })}
        </ul>
      </section>

      {confirm && (
        <AdoptSheet
          series={confirm}
          spendable={spendable}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            const s = seriesById(confirm);
            onAdopt(confirm, s.cost);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function AdoptSheet({
  series,
  spendable,
  onClose,
  onConfirm,
}: {
  series: SeriesId;
  spendable: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const s = seriesById(series);
  return (
    <div className="g-sheet-layer" role="dialog" aria-label={`领养${s.name}的蛋`}>
      <button type="button" className="g-sheet-back" aria-label="关掉" onClick={onClose} />
      <div className="g-sheet">
        <div className="adopt-egg" style={{ background: s.tint }}>
          <Image src={LEVELS[0]!.art!} alt="一颗蛋" width={224} height={224} />
        </div>
        <h3 className="g-h2 text-center">领一颗{s.name}的蛋</h3>
        <p className="g-body text-center">
          {s.blurb}。要花 <b>{s.cost}</b> 可用积分，剩 {Math.max(0, spendable - s.cost)} 分。累计积分不会变。
        </p>
        <div className="g-sheet-actions">
          <button type="button" className="g-btn g-btn-ghost" onClick={onClose}>
            再想想
          </button>
          <button type="button" className="g-btn g-btn-go" onClick={onConfirm}>
            抱回家
          </button>
        </div>
      </div>
    </div>
  );
}
