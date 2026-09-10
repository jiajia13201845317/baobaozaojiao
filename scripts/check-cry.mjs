import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { OfflineAudioContext } from "node-web-audio-api";
import { ANIMAL_VOICES, playAnimalVoice } from "../src/lib/animal-voice.ts";

const RATE = 48000;
const OUT = process.env.CRY_OUT || "/tmp/cry";

/** Dark calls must stay dark, chirps must stay bright, nothing may bite. */
const LIMITS = {
  dog: { maxCentroid: 1700, minAttack: 0.02 },
  cat: { maxCentroid: 1900, minAttack: 0.045 },
  chick: { minCentroid: 1300, maxCentroid: 3400 },
  duck: { maxCentroid: 1700 },
  cow: { maxCentroid: 1100, minAttack: 0.06 },
  sheep: { maxCentroid: 1900 },
  pig: { maxCentroid: 1400 },
  bird: { minCentroid: 1600, maxCentroid: 3800 },
  frog: { maxCentroid: 1400 },
  horse: { maxCentroid: 2100 },
  lion: { maxCentroid: 900, minAttack: 0.07 },
  elephant: { maxCentroid: 2100 },
};

async function render(id) {
  const spans = ANIMAL_VOICES[id].map((part) => part.at + part.call.dur);
  const seconds = Math.max(...spans) + 0.3;
  const ctx = new OfflineAudioContext(1, Math.ceil(RATE * seconds), RATE);
  playAnimalVoice(ctx, ctx.destination, id, () => {}, 0);
  const buffer = await ctx.startRendering();
  return buffer.getChannelData(0);
}

function peakOf(data) {
  let peak = 0;
  for (const s of data) peak = Math.max(peak, Math.abs(s));
  return peak;
}

/** Seconds from the first audible sample to 90% of the loudest one. */
function attackOf(data, peak) {
  let onset = -1;
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > peak * 0.02) {
      onset = i;
      break;
    }
  }
  if (onset < 0) return 0;
  for (let i = onset; i < data.length; i++) {
    if (Math.abs(data[i]) >= peak * 0.9) return (i - onset) / RATE;
  }
  return data.length / RATE;
}

/** Spectral centroid: a plain stand-in for how sharp a sound feels. */
function centroidOf(data) {
  const bins = [];
  for (let hz = 80; hz <= 6000; hz *= 1.12) bins.push(hz);
  let weighted = 0;
  let total = 0;
  for (const hz of bins) {
    const step = (2 * Math.PI * hz) / RATE;
    let re = 0;
    let im = 0;
    for (let i = 0; i < data.length; i += 2) {
      re += data[i] * Math.cos(step * i);
      im += data[i] * Math.sin(step * i);
    }
    const mag = Math.hypot(re, im);
    weighted += mag * hz;
    total += mag;
  }
  return total > 0 ? weighted / total : 0;
}

function wav(data) {
  const pcm = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; i++) {
    const clamped = Math.max(-1, Math.min(1, data[i]));
    pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

mkdirSync(OUT, { recursive: true });
const reel = [];

for (const id of Object.keys(ANIMAL_VOICES)) {
  const data = await render(id);
  const peak = peakOf(data);
  const attack = attackOf(data, peak);
  const centroid = centroidOf(data);
  const limits = LIMITS[id] ?? {};

  assert.ok(peak > 0.08, `${id} peaks at ${peak.toFixed(3)}, too faint to hear on a phone`);
  assert.ok(peak < 0.3, `${id} peaks at ${peak.toFixed(3)}, too loud for a nursery`);
  assert.ok(attack >= (limits.minAttack ?? 0.015), `${id} attacks in ${(attack * 1000).toFixed(0)}ms, that clicks`);
  if (limits.maxCentroid) {
    assert.ok(centroid <= limits.maxCentroid, `${id} centroid ${centroid.toFixed(0)}Hz is sharper than ${limits.maxCentroid}Hz`);
  }
  if (limits.minCentroid) {
    assert.ok(centroid >= limits.minCentroid, `${id} centroid ${centroid.toFixed(0)}Hz is too dull to read as a chirp`);
  }

  writeFileSync(`${OUT}/${id}.wav`, wav(data));
  reel.push(data, new Float32Array(Math.round(RATE * 0.45)));
  console.log(
    `${id.padEnd(9)} peak ${peak.toFixed(3)}  attack ${(attack * 1000).toFixed(0)}ms  centroid ${centroid.toFixed(0)}Hz`,
  );
}

const total = reel.reduce((n, part) => n + part.length, 0);
const joined = new Float32Array(total);
let at = 0;
for (const part of reel) {
  joined.set(part, at);
  at += part.length;
}
writeFileSync(`${OUT}/all-animals.wav`, wav(joined));
console.log(`\ncry checks passed, audio in ${OUT}`);
