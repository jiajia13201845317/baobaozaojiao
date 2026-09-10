import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Pulls real animal recordings from Wikimedia Commons and softens them for a
 * one-year-old: one short call, no startling onset, no bright top end.
 * Run with: node scripts/fetch-sfx.mjs
 */
const API = "https://commons.wikimedia.org/w/api.php";
const OUT = "public/sfx";

/**
 * `single` keeps only the first call in a take, so a dog says one woof instead
 * of a frantic string of them. `speed` above 1 lifts pitch and formants, which
 * is what makes a grown animal read as a puppy or a cub.
 */
const CLIPS = [
  { id: "dog", file: "File:Ladrido perro.ogg", len: 0.8, lowpass: 2000, speed: 1.35, single: true, fadeIn: 0.1, gain: 0.75 },
  { id: "cat", file: "File:Meow of a pleading cat.oga", len: 1.1, lowpass: 3200, speed: 1.06, single: true, fadeIn: 0.06 },
  { id: "chick", file: "File:Rock-wren-chicks-begging.ogg", len: 1.2, lowpass: 4200, fadeIn: 0.05, gain: 0.9 },
  { id: "duck", file: "File:Pekin duck & mallard.ogg", len: 1.0, lowpass: 2800, fadeIn: 0.04 },
  { id: "cow", file: "File:Single Cow Moo.ogg", len: 1.5, lowpass: 2000, fadeIn: 0.08 },
  { id: "sheep", file: "File:Sheep bleat.ogg", len: 1.6, lowpass: 2800, fadeIn: 0.05 },
  { id: "pig", file: "File:Pig grunt - Erdie.ogg", len: 1.0, lowpass: 2200, single: true, fadeIn: 0.05, gain: 0.85 },
  { id: "bird", file: "File:Arremon abeillei - Black-capped Sparrow XC250490.mp3", len: 0.9, lowpass: 3400, fadeIn: 0.06, gain: 0.75 },
  { id: "frog", file: "File:Single Frog Croak.oga", len: 1.0, lowpass: 2400, fadeIn: 0.05 },
  { id: "horse", file: "File:Wiehern.ogg", len: 1.2, lowpass: 1600, fadeIn: 0.22, gain: 0.65 },
  { id: "lion", file: "File:Lion raring-sound1TamilNadu178.ogg", len: 1.2, lowpass: 900, speed: 1.3, fadeIn: 0.16, gain: 0.8 },
  { id: "elephant", file: "File:Elephant voice - trumpeting.ogg", len: 1.3, lowpass: 1000, fadeIn: 0.32, gain: 0.58 },
];

function ffmpeg(args) {
  return execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Commons throttles bursts, so back off instead of giving up. */
async function download(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      headers: { "user-agent": "bao-bao-ting-ting/1.0 (nursery toy; contact liujia@espressif.com)" },
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`download ${res.status}`);
    await wait(1500 * 2 ** attempt);
  }
  throw new Error("download kept failing");
}

async function meta(titles) {
  const url = new URL(API);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", titles.join("|"));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`commons api ${res.status}`);
  const data = await res.json();
  const out = new Map();
  for (const page of Object.values(data.query.pages)) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const extra = info.extmetadata ?? {};
    out.set(page.title, {
      url: info.url,
      descriptionUrl: info.descriptionurl,
      license: extra.LicenseShortName?.value ?? "see file page",
      author: (extra.Artist?.value ?? "unknown").replace(/<[^>]+>/g, "").trim(),
    });
  }
  return out;
}

const PROBE_RATE = 8000;
/** About 0.4 full scale: loud enough on a phone, never a shout. */
const CEILING_DB = -8;

function peakDb(wav) {
  // volumedetect reports on stderr.
  const probe = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "volumedetect", "-f", "null", "-"], {
    encoding: "utf8",
  });
  const found = /max_volume:\s*(-?[\d.]+) dB/.exec(probe.stderr ?? "");
  if (!found) throw new Error("volumedetect found no peak");
  return Number(found[1]);
}

function envelope(wav) {
  const raw = execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-i", wav,
    "-ac", "1", "-ar", String(PROBE_RATE), "-f", "f32le", "-",
  ], { maxBuffer: 1 << 28 });
  const data = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const span = Math.round(PROBE_RATE * 0.01);
  const env = new Float32Array(Math.floor(data.length / span));
  for (let i = 0; i < env.length; i++) {
    let peak = 0;
    for (let j = i * span; j < (i + 1) * span; j++) peak = Math.max(peak, Math.abs(data[j]));
    env[i] = peak;
  }
  return { env, step: 0.01 };
}

/** Loudest window, so we keep the call and drop the room noise around it. */
function pickWindow({ env, step }, len) {
  const win = Math.round(len / step);
  if (env.length <= win) return { at: 0, len };
  let best = 0;
  let bestEnergy = -1;
  for (let start = 0; start + win < env.length; start++) {
    let energy = 0;
    for (let i = start; i < start + win; i++) energy += env[i] * env[i];
    if (energy > bestEnergy) {
      bestEnergy = energy;
      best = start;
    }
  }
  return { at: Math.max(0, best * step - 0.06), len };
}

/** First call only: cut where the take goes quiet for a beat. */
function pickBurst({ env, step }, maxLen) {
  let loudest = 0;
  for (const v of env) loudest = Math.max(loudest, v);
  const onset = env.findIndex((v) => v > loudest * 0.22);
  if (onset < 0) return { at: 0, len: maxLen };
  const quietFor = Math.round(0.09 / step);
  let quiet = 0;
  let end = env.length - 1;
  for (let i = onset; i < env.length; i++) {
    quiet = env[i] < loudest * 0.1 ? quiet + 1 : 0;
    if (quiet >= quietFor) {
      end = i - quiet;
      break;
    }
  }
  const at = Math.max(0, onset * step - 0.04);
  const len = Math.min(maxLen, Math.max(0.3, (end - onset) * step + 0.16));
  return { at, len };
}

mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "sfx-"));
const info = await meta(CLIPS.map((c) => c.file));
const credits = [
  "Animal calls used for the 动物叫声 room.",
  "Source: Wikimedia Commons. Each clip is trimmed to one call, low-passed,",
  "faded in over 30ms and levelled down so it cannot startle a baby.",
  "Regenerate with: node scripts/fetch-sfx.mjs",
  "",
];

for (const clip of CLIPS) {
  const found = info.get(clip.file);
  if (!found) throw new Error(`no Commons metadata for ${clip.file}`);
  const src = join(work, `${clip.id}-src`);
  writeFileSync(src, await download(found.url));
  await wait(500);

  const decoded = join(work, `${clip.id}.wav`);
  ffmpeg(["-i", src, "-ac", "1", "-ar", "48000", decoded]);
  const probe = envelope(decoded);
  const cut = clip.single ? pickBurst(probe, clip.len) : pickWindow(probe, clip.len);

  const speed = clip.speed ?? 1;
  const fadeIn = clip.fadeIn ?? 0.04;
  const out = cut.len / speed;
  const chain = [
    `highpass=f=90`,
    `lowpass=f=${clip.lowpass}`,
    speed !== 1 ? `asetrate=48000*${speed},aresample=48000` : null,
    `afade=t=in:st=0:d=${fadeIn}`,
    `afade=t=out:st=${Math.max(0.05, out - 0.16).toFixed(3)}:d=0.16`,
    // Even out perceived loudness between a moo and a chirp.
    `loudnorm=I=-24:TP=-9:LRA=7`,
    `volume=${clip.gain ?? 1}`,
  ]
    .filter(Boolean)
    .join(",");

  const shaped = join(work, `${clip.id}-shaped.wav`);
  ffmpeg(["-ss", cut.at.toFixed(3), "-t", cut.len.toFixed(3), "-i", decoded, "-af", chain, "-ac", "1", shaped]);

  // loudnorm in one pass overshoots, so pull any peak back to the ceiling.
  const trim = Math.min(0, CEILING_DB - peakDb(shaped));
  ffmpeg([
    "-i", shaped,
    "-af", `volume=${trim.toFixed(2)}dB`,
    "-ac", "1", "-ar", "32000", "-b:a", "64k",
    `${OUT}/${clip.id}.mp3`,
  ]);

  credits.push(`${clip.id}: ${clip.file.replace("File:", "")} — ${found.author} — ${found.license}`);
  credits.push(`  ${found.descriptionUrl}`);
  console.log(
    `${clip.id.padEnd(9)} ${cut.at.toFixed(2)}s +${cut.len.toFixed(2)}s of ${clip.file.replace("File:", "")}`,
  );
}

writeFileSync(`${OUT}/CREDITS.txt`, `${credits.join("\n")}\n`);
console.log(`\nwrote ${CLIPS.length} clips to ${OUT}`);
