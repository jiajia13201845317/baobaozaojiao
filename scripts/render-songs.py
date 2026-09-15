#!/usr/bin/env python3
"""
Sing the nursery rhymes instead of reading them out.

The local tracks used to be a piano bed with a neural child voice *speaking*
one whole lyric line at a time over the top. Every note of the tune was in the
piano and none of it was in the voice, so what came out was a recitation with
backing music — which is what it was, and what it sounded like.

This renders singing. The unit is one syllable on one note, taken from
`song-scores.json`, and every syllable goes through the same three steps:

  synthesised on its own, so it can be moved without dragging its neighbours'
  intonation along with it;

  measured, by autocorrelation, for the pitch it actually came out at — the
  synthesiser offers no control over absolute pitch and it drifts from one
  syllable to the next;

  shifted onto the note it belongs on and stretched to the length it is meant
  to last.

That is the ordinary speech-to-singing trick, and it is the whole difference
between 念 and 唱: afterwards the voice is on the melody and in the rhythm,
and the tune is something the voice is doing rather than something playing
beside it. Rubberband does the shifting with formants preserved, so even an
octave of transposition still sounds like a child and not a chipmunk.

Two details matter more than they look:

  The song is transposed by whole octaves to sit where the voice already
  speaks. The tune is unchanged, but the average shift drops to a couple of
  semitones, and a small shift is a believable one.

  A long note stretches its vowel, not the consonant in front of it.
  Stretching a whole syllable by 2.5x smears the attack into mush; holding the
  onset near natural speed and letting the tail carry the length is what a
  person does with a held note.

The accompaniment is synthesised here too — a soft music-box doubling of the
melody and a low pulse at the top of each phrase. It used to come from
FluidSynth and a General MIDI soundfont, neither of which is installed any
more and neither of which earns the dependency against sixty lines of numpy.
It is also deliberately quiet: the complaint was that nothing was being sung,
so the voice is the loudest thing in the mix.

Writes `public/songs/<id>.mp3` and `<id>.json`, the second being the lyric cue
schedule. Those cues are exact now rather than estimated from the length of a
spoken line, because the renderer knows which beat every line starts on.

Usage: `python3 scripts/render-songs.py [id ...]`, no ids meaning all of them.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "songs"
SCORES = ROOT / "scripts" / "song-scores.json"
CACHE = ROOT / ".tts-cache"

SR = 44100

# Soft and young, per the app's standing rule that this has to sound like a
# cartoon rather than a newsreader.
VOICES = {"zh-CN": "zh-CN-XiaoyiNeural", "en-US": "en-US-AnaNeural"}

# Only needed for the cue file. Every melody and every word lives in the score.
TITLES = {
    "bunny": "小兔子乖乖",
    "tigers": "两只老虎",
    "stars-zh": "小星星",
    "ducks": "数鸭子",
    "radish": "拔萝卜",
    "friends": "找朋友",
    "twinkle": "Twinkle Twinkle",
    "abc": "ABC Song",
    "macdonald": "Old MacDonald",
    "spider": "Itsy Bitsy Spider",
    "lamb": "Mary Had a Little Lamb",
    "boat": "Row Row Row Your Boat",
}

STEPS = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}

# Seconds of music box before the first word, so the app has something to fade
# in on and a child hears the key before being sung at.
LEAD_IN = 3.0
TAIL = 2.5

# How much of a syllable counts as its onset, and is held at close to natural
# speed when the note is long.
ONSET = 0.075

# Samples between pitch readings: about 3ms, fine enough to follow a tone.
HOP = 128

# Half a consonant grain. 12ms puts the repeat rate at 83Hz, under the lowest
# pitch the reader will call a note, so a fricative cannot turn into one.
NOISE = 0.012


def midi_of(name: str) -> int:
    found = re.fullmatch(r"([A-G]#?)(\d)", name)
    if not found:
        raise ValueError(f"not a note: {name!r}")
    return STEPS[found.group(1)] + (int(found.group(2)) + 1) * 12


def hz_of(midi: float) -> float:
    return 440.0 * 2.0 ** ((midi - 69.0) / 12.0)


# --------------------------------------------------------------- speech ----


async def speak(text: str, voice: str, dest: Path) -> None:
    import edge_tts

    for attempt in range(5):
        try:
            # Unhurried. Every syllable gets retuned anyway, but a relaxed
            # delivery leaves a longer, cleaner vowel to stretch.
            comm = edge_tts.Communicate(text, voice, rate="-10%")
            await comm.save(str(dest))
            if dest.exists() and dest.stat().st_size > 700:
                return
        except Exception as exc:
            print(f"  tts retry {attempt + 1} for {text!r}: {exc}", file=sys.stderr)
        await asyncio.sleep(1.0 * (attempt + 1))
    raise RuntimeError(f"tts failed for {text!r}")


async def voice_of(text: str, voice: str) -> Path:
    """One file per voice and syllable, kept between runs: these never change."""
    CACHE.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha1(f"{voice}|{text}".encode()).hexdigest()[:16]
    dest = CACHE / f"{key}.mp3"
    if not dest.exists():
        await speak(text, voice, dest)
    return dest


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ar", str(SR), "-ac", "1", "-"],
        check=True,
        stdout=subprocess.PIPE,
    ).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float32)


def trim(sig: np.ndarray, floor: float = 0.012) -> np.ndarray:
    """Strip the silence the synthesiser leaves at both ends."""
    if len(sig) == 0:
        return sig
    loud = np.abs(sig) > floor * np.abs(sig).max()
    if not loud.any():
        return sig
    first = int(np.argmax(loud))
    last = len(loud) - int(np.argmax(loud[::-1]))
    pad = int(0.008 * SR)
    return sig[max(0, first - pad) : min(len(sig), last + pad)]


def f0_of(sig: np.ndarray, first: float = 0.0, last: float = 1.0) -> float:
    """
    The median pitch of the voiced part of a slice, by autocorrelation.

    Needed because the synthesiser will not be told what pitch to speak at.
    The same voice comes out anywhere across a few semitones depending on the
    syllable, so shifting everything by one fixed amount would leave the tune
    wobbling around the notes instead of landing on them.

    `first` and `last` bound which part of the syllable to listen to, and that
    matters a great deal in Mandarin. A syllable's tone *is* a pitch movement:
    亮 falls most of a fifth from start to end. Measure the whole thing and the
    median lands somewhere mid-glide, so the shift puts the middle of the fall
    on the note and the ear — which hears the sustained part as the note —
    gets something flat. Measuring only the part that will be held puts the
    held part on the pitch it is supposed to be.
    """
    sig = sig[int(len(sig) * first) : max(int(len(sig) * last), int(len(sig) * first) + 1)]
    lo, hi = SR // 420, SR // 90
    win, hop = 2048, 512
    seen = []
    for start in range(0, max(1, len(sig) - win), hop):
        frame = sig[start : start + win]
        if np.sqrt(np.mean(frame**2)) < 0.02:
            continue
        frame = (frame - frame.mean()) * np.hanning(win)
        spec = np.fft.rfft(frame, win * 2)
        corr = np.fft.irfft(spec * np.conj(spec))
        if corr[0] <= 0:
            continue
        band = corr[lo:hi]
        if not len(band):
            continue
        lag = lo + int(np.argmax(band))
        # Frames with no real periodicity are consonants, not pitch.
        if corr[lag] / corr[0] < 0.3:
            continue
        seen.append(SR / lag)
    return float(np.median(seen)) if seen else 0.0


def taper(sig: np.ndarray, ms: float = 4.0) -> np.ndarray:
    n = min(len(sig) // 2, max(1, int(ms / 1000 * SR)))
    if n < 1:
        return sig
    out = sig.copy()
    out[:n] *= np.linspace(0, 1, n)
    out[-n:] *= np.linspace(1, 0, n)
    return out


def contour(sig: np.ndarray) -> np.ndarray:
    """
    Pitch every `HOP` samples, in Hz, zero where there is nothing periodic.

    One number for the whole syllable is not enough to retune a tone language.
    A Mandarin syllable's pitch movement *is* its meaning — 亮 falls most of a
    fifth from start to finish — so a single shift applied to the whole thing
    moves the fall without straightening it, and it slides past the note
    instead of sitting on it. Knowing the pitch at every instant is what makes
    it possible to hold one.
    """
    win = 1536
    lo, hi = SR // 450, SR // 85
    frames = len(sig) // HOP + 1
    out = np.zeros(frames, dtype=np.float32)
    for i in range(frames):
        start = max(0, i * HOP - win // 2)
        frame = sig[start : start + win]
        if len(frame) < hi * 2 or np.sqrt(np.mean(frame**2)) < 0.02:
            continue
        frame = (frame - frame.mean()) * np.hanning(len(frame))
        spec = np.fft.rfft(frame, len(frame) * 2)
        corr = np.fft.irfft(spec * np.conj(spec))
        if corr[0] <= 0:
            continue
        band = corr[lo:hi]
        if not len(band):
            continue
        lag = lo + int(np.argmax(band))
        # No real periodicity means a consonant, which has no pitch to hold.
        if corr[lag] / corr[0] < 0.3:
            continue
        out[i] = SR / lag

    # Noise reads as a pitch often enough, and one frame believed at the wrong
    # octave puts one pulse in the wrong place. Three passes settle it: drop
    # readings with no company, smooth what is left, then throw out anything
    # implausibly far from the syllable's own register — a voice does not leap
    # an octave inside one syllable, but a fricative will happily claim it did.
    voiced = out > 0
    kept = np.array([voiced[max(0, i - 2) : i + 3].sum() >= 3 for i in range(frames)])
    out = np.where(kept, out, 0.0)

    for i in range(frames):
        near = out[max(0, i - 2) : i + 3]
        near = near[near > 0]
        if out[i] > 0 and len(near):
            out[i] = float(np.median(near))

    sung = out[out > 0]
    if len(sung):
        core = float(np.median(sung))
        out = np.where(np.abs(12.0 * np.log2(np.maximum(out, 1e-6) / core)) < 10.0, out, 0.0)
    return out


def pulses(sig: np.ndarray, f0: np.ndarray) -> list[int]:
    """
    Where each glottal pulse lands.

    Voiced speech is a train of puffs of air through the vocal folds, one per
    period, and the vowel is the ringing that follows each one. Cut at the
    puffs and the pieces can be laid back down at any spacing at all: closer
    together is a higher note, further apart a lower one, and because nothing
    inside a piece is touched the mouth that made it still sounds the same
    size. That is the whole of PSOLA, and it is why this sounds like the same
    child singing rather than the same child on helium.

    The peak of each period is easy to see once the harmonics above the first
    few are out of the way, so peaks are picked on a smoothed copy.
    """
    smooth = np.convolve(sig, np.hanning(41) / np.hanning(41).sum(), mode="same")

    def hz_at(where: int) -> float:
        return float(f0[min(len(f0) - 1, max(0, where // HOP))])

    at = 0
    out: list[int] = []
    while at < len(sig) - 1:
        out.append(at)
        hz = hz_at(at)
        step = max(8, int(SR / (hz if hz > 0 else 200.0)))
        want = at + step
        if hz > 0:
            # Snap to the actual pulse near the predicted one, so the marks
            # track the real period rather than drifting off a stale estimate.
            first = min(len(smooth) - 1, at + max(1, int(step * 0.72)))
            last = min(len(smooth), at + int(step * 1.28) + 1)
            if last > first + 1:
                want = first + int(np.argmax(smooth[first:last]))
        at = max(at + 1, want)
    return out


def retune(sig: np.ndarray, hz: float, seconds: float) -> np.ndarray:
    """
    One syllable, held on one note for as long as the note lasts.

    Two things happen at once here. The pulses of the source are re-laid at
    the spacing the wanted note needs, which puts the voice on the note and
    keeps it there — the tone glide the syllable was said with simply does not
    survive the process. And output time is mapped onto input time on the way,
    which is the stretching.

    The stretching is deliberately uneven, because a held note in singing
    holds its vowel and nothing else. 星 spends its first 230ms on a loud `x`
    fricative; stretch the syllable evenly onto a one-second note and most of
    that second is the `x`. So consonants keep their own length whatever the
    note is worth, and the vowel absorbs all of it.

    Consonants are also left at their own pitch, which matters more than it
    sounds like it should: noise laid back down at a regular spacing anywhere
    in the hearing range stops being noise and becomes a buzz at that
    spacing. They get copied in long grains, at a rate below the lowest pitch
    anyone would hear as a note, nudged about a little so the repeats do not
    line up into a tone of their own.
    """
    have = len(sig) / SR
    if have <= 0.01 or seconds <= 0.01:
        return np.zeros(max(1, int(seconds * SR)), dtype=np.float32)

    f0 = contour(sig)
    marks = pulses(sig, f0)
    out_len = int(seconds * SR)
    if len(marks) < 3:
        return taper(sig[:out_len])

    # Which parts may be stretched, frame by frame: the vowel, once the attack
    # has been and gone. Everything else runs at the speed it was said at.
    at_frame = np.arange(len(f0)) * HOP / SR
    holds = (f0 > 0) & (at_frame > min(ONSET, have * 0.35))
    held = float(holds.sum()) * HOP / SR
    fixed = have - held

    # Nothing to hold, or no room to hold it in: spread the difference evenly.
    rate = (seconds - fixed) / held if held > 0.02 and seconds - fixed > held * 0.35 else seconds / have
    spans = np.where(holds, rate, 1.0) * HOP / SR if held > 0.02 else np.full(len(f0), seconds / have * HOP / SR)
    out_at = np.concatenate([[0.0], np.cumsum(spans)])
    in_at = np.concatenate([at_frame, [have]])

    def source(t: float) -> float:
        return float(np.interp(t, out_at, in_at))

    out = np.zeros(out_len + SR // 10, dtype=np.float32)
    weight = np.zeros_like(out)
    # A quarter tone of movement, arriving late, because a note held dead flat
    # for a second sounds like a machine rather than a child.
    wobble = 0.0 if seconds < 0.45 else 0.25
    # Seeded, so re-rendering a song twice gives the same file twice.
    jitter = np.random.default_rng(len(sig))

    at = 0.0
    while at < out_len / SR:
        want = source(at)
        mark = marks[min(range(len(marks)), key=lambda i: abs(marks[i] / SR - want))]
        spoke = float(f0[min(len(f0) - 1, mark // HOP)])

        if spoke > 0:
            half = int(SR / spoke)
            centre = mark
        else:
            half = int(NOISE * SR)
            centre = int(want * SR) + int(jitter.uniform(-0.004, 0.004) * SR)
            centre = int(np.clip(centre, half, max(half, len(sig) - half)))

        piece = sig[max(0, centre - half) : centre + half]
        if len(piece) > 8:
            window = np.hanning(len(piece))
            start = max(0, int(at * SR) - half)
            end = min(len(out), start + len(piece))
            out[start:end] += piece[: end - start] * window[: end - start]
            weight[start:end] += window[: end - start]

        if spoke > 0:
            depth = wobble * min(1.0, max(0.0, (at - 0.18) / 0.25))
            note = hz * 2.0 ** (depth * np.sin(2 * np.pi * 5.2 * at) / 12.0)
            at += 1.0 / float(np.clip(note, 60.0, 900.0))
        else:
            at += NOISE

    # Overlapping raised cosines do not sum to one at an arbitrary spacing, so
    # dividing by what was actually laid down is what keeps a note from
    # throbbing as the spacing drifts.
    out = np.where(weight > 0.35, out / np.maximum(weight, 1e-6), out)
    return taper(out[:out_len].astype(np.float32))


def note_audio(sig: np.ndarray, hz: float, seconds: float) -> np.ndarray:
    """A shade under the note, so consecutive syllables stay separate words."""
    return retune(sig, hz, max(0.12, seconds * 0.94))


# ----------------------------------------------------------- instrument ----


def bell(hz: float, seconds: float) -> np.ndarray:
    """A music-box strike: bright, slightly inharmonic, gone quickly."""
    n = max(1, int(seconds * SR))
    t = np.arange(n) / SR
    tone = (
        np.sin(2 * np.pi * hz * t) * np.exp(-t * 3.2)
        + 0.45 * np.sin(4 * np.pi * hz * t) * np.exp(-t * 6.0)
        + 0.16 * np.sin(6 * np.pi * hz * t) * np.exp(-t * 9.0)
        + 0.07 * np.sin(2 * np.pi * 4.2 * hz * t) * np.exp(-t * 14.0)
    )
    rise = max(1, int(0.005 * SR))
    tone[:rise] *= np.linspace(0, 1, rise)
    return tone.astype(np.float32)


def pulse(hz: float, seconds: float) -> np.ndarray:
    """The low note under the start of a phrase."""
    n = max(1, int(seconds * SR))
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * hz * t) * np.exp(-t * 2.4) + 0.3 * np.sin(4 * np.pi * hz * t) * np.exp(-t * 4.0)
    rise = max(1, int(0.012 * SR))
    tone[:rise] *= np.linspace(0, 1, rise)
    return tone.astype(np.float32)


def lay(buf: np.ndarray, sig: np.ndarray, at: float) -> None:
    start = int(at * SR)
    end = min(len(buf), start + len(sig))
    if start >= len(buf) or end <= start:
        return
    buf[start:end] += sig[: end - start]


# --------------------------------------------------------------- render ----


def flatten(score: dict) -> list[dict]:
    """The score as one stream of notes, each tagged with the beat it starts on."""
    at = 0.0
    out = []
    for index, line in enumerate(score["lines"]):
        opening = True
        for note in line["notes"]:
            rest = note["n"] == "rest"
            out.append({**note, "at": at, "line": index, "opens": opening and not rest})
            opening = opening and rest
            at += float(note["b"])
    return out


def octave_for(notes: list[dict], voice_hz: float) -> int:
    """
    Whole octaves only, so the tune is untouched while the shifts get small.

    A song written around C5 sung by a voice that speaks around C4 needs every
    syllable dragged up twelve semitones. The same song an octave lower needs
    almost none, and it is the same song.
    """
    sung = [midi_of(n["n"]) for n in notes if n["n"] != "rest"]
    if not sung or voice_hz <= 0:
        return 0
    middle = float(np.median(sung))
    speaks = 69.0 + 12.0 * float(np.log2(voice_hz / 440.0))
    return min((-24, -12, 0, 12), key=lambda shift: abs(middle + shift - speaks))


async def render(song_id: str, score: dict) -> None:
    title = TITLES.get(song_id, song_id)
    print(f"render {song_id} — {title}")
    voice = VOICES[score["lang"]]
    beat = 60.0 / float(score["bpm"])
    notes = flatten(score)
    if not notes:
        raise SystemExit(f"{song_id}: empty score")

    # Every syllable is fetched before any tuning happens, so the rest of the
    # render is arithmetic and a network hiccup cannot leave half a song.
    words: dict[str, np.ndarray] = {}
    for note in notes:
        if note["n"] == "rest":
            continue
        text = note.get("say") or note["d"]
        if text not in words:
            # Levelled on the way in, so the pitch reader's loudness gate means
            # the same thing from one syllable to the next.
            sig = trim(decode(await voice_of(text, voice)))
            loud = float(np.abs(sig).max())
            words[text] = sig * (0.9 / loud) if loud > 0 else sig

    spoken = {text: f0_of(sig) for text, sig in words.items()}
    heard = [hz for hz in spoken.values() if hz > 0]
    natural = float(np.median(heard)) if heard else 0.0
    shift = octave_for(notes, natural)
    print(f"  voice speaks around {natural:.0f}Hz, transposing {shift:+d} semitones")

    span = notes[-1]["at"] + float(notes[-1]["b"])
    total = LEAD_IN + span * beat + TAIL
    vocal = np.zeros(int(total * SR) + SR, dtype=np.float32)
    band = np.zeros_like(vocal)

    # These tunes all land on the tonic, so the last note is the key.
    tonic = next((midi_of(n["n"]) + shift for n in reversed(notes) if n["n"] != "rest"), 60)

    # The lead-in states the key without giving away any of the tune.
    lay(band, bell(hz_of(tonic), 1.6) * 0.2, 0.4)
    lay(band, bell(hz_of(tonic + 7), 1.6) * 0.16, 0.4 + beat)

    for note in notes:
        if note["n"] == "rest":
            continue
        at = LEAD_IN + note["at"] * beat
        midi = midi_of(note["n"]) + shift
        seconds = float(note["b"]) * beat
        text = note.get("say") or note["d"]
        lay(vocal, note_audio(words[text], hz_of(midi), seconds), at)
        # An octave above the voice, so the doubling holds the tune up without
        # competing with the words.
        lay(band, bell(hz_of(midi + 12), min(seconds, 1.2) + 0.8) * 0.13, at)
        if note["opens"]:
            lay(band, pulse(hz_of(tonic - 12), 1.8) * 0.1, at)

    ends = LEAD_IN + span * beat + 0.15
    lay(band, bell(hz_of(tonic), 2.4) * 0.22, ends)
    lay(band, bell(hz_of(tonic + 12), 2.4) * 0.12, ends)

    peak = float(np.abs(vocal).max())
    if peak > 0:
        vocal *= 0.92 / peak
    mixed = np.clip(vocal + band, -1.0, 1.0)

    dest = OUT / f"{song_id}.mp3"
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
            "-filter:a",
            "highpass=f=70,aecho=0.9:0.5:36:0.09,loudnorm=I=-16:TP=-1.5:LRA=9,"
            f"afade=t=in:st=0:d=0.3,afade=t=out:st={max(0.5, total - 1.2):.2f}:d=1.1",
            "-ac", "2", "-ar", "44100", "-b:a", "160k", str(dest),
        ],
        check=True,
        input=mixed.astype("<f4").tobytes(),
    )

    cues = [{"at": 0.3, "text": title}]
    for index, line in enumerate(score["lines"]):
        opens = next((n for n in notes if n["line"] == index and n["opens"]), None)
        if opens is not None:
            cues.append({"at": round(LEAD_IN + opens["at"] * beat, 2), "text": line["text"]})
    (OUT / f"{song_id}.json").write_text(
        json.dumps({"id": song_id, "title": title, "cues": cues}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    sung = sum(1 for n in notes if n["n"] != "rest")
    print(f"  -> {dest.name}  {total:.1f}s  {dest.stat().st_size // 1024}KB  {sung} syllables sung")


async def main() -> None:
    if not SCORES.exists():
        raise SystemExit(f"missing {SCORES}")
    scores = json.loads(SCORES.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    wanted = set(sys.argv[1:])
    for song_id, score in scores.items():
        if wanted and song_id not in wanted:
            continue
        await render(song_id, score)
    (OUT / "CREDITS.txt").write_text(
        "Nursery rhymes sung for 宝宝听听.\n"
        "Vocals: a neural child voice, synthesised one syllable at a time and\n"
        "retuned onto each melody note. See scripts/render-songs.py.\n"
        "Music box and bass: synthesised in the same script.\n"
        "Melodies are traditional / public domain.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    asyncio.run(main())
