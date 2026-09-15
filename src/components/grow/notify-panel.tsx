"use client";

import { useState } from "react";
import { BellOff, BellRing, Moon } from "lucide-react";
import {
  QUIET_FROM,
  QUIET_TO,
  ask,
  mutedKinds,
  permission,
  toggleMute,
  type ReminderKind,
} from "@/lib/grow/notify";
import type { Settings } from "@/lib/grow/settings";

const KINDS: { id: ReminderKind; name: string; what: string }[] = [
  { id: "vaccine", name: "疫苗月龄", what: "某一剂的建议月龄到了附近时说一声。打不打、什么时候打，按接种点安排。" },
  { id: "temp", name: "体温复测", what: "量过体温之后，隔一段时间提醒再记一次。只提醒，不判断高低。" },
  { id: "streak", name: "今天还没打卡", what: "傍晚提醒一次早教小任务。做不了就算了，连续天数断了也不清零。" },
  { id: "records", name: "今天还没记录", what: "一整天没有任何记录时提醒一次。" },
];

const EVERY = [30, 60, 120, 240];

/**
 * 7.6 / 12.5 — the reminder settings for the single scheduler.
 *
 * This screen is unusually blunt about what it cannot do. A static site has no
 * push transport, so reminders only appear while the app is open. Saying so
 * costs us the feature's appeal and buys the parent the ability to plan around
 * it, which is the better trade: a parent who believes the app will remind
 * them about a vaccine, and finds out in three months that it never could, has
 * been harmed by the copy rather than helped.
 */
export function NotifyPanel({
  settings,
  onConsent,
  onTempReminder,
}: {
  settings: Settings;
  onConsent: (on: boolean) => void;
  onTempReminder: (on: boolean, every: number) => void;
}) {
  const [muted, setMuted] = useState(() => mutedKinds());
  const [perm, setPerm] = useState(() => permission());
  const on = settings.consent.notify;

  return (
    <div className="g-scroll">
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">提醒总开关</h2>
        </div>
        <button
          type="button"
          className={`toggle-row${on ? " on" : ""}`}
          aria-pressed={on}
          onClick={() => onConsent(!on)}
        >
          <span className="me-icon">{on ? <BellRing className="size-5" /> : <BellOff className="size-5" />}</span>
          <span className="me-row-name">{on ? "已打开" : "已关闭"}</span>
          <span className="toggle-dot" />
        </button>
        <p className="g-note">
          先说清楚这一版能做到什么：它是一个网页，没有后台服务，所以<strong>只有在你打开着这个页面时才会提醒</strong>。
          关掉页面之后不会有任何推送，请不要把疫苗这种要紧的事只交给它。
        </p>
      </section>

      {on && (
        <>
          <section className="g-card">
            <div className="g-card-head">
              <h2 className="g-h2">系统通知</h2>
              <span className="g-sub">
                {perm === "granted" ? "已允许" : perm === "denied" ? "已拒绝" : perm === "unsupported" ? "不支持" : "未询问"}
              </span>
            </div>
            <p className="g-hint">
              允许之后，提醒会以系统通知的形式弹出来，比只在页面里显示更容易注意到。不允许也行，页面里照样会出现提醒卡片。
            </p>
            {perm === "default" && (
              <button type="button" className="g-btn g-btn-go" onClick={() => void ask().then(setPerm)}>
                允许系统通知
              </button>
            )}
            {perm === "denied" && (
              <p className="g-hint">浏览器记住了拒绝。想改的话要去浏览器的网站设置里把通知权限打开。</p>
            )}
          </section>

          <section className="g-card">
            <div className="g-card-head">
              <h2 className="g-h2">提醒哪些</h2>
            </div>
            <ul className="notify-list">
              {KINDS.map((k) => {
                const off = muted[k.id] === true;
                return (
                  <li key={k.id} className="notify-row">
                    <div className="consent-top">
                      <span className="consent-name">{k.name}</span>
                      <button
                        type="button"
                        className={`consent-switch${off ? "" : " on"}`}
                        aria-pressed={!off}
                        onClick={() => setMuted(toggleMute(k.id))}
                      >
                        <span />
                      </button>
                    </div>
                    <p className="consent-why">{k.what}</p>
                  </li>
                );
              })}
            </ul>
            <p className="g-hint">每一类每天最多提醒一次，几条同时到了也只显示最要紧的那一条。</p>
          </section>

          <section className="g-card">
            <div className="g-card-head">
              <h2 className="g-h2">体温复测间隔</h2>
            </div>
            <button
              type="button"
              className={`toggle-row${settings.tempReminder.on ? " on" : ""}`}
              aria-pressed={settings.tempReminder.on}
              onClick={() => onTempReminder(!settings.tempReminder.on, settings.tempReminder.every)}
            >
              <span className="me-row-name">量过之后提醒再量一次</span>
              <span className="toggle-dot" />
            </button>
            {settings.tempReminder.on && (
              <>
                <div className="pick-row">
                  {EVERY.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`pick${settings.tempReminder.every === m ? " on" : ""}`}
                      onClick={() => onTempReminder(true, m)}
                    >
                      {m < 60 ? `${m} 分` : `${m / 60} 小时`}
                    </button>
                  ))}
                </div>
                <p className="g-hint">
                  只按时间间隔提醒，和量出来的数字没有关系。这个 App 不判断体温高低，也不会因为某个数值报警——要不要处理请咨询医生。
                </p>
              </>
            )}
          </section>

          <section className="g-card">
            <div className="g-card-head">
              <h2 className="g-h2">安静时段</h2>
            </div>
            <p className="notify-quiet">
              <Moon className="size-4" />
              每天 {QUIET_FROM}:00 到次日 {QUIET_TO}:00 之间不提醒
            </p>
            <p className="g-hint">
              这一段是写死的，不做成可调项：在有小孩的家里，半夜把人叫醒的提醒不管内容是什么都不值得。
            </p>
          </section>
        </>
      )}
    </div>
  );
}
