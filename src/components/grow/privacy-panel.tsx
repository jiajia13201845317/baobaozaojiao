"use client";

import { useEffect, useState } from "react";
import { Database, Download, FileJson, Trash2 } from "lucide-react";
import { CONSENT_ITEMS } from "@/lib/grow/settings";
import { DELETE_NOTE, DELETE_SCOPE, download, exportJson, exportText } from "@/lib/grow/export";
import { photoBytes } from "@/lib/grow/media";
import { dateKey } from "@/lib/grow/tasks";
import type { GrowState } from "@/lib/grow/store";

/**
 * 7.3 / 7.4 — 可查阅、可导出、可删除, each as its own affordance.
 *
 * The 查阅 half is the one products usually skip: a policy page says data is
 * "stored locally" and the parent has to take that on faith. Here the counts
 * are computed from what is actually in storage, including the photo bytes in
 * IndexedDB, so the screen cannot claim less than the app holds.
 */
export function PrivacyPanel({
  state,
  onConsent,
  onWipe,
}: {
  state: GrowState;
  onConsent: (key: "personalized" | "photos" | "notify", on: boolean) => void;
  onWipe: () => void;
}) {
  const [bytes, setBytes] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let alive = true;
    void photoBytes().then((n) => {
      if (alive) setBytes(n);
    });
    return () => {
      alive = false;
    };
  }, [state]);

  const events = state.babies.reduce((sum, b) => sum + (state.data[b.id]?.events.length ?? 0), 0);
  const photos = state.babies.reduce(
    (sum, b) => sum + (state.data[b.id]?.events.filter((e) => e.photo).length ?? 0),
    0,
  );
  const stateBytes = new Blob([JSON.stringify(state)]).size;

  return (
    <div className="g-scroll">
      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">存了什么</h2>
          <span className="g-sub">全部在本机</span>
        </div>
        <div className="stat-row">
          <div className="stat-tile">
            <b>{state.babies.length}</b>
            <i>宝宝档案</i>
          </div>
          <div className="stat-tile">
            <b>{events}</b>
            <i>条记录</i>
          </div>
          <div className="stat-tile">
            <b>{photos}</b>
            <i>张照片</i>
          </div>
        </div>
        <p className="g-hint">
          记录文本约 {Math.max(1, Math.round(stateBytes / 1024))} KB
          {bytes != null && photos > 0 ? `，照片约 ${Math.round(bytes / 1024)} KB` : ""}
          。没有服务器，也没有账号，关掉浏览器数据就只剩在这台设备上。
        </p>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">分项同意</h2>
        </div>
        <p className="g-hint">
          每一项都能单独关。关掉之后已经存下的东西不会自动消失，要删请用下面的删除。
        </p>
        <ul className="consent-list">
          {CONSENT_ITEMS.map((item) => {
            const on = state.settings.consent[item.id];
            return (
              <li key={item.id} className="consent-row">
                <div className="consent-top">
                  <span className="consent-name">
                    {item.name}
                    {item.required && <span className="consent-must">必需</span>}
                  </span>
                  {item.required ? (
                    <span className="consent-fixed">已开启</span>
                  ) : (
                    <button
                      type="button"
                      className={`consent-switch${on ? " on" : ""}`}
                      aria-pressed={on}
                      onClick={() => onConsent(item.id as "personalized" | "photos" | "notify", !on)}
                    >
                      <span />
                    </button>
                  )}
                </div>
                <p className="consent-why">{item.why}</p>
              </li>
            );
          })}
        </ul>
        {state.settings.consent.guardianAt && (
          <p className="g-hint">
            监护人身份已于 {new Date(state.settings.consent.guardianAt).toLocaleDateString("zh-CN")} 确认。
          </p>
        )}
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">带走一份</h2>
        </div>
        <p className="g-hint">
          两种格式都是同一批数据。文字版是给你看的，翻起来像一本日志；JSON 是完整的机器副本，字段一个不少。
        </p>
        <button
          type="button"
          className="g-btn g-btn-go"
          onClick={() => download(`一起长大-${dateKey()}.txt`, exportText(state, state.carers))}
        >
          <Download className="size-4" />
          导出文字版
        </button>
        <button
          type="button"
          className="g-btn g-btn-ghost"
          onClick={() =>
            download(`一起长大-${dateKey()}.json`, exportJson(state), "application/json;charset=utf-8")
          }
        >
          <FileJson className="size-4" />
          导出 JSON
        </button>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">全部删掉</h2>
        </div>
        <p className="g-hint">删除范围：</p>
        <ul className="scope-list">
          {DELETE_SCOPE.map((line) => (
            <li key={line}>
              <Database className="size-3.5" />
              {line}
            </li>
          ))}
        </ul>
        <p className="g-note">{DELETE_NOTE}</p>

        {!confirm ? (
          <button type="button" className="g-btn g-btn-warn" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" />
            我要删掉全部数据
          </button>
        ) : (
          <div className="wipe-form">
            <label className="g-field">
              <span>确认的话，输入「删除」两个字</span>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="删除" autoFocus />
            </label>
            <div className="measure-actions">
              <button type="button" className="g-btn g-btn-warn" disabled={typed.trim() !== "删除"} onClick={onWipe}>
                确认删除
              </button>
              <button
                type="button"
                className="g-btn g-btn-ghost"
                onClick={() => {
                  setConfirm(false);
                  setTyped("");
                }}
              >
                算了
              </button>
            </div>
            {typed.trim() !== "删除" && <p className="g-hint">要删的话请照着输入「删除」，这一步故意做得麻烦一点。</p>}
          </div>
        )}
      </section>

      <p className="g-legal">
        儿童个人信息处理规则：这个 App 只处理你主动填写的内容，用途仅限于在本机把它显示回给你；不做画像，不推送广告，不共享给第三方，也不用于训练任何模型。数据不离开设备，因此没有可供他人查阅的副本。
      </p>
    </div>
  );
}
