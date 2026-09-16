/**
 * Scratch: drives the pet card on the VM's desktop for a screen recording.
 *
 * Phone-shaped window at the top left so the recording can be cropped to it.
 * Clock shifted to mid-morning, or the pet is asleep rather than 低落.
 */
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:43147";
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
      care: {
        p1: {
          food: { at: now - 7 * DAY, value: 100 },
          play: { at: now - 7 * DAY, value: 100 },
          bath: { at: now - 7 * DAY, value: 100 },
        },
      },
      spent: 0,
    },
  },
  settings: {
    consent: { basic: true, personalised: true, photos: false, notify: false, guardianAt: 1 },
    mode: "full",
    bilingual: false,
    pin: null,
    kid: false,
    reminders: {},
  },
  carers: [],
  by: null,
  log: [],
};

const b = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: false,
  defaultViewport: null,
  ignoreDefaultArgs: ["--enable-automation"],
  args: [
    "--no-sandbox",
    "--window-size=760,770",
    "--window-position=0,0",
    "--force-device-scale-factor=1.5",
    "--hide-scrollbars",
    "--lang=zh-CN",
    "--disable-features=Translate,TranslateUI",
    "--no-first-run",
    "--no-default-browser-check",
  ],
});

const page = (await b.pages())[0] ?? (await b.newPage());
await page.evaluateOnNewDocument(() => {
  const asked = new URLSearchParams(location.search).get("e2e-hour");
  const hour = Number(asked);
  if (asked === null || !Number.isFinite(hour)) return;
  const Real = Date;
  const wanted = new Real();
  wanted.setHours(hour, 30, 0, 0);
  const skew = wanted.getTime() - Real.now();
  Date = class extends Real {
    constructor(...args) {
      super(...(args.length ? args : [Real.now() + skew]));
    }
    static now() {
      return Real.now() + skew;
    }
  };
  Date.UTC = Real.UTC;
  Date.parse = Real.parse;
});
await page.goto(`${BASE}/grow/?e2e-hour=10`, { waitUntil: "domcontentloaded" });
await page.evaluate((v) => localStorage.setItem("grow-state", v), JSON.stringify(seed));
await page.reload({ waitUntil: "domcontentloaded" });
await wait(2600);

const state = async () =>
  page.evaluate(() => ({
    face: [...document.querySelectorAll(".pet-face")].find((n) => getComputedStyle(n).opacity === "1")?.currentSrc?.split("/").pop() ?? null,
    mood: document.querySelector(".pet-mood")?.textContent?.trim() ?? null,
    pose: document.querySelector(".pet-pose")?.className ?? null,
    cloud: !!document.querySelector(".pet-cloud"),
  }));

const box = await page.evaluate(() => {
  const el = document.querySelector(".pet-figure");
  const card = document.querySelector(".pet-card");
  if (!el || !card) return null;
  el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    w: r.width,
    h: r.height,
    card: { left: c.left + 10, right: c.right - 10, top: c.top + 10, bottom: c.bottom - 10 },
  };
});
if (!box) throw new Error("no pet on screen");
await wait(400);

const shot = await page.evaluate(() => {
  const s = window.devicePixelRatio;
  return {
    x: Math.round(window.screenX * s),
    y: Math.round((window.screenY + (window.outerHeight - window.innerHeight)) * s),
    w: Math.round(window.innerWidth * s),
    h: Math.round(window.innerHeight * s),
  };
});
console.log(`CROP ${shot.w}:${shot.h}:${shot.x}:${shot.y}`);
console.log("low:", JSON.stringify(await state()));

const inside = ([x, y]) => [
  Math.min(box.card.right, Math.max(box.card.left, x)),
  Math.min(box.card.bottom, Math.max(box.card.top, y)),
];
const sweep = async (steps, from, to, step = 26) => {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    await wait(step);
  }
};

const right = inside([box.x + box.w * 0.48, box.y - box.h * 0.15]);
const left = inside([box.x - box.w * 0.48, box.y - box.h * 0.15]);
const mid = [box.x, box.y - box.h * 0.15];

// Untouched, so the recording opens on the slumped pose rather than a lean.
await page.mouse.move(box.card.right - 4, box.card.bottom - 4);
await wait(4500);

// Follow the pointer, twice each way, slowly.
await page.mouse.move(mid[0], mid[1]);
await wait(900);
await sweep(34, mid, right);
await wait(1000);
await sweep(52, right, left);
await wait(1000);
await sweep(52, left, right);
await wait(900);
await sweep(34, right, mid);
await wait(1200);
console.log("after looking:", JSON.stringify(await state()));

// Feed it, and let the eating and the change of mood play out.
const fed = await page.evaluate(() => {
  const hit = [...document.querySelectorAll(".pet-actions .g-chip-btn")].find((n) => n.innerText.includes("喂食") && !n.disabled);
  if (!hit) return false;
  const r = hit.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
if (!fed) throw new Error("feed button unavailable");
await sweep(20, mid, [fed.x, fed.y]);
await wait(700);
await page.mouse.click(fed.x, fed.y);
await wait(7500);
console.log("fed:", JSON.stringify(await state()));

// Once more, now happy, so both faces are on the recording following it.
await sweep(30, [fed.x, fed.y], right);
await wait(900);
await sweep(52, right, left);
await wait(1100);
await sweep(30, left, mid);
await wait(2600);
console.log("happy:", JSON.stringify(await state()));

await b.close();
