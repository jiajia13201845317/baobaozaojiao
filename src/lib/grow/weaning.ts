/**
 * 辅食阶段参考 与 过敏原科普 (plan 4.3.1).
 *
 * Both halves of this file are reference text a parent can read, and nothing
 * else. The stages describe what food commonly looks like around an age —
 * consistency and form — because that is the part a parent can actually see
 * in the bowl. There is deliberately nowhere here to put a start date, a
 * portion or a verdict: chapter 4 leaves the pace to the family and the
 * 儿保医生, and the app only ever hands back what it was told.
 *
 * The allergen half stops at 科普: what the food is called, where it hides on
 * a 配料表, and who to ask. Whether to serve a food, when, and what a reaction
 * means are all left out on purpose — those are the doctor's to answer, and a
 * wrong answer here would be the one read at 2am.
 */

export type WeaningStage = {
  id: string;
  name: string;
  fromMonth: number;
  toMonth: number;
  /** 性状参考 — what the food is typically like at this stage. */
  texture: string[];
  /** Things a parent commonly tries at this stage, as examples not a prescription. */
  tries: string[];
  note: string;
};

/**
 * The four-way split is the plan's. A stage is a description of what food
 * commonly looks like around then, not a gate the child passes through on a
 * birthday, which is why each entry carries a range and no start date.
 */
export const WEANING_STAGES: WeaningStage[] = [
  {
    id: "puree",
    name: "泥糊期",
    fromMonth: 6,
    toMonth: 7,
    texture: [
      "细腻的泥糊，用勺子舀起来不太容易滴下去",
      "比米汤稠，比米饭软很多，几乎没有颗粒",
      "一勺里通常只有一种食材的味道",
    ],
    tries: [
      "婴儿米粉冲调成能挂在勺子上的糊",
      "南瓜泥、土豆泥、山药泥",
      "苹果泥、香蕉泥",
      "青菜叶煮软后压成的泥",
    ],
    note: "这里写的是常见的性状参考，不是时间表；从哪天开始、走多快，你和儿保医生说了算。",
  },
  {
    id: "mashed",
    name: "碎末期",
    fromMonth: 7,
    toMonth: 9,
    texture: [
      "用勺背能压散的稠糊，开始带一点小颗粒",
      "不再完全顺滑，手指能轻轻捏开",
      "一顿里可以有两三种食材混在一起",
    ],
    tries: [
      "煮得软烂的粥和烂面",
      "肉末、鱼肉碎、肝泥",
      "豆腐压碎拌在粥里",
      "胡萝卜、西兰花煮软后剁碎",
    ],
    note: "颗粒感是慢慢加上去的，加得多快看孩子自己的样子，也可以问问儿保医生，这一栏只是参考。",
  },
  {
    id: "chunks",
    name: "小软块期",
    fromMonth: 9,
    toMonth: 12,
    texture: [
      "煮软的小块，牙床一压就碎",
      "有的做成手指粗的条状，方便自己抓着拿",
      "干的湿的搭着来，不全是糊",
    ],
    tries: [
      "软饭、小块馒头",
      "蒸软的红薯条、南瓜条",
      "切碎的青菜和菌菇",
      "小块豆腐、小块水果",
    ],
    note: "同样只是参考：有的孩子这会儿已经爱抓着吃，有的还更喜欢软一点的，节奏由你和儿保医生定。",
  },
  {
    id: "family",
    name: "家常过渡期",
    fromMonth: 12,
    toMonth: 24,
    texture: [
      "接近家常菜的样子，只是切得更小、煮得更软",
      "大小以一口能放进嘴里为准",
      "口味比大人桌上的清淡一些",
    ],
    tries: [
      "和大人同锅、单独盛出来的饭菜",
      "饺子、小包子切成小块",
      "面条、杂粮饭",
      "整颗水果切成小瓣",
    ],
    note: "这里给的是常见做法的参考，家里饭桌怎么安排，和儿保医生商量着来最合适。",
  },
];

/**
 * Outside the table there is no stage to show. Before six months the plan's
 * list has no entry at all, and after two years the child eats what the family
 * eats — the plain 饮食记录 then says more than any stage label would.
 */
export function weaningStageFor(months: number): WeaningStage | null {
  const first = WEANING_STAGES[0]!;
  const last = WEANING_STAGES[WEANING_STAGES.length - 1]!;
  if (months < first.fromMonth || months > last.toMonth) return null;
  return WEANING_STAGES.find((s) => months < s.toMonth) ?? last;
}

export type Allergen = { id: string; name: string; also: string[]; note: string };

/**
 * 4.3.1 过敏原科普. `also` exists for exactly one job: standing in a shop with
 * a packet in hand, a parent wants to know which words on the 配料表 mean this
 * food. The list stops there — it names things and points at the 儿保医生, and
 * it never helps anyone work out what a reaction was.
 */
export const ALLERGENS: Allergen[] = [
  {
    id: "milk",
    name: "牛奶",
    also: ["酸奶", "奶酪", "黄油", "奶油", "含乳饮料", "饼干蛋糕里的奶粉"],
    note: "配料表上写「乳」「奶」「乳清」「酪蛋白」，说的多半就是它；孩子吃完你看到了什么，记在饮食记录里，拿去问儿保医生。",
  },
  {
    id: "egg",
    name: "鸡蛋",
    also: ["蛋糕", "蛋挞", "蛋黄酱", "面包表面刷的蛋液", "鱼丸肉肠里的蛋白粉"],
    note: "蛋清和蛋黄在配料表里常分开写，看到「全蛋粉」「蛋白粉」也是同一类；具体的事情听儿保医生的。",
  },
  {
    id: "peanut",
    name: "花生",
    also: ["花生酱", "花生油", "花生碎", "花生糖", "某些沙茶酱和凉拌调料"],
    note: "花生常被磨成酱或榨成油藏在调料里，看配料表比看菜名清楚；其他的问儿保医生。",
  },
  {
    id: "treenut",
    name: "坚果",
    also: ["核桃", "腰果", "开心果", "杏仁", "五仁馅", "坚果味饮料"],
    note: "坚果种类多，配料表里有时只写「混合坚果」「坚果碎」；孩子这边的情况，交给儿保医生看。",
  },
  {
    id: "wheat",
    name: "小麦",
    also: ["面条", "馒头", "饺子皮", "面包饼干", "面筋", "酱油里的小麦成分"],
    note: "面食之外，酱油和一些调味粉里也有小麦；这一栏只帮你认标签，别的问儿保医生。",
  },
  {
    id: "soy",
    name: "大豆",
    also: ["豆腐", "豆浆", "豆皮", "酱油", "豆瓣酱", "大豆油", "植物蛋白配料"],
    note: "豆制品之外，酱类和一些植物蛋白配料里也常见大豆；具体怎么安排，听儿保医生的。",
  },
  {
    id: "fish",
    name: "鱼",
    also: ["鱼丸", "鱼肉肠", "鱼露", "鱼汤", "高汤粉", "鱼味调料"],
    note: "鱼不一定以鱼的样子出现，鱼露、鱼丸、高汤粉里都可能有；孩子的情况请儿保医生看。",
  },
  {
    id: "shellfish",
    name: "甲壳类",
    also: ["虾仁", "虾皮", "虾米", "蟹肉棒", "虾油", "海鲜味调料"],
    note: "虾蟹的成分会出现在虾皮、虾油和一些海鲜味调料里；其他的交给儿保医生。",
  },
];
