/** Scratch: frame strips of the resting poses and the gaze, to look at. */
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BASE = "http://127.0.0.1:43147";
const OUT = "/tmp/frames";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 86400000;
const now = Date.now();
const d = new Date();
d.setMonth(d.getMonth() - 15);
const birthday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const seedFor = (ago) => ({
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
      care: { p1: { food: { at: now - ago * DAY, value: 100 }, play: { at: now - ago * DAY, value: 100 }, bath: { at: now - ago * DAY, value: 100 } } },
      spent: 0,
    },
  },
  settings: { consent: { basic: true, personalised: true, photos: false, notify: false, guardianAt: 1 }, mode: "full", bilingual: false, pin: null, kid: false, reminders: {} },
  carers: [],
  by: null,
  log: [],
});

await mkdir(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "shell", args: ["--no-sandbox"] });
const page = await b.newPage();
await page.setViewport({ width: 460, height: 1000, deviceScaleFactor: 1.6 });

const load = async (ago) => {
  await page.goto(`${BASE}/grow/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((v) => localStorage.setItem("grow-state", v), JSON.stringify(seedFor(ago)));
  await page.reload({ waitUntil: "domcontentloaded" });
  await wait(2200);
};

/** Freeze the pose animation at a given fraction of its cycle. */
const at = (frac) =>
  page.evaluate((f) => {
    const el = document.querySelector(".pet-pose");
    const anims = el.getAnimations();
    for (const a of anims) {
      a.pause();
      const dur = a.effect.getTiming().duration;
      a.currentTime = typeof dur === "number" ? dur * f : 0;
    }
    return anims.map((a) => a.animationName ?? "?");
  }, frac);

const pin = (x, y) =>
  page.evaluate(
    ([x, y]) => {
      document.getElementById("gaze-pin")?.remove();
      const tag = document.createElement("style");
      tag.id = "gaze-pin";
      tag.textContent = `.pet-look { --look-x: ${x} !important; --look-y: ${y} !important; transition: none !important; }`;
      document.head.appendChild(tag);
    },
    [x, y],
  );

const strip = async (files, dest, bg = "#eef1f6") => {
  const metas = [];
  for (const f of files) metas.push(await sharp(f).metadata());
  const w = metas.reduce((s, m) => s + m.width, 0) + 8 * (files.length + 1);
  const h = Math.max(...metas.map((m) => m.height)) + 16;
  let x = 8;
  const layers = [];
  for (let i = 0; i < files.length; i++) {
    layers.push({ input: files[i], left: x, top: 8 });
    x += metas[i].width + 8;
  }
  await sharp({ create: { width: w, height: h, channels: 3, background: bg } }).composite(layers).png().toFile(dest);
  console.log(dest, w, h);
};

// The resting pose of each mood, across its cycle.
for (const [name, ago] of [["happy", 0], ["down", 9]]) {
  await load(ago);
  await pin(0, 0);
  const files = [];
  for (let i = 0; i < 5; i++) {
    const names = await at(i / 4);
    await wait(150);
    const f = `${OUT}/${name}-${i}.png`;
    await (await page.$(".pet-faces")).screenshot({ path: f });
    files.push(f);
    if (i === 0) console.log(`${name} pose animation:`, JSON.stringify(names), await page.evaluate(() => getComputedStyle(document.querySelector(".pet-pose")).transform));
  }
  await strip(files, `${OUT}/pose-${name}.png`);
}

// The gaze, across its range, on a low pet where it stacks with the droop.
await load(9);
{
  const files = [];
  for (const x of [-1, -0.5, 0, 0.5, 1]) {
    await pin(x, 0);
    await at(0);
    await wait(150);
    const f = `${OUT}/gaze-down-${x}.png`;
    await (await page.$(".pet-faces")).screenshot({ path: f });
    files.push(f);
    console.log(
      `low pet, look ${x}:`,
      JSON.stringify(
        await page.evaluate(() => {
          const read = (sel) => {
            const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector(sel)).transform);
            const el = document.querySelector(sel);
            const h = el.getBoundingClientRect().height || 1;
            return {
              rot: +((Math.atan2(m.b, m.a) * 180) / Math.PI).toFixed(2),
              shear: +((Math.atan2(-m.c, m.d) * 180) / Math.PI).toFixed(2),
              head: +(m.c * -0.96 * h + m.e).toFixed(1),
            };
          };
          return { look: read(".pet-look"), pose: read(".pet-pose"), lag: read(".pet-lag") };
        }),
      ),
    );
  }
  await strip(files, `${OUT}/gaze-on-droop.png`);
}

await b.close();
