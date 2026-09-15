import { mkdir } from "node:fs/promises";
import sharp from "sharp";

/**
 * The pet art is generated on a flat white backdrop: the incubating egg one
 * frame at a time, the collection three creatures to a sheet. This turns both
 * into centred, transparent, equally sized PNGs the cards can sit on top of a
 * coloured gradient.
 *
 * Cutting the backdrop out cannot key on colour alone — several creatures are
 * near-white themselves (the frosty one, the cream bellies, the eye
 * highlights). So flood fill inward from the frame edge and only touch
 * background that is actually connected to it.
 *
 * The fill fades rather than cuts: alpha ramps from nothing at pure white up
 * to solid at FEATHER_TO. That erases the wide pale halo the renderer leaves
 * while keeping the dense core of the contact shadow, so the creature still
 * looks like it is standing on something.
 */
const SEED = [255, 255, 255];
const FEATHER_FROM = 10;
const FEATHER_TO = 30;
/** The hero renders at ~13rem, so 448 covers a 2x screen with room to spare. */
const SIZE = 448;

const SHEETS = [
  { id: "forest", file: "series-forest.png" },
  { id: "fire", file: "series-fire2.png" },
  { id: "ice", file: "series-ice2.png" },
  { id: "wind", file: "series-wind.png" },
  { id: "water", file: "series-water.png" },
  { id: "light", file: "series-light.png" },
  { id: "star", file: "series-star.png" },
];

const EGGS = [
  { id: "egg-1", file: "pet-1-egg.png" },
  { id: "egg-2", file: "pet-2-crack.png" },
  { id: "egg-3", file: "pet-3-hatch.png" },
];

/**
 * The same cast again, one sheet per mood.
 *
 * With a single render each, the pet smiled through everything. The mood was
 * told by the weather over its head and the light in the room but never by the
 * face, which is the first place anyone looks, so a pet that had not been fed
 * in a week still beamed. These sheets were generated from the renders above
 * as references with only the expression and stance changed, so the same
 * creature can pull a different face without turning into a different
 * creature. 开心 keeps the original grin; the rest come from here.
 */
const MOODS = ["flat", "sad", "sleepy"];

const MOOD_SHEETS = MOODS.flatMap((mood) =>
  ["forest", "fire", "ice", "wind", "water", "light", "star", "egg"].map((id) => ({
    id,
    mood,
    file: `${id}-${mood}-sheet.png`,
  })),
);

const SRC = process.argv[2] || "/opt/cursor/artifacts/assets";
const OUT = "public/art/pet";

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

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  if (max === min) return [0, 0, light];
  const d = max - min;
  const sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue;
  if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return [(hue * 60) % 360, sat, light];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((v) => Math.round((v + m) * 255));
}

/**
 * The 蛋仔 is a girl's egg too, and one render is cheaper than two.
 *
 * Rotating only the mint hues to pink keeps the parts that carry the
 * character: the eyes stay black, the cream shell spots stay cream, the blush
 * stays blush. Anything already outside the green-cyan band, or too dark or
 * too grey to be body colour, is left alone.
 */
function mintToPink(data) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (h < 105 || h > 205 || s < 0.08 || l < 0.18) continue;
    const [r, g, b] = hslToRgb(338, Math.min(0.72, Math.max(0.24, s * 1.12)), l);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

async function emit(input, name) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  cutout(data, info.width, info.height);
  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer()
    .then((buf) =>
      sharp(buf)
        .trim({ threshold: 8 })
        .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
    );

  await sharp(trimmed).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(`${OUT}/${name}.webp`);
  console.log(`${name}.webp`);

  // Only the shared incubation stages get a themed pair; a revealed creature
  // already carries its own element colour.
  if (name.startsWith("egg-")) {
    const pink = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    mintToPink(pink.data);
    await sharp(pink.data, { raw: { width: pink.info.width, height: pink.info.height, channels: 4 } })
      .webp({ quality: 86, alphaQuality: 90, effort: 6 })
      .toFile(`${OUT}/${name}-pink.webp`);
    console.log(`${name}-pink.webp`);
  }
}

/** Every sheet is one row of three, so the tiles are thirds of the width. */
async function tiles(src) {
  const { width, height } = await sharp(src).metadata();
  const third = Math.floor(width / 3);
  const out = [];
  for (let i = 0; i < 3; i++) {
    out.push(
      await sharp(src)
        .extract({ left: i * third, top: 0, width: i === 2 ? width - 2 * third : third, height })
        .png()
        .toBuffer(),
    );
  }
  return out;
}

await mkdir(OUT, { recursive: true });

for (const egg of EGGS) {
  await emit(`${SRC}/${egg.file}`, egg.id);
}

for (const sheet of [...SHEETS, ...MOOD_SHEETS]) {
  const suffix = sheet.mood ? `-${sheet.mood}` : "";
  for (const [i, tile] of (await tiles(`${SRC}/${sheet.file}`)).entries()) {
    await emit(tile, `${sheet.id}-${i + 1}${suffix}`);
  }
}
