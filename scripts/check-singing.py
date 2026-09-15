#!/usr/bin/env python3
"""
Check that the rendered songs are sung and not spoken.

This exists because "it sounds like singing" is not something the rest of the
test suite can assert, and because the thing it is guarding against already
shipped once: the local tracks had a full piano arrangement of the tune and a
voice reading the words flatly over it, and by every check in the repo they
were fine. Playback worked, the file existed, the lyrics scrolled.

Singing has an objective definition, though. Sung means the fundamental
frequency of the voice sits on the notes of the melody, in time. So this
measures the pitch of each rendered track inside each note's own window and
compares it against the note the score asked for.

Two numbers per song:

  the median error in semitones, which is how well tuned it is;
  the share of notes landing within a quarter tone, which is how reliably.

A spoken track fails both by a wide margin: read aloud, the pitch follows the
sentence rather than the score, so the error lands around three to six
semitones and almost nothing is on the note by accident.

Usage: `python3 scripts/check-singing.py [id ...]`.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SONGS = ROOT / "public" / "songs"
SCORES = ROOT / "scripts" / "song-scores.json"

SR = 44100
LEAD_IN = 3.0

# What counts as on the note. A quarter tone is the usual threshold for
# "audibly out of tune" and is far tighter than speech ever manages.
TOLERANCE = 0.5
# Fraction of notes that have to land, allowing for the few the pitch tracker
# cannot read at all: a syllable that is mostly consonant has no pitch to find.
NEEDED = 0.8


STEPS = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def midi_of(name: str) -> int:
    return STEPS[name[:-1]] + (int(name[-1]) + 1) * 12


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ar", str(SR), "-ac", "1", "-"],
        check=True,
        stdout=subprocess.PIPE,
    ).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float32)


def pitch_of(sig: np.ndarray) -> float:
    """
    Median autocorrelation pitch over the voiced frames of one window.

    Read only where the voice is loud, which takes a little explaining. The
    mix also contains a music box and a bass note under the start of each
    phrase, and those outlast the syllable: by the tail of a note the voice
    has decayed to a twentieth of its peak and what is left in the window is
    mostly accompaniment plus its own echo. Measured there, the track looks
    five semitones out when the sung vowel was within a tenth of one.

    So each note is judged on its loudest frames. That is where the pitch
    being asked about actually is, and it is no kinder to a spoken track: read
    aloud, the loud part of a syllable is exactly where the sentence's own
    intonation is strongest, and it has no reason to agree with the score.
    """
    lo, hi = SR // 700, SR // 80
    win, hop = 2048, 256
    seen: list[tuple[float, float]] = []
    for start in range(0, max(1, len(sig) - win), hop):
        frame = sig[start : start + win]
        if len(frame) < win:
            continue
        loud = float(np.sqrt(np.mean(frame**2)))
        if loud < 0.02:
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
        if corr[lag] / corr[0] < 0.3:
            continue
        seen.append((loud, SR / lag))
    if not seen:
        return 0.0
    peak = max(loud for loud, _ in seen)
    return float(np.median([hz for loud, hz in seen if loud >= 0.45 * peak]))


def semitones(hz: float, midi: int) -> float:
    """
    Distance in semitones, ignoring which octave the tracker settled on.

    Autocorrelation halves and doubles: a clean note read one octave out is a
    correct note, and folding that in is standard practice for pitch
    evaluation. Being an octave out is also inaudible as mistuning, which is
    what this is measuring.
    """
    heard = 69.0 + 12.0 * float(np.log2(hz / 440.0))
    return min(abs(heard - midi + 12 * k) for k in (-2, -1, 0, 1, 2))


def check(song_id: str, score: dict) -> bool:
    track = SONGS / f"{song_id}.mp3"
    if not track.exists():
        print(f"FAIL  {song_id}: no {track.name}")
        return False

    sig = decode(track)
    beat = 60.0 / float(score["bpm"])
    at = 0.0
    offs: list[float] = []
    unreadable = 0
    worst = (0.0, "")

    for line in score["lines"]:
        for note in line["notes"]:
            span = float(note["b"]) * beat
            if note["n"] != "rest":
                # Most of the note, minus the attack and the release. Which
                # part of what is left counts is settled by loudness.
                start = int((LEAD_IN + at + span * 0.15) * SR)
                end = int((LEAD_IN + at + span * 0.9) * SR)
                hz = pitch_of(sig[start:end])
                if hz <= 0:
                    unreadable += 1
                else:
                    off = semitones(hz, midi_of(note["n"]))
                    offs.append(off)
                    if off > worst[0]:
                        worst = (off, f"{note.get('d', '?')} on {note['n']} at {LEAD_IN + at:.1f}s")
            at += span

    if not offs:
        print(f"FAIL  {song_id}: no pitch anywhere in the track")
        return False

    landed = sum(1 for off in offs if off <= TOLERANCE) / len(offs)
    median = float(np.median(offs))
    ok = landed >= NEEDED and median <= TOLERANCE
    print(
        f"{'PASS' if ok else 'FAIL'}  {song_id:10} "
        f"median {median:.2f} semitones, {landed * 100:.0f}% on the note "
        f"({len(offs)} read, {unreadable} unvoiced), worst {worst[0]:.1f} on {worst[1]}"
    )
    return ok


def main() -> None:
    scores = json.loads(SCORES.read_text(encoding="utf-8"))
    wanted = set(sys.argv[1:])
    bad = [song_id for song_id, score in scores.items() if not (wanted and song_id not in wanted) and not check(song_id, score)]
    print()
    if bad:
        raise SystemExit(f"not singing: {', '.join(bad)}")
    print(f"all {len(scores) if not wanted else len(wanted)} tracks are on the melody")


if __name__ == "__main__":
    main()
