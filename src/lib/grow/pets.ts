/**
 * The pet collection.
 *
 * Every pet arrives as the same anonymous egg and only reveals which creature
 * it is once it has been raised far enough — the blind-box beat is the whole
 * point, so the art for the first three levels is shared by all of them.
 *
 * Levelling is driven purely by 累计积分, which is derived from the records and
 * can only ever go up. Spending 可用积分 on adoption or on care never touches
 * it, so nothing a parent buys can slow a pet down or undo progress.
 */
export type SeriesId = "forest" | "water" | "wind" | "ice" | "fire" | "light" | "star";

export type Series = {
  id: SeriesId;
  name: string;
  color: string;
  tint: string;
  cost: number;
  blurb: string;
};

export const SERIES: Series[] = [
  { id: "forest", name: "森系", color: "#4CAF50", tint: "#DFF5DD", cost: 180, blurb: "最先认识你的一窝" },
  { id: "water", name: "水系", color: "#3AA7E0", tint: "#DAEEFB", cost: 240, blurb: "住在浅水边" },
  { id: "wind", name: "风系", color: "#2FBFB5", tint: "#D6F2EF", cost: 320, blurb: "跑起来带风" },
  { id: "ice", name: "冰系", color: "#6C9BE8", tint: "#E0E9FB", cost: 420, blurb: "呼一口气会结霜" },
  { id: "fire", name: "炎系", color: "#F2762E", tint: "#FCE5D5", cost: 560, blurb: "尾巴一直是暖的" },
  { id: "light", name: "光系", color: "#E8A317", tint: "#FCEFD0", cost: 720, blurb: "天黑了自己会亮" },
  { id: "star", name: "星系", color: "#8B62D9", tint: "#EBE2FA", cost: 900, blurb: "身上装着一小片夜空" },
];

export type Creature = {
  id: string;
  series: SeriesId;
  name: string;
  trait: string;
};

export const CREATURES: Creature[] = [
  { id: "forest-1", series: "forest", name: "嫩芽龙", trait: "头顶那片叶子会跟着太阳转。" },
  { id: "forest-2", series: "forest", name: "苔藓龙", trait: "最喜欢靠在石头上睡午觉。" },
  { id: "forest-3", series: "forest", name: "花瓣龙", trait: "走过的地方会留下一点香味。" },
  { id: "water-1", series: "water", name: "水滴龙", trait: "额头那颗水珠一年都不会干。" },
  { id: "water-2", series: "water", name: "浪花龙", trait: "打喷嚏的时候会卷起一朵小浪。" },
  { id: "water-3", series: "water", name: "泡泡龙", trait: "高兴起来就吐一串泡泡。" },
  { id: "wind-1", series: "wind", name: "羽翼龙", trait: "翅膀还太小，只能飞过一张桌子。" },
  { id: "wind-2", series: "wind", name: "云朵龙", trait: "头上那朵云是它自己找来的。" },
  { id: "wind-3", series: "wind", name: "旋风龙", trait: "转三圈就能把落叶都聚起来。" },
  { id: "ice-1", series: "ice", name: "雪花龙", trait: "额头的雪花每天都是新图案。" },
  { id: "ice-2", series: "ice", name: "冰晶龙", trait: "背上的冰棱在太阳下会变色。" },
  { id: "ice-3", series: "ice", name: "霜花龙", trait: "呵一口气，玻璃上就开花。" },
  { id: "fire-1", series: "fire", name: "火苗龙", trait: "尾巴尖的火苗,睡着了就变成小豆点。" },
  { id: "fire-2", series: "fire", name: "熔岩龙", trait: "背上的纹路天冷时会更亮。" },
  { id: "fire-3", series: "fire", name: "烟花龙", trait: "一激动头顶就炸开小烟花。" },
  { id: "light-1", series: "light", name: "阳光龙", trait: "醒得比谁都早，天没亮就开始亮。" },
  { id: "light-2", series: "light", name: "灯笼龙", trait: "抱着的那盏灯从来没灭过。" },
  { id: "light-3", series: "light", name: "彩虹龙", trait: "刚下过雨的时候最神气。" },
  { id: "star-1", series: "star", name: "星星龙", trait: "头上那颗星是自己摘的。" },
  { id: "star-2", series: "star", name: "月亮龙", trait: "月亮圆的那天话最多。" },
  { id: "star-3", series: "star", name: "银河龙", trait: "身上的光点,每一颗都是一个愿望。" },
];

export function creaturesOf(series: SeriesId) {
  return CREATURES.filter((c) => c.series === series);
}

export function creatureById(id: string) {
  return CREATURES.find((c) => c.id === id) ?? null;
}

export function seriesById(id: SeriesId) {
  return SERIES.find((s) => s.id === id) ?? SERIES[0]!;
}

/** Levels 1-3 are the shared egg; the creature only shows from level 4. */
export type Level = {
  lv: number;
  at: number;
  name: string;
  art: string | null;
  line: string;
};

export const LEVELS: Level[] = [
  { lv: 1, at: 0, name: "蛋仔", art: "/art/pet/egg-1.webp", line: "里面好像有动静。" },
  { lv: 2, at: 150, name: "裂壳", art: "/art/pet/egg-2.webp", line: "壳上裂了一道，它自己也吓一跳。" },
  { lv: 3, at: 400, name: "破壳", art: "/art/pet/egg-3.webp", line: "出来啦！壳还顶在头上没舍得摘。" },
  { lv: 4, at: 700, name: "幼龙", art: null, line: "今天也想跟着你到处跑。" },
  { lv: 5, at: 1200, name: "闪耀", art: null, line: "这一路都是你陪它长大的。" },
];

export const REVEAL_LV = 4;

/**
 * The incubation stages are the one piece of art every baby shares, so they
 * follow the baby's theme. A revealed creature already carries its element
 * colour and is left alone.
 */
export function themedPetArt(art: string, sex: "boy" | "girl") {
  return sex === "girl" && /^\/art\/pet\/egg-[123]\.webp$/.test(art) ? art.replace(".webp", "-pink.webp") : art;
}

export type OwnedPet = {
  id: string;
  creature: string;
  /** The 累计积分 total at the moment this pet was taken in. */
  from: number;
};

export type PetView = {
  pet: OwnedPet;
  creature: Creature;
  series: Series;
  level: Level;
  next: Level | null;
  /** Points earned since this pet was taken in. */
  progress: number;
  need: number;
  ratio: number;
  revealed: boolean;
  name: string;
  art: string;
  line: string;
};

export function viewPet(pet: OwnedPet, total: number): PetView {
  const creature = creatureById(pet.creature) ?? CREATURES[0]!;
  const series = seriesById(creature.series);
  const progress = Math.max(0, total - pet.from);
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (progress >= LEVELS[i]!.at) index = i;
  const level = LEVELS[index]!;
  const next = LEVELS[index + 1] ?? null;
  const span = next ? next.at - level.at : 1;
  const revealed = level.lv >= REVEAL_LV;
  return {
    pet,
    creature,
    series,
    level,
    next,
    progress,
    need: next ? Math.max(0, next.at - progress) : 0,
    ratio: next ? Math.min(1, (progress - level.at) / span) : 1,
    revealed,
    name: revealed ? creature.name : level.name,
    art: level.art ?? `/art/pet/${creature.id}.webp`,
    line: level.line,
  };
}

/**
 * Care is flavour, not pressure. The three meters drift down slowly and stop
 * at a floor, so a pet is never sad, never sick, and never blocks anything —
 * levelling reads 累计积分 and nothing else.
 */
export type CareId = "food" | "play" | "bath";

export type Care = {
  id: CareId;
  name: string;
  meter: string;
  cost: number;
  gain: number;
  color: string;
};

export const CARES: Care[] = [
  { id: "food", name: "喂食", meter: "饱腹", cost: 6, gain: 30, color: "#F2762E" },
  { id: "play", name: "玩耍", meter: "心情", cost: 6, gain: 30, color: "#E4568F" },
  { id: "bath", name: "洗澡", meter: "干净", cost: 6, gain: 30, color: "#3AA7E0" },
];

const DRIFT_PER_DAY = 12;
const FLOOR = 35;
const FULL = 100;

export type CareState = Partial<Record<CareId, { at: number; value: number }>>;

export function meterOf(care: CareState, id: CareId, now = Date.now()) {
  const entry = care[id];
  if (!entry) return 60;
  const days = Math.max(0, (now - entry.at) / 86400000);
  return Math.round(Math.max(FLOOR, Math.min(FULL, entry.value - days * DRIFT_PER_DAY)));
}

export function afterCare(care: CareState, id: CareId, now = Date.now()): CareState {
  const gain = CARES.find((c) => c.id === id)?.gain ?? 0;
  return { ...care, [id]: { at: now, value: Math.min(FULL, meterOf(care, id, now) + gain) } };
}

export function moodOf(care: CareState, now = Date.now()) {
  return Math.round(CARES.reduce((sum, c) => sum + meterOf(care, c.id, now), 0) / CARES.length);
}

/**
 * Which creature comes out of a new egg. Picked at adoption from whatever the
 * family does not have yet, so a purchase can never be a duplicate.
 */
export function pickCreature(series: SeriesId, owned: string[]) {
  const pool = creaturesOf(series).filter((c) => !owned.includes(c.id));
  const from = pool.length ? pool : creaturesOf(series);
  return from[Math.floor(Math.random() * from.length)]!.id;
}
