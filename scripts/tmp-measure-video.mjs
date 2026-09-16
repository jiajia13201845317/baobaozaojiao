/**
 * Scratch: measure the pet's feet and head across the recording.
 *
 * Settles by pixels, on the rendered video rather than the DOM, whether the
 * feet stay put while the head leans, and how long the change of mood takes.
 * The creature is found by its colour — the only saturated green on the card —
 * and the bands are taken relative to its own bounding box each frame, so the
 * idle bounce does not move them off it.
 */
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";

const VIDEO = "/opt/cursor/artifacts/pet_natural_lean_feet_planted_and_moods_crossfade.mp4";
const TMP = "/tmp/vmeasure";
if (!existsSync(`${TMP}/f-0060.png`)) {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  execFileSync("ffmpeg", ["-v", "error", "-i", VIDEO, "-vf", "fps=4", `${TMP}/f-%04d.png`]);
}

/** The card's picture window, in this crop's coordinates. */
const WINDOW = { x0: 185, x1: 625, y0: 230, y1: 415 };

const rows = [];
for (let i = 1; ; i++) {
  const path = `${TMP}/f-${String(i).padStart(4, "0")}.png`;
  let raw;
  try {
    raw = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  } catch {
    break;
  }
  const { data, info } = raw;
  const W = info.width;
  const C = info.channels;
  const green = (x, y) => {
    const p = (y * W + x) * C;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    return g > 120 && g - r > 8 && g - b > 45;
  };

  let top = Infinity;
  let bottom = -1;
  let seen = 0;
  for (let y = WINDOW.y0; y < WINDOW.y1; y++) {
    let n = 0;
    for (let x = WINDOW.x0; x < WINDOW.x1; x++) if (green(x, y)) n += 1;
    if (n >= 12) {
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      seen += n;
    }
  }

  let head = null;
  let feet = null;
  if (bottom > top + 40) {
    const h = bottom - top;
    const centre = (y0, y1) => {
      let sum = 0;
      let n = 0;
      for (let y = y0; y <= y1; y++) {
        for (let x = WINDOW.x0; x < WINDOW.x1; x++) {
          if (green(x, y)) {
            sum += x;
            n += 1;
          }
        }
      }
      return n > 40 ? sum / n : null;
    };
    head = centre(top, top + Math.round(h * 0.22));
    feet = centre(bottom - Math.round(h * 0.1), bottom);
  }

  /* Purple card versus green card, read in a corner of the window well away
   * from the creature. */
  let blue = 0;
  let count = 0;
  for (let y = WINDOW.y0 + 6; y < WINDOW.y0 + 34; y++) {
    for (let x = WINDOW.x0 + 6; x < WINDOW.x0 + 50; x++) {
      const p = (y * W + x) * C;
      blue += data[p + 2] - data[p + 1];
      count += 1;
    }
  }

  rows.push({ t: (i - 1) / 4, head, feet, seen, blueness: blue / count });
}

const ok = rows.filter((r) => r.head !== null && r.feet !== null);
console.log(`${rows.length} frames sampled, ${ok.length} with the creature measurable\n`);

const spread = (key, from, to) => {
  const vals = ok.filter((r) => r.t >= from && r.t <= to).map((r) => r[key]);
  if (!vals.length) return null;
  return +(Math.max(...vals) - Math.min(...vals)).toFixed(1);
};

for (const [label, from, to] of [
  ["while sweeping, sad ", 8, 22],
  ["while sweeping, happy", 31, 45],
  ["while nobody points  ", 5.5, 7.5],
]) {
  const h = spread("head", from, to);
  const f = spread("feet", from, to);
  if (h === null) {
    console.log(`${label}: no frames`);
    continue;
  }
  console.log(`${label}: head travels ${h}px, feet travel ${f}px  (${(h / Math.max(f, 0.1)).toFixed(1)}x more at the head)`);
}

console.log("\nchange of mood, every 250ms (blueness high = purple card, low = green):");
for (const r of rows.filter((x) => x.t >= 24 && x.t <= 28)) {
  console.log(`  ${r.t.toFixed(2)}s  blueness ${r.blueness.toFixed(1).padStart(6)}`);
}
