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

const STAGE_THREE: Stage = {
  id: "q5q6",
  quarters: "Q5-Q6",
  name: "跑跳，爱问",
  fromMonth: 25,
  toMonth: 30,
  overview: [
    "两岁之后，跑和爬都比之前有章法了：能自己停下来，能绕开挡路的东西，也敢从矮台阶上跳下来。说话从两个词变成三四个词一句，「我要那个红色的」会越来越多。",
    "这半年最容易让人嫌烦的是问个不停的「这是什么」。问题其实是宝宝在给新词找位置，答一句就答一句，答不上来说「妈妈也不知道」也完全可以。",
    "开始说「我」和「你」，也开始对什么都有自己的主张，说「不」的次数明显变多。这不是在跟你对着干，是他发现了自己是个独立的人。任务照旧是灵感，挑一个做到，今天就算做过了。",
  ],
  focus: [
    { dim: "motor", text: "跑跳自控、蹬车" },
    { dim: "fine", text: "画封闭图形、用勺叉" },
    { dim: "language", text: "三四词句、爱提问" },
    { dim: "social", text: "短暂合作、自我主张" },
  ],
  tasks: [
    { id: "s3-m1", dim: "motor", title: "在家里跑一小段，听到「停」就停住", tip: "急停比起跑难，要在半秒内把冲出去的力气收回来，练的是身体的刹车能力。" },
    { id: "s3-m2", dim: "motor", title: "从 20 厘米左右的矮台阶上双脚跳下来", tip: "落地时膝盖会自然弯一下缓冲，这是身体在学着接住自己。下面垫软一点，先牵着手跳。" },
    { id: "s3-m3", dim: "motor", title: "坐上扭扭车或滑步车，用脚蹬着走", tip: "两条腿交替往后推，是以后蹬三轮车的前置动作。" },
    { id: "s3-m4", dim: "motor", title: "在地上贴一条胶带，沿着线走过去", tip: "沿线走要眼睛看着前方，同时不停微调落脚的位置，是平衡的精细版。" },
    { id: "s3-m5", dim: "motor", title: "抱着一个大球走一段路", tip: "两只手被占住，只能靠腰腹找平衡，核心力量就是这么攒出来的。" },
    { id: "s3-m6", dim: "motor", title: "钻过椅子搭的矮洞，再爬上沙发", tip: "钻和爬都要不断判断身体和空间的关系，这份判断力在快摔倒时最管用。" },
    { id: "s3-f1", dim: "fine", title: "用蜡笔画一个圈", tip: "画圈要让线条绕回起点，手腕得转一整圈，比画直线难得多。" },
    { id: "s3-f2", dim: "fine", title: "自己用勺子吃完一小碗饭", tip: "从碗到嘴的这一路，手腕要一直保持平，洒出来是过程的一部分，不用急着接手。" },
    { id: "s3-f3", dim: "fine", title: "用叉子把水果块插起来吃", tip: "插要先瞄准再用力，是手眼配合最直接的练习。水果切成能一口吃下的小块。" },
    { id: "s3-f4", dim: "fine", title: "把积木叠到 6 块以上，或者横着排成一列火车", tip: "从往上叠到往前排，说明宝宝开始按自己的想法安排东西，而不只是重复动作。" },
    { id: "s3-f5", dim: "fine", title: "撕一张纸，再贴到另一张纸上", tip: "撕和贴用的是两套不同的手部动作，中间还要想贴在哪，一个游戏练三件事。用安全无毒的纸和胶棒。" },
    { id: "s3-f6", dim: "fine", title: "拧开再拧上瓶盖", tip: "拧是手腕的旋转，和抓握完全不同，以后开门、开水杯都靠这个动作。选大一点的盖子，全程看护，防误吞。" },
    { id: "s3-l1", dim: "language", title: "把宝宝的短语接成三四个词的句子", tip: "他说「要苹果」，你说「你要吃苹果」，他听到的就是一句完整的话该长什么样。" },
    { id: "s3-l2", dim: "language", title: "认真回答一次「这是什么」", tip: "提问的时候是宝宝主动要词，这时候给的词记得最牢。" },
    { id: "s3-l3", dim: "language", title: "分东西时说清「我的」「你的」", tip: "我和你会跟着说话的人换位置，是最绕的一类词，只能靠反复听才理得清。" },
    { id: "s3-l4", dim: "language", title: "读绘本时问「他在干什么」", tip: "回答动作要用上动词，比指认东西的名字又往前走了一步。" },
    { id: "s3-l5", dim: "language", title: "说一件刚发生的小事，让宝宝补几个词", tip: "讲刚刚的事得从记忆里取材料，这是以后讲故事的雏形。" },
    { id: "s3-l6", dim: "language", title: "问「你叫什么名字」「你几岁了」", tip: "回答关于自己的问题，得先知道被问的那个人就是「我」。" },
    { id: "s3-s1", dim: "social", title: "一起搭一座塔，你放一块他放一块", tip: "轮着放是合作最简单的形式，比让两个小孩共用一个玩具容易成功得多。" },
    { id: "s3-s2", dim: "social", title: "给两个都行的选择，让宝宝自己挑", tip: "「穿红的还是蓝的」把主动权分出去一点，对着干的次数会少一些。" },
    { id: "s3-s3", dim: "social", title: "玩过家家，各领一个角色", tip: "扮角色要暂时当另一个人，这是理解别人怎么想的开始。" },
    { id: "s3-s4", dim: "social", title: "闹脾气时先说感受，再说规则", tip: "「你很想要那个，可是现在要回家了」——情绪先被说中，话才听得进去。" },
    { id: "s3-s5", dim: "social", title: "一起收玩具，给他固定的一小份", tip: "「小车都归你放」这样明确的一小块，比一句「快收拾」好执行太多。" },
    { id: "s3-s6", dim: "social", title: "约一个小朋友，一起玩同一盆水或同一堆积木", tip: "同一堆材料能让各玩各的两个小孩自然有交集，几分钟的合作就够了。" },
  ],
  milestones: [
    { id: "s3-k1", title: "能说出三四个词组成的句子", hint: "「我要喝那个水」这样就算。" },
    { id: "s3-k2", title: "能从矮台阶上双脚跳下来", hint: "20 厘米左右的高度，牵着手也算。" },
    { id: "s3-k3", title: "能画出一个闭合的圈", hint: "歪的、线头重叠的都算。" },
    { id: "s3-k4", title: "开始用「我」称呼自己", hint: "说「我要」「我的」都算。" },
  ],
};

const STAGE_FOUR: Stage = {
  id: "q7q8",
  quarters: "Q7-Q8",
  name: "讲事，轮流",
  fromMonth: 31,
  toMonth: 36,
  overview: [
    "快三岁这半年，上下楼梯能一步一级地交替迈脚，单脚站能撑住一两秒，三轮车也蹬得动了。手上的活也细了：能穿珠子，能照着画个圆。",
    "语言上最明显的变化是能讲事了。从外面回来，能用几句话把刚才发生的说一遍。顺序颠倒、漏掉人物都很常见，先让他说完，再顺着问一句。",
    "开始出现真正的一起玩——分角色、轮流、等一等。愿意等的时间还很短，抢起来是常态，能自己说出「我生气了」已经是很大的一步。做熟的那几个任务重复做，比一直换新的更有用。",
  ],
  focus: [
    { dim: "motor", text: "交替上楼、单脚站" },
    { dim: "fine", text: "穿线、剪纸、临摹圆" },
    { dim: "language", text: "完整句、讲一件事" },
    { dim: "social", text: "轮流合作、说出情绪" },
  ],
  tasks: [
    { id: "s4-m1", dim: "motor", title: "扶着栏杆交替迈脚上楼梯", tip: "一步一级要求单腿短暂撑住全身重量，是这半年最明显的一次平衡升级。" },
    { id: "s4-m2", dim: "motor", title: "单脚站着数到三", tip: "扶着墙也算。单脚站是把重心挪到一条腿上再稳住，快摔倒时靠的就是这个。" },
    { id: "s4-m3", dim: "motor", title: "蹬三轮车往前走几米", tip: "蹬车要两条腿一推一收连续交替，发力方式和走路完全不同，多数孩子要练一阵。" },
    { id: "s4-m4", dim: "motor", title: "踮着脚走几步，再用脚跟走几步", tip: "换着用脚的不同部位，能让脚踝周围那些小肌肉都动起来。" },
    { id: "s4-m5", dim: "motor", title: "把球扔进一个纸箱里", tip: "扔准要先估距离，再决定用多大力气，比单纯扔远多了一层判断。" },
    { id: "s4-m6", dim: "motor", title: "玩木头人，跑着突然不动", tip: "停住不动比动起来更费劲，练的是让身体听大脑的指挥。" },
    { id: "s4-f1", dim: "fine", title: "用安全剪刀剪开一条纸", tip: "剪要一只手开合、一只手送纸，两只手做的事完全不同。用圆头儿童安全剪刀，全程手把手，用完立刻收起来。" },
    { id: "s4-f2", dim: "fine", title: "照着你画的圆，画一个圆", tip: "临摹比随手画难，得先看清样子，再让手照着走。" },
    { id: "s4-f3", dim: "fine", title: "用粗线穿珠子，串成一条", tip: "穿线要瞄准小孔还得稳住手，是精细动作里少有的需要耐心的活。珠子选大颗的，全程看护，防误吞。" },
    { id: "s4-f4", dim: "fine", title: "玩 4 到 6 片的拼图", tip: "片数一多就得靠试错和比对边缘，宝宝在这过程里学着换办法。" },
    { id: "s4-f5", dim: "fine", title: "照着画一条横线和一条竖线", tip: "有方向的线条要在落笔前就想好往哪走，这是握笔写字的第一步。" },
    { id: "s4-f6", dim: "fine", title: "把袜子按双配对", tip: "配对要同时比颜色和大小两个属性，比只看一个属性的分类难一点。" },
    { id: "s4-l1", dim: "language", title: "问「今天做了什么」，听他讲完", tip: "顺序乱、漏人物都不要紧，能把几件事串起来说，就是在练叙述。" },
    { id: "s4-l2", dim: "language", title: "给一个三步指令", tip: "「把书拿过来，放沙发上，再去洗手」，需要在心里记住三件事和它们的顺序。" },
    { id: "s4-l3", dim: "language", title: "读完绘本问「后来怎么了」", tip: "回忆情节要把整本书在脑子里过一遍，比当场指认难得多。" },
    { id: "s4-l4", dim: "language", title: "玩你问我答，让宝宝来提问", tip: "会提问说明他知道对方知道自己不知道的事，这一步比回答更难。" },
    { id: "s4-l5", dim: "language", title: "一起编一个很短的故事", tip: "编故事可以随便乱说，重要的是宝宝发现语言能造出眼前没有的东西。" },
    { id: "s4-l6", dim: "language", title: "睡前用三句话说说今天", tip: "固定的回顾时间，能帮宝宝把昨天、今天、明天慢慢分开。" },
    { id: "s4-s1", dim: "social", title: "玩一个需要轮流的简单游戏", tip: "等对方的那几秒是最难的部分，输赢先不重要。" },
    { id: "s4-s2", dim: "social", title: "帮宝宝给情绪起个名字", tip: "「这是着急」「这是失望」——能说出来的感受，就不用全靠哭来表达。" },
    { id: "s4-s3", dim: "social", title: "和小朋友一起搭一个大的东西", tip: "有了共同目标，合作才有意义，比笼统地说「一起玩」具体得多。" },
    { id: "s4-s4", dim: "social", title: "一起做一件真的家务", tip: "递碗、擦桌子这种真活儿，攒的是「我在家里派得上用场」的感觉。" },
    { id: "s4-s5", dim: "social", title: "读一本讲情绪的绘本，聊聊里面的人", tip: "说别人的心情比说自己的容易开口，也是在练着站到对方的位置上想。" },
    { id: "s4-s6", dim: "social", title: "定一条简单的规矩，一起遵守", tip: "「玩完的玩具放回箱子」这类做得到的规矩，比一长串要求有用。" },
  ],
  milestones: [
    { id: "s4-k1", title: "能交替迈脚上楼梯", hint: "扶着栏杆或牵着手也算。" },
    { id: "s4-k2", title: "能用完整的句子讲一件事", hint: "两三句连起来说清刚发生的事就算。" },
    { id: "s4-k3", title: "能照着画出一个圆", hint: "线条歪一点、闭合得不好都算。" },
    { id: "s4-k4", title: "能和小朋友轮流玩一会儿", hint: "一次坚持几分钟就算。" },
  ],
};

export const STAGES: Stage[] = [STAGE_ONE, STAGE_TWO, STAGE_THREE, STAGE_FOUR];

/** Below 12 months we show the first stage as a preview; past 36 we hold on the fourth. */
export function stageForMonths(months: number): Stage {
  if (months < 19) return STAGE_ONE;
  if (months <= 24) return STAGE_TWO;
  if (months <= 30) return STAGE_THREE;
  return STAGE_FOUR;
}

export const NEXT_STAGE_NOTE = "分龄早教内容陪到 3 岁就齐了，之后记录、身高体重这些都照常用，没有需要补的任务。";

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
