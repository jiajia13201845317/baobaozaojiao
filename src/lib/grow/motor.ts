/**
 * 大运动发展参考区间 (plan 4.6).
 *
 * The ranges here are wide on purpose. Chapter 4 asks for something a parent
 * can hold up next to their own child and recognise, and the honest shape of
 * that is a span of many months: between two children the same age, one is
 * still cruising the sofa while the other is running down the hallway, and
 * both of those are ordinary. A narrow range would read as a deadline, which
 * is the one thing this screen is not allowed to be.
 *
 * So every entry carries a range and a description of the movement, and there
 * is nowhere to record a pass, a tick or a score. `motorRefsFor` sorts the
 * list around the child's age only so the screen can put what is happening
 * now at the top; an item sitting in `earlier` means the window has gone by,
 * never that anything was missed. What to make of it is the 儿保医生's job.
 */

export type MotorRef = {
  id: string;
  /** What the parent might see. */
  what: string;
  /** The month range over which this commonly first appears. */
  fromMonth: number;
  toMonth: number;
  hint: string;
};

export const MOTOR_REFS: MotorRef[] = [
  {
    id: "pull-to-stand",
    what: "拉着东西把自己撑起来站着",
    fromMonth: 9,
    toMonth: 14,
    hint: "手里先抓住茶几边或者沙发，膝盖一使劲，屁股就离了地。",
  },
  {
    id: "cruise",
    what: "扶着家具横着挪步",
    fromMonth: 9,
    toMonth: 15,
    hint: "一只手不撒开，沿着沙发或墙一点点横着走，脚步还跟得很近。",
  },
  {
    id: "stand-alone",
    what: "松开手自己站一会儿",
    fromMonth: 10,
    toMonth: 16,
    hint: "两只手都腾出来了，身子晃一晃又找回平衡，站住几秒钟。",
  },
  {
    id: "first-steps",
    what: "自己迈出几步",
    fromMonth: 11,
    toMonth: 18,
    hint: "从一个人怀里走到另一个人怀里，走几步再扑过去，这几步常常是最早的。",
  },
  {
    id: "squat-stand",
    what: "蹲下去捡东西，再自己站起来",
    fromMonth: 12,
    toMonth: 20,
    hint: "不用扶人也不用扶墙，蹲下、拿到手里、再直起身，整个过程连着做完。",
  },
  {
    id: "stairs-hand",
    what: "牵着一只手上台阶",
    fromMonth: 14,
    toMonth: 24,
    hint: "两只脚常常先踩到同一级，再一起上下一级，手上的这点牵着就够了。",
  },
  {
    id: "run",
    what: "走着走着小跑起来",
    fromMonth: 14,
    toMonth: 26,
    hint: "步子变快、身子往前倾，停下来的时候往往还要缓两步。",
  },
  {
    id: "throw-ball",
    what: "举起手把球扔出去",
    fromMonth: 15,
    toMonth: 26,
    hint: "站着不动，手从头顶或胸前把球推出去，方向常常是随机的。",
  },
  {
    id: "kick-ball",
    what: "站稳了把球踢出去",
    fromMonth: 16,
    toMonth: 28,
    hint: "一只脚站住，另一只脚往前碰球，有时是走上去撞一下，也算在里面。",
  },
  {
    id: "walk-backward",
    what: "倒着往后走几步",
    fromMonth: 18,
    toMonth: 30,
    hint: "常常是拉着玩具往后退时出现的，眼睛看不到路，全靠脚底试。",
  },
  {
    id: "jump-two-feet",
    what: "两只脚一起跳离地面",
    fromMonth: 20,
    toMonth: 32,
    hint: "先是屈膝上下颠，后来两只脚同时离地一小下，落地时多半还要扶一把。",
  },
  {
    id: "jump-down",
    what: "从最矮的一级台阶上跳下来",
    fromMonth: 24,
    toMonth: 36,
    hint: "站在边上犹豫一下，两只脚一起往下跳，落地时腿会弯一下缓冲。",
  },
  {
    id: "stairs-alternate",
    what: "上楼梯时两只脚交替着踩",
    fromMonth: 26,
    toMonth: 36,
    hint: "不再一级一级并脚，左右脚轮着上，下楼梯通常比上楼梯晚一些。",
  },
  {
    id: "one-foot",
    what: "单脚站一两秒",
    fromMonth: 28,
    toMonth: 36,
    hint: "一只脚抬起来，两只手张开找平衡，能停住一两秒就放下。",
  },
  {
    id: "trike",
    what: "蹬着三轮车往前走",
    fromMonth: 28,
    toMonth: 36,
    hint: "两只脚轮着踩踏板，还要腾出注意力去转车把，刚开始更爱用脚在地上划。",
  },
];

/**
 * Split around the child's age. A range that spans today goes in `arriving`,
 * which is what the screen shows first; the rest is kept visible so a parent
 * can read forwards and backwards without the app deciding for them which
 * half matters.
 */
export function motorRefsFor(months: number): {
  arriving: MotorRef[];
  earlier: MotorRef[];
  later: MotorRef[];
} {
  return {
    arriving: MOTOR_REFS.filter((r) => months >= r.fromMonth && months <= r.toMonth),
    earlier: MOTOR_REFS.filter((r) => months > r.toMonth),
    later: MOTOR_REFS.filter((r) => months < r.fromMonth),
  };
}

/** 4.6 的落脚处：这一页是给家长自己看的参考，不是一条线。 */
export const MOTOR_NOTE =
  "上面的月龄区间是参考信息，供你对着自己的孩子看，不是一份要去完成的清单。这个年龄段孩子之间的差别本来就很大，同一件事早几个月、晚几个月出现都很常见。如果有一项很久都没有见到，下次儿保的时候和儿保医生提一句就好，这里只负责把你看到的记下来。";
