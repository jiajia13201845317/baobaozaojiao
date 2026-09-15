"use client";

import { playAnimalVoice } from "./animal-voice";
import type { AnimalSoundId, Flashcard, LessonStep, Note, Poem, Song, Story } from "./content";
import { neteaseFor, neteasePlayerSrc } from "./netease";
import type { CrySource, MusicSource } from "./progress";
import {
  estimateSpeechMs,
  pickVoice,
  prepareSpeech,
  speechPitch,
  speechRate,
  waitVoices,
  type SpeakKind,
  type SpeakLang,
} from "./speech";

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
  lang?: SpeakLang;
  kind?: "verse" | "fun" | "story";
};

type PlayToken = number;

const synth =
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

class ToyPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private token: PlayToken = 0;
  private volume = 0.82;
  private oscillators: AudioScheduledSourceNode[] = [];
  private timers: number[] = [];
  private voices: SpeechSynthesisVoice[] = [];
  private zhVoice: SpeechSynthesisVoice | null = null;
  private enVoice: SpeechSynthesisVoice | null = null;
  private watchdog: number | null = null;
  private voicesHooked = false;
  private cries = new Map<string, AudioBuffer>();
  private pending: Array<() => void> = [];
  private media: HTMLAudioElement | null = null;
  private frame: HTMLIFrameElement | null = null;
  private source: MusicSource = "local";
  private crySource: CrySource = "real";

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
    this.primeSpeech();
    this.voices = await waitVoices(synth);
    this.refreshVoices();
    if (synth && !this.voicesHooked) {
      this.voicesHooked = true;
      synth.addEventListener("voiceschanged", () => {
        this.voices = synth.getVoices();
        this.refreshVoices();
      });
    }
  }

  setSource(source: MusicSource) {
    this.source = source;
  }

  setCrySource(source: CrySource) {
    this.crySource = source;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.04);
    }
    if (this.media) this.media.volume = Math.min(1, Math.max(0, v));
  }

  tap() {
    if (!this.ctx || !this.master || this.volume <= 0.02) return;
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
    this.clearWatchdog();
    this.clearTimers();
    if (this.media) {
      this.media.ontimeupdate = null;
      this.media.onended = null;
      this.media.onerror = null;
      try {
        this.media.pause();
        this.media.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    this.clearNetease();
    const flush = this.pending.splice(0);
    for (const done of flush) done();
    synth?.cancel();
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
    const started = Date.now();
    await this.ensureRunning();
    if (this.source === "netease" && (await this.playNeteaseSong(song, t))) return;
    if (song.track && (await this.playRecordedSong(song, t))) return;
    this.startWatchdog();
    this.emit({ text: song.title, lang: song.lyricLang });
    await this.playMelody(song.melody, t, 0.36);
    if (!this.alive(t)) return;
    const title = song.sayTitle ?? song.title;
    await this.speak(title, song.lyricLang, t, "song");
    if (!this.alive(t)) return;
    await this.wait(200, t);
    for (let i = 0; i < song.lyrics.length; i++) {
      if (!this.alive(t)) return;
      const line = song.lyrics[i]!;
      this.emit({ text: line, lang: song.lyricLang });
      await this.speak(song.sayLyrics?.[i] ?? line, song.lyricLang, t, "song");
      await this.wait(160, t);
    }
    if (!this.alive(t)) return;
    this.emit({ text: song.title, lang: song.lyricLang });
    await this.playMelody(song.melody, t, 0.36);
    if (!this.alive(t)) return;
    const leftover = 4500 - (Date.now() - started);
    if (leftover > 0) await this.wait(leftover, t);
    if (this.alive(t)) {
      this.clearWatchdog();
      this.onEnded?.("item");
    }
  }

  private ensureMedia() {
    if (!this.media) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.setAttribute("playsinline", "true");
      audio.dataset.baoTrack = "1";
      audio.style.display = "none";
      document.body.appendChild(audio);
      this.media = audio;
    }
    this.media.volume = Math.min(1, Math.max(0, this.volume));
    return this.media;
  }

  private async loadCues(song: Song) {
    const fallback = [
      { at: 0.3, text: song.title },
      ...song.lyrics.map((text, index) => ({ at: 2.4 + index * 4.2, text })),
    ];
    if (!song.track) return fallback;
    try {
      const res = await fetch(song.track.replace(/\.mp3$/, ".json"));
      if (!res.ok) return fallback;
      const data = (await res.json()) as { cues?: Array<{ at: number; text: string }> };
      return data.cues?.length ? data.cues : fallback;
    } catch {
      return fallback;
    }
  }

  private async mountNeteaseFrame() {
    const started = Date.now();
    let slot = document.getElementById("bao-netease-slot");
    while (!slot && Date.now() - started < 900) {
      await this.wait(50, this.token);
      slot = document.getElementById("bao-netease-slot");
    }
    if (!this.frame) {
      const frame = document.createElement("iframe");
      frame.setAttribute("allow", "autoplay; encrypted-media");
      frame.setAttribute("frameborder", "no");
      frame.title = "网易云音乐";
      frame.dataset.baoNetease = "1";
      this.frame = frame;
    }
    const host = slot ?? document.body;
    if (this.frame.parentElement !== host) host.appendChild(this.frame);
    return this.frame;
  }

  private clearNetease() {
    if (this.frame) this.frame.src = "about:blank";
  }

  /** Just the animal. No spoken 拟声 word after it. */
  private async playAnimalCall(card: Flashcard, t: PlayToken) {
    if (!card.sound) return;
    this.onStep?.("sound");
    await this.playAnimalSound(card.sound, t);
  }

  private async playNeteaseSong(song: Song, t: PlayToken) {
    const info = neteaseFor(song.id);
    if (!info || !this.alive(t)) return false;
    this.emit({ text: song.title, lang: song.lyricLang });
    const frame = await this.mountNeteaseFrame();
    if (!this.alive(t)) return true;
    frame.src = neteasePlayerSrc(info.id, true);
    const cues = [
      { at: 0.4, text: song.title },
      ...song.lyrics.map((text, index) => ({
        at: 2.2 + index * Math.max(3.6, (info.ms / 1000 - 4) / Math.max(1, song.lyrics.length)),
        text,
      })),
    ];
    let cueAt = 0;
    const begun = Date.now();
    const apply = () => {
      if (!this.alive(t)) return;
      const now = (Date.now() - begun) / 1000;
      while (cueAt < cues.length && now >= cues[cueAt]!.at) {
        this.emit({ text: cues[cueAt]!.text, lang: song.lyricLang });
        cueAt += 1;
      }
    };
    apply();
    const poll = window.setInterval(apply, 400);
    this.timers.push(poll);
    await this.wait(info.ms, t);
    window.clearInterval(poll);
    if (this.alive(t)) this.onEnded?.("item");
    return true;
  }

  private async playRecordedSong(song: Song, t: PlayToken) {
    const audio = this.ensureMedia();
    if (!audio || !song.track || !this.alive(t)) return false;
    const cues = await this.loadCues(song);
    if (!this.alive(t)) return true;
    audio.onended = null;
    audio.onerror = null;
    audio.ontimeupdate = null;
    this.emit({ text: song.title, lang: song.lyricLang });
    audio.src = song.track;
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    let cueAt = 0;
    const applyCues = () => {
      if (!this.alive(t)) return;
      const now = audio.currentTime;
      if (!Number.isFinite(now)) return;
      while (cueAt < cues.length && now >= cues[cueAt]!.at) {
        this.emit({ text: cues[cueAt]!.text, lang: song.lyricLang });
        cueAt += 1;
      }
    };
    audio.ontimeupdate = applyCues;
    try {
      await audio.play();
    } catch {
      return false;
    }
    if (!this.alive(t)) return true;
    const startedAt = Date.now();
    const finishedWell = () => {
      const dur = audio.duration;
      const pos = audio.currentTime;
      const elapsed = Date.now() - startedAt;
      if (!Number.isFinite(dur) || dur < 4) return false;
      if (elapsed < 2000) return false;
      return pos >= dur - 0.85 || pos >= dur * 0.92;
    };
    await new Promise<void>((resolve) => {
      let settled = false;
      let poll = 0;
      const done = () => {
        if (settled) return;
        settled = true;
        window.clearInterval(poll);
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
        this.pending = this.pending.filter((fn) => fn !== done);
        resolve();
      };
      this.pending.push(done);
      audio.onended = () => {
        if (finishedWell()) done();
      };
      audio.onerror = () => done();
      poll = window.setInterval(() => {
        if (!this.alive(t)) {
          done();
          return;
        }
        applyCues();
        if (audio.ended && finishedWell()) done();
      }, 250);
      this.timers.push(poll);
    });
    if (this.alive(t) && finishedWell()) this.onEnded?.("item");
    return true;
  }

  async playLesson(card: Flashcard) {
    const t = this.begin();
    await this.wait(140, t);
    this.startWatchdog();
    this.onStep?.("zh");
    this.emit({ text: card.zh, lang: "zh-CN" });
    await this.speak(card.sayZh ?? card.zh, "zh-CN", t, "word");
    if (!this.alive(t)) return;
    await this.wait(240, t);
    this.onStep?.("en");
    this.emit({ text: card.en, lang: "en-US" });
    await this.speak(card.sayEn ?? card.en, "en-US", t, "word");
    if (!this.alive(t)) return;
    if (card.sound) {
      await this.wait(200, t);
      await this.playAnimalCall(card, t);
    }
    this.clearWatchdog();
    if (this.alive(t)) this.onEnded?.("item");
  }

  async playCry(card: Flashcard) {
    const t = this.begin();
    await this.wait(80, t);
    this.startWatchdog();
    if (card.sound) {
      await this.playAnimalCall(card, t);
    } else {
      this.onStep?.("zh");
      this.emit({ text: card.zh, lang: "zh-CN" });
      await this.speak(card.sayZh ?? card.zh, "zh-CN", t, "word");
      if (!this.alive(t)) return;
      await this.wait(180, t);
      this.onStep?.("en");
      this.emit({ text: card.en, lang: "en-US" });
      await this.speak(card.sayEn ?? card.en, "en-US", t, "word");
    }
    this.clearWatchdog();
    if (this.alive(t)) this.onEnded?.("tap");
  }

  async playStory(story: Story) {
    const t = this.begin();
    await this.wait(140, t);
    this.startWatchdog();
    this.emit({ text: story.title, lang: "zh-CN" });
    await this.chime(t);
    await this.speak(story.sayTitle ?? story.title, "zh-CN", t, "story");
    if (!this.alive(t)) return;
    await this.wait(320, t);
    for (let i = 0; i < story.lines.length; i++) {
      if (!this.alive(t)) return;
      const line = story.lines[i]!;
      this.emit({ text: line, lang: "zh-CN", kind: "story" });
      await this.speak(story.sayLines?.[i] ?? line, "zh-CN", t, "story");
      await this.wait(280, t);
    }
    if (this.alive(t)) {
      await this.chime(t);
      this.clearWatchdog();
      this.onEnded?.("item");
    }
  }

  async playPoem(poem: Poem) {
    const t = this.begin();
    await this.wait(140, t);
    this.startWatchdog();
    this.emit({ text: poem.title, lang: "zh-CN", kind: "verse" });
    await this.chime(t);
    await this.speak(poem.sayTitle ?? poem.title, "zh-CN", t, "verse");
    if (!this.alive(t)) return;
    await this.wait(160, t);
    await this.speak(poem.sayAuthor ?? poem.author, "zh-CN", t, "word");
    if (!this.alive(t)) return;
    await this.wait(320, t);
    for (let i = 0; i < poem.verses.length; i++) {
      if (!this.alive(t)) return;
      const verse = poem.verses[i]!;
      this.emit({ text: verse, lang: "zh-CN", kind: "verse" });
      await this.speak(poem.sayVerses?.[i] ?? verse, "zh-CN", t, "verse");
      await this.wait(360, t);
    }
    if (!this.alive(t)) return;
    await this.wait(420, t);
    for (const line of poem.fun) {
      if (!this.alive(t)) return;
      this.emit({ text: line, lang: "zh-CN", kind: "fun" });
      await this.speak(line, "zh-CN", t, "fun");
      await this.wait(260, t);
    }
    if (this.alive(t)) {
      this.clearWatchdog();
      this.onEnded?.("item");
    }
  }

  async sayGoodnight() {
    const t = this.begin();
    await this.wait(120, t);
    this.startWatchdog();
    this.emit({ text: "该睡觉啦", lang: "zh-CN" });
    await this.speak("宝宝，该睡觉啦", "zh-CN", t, "care");
    if (this.alive(t)) this.clearWatchdog();
  }

  async sayLine(text: string) {
    const t = this.begin();
    await this.wait(120, t);
    this.startWatchdog();
    this.emit({ text, lang: "zh-CN" });
    await this.speak(text, "zh-CN", t, "care");
    if (this.alive(t)) this.clearWatchdog();
  }

  private begin() {
    this.stop();
    return this.token;
  }

  private alive(t: PlayToken) {
    return t === this.token;
  }

  private emit(info: LineInfo) {
    this.onLine?.(info);
  }

  private refreshVoices() {
    this.zhVoice = pickVoice(this.voices, "zh-CN");
    this.enVoice = pickVoice(this.voices, "en-US");
  }

  private clearTimers() {
    for (const id of this.timers) window.clearTimeout(id);
    this.timers = [];
  }

  private clearWatchdog() {
    if (this.watchdog != null) {
      window.clearInterval(this.watchdog);
      this.watchdog = null;
    }
  }

  /** Chrome often stalls SpeechSynthesis after ~15s unless it is poked. */
  private startWatchdog() {
    this.clearWatchdog();
    if (!synth) return;
    this.watchdog = window.setInterval(() => {
      if (!synth.speaking) return;
      try {
        synth.pause();
        synth.resume();
      } catch {
        /* ignore */
      }
    }, 9000);
  }

  private speak(text: string, lang: SpeakLang, t: PlayToken, kind?: SpeakKind) {
    return new Promise<void>((resolve) => {
      if (!this.alive(t)) {
        resolve();
        return;
      }
      const spoken = prepareSpeech(text, lang, kind);
      if (!spoken) {
        resolve();
        return;
      }
      if (this.volume <= 0.02 || !synth) {
        void this.wait(Math.min(1400, 200 + spoken.length * 24), t).then(() => resolve());
        return;
      }

      const u = new SpeechSynthesisUtterance(spoken);
      const voice = lang === "zh-CN" ? this.zhVoice : this.enVoice;
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = lang;
      }
      const rate = speechRate(lang, kind);
      u.rate = rate;
      u.pitch = speechPitch(lang, kind);
      u.volume = Math.min(1, Math.max(0.2, this.volume + 0.16));

      let settled = false;
      const startedAt = Date.now();
      const budget = estimateSpeechMs(spoken, rate) + 400;
      const done = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(safety);
        this.pending = this.pending.filter((fn) => fn !== done);
        resolve();
      };
      const safety = window.setTimeout(done, budget + 1000);
      this.timers.push(safety);
      this.pending.push(done);
      u.onend = done;
      // Chrome often errors when a voice is missing; keep the line's duration
      // so 连播 cannot skip past a song in a second.
      u.onerror = () => {
        const left = Math.max(0, budget - (Date.now() - startedAt));
        if (left === 0) {
          done();
          return;
        }
        const id = window.setTimeout(done, left);
        this.timers.push(id);
      };
      try {
        synth.resume();
        synth.speak(u);
      } catch {
        done();
      }
    });
  }

  private wait(ms: number, t: PlayToken) {
    return new Promise<void>((resolve) => {
      if (!this.alive(t)) {
        resolve();
        return;
      }
      const done = () => resolve();
      this.pending.push(done);
      const id = window.setTimeout(() => {
        this.pending = this.pending.filter((fn) => fn !== done);
        resolve();
      }, ms);
      this.timers.push(id);
    });
  }

  private primeSpeech() {
    if (!synth) return;
    try {
      synth.resume();
    } catch {
      /* ignore */
    }
  }

  private async ensureRunning() {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  private async playMelody(notes: Note[], t: PlayToken, peak = 0.28) {
    await this.ensureRunning();
    const beat = 0.32;
    for (const note of notes) {
      if (!this.alive(t)) return;
      await this.playTone(FREQ[note.n] ?? 0, note.d * beat, t, peak);
    }
  }

  private playTone(freq: number, dur: number, t: PlayToken, peak = 0.28) {
    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.pending = this.pending.filter((fn) => fn !== finish);
        resolve();
      };
      this.pending.push(finish);
      const hold = Math.max(40, Math.round(dur * 1000));
      if (!this.alive(t)) {
        finish();
        return;
      }
      if (!this.ctx || !this.master || this.volume <= 0.02 || freq === 0) {
        const id = window.setTimeout(finish, hold);
        this.timers.push(id);
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
      filter.frequency.value = 2200;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.9);
      osc.connect(filter);
      harm.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      this.oscillators.push(osc, harm);
      osc.start(now);
      harm.start(now);
      osc.stop(now + dur);
      harm.stop(now + dur);
      const safety = window.setTimeout(finish, hold);
      this.timers.push(safety);
    });
  }

  private async chime(t: PlayToken) {
    await this.playTone(523.25, 0.18, t);
    await this.playTone(659.25, 0.22, t);
    await this.playTone(783.99, 0.32, t);
  }

  /** Real recording first; the synth voice covers offline and missing files. */
  private async playAnimalSound(id: AnimalSoundId, t: PlayToken) {
    if (!this.ctx || !this.master || !this.alive(t) || this.volume <= 0.02) return;
    if (this.crySource === "real" && (await this.playRecordedCry(id, t))) return;
    if (!this.alive(t)) return;
    const ms = playAnimalVoice(this.ctx, this.master, id, (node) => this.oscillators.push(node));
    await this.wait(ms + 60, t);
  }

  private async playRecordedCry(id: AnimalSoundId, t: PlayToken) {
    if (!this.ctx || !this.master) return false;
    let buf = this.cries.get(id);
    if (!buf) {
      try {
        const res = await fetch(`/sfx/${id}.mp3`);
        if (!res.ok) return false;
        buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.cries.set(id, buf);
      } catch {
        return false;
      }
    }
    if (!this.alive(t) || !this.ctx || !this.master) return true;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    this.oscillators.push(src);
    src.start();
    await this.wait(Math.round(buf.duration * 1000) + 40, t);
    return true;
  }
}

export const toyPlayer = new ToyPlayer();
