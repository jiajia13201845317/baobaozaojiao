"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { CONSENT_ITEMS, type ConsentKey } from "@/lib/grow/settings";

/**
 * 7.1 / 7.2 / 7.4 — the gate before any record exists.
 *
 * Three rules the plan is strict about, and they are the three that consent
 * screens usually break:
 *
 *   Nothing is pre-ticked. The optional switches all start off, so a parent
 *   who taps straight through has agreed to the minimum rather than to
 *   everything.
 *
 *   基础记录 is separated from everything else and is the only item the app
 *   requires, so "I want a logbook and nothing else" is a supported answer.
 *
 *   监护人身份 is confirmed explicitly and timestamped, because the subject of
 *   every record in here cannot consent for themselves.
 */
export function ConsentGate({
  onDone,
}: {
  onDone: (consent: Record<ConsentKey, boolean>) => void;
}) {
  const [picked, setPicked] = useState<Record<ConsentKey, boolean>>({
    basic: false,
    personalized: false,
    photos: false,
    notify: false,
  });
  const [guardian, setGuardian] = useState(false);

  const ready = picked.basic && guardian;
  const missing = [!guardian ? "确认你是监护人" : null, !picked.basic ? "同意基础记录" : null].filter(Boolean);

  return (
    <div className="g-onboard">
      <div className="g-hero">
        <span className="consent-shield">
          <ShieldCheck className="size-9" />
        </span>
        <h1 className="g-hero-title">先说清楚数据的事</h1>
        <p className="g-hero-sub">这里面记的是一个还不会替自己做决定的小孩，所以开始之前，有几件事想先跟你讲明白。</p>
      </div>

      <section className="g-card">
        <p className="g-note">
          一起长大没有账号，也没有服务器。你填的所有东西都存在这台设备的浏览器里，不上传、不共享、不用来做画像或广告。换一台设备就看不到这边的记录，想留档请在「我的 → 隐私与数据」里导出一份。
        </p>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">你要开哪几项</h2>
          <span className="g-sub">默认都不开</span>
        </div>
        <ul className="consent-list">
          {CONSENT_ITEMS.map((item) => {
            const on = picked[item.id];
            return (
              <li key={item.id} className="consent-row">
                <button
                  type="button"
                  className="consent-top consent-tap"
                  aria-pressed={on}
                  onClick={() => setPicked((p) => ({ ...p, [item.id]: !on }))}
                >
                  <span className="consent-name">
                    {item.name}
                    {item.required && <span className="consent-must">必需</span>}
                  </span>
                  <span className={`consent-box${on ? " on" : ""}`}>{on && <Check className="size-4" />}</span>
                </button>
                <p className="consent-why">{item.why}</p>
              </li>
            );
          })}
        </ul>
        <p className="g-hint">除了基础记录，其余几项以后都能在「我的」里随时开或关。</p>
      </section>

      <section className="g-card">
        <button
          type="button"
          className={`toggle-row${guardian ? " on" : ""}`}
          aria-pressed={guardian}
          onClick={() => setGuardian(!guardian)}
        >
          <span className="me-row-name">我是这个孩子的父母或监护人</span>
          <span className="toggle-dot" />
        </button>
        <p className="g-hint">勾上之后会记下确认时间，也仅此而已，不会要你上传任何证件。</p>
      </section>

      <button
        type="button"
        className="g-btn g-btn-big g-btn-go"
        disabled={!ready}
        onClick={() => onDone(picked)}
      >
        知道了，开始用
      </button>
      {!ready && <p className="g-hint">还差{missing.join("、")}</p>}
    </div>
  );
}
