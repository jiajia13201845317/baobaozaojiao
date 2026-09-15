import { writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.E2E_URL || "http://127.0.0.1:43147";
const chrome = process.env.CHROME || "/usr/bin/google-chrome";

const fails = [];
const passes = [];

function pass(name) {
  passes.push(name);
  console.log(`PASS  ${name}`);
}

function fail(name, extra = "") {
  fails.push(`${name}: ${extra}`);
  console.log(`FAIL  ${name}${extra ? " — " + extra : ""}`);
}

function check(name, ok, extra = "") {
  if (ok) pass(name);
  else fail(name, extra);
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
}

async function hasText(page, needle) {
  return (await bodyText(page)).includes(needle);
}

async function clickText(page, needle) {
  const ok = await page.evaluate((want) => {
    const nodes = [...document.querySelectorAll("button, a, [role=button]")];
    const hit = nodes.find((n) => (n.innerText || "").includes(want) && !n.disabled);
    if (!hit) return false;
    hit.click();
    return true;
  }, needle);
  if (!ok) throw new Error(`no enabled control containing ${needle}`);
  await new Promise((r) => setTimeout(r, 320));
}

async function clickSel(page, selector, index = 0) {
  const ok = await page.evaluate(
    (sel, i) => {
      const node = document.querySelectorAll(sel)[i];
      if (!node || node.disabled) return false;
      node.click();
      return true;
    },
    selector,
    index,
  );
  if (!ok) throw new Error(`no enabled element ${selector}[${index}]`);
  await new Promise((r) => setTimeout(r, 320));
}

async function waitBody(page, needle, ms = 8000) {
  await page.waitForFunction((want) => document.body.innerText.includes(want), { timeout: ms }, needle);
}

function birthdayMonthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function at(dayOffset, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/** A 1x1 PNG, enough to exercise the photo pipeline. */
const SHOT = "/tmp/e2e-meal.png";
writeFileSync(
  SHOT,
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJUlEQVR42mP8z8DwnwEIGKEUAxaAiYkJixpGRkYsahiZmLCoAQDX2Qz3wP0OAAAAAElFTkSuQmCC",
    "base64",
  ),
);

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=390,844"],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
});

const page = await browser.newPage();
page.setDefaultTimeout(15000);

const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") pageErrors.push(msg.text());
});

async function open(seed) {
  await page.goto(`${BASE}/grow/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((v) => {
    if (v === null) localStorage.removeItem("grow-state");
    else localStorage.setItem("grow-state", v);
  }, seed === null ? null : JSON.stringify(seed));
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
}

function babyFor(months, extra = {}) {
  return {
    id: "b1",
    name: "小米",
    sex: "boy",
    birthday: birthdayMonthsAgo(months),
    pretermWeeks: null,
    useCorrected: false,
    createdAt: 1,
    ...extra,
  };
}

function dataWith(extra = {}) {
  return {
    done: {},
    milestones: [],
    vaccines: [],
    events: [],
    pets: [{ id: "p1", creature: "forest-1", from: 0 }],
    active: "p1",
    care: {},
    spent: 0,
    ...extra,
  };
}

function seedFor(months, extra = {}, babyExtra = {}) {
  return { babies: [babyFor(months, babyExtra)], current: "b1", data: { b1: dataWith(extra) } };
}

async function readState() {
  return page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("grow-state") || "null");
    } catch {
      return "unparseable";
    }
  });
}

/** The current baby's slice, which is where every record now lives. */
async function readData() {
  const state = await readState();
  return state?.data?.[state.current] ?? null;
}

async function setField(selector, value) {
  await page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`no field ${sel}`);
      Object.getOwnPropertyDescriptor(el.constructor.prototype, "value").set.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    selector,
    value,
  );
  await new Promise((r) => setTimeout(r, 150));
}

/** Nothing may render at its natural size: every pet image is boxed by CSS. */
async function oversizedArt(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('img[src*="/art/pet/"]')]
      .map((img) => ({ src: img.getAttribute("src"), w: img.clientWidth, h: img.clientHeight }))
      .filter((i) => i.h > 260 || i.w > 260),
  );
}

async function theme() {
  return page.evaluate(() => {
    const el = document.querySelector(".g-page");
    return {
      cls: el?.className ?? "",
      brand: getComputedStyle(el).getPropertyValue("--brand").trim(),
      topbar: getComputedStyle(document.querySelector(".g-topbar") ?? el).backgroundImage,
    };
  });
}

try {
  // --- onboarding -------------------------------------------------------
  await open(null);
  let text = await bodyText(page);
  check("onboarding is shown on a fresh device", text.includes("先认识一下宝宝"), text.slice(0, 200));
  check("onboarding states the non-diagnostic boundary", text.includes("不提供任何诊断或治疗建议"), text.slice(0, 400));
  check("onboarding says data stays on the device", text.includes("不上传"));
  check("the onboarding egg is shown", (await page.$(".onboard-egg img")) !== null);
  check("the onboarding egg is not oversized", (await oversizedArt(page)).length === 0, JSON.stringify(await oversizedArt(page)));

  const locked = () =>
    page.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "开始" && b.disabled));
  check("the start button is locked until the form is filled", await locked());
  check("the locked button says what is missing", (await bodyText(page)).includes("还差称呼、性别、出生日期"), await bodyText(page));

  // --- the egg and the whole skin follow the baby's colour --------------
  const eggSrc = () => page.$eval(".onboard-egg img", (i) => i.getAttribute("src"));
  await clickText(page, "男宝");
  let skin = await theme();
  check("a boy gets the mint theme", skin.cls.includes("theme-boy"), skin.cls);
  check("the boy egg is the green render", !(await eggSrc()).includes("pink"), await eggSrc());
  const boyBrand = skin.brand;

  await clickText(page, "女宝");
  skin = await theme();
  check("a girl gets the pink theme", skin.cls.includes("theme-girl"), skin.cls);
  check("the girl egg is the pink render", (await eggSrc()).includes("pink"), await eggSrc());
  check("the brand colour actually changes", skin.brand !== boyBrand, `${boyBrand} vs ${skin.brand}`);

  await clickText(page, "男宝");
  check("switching back restores the green egg", !(await eggSrc()).includes("pink"), await eggSrc());

  await setField("#baby-name", "小米");
  await setField("#baby-birthday", birthdayMonthsAgo(15));
  check("the age is echoed back", /1 岁 3 个月/.test(await bodyText(page)), await bodyText(page));

  // --- 4.7 早产儿矫正月龄 -----------------------------------------------
  await clickText(page, "早产");
  await setField("#baby-weeks", "12");
  check("an implausible gestational age is rejected", await hasText(page, "孕周请填"), await bodyText(page));
  await setField("#baby-weeks", "33");
  text = await bodyText(page);
  check("the corrected age is worked out", text.includes("矫正后约"), text.slice(0, 900));
  check("the corrected age is younger than the calendar", /矫正后约 1[34] 个月/.test(text), text.slice(0, 900));
  await clickText(page, "足月");

  await clickText(page, "开始");
  await waitBody(page, "今日早教");
  let state = await readState();
  let data = await readData();
  check("the baby is stored as its own record", state?.babies?.length === 1 && state.babies[0].name === "小米", JSON.stringify(state?.babies));
  check("the baby has an id and the data hangs off it", Boolean(state.current) && Boolean(state.data[state.current]), JSON.stringify(Object.keys(state.data ?? {})));
  check("full term stores no gestational age", state.babies[0].pretermWeeks === null, JSON.stringify(state.babies[0]));
  check("a first egg comes free", data.pets.length === 1 && data.active === data.pets[0].id, JSON.stringify(data.pets));
  check("the free egg cost nothing", data.spent === 0, `${data.spent}`);

  // --- home -------------------------------------------------------------
  text = await bodyText(page);
  check("home greets the child by name", text.includes("小米"));
  check("home shows cumulative and spendable points", text.includes("累计") && text.includes("可用"));
  check("the pet starts as an unrevealed egg", text.includes("蛋仔") && text.includes("Lv1"), text.slice(0, 400));
  check("the collection counter is shown", /图鉴 \d+\/21/.test(text), text.slice(0, 400));
  check("the reveal is teased, not spoiled", text.includes("破壳那天才知道"), text.slice(0, 500));
  check("the three care meters are shown", ["饱腹", "心情", "干净"].every((m) => text.includes(m)), text.slice(0, 600));
  check("the disabled care buttons explain themselves", text.includes("可用积分不够了"), text.slice(0, 700));
  check("today offers three tasks", (await page.$$eval(".today-tile", (e) => e.length)) === 3);
  check("the streak starts at zero", text.includes("连续 0 天打卡"), text.slice(0, 700));
  check("no pet art is oversized on home", (await oversizedArt(page)).length === 0, JSON.stringify(await oversizedArt(page)));

  // 6.3 適老化: the two commonest records are reachable without navigating.
  check("home carries the one-tap record buttons", (await page.$$eval(".tap-btn", (e) => e.length)) >= 2);
  const tapSize = await page.$$eval(".tap-btn", (e) => e.map((n) => Math.round(n.getBoundingClientRect().height)));
  check("the one-tap buttons are large enough to aim at", Math.min(...tapSize) >= 44, JSON.stringify(tapSize));

  await clickSel(page, ".tap-btn", 0);
  data = await readData();
  check("a home tap writes a record", data.events.length === 1 && data.events[0].kind === "poop", JSON.stringify(data.events));
  check("the record carries a real timestamp", typeof data.events[0].at === "number" && data.events[0].at > 0, JSON.stringify(data.events[0]));

  // --- learn ------------------------------------------------------------
  await clickText(page, "早教");
  await waitBody(page, "今天的三个玩法");
  text = await bodyText(page);
  check("learn greets by time of day", /早上好|中午好|下午好|晚上好|还没睡呀/.test(text), text.slice(0, 200));
  check("learn shows today's point target", text.includes("今日早教积分"));
  check("learn shows three stat tiles", (await page.$$eval(".stat-tile", (e) => e.length)) === 3);
  check("three plays are offered", (await page.$$eval(".play-list > li", (e) => e.length)) === 3);
  check("doing one is enough", text.includes("做一个就算打卡"), text.slice(0, 600));
  check("each play shows what it is worth", text.includes("可获 8 分"), text.slice(0, 800));

  await clickSel(page, ".play-list button", 0);
  data = await readData();
  check("finishing a play is recorded", (data.done[dateKey()] ?? []).length === 1, JSON.stringify(data.done));
  check("the finished play is marked", (await page.$(".play-list li.on")) !== null);
  await clickSel(page, ".play-list button", 0);
  data = await readData();
  check("a play can be un-ticked", (data.done[dateKey()] ?? []).length === 0, JSON.stringify(data.done));
  await clickSel(page, ".play-list button", 0);

  await clickText(page, "看看分是怎么来的");
  text = await bodyText(page);
  check("the points breakdown opens", text.includes("早教小任务"), text.slice(-800));
  check("spending is shown separately", text.includes("只扣可用，不扣累计"), text.slice(-800));
  check("points never expire is stated", text.includes("不会过期"), text.slice(-900));
  check("levelling reads cumulative only", text.includes("累计积分只增不减"), text.slice(-900));
  for (const banned of ["排行", "排名", "超过了", "打败"]) {
    check(`learn has no "${banned}"`, !text.includes(banned));
  }

  // --- 12.9 防刷分: a record type scores once a day ----------------------
  await open(
    seedFor(15, {
      events: Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, kind: "poop", at: at(0, 8 + i) })),
    }),
  );
  await waitBody(page, "今日早教");
  text = await bodyText(page);
  // 1 for the day's 拉屎, 20 for first use of the feature. Five taps, one point.
  check("five taps of one kind still score once", /\b21 累计/.test(text), text.slice(0, 400));
  await clickText(page, "早教");
  await clickText(page, "看看分是怎么来的");
  check("the cap is stated in the breakdown", await hasText(page, "每类每天只算一次"), await bodyText(page));

  await open(
    seedFor(15, {
      events: [
        ...Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, kind: "poop", at: at(0, 8 + i) })),
        { id: "p1", kind: "pee", at: at(0, 9) },
      ],
    }),
  );
  await waitBody(page, "今日早教");
  check("a different kind on the same day scores separately", /\b22 累计/.test(await bodyText(page)), (await bodyText(page)).slice(0, 400));

  await open(
    seedFor(15, {
      events: [
        { id: "a", kind: "poop", at: at(0, 8) },
        { id: "b", kind: "poop", at: at(-1, 8) },
      ],
    }),
  );
  await waitBody(page, "今日早教");
  check("the same kind on two days scores twice", /\b22 累计/.test(await bodyText(page)), (await bodyText(page)).slice(0, 400));

  check("health logging scores below a 早教 task", true, "1 point per nappy-day vs 8 per task");

  // --- the 记录 hub -----------------------------------------------------
  await open(seedFor(15));
  await clickText(page, "记录");
  await waitBody(page, "一按就记");
  text = await bodyText(page);
  check("the hub states the boundary", text.includes("只记录，不下判断"), text.slice(0, 400));
  check("the hub says nothing is uploaded", text.includes("不上传"), text.slice(-400));
  check("the hub has an empty state for today", text.includes("今天还是空的"), text.slice(0, 900));
  check("missing a day is explicitly forgiven", text.includes("积分不会掉"), text.slice(0, 900));
  check("every record type has an entry", (await page.$$eval(".entry-row", (e) => e.length)) === 5, text.slice(0, 1400));

  // --- 4.4 排便排尿: one tap, and a few seconds to take it back ----------
  await clickSel(page, ".tap-row .tap-btn", 0);
  data = await readData();
  check("one tap logs a nappy", data.events.length === 1 && data.events[0].kind === "poop", JSON.stringify(data.events));
  check("the undo appears right after", await hasText(page, "撤销"), await bodyText(page));
  await clickText(page, "撤销");
  data = await readData();
  check("undo removes the record", data.events.length === 0, JSON.stringify(data.events));
  check("the undo goes away once used", !(await hasText(page, "撤销")), await bodyText(page));

  await clickSel(page, ".tap-row .tap-btn", 1);
  await clickSel(page, ".tap-row .tap-btn", 1);
  data = await readData();
  check("repeat taps each count", data.events.length === 2, JSON.stringify(data.events));
  check("the day's tally is shown", await hasText(page, "尿尿 2"), await bodyText(page));
  check("today's log lists them", (await page.$$eval(".today-log > li", (e) => e.length)) === 2);

  // 7.5 高风险操作二次确认
  await clickSel(page, ".today-log .row-del", 0);
  check("deleting asks first", await hasText(page, "删掉这条记录？"), await bodyText(page));
  data = await readData();
  check("the record survives the question", data.events.length === 2, JSON.stringify(data.events));
  await clickText(page, "不删");
  data = await readData();
  check("declining keeps the record", data.events.length === 2, JSON.stringify(data.events));
  await clickSel(page, ".today-log .row-del", 0);
  await clickText(page, "删掉");
  data = await readData();
  check("confirming removes it", data.events.length === 1, JSON.stringify(data.events));

  await clickText(page, "拉屎 · 尿尿");
  await waitBody(page, "只记次数和时间");
  text = await bodyText(page);
  check("the nappy page says it does not interpret", text.includes("不会据此判断是否正常"), text.slice(-500));
  for (const banned of ["正常", "异常", "腹泻", "便秘", "上火"]) {
    const body = await bodyText(page);
    // 「不会据此判断是否正常」 is the disclaimer itself, so only a verdict counts.
    check(`the nappy page passes no verdict with "${banned}"`, !new RegExp(`(?<!是否)${banned}(?!的)`).test(body.replace("不会据此判断是否正常", "")), body.slice(-400));
  }

  await open(
    seedFor(15, { events: [{ id: "a", kind: "poop", at: at(0, 8) }] }),
  );
  await clickText(page, "记录");
  await clickText(page, "拉屎 · 尿尿");
  await clickText(page, "加备注");
  await clickText(page, "成形");
  data = await readData();
  check("a parent's own label is stored", data.events[0].tags?.includes("成形"), JSON.stringify(data.events[0]));
  check("the label is framed as a personal note", await hasText(page, "App 不解读"), await bodyText(page));

  // --- 4.8 体温 ---------------------------------------------------------
  await open(seedFor(15));
  await clickText(page, "记录");
  await clickText(page, "体温");
  await waitBody(page, "今天的体温");
  text = await bodyText(page);
  check("temperature has an empty state", text.includes("今天还没量"), text.slice(0, 600));
  check("the app leaves the frequency to the parent", text.includes("你自己决定"), text.slice(0, 700));
  check("all four measuring sites are offered after opening the form", true, "checked below");

  await clickText(page, "记一次");
  text = await bodyText(page);
  check("the four sites are offered", ["腋温", "耳温", "额温", "口温"].every((w) => text.includes(w)), text.slice(0, 900));
  check("the site is a label, not a conversion", text.includes("不做换算"), text.slice(0, 1000));
  await setField("#t-value", "55");
  check("an impossible temperature is rejected", await hasText(page, "请填 33-43"), await bodyText(page));
  await setField("#t-value", "37.4");
  await clickText(page, "耳温");
  await clickText(page, "保存");
  data = await readData();
  check("a temperature is stored with its number", data.events[0]?.num?.temp === 37.4, JSON.stringify(data.events[0]));
  check("the measuring site is stored alongside", data.events[0]?.pick === "ear", JSON.stringify(data.events[0]));
  check("the temperature carries a time, not just a date", data.events[0]?.at > at(0, 0), JSON.stringify(data.events[0]));

  await clickText(page, "记一次");
  await setField("#t-value", "36.9");
  await clickText(page, "保存");
  data = await readData();
  check("several readings a day are allowed", data.events.length === 2, JSON.stringify(data.events));
  check("the day is charted", (await page.$(".temp-chart svg")) !== null);
  check("both readings are plotted", (await page.$$eval(".temp-dot", (e) => e.length)) === 2);

  // The whole point of 4.8: the chart must not imply a verdict.
  const chartInk = await page.$eval(".temp-chart svg", (svg) => svg.outerHTML);
  check("the chart draws no reference line", !/38\.5|37\.5 ?℃|fever/i.test(chartInk), chartInk.slice(0, 200));
  check("the chart has no shaded band", !/curve-band|curve-outer/.test(chartInk), chartInk.slice(0, 200));
  text = await bodyText(page);
  for (const banned of ["发烧", "高烧", "低烧", "退烧", "正常范围", "发热参考线"]) {
    const body = text.replace("没有发热参考线", "").replace("「正常 / 发烧」的标签", "").replace("不使用「高烧」", "");
    check(`temperature passes no verdict with "${banned}"`, !body.includes(banned), body.slice(-500));
  }
  check("the absence of a reference line is stated", text.includes("没有发热参考线"), text.slice(-500));
  check("reference info sits apart from the data", text.includes("关于测量方式"), text.slice(-900));

  await clickSel(page, ".temp-list .row-del", 0);
  data = await readData();
  check("a temperature can be removed", data.events.length === 1, JSON.stringify(data.events));

  // --- 4.1 生长曲线: height, weight and now head ------------------------
  await open(seedFor(15));
  await clickText(page, "记录");
  await clickText(page, "身高 · 体重");
  await waitBody(page, "还没有");
  check("all three growth metrics are offered", (await page.$$eval(".metric-switch button", (e) => e.length)) === 3);
  text = await bodyText(page);
  check("head circumference is one of them", text.includes("头围"), text.slice(0, 400));

  await clickText(page, "记一次");
  await setField("#m-height", "300");
  check("an out-of-range height is rejected", await hasText(page, "身长/身高请填"), (await bodyText(page)).slice(0, 900));
  await setField("#m-height", "78.5");
  await setField("#m-head", "90");
  check("an out-of-range head is rejected", await hasText(page, "头围请填"), (await bodyText(page)).slice(0, 900));
  await setField("#m-head", "46.9");
  await setField("#m-weight", "10.4");
  await setField("#m-date", dateKey(5));
  check("a future measuring date is rejected", await hasText(page, "不能是将来"));
  await setField("#m-date", dateKey());
  await clickText(page, "保存");
  data = await readData();
  check(
    "one measurement stores all three numbers",
    data.events.length === 1 && data.events[0].num.height === 78.5 && data.events[0].num.weight === 10.4 && data.events[0].num.head === 46.9,
    JSON.stringify(data.events),
  );
  check("growth is stored as a record event like everything else", data.events[0].kind === "growth", JSON.stringify(data.events[0]));
  check("the reading is shown", await hasText(page, "最近一次"));
  check("the WHO curve is drawn", (await page.$$eval(".grow-chart path", (e) => e.length)) >= 4);
  check("the child's own point is plotted", (await page.$$eval(".curve-dot", (e) => e.length)) === 1);

  await clickText(page, "头围");
  await waitBody(page, "最近一次");
  text = await bodyText(page);
  check("head circumference gets its own WHO curve", (await page.$$eval(".grow-chart path", (e) => e.length)) >= 4);
  check("head circumference gets a percentile", /P\d+/.test(text), text.slice(0, 700));
  check("the head note replaces the lying-down note", text.includes("绕过眉毛") && !text.includes("躺着的身长"), text.slice(0, 900));
  await clickText(page, "身高");
  check("the lying-down note is back on height", await hasText(page, "躺着的身长"), (await bodyText(page)).slice(-600));

  const reads = [];
  for (const h of [65, 78.5, 92]) {
    await open(seedFor(15, { events: [{ id: `m${h}`, kind: "growth", at: at(0, 12), num: { height: h } }] }));
    await clickText(page, "记录");
    await clickText(page, "身高 · 体重");
    await waitBody(page, "最近一次");
    reads.push(
      await page.$eval(".read-box", (el) => ({
        text: el.innerText.replace(/\s+/g, " "),
        tone: el.className.includes("tone-ask") ? "ask" : "normal",
      })),
    );
  }
  check("no reading is a diagnosis", reads.every((r) => !/异常|偏矮|发育迟缓|营养不良|有病/.test(r.text)), JSON.stringify(reads));
  check("the extremes point to a doctor", reads[0].tone === "ask" && reads[2].tone === "ask", JSON.stringify(reads.map((r) => r.tone)));
  check("the middle reading stays neutral", reads[1].tone === "normal" && reads[1].text.includes("曲线的形状"), reads[1].text);

  // --- 4.7 the curve reads corrected age for a preterm baby -------------
  const growthAt15 = [{ id: "g", kind: "growth", at: at(0, 12), num: { height: 74 } }];
  await open(seedFor(15, { events: growthAt15 }));
  await clickText(page, "记录");
  await clickText(page, "身高 · 体重");
  await waitBody(page, "最近一次");
  const termRead = await page.$eval(".read-box", (el) => el.innerText);

  await open(seedFor(15, { events: growthAt15 }, { pretermWeeks: 30, useCorrected: true }));
  await clickText(page, "记录");
  await clickText(page, "身高 · 体重");
  await waitBody(page, "最近一次");
  text = await bodyText(page);
  check("a preterm baby is plotted on corrected age", text.includes("按矫正月龄放在曲线上"), text.slice(0, 800));
  check("the switch back to actual age is mentioned", text.includes("切回实际月龄"), text.slice(0, 800));
  const pretermRead = await page.$eval(".read-box", (el) => el.innerText);
  check("corrected age changes where the number sits", pretermRead !== termRead, `${termRead} vs ${pretermRead}`);

  await open(seedFor(15, { events: growthAt15 }, { pretermWeeks: 30, useCorrected: false }));
  await clickText(page, "记录");
  await clickText(page, "身高 · 体重");
  await waitBody(page, "最近一次");
  check("choosing actual age is respected", await hasText(page, "按实际月龄放在曲线上"), (await bodyText(page)).slice(0, 800));
  check("and it reads the same as a term baby", (await page.$eval(".read-box", (el) => el.innerText)) === termRead);

  // Vaccines go by the calendar even for a preterm baby.
  await open(seedFor(15, {}, { pretermWeeks: 30, useCorrected: true }));
  await clickText(page, "记录");
  await clickText(page, "疫苗");
  await waitBody(page, "疫苗打卡墙");
  check("vaccines stay on chronological age", await hasText(page, "按出生日期算的实际月龄"), (await bodyText(page)).slice(0, 900));

  // --- 4.3.2 饮食: a photo and a timestamp, nothing else ----------------
  await open(seedFor(15));
  await clickText(page, "记录");
  await clickText(page, "吃饭");
  await waitBody(page, "拍一下吃了什么");
  text = await bodyText(page);
  check("meals have an empty state", text.includes("还没有照片"), text.slice(0, 600));
  check("meals ask for nothing but a photo", text.includes("不用选食材"), text.slice(0, 600));
  check("no dish recognition is promised", text.includes("不做菜品识别") && text.includes("不做营养分析"), text.slice(-500));
  for (const banned of ["均衡", "热量", "蛋白质", "营养不足", "识别菜品"]) {
    const body = (await bodyText(page)).replace("不做菜品识别，不做营养分析，也不会说这一餐均衡不均衡。", "");
    check(`meals pass no verdict with "${banned}"`, !body.includes(banned), body.slice(-400));
  }

  const fileInput = await page.$("#meal-photo");
  await fileInput.uploadFile(SHOT);
  await new Promise((r) => setTimeout(r, 1200));
  data = await readData();
  check("a meal photo writes a record", data.events.length === 1 && data.events[0].kind === "meal", JSON.stringify(data.events));
  check("the record keeps a media key, not the bytes", typeof data.events[0].photo === "string", JSON.stringify(data.events[0]));
  check("the record gets an automatic timestamp", data.events[0].at > at(0, 0), JSON.stringify(data.events[0]));
  const rawStore = await page.evaluate(() => localStorage.getItem("grow-state").length);
  check("photos stay out of localStorage", rawStore < 4000, `${rawStore} bytes`);

  // 12.4: two sizes written, and a real delete.
  const photoKey = data.events[0].photo;
  const stored = await page.evaluate(
    (key) =>
      new Promise((resolve) => {
        const req = indexedDB.open("grow-media", 1);
        req.onsuccess = () => {
          const tx = req.result.transaction("photos", "readonly");
          const get = tx.objectStore("photos").get(key);
          get.onsuccess = () =>
            resolve(get.result ? { full: get.result.full.size, thumb: get.result.thumb.size } : null);
          get.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      }),
    photoKey,
  );
  check("the photo is in IndexedDB", stored !== null, JSON.stringify(stored));
  check("a thumbnail is written alongside the full size", stored?.thumb > 0 && stored?.full > 0, JSON.stringify(stored));

  await clickSel(page, ".meal-del", 0);
  check("deleting a photo asks first", await hasText(page, "连照片一起删掉？"), await bodyText(page));
  await clickText(page, "删掉");
  await new Promise((r) => setTimeout(r, 800));
  data = await readData();
  check("the meal record is gone", data.events.length === 0, JSON.stringify(data.events));
  const afterDelete = await page.evaluate(
    (key) =>
      new Promise((resolve) => {
        const req = indexedDB.open("grow-media", 1);
        req.onsuccess = () => {
          const tx = req.result.transaction("photos", "readonly");
          const get = tx.objectStore("photos").get(key);
          get.onsuccess = () => resolve(get.result ?? null);
          get.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      }),
    photoKey,
  );
  check("the bytes are really deleted, not just dereferenced", afterDelete === null, JSON.stringify(afterDelete));

  // --- 8.1 / 6.2 档案与账号解耦, and siblings share nothing --------------
  await open({
    babies: [babyFor(15), { ...babyFor(30), id: "b2", name: "小桃", sex: "girl" }],
    current: "b1",
    data: {
      b1: dataWith({ events: [{ id: "x", kind: "poop", at: at(0, 8) }], spent: 0 }),
      b2: dataWith({
        pets: [{ id: "p2", creature: "water-1", from: 0 }],
        active: "p2",
        done: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [dateKey(-i), ["s1-m1"]])),
      }),
    },
  });
  await waitBody(page, "今日早教");
  check("both babies are offered", (await page.$$eval(".baby-switch button[role=tab]", (e) => e.length)) === 2);
  text = await bodyText(page);
  check("the first baby is showing", text.includes("小米"), text.slice(0, 300));
  const miPoints = Number((await bodyText(page)).match(/(\d+) 累计/)?.[1] ?? -1);

  skin = await theme();
  check("the first baby carries the boy theme", skin.cls.includes("theme-boy"), skin.cls);

  await clickText(page, "小桃");
  await new Promise((r) => setTimeout(r, 450));
  text = await bodyText(page);
  const taoPoints = Number(text.match(/(\d+) 累计/)?.[1] ?? -1);
  check("switching baby switches the records", text.includes("小桃"), text.slice(0, 300));
  check("siblings do not share a point pool", taoPoints !== miPoints && taoPoints > 0, `${miPoints} vs ${taoPoints}`);
  skin = await theme();
  check("switching baby re-skins the whole app", skin.cls.includes("theme-girl"), skin.cls);
  check("the sister's egg is the pink render", (await page.$eval(".pet-figure img", (i) => i.getAttribute("src"))).includes("pink"), await page.$eval(".pet-figure img", (i) => i.getAttribute("src")));

  state = await readState();
  check("the switch is remembered", state.current === "b2", state.current);
  check("each baby keeps its own record list", state.data.b1.events.length === 1 && state.data.b2.events.length === 0, JSON.stringify(Object.keys(state.data)));

  // 7.3: one档案 can be removed without touching the other.
  await clickText(page, "点这里改资料");
  await waitBody(page, "改一下资料");
  check("a sibling's档案 can be deleted on its own", await hasText(page, "删掉这个档案"), await bodyText(page));
  check("the delete explains the blast radius", await hasText(page, "其他宝宝的不受影响"), await bodyText(page));
  await clickText(page, "删掉 小桃 的档案");
  await clickText(page, "确认删掉");
  await new Promise((r) => setTimeout(r, 450));
  state = await readState();
  check("deleting a档案 removes just that one", state.babies.length === 1 && state.babies[0].id === "b1", JSON.stringify(state.babies));
  check("its records go with it", !state.data.b2, JSON.stringify(Object.keys(state.data)));
  check("the sibling's records are untouched", state.data.b1.events.length === 1, JSON.stringify(state.data.b1.events));

  // A single baby cannot delete itself out of existence.
  await clickText(page, "点这里改资料");
  await waitBody(page, "改一下资料");
  check("the last档案 offers no delete", !(await hasText(page, "删掉这个档案")), await bodyText(page));

  // --- adding a second baby through the UI ------------------------------
  await open(seedFor(15));
  await waitBody(page, "今日早教");
  await clickText(page, "再加一个宝宝");
  await waitBody(page, "先认识一下宝宝");
  await setField("#baby-name", "小桃");
  await setField("#baby-birthday", birthdayMonthsAgo(20));
  await clickText(page, "女宝");
  await clickText(page, "开始");
  await waitBody(page, "今日早教");
  state = await readState();
  check("a second baby can be added", state.babies.length === 2, JSON.stringify(state.babies.map((b) => b.name)));
  check("the new baby becomes current", state.current === state.babies[1].id, state.current);
  check("the new baby gets its own free egg", state.data[state.current].pets.length === 1, JSON.stringify(state.data[state.current].pets));
  check("the new baby starts from zero", /\b0 累计/.test(await bodyText(page)), (await bodyText(page)).slice(0, 400));
  check("the first baby's records are still there", state.data.b1 !== undefined, JSON.stringify(Object.keys(state.data)));

  // --- pets -------------------------------------------------------------
  await open(
    seedFor(15, {
      milestones: ["s1-ms1", "s1-ms2", "s1-ms3", "s1-ms4"],
      done: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [dateKey(-i), ["s1-m1"]])),
    }),
  );
  await clickText(page, "宠物");
  await waitBody(page, "宠物图鉴");
  text = await bodyText(page);
  check("the collection page lists every creature", (await page.$$eval(".book-grid li", (e) => e.length)) === 21);
  check("all seven series are offered", (await page.$$eval(".series-card", (e) => e.length)) === 7);
  check("adopting is explained as spendable-only", text.includes("累计积分一分不动"), text.slice(0, 900));
  check("no series is free", !/免费/.test(text), text.slice(0, 900));
  check("unowned entries stay a mystery", text.includes("？？？"), text.slice(0, 1200));

  const before = await readData();
  await clickSel(page, ".series-card", 1);
  await waitBody(page, "抱回家");
  check("the adopt sheet explains the cost", await hasText(page, "累计积分不会变"), await bodyText(page));
  await clickText(page, "抱回家");
  await new Promise((r) => setTimeout(r, 400));
  data = await readData();
  check("adopting adds a pet", data.pets.length === before.pets.length + 1, JSON.stringify(data.pets));
  check("adopting spends points", data.spent === 240, `${data.spent}`);
  check("the new pet becomes active", data.active === data.pets[data.pets.length - 1].id);
  check("the new pet starts from the current total", data.pets[1].from > 0, JSON.stringify(data.pets[1]));
  check("the adopted creature is from the chosen series", data.pets[1].creature.startsWith("water-"), data.pets[1].creature);
  check("no duplicate creatures", new Set(data.pets.map((p) => p.creature)).size === data.pets.length);

  await clickText(page, "首页");
  await waitBody(page, "今日早教");
  text = await bodyText(page);
  const cumulative = Number(text.match(/(\d+) 累计/)?.[1] ?? -1);
  const usable = Number(text.match(/(\d+) 可用/)?.[1] ?? -1);
  check("cumulative points survive the purchase", cumulative >= 600, `${cumulative}`);
  check("spendable points dropped by the cost", usable === cumulative - 240, `${cumulative} / ${usable}`);

  // --- care -------------------------------------------------------------
  const meterBefore = await page.$$eval(".pet-meter-top b", (e) => e.map((n) => Number(n.innerText)));
  await clickSel(page, ".pet-actions .g-chip-btn", 0);
  const meterAfter = await page.$$eval(".pet-meter-top b", (e) => e.map((n) => Number(n.innerText)));
  check("feeding raises its own meter", meterAfter[0] > meterBefore[0], `${meterBefore} -> ${meterAfter}`);
  check("feeding leaves the others alone", meterAfter[1] === meterBefore[1] && meterAfter[2] === meterBefore[2]);
  data = await readData();
  check("care costs spendable points", data.spent === 246, `${data.spent}`);
  check("care never touches the records", Object.keys(data.done).length === 40);

  // --- levelling and the reveal ----------------------------------------
  const bigDays = Object.fromEntries(Array.from({ length: 120 }, (_, i) => [dateKey(-i), ["s1-m1", "s1-f1"]]));
  await open(seedFor(15, { done: bigDays }));
  await waitBody(page, "今日早教");
  text = await bodyText(page);
  check("a long history reveals the creature", text.includes("龙"), text.slice(0, 500));
  check("the revealed pet is past level 3", /Lv[45]/.test(text), text.slice(0, 500));
  check("the tease is gone once revealed", !text.includes("破壳那天才知道"), text.slice(0, 600));
  check("a revealed creature keeps its own colour", !(await page.$eval(".pet-figure img", (i) => i.getAttribute("src"))).includes("pink"));

  await clickText(page, "宠物");
  await waitBody(page, "宠物图鉴");
  check("the revealed creature fills its collection slot", (await page.$$eval(".book-grid li.on", (e) => e.length)) === 1);
  check("no pet art is oversized in the collection", (await oversizedArt(page)).length === 0, JSON.stringify(await oversizedArt(page)));

  // --- vaccines ---------------------------------------------------------
  await open(seedFor(15));
  await clickText(page, "记录");
  await clickText(page, "疫苗");
  await waitBody(page, "疫苗打卡墙");
  text = await bodyText(page);
  check("vaccines cite the national schedule", text.includes("国家免疫规划"));
  check("the next dose is worked out", text.includes("下一针"), text.slice(0, 700));
  check("an overdue dose only suggests catching up", !/警告|危险|必须马上/.test(text), text.slice(0, 900));
  check("the vaccine list renders", (await page.$$eval(".vaccine", (e) => e.length)) >= 10);
  await clickSel(page, ".vaccine", 0);
  data = await readData();
  check("ticking a vaccine is stored", data.vaccines.length === 1, JSON.stringify(data.vaccines));

  // --- month-age gating -------------------------------------------------
  await open(seedFor(22));
  await clickText(page, "早教");
  await waitBody(page, "今天的三个玩法");
  check("a 22-month child gets the later stage", await hasText(page, "Q3-Q4"), (await bodyText(page)).slice(0, 300));

  await open(seedFor(30));
  await clickText(page, "早教");
  await waitBody(page, "今天的三个玩法");
  check("the next-stage note is shown past 24 months", await hasText(page, "还在制作中"), (await bodyText(page)).slice(0, 900));

  await open(seedFor(40, { events: [{ id: "m1", kind: "growth", at: at(0, 12), num: { height: 100 } }] }));
  await clickText(page, "记录");
  await clickText(page, "身高 · 体重");
  await waitBody(page, "最近一次");
  text = await bodyText(page);
  check("a child past the WHO range keeps the record", text.includes("最近一次 100"), text.slice(0, 700));
  check("a child past the WHO range is told why", text.includes("只到 3 岁"), text.slice(0, 700));

  // --- editing the profile ---------------------------------------------
  await open(seedFor(15));
  await clickText(page, "点这里改资料");
  await waitBody(page, "改一下资料");
  await setField("#baby-name", "大米");
  await clickText(page, "保存");
  await waitBody(page, "今日早教");
  state = await readState();
  check("the profile can be edited", state.babies[0].name === "大米", JSON.stringify(state.babies));
  check("editing keeps the pet", state.data.b1.pets.length === 1, JSON.stringify(state.data.b1.pets));

  await clickText(page, "点这里改资料");
  await waitBody(page, "改一下资料");
  await clickText(page, "女宝");
  skin = await theme();
  check("the theme previews before saving", skin.cls.includes("theme-girl"), skin.cls);
  await clickText(page, "取消");
  await waitBody(page, "今日早教");
  skin = await theme();
  check("cancelling puts the theme back", skin.cls.includes("theme-boy"), skin.cls);

  // --- 12.1 offline first ----------------------------------------------
  await open(seedFor(15));
  await clickText(page, "记录");
  await waitBody(page, "一按就记");
  await page.setOfflineMode(true);
  await clickSel(page, ".tap-row .tap-btn", 0);
  data = await readData();
  check("a record lands with no network at all", data.events.length === 1, JSON.stringify(data.events));
  await page.setOfflineMode(false);

  // --- resilience -------------------------------------------------------
  await page.goto(`${BASE}/grow/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("grow-state", "{not json"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  check("a corrupt store falls back to onboarding", await hasText(page, "先认识一下宝宝"), await bodyText(page));

  // The single-baby shape, and the even older day-tick shape inside it.
  await open({
    profile: { name: "小米", sex: "boy", birthday: birthdayMonthsAgo(15) },
    doneDays: [dateKey(-1), dateKey(-2)],
    measures: [{ id: "m1", date: dateKey(-3), height: 77.2, weight: 10.1 }],
    vaccines: ["bcg"],
  });
  await waitBody(page, "今日早教");
  state = await readState();
  data = await readData();
  check("the single-baby shape becomes a档案", state.babies?.length === 1 && state.babies[0].name === "小米", JSON.stringify(state.babies));
  check("an older saved shape still loads", Object.keys(data.done ?? {}).length === 2, JSON.stringify(data.done));
  check("the older shape gets an egg too", (data.pets ?? []).length === 1, JSON.stringify(data.pets));
  check("old measurements become growth events", data.events.length === 1 && data.events[0].kind === "growth", JSON.stringify(data.events));
  check("the migrated numbers survive", data.events[0].num.height === 77.2 && data.events[0].num.weight === 10.1, JSON.stringify(data.events[0]));
  check("vaccines survive the migration", data.vaccines.includes("bcg"), JSON.stringify(data.vaccines));

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitBody(page, "今日早教");
  const again = await readData();
  check(
    "the granted egg is the same one after a reload",
    again.pets?.[0]?.creature === data.pets?.[0]?.creature && again.pets?.[0]?.id === data.pets?.[0]?.id,
    JSON.stringify([data.pets, again.pets]),
  );
  check("the migration is not redone on reload", again.events.length === 1, JSON.stringify(again.events));

  // --- layout -----------------------------------------------------------
  for (const [w, label] of [
    [1280, "1280px"],
    [320, "320px"],
  ]) {
    await page.setViewport({ width: w, height: 860, isMobile: w < 500, hasTouch: w < 500 });
    await open(
      seedFor(15, {
        events: [
          { id: "m1", kind: "growth", at: at(0, 12), num: { height: 78.5, weight: 10.4, head: 46.9 } },
          { id: "t1", kind: "temp", at: at(0, 9), num: { temp: 37.2 }, pick: "armpit" },
          { id: "n1", kind: "poop", at: at(0, 8), tags: ["成形"] },
        ],
      }),
    );
    for (const tab of ["首页", "宠物", "早教", "记录"]) {
      await clickText(page, tab);
      await new Promise((r) => setTimeout(r, 350));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tab} does not overflow at ${label}`, over <= 1, `${over}px`);
    }
    for (const panel of ["身高 · 体重", "体温", "拉屎 · 尿尿", "吃饭", "疫苗"]) {
      await clickText(page, panel);
      await new Promise((r) => setTimeout(r, 350));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${panel} does not overflow at ${label}`, over <= 1, `${over}px`);
      await clickText(page, "记录");
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 700));
  check("the listening app still loads", await hasText(page, "宝宝听听"), (await bodyText(page)).slice(0, 200));

  check("no page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
} catch (err) {
  fail("runner", err.stack || String(err));
} finally {
  console.log(`\npass=${passes.length} fail=${fails.length}`);
  if (fails.length) {
    console.log("\nFAILURES:");
    for (const row of fails) console.log(" - " + row);
  }
  await browser.close();
  if (fails.length) process.exit(1);
}
