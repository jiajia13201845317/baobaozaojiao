"use client";

import { useState } from "react";
import {
  Bell,
  BookOpenCheck,
  Camera,
  ChevronRight,
  Users,
  FileText,
  Image as ImageIcon,
  Languages,
  Lock,
  ScrollText,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { CarerPanel } from "@/components/grow/carer-panel";
import { PrivacyPanel } from "@/components/grow/privacy-panel";
import { NotifyPanel } from "@/components/grow/notify-panel";
import { SummaryPanel } from "@/components/grow/summary-panel";
import { monthsBetween } from "@/lib/grow/growth";
import { NO_TRACKER_NOTE, ROLE_NAME, SDK_LIST } from "@/lib/grow/settings";
import { carerOf, myRole, type Baby, type BabyData, type GrowState } from "@/lib/grow/store";

export type MeView = "hub" | "carers" | "privacy" | "notify" | "summary" | "log" | "sdk";

export const ME_TITLES: Record<MeView, string> = {
  hub: "我的",
  carers: "成员与记录人",
  privacy: "隐私与数据",
  notify: "提醒",
  summary: "成长总结",
  log: "操作日志",
  sdk: "第三方清单",
};

export type MeActions = {
  onConsent: (key: "personalized" | "photos" | "notify", on: boolean) => void;
  onBilingual: (on: boolean) => void;
  onMode: (mode: "records" | "full") => void;
  onTempReminder: (on: boolean, every: number) => void;
  onAddCarer: (name: string, role: "owner" | "carer" | "viewer") => void;
  onEditCarer: (id: string, patch: { name?: string; role?: "owner" | "carer" | "viewer" }) => void;
  onRemoveCarer: (id: string) => void;
  onSetBy: (id: string | null) => void;
  onSetPin: (pin: string | null) => void;
  onKidMode: () => void;
  onWipe: () => void;
  onEditProfile: () => void;
  onAddBaby: () => void;
};

export function MeHeader({ view, onBack }: { view: MeView; onBack: () => void }) {
  if (view === "hub") return null;
  return (
    <button type="button" className="g-back" onClick={onBack}>
      <ChevronRight className="size-5 rotate-180" />
      我的
    </button>
  );
}

export function MePage({
  state,
  baby,
  data,
  view,
  onView,
  actions,
}: {
  state: GrowState;
  baby: Baby;
  data: BabyData;
  view: MeView;
  onView: (v: MeView) => void;
  actions: MeActions;
}) {
  if (view === "carers") {
    return (
      <CarerPanel
        carers={state.carers}
        by={state.by}
        onAdd={actions.onAddCarer}
        onEdit={actions.onEditCarer}
        onRemove={actions.onRemoveCarer}
        onSetBy={actions.onSetBy}
      />
    );
  }
  if (view === "privacy") {
    return <PrivacyPanel state={state} onConsent={actions.onConsent} onWipe={actions.onWipe} />;
  }
  if (view === "notify") {
    return (
      <NotifyPanel
        settings={state.settings}
        onConsent={(on) => actions.onConsent("notify", on)}
        onTempReminder={actions.onTempReminder}
      />
    );
  }
  if (view === "summary") {
    return <SummaryPanel baby={baby} data={data} />;
  }
  if (view === "log") {
    return <LogPanel state={state} />;
  }
  if (view === "sdk") {
    return <SdkPanel />;
  }
  return <Hub state={state} baby={baby} onView={onView} actions={actions} />;
}

function Hub({
  state,
  baby,
  onView,
  actions,
}: {
  state: GrowState;
  baby: Baby;
  onView: (v: MeView) => void;
  actions: MeActions;
}) {
  const months = Math.max(0, Math.round(monthsBetween(baby.birthday)));
  const role = myRole(state);
  const me = carerOf(state, state.by);
  const { settings } = state;

  return (
    <div className="g-scroll">
      <button type="button" className="me-card" onClick={actions.onEditProfile}>
        <span className="me-face">{baby.name.slice(0, 1)}</span>
        <span className="me-text">
          <span className="me-name">{baby.name}</span>
          <span className="me-sub">
            {months} 个月 · {state.babies.length > 1 ? `共 ${state.babies.length} 个档案` : "编辑档案"}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-[var(--ink-mute)]" />
      </button>

      <button type="button" className="g-btn g-btn-ghost" onClick={actions.onAddBaby}>
        <UserRound className="size-4" />
        再加一个宝宝
      </button>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">开关</h2>
          <span className="g-sub">{ROLE_NAME[role]}</span>
        </div>

        <Toggle
          icon={<Languages className="size-5" />}
          name="英语启蒙"
          hint="在语言任务下面并排显示一条英文的，跟中文一样只分做了没做，不打分。"
          on={settings.bilingual}
          onToggle={() => actions.onBilingual(!settings.bilingual)}
        />
        <Toggle
          icon={<Camera className="size-5" />}
          name="照片记录"
          hint="允许在饮食、排便记录里拍照。照片只留在这台设备，可以逐张删。默认关着。"
          on={settings.consent.photos}
          onToggle={() => actions.onConsent("photos", !settings.consent.photos)}
        />
        <Toggle
          icon={<Sparkles className="size-5" />}
          name="分龄内容"
          hint="按宝宝月龄挑早教任务和参考信息。关掉之后全部内容还在，只是不再替你挑。"
          on={settings.consent.personalized}
          onToggle={() => actions.onConsent("personalized", !settings.consent.personalized)}
        />

        <div className="mode-pick">
          <p className="mode-title">用哪个版本</p>
          <div className="pick-row">
            <button
              type="button"
              className={`pick${settings.mode === "records" ? " on" : ""}`}
              onClick={() => actions.onMode("records")}
            >
              纯记录版
            </button>
            <button
              type="button"
              className={`pick${settings.mode === "full" ? " on" : ""}`}
              onClick={() => actions.onMode("full")}
            >
              完整版
            </button>
          </div>
          <p className="g-hint">
            {settings.mode === "records"
              ? "只留档案和记录，早教、听听、宠物和积分都收起来。随时可以切回来，记录不会丢。"
              : "记录之外还有早教任务、宝宝听听和积分养宠物。只想记一笔就走的话，切成纯记录版更清爽。"}
          </p>
        </div>
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">家里人</h2>
          {me && <span className="g-sub">当前记录人 {me.name}</span>}
        </div>
        <Row
          icon={<Users className="size-5" />}
          name="成员与记录人"
          sub={state.carers.length ? `${state.carers.length} 个人 · 记的每一笔都会带上名字` : "还没有人，加上之后记录会带名字"}
          onClick={() => onView("carers")}
        />
        <Row
          icon={<Lock className="size-5" />}
          name="宝宝观看模式"
          sub={settings.lockPin ? "已设好退出密码，进去之后只能听" : "锁住除播放外的操作，防小手乱点"}
          onClick={actions.onKidMode}
        />
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">提醒与总结</h2>
        </div>
        <Row
          icon={<Bell className="size-5" />}
          name="提醒"
          sub={settings.consent.notify ? "疫苗月龄、体温复测、今天还没记" : "默认不提醒，需要你自己打开"}
          onClick={() => onView("notify")}
        />
        <Row
          icon={<ImageIcon className="size-5" />}
          name="成长总结与海报"
          sub="把记下来的天数和第一次拼成一张图，存下来或发出去"
          onClick={() => onView("summary")}
        />
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">数据与隐私</h2>
        </div>
        <Row
          icon={<Shield className="size-5" />}
          name="隐私与数据"
          sub="看看存了什么、导出一份、或者全部删掉"
          onClick={() => onView("privacy")}
        />
        <Row
          icon={<ScrollText className="size-5" />}
          name="操作日志"
          sub={state.log.length ? `最近 ${state.log.length} 条改动，谁动的都记着` : "还没有改动记录"}
          onClick={() => onView("log")}
        />
        <Row
          icon={<FileText className="size-5" />}
          name="第三方清单"
          sub="哪些东西会碰到数据，一条条列出来"
          onClick={() => onView("sdk")}
        />
      </section>

      <p className="g-legal">
        一起长大只记录你自己填的内容，不提供诊断或治疗建议。健康相关的判断，请带着记录咨询儿保医生。
      </p>
    </div>
  );
}

function Row({
  icon,
  name,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="me-row" onClick={onClick}>
      <span className="me-icon">{icon}</span>
      <span className="me-row-text">
        <span className="me-row-name">{name}</span>
        <span className="me-row-sub">{sub}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-[var(--ink-mute)]" />
    </button>
  );
}

function Toggle({
  icon,
  name,
  hint,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  name: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="me-toggle">
      <button type="button" className={`toggle-row${on ? " on" : ""}`} onClick={onToggle} aria-pressed={on}>
        <span className="me-icon">{icon}</span>
        <span className="me-row-name">{name}</span>
        <span className="toggle-dot" />
      </button>
      <p className="g-hint">{hint}</p>
    </div>
  );
}

function LogPanel({ state }: { state: GrowState }) {
  const entries = [...state.log].reverse();
  return (
    <div className="g-scroll">
      <p className="g-note">
        谁在什么时候改了什么，都记在这里，只存在这台设备上。它的用处是几个人一起记的时候能对得上账——比如一条记录不见了，可以在这里看到是谁删的。
      </p>
      {!entries.length && (
        <div className="g-empty">
          <span className="g-empty-ring" />
          <p className="g-empty-title">还没有改动</p>
          <p className="g-empty-sub">删记录、改档案、加成员这些动作都会记一条。</p>
        </div>
      )}
      {entries.length > 0 && (
        <section className="g-card">
          <ul className="log-list">
            {entries.map((e) => {
              const who = carerOf(state, e.who);
              return (
                <li key={e.id} className="log-entry">
                  <span className="log-entry-time">
                    {new Date(e.at).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="log-entry-text">
                    <span className="log-entry-what">{e.what}</span>
                    {e.detail && <span className="log-entry-detail">{e.detail}</span>}
                  </span>
                  <span className="log-entry-who">{who?.name ?? "本机"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function SdkPanel() {
  const [shown, setShown] = useState(false);
  return (
    <div className="g-scroll">
      <p className="g-note">
        这一页列出每一个会碰到数据的外部东西，以及它拿到了什么。写在这里而不是藏在条款里，是因为你有权在装一个育儿 App 之前就知道。
      </p>
      <section className="g-card">
        <ul className="sdk-list">
          {SDK_LIST.map((row) => (
            <li key={row.name} className="sdk-row">
              <p className="sdk-name">{row.name}</p>
              <p className="sdk-what">{row.what}</p>
              <p className="sdk-data">{row.data}</p>
            </li>
          ))}
        </ul>
      </section>
      <button type="button" className="g-btn g-btn-ghost" onClick={() => setShown(!shown)}>
        <BookOpenCheck className="size-4" />
        {shown ? "收起说明" : "为什么没有广告和分析 SDK"}
      </button>
      {shown && (
        <p className="g-note">
          儿童个人信息一旦进了第三方分析或广告系统，就再也说不清它去了哪里。所以这个版本一个都没接：没有埋点上报，没有推送 SDK，没有广告位。代价是我们看不到使用数据，只能靠你直接告诉我们哪里不好用。
        </p>
      )}
      <p className="g-legal">{NO_TRACKER_NOTE}</p>
    </div>
  );
}

