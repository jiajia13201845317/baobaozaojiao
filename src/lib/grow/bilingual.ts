/**
 * 英文启蒙 — an optional sub-track of the 语言 dimension, not a module of its
 * own. It rides on the same four stages as the Chinese content, and nothing in
 * the app ever waits on it: a family that skips English entirely loses nothing.
 *
 * The milestones here count 曝光量 — how much the child has been around English
 * — and are written as things the family did, never as something the child can
 * now do. There is nothing to reach here, only something to remember doing.
 */

import type { Milestone } from "./tasks";

export type EnTask = {
  id: string;
  title: string;
  /** The English line the parent says out loud, when there is one. */
  say?: string;
  tip: string;
};

export type EnStageContent = {
  stageId: string;
  focus: string;
  tasks: EnTask[];
  milestones: Milestone[];
};

export const EN_CONTENT: EnStageContent[] = [
  {
    stageId: "q1q2",
    focus: "先当背景音听着，让耳朵熟悉英语的声音",
    tasks: [
      { id: "en-q1-1", title: "吃饭或收玩具时，放一首英文儿歌当背景", tip: "这个阶段不用要求听懂，耳朵先熟悉英语的节奏和语调就够了。" },
      { id: "en-q1-2", title: "洗手的时候说一句英文", say: "Wash your hands.", tip: "固定场景里反复出现的同一句话最容易被听懂，因为场景本身就在解释意思。" },
      { id: "en-q1-3", title: "指着身体部位说英文", say: "This is your nose.", tip: "身体部位随身带着，说的时候手指一指，意思就传过去了。" },
      { id: "en-q1-4", title: "拿两块不同颜色的积木，说出英文颜色", say: "Red. Blue.", tip: "只说单词、不翻译，宝宝会自己把听到的声音和看到的颜色对上。" },
      { id: "en-q1-5", title: "翻动物绘本，用英文说动物的名字", say: "Dog. Cat.", tip: "动物词音节短、图又好认，是最容易入耳的一类英文词。" },
      { id: "en-q1-6", title: "睡前放同一首英文摇篮曲", tip: "反复听同一首，比每天换新的更能让宝宝记住里面的声音。" },
    ],
    milestones: [
      { id: "en-q1-k1", title: "这个季度听过 5 首以上英文儿歌", hint: "记的是家里放过多少，不是宝宝会唱多少。" },
      { id: "en-q1-k2", title: "在固定场景里说过英文句子", hint: "洗手、睡觉时说过一句就记一次，这一栏只记接触的量。" },
      { id: "en-q1-k3", title: "用英文说过颜色、动物或身体部位的词", hint: "你说过就算，宝宝有没有跟着说都不影响。" },
    ],
  },
  {
    stageId: "q3q4",
    focus: "用动作指令和拟声词接触英文，双语一起读绘本",
    tasks: [
      { id: "en-q3-1", title: "玩英文起立坐下的游戏", say: "Stand up. Sit down.", tip: "配上你自己的动作，宝宝看着做，比光听单词容易理解得多。" },
      { id: "en-q3-2", title: "说一句英文，一起拍手", say: "Clap your hands.", tip: "整个身体都动起来的时候，词和意思是绑在一起记住的。" },
      { id: "en-q3-3", title: "说一句英文，一起摸鼻子", say: "Touch your nose.", tip: "做得到就说明听懂了，这比让宝宝重复单词更接近真正的理解。" },
      { id: "en-q3-4", title: "用英文模仿动物叫声", say: "Moo. Woof. Quack.", tip: "拟声词在两种语言里都好模仿，常常是宝宝最早主动出声的一批英文。" },
      { id: "en-q3-5", title: "同一本绘本，先中文讲一遍，再挑几个词说英文", tip: "先懂了故事，英文词才有可以挂上去的意思。" },
      { id: "en-q3-6", title: "收完玩具说一句英文", say: "All done.", tip: "一天里固定出现的那几句话听的次数最多，也最先被听懂。" },
    ],
    milestones: [
      { id: "en-q3-k1", title: "这个季度玩过英文动作指令游戏", hint: "玩过几次都记，记的是做过，不是做对。" },
      { id: "en-q3-k2", title: "一起读过中英文对照的绘本", hint: "读过就记一次，这里记的是陪读的次数。" },
      { id: "en-q3-k3", title: "用英文模仿过动物叫声", hint: "你叫、宝宝听也算，这一栏只看接触过没有。" },
    ],
  },
  {
    stageId: "q5q6",
    focus: "跟着说英文短语，同一样东西中英各说一遍",
    tasks: [
      { id: "en-q5-1", title: "指着东西用英文问「这是什么」", say: "What's this?", tip: "宝宝本来就爱问这句，换成英文时意思是现成的，不用额外解释。" },
      { id: "en-q5-2", title: "吃到喜欢的东西时说一句英文", say: "I like it.", tip: "情绪最浓的时候说出来的句子，记得比平时牢。" },
      { id: "en-q5-3", title: "拿一个苹果，先说「苹果」，再说英文", say: "Apple.", tip: "同一样东西两个名字挨着说，宝宝会发现一样东西可以有两种叫法。" },
      { id: "en-q5-4", title: "玩找一找，用英文说要找的东西", say: "Where is the ball?", tip: "听一句话去做一件事，比让他重复单词更接近真正听懂。" },
      { id: "en-q5-5", title: "道谢和道别时说英文", say: "Thank you. Bye-bye.", tip: "这类话场景固定、每天都出现，常常是最早能主动说出口的英文。" },
      { id: "en-q5-6", title: "一起唱英文儿歌，留最后一个词让宝宝接", tip: "熟悉的歌留个空，是引出主动开口最省力的方式。" },
    ],
    milestones: [
      { id: "en-q5-k1", title: "这个季度跟着说过英文短语", hint: "说得含糊也记一次，记的是试过。" },
      { id: "en-q5-k2", title: "用中英文各说过同一样东西的名字", hint: "这一栏记的是这样对照过多少次。" },
      { id: "en-q5-k3", title: "在日常场景里用过英文", hint: "道谢、道别、吃饭时用过就记，不看说得怎么样。" },
    ],
  },
  {
    stageId: "q7q8",
    focus: "双语读同一幅图，用两三个词回答熟悉的问题",
    tasks: [
      { id: "en-q7-1", title: "读双语绘本，同一幅图用两种语言各说一遍", tip: "手指停在同一幅图上，两种说法就落在同一个意思上了。" },
      { id: "en-q7-2", title: "问一个熟悉的英文问题，等两三个词的回答", say: "What color is it?", tip: "熟悉的问题答案范围窄，宝宝更敢开口。" },
      { id: "en-q7-3", title: "问一句英文寒暄，接受任何回答", say: "How are you?", tip: "这类话不求准确，重要的是宝宝知道被问了就该回一句。" },
      { id: "en-q7-4", title: "把今天吃过的东西用英文说一遍", say: "Rice. Egg. Milk.", tip: "从自己的生活里挑词，比从书上挑更容易记住。" },
      { id: "en-q7-5", title: "一起用英文数到三", say: "One, two, three.", tip: "数数有固定顺序，顺序本身就在帮宝宝记住这几个词。" },
      { id: "en-q7-6", title: "指着绘本用英文问东西在哪", say: "Where is the dog?", tip: "用手指回答就够了，听懂总是走在会说前面。" },
    ],
    milestones: [
      { id: "en-q7-k1", title: "这个季度读过双语绘本，同一幅图两种语言都说过", hint: "读过几次就记几次。" },
      { id: "en-q7-k2", title: "回答过熟悉的英文问题", hint: "点头、指一指、说一个词都算，记的是对话发生过。" },
      { id: "en-q7-k3", title: "把生活里的东西用英文说过名字", hint: "这一栏记的是接触的量，不是会了多少。" },
    ],
  },
];

export function enContentFor(stageId: string): EnStageContent | null {
  return EN_CONTENT.find((c) => c.stageId === stageId) ?? null;
}
