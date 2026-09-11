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

const seed = {
  profile: { name: "小米", sex: "boy", birthday: birthdayMonthsAgo(15) },
  done,
  milestones: ["s1-ms1", "s1-ms3"],
  measures: [
    { id: "a", date: dateKey(-190), height: 71.2, weight: 8.6 },
    { id: "b", date: dateKey(-120), height: 74.1, weight: 9.2 },
    { id: "c", date: dateKey(-60), height: 76.4, weight: 9.9 },
    { id: "d", date: dateKey(-5), height: 78.9, weight: 10.4 },
  ],
  vaccines: ["hepb-1", "bcg", "hepb-2", "ipv-1", "ipv-2", "dtap-1", "opv-3", "dtap-2", "dtap-3", "hepb-3", "mpsva-1", "mmr-1", "je-1"],
  pets: [
    { id: "p1", creature: "forest-1", from: 0 },
    { id: "p2", creature: "water-3", from: 600 },
  ],
  active: "p1",
  care: { p1: { food: { at: Date.now(), value: 92 }, play: { at: Date.now(), value: 78 }, bath: { at: Date.now(), value: 61 } } },
  spent: 240,
};

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
await shot("1_onboard");

await go(seed);
await playToday(2);
await shot("2_home");

await tap("宠物");
await shot("3_pets");

await tap("早教");
await shot("4_learn");

await tap("健康");
await shot("5_health");

await go({ ...seed, done: {}, pets: [{ id: "p1", creature: "forest-1", from: 0 }], active: "p1", care: {}, spent: 0, milestones: [], measures: [], vaccines: [] });
await shot("6_day_one");

await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
await go(seed);
await shot("7_desktop");

await browser.close();
