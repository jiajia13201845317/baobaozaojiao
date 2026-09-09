export type CategoryId =
  | "animals"
  | "body"
  | "family"
  | "colors"
  | "numbers"
  | "zh-songs"
  | "en-songs"
  | "tales"
  | "poems"
  | "stories";

export type WorldId = "learn" | "songs" | "stories";

export const worlds: {
  id: WorldId;
  title: string;
  hint: string;
  rooms: CategoryId[];
  hero: string;
  tint: string;
  shadow: string;
}[] = [
  {
    id: "learn",
    title: "认一认",
    hint: "动物、身体、家人",
    rooms: ["animals", "body", "family", "colors", "numbers"],
    hero: "/art/hero-body.png",
    tint: "#C8F2B0",
    shadow: "#6FCC62",
  },
  {
    id: "songs",
    title: "唱儿歌",
    hint: "中文歌、英文歌",
    rooms: ["zh-songs", "en-songs"],
    hero: "/art/hero-songs.png",
    tint: "#FFD0C0",
    shadow: "#FF8A6A",
  },
  {
    id: "stories",
    title: "听故事",
    hint: "童话、古诗、寓言",
    rooms: ["tales", "poems", "stories"],
    hero: "/art/hero-tales.png",
    tint: "#E8D0FF",
    shadow: "#C0A0FF",
  },
];

export function getWorld(id: WorldId) {
  return worlds.find((w) => w.id === id)!;
}

export function worldFor(category: CategoryId): WorldId {
  const found = worlds.find((w) => w.rooms.includes(category));
  return found?.id ?? "learn";
}

export type LessonStep = "zh" | "en" | "sound";

export type Flashcard = {
  id: string;
  zh: string;
  en: string;
  cry?: string;
  sound?: AnimalSoundId;
  image: string;
  color: string;
  accent: string;
  swatch?: string;
  numeral?: string;
};

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

export type Animal = Flashcard;

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
  image?: string;
};

export type Poem = {
  id: string;
  title: string;
  author: string;
  verses: string[];
  fun: string[];
  color: string;
  accent: string;
  image?: string;
};

export const categories: {
  id: CategoryId;
  title: string;
  place: string;
  hint: string;
  english: string;
  emoji: string;
  tint: string;
  deep: string;
  shadow: string;
  sky: string;
  hero: string;
  group: "learn" | "listen";
}[] = [
  {
    id: "animals",
    title: "动物叫声",
    place: "快乐农场",
    hint: "狗 · dog · 汪汪汪",
    english: "Happy Farm",
    emoji: "🐶",
    tint: "#C8F2B0",
    deep: "#4AAA4A",
    shadow: "#6FCC62",
    sky: "#C8F2B0",
    hero: "/art/hero-dog.png",
    group: "learn",
  },
  {
    id: "body",
    title: "身体部位",
    place: "豆豆的身体",
    hint: "这是眼睛 · eyes",
    english: "My Body",
    emoji: "👀",
    tint: "#B8E4FF",
    deep: "#3E9ED0",
    shadow: "#5CB8E8",
    sky: "#B8E4FF",
    hero: "/art/hero-body.png",
    group: "learn",
  },
  {
    id: "family",
    title: "我的家人",
    place: "豆豆一家",
    hint: "爸爸猪 · Daddy",
    english: "My Family",
    emoji: "🐷",
    tint: "#FFD2B0",
    deep: "#E07050",
    shadow: "#FF9A62",
    sky: "#FFD2B0",
    hero: "/art/hero-family.png",
    group: "learn",
  },
  {
    id: "colors",
    title: "认识颜色",
    place: "彩虹小屋",
    hint: "红色 · red",
    english: "Colors",
    emoji: "🌈",
    tint: "#FFE08A",
    deep: "#E0A020",
    shadow: "#F0C14E",
    sky: "#FFE08A",
    hero: "/art/hero-colors.png",
    group: "learn",
  },
  {
    id: "numbers",
    title: "数一数",
    place: "数字乐园",
    hint: "一 · one",
    english: "Numbers",
    emoji: "1️⃣",
    tint: "#E0D0FF",
    deep: "#8A6CFF",
    shadow: "#B8A0FF",
    sky: "#E0D0FF",
    hero: "/art/hero-numbers.png",
    group: "learn",
  },
  {
    id: "zh-songs",
    title: "中文儿歌",
    place: "唱歌花园",
    hint: "小兔子乖乖",
    english: "Sing Garden",
    emoji: "🐰",
    tint: "#FFD0C0",
    deep: "#E06A4A",
    shadow: "#FF8A6A",
    sky: "#FFD0C0",
    hero: "/art/hero-songs.png",
    group: "listen",
  },
  {
    id: "en-songs",
    title: "英文儿歌",
    place: "星星城堡",
    hint: "Twinkle Star",
    english: "Star Castle",
    emoji: "🌟",
    tint: "#C8E8FF",
    deep: "#4A88C8",
    shadow: "#7EB8E8",
    sky: "#C8E8FF",
    hero: "/art/hero-english.png",
    group: "listen",
  },
  {
    id: "tales",
    title: "童话故事",
    place: "童话城堡",
    hint: "小红帽出门啦",
    english: "Fairy Tales",
    emoji: "🏰",
    tint: "#E8D0FF",
    deep: "#9B6CFF",
    shadow: "#C0A0FF",
    sky: "#E8D0FF",
    hero: "/art/hero-tales.png",
    group: "listen",
  },
  {
    id: "poems",
    title: "古诗背诵",
    place: "小小书院",
    hint: "先背，再听好玩的话",
    english: "Poems",
    emoji: "📜",
    tint: "#FFE8C0",
    deep: "#C48840",
    shadow: "#E0B060",
    sky: "#FFE8C0",
    hero: "/art/hero-poems.png",
    group: "listen",
  },
  {
    id: "stories",
    title: "寓言故事",
    place: "故事树屋",
    hint: "乌鸦喝水",
    english: "Fables",
    emoji: "📖",
    tint: "#C8F0C0",
    deep: "#4AAA4A",
    shadow: "#7ED957",
    sky: "#C8F0C0",
    hero: "/art/hero-fables.png",
    group: "listen",
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

export const animals: Flashcard[] = [
  { id: "dog", zh: "狗", en: "Dog", cry: "汪汪汪", sound: "dog", image: "/art/dog.png", color: "#F0D8C0", accent: "#B07840" },
  { id: "cat", zh: "猫", en: "Cat", cry: "喵喵喵", sound: "cat", image: "/art/cat.png", color: "#FFE4C8", accent: "#E0892C" },
  { id: "chick", zh: "鸡", en: "Chick", cry: "叽叽叽", sound: "chick", image: "/art/chick.png", color: "#FFF3B0", accent: "#D4A017" },
  { id: "duck", zh: "鸭", en: "Duck", cry: "嘎嘎嘎", sound: "duck", image: "/art/duck.png", color: "#D4F0C8", accent: "#5AAA4A" },
  { id: "cow", zh: "牛", en: "Cow", cry: "哞哞哞", sound: "cow", image: "/art/cow.png", color: "#F0E8DC", accent: "#8A6A4A" },
  { id: "sheep", zh: "羊", en: "Sheep", cry: "咩咩咩", sound: "sheep", image: "/art/sheep.png", color: "#F4F0E8", accent: "#8A7A6A" },
  { id: "pig", zh: "猪", en: "Pig", cry: "哼哼哼", sound: "pig", image: "/art/pig.png", color: "#FFD6E0", accent: "#E07090" },
  { id: "bird", zh: "鸟", en: "Bird", cry: "啾啾啾", sound: "bird", image: "/art/bird.png", color: "#C8EEF8", accent: "#2A88B0" },
  { id: "frog", zh: "青蛙", en: "Frog", cry: "呱呱呱", sound: "frog", image: "/art/frog.png", color: "#C8F0B8", accent: "#4A9A3A" },
  { id: "horse", zh: "马", en: "Horse", cry: "嘶嘶嘶", sound: "horse", image: "/art/horse.png", color: "#E8D4B8", accent: "#8A6030" },
  { id: "lion", zh: "狮子", en: "Lion", cry: "吼吼吼", sound: "lion", image: "/art/lion.png", color: "#FFE7B0", accent: "#D49020" },
  { id: "elephant", zh: "大象", en: "Elephant", cry: "嗷嗷嗷", sound: "elephant", image: "/art/elephant.png", color: "#D8DCE8", accent: "#6A7088" },
];

export const bodyParts: Flashcard[] = [
  { id: "head", zh: "头", en: "Head", image: "/art/hero-body.png", color: "#D9F5C8", accent: "#39C15B" },
  { id: "eyes", zh: "眼睛", en: "Eyes", image: "/art/body-eyes.png", color: "#FFE4C8", accent: "#E0892C" },
  { id: "nose", zh: "鼻子", en: "Nose", image: "/art/body-nose.png", color: "#FFF3B0", accent: "#D4A017" },
  { id: "ears", zh: "耳朵", en: "Ears", image: "/art/body-ears.png", color: "#EDE0FF", accent: "#9B6CFF" },
  { id: "mouth", zh: "嘴巴", en: "Mouth", image: "/art/body-mouth.png", color: "#FFD6E0", accent: "#E07090" },
  { id: "hands", zh: "手", en: "Hands", image: "/art/body-hands.png", color: "#FFE9C8", accent: "#F4A261" },
  { id: "feet", zh: "脚", en: "Feet", image: "/art/hero-body.png", color: "#C8EEF8", accent: "#2A88B0" },
];

export const familyMembers: Flashcard[] = [
  { id: "dad", zh: "爸爸", en: "Daddy", image: "/art/pig-dad.png", color: "#C8EEF8", accent: "#2A88B0" },
  { id: "mom", zh: "妈妈", en: "Mommy", image: "/art/pig-mom.png", color: "#FFE4C8", accent: "#E0892C" },
  { id: "grandpa", zh: "爷爷", en: "Grandpa", image: "/art/pig-grandpa.png", color: "#D9F5C8", accent: "#39C15B" },
  { id: "grandma", zh: "奶奶", en: "Grandma", image: "/art/pig-grandma.png", color: "#EDE0FF", accent: "#9B6CFF" },
  { id: "brother", zh: "哥哥", en: "Brother", image: "/art/pig-brother.png", color: "#FFF3B0", accent: "#D4A017" },
  { id: "sister", zh: "姐姐", en: "Sister", image: "/art/pig-sister.png", color: "#FFD6E0", accent: "#E07090" },
  { id: "baby", zh: "宝宝", en: "Baby", image: "/art/pig-baby.png", color: "#F4F0E8", accent: "#8A7A6A" },
];

export const colorCards: Flashcard[] = [
  { id: "red", zh: "红色", en: "Red", image: "/art/hero-colors.png", color: "#FFD6D6", accent: "#E05656", swatch: "#E05656" },
  { id: "yellow", zh: "黄色", en: "Yellow", image: "/art/hero-colors.png", color: "#FFF3B0", accent: "#D4A017", swatch: "#FFD84A" },
  { id: "blue", zh: "蓝色", en: "Blue", image: "/art/hero-colors.png", color: "#D6E8FF", accent: "#3E9ED0", swatch: "#3E9ED0" },
  { id: "green", zh: "绿色", en: "Green", image: "/art/hero-colors.png", color: "#D4F0C8", accent: "#39C15B", swatch: "#39C15B" },
  { id: "orange", zh: "橙色", en: "Orange", image: "/art/hero-colors.png", color: "#FFE0C0", accent: "#E07030", swatch: "#E07030" },
  { id: "purple", zh: "紫色", en: "Purple", image: "/art/hero-colors.png", color: "#EDE0FF", accent: "#9B6CFF", swatch: "#9B6CFF" },
];

export const numberCards: Flashcard[] = [
  { id: "one", zh: "一", en: "One", image: "/art/hero-numbers.png", color: "#FFE4D6", accent: "#FF6B4A", numeral: "1" },
  { id: "two", zh: "二", en: "Two", image: "/art/hero-numbers.png", color: "#DCE6FF", accent: "#5B7CFF", numeral: "2" },
  { id: "three", zh: "三", en: "Three", image: "/art/hero-numbers.png", color: "#D9F5C8", accent: "#39C15B", numeral: "3" },
  { id: "four", zh: "四", en: "Four", image: "/art/hero-numbers.png", color: "#FFF3B0", accent: "#D4A017", numeral: "4" },
  { id: "five", zh: "五", en: "Five", image: "/art/hero-numbers.png", color: "#EDE0FF", accent: "#9B6CFF", numeral: "5" },
];

export const poems: Poem[] = [
  {
    id: "goose",
    title: "咏鹅",
    author: "骆宾王",
    color: "#C8EEF8",
    accent: "#2A88B0",
    image: "/art/hero-poems.png",
    verses: ["鹅，鹅，鹅，曲项向天歌。", "白毛浮绿水，红掌拨清波。"],
    fun: [
      "先听完啦。这句话很好玩：",
      "一只大白鹅，弯着脖子朝天唱歌。",
      "白白的毛像小船，浮在绿绿的水上。",
      "红红的脚掌一拨，水面就笑出波纹。",
    ],
  },
  {
    id: "dawn",
    title: "春晓",
    author: "孟浩然",
    color: "#D9F5C8",
    accent: "#39C15B",
    image: "/art/hero-poems.png",
    verses: ["春眠不觉晓，处处闻啼鸟。", "夜来风雨声，花落知多少。"],
    fun: [
      "诗背完了，来听好玩的话：",
      "春天的早上，宝宝睡到自己醒来。",
      "窗外好多小鸟在聊天：啾啾啾。",
      "夜里悄悄下过雨，花瓣像给草地盖了一层小被子。",
    ],
  },
  {
    id: "moon",
    title: "静夜思",
    author: "李白",
    color: "#DCE6FF",
    accent: "#5B7CFF",
    image: "/art/hero-poems.png",
    verses: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
    fun: [
      "古诗念完了，我们来译成小朋友的话：",
      "床边白白亮亮的，还以为地上结霜了。",
      "抬头一看，原来是月亮在眨眼。",
      "低头就想起家里，好像月亮也在看妈妈。",
    ],
  },
  {
    id: "farmer",
    title: "悯农",
    author: "李绅",
    color: "#FFE4D6",
    accent: "#FF6B4A",
    image: "/art/hero-poems.png",
    verses: ["锄禾日当午，汗滴禾下土。", "谁知盘中餐，粒粒皆辛苦。"],
    fun: [
      "背完啦，听一听它在说什么：",
      "农民伯伯顶着大太阳种粮食，汗水滴到泥土里。",
      "碗里的米饭，一粒一粒都是辛苦换来的。",
      "吃饭时不撒米，就是谢谢伯伯。",
    ],
  },
  {
    id: "tower",
    title: "登鹳雀楼",
    author: "王之涣",
    color: "#FFE7B0",
    accent: "#D49020",
    image: "/art/hero-poems.png",
    verses: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"],
    fun: [
      "诗念完了，翻译成好玩的话：",
      "太阳顺着山坡回家睡觉了。",
      "黄河像一条黄丝带，跑去海里玩。",
      "想看更远的地方？再爬高一点点就好啦。",
    ],
  },
  {
    id: "jiangnan",
    title: "江南",
    author: "汉乐府",
    color: "#D4F0C8",
    accent: "#5AAA4A",
    image: "/art/hero-poems.png",
    verses: ["江南可采莲，莲叶何田田。", "鱼戏莲叶间。"],
    fun: [
      "好听的古诗结束啦：",
      "江南的水里能采莲蓬，叶子圆圆的像小伞。",
      "小鱼在叶子东边西边捉迷藏。",
      "宝宝要是去，也可以轻轻跟鱼打招呼。",
    ],
  },
];

export const tales: Story[] = [
  {
    id: "hood",
    title: "小红帽",
    subtitle: "去看外婆",
    emoji: "🧺",
    color: "#FFD6D6",
    accent: "#E05656",
    image: "/art/hero-tales.png",
    lines: [
      "小红帽戴着红帽子，去看外婆。",
      "路上遇见大灰狼。大灰狼跑去外婆家，躲在被子里。",
      "小红帽说：外婆，你的牙齿怎么这么大？",
      "猎人赶来，把大灰狼赶跑了。",
      "小红帽抱抱外婆。出门要跟家人在一起。",
    ],
  },
  {
    id: "duckling",
    title: "丑小鸭",
    subtitle: "后来变天鹅",
    emoji: "🦢",
    color: "#E8F0FF",
    accent: "#4A7FD4",
    image: "/art/hero-tales.png",
    lines: [
      "鸭窝里走出一只灰灰的小鸭子，大家笑它丑。",
      "它走呀走，冬天好冷，春天来了。",
      "它低头看水面：呀，自己变成白天鹅啦。",
      "原来慢慢长大，也会变得漂亮。",
    ],
  },
  {
    id: "snow",
    title: "白雪公主",
    subtitle: "七个好朋友",
    emoji: "🍎",
    color: "#F4F0E8",
    accent: "#8A7A6A",
    image: "/art/hero-tales.png",
    lines: [
      "白雪公主住在森林里，遇见七个矮矮人好朋友。",
      "坏皇后送来红苹果，公主睡着了。",
      "朋友们守护她。王子来了，公主醒来。",
      "大家又唱歌，又跳舞。好朋友最重要。",
    ],
  },
  {
    id: "cinder",
    title: "灰姑娘",
    subtitle: "水晶鞋",
    emoji: "👠",
    color: "#EDE0FF",
    accent: "#9B6CFF",
    image: "/art/hero-tales.png",
    lines: [
      "灰姑娘天天干活，仙女教母给她漂亮裙子和水晶鞋。",
      "她去跳舞，十二点要回家，丢下一只鞋。",
      "王子拿着鞋子找人。鞋子正好合适。",
      "灰姑娘笑了。善良的孩子，会遇到好事。",
    ],
  },
  {
    id: "bean",
    title: "杰克与豆茎",
    subtitle: "爬得高高的",
    emoji: "🌱",
    color: "#D4F0C8",
    accent: "#39C15B",
    image: "/art/hero-tales.png",
    lines: [
      "杰克种下一颗豆子，豆茎长到天上。",
      "他爬上去，看见一座大房子。",
      "他带回一把竖琴，豆茎又变回小芽芽。",
      "小小的种子，也能长得高高的。",
    ],
  },
  {
    id: "goldfish",
    title: "渔夫和金鱼",
    subtitle: "知足就好",
    emoji: "🐠",
    color: "#C8EEF8",
    accent: "#2A88B0",
    image: "/art/hero-tales.png",
    lines: [
      "渔夫网到一条会说话的金鱼，金鱼说：放我走吧。",
      "渔夫放了它。后来要房子、要城堡，要得太多。",
      "金鱼游走了，家里又变回小木屋。",
      "够用就好，心里会甜甜的。",
    ],
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

export function cardsFor(id: CategoryId): Flashcard[] {
  if (id === "animals") return animals;
  if (id === "body") return bodyParts;
  if (id === "family") return familyMembers;
  if (id === "colors") return colorCards;
  if (id === "numbers") return numberCards;
  return [];
}

export function isLesson(id: CategoryId) {
  return id === "animals" || id === "body" || id === "family" || id === "colors" || id === "numbers";
}

export function storiesFor(id: CategoryId): Story[] {
  if (id === "tales") return tales;
  if (id === "stories") return stories;
  return [];
}

export function itemsFor(id: CategoryId) {
  if (id === "zh-songs") return zhSongs;
  if (id === "en-songs") return enSongs;
  if (id === "poems") return poems;
  if (id === "tales") return tales;
  if (id === "animals") return animals;
  if (id === "body") return bodyParts;
  if (id === "family") return familyMembers;
  if (id === "colors") return colorCards;
  if (id === "numbers") return numberCards;
  return stories;
}
