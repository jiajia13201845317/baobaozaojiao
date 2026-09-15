/**
 * 7.3 — 可查阅、可导出、可删除.
 *
 * The plan asks for three separate things and they are genuinely separate:
 * a parent must be able to *read* what is held, take a *copy* away, and have
 * it *gone*. So this module produces two exports, not one. The JSON is the
 * complete machine copy, including every field the app stores, so nothing is
 * quietly withheld. The text copy is the one a parent will actually open —
 * a readable logbook they can keep if they stop using the app.
 *
 * 删除范围 is spelled out in `DELETE_SCOPE` rather than left to a dialog, and
 * covers the part people forget: the photo bytes live in IndexedDB, not in
 * the state blob, so a state wipe alone would leave them behind.
 */
import { clockOf, dayOf, kindSpec, tempWayName } from "./records";
import { METRIC_LABEL, type Metric } from "./growth";
import { VACCINES } from "./vaccines";
import { type Carer, ROLE_NAME } from "./settings";
import type { Baby, BabyData, GrowState } from "./store";

export const EXPORT_VERSION = 1;

export function exportJson(state: GrowState) {
  return JSON.stringify({ app: "一起长大", version: EXPORT_VERSION, at: new Date().toISOString(), state }, null, 2);
}

function metricLine(num: Record<string, number>) {
  return (["height", "weight", "head"] as Metric[])
    .filter((m) => typeof num[m] === "number")
    .map((m) => `${METRIC_LABEL[m]} ${num[m]}`)
    .join(" · ");
}

function babyText(baby: Baby, data: BabyData, carers: Carer[]) {
  const who = (id?: string) => (id ? (carers.find((c) => c.id === id)?.name ?? "") : "");
  const lines: string[] = [];
  lines.push(`【${baby.name}】`);
  lines.push(`生日 ${baby.birthday}${baby.pretermWeeks ? ` · 出生时 ${baby.pretermWeeks} 周` : ""}`);
  lines.push("");

  lines.push("— 记录 —");
  if (!data.events.length) lines.push("（还没有记录）");
  for (const e of data.events) {
    const spec = kindSpec(e.kind);
    const bits = [`${dayOf(e.at)} ${clockOf(e.at)}`, spec.name];
    if (e.kind === "growth" && e.num) bits.push(metricLine(e.num));
    if (e.kind === "temp" && e.num?.temp != null) bits.push(`${e.num.temp} ℃ · ${tempWayName(e.pick)}`);
    if (e.tags?.length) bits.push(e.tags.join("/"));
    if (e.photo) bits.push("含照片");
    if (e.note) bits.push(e.note);
    const name = who(e.by);
    if (name) bits.push(`记录人 ${name}`);
    lines.push(bits.join("  "));
  }
  lines.push("");

  lines.push("— 打卡 —");
  const days = Object.keys(data.done).sort();
  lines.push(days.length ? `共 ${days.length} 天，最近 ${days[days.length - 1]}` : "（还没有打卡）");
  lines.push("");

  lines.push("— 里程碑 —");
  lines.push(data.milestones.length ? `已记下 ${data.milestones.length} 项` : "（还没有记录）");
  lines.push("");

  lines.push("— 疫苗 —");
  if (!data.vaccines.length) lines.push("（还没有勾选）");
  for (const id of data.vaccines) {
    const v = VACCINES.find((x) => x.id === id);
    if (v) lines.push(`已完成  ${v.name}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function exportText(state: GrowState, carers: Carer[]) {
  const head = [
    "一起长大 · 数据导出",
    `导出时间 ${new Date().toLocaleString("zh-CN")}`,
    "这份文件里的内容全部来自你自己在这台设备上填写的记录。",
    "它不包含任何评价或结论；需要判断请带着记录咨询儿保医生。",
    "",
  ];
  if (carers.length) {
    head.push("— 成员 —");
    for (const c of carers) head.push(`${c.name}  ${ROLE_NAME[c.role]}`);
    head.push("");
  }
  const bodies = state.babies.map((b) => babyText(b, state.data[b.id] ?? ({} as BabyData), carers));
  return [...head, ...bodies].join("\n");
}

export function download(name: string, text: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const DELETE_SCOPE = [
  "宝宝档案：姓名、生日、早产周数",
  "全部记录：身高体重头围、体温、排便排尿、饮食",
  "全部照片（连同存在 IndexedDB 里的原图和缩略图）",
  "打卡、里程碑、疫苗勾选",
  "积分、宠物和图鉴进度",
  "成员、操作日志、提醒与同意设置",
];

export const DELETE_NOTE =
  "删除会立刻生效，这台设备上不留副本，也没有回收站可以找回。建议先导出一份留在自己手里再删。";
