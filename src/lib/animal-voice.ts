import type { AnimalSoundId } from "./content";

/**
 * Animal calls built like a small voice: a soft harmonic source shaped by
 * formant filters, so a bark still sounds like a puppy instead of a beep.
 * Everything stays quiet, dark and slow to attack — a real bark's bite comes
 * from a loud click and lots of high harmonics, and both are capped here.
 */
type Call = {
  /** Pitch contour in Hz, walked across the whole call. */
  f0: number[];
  dur: number;
  /** Formant centres in Hz. Each entry may be a contour for a vowel glide. */
  formants: number[][];
  peak: number;
  /** Harmonic rolloff. Higher is softer: 2 is near a flute, 1 is buzzy. */
  rolloff?: number;
  attack?: number;
  /** Low-pass ceiling. Lower keeps a call from ever sounding sharp. */
  tone?: number;
  vibrato?: { hz: number; depth: number };
  /** Amplitude wobble. Fast rates read as a bleat, a croak or a whinny. */
  tremolo?: { hz: number; depth: number };
  breath?: number;
};

type Part = { at: number; call: Call };

const HARMONICS = 14;

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext) {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.4), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseCache.set(ctx, buf);
  return buf;
}

function softWave(ctx: BaseAudioContext, rolloff: number) {
  const real = new Float32Array(HARMONICS + 1);
  const imag = new Float32Array(HARMONICS + 1);
  for (let n = 1; n <= HARMONICS; n++) imag[n] = 1 / Math.pow(n, rolloff);
  return ctx.createPeriodicWave(real, imag);
}

function contour(param: AudioParam, points: number[], t0: number, dur: number) {
  param.setValueAtTime(points[0]!, t0);
  if (points.length < 2) return;
  const step = dur / (points.length - 1);
  for (let i = 1; i < points.length; i++) {
    param.linearRampToValueAtTime(points[i]!, t0 + step * i);
  }
}

function scheduleCall(
  ctx: BaseAudioContext,
  dest: AudioNode,
  track: (node: AudioScheduledSourceNode) => void,
  call: Call,
  t0: number,
) {
  const { dur, peak } = call;
  const attack = Math.max(0.018, call.attack ?? 0.03);
  const end = t0 + dur;

  const body = ctx.createGain();
  body.gain.setValueAtTime(0, t0);
  body.gain.linearRampToValueAtTime(peak, t0 + attack);
  body.gain.linearRampToValueAtTime(peak * 0.78, t0 + Math.min(dur * 0.7, attack + dur * 0.4));
  body.gain.exponentialRampToValueAtTime(0.0001, end);

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = call.tone ?? 2600;
  tone.Q.value = 0.4;

  const floor = ctx.createBiquadFilter();
  floor.type = "highpass";
  floor.frequency.value = 90;

  tone.connect(body);
  body.connect(floor);
  floor.connect(dest);

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(softWave(ctx, call.rolloff ?? 1.4));
  contour(osc.frequency, call.f0, t0, dur);

  if (call.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = call.vibrato.hz;
    depth.gain.value = call.vibrato.depth;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    track(lfo);
    lfo.start(t0);
    lfo.stop(end);
  }

  if (call.tremolo) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = call.tremolo.hz;
    depth.gain.value = call.tremolo.depth * peak;
    lfo.connect(depth);
    depth.connect(body.gain);
    track(lfo);
    lfo.start(t0);
    lfo.stop(end);
  }

  const weights = [1, 0.55, 0.28];
  call.formants.forEach((points, index) => {
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 5.5;
    contour(band.frequency, points, t0, dur);
    const level = ctx.createGain();
    level.gain.value = weights[index] ?? 0.2;
    osc.connect(band);
    band.connect(level);
    level.connect(tone);
  });

  track(osc);
  osc.start(t0);
  osc.stop(end);

  if (call.breath) {
    const puff = ctx.createBufferSource();
    puff.buffer = noiseBuffer(ctx);
    const shape = ctx.createBiquadFilter();
    shape.type = "bandpass";
    shape.frequency.value = call.formants[0]![0]!;
    shape.Q.value = 1.2;
    const level = ctx.createGain();
    const puffEnd = t0 + Math.min(dur, attack + 0.05);
    level.gain.setValueAtTime(0, t0);
    level.gain.linearRampToValueAtTime(peak * call.breath, t0 + attack * 0.8);
    level.gain.linearRampToValueAtTime(0, puffEnd);
    puff.connect(shape);
    shape.connect(level);
    level.connect(tone);
    track(puff);
    puff.start(t0);
    puff.stop(puffEnd);
  }
}

/**
 * Young, quiet versions of each call. Rising-then-falling pitch reads as
 * friendly; a bark that only slides down sounds like a warning.
 */
export const ANIMAL_VOICES: Record<AnimalSoundId, Part[]> = {
  dog: [
    { at: 0, call: { f0: [380, 540, 330], dur: 0.17, formants: [[900], [1750]], peak: 0.315, rolloff: 1.5, attack: 0.024, tone: 2300, breath: 0.18 } },
    { at: 0.32, call: { f0: [360, 500, 310], dur: 0.17, formants: [[880], [1700]], peak: 0.273, rolloff: 1.5, attack: 0.026, tone: 2300, breath: 0.16 } },
  ],
  cat: [
    {
      at: 0,
      call: {
        f0: [520, 700, 640, 430],
        dur: 0.62,
        formants: [[820, 1020, 700], [1150, 1620, 1080]],
        peak: 0.252,
        rolloff: 1.6,
        attack: 0.055,
        tone: 2400,
      },
    },
  ],
  chick: [
    { at: 0, call: { f0: [1480, 1900, 1650], dur: 0.09, formants: [[2100]], peak: 0.176, rolloff: 2, attack: 0.02, tone: 3200 } },
    { at: 0.2, call: { f0: [1520, 1960, 1700], dur: 0.09, formants: [[2150]], peak: 0.168, rolloff: 2, attack: 0.02, tone: 3200 } },
    { at: 0.4, call: { f0: [1440, 1860, 1620], dur: 0.09, formants: [[2050]], peak: 0.16, rolloff: 2, attack: 0.02, tone: 3200 } },
  ],
  duck: [
    { at: 0, call: { f0: [320, 250], dur: 0.14, formants: [[900], [1500]], peak: 0.2, rolloff: 1.1, attack: 0.02, tone: 2000 } },
    { at: 0.24, call: { f0: [300, 240], dur: 0.14, formants: [[880], [1450]], peak: 0.185, rolloff: 1.1, attack: 0.02, tone: 2000 } },
  ],
  cow: [
    {
      at: 0,
      call: {
        f0: [150, 132, 120],
        dur: 0.95,
        formants: [[500], [900]],
        peak: 0.315,
        rolloff: 1.5,
        attack: 0.09,
        tone: 1500,
        vibrato: { hz: 5, depth: 3 },
      },
    },
  ],
  sheep: [
    {
      at: 0,
      call: {
        f0: [430, 470, 400],
        dur: 0.55,
        formants: [[900], [1600]],
        peak: 0.2,
        rolloff: 1.3,
        attack: 0.045,
        tone: 2300,
        tremolo: { hz: 11, depth: 0.45 },
      },
    },
  ],
  pig: [
    { at: 0, call: { f0: [190, 145], dur: 0.11, formants: [[650], [1100]], peak: 0.315, rolloff: 1.2, attack: 0.02, tone: 1800, breath: 0.22 } },
    { at: 0.19, call: { f0: [182, 140], dur: 0.11, formants: [[630], [1080]], peak: 0.29, rolloff: 1.2, attack: 0.02, tone: 1800, breath: 0.2 } },
    { at: 0.38, call: { f0: [176, 136], dur: 0.11, formants: [[620], [1060]], peak: 0.27, rolloff: 1.2, attack: 0.02, tone: 1800, breath: 0.18 } },
  ],
  bird: [
    { at: 0, call: { f0: [2000, 2700, 2300], dur: 0.07, formants: [[2600]], peak: 0.151, rolloff: 2.1, attack: 0.018, tone: 3600 } },
    { at: 0.14, call: { f0: [2200, 2900, 2400], dur: 0.07, formants: [[2800]], peak: 0.143, rolloff: 2.1, attack: 0.018, tone: 3600 } },
    { at: 0.28, call: { f0: [2100, 2800, 2350], dur: 0.07, formants: [[2700]], peak: 0.134, rolloff: 2.1, attack: 0.018, tone: 3600 } },
  ],
  frog: [
    {
      at: 0,
      call: {
        f0: [205, 180],
        dur: 0.24,
        formants: [[600], [1150]],
        peak: 0.19,
        rolloff: 1.2,
        attack: 0.025,
        tone: 1700,
        tremolo: { hz: 38, depth: 0.8 },
      },
    },
    {
      at: 0.38,
      call: {
        f0: [198, 176],
        dur: 0.24,
        formants: [[580], [1120]],
        peak: 0.185,
        rolloff: 1.2,
        attack: 0.025,
        tone: 1700,
        tremolo: { hz: 38, depth: 0.8 },
      },
    },
  ],
  horse: [
    {
      at: 0,
      call: {
        f0: [660, 520, 380],
        dur: 0.5,
        formants: [[1000], [1850]],
        peak: 0.19,
        rolloff: 1.4,
        attack: 0.04,
        tone: 2400,
        tremolo: { hz: 14, depth: 0.5 },
      },
    },
  ],
  lion: [
    {
      at: 0,
      call: {
        f0: [150, 115, 98],
        dur: 0.7,
        formants: [[380], [720]],
        peak: 0.294,
        rolloff: 1.5,
        attack: 0.11,
        tone: 950,
        vibrato: { hz: 6.5, depth: 4 },
      },
    },
  ],
  elephant: [
    {
      at: 0,
      call: {
        f0: [430, 640, 470],
        dur: 0.5,
        formants: [[1000], [1800]],
        peak: 0.2,
        rolloff: 1.25,
        attack: 0.05,
        tone: 2400,
      },
    },
  ],
};

/** Schedules the whole call and returns how long it runs, in ms. */
export function playAnimalVoice(
  ctx: BaseAudioContext,
  dest: AudioNode,
  id: AnimalSoundId,
  track: (node: AudioScheduledSourceNode) => void,
  startAt = ctx.currentTime,
) {
  const parts = ANIMAL_VOICES[id];
  if (!parts) return 0;
  let end = 0;
  for (const part of parts) {
    scheduleCall(ctx, dest, track, part.call, startAt + part.at);
    end = Math.max(end, part.at + part.call.dur);
  }
  return Math.round(end * 1000);
}
