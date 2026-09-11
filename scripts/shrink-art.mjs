import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/shrink-art.mjs <art-dir>");
  process.exit(1);
}

/** Art lives in subfolders too, so walk the whole tree rather than one level. */
async function pngsUnder(root) {
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...(await pngsUnder(full)));
    else if (entry.name.endsWith(".png")) out.push(full);
  }
  return out;
}

const files = await pngsUnder(dir);
await Promise.all(
  files.map(async (file) => {
    const buf = await sharp(file)
      .resize(720, 720, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9, quality: 80 })
      .toBuffer();
    await writeFile(file, buf);
  })
);
console.log(`shrunk ${files.length} art files`);
