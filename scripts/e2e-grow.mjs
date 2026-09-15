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
  if (!ok) {
    const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    throw new Error(`no enabled control containing ${needle} — page says: ${body.slice(0, 300)}`);
  }
  await new Promise((r) => setTimeout(r, 320));
}

/**
 * Tabs are clicked through the tab bar rather than by text, because 我的 has a
 * 照片记录 toggle whose label also contains 记录 and sits earlier in the DOM.
 */
async function clickTab(page, name) {
  const ok = await page.evaluate((want) => {
    const hit = [...document.querySelectorAll(".g-tabs button")].find((n) => (n.innerText || "").includes(want));
    if (!hit) return false;
    hit.click();
    return true;
  }, name);
  if (!ok) throw new Error(`no tab named ${name}`);
  await new Promise((r) => setTimeout(r, 340));
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

/** Consent is granted in seeds so each test exercises its own screen, not the gate. */
function settingsWith(extra = {}) {
  return {
    mode: "full",
    bilingual: false,
    lockPin: null,
    tempReminder: { on: false, every: 60 },
    ...extra,
    consent: {
      basic: true,
      personalized: true,
      photos: true,
      notify: false,
      guardianAt: 1,
      ...(extra.consent ?? {}),
    },
  };
}

function seedFor(months, extra = {}, babyExtra = {}, settingsExtra = {}) {
  return {
    babies: [babyFor(months, babyExtra)],
    current: "b1",
    data: { b1: dataWith(extra) },
    settings: settingsWith(settingsExtra),
    carers: [],
    by: null,
    log: [],
  };
}

/** Clears the consent gate, for the tests whose subject is what comes after it. */
async function openFresh() {
  await open(null);
  await clickText(page, "基础记录");
  await clickText(page, "照片记录");
  await clickText(page, "我是这个孩子的父母或监护人");
  await clickText(page, "知道了，开始用");
  await new Promise((r) => setTimeout(r, 400));
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
  await openFresh();
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
  await clickTab(page, "早教");
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
  await clickTab(page, "早教");
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
  check("every record type has an entry", (await page.$$eval(".entry-row", (e) => e.length)) === 7, text.slice(0, 1400));

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

  // --- 4.3 饮食: labels the parent picked, and nothing inferred ---------
  await open(seedFor(15));
  await clickText(page, "记录");
  await clickText(page, "饮食");
  await waitBody(page, "哪一餐");
  text = await bodyText(page);
  check("the diet page has an empty state", text.includes("今天还没记"), text.slice(0, 600));
  check("a meal can be logged without a photo", text.includes("记下这一餐"), text.slice(0, 600));
  check("no dish recognition is promised", text.includes("不做菜品识别") && text.includes("不做营养分析"), text.slice(-500));
  for (const banned of ["均衡", "热量", "蛋白质", "营养不足", "识别菜品"]) {
    const body = (await bodyText(page)).replace("不做菜品识别，不做营养分析，也不会说哪一餐够不够均衡。", "");
    check(`meals pass no verdict with "${banned}"`, !body.includes(banned), body.slice(-400));
  }

  const fileInput = await page.$("#meal-photo");
  await fileInput.uploadFile(SHOT);
  await new Promise((r) => setTimeout(r, 1200));
  data = await readData();
  check("a meal photo writes a record", data.events.length === 1 && data.events[0].kind === "meal", JSON.stringify(data.events));
  check("the photo is filed under a 餐次", typeof data.events[0].pick === "string", JSON.stringify(data.events[0]));
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

  await clickText(page, "时间线");
  await waitBody(page, "今天");
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
  await clickSel(page, ".pet-book");
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

  await clickTab(page, "首页");
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

  // --- moods and acts ---------------------------------------------------
  // Everything here is behaviour, so it is asserted through what the pose and
  // the words actually are at a given moment rather than through the store.
  const DAY = 86400000;
  const careDays = (ago) => ({
    p1: { food: { at: Date.now() - ago * DAY, value: 100 }, play: { at: Date.now() - ago * DAY, value: 100 }, bath: { at: Date.now() - ago * DAY, value: 100 } },
  });
  const pet = () =>
    page.evaluate(() => ({
      mood: document.querySelector(".pet-mood")?.innerText.trim() ?? null,
      line: document.querySelector(".pet-say")?.innerText.trim() ?? null,
      act: [...(document.querySelector(".pet-figure")?.classList ?? [])].find((c) => c.startsWith("act-")) ?? null,
      window: [...(document.querySelector(".pet-window")?.classList ?? [])].find((c) => c.startsWith("mood-")) ?? null,
      cloud: !!document.querySelector(".pet-cloud"),
      bits: document.querySelector(".pet-bits")?.className ?? null,
      want: document.querySelector(".pet-meter.is-want .pet-meter-top span")?.innerText.trim() ?? null,
    }));
  const spendy = { done: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [dateKey(-i), ["s1-m1", "s1-f1"]])) };

  await open(seedFor(15, { ...spendy, care: careDays(0) }));
  await waitBody(page, "今日早教");
  let now = await pet();
  check("a well-kept pet is happy", now.mood === "开心" && now.window === "mood-happy", JSON.stringify(now));
  check("a happy pet gets no rain cloud", !now.cloud, JSON.stringify(now));

  // Nine days of drift puts every meter on its floor, which is as low as the
  // model ever goes — there is no sick or dying state below this.
  await open(seedFor(15, { ...spendy, care: careDays(9) }));
  await waitBody(page, "今日早教");
  now = await pet();
  check("a neglected pet looks down", now.mood === "低落" && now.window === "mood-down", JSON.stringify(now));
  check("a down pet gets the rain cloud", now.cloud, JSON.stringify(now));
  check("a down pet is never called sick", !/生病|病了|危险|快死|活不/.test(await bodyText(page)), (await bodyText(page)).slice(0, 700));
  check("the meters are stated as cosmetic only", await hasText(page, "不影响进化"), (await bodyText(page)).slice(0, 900));
  check("neglect is framed as missing you", await hasText(page, "它只是想你了"), (await bodyText(page)).slice(0, 900));

  // The point of the split-out score: one empty meter has to read as low even
  // while the other two are full, or the pet says it is hungry and looks fine.
  await open(seedFor(15, { ...spendy, care: { p1: { food: { at: Date.now() - 9 * DAY, value: 100 }, play: { at: Date.now(), value: 100 }, bath: { at: Date.now(), value: 100 } } } }));
  await waitBody(page, "今日早教");
  now = await pet();
  check("one empty meter is enough to look down", now.mood === "低落", JSON.stringify(now));
  check("the thinnest meter is marked", now.want === "饱腹", JSON.stringify(now));
  check("a hungry pet says so", /肚子|嘴巴|你的手/.test(now.line), JSON.stringify(now));

  // Feeding has to read as a win immediately, even from the floor.
  await open(seedFor(15, { ...spendy, care: careDays(9) }));
  await waitBody(page, "今日早教");
  await clickSel(page, ".pet-actions .g-chip-btn", 0);
  await new Promise((r) => setTimeout(r, 300));
  now = await pet();
  check("feeding plays an eating pose", now.act === "act-eat", JSON.stringify(now));
  check("feeding drops crumbs", now.bits === "pet-bits bits-eat", JSON.stringify(now));
  check("feeding makes it happy on the spot", now.mood === "开心", JSON.stringify(now));
  check("the rain stops when it is fed", !now.cloud, JSON.stringify(now));
  check("feeding says something about eating", /吃|嚼/.test(now.line), JSON.stringify(now));

  await clickSel(page, ".pet-actions .g-chip-btn", 1);
  await new Promise((r) => setTimeout(r, 300));
  now = await pet();
  check("playing plays its own pose", now.act === "act-play" && now.bits === "pet-bits bits-play", JSON.stringify(now));

  await clickSel(page, ".pet-actions .g-chip-btn", 2);
  await new Promise((r) => setTimeout(r, 300));
  now = await pet();
  check("bathing plays its own pose", now.act === "act-bath" && now.bits === "pet-bits bits-bath", JSON.stringify(now));

  // Poking is the first thing anyone tries and the one interaction that is free.
  await open(seedFor(15, { ...spendy, care: careDays(9) }));
  await waitBody(page, "今日早教");
  const beforePoke = await readData();
  await clickSel(page, ".pet-figure");
  await new Promise((r) => setTimeout(r, 200));
  now = await pet();
  check("the pet answers a poke", now.act === "act-poke", JSON.stringify(now));
  check("poking costs nothing", (await readData()).spent === beforePoke.spent);
  check("a poked low pet is not scolded back", !/别碰|讨厌|烦/.test(now.line), JSON.stringify(now));

  // It has to move on its own, which is the whole difference between a pet and
  // a picture. Sampled over a window rather than at one instant, because the
  // idle timer is deliberately randomised.
  const poses = await page.evaluate(async () => {
    const seen = new Set();
    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 400));
      const f = document.querySelector(".pet-figure");
      seen.add([...f.classList].find((c) => c.startsWith("act-")));
    }
    return [...seen];
  });
  check("the pet acts on its own without being touched", poses.length > 1, poses.join(", "));
  check("unprompted acts come from the idle set", poses.every((p) => ["act-idle", "act-stretch", "act-hop", "act-wiggle", "act-peek", "act-spin", "act-yawn"].includes(p)), poses.join(", "));

  // --- levelling and the reveal ----------------------------------------
  const bigDays = Object.fromEntries(Array.from({ length: 120 }, (_, i) => [dateKey(-i), ["s1-m1", "s1-f1"]]));
  await open(seedFor(15, { done: bigDays }));
  await waitBody(page, "今日早教");
  text = await bodyText(page);
  check("a long history reveals the creature", text.includes("龙"), text.slice(0, 500));
  check("the revealed pet is past level 3", /Lv[45]/.test(text), text.slice(0, 500));
  check("the tease is gone once revealed", !text.includes("破壳那天才知道"), text.slice(0, 600));
  check("a revealed creature keeps its own colour", !(await page.$eval(".pet-figure img", (i) => i.getAttribute("src"))).includes("pink"));

  await clickSel(page, ".pet-book");
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
  await clickTab(page, "早教");
  await waitBody(page, "今天的三个玩法");
  check("a 22-month child gets the later stage", await hasText(page, "Q3-Q4"), (await bodyText(page)).slice(0, 300));

  await open(seedFor(30));
  await clickTab(page, "早教");
  await waitBody(page, "今天的三个玩法");
  check(
    "a family past 24 months is told the content is complete",
    await hasText(page, "陪到 3 岁就齐了"),
    (await bodyText(page)).slice(0, 900),
  );

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
  // An unreadable store means we no longer know what was agreed to, so the
  // gate is the right landing place rather than straight into onboarding.
  check("a corrupt store falls back to the consent gate", await hasText(page, "先说清楚数据的事"), await bodyText(page));

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
    for (const tab of ["首页", "早教", "记录", "我的"]) {
      await clickTab(page, tab);
      await new Promise((r) => setTimeout(r, 350));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tab} does not overflow at ${label}`, over <= 1, `${over}px`);
    }
    await clickTab(page, "记录");
    for (const panel of ["身高 · 体重", "体温", "拉屎 · 尿尿", "饮食", "睡觉 · 喂奶喝水", "大动作", "疫苗"]) {
      await clickText(page, panel);
      await new Promise((r) => setTimeout(r, 350));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${panel} does not overflow at ${label}`, over <= 1, `${over}px`);
      await clickText(page, "记录");
      await new Promise((r) => setTimeout(r, 250));
    }
  }


  // ---------- 7.1 consent gate ----------
  {
    await open(null);
    const gated = await hasText(page, "先说清楚数据的事");
    check("a fresh install meets the consent gate first", gated, (await bodyText(page)).slice(0, 120));

    const preTicked = await page.evaluate(
      () => document.querySelectorAll('.consent-box.on, .toggle-row.on').length,
    );
    check("nothing on the consent gate is pre-ticked", preTicked === 0, `${preTicked} already on`);

    const blocked = await page.evaluate(() =>
      [...document.querySelectorAll("button")].some((b) => b.innerText.includes("知道了") && b.disabled),
    );
    check("the gate will not open until the parent chooses", blocked);

    await clickText(page, "基础记录");
    await clickText(page, "我是这个孩子的父母或监护人");
    await clickText(page, "知道了，开始用");
    await new Promise((r) => setTimeout(r, 400));
    check("agreeing to the minimum reaches onboarding", await hasText(page, "先认识一下宝宝"));

    const saved = await readState();
    check("only the chosen consents are stored", saved?.settings?.consent?.basic === true, JSON.stringify(saved?.settings?.consent));
    check("photos stay off unless asked for", saved?.settings?.consent?.photos === false);
    check("the guardian confirmation is timestamped", typeof saved?.settings?.consent?.guardianAt === "number");
  }

  // ---------- legacy states are not re-gated ----------
  {
    await open({
      babies: [babyFor(15)],
      current: "b1",
      data: { b1: dataWith({ events: [{ id: "n1", kind: "poop", at: at(0, 8) }] }) },
    });
    check("a saved file from before consent existed still opens", await hasText(page, "小米"), (await bodyText(page)).slice(0, 120));
    const s2 = await readState();
    check("the two consents such a family already gave are kept", s2?.settings?.consent?.basic === true);
    check("the two that are new stay off", s2?.settings?.consent?.photos === false && s2?.settings?.consent?.notify === false);
  }

  // ---------- 4.5 sleep ----------
  {
    await open(seedFor(15));
    await clickTab(page, "记录");
    await clickText(page, "睡觉 · 喂奶喝水");
    await waitBody(page, "喂奶喝水");
    await clickText(page, "睡了");
    await new Promise((r) => setTimeout(r, 350));
    check("a nap in progress says so rather than showing a duration", await hasText(page, "醒了"));

    const mid = await readData();
    check("the first tap writes one sleep event", mid.events.filter((e) => e.kind === "sleep").length === 1);

    await clickText(page, "醒了");
    await new Promise((r) => setTimeout(r, 350));
    const after = await readData();
    check("the second tap closes the nap", after.events.filter((e) => e.kind === "sleep").length === 2);
    check("the closed nap is totalled for the day", await hasText(page, "今天睡了"), (await bodyText(page)).slice(0, 200));

    // The disclaimer is dropped first: it is the sentence that promises the
    // app sets no target, so it necessarily contains the words banned here.
    const noTarget = (await bodyText(page)).replace(
      "这里只把你按下的时间加起来，不设应该睡多久，也不和别的宝宝比。",
      "",
    );
    check(
      "sleep never states a target or a shortfall",
      !/应该睡|睡眠不足|不够|达标|偏少|偏多/.test(noTarget),
      noTarget.slice(0, 200),
    );

    await clickText(page, "母乳");
    await new Promise((r) => setTimeout(r, 300));
    const fed = await readData();
    check("a feed is one tap", fed.events.filter((e) => e.kind === "feed").length === 1);
    check("feeds record no volume", !("ml" in (fed.events.find((e) => e.kind === "feed")?.num ?? {})));
  }

  // ---------- sleep pairing survives stray taps ----------
  {
    await open(
      seedFor(15, {
        events: [
          { id: "s1", kind: "sleep", at: at(0, 9), pick: "down" },
          { id: "s2", kind: "sleep", at: at(0, 9, 30), pick: "down" },
          { id: "s3", kind: "sleep", at: at(0, 10), pick: "up" },
          { id: "s4", kind: "sleep", at: at(0, 11), pick: "up" },
        ],
      }),
    );
    await clickTab(page, "记录");
    await clickText(page, "睡觉 · 喂奶喝水");
    await waitBody(page, "今天");
    const text = await bodyText(page);
    check("a double 睡了 does not become two naps", text.includes("今天 1 觉"), text.slice(0, 200));
    check("a stray 醒了 with nobody asleep is ignored", !text.includes("还在睡"), text.slice(0, 200));
  }

  // ---------- 4.6 motor ----------
  {
    await open(seedFor(19));
    await clickTab(page, "记录");
    await clickText(page, "大动作");
    await waitBody(page, "这段时间常出现");
    const text = await bodyText(page);
    check("motor items show a range, not a deadline", text.includes("常在") && text.includes("月龄出现"), text.slice(0, 200));
    const noOverdue = text.replace("没点的就是还没点，这里没有「欠着」这回事。", "");
    check(
      "a motor item not yet recorded is never marked overdue",
      !/超过|逾期|落后|迟缓|未达|应该会|欠/.test(noOverdue),
      noOverdue.slice(0, 300),
    );

    await clickSel(page, ".motor-tap");
    await new Promise((r) => setTimeout(r, 350));
    const data = await readData();
    const hit = data.events.find((e) => e.kind === "motor");
    check("tapping a motor item records the date", Boolean(hit), JSON.stringify(data.events.slice(0, 2)));
    check("the reference id and its wording are stored separately", Boolean(hit?.pick && hit?.note));
    check("the recorded day is shown back", await hasText(page, "你记的是"), (await bodyText(page)).slice(0, 200));
  }

  // ---------- 4.3 diet ----------
  {
    await open(seedFor(15));
    await clickTab(page, "记录");
    await clickText(page, "饮食");
    await waitBody(page, "哪一餐");
    await clickText(page, "记下这一餐");
    await new Promise((r) => setTimeout(r, 350));
    const logged = await readData();
    const meal = logged.events.find((e) => e.kind === "meal");
    check("a meal can be recorded without a photo", Boolean(meal), JSON.stringify(logged.events.slice(0, 2)));
    check("the meal carries the 餐次 the parent picked", Boolean(meal?.pick));

    await clickText(page, "备注");
    await new Promise((r) => setTimeout(r, 300));
    await clickText(page, "吃得香");
    await new Promise((r) => setTimeout(r, 300));
    const tagged = await readData();
    check("the parent's own words are stored as tags", (tagged.events.find((e) => e.kind === "meal")?.tags ?? []).includes("吃得香"));

    await clickText(page, "辅食阶段");
    await waitBody(page, "性状参考");
    const stage = await bodyText(page);
    check("the weaning stage is reference text", stage.includes("月"), stage.slice(0, 160));
    check(
      "the weaning page gives no quantity or schedule instruction",
      !/必须|应该吃|每天要|克\/天|建议吃|不能吃/.test(stage),
      stage.slice(0, 300),
    );

    await clickText(page, "过敏原");
    await waitBody(page, "常被留意的几样");
    const all = await bodyText(page);
    check("allergens are a label-reading aid", all.includes("只帮你在食品标签上"), all.slice(0, 200));
    check("the allergen page defers to a doctor", all.includes("联系医生") || all.includes("问医生"), all.slice(0, 300));
    check(
      "the allergen page makes no diagnosis",
      !/宝宝过敏|确诊|说明.{0,4}过敏|判断.{0,4}过敏/.test(all),
      all.slice(0, 300),
    );
  }

  // ---------- 照片默认关闭 ----------
  {
    await open(seedFor(15, {}, {}, { consent: { photos: false } }));
    await clickTab(page, "记录");
    await clickText(page, "饮食");
    await waitBody(page, "哪一餐");
    check("with photos off there is no camera button", !(await hasText(page, "顺手拍一张")));
    check("and the screen says where to turn it on", await hasText(page, "照片记录"), (await bodyText(page)).slice(0, 200));
  }

  // ---------- 3.1 bilingual ----------
  {
    await open(seedFor(15, {}, {}, { bilingual: false }));
    await clickTab(page, "早教");
    await new Promise((r) => setTimeout(r, 350));
    check("English is absent until switched on", !(await hasText(page, "英语启蒙")));

    await open(seedFor(15, {}, {}, { bilingual: true }));
    await clickTab(page, "早教");
    await waitBody(page, "英语启蒙");
    const text = await bodyText(page);
    check("the English track sits under the same stage", text.includes("英语启蒙"));
    check(
      "English milestones count exposure, not ability",
      text.includes("听过") || text.includes("玩过"),
      text.slice(0, 400),
    );
  }

  // ---------- 12.6 纯记录版 ----------
  {
    await open(seedFor(15, {}, {}, { mode: "records" }));
    const tabs = await page.evaluate(() => [...document.querySelectorAll(".g-tabs button")].map((n) => n.innerText.trim()));
    check("records-only mode hides 早教 and 听听", !tabs.includes("早教") && !tabs.includes("听听"), tabs.join("/"));
    check("records-only mode keeps 记录 and 我的", tabs.includes("记录") && tabs.includes("我的"), tabs.join("/"));
  }

  // ---------- 7.3 privacy and export ----------
  {
    await open(
      seedFor(15, {
        events: [{ id: "n1", kind: "poop", at: at(0, 8), tags: ["成形"] }],
      }),
    );
    await clickTab(page, "我的");
    await clickText(page, "隐私与数据");
    await waitBody(page, "存了什么");
    const text = await bodyText(page);
    check("the privacy page counts what is actually stored", text.includes("条记录"), text.slice(0, 200));
    check("the delete scope is itemised", text.includes("删除范围"), text.slice(0, 300));
    check("consent items can be revoked here", text.includes("分项同意"));
    check(
      "a wipe cannot be triggered by one stray tap",
      await page.evaluate(() => !document.body.innerText.includes("确认删除")),
    );

    await clickText(page, "我要删掉全部数据");
    await new Promise((r) => setTimeout(r, 300));
    const armed = await page.evaluate(() =>
      [...document.querySelectorAll("button")].some((b) => b.innerText.includes("确认删除") && b.disabled),
    );
    check("the wipe stays disabled until the word is typed", armed);
  }

  // ---------- 6.1 carers and the log ----------
  {
    await open(seedFor(15));
    await clickTab(page, "我的");
    await clickText(page, "成员与记录人");
    await waitBody(page, "成员");
    await clickText(page, "加一个人");
    await setField(".carer-form input", "外婆");
    await clickText(page, "加进来");
    await new Promise((r) => setTimeout(r, 350));
    const state = await readState();
    check("a carer can be named", state?.carers?.length === 1, JSON.stringify(state?.carers));
    check("naming someone is written to the log", (state?.log ?? []).some((e) => e.what.includes("成员")), JSON.stringify(state?.log));
    check("the new carer becomes the current recorder", state?.by === state?.carers?.[0]?.id);

    await clickTab(page, "记录");
    await new Promise((r) => setTimeout(r, 300));
    await clickText(page, "拉屎");
    await new Promise((r) => setTimeout(r, 350));
    const data = await readData();
    check("records carry who made them", Boolean(data.events.find((e) => e.kind === "poop")?.by));
  }

  // ---------- 7.5 kid mode ----------
  {
    await open(seedFor(15));
    await clickTab(page, "我的");
    await clickText(page, "宝宝观看模式");
    await waitBody(page, "退出密码");
    await setField(".g-sheet input", "1234");
    await clickText(page, "进入");
    await waitBody(page, "宝宝观看模式");
    const tabs = await page.evaluate(() => document.querySelectorAll(".g-tabs button").length);
    check("kid mode leaves nothing but playback on screen", tabs === 0, `${tabs} tabs`);
    check("kid mode still shows the listening app", await hasText(page, "宝宝听听"), (await bodyText(page)).slice(0, 200));

    await clickText(page, "退出");
    await new Promise((r) => setTimeout(r, 300));
    check("leaving kid mode asks for the pin", await hasText(page, "输入退出密码"));
    for (const d of ["9", "9", "9", "9"]) await clickText(page, d);
    await new Promise((r) => setTimeout(r, 300));
    check("a wrong pin does not let go", await hasText(page, "不对，再试一次"));
    for (const d of ["1", "2", "3", "4"]) await clickText(page, d);
    await new Promise((r) => setTimeout(r, 400));
    check("the right pin returns to the app", (await page.evaluate(() => document.querySelectorAll(".g-tabs button").length)) > 0);
  }

  // ---------- 10.3 summary ----------
  {
    await open(
      seedFor(19, {
        done: { [dateKey(0)]: ["q3-m1"], [dateKey(-1)]: ["q3-m2"] },
        events: [
          { id: "g1", kind: "growth", at: at(-30, 12), num: { height: 76, weight: 9.8 } },
          { id: "g2", kind: "growth", at: at(0, 12), num: { height: 79, weight: 10.6 } },
        ],
      }),
    );
    await clickTab(page, "我的");
    await clickText(page, "成长总结与海报");
    await waitBody(page, "量出来的变化");
    const text = await bodyText(page);
    check("the summary counts what the family did", text.includes("打卡天数"), text.slice(0, 300));
    const noRank = text.replace("只报你自己量到的数和变化量，不给百分位，也不和别的宝宝比。", "");
    check("growth changes are shown without percentiles", !noRank.includes("百分位"), noRank.slice(0, 400));
    check(
      "the summary passes no judgement",
      !/优秀|不错|落后|达标|排名|超过.{0,6}%/.test(text),
      text.slice(0, 400),
    );
  }

  // ---------- 7.6 reminders are opt-in ----------
  {
    await open(seedFor(15, {}, {}, { consent: { notify: false } }));
    check("no reminder card appears before consent", !(await hasText(page, "这类不用提醒")));
    await clickTab(page, "我的");
    await clickText(page, "提醒");
    await waitBody(page, "提醒总开关");
    let text = await bodyText(page);
    check("reminders start switched off", text.includes("已关闭"), text.slice(0, 200));
    check(
      "the reminder page admits a static app cannot notify in the background",
      text.includes("打开着这个页面"),
      text.slice(0, 300),
    );

    await clickText(page, "已关闭");
    await waitBody(page, "安静时段");
    text = await bodyText(page);
    check("quiet hours are stated once reminders are on", /不提醒/.test(text), text.slice(0, 400));
    check("each reminder kind can be muted on its own", text.includes("疫苗月龄") && text.includes("体温复测"), text.slice(0, 500));
    await clickText(page, "量过之后提醒再量一次");
    await waitBody(page, "只按时间间隔提醒");
    check(
      "the temperature reminder is time-based, not value-based",
      await hasText(page, "和量出来的数字没有关系"),
      (await bodyText(page)).slice(0, 600),
    );
  }

  // ---------- the SDK inventory ----------
  {
    await open(seedFor(15));
    await clickTab(page, "我的");
    await clickText(page, "第三方清单");
    await waitBody(page, "第三方");
    const text = await bodyText(page);
    check("every third party that touches data is listed", text.includes("localStorage") || text.includes("本地存储"), text.slice(0, 300));
    check("the page states there is no tracking SDK", /没有接入|一个都没接/.test(text), text.slice(0, 400));
  }

  // ---------- 宝宝听听 as a tab ----------
  {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await open(seedFor(15));
    await clickTab(page, "听听");
    await waitBody(page, "宝宝听听");
    check("the listening app is reachable as a tab", await hasText(page, "开始听"));

    const skinned = await page.evaluate(() => {
      const card = document.querySelector(".lw-card");
      const page_ = document.querySelector(".g-page");
      return {
        inside: Boolean(card && page_?.contains(card)),
        theme: page_?.className ?? "",
        oldSky: document.querySelectorAll(".party-sky:not([style*='display: none'])").length,
      };
    });
    check("it renders inside the themed shell", skinned.inside, JSON.stringify(skinned));
    check("it inherits the chosen 蛋仔 colour", /theme-(boy|girl)/.test(skinned.theme), skinned.theme);

    check("the gate is kept, so sound needs a deliberate tap", await hasText(page, "开始听"));
    await clickText(page, "开始听");
    await new Promise((r) => setTimeout(r, 1500));
    check("starting playback keeps the tab bar", (await page.evaluate(() => document.querySelectorAll(".g-tabs button").length)) > 0);

    const stayed = await page.evaluate(() => Boolean(document.querySelector(".listen-tab")));
    await clickText(page, "记录");
    await new Promise((r) => setTimeout(r, 400));
    const mounted = await page.evaluate(() => Boolean(document.querySelector(".listen-tab.is-off")));
    check("the listening app stays mounted so a song survives a tab change", stayed && mounted);

    const noNames = await bodyText(page);
    check(
      "no competitor or borrowed brand name reaches the UI",
      !/蛋仔派对|贝乐虎|火火兔|宝宝巴士|巧虎|佩奇|Peppa|汪汪队|PAW/i.test(noNames),
      noNames.slice(0, 200),
    );
  }

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
