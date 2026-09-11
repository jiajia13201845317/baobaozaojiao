import sharp from "sharp";

/**
 * The three pet stages come back on slightly different cream backgrounds, so
 * the card would flash a new colour every time the pet evolves.
 *
 * Keying purely on colour distance does not work here: the pet's own ivory
 * parts (the egg's speckles, the hatchling's belly and shell cap, the wings)
 * sit right next to the backdrop in RGB and get eaten. So flood fill inward
 * from the border instead and only repaint background that is actually
 * connected to the edge. The soft contact shadow falls outside the tolerance
 * and survives, which keeps the pet grounded.
 */
const TARGET = [246, 239, 224];
const TOLERANCE = 20;

for (const name of process.argv.slice(2)) {
  const file = `public/art/grow/${name}.png`;
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const seed = [data[0], data[1], data[2]];

  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) {
    stack.push(x, x + (height - 1) * width);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, width - 1 + y * width);
  }

  let filled = 0;
  while (stack.length) {
    const at = stack.pop();
    if (seen[at]) continue;
    const i = at * channels;
    const d = Math.hypot(data[i] - seed[0], data[i + 1] - seed[1], data[i + 2] - seed[2]);
    if (d > TOLERANCE) continue;
    seen[at] = 1;
    filled += 1;
    data[i] = TARGET[0];
    data[i + 1] = TARGET[1];
    data[i + 2] = TARGET[2];
    const x = at % width;
    const y = (at / width) | 0;
    if (x > 0) stack.push(at - 1);
    if (x < width - 1) stack.push(at + 1);
    if (y > 0) stack.push(at - width);
    if (y < height - 1) stack.push(at + width);
  }

  await sharp(data, { raw: { width, height, channels } })
    .resize(720, 720, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`${name}: seed rgb(${seed}) repainted ${((filled / (width * height)) * 100).toFixed(0)}% of the frame`);
}
