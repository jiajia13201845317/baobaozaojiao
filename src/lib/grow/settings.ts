/**
 * Device-level settings, consent and the operation log.
 *
 * These live beside the babies rather than inside them because they describe
 * the household's choices, not one child's record.
 *
 * Boundaries worth keeping even though nothing here talks to a server yet:
 *
 *   7.1 / 7.4 — consent is 分项, not one blanket switch. 基础记录 is the only
 *   thing the app needs to function; 个性化内容, 照片 and 提醒 are each opt-in
 *   and each revocable on their own. Nothing may be pre-ticked.
 *
 *   7.2 — a 监护人 has to say they are the guardian once, before any record
 *   exists, and the answer is timestamped.
 *
 *   照片 defaults OFF. A nappy or meal photo of a small child is the most
 *   sensitive thing this app could hold, so the capability does not appear
 *   until a parent turns it on, and every photo stays individually deletable.
 *
 *   12.6 — 纯记录版 / 完整版 is a real switch, not a build flag, so a family
 *   that only wants a logbook can have one without the 早教 and pet surfaces.
 *
 *   11.11 — the event log is local and never leaves the device. It exists so a
 *   parent can see what the app recorded about their own use, which is the
 *   opposite of why analytics usually exists.
 */

export type ConsentKey = "basic" | "personalized" | "photos" | "notify";

export type Consent = Record<ConsentKey, boolean> & {
  /** 7.2 监护人确认时间, null until confirmed. */
  guardianAt: number | null;
};

export type AppMode = "records" | "full";

export type TempReminder = {
  on: boolean;
  /** Minutes between prompts while the tab is open. */
  every: number;
};

export type Settings = {
  mode: AppMode;
  /** 3.1 英语启蒙 is an optional sub-track of 语言, off by default. */
  bilingual: boolean;
  consent: Consent;
  /** 7.5 成人验证 for leaving 宝宝观看模式. Four digits, local only. */
  lockPin: string | null;
  tempReminder: TempReminder;
};

export type CarerRole = "owner" | "carer" | "viewer";

export type Carer = {
  id: string;
  name: string;
  role: CarerRole;
  createdAt: number;
};

export type LogEntry = {
  id: string;
  at: number;
  /** Carer id, or "" for records made before anyone was named. */
  who: string;
  what: string;
  detail?: string;
};

export const CONSENT_ITEMS: { id: ConsentKey; name: string; why: string; required: boolean }[] = [
  {
    id: "basic",
    name: "基础记录",
    why: "保存宝宝的档案、身高体温这些你自己填的记录。全部只存在这台设备上，不开启就没法使用记录功能。",
    required: true,
  },
  {
    id: "personalized",
    name: "分龄内容",
    why: "根据宝宝的月龄挑选早教任务和参考信息。关掉之后仍然可以手动翻看全部内容。",
    required: false,
  },
  {
    id: "photos",
    name: "照片记录",
    why: "允许在饮食、排便记录里拍照。照片只存在这台设备，可以逐张删除。默认关闭。",
    required: false,
  },
  {
    id: "notify",
    name: "提醒",
    why: "疫苗月龄、体温复测这类提醒。只在你打开着这个页面时出现，不会在后台追踪你。",
    required: false,
  },
];

export const ROLE_NAME: Record<CarerRole, string> = {
  owner: "管理员",
  carer: "记录人",
  viewer: "只看",
};

export const ROLE_WHAT: Record<CarerRole, string> = {
  owner: "可以记录、修改、删除，也能管理成员和档案",
  carer: "可以记录和修改自己填的内容，不能删除档案",
  viewer: "只能查看，不能记录或修改",
};

export function canWrite(role: CarerRole) {
  return role !== "viewer";
}

export function canDestroy(role: CarerRole) {
  return role === "owner";
}

export const DEFAULT_CONSENT: Consent = {
  basic: false,
  personalized: false,
  photos: false,
  notify: false,
  guardianAt: null,
};

export const DEFAULT_SETTINGS: Settings = {
  mode: "full",
  bilingual: false,
  consent: DEFAULT_CONSENT,
  lockPin: null,
  tempReminder: { on: false, every: 60 },
};

export function readSettings(value: unknown): Settings {
  const s = (value ?? {}) as Partial<Settings>;
  const c = (s.consent ?? {}) as Partial<Consent>;
  const every = typeof s.tempReminder?.every === "number" ? s.tempReminder.every : 60;
  return {
    mode: s.mode === "records" ? "records" : "full",
    bilingual: s.bilingual === true,
    consent: {
      basic: c.basic === true,
      personalized: c.personalized === true,
      photos: c.photos === true,
      notify: c.notify === true,
      guardianAt: typeof c.guardianAt === "number" ? c.guardianAt : null,
    },
    lockPin: typeof s.lockPin === "string" && /^\d{4}$/.test(s.lockPin) ? s.lockPin : null,
    tempReminder: {
      on: s.tempReminder?.on === true,
      every: [30, 60, 120, 240].includes(every) ? every : 60,
    },
  };
}

export function readCarers(value: unknown): Carer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c): c is Carer => !!c && typeof c.id === "string" && typeof c.name === "string")
    .map((c) => ({
      id: c.id,
      name: c.name.slice(0, 12),
      role: c.role === "owner" || c.role === "carer" || c.role === "viewer" ? c.role : "carer",
      createdAt: typeof c.createdAt === "number" ? c.createdAt : Date.now(),
    }));
}

/** Capped: a log that grows without bound would eventually cost a parent their storage quota. */
export const LOG_CAP = 240;

export function readLog(value: unknown): LogEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((e): e is LogEntry => !!e && typeof e.id === "string" && typeof e.at === "number" && typeof e.what === "string")
    .map((e) => ({
      id: e.id,
      at: e.at,
      who: typeof e.who === "string" ? e.who : "",
      what: e.what,
      detail: typeof e.detail === "string" ? e.detail : undefined,
    }))
    .slice(-LOG_CAP);
}

/** 12.11 第三方 SDK 清单. Kept as data so the screen can never drift from reality. */
export const SDK_LIST: { name: string; what: string; data: string }[] = [
  {
    name: "浏览器本地存储（localStorage / IndexedDB）",
    what: "保存档案、记录和照片",
    data: "全部留在这台设备上，不上传",
  },
  {
    name: "浏览器语音合成（SpeechSynthesis）",
    what: "宝宝听听里把文字念出来",
    data: "由你的系统或浏览器处理，取决于厂商实现，可能在云端合成",
  },
  {
    name: "网易云音乐官方外链播放器",
    what: "播放儿歌时的备用音源，以 iframe 形式嵌入",
    data: "只在你点开播放时加载，由对方按其隐私政策处理",
  },
  {
    name: "开放天气接口（wttr.in）",
    what: "宝宝听听首页的天气和穿衣提示",
    data: "只发送一个大致城市名，不发送精确位置，也不发送宝宝信息",
  },
  {
    name: "Google Fonts",
    what: "界面字体，构建时已打进静态文件",
    data: "运行时不再请求对方服务器",
  },
];

export const NO_TRACKER_NOTE =
  "这个版本没有接入任何广告、推送或行为分析 SDK。上面列出的就是全部会碰到数据的第三方。";
