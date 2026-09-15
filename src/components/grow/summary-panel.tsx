"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, ImageDown, Share2 } from "lucide-react";
import { drawPoster, sharePoster } from "@/lib/grow/poster";
import { themedPetArt, viewPet } from "@/lib/grow/pets";
import { SUMMARY_NOTE, growthLines, headline, kindCounts, summaryStats } from "@/lib/grow/summary";
import { monthsBetween } from "@/lib/grow/growth";
import { activePet, totalPoints, type Baby, type BabyData } from "@/lib/grow/store";

/**
 * 10.3 三年成长总结 and 11.7 成长海报.
 *
 * Deliberately not a year in review with a score. Every figure on this screen
 * counts something the household did, and the note at the bottom says out loud
 * that nothing here is an evaluation — because a keepsake that can be read as
 * a report card is the one thing that would make a parent feel worse for
 * having kept records.
 */
export function SummaryPanel({ baby, data }: { baby: Baby; data: BabyData }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  const stats = summaryStats(baby, data);
  const growth = growthLines(data);
  const kinds = kindCounts(data);
  const pet = activePet(data);
  const petView = pet ? viewPet(pet, totalPoints(data)) : null;
  const months = Math.max(0, Math.round(monthsBetween(baby.birthday)));

  const make = async () => {
    if (!petView) return;
    setBusy(true);
    setSaid(null);
    try {
      const blob = await drawPoster({
        headline: headline(baby, data),
        name: baby.name,
        subtitle: `${months} 个月 · ${baby.birthday} 出生`,
        stats: stats.map((s) => ({ label: s.label, value: s.value })),
        lines: [...growth.map((g) => `${g.label} ${g.text}`), ...kinds.slice(0, 2).map((k) => `${k.name} ${k.count} 条`)],
        art: petView.art,
        sex: baby.sex,
      });
      if (!blob) {
        setSaid("这台设备生成不了图片，换个浏览器再试试。");
        return;
      }
      if (url) URL.revokeObjectURL(url);
      setUrl(URL.createObjectURL(blob));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!url) return;
    const blob = await fetch(url).then((r) => r.blob());
    const how = await sharePoster(blob, `一起长大-${baby.name}`);
    if (how === "unsupported") setSaid("这个浏览器不支持直接分享，长按上面的图片保存，或者用下面的下载。");
    if (how === "cancelled") setSaid("没有发出去。");
  };

  return (
    <div className="g-scroll">
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">{headline(baby, data)}</h2>
          <span className="g-sub">{months} 个月</span>
        </div>
        <div className="sum-grid">
          {stats.map((s) => (
            <div key={s.label} className="sum-tile">
              <span className="sum-value">{s.value}</span>
              <span className="sum-label">{s.label}</span>
              <span className="sum-note">{s.note}</span>
            </div>
          ))}
        </div>
      </section>

      {growth.length > 0 && (
        <section className="g-card">
          <div className="g-card-head">
            <h2 className="g-h2">量出来的变化</h2>
          </div>
          <ul className="sum-lines">
            {growth.map((g) => (
              <li key={g.label}>
                <span className="sum-line-label">{g.label}</span>
                <span className="sum-line-text">{g.text}</span>
              </li>
            ))}
          </ul>
          <p className="g-hint">只报你自己量到的数和变化量，不给百分位，也不和别的宝宝比。</p>
        </section>
      )}

      {kinds.length > 0 && (
        <section className="g-card">
          <div className="g-card-head">
            <h2 className="g-h2">都记了些什么</h2>
          </div>
          <div className="sum-kinds">
            {kinds.map((k) => (
              <span key={k.name} className="sum-kind">
                {k.name}
                <b>{k.count}</b>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">做一张海报</h2>
        </div>
        {petView && (
          <div className="sum-preview">
            <Image src={themedPetArt(petView.art, baby.sex)} alt={petView.name} width={220} height={220} />
            <p className="g-hint">海报上会放这只，加上上面那几个数字。只有这些，不会带上照片或记录明细。</p>
          </div>
        )}
        <button type="button" className="g-btn g-btn-go" onClick={() => void make()} disabled={busy || !petView}>
          <ImageDown className="size-4" />
          {busy ? "正在画…" : url ? "重新生成" : "生成海报"}
        </button>

        {url && (
          <>
            {/* Canvas output, so next/image cannot help here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sum-poster" src={url} alt={`${baby.name}的成长海报`} />
            <div className="measure-actions">
              <button type="button" className="g-btn g-btn-go" onClick={() => void share()}>
                <Share2 className="size-4" />
                分享
              </button>
              <a className="g-btn g-btn-ghost" href={url} download={`一起长大-${baby.name}.png`}>
                <Download className="size-4" />
                保存图片
              </a>
            </div>
          </>
        )}
        {said && <p className="g-hint">{said}</p>}
      </section>

      <p className="g-legal">{SUMMARY_NOTE}</p>
    </div>
  );
}
