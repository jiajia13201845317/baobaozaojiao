/**
 * 国家免疫规划疫苗儿童免疫程序表（2021 年版）, the free national schedule.
 *
 * This is a reminder and a place to tick things off, nothing more. The app
 * never decides whether a dose is needed, never recommends a vaccine outside
 * the published schedule, and always defers to the 接种证 and the clinic.
 *
 * `dueMonth` is the earliest age the dose may be given. `finishBy` is the age
 * the published guidance asks families to have it done by, where one is given.
 */
export type Vaccine = {
  id: string;
  disease: string;
  name: string;
  abbr: string;
  dose: string;
  dueMonth: number;
  finishBy?: number;
  note?: string;
};

export const VACCINES: Vaccine[] = [
  { id: "hepb-1", disease: "乙肝", name: "乙肝疫苗", abbr: "HepB", dose: "第 1 剂", dueMonth: 0, finishBy: 0.03, note: "出生后 24 小时内完成。" },
  { id: "bcg", disease: "结核病", name: "卡介苗", abbr: "BCG", dose: "1 剂", dueMonth: 0, finishBy: 3, note: "建议小于 3 月龄完成。" },
  { id: "hepb-2", disease: "乙肝", name: "乙肝疫苗", abbr: "HepB", dose: "第 2 剂", dueMonth: 1 },
  { id: "ipv-1", disease: "脊髓灰质炎", name: "脊灰灭活疫苗", abbr: "IPV", dose: "第 1 剂", dueMonth: 2 },
  { id: "ipv-2", disease: "脊髓灰质炎", name: "脊灰灭活疫苗", abbr: "IPV", dose: "第 2 剂", dueMonth: 3 },
  { id: "dtap-1", disease: "百日咳白喉破伤风", name: "百白破疫苗", abbr: "DTaP", dose: "第 1 剂", dueMonth: 3 },
  { id: "opv-3", disease: "脊髓灰质炎", name: "脊灰减毒活疫苗", abbr: "bOPV", dose: "第 3 剂", dueMonth: 4, finishBy: 12 },
  { id: "dtap-2", disease: "百日咳白喉破伤风", name: "百白破疫苗", abbr: "DTaP", dose: "第 2 剂", dueMonth: 4 },
  { id: "dtap-3", disease: "百日咳白喉破伤风", name: "百白破疫苗", abbr: "DTaP", dose: "第 3 剂", dueMonth: 5, finishBy: 12 },
  { id: "hepb-3", disease: "乙肝", name: "乙肝疫苗", abbr: "HepB", dose: "第 3 剂", dueMonth: 6, finishBy: 12 },
  { id: "mpsva-1", disease: "流脑", name: "A 群流脑多糖疫苗", abbr: "MPSV-A", dose: "第 1 剂", dueMonth: 6 },
  { id: "mmr-1", disease: "麻疹风疹腮腺炎", name: "麻腮风疫苗", abbr: "MMR", dose: "第 1 剂", dueMonth: 8, finishBy: 12 },
  { id: "je-1", disease: "乙脑", name: "乙脑减毒活疫苗", abbr: "JE-L", dose: "第 1 剂", dueMonth: 8, finishBy: 12, note: "若选灭活疫苗，程序为 4 剂次，以接种点安排为准。" },
  { id: "mpsva-2", disease: "流脑", name: "A 群流脑多糖疫苗", abbr: "MPSV-A", dose: "第 2 剂", dueMonth: 9, finishBy: 18 },
  { id: "dtap-4", disease: "百日咳白喉破伤风", name: "百白破疫苗", abbr: "DTaP", dose: "第 4 剂", dueMonth: 18, finishBy: 24 },
  { id: "mmr-2", disease: "麻疹风疹腮腺炎", name: "麻腮风疫苗", abbr: "MMR", dose: "第 2 剂", dueMonth: 18, finishBy: 24 },
  { id: "hepa-1", disease: "甲肝", name: "甲肝减毒活疫苗", abbr: "HepA-L", dose: "1 剂", dueMonth: 18, finishBy: 24, note: "若选甲肝灭活疫苗，改为 18 月龄和 2 周岁各 1 剂。" },
  { id: "je-2", disease: "乙脑", name: "乙脑减毒活疫苗", abbr: "JE-L", dose: "第 2 剂", dueMonth: 24, finishBy: 36 },
  { id: "mpsvac-1", disease: "流脑", name: "A 群 C 群流脑多糖疫苗", abbr: "MPSV-AC", dose: "第 1 剂", dueMonth: 36, finishBy: 48 },
  { id: "opv-4", disease: "脊髓灰质炎", name: "脊灰减毒活疫苗", abbr: "bOPV", dose: "第 4 剂", dueMonth: 48, finishBy: 60 },
  { id: "dt", disease: "白喉破伤风", name: "白破疫苗", abbr: "DT", dose: "1 剂", dueMonth: 72, finishBy: 84 },
  { id: "mpsvac-2", disease: "流脑", name: "A 群 C 群流脑多糖疫苗", abbr: "MPSV-AC", dose: "第 2 剂", dueMonth: 72, finishBy: 84 },
];

export type VaccineStatus = "done" | "due" | "soon" | "later" | "late";

export const STATUS_LABEL: Record<VaccineStatus, string> = {
  done: "已接种",
  late: "已超过建议月龄",
  due: "可以约了",
  soon: "快到了",
  later: "以后",
};

export function vaccineStatus(v: Vaccine, months: number, done: boolean): VaccineStatus {
  if (done) return "done";
  if (v.finishBy != null && months > v.finishBy) return "late";
  if (months >= v.dueMonth) return "due";
  if (months >= v.dueMonth - 2) return "soon";
  return "later";
}

export function dueDate(birthday: string, month: number) {
  const born = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const at = new Date(born.getTime());
  at.setMonth(at.getMonth() + Math.round(month));
  return at;
}

/** A dose older than this is treated as history the parent has yet to tick off. */
const BACKFILL_MONTHS = 3;

/**
 * What to surface on the home screen. Families usually start using an app like
 * this well after the newborn doses were already given at the clinic, so the
 * oldest unticked dose is almost never the useful one, and showing it as
 * overdue would only alarm. The dose nearest the child's current age is what
 * they can act on; everything older is counted as a nudge to fill in the list.
 */
export function nextVaccine(months: number, doneIds: string[]) {
  const pending = VACCINES.filter((v) => !doneIds.includes(v.id));
  if (!pending.length) return null;
  const nearest = [...pending].sort(
    (a, b) => Math.abs(a.dueMonth - months) - Math.abs(b.dueMonth - months) || a.dueMonth - b.dueMonth,
  )[0]!;
  return {
    vaccine: nearest,
    status: vaccineStatus(nearest, months, false),
    behind: pending.filter((v) => v.dueMonth < months - BACKFILL_MONTHS).length,
  };
}
