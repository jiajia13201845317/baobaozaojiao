#!/usr/bin/env python3
"""Drive the simulator with scripted taps and save screenshots.

The simulator runs the real scene and the real behaviour layer, so this is how
the UI gets checked without a board. `mosaico.py project sim` either previews
the scene without a backend or opens an interactive window; neither can be
watched from a terminal, so this wires the two halves up directly: the
simulator listens for the application backend, the backend connects, and then
the scripted taps and waits run against the live app.

    python3 tools/shoot.py                     # every shot below
    python3 tools/shoot.py songs animals       # just those

Each shot is one simulator run from a cold start, which is the point: a shot
that only looks right because of what the previous shot did is not evidence.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
BUILD = HERE / "build-sim"
BUNDLE = BUILD / "babybao_backend_assets/app.gspb"
BACKEND = BUILD / "babybao_backend"
SIM = Path.home() / ".cache/esp-mosaico/sim/1.5.1/sim"
OUT = Path("/tmp/babybao-shots")

# Tap targets, read off the scene rather than guessed: the three care buttons
# sit at y 368 with height 54 inside a page that starts at 0, the tab bar is
# the bottom 58 rows, and the creature fills the middle of the pet window.
TAB_PET = (80, 450)
TAB_SONGS = (240, 450)
TAB_ANIMALS = (400, 450)
CARE_FOOD = (85, 395)
CARE_PLAY = (240, 395)
CARE_BATH = (395, 395)
PET = (240, 200)
CLOCK = (289, 27)
FIRST_SONG = (120, 131)
FIRST_ANIMAL = (63, 128)

FPS = 60

# Early taps are dropped: the simulator is still bringing the scene up and the
# backend has not finished connecting, so nothing is listening for them yet.
# They fail silently, which is worse than failing — the shot comes out looking
# like the resting state and reads as a bug in the app. Every run therefore
# waits this long before its first tap. Well clear of the boundary, because a
# tap that lands on it is dropped some runs and not others.
WARMUP_MS = 2400


def frames(ms: int) -> int:
    return max(1, round(ms * FPS / 1000))


# How long a page switch needs before the new page has actually been drawn.
# Generous, because a headless simulator with a backend attached is much slower
# than the board and a half-switched page is not worth looking at.
SWITCH_MS = 1500

# Each shot is a name, a list of (tap, settle-ms) steps, and how long to let
# the app run before the frame is taken. The settle is measured from the last
# tap, so it is the moment in the animation the shot is meant to catch.
SHOTS: dict[str, tuple[list[tuple[tuple[int, int], int]], int]] = {
    # The resting pet, a second in, so the breath loop and the caption are
    # whatever the app chose rather than the scene's authored defaults.
    "pet": ([], 1200),
    # Mid-meal: the crumb has been carried up and the first bite is landing.
    "eat": ([(CARE_FOOD, 0)], 900),
    # The romp, with hearts over its head.
    "play": ([(CARE_PLAY, 0)], 800),
    # The shiver, with bubbles.
    "bath": ([(CARE_BATH, 0)], 700),
    # Poked.
    "poke": ([(PET, 0)], 300),
    # Twelve taps on the clock reaches the evening, which is the only way to
    # see the sleepy render in the afternoon.
    "sleepy": ([(CLOCK, 260)] * 12, 2500),
    "songs": ([(TAB_SONGS, 0)], SWITCH_MS),
    # A track playing: the title, the stop button and a scrolled lyric.
    "singing": ([(TAB_SONGS, SWITCH_MS), (FIRST_SONG, 0)], 5000),
    "animals": ([(TAB_ANIMALS, 0)], SWITCH_MS),
    "cry": ([(TAB_ANIMALS, SWITCH_MS), (FIRST_ANIMAL, 0)], 600),
}


def shoot(name: str) -> Path:
    steps, settle = SHOTS[name]
    target = OUT / f"{name}.png"
    ready = OUT / f"ready-{name}.json"
    ready.unlink(missing_ok=True)

    command = [
        str(SIM), "--bundle", str(BUNDLE), "--headless",
        "--backend-enable", "--backend-required", "--backend-idle-timeout",
        "30", "--ready-file", str(ready), "--fps", str(FPS),
        "--dump", str(target), "--dump-format", "png",
    ]
    # The run ends when the scripted action list is exhausted and the frame is
    # dumped there, so the frame count has to be the length of that list and
    # not a frame more: padding it does not extend the run, it just means the
    # dump lands after the act being photographed has already finished.
    total = frames(WARMUP_MS) + frames(settle)
    command += ["--wait", str(frames(WARMUP_MS))]
    for (x, y), pause in steps:
        command += ["--tap", str(x), str(y)]
        if pause:
            command += ["--wait", str(frames(pause))]
            total += frames(pause)
    command += ["--wait", str(frames(settle)), "--frames", str(total)]

    sim = subprocess.Popen(command, stdout=subprocess.DEVNULL,
                           stderr=subprocess.PIPE)
    backend = None
    try:
        endpoint = None
        deadline = time.time() + 30
        while time.time() < deadline:
            if sim.poll() is not None:
                raise RuntimeError(
                    f"simulator exited early: "
                    f"{sim.stderr.read().decode(errors='replace')[-800:]}")
            if ready.is_file():
                try:
                    endpoint = json.loads(ready.read_text())["backend"]
                    break
                except (json.JSONDecodeError, KeyError):
                    pass
            time.sleep(0.05)
        if not endpoint:
            raise RuntimeError("simulator never published a backend endpoint")

        backend = subprocess.Popen([str(BACKEND), "--endpoint", endpoint],
                                   stdout=subprocess.DEVNULL,
                                   stderr=subprocess.DEVNULL)
        if sim.wait(timeout=120) != 0:
            raise RuntimeError(
                f"simulator failed: "
                f"{sim.stderr.read().decode(errors='replace')[-800:]}")
    finally:
        for proc in (backend, sim):
            if proc and proc.poll() is None:
                proc.terminate()
        ready.unlink(missing_ok=True)
    return target


if __name__ == "__main__":
    if not BUNDLE.is_file() or not BACKEND.is_file():
        raise SystemExit(
            "Build the simulator backend first:\n"
            "  python3 ../../submodule/esp-mosaico-utils/mosaico-tools/"
            "mosaico.py project sim --headless --duration 1")
    OUT.mkdir(parents=True, exist_ok=True)
    wanted = sys.argv[1:] or list(SHOTS)
    for name in wanted:
        if name not in SHOTS:
            raise SystemExit(f"unknown shot {name!r}; have {', '.join(SHOTS)}")
        print(f"  {shoot(name)}")
