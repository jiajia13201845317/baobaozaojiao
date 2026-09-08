export type CategoryId = "zh-songs" | "en-songs" | "animals" | "stories";

export type Note = {
  n: string;
  d: number;
};

export type Song = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  accent: string;
  lyrics: string[];
  lyricLang: "zh-CN" | "en-US";
  melody: Note[];
};

export type Animal = {
  id: string;
  zh: string;
  en: string;
  emoji: string;
  color: string;
  accent: string;
  sound: AnimalSoundId;
  zhLine: string;
  enLine: string;
};

export type AnimalSoundId =
  | "cat"
  | "dog"
  | "chick"
  | "duck"
  | "cow"
  | "sheep"
  | "pig"
  | "bird"
  | "frog"
  | "horse"
  | "lion"
  | "elephant";

export type Story = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  accent: string;
  lines: string[];
};

export const categories: {
  id: CategoryId;
  title: string;
  hint: string;
  english: string;
  emoji: string;
  tint: string;
  deep: string;
  shadow: string;
}[] = [
  {
    id: "zh-songs",
    title: "中文儿歌",
    hint: "小兔子乖乖",
    english: "Chinese Songs",
    emoji: "🐰",
    tint: "#FFD4C2",
    deep: "#E56B4A",
    shadow: "#C24F33",
  },
  {
    id: "en-songs",
    title: "英文儿歌",
    hint: "Twinkle Star",
    english: "English Songs",
    emoji: "🌟",
    tint: "#C8E8F8",
    deep: "#3E9ED0",
    shadow: "#2B7EAA",
  },
  {
    id: "animals",
    title: "动物叫声",
    hint: "中英双语",
    english: "Animal Sounds",
    emoji: "🐶",
    tint: "#D4F0C8",
    deep: "#5AAA4A",
    shadow: "#3E8834",
  },
  {
    id: "stories",
    title: "寓言故事",
    hint: "慢慢讲给你听",
    english: "Fables",
    emoji: "📖",
    tint: "#E8D6FF",
    deep: "#8B6CC9",
    shadow: "#6B4FA6",
  },
];

const C = (n: string, d = 1): Note => ({ n, d });

export const zhSongs: Song[] = [
  {
    id: "bunny",
    title: "小兔子乖乖",
    subtitle: "把门开开",
    emoji: "🐰",
    color: "#FFE0D4",
    accent: "#E56B4A",
    lyricLang: "zh-CN",
    lyrics: [
      "小兔子乖乖，把门开开。",
      "快点儿开开，我要进来。",
      "不开不开，我不开。",
      "妈妈没回来，谁来也不开。",
    ],
    melody: [
      C("G4", 1), C("G4", 1), C("A4", 1), C("G4", 1),
      C("E4", 1), C("E4", 1), C("D4", 1), C("C4", 2),
      C("E4", 1), C("E4", 1), C("F4", 1), C("E4", 1),
      C("D4", 1), C("C4", 1), C("C4", 2),
    ],
  },
  {
    id: "tigers",
    title: "两只老虎",
    subtitle: "跑得快",
    emoji: "🐯",
    color: "#FFE7C2",
    accent: "#E0892C",
    lyricLang: "zh-CN",
    lyrics: [
      "两只老虎，两只老虎。",
      "跑得快，跑得快。",
      "一只没有眼睛，一只没有尾巴。",
      "真奇怪，真奇怪。",
    ],
    melody: [
      C("C4"), C("D4"), C("E4"), C("C4"),
      C("C4"), C("D4"), C("E4"), C("C4"),
      C("E4"), C("F4"), C("G4", 2),
      C("E4"), C("F4"), C("G4", 2),
      C("G4", 0.5), C("A4", 0.5), C("G4", 0.5), C("F4", 0.5), C("E4"), C("C4"),
      C("G4", 0.5), C("A4", 0.5), C("G4", 0.5), C("F4", 0.5), C("E4"), C("C4"),
      C("C4"), C("G3"), C("C4", 2),
      C("C4"), C("G3"), C("C4", 2),
    ],
  },
  {
    id: "stars-zh",
    title: "小星星",
    subtitle: "一闪一闪亮晶晶",
    emoji: "⭐",
    color: "#FFF3B0",
    accent: "#D4A017",
    lyricLang: "zh-CN",
    lyrics: [
      "一闪一闪亮晶晶，满天都是小星星。",
      "挂在天上放光明，好像许多小眼睛。",
      "一闪一闪亮晶晶，满天都是小星星。",
    ],
    melody: [
      C("C4"), C("C4"), C("G4"), C("G4"), C("A4"), C("A4"), C("G4", 2),
      C("F4"), C("F4"), C("E4"), C("E4"), C("D4"), C("D4"), C("C4", 2),
      C("G4"), C("G4"), C("F4"), C("F4"), C("E4"), C("E4"), C("D4", 2),
      C("G4"), C("G4"), C("F4"), C("F4"), C("E4"), C("E4"), C("D4", 2),
      C("C4"), C("C4"), C("G4"), C("G4"), C("A4"), C("A4"), C("G4", 2),
      C("F4"), C("F4"), C("E4"), C("E4"), C("D4"), C("D4"), C("C4", 2),
    ],
  },
  {
    id: "ducks",
    title: "数鸭子",
    subtitle: "门前大桥下",
    emoji: "🦆",
    color: "#D9F0C8",
    accent: "#5AAA4A",
    lyricLang: "zh-CN",
    lyrics: [
      "门前大桥下，游过一群鸭。",
      "快来快来数一数，二四六七八。",
      "嘎嘎嘎嘎，真呀真多呀。",
      "数不清到底多少鸭。",
    ],
    melody: [
      C("G4"), C("E4"), C("G4"), C("E4", 2),
      C("A4"), C("G4"), C("E4"), C("D4", 2),
      C("C4"), C("D4"), C("E4"), C("G4"),
      C("A4"), C("G4"), C("E4", 2),
      C("G4"), C("G4"), C("E4"), C("C4"),
      C("D4"), C("E4"), C("C4", 2),
    ],
  },
  {
    id: "radish",
    title: "拔萝卜",
    subtitle: "嘿哟嘿哟",
    emoji: "🥕",
    color: "#FFD8B8",
    accent: "#E07030",
    lyricLang: "zh-CN",
    lyrics: [
      "拔萝卜，拔萝卜，嘿哟嘿哟拔萝卜。",
      "嘿哟嘿哟拔不动。",
      "老公公，快快来，快来帮我们拔萝卜。",
    ],
    melody: [
      C("G4"), C("E4"), C("G4", 2),
      C("G4"), C("E4"), C("G4", 2),
      C("A4"), C("G4"), C("E4"), C("D4"),
      C("C4"), C("D4"), C("E4", 2),
      C("G4"), C("E4"), C("C4", 2),
    ],
  },
  {
    id: "friends",
    title: "找朋友",
    subtitle: "找到一个好朋友",
    emoji: "🤝",
    color: "#F8D0E4",
    accent: "#D45A8A",
    lyricLang: "zh-CN",
    lyrics: [
      "找呀找呀找朋友，找到一个好朋友。",
      "敬个礼呀握握手，你是我的好朋友。",
      "再见！",
    ],
    melody: [
      C("C4"), C("C4"), C("E4"), C("G4"),
      C("C4"), C("C4"), C("E4"), C("G4"),
      C("A4"), C("A4"), C("G4", 2),
      C("F4"), C("F4"), C("E4"), C("E4"),
      C("D4"), C("D4"), C("C4", 2),
    ],
  },
];

export const enSongs: Song[] = [
  {
    id: "twinkle",
    title: "Twinkle Twinkle",
    subtitle: "小星星",
    emoji: "✨",
    color: "#E8F0FF",
    accent: "#4A7FD4",
    lyricLang: "en-US",
    lyrics: [
      "Twinkle, twinkle, little star.",
      "How I wonder what you are.",
      "Up above the world so high.",
      "Like a diamond in the sky.",
      "Twinkle, twinkle, little star.",
      "How I wonder what you are.",
    ],
    melody: [
      C("C4"), C("C4"), C("G4"), C("G4"), C("A4"), C("A4"), C("G4", 2),
      C("F4"), C("F4"), C("E4"), C("E4"), C("D4"), C("D4"), C("C4", 2),
      C("G4"), C("G4"), C("F4"), C("F4"), C("E4"), C("E4"), C("D4", 2),
      C("G4"), C("G4"), C("F4"), C("F4"), C("E4"), C("E4"), C("D4", 2),
      C("C4"), C("C4"), C("G4"), C("G4"), C("A4"), C("A4"), C("G4", 2),
      C("F4"), C("F4"), C("E4"), C("E4"), C("D4"), C("D4"), C("C4", 2),
    ],
  },
  {
    id: "abc",
    title: "ABC Song",
    subtitle: "字母歌",
    emoji: "🔤",
    color: "#D4F4F0",
    accent: "#2A9B8F",
    lyricLang: "en-US",
    lyrics: [
      "A B C D E F G.",
      "H I J K L M N O P.",
      "Q R S, T U V.",
      "W X Y and Z.",
      "Now I know my A B Cs.",
      "Next time won't you sing with me.",
    ],
    melody: [
      C("C4"), C("C4"), C("G4"), C("G4"), C("A4"), C("A4"), C("G4", 2),
      C("F4"), C("F4"), C("E4"), C("E4"), C("D4"), C("D4"), C("C4", 2),
      C("G4"), C("G4"), C("F4"), C("F4"), C("E4"), C("E4"), C("D4", 2),
      C("G4"), C("G4"), C("F4"), C("F4"), C("E4"), C("E4"), C("D4", 2),
      C("C4"), C("C4"), C("G4"), C("G4"), C("A4"), C("A4"), C("G4", 2),
      C("F4"), C("F4"), C("E4"), C("E4"), C("D4"), C("D4"), C("C4", 2),
    ],
  },
  {
    id: "macdonald",
    title: "Old MacDonald",
    subtitle: "老麦克唐纳",
    emoji: "👨‍🌾",
    color: "#E8F6C8",
    accent: "#6A9A2A",
    lyricLang: "en-US",
    lyrics: [
      "Old MacDonald had a farm, E I E I O.",
      "And on that farm he had a cow, E I E I O.",
      "With a moo moo here, and a moo moo there.",
      "Here a moo, there a moo, everywhere a moo moo.",
      "Old MacDonald had a farm, E I E I O.",
    ],
    melody: [
      C("G4"), C("G4"), C("G4"), C("D4"), C("E4"), C("E4"), C("D4", 2),
      C("B4"), C("B4"), C("A4"), C("A4"), C("G4", 2), C("rest", 0.5),
      C("D4"), C("G4"), C("G4"), C("G4"), C("D4"), C("E4"), C("E4"), C("D4", 2),
    ],
  },
  {
    id: "spider",
    title: "Itsy Bitsy Spider",
    subtitle: "小小蜘蛛",
    emoji: "🕷️",
    color: "#E6E0FF",
    accent: "#6B5BB5",
    lyricLang: "en-US",
    lyrics: [
      "The itsy bitsy spider climbed up the water spout.",
      "Down came the rain and washed the spider out.",
      "Out came the sun and dried up all the rain.",
      "And the itsy bitsy spider climbed up the spout again.",
    ],
    melody: [
      C("C4"), C("C4"), C("C4"), C("D4"), C("E4", 2),
      C("E4"), C("D4"), C("E4"), C("F4"), C("G4", 2),
      C("C5"), C("C5"), C("G4"), C("G4"), C("E4"), C("E4"), C("C4", 2),
      C("G4"), C("F4"), C("E4"), C("D4"), C("C4", 2),
    ],
  },
  {
    id: "lamb",
    title: "Mary Had a Little Lamb",
    subtitle: "玛丽有只小羊羔",
    emoji: "🐑",
    color: "#F4F0E8",
    accent: "#8A7A6A",
    lyricLang: "en-US",
    lyrics: [
      "Mary had a little lamb, little lamb, little lamb.",
      "Mary had a little lamb, its fleece was white as snow.",
      "And everywhere that Mary went, Mary went, Mary went.",
      "Everywhere that Mary went, the lamb was sure to go.",
    ],
    melody: [
      C("E4"), C("D4"), C("C4"), C("D4"), C("E4"), C("E4"), C("E4", 2),
      C("D4"), C("D4"), C("D4", 2), C("E4"), C("G4"), C("G4", 2),
      C("E4"), C("D4"), C("C4"), C("D4"), C("E4"), C("E4"), C("E4"), C("E4"),
      C("D4"), C("D4"), C("E4"), C("D4"), C("C4", 3),
    ],
  },
  {
    id: "boat",
    title: "Row Row Row Your Boat",
    subtitle: "划船歌",
    emoji: "🚣",
    color: "#C8EEF8",
    accent: "#2A88B0",
    lyricLang: "en-US",
    lyrics: [
      "Row, row, row your boat.",
      "Gently down the stream.",
      "Merrily, merrily, merrily, merrily.",
      "Life is but a dream.",
    ],
    melody: [
      C("C4"), C("C4"), C("C4"), C("D4"), C("E4", 2),
      C("E4"), C("D4"), C("E4"), C("F4"), C("G4", 3),
      C("C5", 0.5), C("C5", 0.5), C("C5", 0.5), C("G4", 0.5), C("G4", 0.5), C("G4", 0.5),
      C("E4", 0.5), C("E4", 0.5), C("E4", 0.5), C("C4", 0.5), C("C4", 0.5), C("C4", 0.5),
      C("G4"), C("F4"), C("E4"), C("D4"), C("C4", 3),
    ],
  },
];

export const animals: Animal[] = [
  {
    id: "cat",
    zh: "小猫",
    en: "Cat",
    emoji: "🐱",
    color: "#FFE4C8",
    accent: "#E0892C",
    sound: "cat",
    zhLine: "小猫，喵喵。",
    enLine: "Cat. Meow.",
  },
  {
    id: "dog",
    zh: "小狗",
    en: "Dog",
    emoji: "🐶",
    color: "#F0D8C0",
    accent: "#B07840",
    sound: "dog",
    zhLine: "小狗，汪汪。",
    enLine: "Dog. Woof woof.",
  },
  {
    id: "chick",
    zh: "小鸡",
    en: "Chick",
    emoji: "🐥",
    color: "#FFF3B0",
    accent: "#D4A017",
    sound: "chick",
    zhLine: "小鸡，叽叽。",
    enLine: "Chick. Cheep cheep.",
  },
  {
    id: "duck",
    zh: "小鸭",
    en: "Duck",
    emoji: "🦆",
    color: "#D4F0C8",
    accent: "#5AAA4A",
    sound: "duck",
    zhLine: "小鸭子，嘎嘎。",
    enLine: "Duck. Quack quack.",
  },
  {
    id: "cow",
    zh: "奶牛",
    en: "Cow",
    emoji: "🐮",
    color: "#F0E8DC",
    accent: "#8A6A4A",
    sound: "cow",
    zhLine: "奶牛，哞哞。",
    enLine: "Cow. Moo.",
  },
  {
    id: "sheep",
    zh: "小羊",
    en: "Sheep",
    emoji: "🐑",
    color: "#F4F0E8",
    accent: "#8A7A6A",
    sound: "sheep",
    zhLine: "小羊，咩咩。",
    enLine: "Sheep. Baa baa.",
  },
  {
    id: "pig",
    zh: "小猪",
    en: "Pig",
    emoji: "🐷",
    color: "#FFD6E0",
    accent: "#E07090",
    sound: "pig",
    zhLine: "小猪，哼哼。",
    enLine: "Pig. Oink oink.",
  },
  {
    id: "bird",
    zh: "小鸟",
    en: "Bird",
    emoji: "🐦",
    color: "#C8EEF8",
    accent: "#2A88B0",
    sound: "bird",
    zhLine: "小鸟，啾啾。",
    enLine: "Bird. Tweet tweet.",
  },
  {
    id: "frog",
    zh: "青蛙",
    en: "Frog",
    emoji: "🐸",
    color: "#C8F0B8",
    accent: "#4A9A3A",
    sound: "frog",
    zhLine: "青蛙，呱呱。",
    enLine: "Frog. Ribbit.",
  },
  {
    id: "horse",
    zh: "小马",
    en: "Horse",
    emoji: "🐴",
    color: "#E8D4B8",
    accent: "#8A6030",
    sound: "horse",
    zhLine: "小马，嘶嘶。",
    enLine: "Horse. Neigh.",
  },
  {
    id: "lion",
    zh: "狮子",
    en: "Lion",
    emoji: "🦁",
    color: "#FFE7B0",
    accent: "#D49020",
    sound: "lion",
    zhLine: "狮子，吼——",
    enLine: "Lion. Roar.",
  },
  {
    id: "elephant",
    zh: "大象",
    en: "Elephant",
    emoji: "🐘",
    color: "#D8DCE8",
    accent: "#6A7088",
    sound: "elephant",
    zhLine: "大象，嗷——",
    enLine: "Elephant. Toot.",
  },
];

export const stories: Story[] = [
  {
    id: "crow",
    title: "乌鸦喝水",
    subtitle: "一颗一颗小石子",
    emoji: "🐦",
    color: "#D8E4F0",
    accent: "#4A6A8A",
    lines: [
      "小乌鸦口渴了，看见一个瓶子。",
      "瓶子里有水，嘴巴够不着。",
      "它衔来小石子，一颗，一颗，放进去。",
      "水慢慢升高了。",
      "小乌鸦喝到水啦。真聪明。",
    ],
  },
  {
    id: "race",
    title: "龟兔赛跑",
    subtitle: "慢慢走，不放弃",
    emoji: "🐢",
    color: "#D4F0C8",
    accent: "#4A8A3A",
    lines: [
      "小兔子跑得很快，小乌龟爬得很慢。",
      "它们赛跑啦。",
      "小兔子跑到前面，躺下睡觉。",
      "小乌龟一直爬，一直爬。",
      "小乌龟先到啦。",
      "慢慢走，不放弃，也能到。",
    ],
  },
  {
    id: "pigs",
    title: "三只小猪",
    subtitle: "结实的房子",
    emoji: "🐷",
    color: "#FFD6E0",
    accent: "#D45A7A",
    lines: [
      "三只小猪要盖房子。",
      "第一只用稻草，房子软软的。",
      "第二只用木头，房子晃晃的。",
      "第三只用砖头，房子结结实实。",
      "大风来了，砖头房子最安全。",
      "好好盖，才住得安稳。",
    ],
  },
  {
    id: "tadpole",
    title: "小蝌蚪找妈妈",
    subtitle: "圆圆的小脑瓜",
    emoji: "🐸",
    color: "#C8F0D8",
    accent: "#2A8A5A",
    lines: [
      "池塘里，游着一群小蝌蚪。",
      "小蝌蚪要找妈妈。",
      "金鱼不是，螃蟹不是，乌龟也不是。",
      "呱呱呱，青蛙妈妈来了。",
      "妈妈，我们找到你啦。",
    ],
  },
  {
    id: "fox",
    title: "狐狸和葡萄",
    subtitle: "跳一跳",
    emoji: "🦊",
    color: "#FFD8C0",
    accent: "#E07030",
    lines: [
      "狐狸看见高高的葡萄。",
      "它跳一跳，够不着。",
      "再跳一跳，还是够不着。",
      "狐狸说：葡萄是酸的。",
      "下次再来吧。先去喝点水。",
    ],
  },
  {
    id: "radish-story",
    title: "拔萝卜",
    subtitle: "大家一起用力",
    emoji: "🥕",
    color: "#FFE0C0",
    accent: "#E07030",
    lines: [
      "地里长出一个大萝卜。",
      "老爷爷拔呀拔，拔不动。",
      "老奶奶来帮忙，还是拔不动。",
      "小姑娘、小狗、小猫、小老鼠，都来了。",
      "嘿哟，嘿哟，大萝卜拔出来啦！",
      "大家一起，就有力气。",
    ],
  },
];

export function getCategory(id: CategoryId) {
  return categories.find((c) => c.id === id)!;
}

export function itemsFor(id: CategoryId) {
  if (id === "zh-songs") return zhSongs;
  if (id === "en-songs") return enSongs;
  if (id === "animals") return animals;
  return stories;
}
