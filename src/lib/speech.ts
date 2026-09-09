export type SpeakLang = "zh-CN" | "en-US";
export type SpeakKind = "word" | "cry" | "verse" | "fun" | "story" | "song" | "care";

const ZH_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function zhNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n < 0) return `零下${zhNumber(-n)}`;
  const whole = Math.round(n);
  if (whole <= 10) return whole === 10 ? "十" : ZH_DIGITS[whole]!;
  if (whole < 20) return `十${ZH_DIGITS[whole - 10]}`;
  if (whole < 100) {
    const tens = Math.floor(whole / 10);
    const ones = whole % 10;
    return `${ZH_DIGITS[tens]}十${ones ? ZH_DIGITS[ones] : ""}`;
  }
  return String(whole);
}

const LETTER: Record<string, string> = {
  A: "Ay",
  B: "Bee",
  C: "See",
  D: "Dee",
  E: "Eee",
  F: "Eff",
  G: "Jee",
  H: "Aitch",
  I: "Eye",
  J: "Jay",
  K: "Kay",
  L: "Ell",
  M: "Em",
  N: "En",
  O: "Oh",
  P: "Pee",
  Q: "Cue",
  R: "Are",
  S: "Ess",
  T: "Tee",
  U: "You",
  V: "Vee",
  W: "Double you",
  X: "Ecks",
  Y: "Why",
  Z: "Zee",
};

function looksLikeAlphabetLine(text: string) {
  const tokens = text
    .replace(/and/gi, " ")
    .replace(/[.,!?]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return tokens.length >= 3 && tokens.every((token) => /^[A-Za-z]$/.test(token));
}

function expandLetters(text: string) {
  return text.replace(/\b([A-Za-z])\b/g, (_, letter: string) => LETTER[letter.toUpperCase()] ?? letter);
}

/** Parent-style spoken form. Display text stays on the card. */
export function prepareSpeech(text: string, lang: SpeakLang, kind?: SpeakKind): string {
  let out = text.replace(/\s+/g, " ").trim();
  if (!out) return "";

  if (lang === "en-US") {
    out = out.replace(/\bE[\s-]*I[\s-]*E[\s-]*I[\s-]*O\b/gi, "Eee, I, Eee, I, Oh");
    if (looksLikeAlphabetLine(out)) out = expandLetters(out);
    out = out.replace(/\bA\s*B\s*C'?s?\b/gi, "Ay Bee See");
    out = out.replace(/\bwoof woof woof\b/gi, "woof, woof, woof");
    out = out.replace(/\bmoo moo\b/gi, "moo, moo");
    out = out.replace(/\bmeow meow\b/gi, "meow, meow");
    out = out.replace(/\bquack quack\b/gi, "quack, quack");
    return out;
  }

  out = out.replace(/(-?\d+(?:\.\d+)?)度/g, (_, raw: string) => `${zhNumber(Number(raw))}度`);
  out = out.replace(/嘎嘎嘎嘎/g, "嘎，嘎，嘎，嘎");
  out = out.replace(/汪汪汪/g, "汪，汪，汪");
  out = out.replace(/喵喵喵/g, "喵，喵，喵");
  out = out.replace(/哞哞哞/g, "哞，哞，哞");
  out = out.replace(/咩咩咩/g, "咩，咩，咩");
  out = out.replace(/叽叽叽/g, "叽，叽，叽");
  out = out.replace(/啾啾啾/g, "啾，啾，啾");
  out = out.replace(/呱呱呱/g, "呱，呱，呱");
  out = out.replace(/哼哼哼/g, "哼，哼，哼");
  out = out.replace(/嘶嘶嘶/g, "嘶，嘶");
  out = out.replace(/吼吼吼/g, "吼，吼");
  out = out.replace(/嗷嗷嗷/g, "嗷呜，嗷呜");
  out = out.replace(/嗷呜嗷呜/g, "嗷呜，嗷呜");
  out = out.replace(/嘿哟嘿哟/g, "嘿哟，嘿哟");
  out = out.replace(/([一二三四五六七八九]{3,})/g, (seq) => [...seq].join("，"));
  if (kind === "verse") {
    out = out.replace(/[，。]/g, "，");
  }
  return out;
}

export function speechRate(lang: SpeakLang, kind?: SpeakKind) {
  if (kind === "verse") return 0.7;
  if (kind === "cry") return lang === "zh-CN" ? 0.76 : 0.74;
  if (kind === "song") return lang === "zh-CN" ? 0.86 : 0.8;
  if (kind === "fun" || kind === "care") return 0.84;
  if (kind === "story") return 0.82;
  return lang === "zh-CN" ? 0.84 : 0.78;
}

export function speechPitch(lang: SpeakLang, kind?: SpeakKind) {
  if (kind === "cry") return 1.14;
  if (kind === "song") return lang === "en-US" ? 1.08 : 1.06;
  if (kind === "verse") return 1.02;
  return lang === "zh-CN" ? 1.05 : 1.03;
}

export function estimateSpeechMs(text: string, rate: number) {
  const chars = [...text].length;
  return Math.max(800, Math.round((chars * 290) / Math.max(0.45, rate)) + 450);
}

function voiceScore(voice: SpeechSynthesisVoice, lang: SpeakLang) {
  const name = voice.name.toLowerCase();
  const tag = voice.lang.replace("_", "-").toLowerCase();
  let score = 0;

  if (lang === "zh-CN") {
    if (tag.startsWith("zh-cn") || tag === "zh-cmn" || tag.startsWith("cmn")) score += 80;
    else if (tag === "zh" || tag.startsWith("zh-hans")) score += 55;
    else if (tag.startsWith("zh-tw") || tag.startsWith("zh-hant")) score += 22;
    else if (tag.startsWith("zh-hk") || tag.includes("yue") || name.includes("cantonese") || name.includes("sinji")) {
      return -120;
    } else if (tag.startsWith("zh")) score += 8;
    else return -100;

    if (name.includes("xiaoxiao") || name.includes("xiaoyi") || name.includes("yaoyao")) score += 30;
    if (name.includes("huihui") || name.includes("yaoyao") || name.includes("kangkang")) score += 16;
    if (name.includes("tingting") || name.includes("meijia") || name.includes("hanhan")) score -= 30;
  } else {
    if (tag.startsWith("en-us")) score += 70;
    else if (tag.startsWith("en-gb")) score += 42;
    else if (tag.startsWith("en-au") || tag.startsWith("en-ie")) score += 32;
    else if (tag.startsWith("en")) score += 18;
    else return -100;
    if (name.includes("samantha") || name.includes("siri") || name.includes("karen")) score += 16;
    if (name.includes("google us") || name.includes("microsoft aria") || name.includes("jenny") || name.includes("zira")) {
      score += 18;
    }
  }

  if (voice.localService) score += 8;
  if (name.includes("female") || name.includes("woman") || name.includes("girl")) score += 12;
  if (name.includes("male") || name.includes("man") || name.includes("boy")) score -= 8;
  if (name.includes("compact")) score += 3;
  return score;
}

export function pickVoice(voices: SpeechSynthesisVoice[], lang: SpeakLang) {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const voice of voices) {
    const score = voiceScore(voice, lang);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }
  return bestScore > 0 ? best : null;
}

export function waitVoices(synth: SpeechSynthesis | null, timeout = 1600): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([]);
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener("voiceschanged", onChange);
      resolve(synth.getVoices());
    };
    const onChange = () => finish();
    synth.addEventListener("voiceschanged", onChange);
    window.setTimeout(finish, timeout);
  });
}
