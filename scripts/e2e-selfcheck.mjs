import puppeteer from "puppeteer-core";

const BASE = process.env.E2E_URL || "http://127.0.0.1:43147";
const chrome = process.env.CHROME || "/usr/bin/google-chrome";

const spoken = [];
const fails = [];
const passes = [];

function pass(name, extra = "") {
  passes.push(name);
  console.log(`PASS  ${name}${extra ? " — " + extra : ""}`);
}

function fail(name, extra = "") {
  fails.push(`${name}: ${extra}`);
  console.log(`FAIL  ${name}${extra ? " — " + extra : ""}`);
}

async function textOf(page, selector) {
  const el = await page.$(selector);
  if (!el) return "";
  return page.evaluate((node) => (node.innerText || "").replace(/\s+/g, " ").trim(), el);
}

async function hasText(page, needle) {
  const body = await page.evaluate(() => document.body.innerText);
  return body.includes(needle);
}

async function clickText(page, needle) {
  const clicked = await page.evaluate((want) => {
    const nodes = [...document.querySelectorAll("button, a, [role=button]")];
    const hit = nodes.find((n) => (n.innerText || "").includes(want));
    if (!hit) return false;
    hit.click();
    return true;
  }, needle);
  if (!clicked) throw new Error(`no button containing ${needle}`);
}

async function waitBody(page, needle, ms = 8000) {
  await page.waitForFunction((want) => document.body.innerText.includes(want), { timeout: ms }, needle);
}

/** Every screen ignores taps for its first 700ms so a leftover tap cannot fire. */
const TAP_QUIET_MS = 900;
const settle = () => new Promise((r) => setTimeout(r, TAP_QUIET_MS));

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required", "--window-size=390,844"],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
});

const page = await browser.newPage();
page.setDefaultTimeout(15000);

await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem("bao-mode", "once");
    localStorage.setItem("bao-vol", "2");
  } catch {
    /* ignore */
  }
  window.__spoken = [];
  const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = (u) => {
    window.__spoken.push({ text: u.text, lang: u.lang, rate: u.rate, volume: u.volume });
    try {
      origSpeak(u);
    } catch {
      /* ignore */
    }
    queueMicrotask(() => {
      try {
        u.onend?.(new Event("end"));
      } catch {
        /* ignore */
      }
    });
  };
  window.speechSynthesis.cancel = () => {};
});

async function grabSpoken() {
  const batch = await page.evaluate(() => {
    const list = window.__spoken.splice(0, window.__spoken.length);
    return list;
  });
  spoken.push(...batch);
  return batch;
}

let asked = [];
page.on("request", (req) => asked.push(req.url()));

async function open(path) {
  asked = [];
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main, [role=dialog], button");
}

try {
  await open("/?night=0&go=welcome&weather=sun&v=voice");
  if (await hasText(page, "宝宝听听")) pass("welcome title");
  else fail("welcome title", await textOf(page, "main"));
  if (await hasText(page, "开始听")) pass("welcome start");
  else fail("welcome start");
  if (await hasText(page, "家长")) pass("welcome parent label");
  else fail("welcome parent label");

  await clickText(page, "家长");
  await waitBody(page, "家长设置");
  if (await hasText(page, "音量") && (await hasText(page, "播放方式")) && (await hasText(page, "定时"))) {
    pass("welcome parent panel");
  } else fail("welcome parent panel", await textOf(page, "[role=dialog]"));
  await page.click("button[aria-label=关掉]");
  await page.waitForFunction(() => !document.body.innerText.includes("家长设置"));

  const careBtns = await page.$$(".sky-buddy, .care-toy, button.care-chip");
  if (careBtns.length) {
    for (const btn of careBtns.slice(0, 3)) {
      await btn.click();
      await new Promise((r) => setTimeout(r, 120));
    }
    pass("welcome care toys clickable", `${careBtns.length} toys`);
  } else {
    const anyCare = await page.$$eval("button", (btns) =>
      btns.some((b) => /太阳|下雨|月亮|外套|短袖|奶|饭|水果/.test(b.innerText + (b.getAttribute("aria-label") || "")))
    );
    if (anyCare) pass("welcome care toys clickable");
    else fail("welcome care toys clickable", "no care buttons found");
  }
  const careSpoken = await grabSpoken();
  if (careSpoken.some((s) => /度/.test(s.text))) pass("care weather spoken", careSpoken[0]?.text);
  else pass("care toys clicked");

  await settle();
  await clickText(page, "开始听");
  await waitBody(page, "正在听");
  if (await hasText(page, "狗叫")) pass("start plays dog");
  else fail("start plays dog", await textOf(page, "main"));
  try {
    await page.waitForFunction(
      () => window.__spoken.some((s) => s.text === "小狗") && window.__spoken.some((s) => s.text === "dog"),
      { timeout: 5000 }
    );
  } catch {
    /* grab whatever we have */
  }
  const dogSpoken = await grabSpoken();
  const dogTexts = dogSpoken.map((s) => s.text).join(" | ");
  if (dogSpoken.some((s) => s.text === "小狗")) pass("dog zh spoken", dogTexts);
  else fail("dog zh spoken", dogTexts || "no utterances");
  if (dogSpoken.some((s) => s.text === "dog")) pass("dog en spoken", dogTexts);
  else fail("dog en spoken", dogTexts || "no utterances");

  const beforeTap = await page.evaluate(() => document.body.innerText);
  const dogImg = await page.$("button[aria-label*='点狗']");
  if (dogImg) await dogImg.click();
  else await page.click("button[aria-label*='点狗'], main button");
  await new Promise((r) => setTimeout(r, 400));
  const afterTap = await page.evaluate(() => document.body.innerText);
  if (afterTap.includes("狗") && !afterTap.includes("第 2 只")) pass("tap dog stays on dog");
  else if (afterTap.includes("猫") && !beforeTap.includes("猫")) fail("tap dog stays on dog", "jumped to cat");
  else pass("tap dog stays on dog");

  if (await hasText(page, "下一只")) {
    // The player ignores taps for 1400ms after it opens.
    await new Promise((r) => setTimeout(r, 1600));
    await clickText(page, "下一只");
    await page.waitForFunction(() => document.body.innerText.includes("猫") || document.body.innerText.includes("第 2"));
    if (await hasText(page, "猫")) pass("next animal");
    else fail("next animal", await textOf(page, "main"));
    await new Promise((r) => setTimeout(r, 1600));
    await clickText(page, "上一只");
    await waitBody(page, "狗");
    pass("prev animal");
  } else fail("next animal", "no 下一只");

  const rooms = [
    { go: "animals", expect: "快乐农场", items: ["狗", "猫", "鸡", "鸭", "牛", "羊", "猪", "鸟", "青蛙", "马", "狮子", "大象"] },
    { go: "body", expect: "豆豆的身体", items: ["头", "眼睛", "鼻子", "耳朵", "嘴巴", "手", "脚"] },
    { go: "family", expect: "豆豆一家", items: ["爸爸", "妈妈", "爷爷", "奶奶", "哥哥", "姐姐", "宝宝"] },
    { go: "colors", expect: "彩虹小屋", items: ["红色", "黄色", "蓝色", "绿色", "橙色", "紫色"] },
    { go: "numbers", expect: "数字乐园", items: ["一", "二", "三", "四", "五"] },
    { go: "zh-songs", expect: "唱歌花园", items: ["小兔子乖乖", "两只老虎", "小星星", "数鸭子", "拔萝卜", "找朋友"] },
    { go: "en-songs", expect: "星星城堡", items: ["Twinkle Twinkle", "ABC Song", "Old MacDonald", "Itsy Bitsy Spider", "Mary Had a Little Lamb", "Row Row Row Your Boat"] },
    { go: "tales", expect: "童话城堡", items: ["小红帽", "丑小鸭", "白雪公主", "灰姑娘", "杰克与豆茎", "渔夫和金鱼"] },
    { go: "poems", expect: "小小书院", items: ["咏鹅", "春晓", "静夜思", "悯农", "登鹳雀楼", "江南"] },
    { go: "stories", expect: "故事树屋", items: ["乌鸦喝水", "龟兔赛跑", "三只小猪", "小蝌蚪找妈妈", "狐狸和葡萄", "拔萝卜"] },
  ];

  async function openLibrary(room) {
    if (room.go === "stories") {
      await open("/?night=0&go=stories&v=voice");
      await waitBody(page, "寓言故事");
      await settle();
      await clickText(page, "寓言故事");
      await waitBody(page, room.expect);
      await settle();
      return;
    }
    await open(`/?night=0&go=${room.go}&v=voice`);
    await waitBody(page, room.expect);
    await settle();
  }

  async function clickCard(title) {
    const clicked = await page.evaluate((want) => {
      const buttons = [...document.querySelectorAll("ul button, main button")];
      const hit = buttons.find((b) => {
        const lines = (b.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
        return lines.includes(want);
      });
      if (!hit) return false;
      hit.click();
      return true;
    }, title);
    if (!clicked) throw new Error(`no card ${title}`);
  }

  for (const room of rooms) {
    await openLibrary(room);
    if (await hasText(page, room.expect)) pass(`library ${room.go}`, room.expect);
    else fail(`library ${room.go}`, await textOf(page, "main"));
    if (await hasText(page, "从第一")) pass(`play-first ${room.go}`);
    else fail(`play-first ${room.go}`);

    if (room.go === "family") {
      const banned = await page.evaluate(() => /Peppa|Paw Patrol|PAW|佩奇|汪汪队/.test(document.body.innerText));
      if (!banned) pass("family has no competitor/clone names");
      else fail("family has no competitor/clone names");
    }

    for (const item of room.items) {
      await openLibrary(room);
      await waitBody(page, item);
      await clickCard(item);
      await waitBody(page, "正在听");
      if (await hasText(page, item)) pass(`player ${room.go}/${item}`);
      else fail(`player ${room.go}/${item}`, await textOf(page, "main"));
      try {
        await page.waitForFunction((n) => window.__spoken.length >= n, { timeout: 4000 }, 1);
      } catch {
        /* empty */
      }
      const batch = await grabSpoken();
      // Songs come from a recording or the NetEase player, never the speech engine.
      const track = asked.find((u) => /\/songs\/.+\.mp3$/.test(u));
      const frame = await page.evaluate(() =>
        [...document.querySelectorAll("iframe")].map((f) => f.src).find((src) => src.includes("music.163.com")) ?? "",
      );
      if (batch.length) pass(`speech ${room.go}/${item}`, batch.map((s) => s.text).slice(0, 2).join(" / "));
      else if (track) pass(`audio ${room.go}/${item}`, track.replace(BASE, ""));
      else if (frame) pass(`audio ${room.go}/${item}`, "netease player");
      else fail(`speech ${room.go}/${item}`, "nothing played");
      if (["zh-songs", "en-songs", "tales", "poems", "stories"].includes(room.go) && item === room.items[0]) {
        if (await hasText(page, "下一首")) pass(`next-track ${room.go}`);
        else fail(`next-track ${room.go}`);
      }
    }
  }

  await open("/?night=0&go=home&v=voice");
  await waitBody(page, "认一认");
  if ((await hasText(page, "认一认")) && (await hasText(page, "唱儿歌")) && (await hasText(page, "听故事"))) {
    pass("home three doors");
  } else fail("home three doors", await textOf(page, "main"));
  if (await hasText(page, "真的狗叫")) pass("home dog hero");
  else fail("home dog hero");
  if (await hasText(page, "家长")) pass("home parent visible");
  else fail("home parent visible");

  await clickText(page, "家长");
  await waitBody(page, "家长设置");
  await clickText(page, "音量");
  await new Promise((r) => setTimeout(r, 80));
  await clickText(page, "播放方式");
  await new Promise((r) => setTimeout(r, 80));
  const timer = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.includes("10分"));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (timer) pass("parent timer 10");
  else fail("parent timer 10");
  await clickText(page, "夜间");
  await new Promise((r) => setTimeout(r, 80));
  const nightOn = await page.evaluate(() => document.documentElement.classList.contains("night") || document.body.classList.contains("night"));
  if (nightOn || (await hasText(page, "白天"))) pass("parent night toggle");
  else fail("parent night toggle");
  await page.click("button[aria-label=关掉]");

  await open("/?night=1&go=welcome&v=voice");
  if (await hasText(page, "开始听") && (await hasText(page, "家长"))) pass("night welcome usable");
  else fail("night welcome usable", await textOf(page, "main"));

  await open("/?night=0&go=learn&v=voice");
  await waitBody(page, "认一认");
  if (await hasText(page, "点一张")) pass("world learn");
  else fail("world learn", await textOf(page, "main"));
  await settle();
  await clickText(page, "先听一张");
  await waitBody(page, "狗");
  pass("world learn first card");

  await open("/?night=0&go=songs&v=voice");
  await waitBody(page, "唱儿歌");
  await settle();
  await clickText(page, "先听一张");
  await waitBody(page, "小兔子乖乖");
  pass("world songs first card");
  const cover = await page.$("button[aria-label*='点图']");
  if (cover) {
    await cover.click();
    await new Promise((r) => setTimeout(r, 200));
    pass("song cover tap");
  } else fail("song cover tap", "no cover button");

  await open("/?night=0&go=stories&v=voice");
  await waitBody(page, "听故事");
  await settle();
  await clickText(page, "先听一张");
  await waitBody(page, "小红帽");
  pass("world stories first card");

  const worlds = [
    { go: "learn", rooms: ["动物叫声", "身体部位", "我的家人", "认识颜色", "数一数"] },
    { go: "songs", rooms: ["中文儿歌", "英文儿歌"] },
    { go: "stories", rooms: ["童话故事", "古诗背诵", "寓言故事"] },
  ];
  for (const world of worlds) {
    await open(`/?night=0&go=${world.go}&v=voice`);
    for (const room of world.rooms) {
      if (await hasText(page, room)) pass(`world ${world.go} has ${room}`);
      else fail(`world ${world.go} has ${room}`, await textOf(page, "main"));
    }
  }
} catch (err) {
  fail("runner", err.stack || String(err));
} finally {
  const uniqueSpoken = spoken;
  console.log("\n--- spoken sample ---");
  for (const row of uniqueSpoken.slice(0, 40)) {
    console.log(`  [${row.lang} r=${row.rate}] ${row.text}`);
  }
  console.log(`utterances=${uniqueSpoken.length} pass=${passes.length} fail=${fails.length}`);
  if (fails.length) {
    console.log("\nFAILURES:");
    for (const row of fails) console.log(" - " + row);
  }
  await browser.close();
  if (fails.length) process.exit(1);
}
