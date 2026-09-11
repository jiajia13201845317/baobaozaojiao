import puppeteer from "puppeteer-core";

const BASE = process.env.E2E_URL || "http://127.0.0.1:43147";
const chrome = process.env.CHROME || "/usr/bin/google-chrome";

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
  const clicked = await page.evaluate((want) => {
    const nodes = [...document.querySelectorAll("button, a, [role=button]")];
    const hit = nodes.find((n) => (n.innerText || "").includes(want) && !n.disabled);
    if (!hit) return false;
    hit.click();
    return true;
  }, needle);
  if (!clicked) throw new Error(`no enabled button containing ${needle}`);
  await new Promise((r) => setTimeout(r, 300));
}

async function clickSel(page, selector, index = 0) {
  const ok = await page.evaluate(
    (sel, i) => {
      const node = document.querySelectorAll(sel)[i];
      if (!node) return false;
      node.click();
      return true;
    },
    selector,
    index,
  );
  if (!ok) throw new Error(`no element ${selector}[${index}]`);
  await new Promise((r) => setTimeout(r, 300));
}

async function waitBody(page, needle, ms = 8000) {
  await page.waitForFunction((want) => document.body.innerText.includes(want), { timeout: ms }, needle);
}

function birthdayMonthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
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
  await page.goto(BASE + "/grow", { waitUntil: "domcontentloaded" });
  await page.evaluate((value) => {
    if (value === null) localStorage.removeItem("grow-state");
    else localStorage.setItem("grow-state", value);
  }, seed === undefined ? undefined : JSON.stringify(seed));
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 500));
}

function seedFor(months, extra = {}) {
  return {
    profile: { name: "小米", sex: "boy", birthday: birthdayMonthsAgo(months) },
    doneDays: [],
    milestones: [],
    measures: [],
    vaccines: [],
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
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, "value").set;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    selector,
    value,
  );
  await new Promise((r) => setTimeout(r, 150));
}

try {
  // --- onboarding -------------------------------------------------------
  await open(null);

  let text = await bodyText(page);
  check("onboarding is shown on a fresh device", text.includes("先认识一下宝宝"), text.slice(0, 200));
  check("onboarding asks for a birthday", text.includes("出生日期"));
  check("onboarding states the non-diagnostic boundary", text.includes("不提供任何诊断或治疗建议"), text.slice(0, 400));
  check("onboarding says data stays on the device", text.includes("不上传"), text.slice(0, 300));

  const startDisabled = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "开始" && b.disabled),
  );
  check("the start button is locked until the form is filled", startDisabled);

  await setField("#baby-name", "小米");
  await setField("#baby-birthday", birthdayMonthsAgo(15));
  const stillDisabled = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "开始" && b.disabled),
  );
  check("sex is required too", stillDisabled);

  await clickText(page, "男宝");
  check("the age is echoed back", /1 岁 3 个月|15 个月/.test(await bodyText(page)), await bodyText(page));

  await clickText(page, "开始");
  await waitBody(page, "一起长大");
  const state0 = await readState();
  check("the profile is stored", state0?.profile?.name === "小米" && state0.profile.sex === "boy", JSON.stringify(state0?.profile));

  // --- today ------------------------------------------------------------
  text = await bodyText(page);
  check("today greets the child by name", text.includes("小米"), text.slice(0, 200));
  check("today shows a task title", (await page.$(".task-title")) !== null);
  check("today shows why the task matters", (await page.$(".task-tip")) !== null);
  check("today shows the quarter stage", text.includes("Q1-Q2") || text.includes("走稳"), text.slice(0, 300));
  check("the pet starts as an egg", text.includes("蛋") && text.includes("再 380 分变成幼年"), text.slice(0, 400));
  check("a vaccine reminder is surfaced", text.includes("百白破疫苗"), text.slice(0, 500));
  check(
    "the reminder is not a birth dose marked overdue",
    !text.includes("已超过建议月龄") && text.includes("还没勾上"),
    text.slice(0, 500),
  );

  await clickText(page, "陪他玩过了");
  let state = await readState();
  check("completing the task records today", state?.doneDays?.length === 1 && state.doneDays[0] === dateKey(), JSON.stringify(state?.doneDays));
  check("the completed state is shown", await hasText(page, "今天完成了"), await bodyText(page));
  check("no second complete button remains", !(await hasText(page, "陪他玩过了")));

  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 500));
  check("completion survives a reload", await hasText(page, "今天完成了"), await bodyText(page));
  check("the streak counter appears", /连续 1 天|1 天/.test(await bodyText(page)), await bodyText(page));

  // --- plan -------------------------------------------------------------
  await clickText(page, "计划");
  await waitBody(page, "里程碑");
  text = await bodyText(page);
  check("plan shows the quarter overview", text.includes("本季度发展速览"), text.slice(0, 300));
  check("plan lists all four dimensions", ["大运动", "精细动作", "语言", "社交情感"].every((d) => text.includes(d)), text.slice(0, 600));
  check("plan has a task library", text.includes("任务库"), text.slice(0, 600));

  const taskCount = await page.$$eval(".task-lib li", (els) => els.length);
  check("the task library is fully populated", taskCount >= 20, `${taskCount} tasks`);

  await clickText(page, "语言");
  const filtered = await page.$$eval(".task-lib li", (els) => els.length);
  check("the dimension filter narrows the library", filtered > 0 && filtered < taskCount, `${filtered} of ${taskCount}`);
  await clickText(page, "全部");

  const milestones = await page.$$eval(".milestone", (els) => els.length);
  check("plan has milestones", milestones >= 4, `${milestones} milestones`);
  await clickSel(page, ".milestone", 0);
  state = await readState();
  check("ticking a milestone is stored", state.milestones.length === 1, JSON.stringify(state.milestones));
  check("the ticked milestone is marked", (await page.$(".milestone.on")) !== null);
  await clickSel(page, ".milestone", 0);
  state = await readState();
  check("a milestone can be un-ticked", state.milestones.length === 0, JSON.stringify(state.milestones));

  await clickText(page, "看看分是怎么来的");
  text = await bodyText(page);
  check("the points breakdown opens", text.includes("每日小任务"), text.slice(0, 600));
  check("points never expire is stated", text.includes("不会过期"), text.slice(0, 900));
  check("health points are deliberately low", text.includes("健康记录"), text.slice(0, 900));

  // --- compliance: no leaderboard, no competition -----------------------
  for (const banned of ["排行", "排名", "超过了", "打败"]) {
    check(`plan has no "${banned}"`, !text.includes(banned));
  }

  // --- health -----------------------------------------------------------
  await clickText(page, "健康");
  await waitBody(page, "疫苗");
  text = await bodyText(page);
  check("health has an empty state", text.includes("还没有"), text.slice(0, 500));
  check("health explains the measuring change at 2", text.includes("躺着") && text.includes("站着"), text.slice(0, 900));
  check("health cites the national schedule", text.includes("国家免疫规划"), text.slice(0, 900));
  check("health states the non-diagnostic boundary", text.includes("不提供诊断或治疗建议"), text.slice(-400));

  const vaccines = await page.$$eval(".vaccine", (els) => els.length);
  check("the vaccine list renders", vaccines >= 10, `${vaccines} vaccines`);
  await clickSel(page, ".vaccine", 0);
  state = await readState();
  check("ticking a vaccine is stored", state.vaccines.length === 1, JSON.stringify(state.vaccines));

  await clickText(page, "记一次");
  await new Promise((r) => setTimeout(r, 200));
  await setField("#m-height", "300");
  text = await bodyText(page);
  check("an out-of-range height is rejected", text.includes("身高请填"), text.slice(0, 600));
  const saveLocked = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "保存" && b.disabled),
  );
  check("save is locked while the value is bad", saveLocked);

  await setField("#m-date", dateKey(5));
  check("a future measuring date is rejected", (await bodyText(page)).includes("不能是将来"), (await bodyText(page)).slice(0, 600));
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

  text = await bodyText(page);
  check("the reading is shown", text.includes("最近一次"), text.slice(0, 700));
  const curvePaths = await page.$$eval(".grow-chart path", (els) => els.length);
  check("the WHO curve is drawn", curvePaths >= 4, `${curvePaths} paths`);
  const curveDots = await page.$$eval(".curve-dot", (els) => els.length);
  check("the child's own point is plotted", curveDots === 1, `${curveDots} dots`);
  check("the chart has a legend", text.includes("P3 - P97") && text.includes("P50"), text.slice(0, 900));

  await clickText(page, "体重");
  await new Promise((r) => setTimeout(r, 300));
  check("switching to weight keeps the curve", (await page.$$eval(".curve-dot", (e) => e.length)) === 1);

  // --- the percentile read never diagnoses ------------------------------
  const reads = [];
  for (const h of [65, 72, 78.5, 84, 92]) {
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
  const readText = reads.map((r) => r.text);
  check("every reading avoids a diagnosis", readText.every((r) => !/异常|偏矮|发育迟缓|营养不良|有病/.test(r)), readText.join(" || "));
  check("the extremes point to a doctor", reads[0].tone === "ask" && reads[4].tone === "ask", JSON.stringify(reads.map((r) => r.tone)));
  check("the extremes say a single measurement means little", readText[0].includes("单次测量不说明什么"), readText[0]);
  check("the middle reading stays neutral", reads[2].tone === "normal" && readText[2].includes("曲线的形状"), readText[2]);

  // --- points and pet growth -------------------------------------------
  const manyDays = [];
  for (let i = 0; i < 45; i += 1) manyDays.push(dateKey(-i));
  await open(seedFor(15, { doneDays: manyDays, milestones: ["s1-ms1", "s1-ms2"] }));
  await waitBody(page, "一起长大");
  text = await bodyText(page);
  check("a long streak grows the pet past the egg", text.includes("幼年") || text.includes("成年"), text.slice(0, 500));
  check("the streak is shown", text.includes("45 天"), text.slice(0, 300));

  // --- month-age gating -------------------------------------------------
  await open(seedFor(22));
  await clickText(page, "计划");
  await waitBody(page, "里程碑");
  check("a 22-month child gets the later stage", await hasText(page, "Q3-Q4"), (await bodyText(page)).slice(0, 300));

  await open(seedFor(30));
  await waitBody(page, "一起长大");
  check("a 30-month child still gets a task", (await page.$(".task-title")) !== null);
  await clickText(page, "计划");
  await waitBody(page, "里程碑");
  check("the next-stage note is shown past 24 months", await hasText(page, "还在制作中"), (await bodyText(page)).slice(0, 800));

  await open(seedFor(40, { measures: [{ id: "m1", date: dateKey(), height: 100 }] }));
  await clickText(page, "健康");
  await waitBody(page, "疫苗");
  text = await bodyText(page);
  check("a child past the WHO range keeps the record", text.includes("最近一次 100"), text.slice(0, 700));
  check("a child past the WHO range gets no percentile", !/P\d\d?\b/.test(text.split("疫苗")[0] ?? ""), text.slice(0, 700));
  check("a child past the WHO range is told why", text.includes("只到 3 岁"), text.slice(0, 700));

  // --- a corrupt store must not white-screen ----------------------------
  await page.goto(BASE + "/grow", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("grow-state", "{not json"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 500));
  check("a corrupt store falls back to onboarding", await hasText(page, "先认识一下宝宝"), await bodyText(page));

  // --- layout -----------------------------------------------------------
  await page.setViewport({ width: 1280, height: 900 });
  await open(seedFor(15, { doneDays: [dateKey()], measures: [{ id: "m1", date: dateKey(), height: 78.5 }] }));
  await waitBody(page, "一起长大");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal overflow at 1280px", wide <= 1, `${wide}px`);

  await page.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 500));
  const narrow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal overflow at 320px", narrow <= 1, `${narrow}px`);
  await clickText(page, "健康");
  await waitBody(page, "疫苗");
  const narrowHealth = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("health does not overflow at 320px", narrowHealth <= 1, `${narrowHealth}px`);

  // --- the listening app is untouched -----------------------------------
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
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
