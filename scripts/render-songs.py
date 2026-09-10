#!/usr/bin/env python3
"""Render nursery rhymes as mixed piano + vocal tracks (not oscillator beeps)."""

from __future__ import annotations

import asyncio
import json
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "songs"
SF2 = Path("/usr/share/sounds/sf2/FluidR3_GM.sf2")
BPM = 92
PPQ = 480
BEAT = 60.0 / BPM

MIDI_NOTE = {
    "G3": 55,
    "A3": 57,
    "B3": 59,
    "C4": 60,
    "D4": 62,
    "E4": 64,
    "F4": 65,
    "G4": 67,
    "A4": 69,
    "B4": 71,
    "C5": 72,
    "D5": 74,
    "E5": 76,
    "rest": None,
}

SONGS = [
    {
        "id": "bunny",
        "title": "小兔子乖乖",
        "lang": "zh",
        "voice": "zh-CN-YunxiaNeural",
        "rate": "-6%",
        "pitch": "+4Hz",
        "lyrics": [
            "小兔子乖乖，把门开开。",
            "快点儿开开，我要进来。",
            "不开不开，我不开。",
            "妈妈没回来，谁来也不开。",
        ],
        "melody": [
            ("G4", 1), ("G4", 1), ("A4", 1), ("G4", 1),
            ("E4", 1), ("E4", 1), ("D4", 1), ("C4", 2),
            ("E4", 1), ("E4", 1), ("F4", 1), ("E4", 1),
            ("D4", 1), ("C4", 1), ("C4", 2),
        ],
    },
    {
        "id": "tigers",
        "title": "两只老虎",
        "lang": "zh",
        "voice": "zh-CN-YunxiaNeural",
        "rate": "-4%",
        "pitch": "+3Hz",
        "lyrics": [
            "两只老虎，两只老虎。",
            "跑得快，跑得快。",
            "一只没有眼睛，一只没有尾巴。",
            "真奇怪，真奇怪。",
        ],
        "melody": [
            ("C4", 1), ("D4", 1), ("E4", 1), ("C4", 1),
            ("C4", 1), ("D4", 1), ("E4", 1), ("C4", 1),
            ("E4", 1), ("F4", 1), ("G4", 2),
            ("E4", 1), ("F4", 1), ("G4", 2),
            ("G4", 0.5), ("A4", 0.5), ("G4", 0.5), ("F4", 0.5), ("E4", 1), ("C4", 1),
            ("G4", 0.5), ("A4", 0.5), ("G4", 0.5), ("F4", 0.5), ("E4", 1), ("C4", 1),
            ("C4", 1), ("G3", 1), ("C4", 2),
            ("C4", 1), ("G3", 1), ("C4", 2),
        ],
    },
    {
        "id": "stars-zh",
        "title": "小星星",
        "lang": "zh",
        "voice": "zh-CN-XiaoyiNeural",
        "rate": "-8%",
        "pitch": "+6Hz",
        "lyrics": [
            "一闪一闪亮晶晶，满天都是小星星。",
            "挂在天上放光明，好像许多小眼睛。",
            "一闪一闪亮晶晶，满天都是小星星。",
        ],
        "melody": [
            ("C4", 1), ("C4", 1), ("G4", 1), ("G4", 1), ("A4", 1), ("A4", 1), ("G4", 2),
            ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 1), ("D4", 1), ("C4", 2),
            ("G4", 1), ("G4", 1), ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 2),
            ("G4", 1), ("G4", 1), ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 2),
            ("C4", 1), ("C4", 1), ("G4", 1), ("G4", 1), ("A4", 1), ("A4", 1), ("G4", 2),
            ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 1), ("D4", 1), ("C4", 2),
        ],
    },
    {
        "id": "ducks",
        "title": "数鸭子",
        "lang": "zh",
        "voice": "zh-CN-YunxiaNeural",
        "rate": "-5%",
        "pitch": "+4Hz",
        "lyrics": [
            "门前大桥下，游过一群小鸭子。",
            "快来快来数一数，二，四，六，七，八。",
            "嘎，嘎，嘎，嘎，真呀真多呀。",
            "数不清到底多少小鸭子。",
        ],
        "melody": [
            ("G4", 1), ("E4", 1), ("G4", 1), ("E4", 2),
            ("A4", 1), ("G4", 1), ("E4", 1), ("D4", 2),
            ("C4", 1), ("D4", 1), ("E4", 1), ("G4", 1),
            ("A4", 1), ("G4", 1), ("E4", 2),
            ("G4", 1), ("G4", 1), ("E4", 1), ("C4", 1),
            ("D4", 1), ("E4", 1), ("C4", 2),
        ],
    },
    {
        "id": "radish",
        "title": "拔萝卜",
        "lang": "zh",
        "voice": "zh-CN-YunxiaNeural",
        "rate": "-4%",
        "pitch": "+2Hz",
        "lyrics": [
            "拔萝卜，拔萝卜，嘿哟，嘿哟，拔萝卜。",
            "嘿哟，嘿哟，拔不动。",
            "老公公，快快来，快来帮我们拔萝卜。",
        ],
        "melody": [
            ("G4", 1), ("E4", 1), ("G4", 2),
            ("G4", 1), ("E4", 1), ("G4", 2),
            ("A4", 1), ("G4", 1), ("E4", 1), ("D4", 1),
            ("C4", 1), ("D4", 1), ("E4", 2),
            ("G4", 1), ("E4", 1), ("C4", 2),
        ],
    },
    {
        "id": "friends",
        "title": "找朋友",
        "lang": "zh",
        "voice": "zh-CN-XiaoyiNeural",
        "rate": "-6%",
        "pitch": "+5Hz",
        "lyrics": [
            "找呀找呀找朋友，找到一个好朋友。",
            "敬个礼呀握握手，你是我的好朋友。",
            "再见！",
        ],
        "melody": [
            ("C4", 1), ("C4", 1), ("E4", 1), ("G4", 1),
            ("C4", 1), ("C4", 1), ("E4", 1), ("G4", 1),
            ("A4", 1), ("A4", 1), ("G4", 2),
            ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1),
            ("D4", 1), ("D4", 1), ("C4", 2),
        ],
    },
    {
        "id": "twinkle",
        "title": "Twinkle Twinkle",
        "lang": "en",
        "voice": "en-US-AnaNeural",
        "rate": "-8%",
        "pitch": "+6Hz",
        "lyrics": [
            "Twinkle, twinkle, little star.",
            "How I wonder what you are.",
            "Up above the world so high.",
            "Like a diamond in the sky.",
            "Twinkle, twinkle, little star.",
            "How I wonder what you are.",
        ],
        "melody": [
            ("C4", 1), ("C4", 1), ("G4", 1), ("G4", 1), ("A4", 1), ("A4", 1), ("G4", 2),
            ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 1), ("D4", 1), ("C4", 2),
            ("G4", 1), ("G4", 1), ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 2),
            ("G4", 1), ("G4", 1), ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 2),
            ("C4", 1), ("C4", 1), ("G4", 1), ("G4", 1), ("A4", 1), ("A4", 1), ("G4", 2),
            ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 1), ("D4", 1), ("C4", 2),
        ],
    },
    {
        "id": "abc",
        "title": "ABC Song",
        "lang": "en",
        "voice": "en-US-AnaNeural",
        "rate": "-12%",
        "pitch": "+4Hz",
        "lyrics": [
            "Ay, Bee, See, Dee, Eee, Eff, Jee.",
            "Aitch, Eye, Jay, Kay, Ell, Em, En, Oh, Pee.",
            "Cue, Are, Ess, Tee, You, Vee.",
            "Double you, Ecks, Why, and Zee.",
            "Now I know my Ay Bee Sees.",
            "Next time won't you sing with me.",
        ],
        "melody": [
            ("C4", 1), ("C4", 1), ("G4", 1), ("G4", 1), ("A4", 1), ("A4", 1), ("G4", 2),
            ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 1), ("D4", 1), ("C4", 2),
            ("G4", 1), ("G4", 1), ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 2),
            ("G4", 1), ("G4", 1), ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 2),
            ("C4", 1), ("C4", 1), ("G4", 1), ("G4", 1), ("A4", 1), ("A4", 1), ("G4", 2),
            ("F4", 1), ("F4", 1), ("E4", 1), ("E4", 1), ("D4", 1), ("D4", 1), ("C4", 2),
        ],
    },
    {
        "id": "macdonald",
        "title": "Old MacDonald",
        "lang": "en",
        "voice": "en-US-AnaNeural",
        "rate": "-6%",
        "pitch": "+3Hz",
        "lyrics": [
            "Old Mac Donald had a farm, Eee, I, Eee, I, Oh.",
            "And on that farm he had a cow, Eee, I, Eee, I, Oh.",
            "With a moo, moo here, and a moo, moo there.",
            "Here a moo, there a moo, everywhere a moo, moo.",
            "Old Mac Donald had a farm, Eee, I, Eee, I, Oh.",
        ],
        "melody": [
            ("G4", 1), ("G4", 1), ("G4", 1), ("D4", 1), ("E4", 1), ("E4", 1), ("D4", 2),
            ("B4", 1), ("B4", 1), ("A4", 1), ("A4", 1), ("G4", 2), ("rest", 0.5),
            ("D4", 1), ("G4", 1), ("G4", 1), ("G4", 1), ("D4", 1), ("E4", 1), ("E4", 1), ("D4", 2),
        ],
    },
    {
        "id": "spider",
        "title": "Itsy Bitsy Spider",
        "lang": "en",
        "voice": "en-US-AnaNeural",
        "rate": "-8%",
        "pitch": "+5Hz",
        "lyrics": [
            "The itsy bitsy spider climbed up the water spout.",
            "Down came the rain and washed the spider out.",
            "Out came the sun and dried up all the rain.",
            "And the itsy bitsy spider climbed up the spout again.",
        ],
        "melody": [
            ("C4", 1), ("C4", 1), ("C4", 1), ("D4", 1), ("E4", 2),
            ("E4", 1), ("D4", 1), ("E4", 1), ("F4", 1), ("G4", 2),
            ("C5", 1), ("C5", 1), ("G4", 1), ("G4", 1), ("E4", 1), ("E4", 1), ("C4", 2),
            ("G4", 1), ("F4", 1), ("E4", 1), ("D4", 1), ("C4", 2),
        ],
    },
    {
        "id": "lamb",
        "title": "Mary Had a Little Lamb",
        "lang": "en",
        "voice": "en-US-AnaNeural",
        "rate": "-8%",
        "pitch": "+5Hz",
        "lyrics": [
            "Mary had a little lamb, little lamb, little lamb.",
            "Mary had a little lamb, its fleece was white as snow.",
            "And everywhere that Mary went, Mary went, Mary went.",
            "Everywhere that Mary went, the lamb was sure to go.",
        ],
        "melody": [
            ("E4", 1), ("D4", 1), ("C4", 1), ("D4", 1), ("E4", 1), ("E4", 1), ("E4", 2),
            ("D4", 1), ("D4", 1), ("D4", 2), ("E4", 1), ("G4", 1), ("G4", 2),
            ("E4", 1), ("D4", 1), ("C4", 1), ("D4", 1), ("E4", 1), ("E4", 1), ("E4", 1), ("E4", 1),
            ("D4", 1), ("D4", 1), ("E4", 1), ("D4", 1), ("C4", 3),
        ],
    },
    {
        "id": "boat",
        "title": "Row Row Row Your Boat",
        "lang": "en",
        "voice": "en-US-AnaNeural",
        "rate": "-8%",
        "pitch": "+4Hz",
        "lyrics": [
            "Row, row, row your boat.",
            "Gently down the stream.",
            "Merrily, merrily, merrily, merrily.",
            "Life is but a dream.",
        ],
        "melody": [
            ("C4", 1), ("C4", 1), ("C4", 1), ("D4", 1), ("E4", 2),
            ("E4", 1), ("D4", 1), ("E4", 1), ("F4", 1), ("G4", 3),
            ("C5", 0.5), ("C5", 0.5), ("C5", 0.5), ("G4", 0.5), ("G4", 0.5), ("G4", 0.5),
            ("E4", 0.5), ("E4", 0.5), ("E4", 0.5), ("C4", 0.5), ("C4", 0.5), ("C4", 0.5),
            ("G4", 1), ("F4", 1), ("E4", 1), ("D4", 1), ("C4", 3),
        ],
    },
]


def vlq(value: int) -> bytes:
    parts = [value & 0x7F]
    value >>= 7
    while value:
        parts.append((value & 0x7F) | 0x80)
        value >>= 7
    return bytes(reversed(parts))


def track_chunk(events: list[tuple[int, bytes]]) -> bytes:
    events.sort(key=lambda item: item[0])
    payload = bytearray()
    last = 0
    for tick, message in events:
        payload.extend(vlq(max(0, tick - last)))
        payload.extend(message)
        last = tick
    payload.extend(vlq(0))
    payload.extend(b"\xff\x2f\x00")
    return b"MTrk" + struct.pack(">I", len(payload)) + bytes(payload)


def write_midi(path: Path, events: list[tuple[int, bytes]]) -> None:
    tempo = int(60_000_000 / BPM)
    header_events = [
        (0, b"\xff\x51\x03" + tempo.to_bytes(3, "big")),
        (0, b"\xff\x58\x04\x04\x02\x18\x08"),
    ]
    body = track_chunk(header_events + events)
    header = b"MThd" + struct.pack(">IHHH", 6, 0, 1, PPQ)
    path.write_bytes(header + body)


def beats(notes: list[tuple[str, float]]) -> float:
    return sum(duration for _, duration in notes)


def arrange(song: dict) -> tuple[list[tuple[int, bytes]], float]:
    melody = song["melody"]
    intro = 4.0
    outro = 4.0
    events: list[tuple[int, bytes]] = []

    def tick(beat: float) -> int:
        return int(round(beat * PPQ))

    def program(channel: int, program: int, at: float = 0) -> None:
        events.append((tick(at), bytes([0xC0 | channel, program])))

    def on(channel: int, note: int, vel: int, at: float) -> None:
        events.append((tick(at), bytes([0x90 | channel, note, vel])))

    def off(channel: int, note: int, at: float) -> None:
        events.append((tick(at), bytes([0x80 | channel, note, 0])))

    def hold(channel: int, note: int, vel: int, start: float, dur: float) -> None:
        on(channel, note, vel, start)
        off(channel, note, start + dur)

    program(0, 0)  # acoustic grand
    program(1, 10)  # music box
    program(2, 89)  # warm pad
    program(3, 46)  # harp
    program(4, 32)  # acoustic bass

    total = intro + beats(melody) * 2 + outro
    for note, vel in ((48, 42), (55, 36), (64, 28)):
        hold(2, note, vel, 0, total - 0.25)

    cursor = intro
    for pass_idx in range(2):
        at = cursor
        for name, dur in melody:
            midi = MIDI_NOTE[name]
            if midi is not None:
                piano_vel = 92 if pass_idx == 0 else 84
                hold(0, midi, piano_vel, at, dur * 0.96)
                hold(1, midi + 12 if midi + 12 <= 96 else midi, 40, at + 0.02, dur * 0.9)
                if dur >= 2:
                    hold(3, midi, 48, at, min(dur, 1.6))
                    hold(4, max(33, midi - 12), 58, at, dur * 0.9)
            at += dur
        cursor = at

    hold(3, 60, 50, 0.4, 1.6)
    hold(3, 67, 46, 1.6, 1.6)
    hold(0, 60, 70, total - outro, 1.5)
    hold(0, 67, 64, total - outro + 1.5, 1.2)
    hold(0, 72, 60, total - 1.3, 1.2)
    return events, total


def duration_of(path: Path) -> float:
    raw = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        text=True,
    ).strip()
    return float(raw)


async def speak(text: str, voice: str, dest: Path, rate: str, pitch: str) -> None:
    import edge_tts

    for attempt in range(4):
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            await comm.save(str(dest))
            if dest.stat().st_size > 800:
                return
        except Exception as exc:
            print(f"  tts retry {attempt + 1}: {exc}", file=sys.stderr)
            await asyncio.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"tts failed for {text!r}")


def render_midi(mid: Path, wav: Path) -> None:
    cmd = [
        "fluidsynth",
        "-ni",
        "-r",
        "48000",
        "-g",
        "0.75",
        "-C",
        "1",
        "-R",
        "1",
        str(SF2),
        str(mid),
        "-F",
        str(wav),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)


def mix(inst: Path, vocal: Path, dest: Path, fade_out: float) -> None:
    end = max(duration_of(inst), duration_of(vocal))
    fade_at = max(0.4, end - fade_out)
    filt = (
        f"[0:a]highpass=f=55,lowpass=f=11000,aecho=0.8:0.86:52:0.18,volume=0.78[i];"
        f"[1:a]highpass=f=90,acompressor=threshold=-20dB:ratio=2.6:attack=8:release=140,volume=1.18[v];"
        f"[i][v]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,"
        f"loudnorm=I=-16:TP=-1.5:LRA=10,afade=t=in:st=0:d=0.35,afade=t=out:st={fade_at:.2f}:d={fade_out:.2f}"
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(inst),
            "-i",
            str(vocal),
            "-filter_complex",
            filt,
            "-ar",
            "44100",
            "-b:a",
            "192k",
            str(dest),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def silent(path: Path, seconds: float) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=r=44100:cl=stereo",
            "-t",
            f"{seconds:.2f}",
            str(path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def concat_wavs(parts: list[Path], dest: Path) -> None:
    listing = dest.with_suffix(".txt")
    listing.write_text("".join(f"file '{part}'\n" for part in parts), encoding="utf-8")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-ar", "44100", "-ac", "2", str(dest)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    listing.unlink(missing_ok=True)


async def render_song(song: dict) -> None:
    print(f"render {song['id']} — {song['title']}")
    events, total = arrange(song)
    with tempfile.TemporaryDirectory() as raw:
        tmp = Path(raw)
        mid = tmp / "song.mid"
        inst = tmp / "inst.wav"
        write_midi(mid, events)
        render_midi(mid, inst)

        intro = 4 * BEAT
        pieces: list[Path] = []
        cues = [{"at": 0.35, "text": song["title"]}]
        pad = tmp / "pad.wav"
        silent(pad, intro)
        pieces.append(pad)
        cursor = intro
        for index, line in enumerate(song["lyrics"]):
            spoken = tmp / f"line-{index}.mp3"
            wav = tmp / f"line-{index}.wav"
            gap = tmp / f"gap-{index}.wav"
            await speak(line, song["voice"], spoken, song["rate"], song["pitch"])
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(spoken), "-ar", "44100", "-ac", "2", str(wav)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            cues.append({"at": round(cursor, 2), "text": line})
            pieces.append(wav)
            silent(gap, 0.22)
            pieces.append(gap)
            cursor += duration_of(wav) + 0.22

        vocal = tmp / "vocal.wav"
        concat_wavs(pieces, vocal)
        needed = duration_of(vocal) + 1.4
        if needed > duration_of(inst):
            extra = tmp / "tail.wav"
            silent(extra, needed - duration_of(inst) + 0.3)
            longer = tmp / "inst-long.wav"
            concat_wavs([inst, extra], longer)
            inst = longer

        dest_mp3 = OUT / f"{song['id']}.mp3"
        dest_json = OUT / f"{song['id']}.json"
        mix(inst, vocal, dest_mp3, fade_out=1.4)
        dest_json.write_text(json.dumps({"id": song["id"], "title": song["title"], "cues": cues}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  -> {dest_mp3.name} {duration_of(dest_mp3):.1f}s {dest_mp3.stat().st_size // 1024}KB")


async def main() -> None:
    if not SF2.exists():
        raise SystemExit(f"missing soundfont: {SF2}")
    OUT.mkdir(parents=True, exist_ok=True)
    ids = set(sys.argv[1:])
    catalog = [song for song in SONGS if not ids or song["id"] in ids]
    for song in catalog:
        await render_song(song)
    credits = OUT / "CREDITS.txt"
    credits.write_text(
        "Nursery-rhyme arrangements recorded for 宝宝听听.\n"
        "Piano, music box, harp and pad: FluidR3 GM (Frank Wen).\n"
        "Vocals: neural child voices, generated for this project.\n"
        "Melodies are traditional / public-domain nursery rhymes.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    asyncio.run(main())
