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

function seedFor(months, extra = {}) {
  return {
    profile: { name: "小米", sex: "boy", birthday: birthdayMonthsAgo(months) },
    done: {},
    milestones: [],
    measures: [],
    vaccines: [],
    pets: [{ id: "p1", creature: "forest-1", from: 0 }],
    active: "p1",
    care: {},
    spent: 0,
    ...extra,
  };
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
  await setField("#baby-name", "小米");
  await setField("#baby-birthday", birthdayMonthsAgo(15));
  check("sex is required too", await locked());
  check("the remaining field is named", (await bodyText(page)).includes("还差性别"), await bodyText(page));
  await clickText(page, "男宝");
  check("the age is echoed back", /1 岁 3 个月/.test(await bodyText(page)), await bodyText(page));

  await clickText(page, "开始");
  await waitBody(page, "今日早教");
  let state = await readState();
  check("the profile is stored", state?.profile?.name === "小米" && state.profile.sex === "boy", JSON.stringify(state?.profile));
  check("a first egg comes free", state.pets.length === 1 && state.active === state.pets[0].id, JSON.stringify(state.pets));
  check("the free egg cost nothing", state.spent === 0, `${state.spent}`);

  // --- home -------------------------------------------------------------
  text = await bodyText(page);
  check("home greets the child by name", text.includes("小米"));
  check("home shows cumulative and spendable points", text.includes("累计") && text.includes("可用"));
  check("the pet starts as an unrevealed egg", text.includes("蛋仔") && text.includes("Lv1"), text.slice(0, 400));
  check("the collection counter is shown", /图鉴 \d+\/21/.test(text), text.slice(0, 400));
  check("the reveal is teased, not spoiled", text.includes("破壳那天才知道"), text.slice(0, 500));
  check("the three care meters are shown", ["饱腹", "心情", "干净"].every((m) => text.includes(m)), text.slice(0, 600));
  check("care is unaffordable at zero points", (await page.$$eval(".g-chip-btn:disabled", (e) => e.length)) === 3);
  check("the disabled care buttons explain themselves", text.includes("可用积分不够了"), text.slice(0, 700));
  check("the explanation says points are not lost", text.includes("累计积分不会因为照顾它而减少"), text.slice(0, 700));
  check("today offers three tasks", (await page.$$eval(".today-tile", (e) => e.length)) === 3);
  check("the streak starts at zero", text.includes("连续 0 天打卡"), text.slice(0, 700));
  check("no pet art is oversized on home", (await oversizedArt(page)).length === 0, JSON.stringify(await oversizedArt(page)));

  await clickText(page, "宠物");
  await waitBody(page, "领养新蛋");
  text = await bodyText(page);
  check("with nothing saved up, adopting points at the way to earn", text.includes("现在还领不了"), text.slice(0, 1200));
  check("every series is out of reach at zero", (await page.$$eval(".series-card:disabled", (e) => e.length)) === 7);

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
  state = await readState();
  const todayIds = state.done[dateKey()] ?? [];
  check("finishing a play is recorded", todayIds.length === 1, JSON.stringify(state.done));
  check("the finished play is marked", (await page.$(".play-list li.on")) !== null);
  await clickSel(page, ".play-list button", 0);
  state = await readState();
  check("a play can be un-ticked", (state.done[dateKey()] ?? []).length === 0, JSON.stringify(state.done));
  await clickSel(page, ".play-list button", 0);

  // 8 for the play itself, plus the one-off 20 for using the feature at all.
  check("points went up", (await bodyText(page)).includes("累计 28"), (await bodyText(page)).slice(-400));

  const libraryCount = await page.$$eval(".task-lib li", (e) => e.length);
  check("the task library is populated", libraryCount >= 20, `${libraryCount}`);
  await clickText(page, "语言");
  const filtered = await page.$$eval(".task-lib li", (e) => e.length);
  check("the dimension filter narrows the library", filtered > 0 && filtered < libraryCount, `${filtered}/${libraryCount}`);
  await clickText(page, "全部");

  check("milestones are listed", (await page.$$eval(".milestone", (e) => e.length)) >= 4);
  await clickSel(page, ".milestone", 0);
  state = await readState();
  check("ticking a milestone is stored", state.milestones.length === 1, JSON.stringify(state.milestones));

  await clickText(page, "看看分是怎么来的");
  text = await bodyText(page);
  check("the points breakdown opens", text.includes("早教小任务"), text.slice(-800));
  check("spending is shown separately", text.includes("只扣可用，不扣累计"), text.slice(-800));
  check("points never expire is stated", text.includes("不会过期"), text.slice(-900));
  check("levelling reads cumulative only", text.includes("累计积分只增不减"), text.slice(-900));
  for (const banned of ["排行", "排名", "超过了", "打败"]) {
    check(`learn has no "${banned}"`, !text.includes(banned));
  }

  // --- pets: adopting spends 可用 but never 累计 -------------------------
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
  check("a series out of reach says how far", /还差 \d+ 分/.test(text), text.slice(0, 1200));

  const before = await readState();
  const beforeTotal = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".series-card")].length;
    return el;
  });
  check("series cards rendered", beforeTotal === 7);

  await clickSel(page, ".series-card", 1);
  await waitBody(page, "抱回家");
  check("the adopt sheet explains the cost", await hasText(page, "累计积分不会变"), await bodyText(page));
  await clickText(page, "抱回家");
  await new Promise((r) => setTimeout(r, 400));
  state = await readState();
  check("adopting adds a pet", state.pets.length === before.pets.length + 1, JSON.stringify(state.pets));
  check("adopting spends points", state.spent === 240, `${state.spent}`);
  check("the new pet becomes active", state.active === state.pets[state.pets.length - 1].id);
  check("the new pet starts from the current total", state.pets[1].from > 0, JSON.stringify(state.pets[1]));
  check("the adopted creature is from the chosen series", state.pets[1].creature.startsWith("water-"), state.pets[1].creature);
  check("no duplicate creatures", new Set(state.pets.map((p) => p.creature)).size === state.pets.length);

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
  state = await readState();
  check("care costs spendable points", state.spent === 246, `${state.spent}`);
  check("care never touches the records", state.done && Object.keys(state.done).length === 40);

  // --- levelling and the reveal ----------------------------------------
  const bigDays = Object.fromEntries(Array.from({ length: 120 }, (_, i) => [dateKey(-i), ["s1-m1", "s1-f1"]]));
  await open(seedFor(15, { done: bigDays }));
  await waitBody(page, "今日早教");
  text = await bodyText(page);
  check("a long history reveals the creature", text.includes("龙"), text.slice(0, 500));
  check("the revealed pet is past level 3", /Lv[45]/.test(text), text.slice(0, 500));
  check("the tease is gone once revealed", !text.includes("破壳那天才知道"), text.slice(0, 600));

  await clickText(page, "宠物");
  await waitBody(page, "宠物图鉴");
  check("the revealed creature fills its collection slot", (await page.$$eval(".book-grid li.on", (e) => e.length)) === 1);
  check("no pet art is oversized in the collection", (await oversizedArt(page)).length === 0, JSON.stringify(await oversizedArt(page)));

  // --- health -----------------------------------------------------------
  await open(seedFor(15));
  await clickText(page, "健康");
  await waitBody(page, "疫苗");
  text = await bodyText(page);
  check("health has an empty state", text.includes("还没有"), text.slice(0, 500));
  check("health explains the measuring change at 2", text.includes("躺着") && text.includes("站着"));
  check("health cites the national schedule", text.includes("国家免疫规划"));
  check("health states the non-diagnostic boundary", text.includes("不提供诊断或治疗建议"), text.slice(-400));
  check("the vaccine list renders", (await page.$$eval(".vaccine", (e) => e.length)) >= 10);

  await clickSel(page, ".vaccine", 0);
  state = await readState();
  check("ticking a vaccine is stored", state.vaccines.length === 1, JSON.stringify(state.vaccines));

  await clickText(page, "记一次");
  await setField("#m-height", "300");
  check("an out-of-range height is rejected", (await bodyText(page)).includes("身高请填"), (await bodyText(page)).slice(0, 700));
  await setField("#m-date", dateKey(5));
  check("a future measuring date is rejected", await hasText(page, "不能是将来"));
  await setField("#m-date", dateKey());
  await setField("#m-height", "78.5");
  await setField("#m-weight", "10.4");
  await clickText(page, "保存");
  state = await readState();
  check(
    "a valid measurement is stored",
    state.measures.length === 1 && state.measures[0].height === 78.5 && state.measures[0].weight === 10.4,
    JSON.stringify(state.measures),
  );
  check("the reading is shown", await hasText(page, "最近一次"));
  check("the WHO curve is drawn", (await page.$$eval(".grow-chart path", (e) => e.length)) >= 4);
  check("the child's own point is plotted", (await page.$$eval(".curve-dot", (e) => e.length)) === 1);

  const reads = [];
  for (const h of [65, 78.5, 92]) {
    await open(seedFor(15, { measures: [{ id: `m${h}`, date: dateKey(), height: h }] }));
    await clickText(page, "健康");
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

  // --- month-age gating -------------------------------------------------
  await open(seedFor(22));
  await clickText(page, "早教");
  await waitBody(page, "今天的三个玩法");
  check("a 22-month child gets the later stage", await hasText(page, "Q3-Q4"), (await bodyText(page)).slice(0, 300));

  await open(seedFor(30));
  await clickText(page, "早教");
  await waitBody(page, "今天的三个玩法");
  check("the next-stage note is shown past 24 months", await hasText(page, "还在制作中"), (await bodyText(page)).slice(0, 900));

  await open(seedFor(40, { measures: [{ id: "m1", date: dateKey(), height: 100 }] }));
  await clickText(page, "健康");
  await waitBody(page, "疫苗");
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
  check("the profile can be edited", state.profile.name === "大米", JSON.stringify(state.profile));
  check("editing keeps the pet", state.pets.length === 1, JSON.stringify(state.pets));

  // --- resilience -------------------------------------------------------
  await page.goto(`${BASE}/grow/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("grow-state", "{not json"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  check("a corrupt store falls back to onboarding", await hasText(page, "先认识一下宝宝"), await bodyText(page));

  await open({ profile: { name: "小米", sex: "boy", birthday: birthdayMonthsAgo(15) }, doneDays: [dateKey(-1), dateKey(-2)] });
  await waitBody(page, "今日早教");
  state = await readState();
  check("an older saved shape still loads", Object.keys(state.done ?? {}).length === 2, JSON.stringify(state.done));
  check("the older shape gets an egg too", (state.pets ?? []).length === 1, JSON.stringify(state.pets));

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitBody(page, "今日早教");
  const again = await readState();
  check(
    "the granted egg is the same one after a reload",
    again.pets?.[0]?.creature === state.pets?.[0]?.creature && again.pets?.[0]?.id === state.pets?.[0]?.id,
    JSON.stringify([state.pets, again.pets]),
  );

  // --- layout -----------------------------------------------------------
  for (const [w, label] of [
    [1280, "1280px"],
    [320, "320px"],
  ]) {
    await page.setViewport({ width: w, height: 860, isMobile: w < 500, hasTouch: w < 500 });
    await open(seedFor(15, { measures: [{ id: "m1", date: dateKey(), height: 78.5 }] }));
    for (const tab of ["首页", "宠物", "早教", "健康"]) {
      await clickText(page, tab);
      await new Promise((r) => setTimeout(r, 350));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tab} does not overflow at ${label}`, over <= 1, `${over}px`);
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
