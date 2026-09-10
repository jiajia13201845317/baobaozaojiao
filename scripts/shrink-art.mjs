import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/shrink-art.mjs <art-dir>");
  process.exit(1);
}

const files = (await readdir(dir)).filter((name) => name.endsWith(".png"));
await Promise.all(
  files.map(async (name) => {
    const file = path.join(dir, name);
    const buf = await sharp(file)
      .resize(720, 720, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9, quality: 80 })
      .toBuffer();
    await writeFile(file, buf);
  })
);
console.log(`shrunk ${files.length} art files`);
