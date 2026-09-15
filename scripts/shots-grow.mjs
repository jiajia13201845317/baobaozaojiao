import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const BASE = process.env.E2E_URL || "http://127.0.0.1:43147";
const chrome = process.env.CHROME || "/usr/bin/google-chrome";
const OUT = "shots_grow";

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

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();

const done = {};
for (let i = 1; i < 26; i += 1) done[dateKey(-i)] = ["seen"];

const growth = [
  { d: -190, height: 71.2, weight: 8.6, head: 44.4 },
  { d: -120, height: 74.1, weight: 9.2, head: 45.5 },
  { d: -60, height: 76.4, weight: 9.9, head: 46.2 },
  { d: -5, height: 78.9, weight: 10.4, head: 46.9 },
].map((g, i) => ({ id: `g${i}`, kind: "growth", at: at(g.d, 12), num: { height: g.height, weight: g.weight, head: g.head } }));

const todayRecords = [
  { id: "t1", kind: "temp", at: at(0, 7, 20), num: { temp: 36.8 }, pick: "armpit" },
  { id: "t2", kind: "temp", at: at(0, 11, 5), num: { temp: 37.4 }, pick: "armpit" },
  { id: "t3", kind: "temp", at: at(0, 15, 40), num: { temp: 37.1 }, pick: "ear" },
  { id: "n1", kind: "poop", at: at(0, 8, 10), tags: ["成形"] },
  { id: "n2", kind: "pee", at: at(0, 9, 30) },
  { id: "n3", kind: "pee", at: at(0, 12, 15) },
  { id: "n4", kind: "pee", at: at(0, 16, 2) },
];

const babyData = {
  done,
  milestones: ["s1-ms1", "s1-ms3"],
  vaccines: ["hepb-1", "bcg", "hepb-2", "ipv-1", "ipv-2", "dtap-1", "opv-3", "dtap-2", "dtap-3", "hepb-3", "mpsva-1", "mmr-1", "je-1"],
  events: [...growth, ...todayRecords],
  pets: [
    { id: "p1", creature: "forest-1", from: 0 },
    { id: "p2", creature: "water-3", from: 430 },
  ],
  active: "p1",
  care: { p1: { food: { at: Date.now(), value: 92 }, play: { at: Date.now(), value: 78 }, bath: { at: Date.now(), value: 61 } } },
  spent: 240,
};

function seedFor(sex, name) {
  return {
    babies: [{ id: "b1", name, sex, birthday: birthdayMonthsAgo(15), pretermWeeks: null, useCorrected: false, createdAt: 1 }],
    current: "b1",
    data: { b1: babyData },
  };
}

const seed = seedFor("boy", "小米");

async function go(store) {
  await page.goto(`${BASE}/grow/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((v) => {
    if (v === null) localStorage.removeItem("grow-state");
    else localStorage.setItem("grow-state", v);
  }, store === null ? null : JSON.stringify(store));
  await page.reload({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(name);
}

async function tap(label) {
  await page.evaluate((want) => {
    const hit = [...document.querySelectorAll("button, a")].find((b) => (b.innerText || "").trim().includes(want));
    hit?.click();
  }, label);
  await new Promise((r) => setTimeout(r, 900));
}

/** Tick two of today's real tasks so the home tiles show a mixed state. */
async function playToday(n) {
  await tap("早教");
  for (let i = 0; i < n; i += 1) {
    await page.evaluate((idx) => {
      const buttons = [...document.querySelectorAll(".play-list button")];
      buttons[idx]?.click();
    }, i);
    await new Promise((r) => setTimeout(r, 400));
  }
  await tap("首页");
}

await go(null);
await shot("1_onboard_boy");
await tap("女宝");
await shot("2_onboard_girl");

await go(seed);
await playToday(2);
await shot("3_home_boy");

await go(seedFor("girl", "小桃"));
await shot("4_home_girl");

await tap("记录");
await shot("5_records_hub");

await tap("身高 · 体重 · 头围");
await shot("6_growth");
await tap("头围");
await shot("6b_head");

await go(seedFor("girl", "小桃"));
await tap("记录");
await tap("体温");
await shot("7_temp");

await go(seed);
await tap("记录");
await tap("拉屎 · 尿尿");
await shot("8_nappy");

await go(seed);
await tap("记录");
await tap("疫苗");
await shot("9_vaccine");

await go(seed);
await tap("宠物");
await shot("10_pets");

await go(seed);
await tap("早教");
await shot("11_learn");

await go({
  babies: [
    { id: "b1", name: "小米", sex: "boy", birthday: birthdayMonthsAgo(15), pretermWeeks: null, useCorrected: false, createdAt: 1 },
    { id: "b2", name: "小桃", sex: "girl", birthday: birthdayMonthsAgo(30), pretermWeeks: 34, useCorrected: true, createdAt: 2 },
  ],
  current: "b1",
  data: { b1: babyData },
});
await shot("12_two_babies");

await go({
  babies: [
    {
      id: "b1",
      name: "小桃",
      sex: "girl",
      birthday: birthdayMonthsAgo(13),
      pretermWeeks: 33,
      useCorrected: true,
      createdAt: 1,
    },
  ],
  current: "b1",
  data: { b1: { ...babyData, events: growth } },
});
await tap("记录");
await tap("身高 · 体重 · 头围");
await shot("13_preterm_curve");

await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
await go(seed);
await tap("记录");
await shot("14_desktop");

await browser.close();
