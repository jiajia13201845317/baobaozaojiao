# 宝宝陪伴 · ESP-Mosaico

The web app's pet, its nursery rhymes and its animal cries, as native firmware
for an ESP-Mosaico board: a 480×480 touch panel with an ES8311 speaker.

Three pages, one creature, one voice.

- **小恐龙** — the pet. Its expression, its posture and what it says are all
  driven by the same mood model the web app uses, with the thresholds
  untouched. Feed it, play with it, wash it; poke it and it answers.
- **儿歌** — twelve sung nursery rhymes, six Chinese and six English, with the
  lyric scrolling in time.
- **动物** — twelve animals; tapping one plays its cry.

Nothing here needs a network, an account or a phone. Points accumulate, the
egg cracks at Lv2 and Lv3, and the creature inside is revealed at Lv4.

## Running it

The PC simulator draws the real scene and runs the real behaviour layer, so
almost everything can be watched and corrected without hardware:

```sh
cd device/projects/babybao
python3 ../../submodule/esp-mosaico-utils/mosaico-tools/mosaico.py \
    project sim --interactive
```

On the board, from this directory:

```sh
. ~/esp/esp-idf/export.sh
idf.py --preview set-target esp32s31 build
python3 ../../submodule/esp-mosaico-utils/mosaico-tools/mosaico.py recover
python3 ../../submodule/esp-mosaico-utils/mosaico-tools/mosaico.py \
    iris system-update
```

Run `recover` before the first install on a blank or unverified device. Use
`system-update` for new apps or changed resources and layouts; `app-update`
only for code changes with an identical partition table and resources. Device
operations go through `mosaico.py`, never through `idf.py flash` — see the
workspace's own notes on that.

## What is where

| Path | What it is |
| --- | --- |
| `main/pet_state.c` | The mood and level model, a direct port of the web app's `pets.ts` and `mood.ts`. Touches no hardware. |
| `main/pet_lines.c` | Every caption the pet can say, and the rule for picking one. |
| `main/baby_ui.c` | How the creature moves, and everything the three pages do. |
| `main/baby_audio.c` | Embedded MP3 straight into the BSP's ES8311. |
| `main/baby_store.c` | The pet, in NVS. |
| `ui/main.json` | The GSP scene. Generated — edit `tools/build_scene.py`. |
| `pc/platform_pc.c` | The simulator's stand-ins for the codec and NVS. |

## The asset pipeline

Three generators, all committed alongside their output so the build never
needs them, and all idempotent:

```sh
python3 tools/build_assets.py   # art and audio, from the web app's sources
python3 tools/build_gen.py      # song table, embedded media table, charset
python3 tools/build_scene.py    # ui/main.json and main/scene_layout.h
```

`build_gen.py` matters more than it looks. Every glyph the firmware can draw
is baked into the bundle at build time, and a character that was not baked
comes out blank on the panel. The compiler collects the scene's static text on
its own, but a string chosen in C — a caption, a lyric, a mood name — is
invisible to it, so `ui/charset.txt` is scanned out of the real C sources. Add
a line and its glyphs appear; nothing has to be remembered.

`build_scene.py` also writes `main/scene_layout.h`, because a handful of
numbers are needed by both the scene and the code that animates it: a tween
outside a property's declared range is refused, and one that stops short of
the authored position leaves an object somewhere the scene never put it.

## Three platform limits, and what was done about them

These are worth knowing before changing how the creature moves, because each
one rules out the obvious approach.

**There is no opacity.** Not on layers, not on images — it is not an
animatable property at all, so a cross-fade is impossible. The mood change is
hidden inside a movement instead: the creature dips, the face is swapped at
the bottom of the dip where the silhouette is already moving, and it comes
back up in the new mood's pose. Swapping on a still creature reads as a
glitch; swapping inside a take reads as it having changed its mind.

**Rotation is about the bounding-box centre, and clips.** A creature pinned at
its middle and rotated reads as a photograph being turned. So every lean is
paired with a horizontal shift of `126·sin(θ)`, which puts the pivot at the
feet. The art is also padded into a 300 px frame so a lean does not shave the
top of its head off — and the web app's `spin` pose is simply not here, since
a quarter turn would need a 368 px frame and a clipped spin is worse than no
spin.

**`scale` is uniform and forces the raw codec.** The web version squashes and
stretches; that is not available at any price here, since uniform scale reads
as the creature moving towards you rather than as a squash, and raw would cost
270 KiB per render. Height off the ground and the lean carry the whole
performance instead, which is why the leans are as large as they are.

One thing the platform gives for free, and the code leans on it hard:
`esp_gsp_component_play_animation` with `iterations = 0` runs a perpetual
tween on the render task, and a hidden target pauses playback. So the rain,
the sparkles, the hearts and the bubbles are started once at boot and never
touched again — hiding a layer stops its particles and showing it resumes
them, with no application-side ticking at all.

## Where the device differs from the web app on purpose

- **The meters do not drift while the board is off.** There is no clock that
  survives a power cycle, so a saved timestamp would be meaningless. What is
  saved is each meter's reading, which the next boot treats as fresh. A toy
  that has been in a drawer for a week should not greet a child with a
  starving pet, and since the board cannot know how long it was in there,
  pretending otherwise would be a guess dressed up as a fact.
- **The hour is a control, not a readout.** The mood depends on the time of
  day and the board cannot know it, so the hour is shown on a chip and tapping
  it moves the clock on. It is also the only way to reach the sleeping pet in
  the afternoon, which is the most charming thing the toy does.
- **No captions about being watched.** The web app has a mouse, so several of
  its lines are about the pet tracking a pointer. A touch panel has no hover;
  there is nothing to track between taps, so those lines are gone.
- **A sleeping pet asks for nothing.** Every "it is looking at the 喂食
  button" line is suppressed while the mood is sleepy, because the sleepy
  render has its eyes shut and that is the first thing anyone sees.
- **Points come only from finishing something** — a song heard to the end, or
  a care action that actually moved a meter. A pet whose level climbs while a
  child drums on one button makes the level mean nothing.

## Memory and layout

The compiled bundle is 1.8 MiB (952 KiB of images, 903 KiB of fonts) and the
embedded audio is 2.6 MiB, so `partitions.csv` grows `ota_0` to 8 MiB and
`ui_apps` to 6 MiB. The product contract fixes only the regions below
`application_region_start = 0x200000`; everything above is the app's to lay
out.

Thirty-six images are registered but exactly one is visible at boot, so the
initial static decode is a single 270 KB frame. The rest decode lazily into
PSRAM as the pet changes mood or a page is opened.
