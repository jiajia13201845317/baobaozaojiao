"use client";

import { useState } from "react";
import { Delete, Lock, X } from "lucide-react";

/**
 * 7.5 宝宝观看模式.
 *
 * The problem this solves is specific: a toddler holding the phone to listen
 * will hit everything on screen, and some of what they can reach deletes
 * records. So the mode hides every surface except playback, and getting back
 * out needs something a two-year-old will not produce by accident.
 *
 * The exit is a four-digit PIN when one is set, and a press-and-hold when it
 * is not. Hold rather than a tap sequence because a child mashing the screen
 * generates taps constantly but almost never a steady three-second hold, and
 * because a parent with a baby on one arm can do it one-handed.
 */
export function KidLockBar({ pin, onExit }: { pin: string | null; onExit: () => void }) {
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");
  const [wrong, setWrong] = useState(false);
  const [held, setHeld] = useState(0);

  const hold = () => {
    const started = Date.now();
    const id = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / 3000);
      setHeld(ratio);
      if (ratio >= 1) {
        window.clearInterval(id);
        setHeld(0);
        onExit();
      }
    }, 50);
    const stop = () => {
      window.clearInterval(id);
      setHeld(0);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const press = (digit: string) => {
    const next = `${typed}${digit}`.slice(0, 4);
    setTyped(next);
    setWrong(false);
    if (next.length === 4) {
      if (next === pin) {
        setAsking(false);
        setTyped("");
        onExit();
      } else {
        setWrong(true);
        setTyped("");
      }
    }
  };

  return (
    <>
      <div className="kid-bar">
        <span className="kid-bar-text">
          <Lock className="size-4" />
          宝宝观看模式
        </span>
        {pin ? (
          <button type="button" className="kid-exit" onClick={() => setAsking(true)}>
            退出
          </button>
        ) : (
          <button type="button" className="kid-exit kid-hold" onPointerDown={hold} aria-label="长按三秒退出">
            <span className="kid-hold-fill" style={{ width: `${held * 100}%` }} />
            <span className="kid-hold-text">{held > 0 ? "按住…" : "长按 3 秒退出"}</span>
          </button>
        )}
      </div>

      {asking && (
        <div className="g-sheet-layer" role="dialog" aria-label="输入退出密码">
          <button type="button" className="g-sheet-back" onClick={() => setAsking(false)} aria-label="取消" />
          <div className="g-sheet kid-pad">
            <div className="g-card-head">
              <h2 className="g-h2">输入退出密码</h2>
              <button type="button" className="row-del" onClick={() => setAsking(false)} aria-label="取消">
                <X className="size-4" />
              </button>
            </div>
            <div className="kid-dots">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`kid-dot${typed.length > i ? " on" : ""}`} />
              ))}
            </div>
            {wrong && <p className="g-hint">不对，再试一次。</p>}
            <div className="kid-keys">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button key={d} type="button" className="kid-key" onClick={() => press(d)}>
                  {d}
                </button>
              ))}
              <span />
              <button type="button" className="kid-key" onClick={() => press("0")}>
                0
              </button>
              <button type="button" className="kid-key" onClick={() => setTyped(typed.slice(0, -1))} aria-label="删一位">
                <Delete className="size-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** The set-up sheet, shown the first time a parent turns the mode on. */
export function KidLockSetup({
  onStart,
  onCancel,
  onSetPin,
  pin,
}: {
  onStart: () => void;
  onCancel: () => void;
  onSetPin: (pin: string | null) => void;
  pin: string | null;
}) {
  const [typed, setTyped] = useState("");

  return (
    <div className="g-sheet-layer" role="dialog" aria-label="宝宝观看模式">
      <button type="button" className="g-sheet-back" onClick={onCancel} aria-label="取消" />
      <div className="g-sheet">
        <div className="g-card-head">
          <h2 className="g-h2">宝宝观看模式</h2>
          <button type="button" className="row-del" onClick={onCancel} aria-label="取消">
            <X className="size-4" />
          </button>
        </div>
        <p className="g-note">
          打开之后只留下宝宝听听，记录、档案、删除这些全部收起来，小手怎么点都改不到东西。退出需要你自己操作。
        </p>

        <label className="g-field">
          <span>退出密码（四位数字，可以不设）</span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder={pin ? "已设置，输入新的可替换" : "不填就用长按三秒退出"}
          />
        </label>
        <p className="g-hint">
          密码只存在这台设备上，忘了的话把浏览器数据清掉就会连记录一起没了，所以建议设一个记得住的，或者干脆不设、用长按退出。
        </p>

        <div className="measure-actions">
          <button
            type="button"
            className="g-btn g-btn-go"
            onClick={() => {
              if (typed.length === 4) onSetPin(typed);
              else if (typed.length === 0 && !pin) onSetPin(null);
              onStart();
            }}
            disabled={typed.length > 0 && typed.length < 4}
          >
            进入
          </button>
          <button type="button" className="g-btn g-btn-ghost" onClick={onCancel}>
            算了
          </button>
        </div>
        {typed.length > 0 && typed.length < 4 && <p className="g-hint">密码要四位，或者干脆留空。</p>}
        {pin && (
          <button type="button" className="g-btn g-btn-ghost" onClick={() => onSetPin(null)}>
            清掉已设的密码，改用长按退出
          </button>
        )}
      </div>
    </div>
  );
}
