import { mkdir } from "node:fs/promises";
import sharp from "sharp";

/**
 * The pet's props — the rain cloud, the raindrop, the heart, the bubble, the
 * sparkle, the crumb.
 *
 * These exist because the first version drew them in CSS: the cloud was three
 * grey circles, the raindrops were hairline rects, the bubbles were 9px rings.
 * Next to a glossy 3D blind-box dinosaur they read as dust and scratches, and
 * that mismatch in rendering quality was the whole of why the card looked
 * cheap. So they are rendered in the same style as the creatures and shipped
 * as art.
 *
 * They arrive as one sheet in a row. Slicing at even intervals would be
 * guessing — the generator spaces them however it likes — so this finds each
 * object by flood-filling the background away and then labelling what is
 * left, which works whatever the spacing turns out to be.
 */
const SEED = [255, 255, 255];
/** Alpha ramps from nothing at pure white to solid at this distance. */
const FEATHER_FROM = 8;
const FEATHER_TO = 26;
/** Below this share of the sheet an island is a stray speck, not a prop. */
const MIN_AREA = 0.0004;
/** Long edge of each emitted prop. They render between 10 and 60 CSS px. */
const LONG = 192;

const SRC = process.argv[2] || "/opt/cursor/artifacts/assets/prop-sheet.png";
const OUT = "public/art/prop";

/** Left to right, matching the order they were asked for on the sheet. */
const NAMES = ["cloud", "drop", "heart", "bubble", "star", "crumb"];

/**
 * Erase the backdrop by flooding inward from the frame.
 *
 * Keying on colour alone would destroy the soap bubble, which is almost pure
 * white inside. Flooding only reaches background actually connected to the
 * edge, and the bubble's rim — faint as it is — encloses its interior.
 */
function cutout(data, width, height) {
  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, x + (height - 1) * width);
  for (let y = 0; y < height; y++) stack.push(y * width, width - 1 + y * width);

  while (stack.length) {
    const at = stack.pop();
    if (seen[at]) continue;
    const i = at * 4;
    const d = Math.hypot(data[i] - SEED[0], data[i + 1] - SEED[1], data[i + 2] - SEED[2]);
    if (d > FEATHER_TO) continue;
    seen[at] = 1;
    data[i + 3] = d <= FEATHER_FROM ? 0 : Math.round((255 * (d - FEATHER_FROM)) / (FEATHER_TO - FEATHER_FROM));
    const x = at % width;
    const y = (at / width) | 0;
    if (x > 0) stack.push(at - 1);
    if (x < width - 1) stack.push(at + 1);
    if (y > 0) stack.push(at - width);
    if (y < height - 1) stack.push(at + width);
  }
}

/**
 * The bounding box of every surviving island, left to right.
 *
 * Islands are grown from any pixel the cutout did not fully erase. A soft
 * feathered edge leaves a rim of low alpha, so the threshold is low enough to
 * keep that rim inside the box rather than clipping the object's own
 * antialiasing.
 */
function islands(data, width, height) {
  const solid = (at) => data[at * 4 + 3] > 12;
  const seen = new Uint8Array(width * height);
  const boxes = [];

  for (let start = 0; start < width * height; start++) {
    if (seen[start] || !solid(start)) continue;
    let x0 = width;
    let y0 = height;
    let x1 = -1;
    let y1 = -1;
    let area = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const at = stack.pop();
      const x = at % width;
      const y = (at / width) | 0;
      area++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const next of [x > 0 ? at - 1 : -1, x < width - 1 ? at + 1 : -1, y > 0 ? at - width : -1, y < height - 1 ? at + width : -1]) {
        if (next >= 0 && !seen[next] && solid(next)) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    if (area / (width * height) >= MIN_AREA) boxes.push({ x0, y0, x1, y1, area });
  }

  return boxes.sort((a, b) => a.x0 - b.x0);
}

await mkdir(OUT, { recursive: true });

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
cutout(data, info.width, info.height);
const cut = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();

const boxes = islands(data, info.width, info.height);
if (boxes.length !== NAMES.length) {
  throw new Error(`expected ${NAMES.length} props on the sheet, found ${boxes.length}: ${JSON.stringify(boxes)}`);
}

for (const [i, box] of boxes.entries()) {
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  // Trimmed to its own bounding box rather than padded into a square, so the
  // CSS can size each prop directly and nothing has to be object-fitted.
  const scale = LONG / Math.max(w, h);
  await sharp(cut)
    .extract({ left: box.x0, top: box.y0, width: w, height: h })
    .resize(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)))
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(`${OUT}/${NAMES[i]}.webp`);
  console.log(`${NAMES[i]}.webp  ${Math.round(w * scale)}x${Math.round(h * scale)}`);
}
