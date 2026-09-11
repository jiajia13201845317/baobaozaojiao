/**
 * 分龄早教内容. Quarters, not months: a quarter has enough resolution to track
 * a real developmental shift, while leaving room for the individual variation
 * that makes month-precise checklists stressful rather than useful.
 *
 * Every task is written to be finishable in 3-5 minutes with whatever is
 * already in the room, and carries one line of why-it-matters so the parent
 * learns something instead of just ticking a box.
 */
export type Dimension = "motor" | "fine" | "language" | "social";

export const DIMENSIONS: { id: Dimension; name: string; short: string; color: string; tint: string }[] = [
  { id: "motor", name: "大运动", short: "动", color: "#E08A5C", tint: "#FBE6D8" },
  { id: "fine", name: "精细动作 · 认知", short: "手", color: "#5C9FE0", tint: "#DCEAFA" },
  { id: "language", name: "语言", short: "说", color: "#4FA87A", tint: "#DCF0E4" },
  { id: "social", name: "社交情感", short: "心", color: "#C77BB5", tint: "#F6E2F1" },
];

export function dimensionOf(id: Dimension) {
  return DIMENSIONS.find((d) => d.id === id)!;
}

export type Task = {
  id: string;
  dim: Dimension;
  title: string;
  tip: string;
};

export type Milestone = {
  id: string;
  title: string;
  hint: string;
};

export type Stage = {
  id: string;
  quarters: string;
  name: string;
  fromMonth: number;
  toMonth: number;
  /** 本季度发展速览 — one screen for the parent, written to lower the temperature. */
  overview: string[];
  focus: { dim: Dimension; text: string }[];
  tasks: Task[];
  milestones: Milestone[];
};

const STAGE_ONE: Stage = {
  id: "q1q2",
  quarters: "Q1-Q2",
  name: "走稳，开口",
  fromMonth: 12,
  toMonth: 18,
  overview: [
    "这半年最大的两件事，是腿脚变稳和嘴巴开张。走路从跌跌撞撞到能拐弯、能蹲下捡东西；说话从只会几个音，到蹦出第一批有意义的单词。",
    "两件事很少同时突飞猛进。很多宝宝走得早就说得晚一点，反过来也一样，这是常见节奏，不是落后。",
    "下面的任务是给你的灵感，不是考试题。今天做不了就换一个，这周没做完也没关系——重复比数量重要，一个躲猫猫玩上二十遍，比二十个新游戏更有用。",
  ],
  focus: [
    { dim: "motor", text: "独走、蹲起" },
    { dim: "fine", text: "抓握、简单搭积木" },
    { dim: "language", text: "单词爆发期" },
    { dim: "social", text: "依恋关系、简单模仿" },
  ],
  tasks: [
    { id: "s1-m1", dim: "motor", title: "扶着东西蹲下捡玩具，再自己站起来", tip: "蹲起用到的是大腿和臀部的深层肌群，这组肌肉稳了，走路才不容易摔。" },
    { id: "s1-m2", dim: "motor", title: "光脚在地板、地毯、草地上各走一段", tip: "脚底的触觉反馈是平衡感的重要来源，不同材质能给到不一样的刺激。" },
    { id: "s1-m3", dim: "motor", title: "推着小推车或助步车往前走 5 米", tip: "推东西时身体前倾，重心稳，宝宝敢迈更大的步子。" },
    { id: "s1-m4", dim: "motor", title: "放一首歌，带宝宝一起摇摆", tip: "跟着节拍动身体，练的是把听到的和做出的动作对上，这是协调性的开始。" },
    { id: "s1-m5", dim: "motor", title: "扶着爬上 15 厘米以下的矮台阶，再走下来", tip: "上下高度差需要单腿短暂支撑，是上楼梯的前一步。" },
    { id: "s1-m6", dim: "motor", title: "踢一个软球", tip: "踢球的瞬间必须单脚站住，这是很自然的单脚支撑练习。" },
    { id: "s1-f1", dim: "fine", title: "把 3 块积木叠高", tip: "叠不成也算完成。反复尝试的过程本身就在练手眼配合和松手的控制。" },
    { id: "s1-f2", dim: "fine", title: "把小物件放进杯子，再一个个拿出来", tip: "主动松开手指比抓住更难，这是精细动作里关键的一步。" },
    { id: "s1-f3", dim: "fine", title: "翻厚页绘本，让宝宝自己翻页", tip: "捏住一页并翻过去，需要拇指和食指分工，这是捏握的雏形。" },
    { id: "s1-f4", dim: "fine", title: "把圆形、方形积木放进对应的形状孔", tip: "先看形状再调整手腕角度，是最早的空间认知练习。" },
    { id: "s1-f5", dim: "fine", title: "用蜡笔在纸上随便涂", tip: "这个阶段不需要画出东西，手臂带动笔留下痕迹，就是因果关系的体验。" },
    { id: "s1-f6", dim: "fine", title: "撕纸游戏", tip: "撕开需要两只手朝相反方向用力，是双手协作的入门动作。用安全无毒的纸。" },
    { id: "s1-l1", dim: "language", title: "指着 3 种水果说名字，等宝宝模仿", tip: "手指指向 + 说出名字，能帮宝宝把声音和东西对上号。" },
    { id: "s1-l2", dim: "language", title: "玩「这是什么」，指认家里 5 样常见东西", tip: "能听懂的词远多于能说出的词，先把听的库存攒够。" },
    { id: "s1-l3", dim: "language", title: "读绘本时故意停一下，等宝宝补一个词", tip: "留白制造了「该我了」的空档，比一直讲更能引出主动开口。" },
    { id: "s1-l4", dim: "language", title: "唱一首带动作的儿歌", tip: "动作是语言的拐杖，先记住动作，词就跟着记住了。" },
    { id: "s1-l5", dim: "language", title: "玩模仿动物叫声的游戏", tip: "拟声词音节简单、重复度高，常常是宝宝最早能主动发出的一批音。" },
    { id: "s1-l6", dim: "language", title: "鼓励用一个词表达需求，而不是只哭", tip: "只要宝宝试着出声，就立刻回应，让他发现说话比哭更管用。" },
    { id: "s1-s1", dim: "social", title: "玩躲猫猫", tip: "东西被挡住还在，这个「物体永存」的概念，就是在躲猫猫里长出来的。" },
    { id: "s1-s2", dim: "social", title: "对着镜子做表情，让宝宝跟着学", tip: "模仿表情是社交的起点，也是在认识镜子里那个人是自己。" },
    { id: "s1-s3", dim: "social", title: "推球给宝宝，等他推回来", tip: "一来一回是最简单的轮流，对话的节奏感就是从这里开始的。" },
    { id: "s1-s4", dim: "social", title: "帮宝宝把情绪说出来", tip: "「你现在很生气」这样的话，是在给还没有词的感受贴上标签。" },
    { id: "s1-s5", dim: "social", title: "让宝宝模仿你拍手、挥手再见", tip: "模仿是这个阶段最主要的学习方式，宝宝在通过复制你来理解世界。" },
    { id: "s1-s6", dim: "social", title: "交给宝宝一个小任务，完成后认真夸他", tip: "「帮妈妈把纸巾拿过来」这种能做到的小事，攒的是「我能行」的感觉。" },
  ],
  milestones: [
    { id: "s1-k1", title: "能独立走 10 步以上", hint: "不用扶东西，连着走。" },
    { id: "s1-k2", title: "能说出 3 个及以上有意义的单词", hint: "不含爸爸妈妈的无意识发音，指的是真的在指代东西。" },
    { id: "s1-k3", title: "能配合完成简单的两步指令", hint: "比如「把球捡起来，给爷爷」。" },
    { id: "s1-k4", title: "能指认至少 5 个身体部位", hint: "眼睛、鼻子、嘴巴、耳朵、手都算。" },
  ],
};

const STAGE_TWO: Stage = {
  id: "q3q4",
  quarters: "Q3-Q4",
  name: "短句，假装",
  fromMonth: 19,
  toMonth: 24,
  overview: [
    "这半年会开始出现两个词拼在一起的短句——「妈妈抱」「要那个」。词汇量常常是先慢后快，某一周突然冒出一堆新词是很常见的。",
    "另一件有意思的事是假装游戏：拿积木当电话、给娃娃喂饭。这说明宝宝已经能在脑子里让一样东西代表另一样东西了，是认知上不小的一步。",
    "看到宝宝在小朋友旁边各玩各的，不用担心。这个年纪的「平行游戏」就是正常的社交方式，真正的合作要再晚一些。",
  ],
  focus: [
    { dim: "motor", text: "跑跳、上下楼梯" },
    { dim: "fine", text: "涂鸦、模仿动作、颜色形状认知" },
    { dim: "language", text: "双词句 → 短句" },
    { dim: "social", text: "平行游戏、自我意识萌芽" },
  ],
  tasks: [
    { id: "s2-m1", dim: "motor", title: "扶着栏杆自己上楼梯", tip: "这个阶段是双脚并拢式，一级一级上，不用急着交替迈步。" },
    { id: "s2-m2", dim: "motor", title: "原地双脚跳", tip: "跳不起来也算。屈膝下蹲再发力的这个准备动作，本身就是在攒力量。" },
    { id: "s2-m3", dim: "motor", title: "助跑几步", tip: "跑和走的区别是有腾空的瞬间，需要更强的核心稳定。" },
    { id: "s2-m4", dim: "motor", title: "手举过肩往前扔球", tip: "过肩扔要求肩膀、躯干和手臂按顺序发力，是大肌肉协调的好练习。" },
    { id: "s2-m5", dim: "motor", title: "倒着走几步", tip: "看不见后面还能保持平衡，靠的是身体位置感，比向前走难得多。" },
    { id: "s2-m6", dim: "motor", title: "踢一个放在地上不动的球", tip: "和上个阶段不同，这次要真正抬起脚踢出去，而不是走过去撞到。" },
    { id: "s2-f1", dim: "fine", title: "叠高 4 到 6 块积木", tip: "越高越需要控制放手的力度和时机，这是手部精细控制的直接体现。" },
    { id: "s2-f2", dim: "fine", title: "玩 2 到 3 片的大块拼图", tip: "先在脑子里判断形状对不对，再动手放，是看和做的联合练习。" },
    { id: "s2-f3", dim: "fine", title: "按颜色给玩具分类", tip: "分类意味着能忽略大小形状，只看颜色这一个属性，这是抽象思维的开头。" },
    { id: "s2-f4", dim: "fine", title: "打开和关上带盖的小盒子", tip: "拧、扣、掀这些动作各不相同，每一种都在扩充手的动作库。" },
    { id: "s2-f5", dim: "fine", title: "串大颗珠子", tip: "两只手一只拿绳一只拿珠，各做各的事，难度比看上去高。全程看护，防误吞。" },
    { id: "s2-f6", dim: "fine", title: "指认绘本里的图案", tip: "从认识实物到认识画出来的实物，中间隔着一次不小的抽象跨越。" },
    { id: "s2-l1", dim: "language", title: "鼓励说两个词组合的短语", tip: "「喝水」「妈妈抱」这类组合，说明宝宝开始理解词和词之间的关系。" },
    { id: "s2-l2", dim: "language", title: "玩指身体部位游戏，目标 5 个以上", tip: "身体部位是最好练的一类词，因为答案随身带着。" },
    { id: "s2-l3", dim: "language", title: "给宝宝两步指令", tip: "「把鞋拿来，放门口」需要把一句话拆成先后两件事记住。" },
    { id: "s2-l4", dim: "language", title: "看图指认游戏", tip: "你说名字他来指，考的是听懂，比让他说出来压力小很多。" },
    { id: "s2-l5", dim: "language", title: "鼓励用词表达拒绝，而不是只哭", tip: "会说「不要」是件好事，说明宝宝找到了比哭更省力的表达方式。" },
    { id: "s2-l6", dim: "language", title: "唱儿歌时留白，让宝宝接词", tip: "熟悉的歌留最后一个字，是引出主动开口最容易成功的方式。" },
    { id: "s2-s1", dim: "social", title: "模仿做家务，假装扫地、擦桌子", tip: "模仿日常动作是宝宝理解「大人在做什么」的方式，也是假装游戏的开始。" },
    { id: "s2-s2", dim: "social", title: "给娃娃喂饭、盖被子", tip: "把自己被照顾的经验用到玩具身上，是共情能力最早的样子。" },
    { id: "s2-s3", dim: "social", title: "和同龄小朋友并排各玩各的", tip: "平行游戏是这个年纪正常的社交形态，不用催他们一起玩。" },
    { id: "s2-s4", dim: "social", title: "引导轮流和分享，但不强迫", tip: "这个阶段还没有真正的物权观念，强迫分享容易适得其反。" },
    { id: "s2-s5", dim: "social", title: "升级版躲猫猫，让宝宝主动藏", tip: "从被找到变成主动藏，需要想象对方看不看得见自己，视角转换开始萌芽。" },
    { id: "s2-s6", dim: "social", title: "用拥抱和亲亲玩互动游戏", tip: "身体接触是这个年纪最直接的情感沟通，安全感就是这么攒出来的。" },
  ],
  milestones: [
    { id: "s2-k1", title: "能说出两个词组合的短语", hint: "比如「妈妈抱」「要喝水」。" },
    { id: "s2-k2", title: "能扶着栏杆自己上楼梯", hint: "双脚并拢一级一级上就算。" },
    { id: "s2-k3", title: "能按颜色或形状完成简单分类", hint: "把同色的放一堆就算。" },
    { id: "s2-k4", title: "出现简单的假装游戏行为", hint: "拿积木当电话、喂娃娃吃饭都算。" },
  ],
};

export const STAGES: Stage[] = [STAGE_ONE, STAGE_TWO];

/** Below 12 months we show the first stage as a preview; past 24 we hold on the second. */
export function stageForMonths(months: number): Stage {
  if (months < 19) return STAGE_ONE;
  return STAGE_TWO;
}

export const NEXT_STAGE_NOTE = "25-36 月龄的 Q5-Q8 内容还在制作中，先用 Q3-Q4 的任务过渡。";

/**
 * Today's task. Rotating strictly through the four dimensions means a week
 * never lands on the same area twice in a row, and keying off the date makes
 * it stable: reopening the app does not reroll the task.
 */
export function taskForDay(stage: Stage, dayIndex: number): Task {
  const dim = DIMENSIONS[dayIndex % DIMENSIONS.length]!.id;
  const pool = stage.tasks.filter((t) => t.dim === dim);
  const round = Math.floor(dayIndex / DIMENSIONS.length);
  return pool[round % pool.length]!;
}

/** How many tasks a day offers. Doing any one of them counts as showing up. */
export const DAILY_COUNT = 3;

/**
 * Today's shortlist: three tasks from three different dimensions. The offer is
 * three so there is something to choose from on an off day, not so that a
 * parent owes three — the streak only asks for one.
 */
export function tasksForDay(stage: Stage, dayIndex: number): Task[] {
  const out: Task[] = [];
  for (let i = 0; i < DAILY_COUNT; i++) out.push(taskForDay(stage, dayIndex + i));
  return out;
}

export function dayIndexOf(date = new Date()) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local.getTime() / 86400000);
}

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}
