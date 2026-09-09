import type { AnimalSoundId, Flashcard, LessonStep, Note, Poem, Song, Story } from "./content";

const FREQ: Record<string, number> = {
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  rest: 0,
};

export type LineInfo = {
  text: string;
  lang?: "zh-CN" | "en-US";
  kind?: "verse" | "fun" | "story";
};

type PlayToken = number;

class ToyPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private token: PlayToken = 0;
  private volume = 0.82;
  private oscillators: OscillatorNode[] = [];

  onLine: ((info: LineInfo) => void) | null = null;
  onEnded: ((kind?: "item" | "tap") => void) | null = null;
  onStep: ((step: LessonStep) => void) | null = null;

  get ready() {
    return Boolean(this.ctx);
  }

  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    this.warmVoices();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  tap() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  stop() {
    this.token += 1;
    window.speechSynthesis?.cancel();
    for (const osc of this.oscillators) {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
    }
    this.oscillators = [];
  }

  async playSong(song: Song) {
    const t = this.begin();
    this.emit({ text: song.title, lang: song.lyricLang });
    await this.playMelody(song.melody, t);
    if (!this.alive(t)) return;
    await this.wait(280, t);
    for (const line of song.lyrics) {
      if (!this.alive(t)) return;
      this.emit({ text: line, lang: song.lyricLang });
      await this.speak(line, song.lyricLang, t);
      await this.wait(180, t);
    }
    if (this.alive(t)) this.onEnded?.("item");
  }

  async playLesson(card: Flashcard) {
    const t = this.begin();
    this.onStep?.("zh");
    this.emit({ text: card.zh, lang: "zh-CN" });
    await this.speak(card.zh, "zh-CN", t);
    if (!this.alive(t)) return;
    await this.wait(220, t);
    this.onStep?.("en");
    this.emit({ text: card.en, lang: "en-US" });
    await this.speak(card.en, "en-US", t);
    if (!this.alive(t)) return;
    if (card.cry) {
      await this.wait(180, t);
      this.onStep?.("sound");
      this.emit({ text: card.cry, lang: "zh-CN" });
      await this.speak(card.cry, "zh-CN", t);
      if (!this.alive(t)) return;
      if (card.sound) await this.playAnimalSound(card.sound, t);
    }
    if (this.alive(t)) this.onEnded?.("item");
  }

  async playCry(card: Flashcard) {
    const t = this.begin();
    if (card.cry) {
      this.onStep?.("sound");
      this.emit({ text: card.cry, lang: "zh-CN" });
      await this.speak(card.cry, "zh-CN", t);
      if (!this.alive(t)) return;
      if (card.sound) await this.playAnimalSound(card.sound, t);
    } else {
      this.onStep?.("zh");
      this.emit({ text: card.zh, lang: "zh-CN" });
      await this.speak(card.zh, "zh-CN", t);
      if (!this.alive(t)) return;
      this.onStep?.("en");
      this.emit({ text: card.en, lang: "en-US" });
      await this.speak(card.en, "en-US", t);
    }
    if (this.alive(t)) this.onEnded?.("tap");
  }

  async playStory(story: Story) {
    const t = this.begin();
    this.emit({ text: story.title, lang: "zh-CN" });
    await this.chime(t);
    await this.speak(story.title, "zh-CN", t);
    if (!this.alive(t)) return;
    await this.wait(320, t);
    for (const line of story.lines) {
      if (!this.alive(t)) return;
      this.emit({ text: line, lang: "zh-CN", kind: "story" });
      await this.speak(line, "zh-CN", t);
      await this.wait(280, t);
    }
    if (this.alive(t)) {
      await this.chime(t);
      this.onEnded?.("item");
    }
  }

  async playPoem(poem: Poem) {
    const t = this.begin();
    this.emit({ text: poem.title, lang: "zh-CN", kind: "verse" });
    await this.chime(t);
    await this.speak(`${poem.title}，${poem.author}`, "zh-CN", t);
    if (!this.alive(t)) return;
    await this.wait(280, t);
    for (const verse of poem.verses) {
      if (!this.alive(t)) return;
      this.emit({ text: verse, lang: "zh-CN", kind: "verse" });
      await this.speak(verse, "zh-CN", t);
      await this.wait(320, t);
    }
    if (!this.alive(t)) return;
    await this.wait(400, t);
    for (const line of poem.fun) {
      if (!this.alive(t)) return;
      this.emit({ text: line, lang: "zh-CN", kind: "fun" });
      await this.speak(line, "zh-CN", t);
      await this.wait(260, t);
    }
    if (this.alive(t)) this.onEnded?.("item");
  }

  async sayGoodnight() {
    const t = this.begin();
    this.emit({ text: "该睡觉啦", lang: "zh-CN" });
    await this.speak("宝宝，该睡觉啦", "zh-CN", t);
  }

  async sayLine(text: string) {
    const t = this.begin();
    this.emit({ text, lang: "zh-CN" });
    await this.speak(text, "zh-CN", t);
  }

  private begin() {
    this.stop();
    const t = this.token;
    return t;
  }

  private alive(t: PlayToken) {
    return t === this.token;
  }

  private emit(info: LineInfo) {
    this.onLine?.(info);
  }

  private warmVoices() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
  }

  private pickVoice(lang: string) {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const prefix = lang.slice(0, 2).toLowerCase();
    return (
      voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
      null
    );
  }

  private speak(text: string, lang: "zh-CN" | "en-US", t: PlayToken) {
    return new Promise<void>((resolve) => {
      if (!this.alive(t)) {
        resolve();
        return;
      }
      if (!window.speechSynthesis) {
        void this.wait(1400, t).then(() => resolve());
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = lang.startsWith("zh") ? 0.78 : 0.82;
      u.pitch = 1.08;
      u.volume = Math.min(1, this.volume + 0.1);
      const voice = this.pickVoice(lang);
      if (voice) u.voice = voice;
      const done = () => {
        u.onend = null;
        u.onerror = null;
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  }

  private wait(ms: number, t: PlayToken) {
    return new Promise<void>((resolve) => {
      const id = window.setTimeout(() => resolve(), ms);
      if (!this.alive(t)) {
        window.clearTimeout(id);
        resolve();
      }
    });
  }

  private async playMelody(notes: Note[], t: PlayToken) {
    const beat = 0.34;
    for (const note of notes) {
      if (!this.alive(t)) return;
      await this.playTone(FREQ[note.n] ?? 0, note.d * beat, t);
    }
  }

  private playTone(freq: number, dur: number, t: PlayToken) {
    return new Promise<void>((resolve) => {
      if (!this.ctx || !this.master || !this.alive(t)) {
        resolve();
        return;
      }
      if (freq === 0) {
        window.setTimeout(() => resolve(), dur * 1000);
        return;
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const harm = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = "triangle";
      harm.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      harm.frequency.setValueAtTime(freq * 2, now);
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.92);
      osc.connect(filter);
      harm.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      this.oscillators.push(osc, harm);
      osc.start(now);
      harm.start(now);
      osc.stop(now + dur);
      harm.stop(now + dur);
      osc.onended = () => resolve();
    });
  }

  private async chime(t: PlayToken) {
    await this.playTone(523.25, 0.18, t);
    await this.playTone(659.25, 0.22, t);
    await this.playTone(783.99, 0.32, t);
  }

  private async playAnimalSound(id: AnimalSoundId, t: PlayToken) {
    const fn = ANIMAL_SOUNDS[id];
    if (!this.ctx || !this.master || !this.alive(t)) return;
    await fn(this.ctx, this.master, (osc) => this.oscillators.push(osc));
  }
}

type SoundFn = (
  ctx: AudioContext,
  dest: AudioNode,
  track: (osc: OscillatorNode) => void
) => Promise<void>;

function env(gain: GainNode, now: number, peak: number, dur: number) {
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
}

function toneSweep(
  ctx: AudioContext,
  dest: AudioNode,
  track: (osc: OscillatorNode) => void,
  opts: {
    type?: OscillatorType;
    from: number;
    to: number;
    dur: number;
    peak?: number;
    filter?: number;
  }
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.to), now + opts.dur);
  filter.type = "bandpass";
  filter.frequency.value = opts.filter ?? opts.from;
  filter.Q.value = 4;
  env(gain, now, opts.peak ?? 0.35, opts.dur);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  track(osc);
  osc.start(now);
  osc.stop(now + opts.dur + 0.02);
  return new Promise<void>((resolve) => {
    osc.onended = () => resolve();
  });
}

const ANIMAL_SOUNDS: Record<AnimalSoundId, SoundFn> = {
  cat: async (ctx, dest, track) => {
    await toneSweep(ctx, dest, track, {
      type: "sawtooth",
      from: 820,
      to: 320,
      dur: 0.42,
      peak: 0.18,
      filter: 900,
    });
    await new Promise((r) => setTimeout(r, 90));
    await toneSweep(ctx, dest, track, {
      type: "sawtooth",
      from: 760,
      to: 300,
      dur: 0.36,
      peak: 0.16,
      filter: 850,
    });
  },
  dog: async (ctx, dest, track) => {
    for (let i = 0; i < 2; i++) {
      await toneSweep(ctx, dest, track, {
        type: "square",
        from: 180,
        to: 110,
        dur: 0.16,
        peak: 0.22,
        filter: 220,
      });
      await new Promise((r) => setTimeout(r, 120));
    }
  },
  chick: async (ctx, dest, track) => {
    for (let i = 0; i < 3; i++) {
      await toneSweep(ctx, dest, track, {
        type: "square",
        from: 1400,
        to: 1100,
        dur: 0.09,
        peak: 0.1,
        filter: 1600,
      });
      await new Promise((r) => setTimeout(r, 80));
    }
  },
  duck: async (ctx, dest, track) => {
    for (let i = 0; i < 2; i++) {
      await toneSweep(ctx, dest, track, {
        type: "sawtooth",
        from: 380,
        to: 220,
        dur: 0.2,
        peak: 0.2,
        filter: 420,
      });
      await new Promise((r) => setTimeout(r, 110));
    }
  },
  cow: async (ctx, dest, track) => {
    await toneSweep(ctx, dest, track, {
      type: "sawtooth",
      from: 160,
      to: 95,
      dur: 0.85,
      peak: 0.28,
      filter: 180,
    });
  },
  sheep: async (ctx, dest, track) => {
    await toneSweep(ctx, dest, track, {
      type: "sawtooth",
      from: 420,
      to: 280,
      dur: 0.28,
      peak: 0.18,
      filter: 500,
    });
    await toneSweep(ctx, dest, track, {
      type: "sawtooth",
      from: 360,
      to: 240,
      dur: 0.32,
      peak: 0.16,
      filter: 420,
    });
  },
  pig: async (ctx, dest, track) => {
    for (let i = 0; i < 3; i++) {
      await toneSweep(ctx, dest, track, {
        type: "square",
        from: 260,
        to: 180,
        dur: 0.12,
        peak: 0.16,
        filter: 300,
      });
      await new Promise((r) => setTimeout(r, 70));
    }
  },
  bird: async (ctx, dest, track) => {
    for (const [from, to] of [
      [1800, 2400],
      [2000, 2600],
      [1700, 2200],
    ] as const) {
      await toneSweep(ctx, dest, track, {
        type: "sine",
        from,
        to,
        dur: 0.12,
        peak: 0.14,
        filter: from,
      });
      await new Promise((r) => setTimeout(r, 60));
    }
  },
  frog: async (ctx, dest, track) => {
    for (let i = 0; i < 2; i++) {
      await toneSweep(ctx, dest, track, {
        type: "square",
        from: 220,
        to: 140,
        dur: 0.14,
        peak: 0.2,
        filter: 260,
      });
      await new Promise((r) => setTimeout(r, 160));
    }
  },
  horse: async (ctx, dest, track) => {
    await toneSweep(ctx, dest, track, {
      type: "sawtooth",
      from: 520,
      to: 280,
      dur: 0.45,
      peak: 0.18,
      filter: 480,
    });
    await toneSweep(ctx, dest, track, {
      type: "sawtooth",
      from: 400,
      to: 220,
      dur: 0.35,
      peak: 0.14,
      filter: 360,
    });
  },
  lion: async (ctx, dest, track) => {
    await toneSweep(ctx, dest, track, {
      type: "sawtooth",
      from: 140,
      to: 70,
      dur: 1.05,
      peak: 0.3,
      filter: 160,
    });
  },
  elephant: async (ctx, dest, track) => {
    await toneSweep(ctx, dest, track, {
      type: "sine",
      from: 280,
      to: 90,
      dur: 0.9,
      peak: 0.32,
      filter: 200,
    });
  },
};

export const toyPlayer = new ToyPlayer();
