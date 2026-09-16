/** Scratch: does the biscuit still land in the mouth with the lean pinned? */
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BASE = "http://127.0.0.1:43147";
const OUT = "/tmp/eat";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 86400000;
const now = Date.now();
const d = new Date();
d.setMonth(d.getMonth() - 15);
const birthday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const seed = {
  babies: [{ id: "b1", name: "小米", sex: "boy", birthday, pretermWeeks: null, useCorrected: false, createdAt: 1 }],
  current: "b1",
  data: {
    b1: {
      done: Object.fromEntries(
        Array.from({ length: 40 }, (_, i) => {
          const day = new Date();
          day.setDate(day.getDate() - i);
          return [`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`, ["s1-m1", "s1-f1"]];
        }),
      ),
      milestones: [],
      vaccines: [],
      events: [],
      pets: [{ id: "p1", creature: "forest-1", from: 0 }],
      active: "p1",
      care: { p1: { food: { at: now - 3 * DAY, value: 100 }, play: { at: now - 3 * DAY, value: 100 }, bath: { at: now - 3 * DAY, value: 100 } } },
      spent: 0,
    },
  },
  settings: { consent: { basic: true, personalised: true, photos: false, notify: false, guardianAt: 1 }, mode: "full", bilingual: false, pin: null, kid: false, reminders: {} },
  carers: [],
  by: null,
  log: [],
};

await mkdir(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "shell", args: ["--no-sandbox"] });
const page = await b.newPage();
await page.setViewport({ width: 460, height: 1000, deviceScaleFactor: 1.6 });
await page.evaluateOnNewDocument(() => {
  const asked = new URLSearchParams(location.search).get("e2e-hour");
  const hour = Number(asked);
  if (asked === null || !Number.isFinite(hour)) return;
  const Real = Date;
  const wanted = new Real();
  wanted.setHours(hour, 30, 0, 0);
  const skew = wanted.getTime() - Real.now();
  Date = class extends Real {
    constructor(...args) { super(...(args.length ? args : [Real.now() + skew])); }
    static now() { return Real.now() + skew; }
  };
  Date.UTC = Real.UTC;
  Date.parse = Real.parse;
});
await page.goto(`${BASE}/grow/?e2e-hour=10`, { waitUntil: "domcontentloaded" });
await page.evaluate((v) => localStorage.setItem("grow-state", v), JSON.stringify(seed));
await page.reload({ waitUntil: "domcontentloaded" });
await wait(2400);

// Put the pointer hard right, so a lean would be obvious if it were not pinned.
const card = await page.$eval(".pet-card", (el) => {
  const r = el.getBoundingClientRect();
  return { right: r.right - 10, mid: r.top + r.height / 2 };
});
await page.mouse.move(card.right, card.mid);
await wait(500);
console.log("before feeding, look:", await page.evaluate(() => getComputedStyle(document.querySelector(".pet-look")).transform));

await page.evaluate(() => document.querySelectorAll(".pet-actions .g-chip-btn")[0].click());
await wait(120);

const files = [];
for (let i = 0; i < 8; i++) {
  const f = `${OUT}/eat-${i}.png`;
  await (await page.$(".pet-window")).screenshot({ path: f });
  files.push(f);
  if (i === 0) console.log("during feeding, look:", await page.evaluate(() => getComputedStyle(document.querySelector(".pet-look")).transform));
  await wait(420);
}
console.log("act:", await page.evaluate(() => document.querySelector(".pet-pose").className));

const metas = [];
for (const f of files) metas.push(await sharp(f).metadata());
const w = metas.reduce((s, m) => s + m.width, 0) + 6 * (files.length + 1);
const h = Math.max(...metas.map((m) => m.height)) + 12;
let x = 6;
const layers = [];
for (let i = 0; i < files.length; i++) {
  layers.push({ input: files[i], left: x, top: 6 });
  x += metas[i].width + 6;
}
await sharp({ create: { width: w, height: h, channels: 3, background: "#eef1f6" } }).composite(layers).png().toFile(`${OUT}/strip.png`);
console.log("strip", w, h);

await b.close();
