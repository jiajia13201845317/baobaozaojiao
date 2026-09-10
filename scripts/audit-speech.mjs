import assert from "node:assert/strict";
import { prepareSpeech } from "../src/lib/speech.ts";
import {
  animals,
  bodyParts,
  familyMembers,
  colorCards,
  numberCards,
  zhSongs,
  enSongs,
  poems,
  tales,
  stories,
} from "../src/lib/content.ts";
import { buildCare } from "../src/lib/care.ts";

const rows = [];

function add(group, id, display, spoken, lang, kind) {
  const prepared = prepareSpeech(spoken, lang, kind);
  rows.push({ group, id, display, spoken, prepared, lang, kind });
}

for (const card of [...animals, ...bodyParts, ...familyMembers, ...colorCards, ...numberCards]) {
  add("card-zh", card.id, card.zh, card.sayZh ?? card.zh, "zh-CN", "word");
  add("card-en", card.id, card.en, card.sayEn ?? card.en, "en-US", "word");
}

for (const song of [...zhSongs, ...enSongs]) {
  add("song-title", song.id, song.title, song.sayTitle ?? song.title, song.lyricLang, "song");
  song.lyrics.forEach((line, i) => {
    add("song-line", `${song.id}:${i}`, line, song.sayLyrics?.[i] ?? line, song.lyricLang, "song");
  });
}

for (const poem of poems) {
  add("poem-title", poem.id, poem.title, poem.sayTitle ?? poem.title, "zh-CN", "verse");
  add("poem-author", poem.id, poem.author, poem.sayAuthor ?? poem.author, "zh-CN", "word");
  poem.verses.forEach((line, i) => {
    add("poem-verse", `${poem.id}:${i}`, line, poem.sayVerses?.[i] ?? line, "zh-CN", "verse");
  });
  poem.fun.forEach((line, i) => add("poem-fun", `${poem.id}:${i}`, line, line, "zh-CN", "fun"));
}

for (const story of [...tales, ...stories]) {
  add("story-title", story.id, story.title, story.sayTitle ?? story.title, "zh-CN", "story");
  story.lines.forEach((line, i) => {
    add("story-line", `${story.id}:${i}`, line, story.sayLines?.[i] ?? line, "zh-CN", "story");
  });
}

add("care", "goodnight", "该睡觉啦", "宝宝，该睡觉啦", "zh-CN", "care");
for (const [sky, temp, hour, night] of [
  ["sun", 31, 12, false],
  ["cloud", 20, 9, false],
  ["rain", 16, 18, false],
  ["night", 12, 21, true],
  ["sun", 8, 8, false],
]) {
  const care = buildCare(sky, temp, hour, night);
  add("care", `${sky}-${temp}-${hour}`, care.speakWeather, care.speakWeather, "zh-CN", "care");
  add("care", `${sky}-dress`, care.speakDress, care.speakDress, "zh-CN", "care");
  add("care", `${sky}-meal`, care.speakMeal, care.speakMeal, "zh-CN", "care");
}

const risks = [];
for (const row of rows) {
  const t = row.prepared;
  if (!t) risks.push({ ...row, reason: "empty spoken text" });
  if (/[0-9]/.test(t) && /度/.test(t)) risks.push({ ...row, reason: "digit left in temperature" });
  if (/(嘎嘎嘎嘎|嘿哟嘿哟|E I E I O)/.test(t)) {
    risks.push({ ...row, reason: "raw onomatopoeia or EIEIO not split" });
  }
  if (row.group === "card-zh" && row.display === "一" && t === "一") {
    risks.push({ ...row, reason: "bare 一 may be read as yāo" });
  }
  if (/矮矮人/.test(t)) risks.push({ ...row, reason: "awkward 矮矮人" });
  if (row.lang === "en-US" && /\b[A-Z](\s+[A-Z]){3,}\b/.test(t)) {
    risks.push({ ...row, reason: "unexpanded alphabet run" });
  }
}

const counts = rows.reduce((acc, row) => {
  acc[row.group] = (acc[row.group] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ total: rows.length, counts, riskCount: risks.length, risks }, null, 2));

assert.equal(risks.length, 0, `speech risks remain: ${JSON.stringify(risks, null, 2)}`);
console.log("audit-speech passed");
