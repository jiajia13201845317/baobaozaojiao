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

const days = [];
for (let i = 0; i < 23; i += 1) days.push(dateKey(-i));

const seed = {
  profile: { name: "小米", sex: "boy", birthday: birthdayMonthsAgo(15) },
  doneDays: days,
  milestones: ["s1-ms1", "s1-ms3"],
  measures: [
    { id: "a", date: dateKey(-190), height: 71.2, weight: 8.6 },
    { id: "b", date: dateKey(-120), height: 74.1, weight: 9.2 },
    { id: "c", date: dateKey(-60), height: 76.4, weight: 9.9 },
    { id: "d", date: dateKey(-5), height: 78.9, weight: 10.4 },
  ],
  vaccines: ["hepb-1", "bcg", "hepb-2", "ipv-1", "ipv-2", "dtap-1", "opv-3", "dtap-2", "dtap-3", "hepb-3", "mpsva-1", "mmr-1", "je-1"],
};

async function go(store) {
  await page.goto(`${BASE}/grow`, { waitUntil: "domcontentloaded" });
  await page.evaluate((v) => {
    if (v === null) localStorage.removeItem("grow-state");
    else localStorage.setItem("grow-state", v);
  }, store === null ? null : JSON.stringify(store));
  await page.reload({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 900));
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.webp`, fullPage: true });
  console.log(name);
}

async function tap(label) {
  await page.evaluate((want) => {
    const hit = [...document.querySelectorAll("button")].find((b) => (b.innerText || "").includes(want));
    hit?.click();
  }, label);
  await new Promise((r) => setTimeout(r, 700));
}

await go(null);
await shot("1_onboard");

await go(seed);
await shot("2_today");

await tap("计划");
await shot("3_plan");

await tap("看看分是怎么来的");
await shot("4_points");

await tap("健康");
await shot("5_health");

await tap("体重");
await shot("6_weight");

await go({ ...seed, doneDays: [], milestones: [], measures: [], vaccines: [] });
await shot("7_day_one");

await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
await go(seed);
await shot("8_desktop");

await browser.close();
