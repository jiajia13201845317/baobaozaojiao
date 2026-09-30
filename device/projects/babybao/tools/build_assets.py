#!/usr/bin/env python3
"""Turn the web app's art and tracks into what the board can hold.

The website ships 448px WebP renders and 160kbps stereo MP3s because a phone
downloads them once over wifi. Here the same material has to live inside a
16MB flash next to the firmware, and the screen is 480x480, so both get cut
down: art to the size it is actually drawn at, tracks to mono at a rate that
still carries a child's voice and a music box.

Run from the project directory:

    python3 tools/build_assets.py
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent.parent
WEB = HERE.parent.parent.parent
ART = WEB / "public/art"
SONGS = WEB / "public/songs"
SFX = WEB / "public/sfx"

IMG_OUT = HERE / "ui/img"
SONG_OUT = HERE / "assets/songs"
CRY_OUT = HERE / "assets/cry"

# The creature is drawn on a 448px square with a lot of empty margin. Keeping
# the square rather than cropping to the ink means every mood render lands on
# the same spot, so swapping the face never shifts the body.
PET_PX = 264

# ...and then sat inside a larger transparent frame, because the panel rotates
# a bitmap about its bounding box and clips whatever leaves it. The creature's
# ink reaches all four edges of its own square, so without this margin even a
# few degrees of lean would shave the top of its head off. Transparent rows
# cost almost nothing once run-length encoded.
PET_FRAME = 300

# Faces, in the order `mood.ts` names them. "" is the render the creature was
# drawn with, which 开心 and 舒服 share.
MOODS = ["", "-flat", "-sad", "-sleepy"]

# The three incubation stages everything shares, plus the one creature this
# board ships with. Adding a whole series would not fit the UI partition.
STAGES = ["egg-1", "egg-2", "egg-3", "forest-1"]

# The particles the pet's own captions promise: a rain cloud when it is down,
# sparkles when it is pleased, hearts while it romps, bubbles in the bath and a
# crumb to eat. Sized to the height each one is drawn at, keeping its aspect.
PROPS = {
    "cloud": 64,
    "drop": 16,
    "star": 28,
    "heart": 28,
    "bubble": 24,
    "crumb": 46,
}

# The photos are resized to the exact square the scene draws them in, which
# build_scene.py owns; a mismatch either resamples again on the panel or pays
# flash for pixels nobody sees.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_scene import ANIMAL_PX  # noqa: E402

ANIMALS = [
    "dog", "cat", "cow", "duck", "sheep", "pig",
    "chick", "frog", "bird", "horse", "lion", "elephant",
]

# 24kHz mono at 40kbps. The tracks are a synthesised child voice over a music
# box: there is nothing above 10kHz to keep, and stereo is two copies of the
# same mix.
SONG_RATE = "24000"
SONG_BITRATE = "40k"
CRY_BITRATE = "32k"


def pet_art() -> None:
    IMG_OUT.mkdir(parents=True, exist_ok=True)
    for stage in STAGES:
        for mood in MOODS:
            src = ART / f"pet/{stage}{mood}.webp"
            if not src.is_file():
                sys.exit(f"missing pet render: {src}")
            im = Image.open(src).convert("RGBA")
            im = im.resize((PET_PX, PET_PX), Image.LANCZOS)
            frame = Image.new("RGBA", (PET_FRAME, PET_FRAME), (0, 0, 0, 0))
            edge = (PET_FRAME - PET_PX) // 2
            frame.paste(im, (edge, edge))
            out = IMG_OUT / f"pet-{stage}{mood or '-happy'}.png"
            frame.save(out, optimize=True)
            print(f"  {out.name}  {out.stat().st_size // 1024}KiB")


def prop_art() -> None:
    for name, height in PROPS.items():
        src = ART / f"prop/{name}.webp"
        if not src.is_file():
            sys.exit(f"missing prop: {src}")
        im = Image.open(src).convert("RGBA")
        width = max(1, round(im.width * height / im.height))
        im = im.resize((width, height), Image.LANCZOS)
        out = IMG_OUT / f"prop-{name}.png"
        im.save(out, optimize=True)
        print(f"  {out.name}  {width}x{height}  {out.stat().st_size}B")


def animal_art() -> None:
    for name in ANIMALS:
        src = ART / f"{name}.png"
        if not src.is_file():
            sys.exit(f"missing animal render: {src}")
        im = Image.open(src).convert("RGB")
        im = im.resize((ANIMAL_PX, ANIMAL_PX), Image.LANCZOS)
        out = IMG_OUT / f"animal-{name}.png"
        im.save(out, optimize=True)
        print(f"  {out.name}  {out.stat().st_size // 1024}KiB")


def encode(src: Path, dst: Path, bitrate: str) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src),
         "-ac", "1", "-ar", SONG_RATE, "-b:a", bitrate, str(dst)],
        check=True,
    )


def tracks() -> None:
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg is required to re-encode the tracks")
    if SONG_OUT.exists():
        shutil.rmtree(SONG_OUT)
    total = 0
    for src in sorted(SONGS.glob("*.mp3")):
        dst = SONG_OUT / src.name
        encode(src, dst, SONG_BITRATE)
        total += dst.stat().st_size
        print(f"  {dst.name}  {dst.stat().st_size // 1024}KiB")
    print(f"  songs total {total // 1024}KiB")

    if CRY_OUT.exists():
        shutil.rmtree(CRY_OUT)
    total = 0
    for name in ANIMALS:
        src = SFX / f"{name}.mp3"
        if not src.is_file():
            sys.exit(f"missing animal cry: {src}")
        dst = CRY_OUT / f"{name}.mp3"
        encode(src, dst, CRY_BITRATE)
        total += dst.stat().st_size
    print(f"  cries total {total // 1024}KiB")


def cues() -> None:
    """Copy the lyric timings across so the device can scroll along."""
    out = HERE / "assets/cues.json"
    book = {}
    for src in sorted(SONGS.glob("*.json")):
        book[src.stem] = json.loads(src.read_text(encoding="utf-8"))
    out.write_text(json.dumps(book, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  cues.json  {len(book)} songs")


if __name__ == "__main__":
    print("pet art")
    pet_art()
    print("props")
    prop_art()
    print("animal art")
    animal_art()
    print("tracks")
    tracks()
    print("lyrics")
    cues()
