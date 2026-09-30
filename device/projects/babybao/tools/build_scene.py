#!/usr/bin/env python3
"""Write ui/main.json.

The scene is generated rather than hand-kept because most of it is arithmetic:
three pages of grids on a 480x480 panel, where every object carries an absolute
rectangle and children are linked by index. Laying that out by hand means
recomputing a column of numbers whenever a gap changes, and a wrong parent
index is a silent mislayout rather than an error.

The output is a normal GSP scene and is committed, since that is what the
build compiles. Edit this file, run it, and commit both.

    python3 tools/build_scene.py
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent

W = H = 480
TABS_H = 58
PAGE_H = H - TABS_H

# Borrowed from the web app's own palette so the two builds look related.
CREAM = "#FFF7EC"
INK = "#2B3450"
MUTED = "#8B94AD"
CARD = "#FFFFFF"
LINE = "#EFE6D8"
FOREST = "#4CAF50"
TINT = "#DFF5DD"

MOOD_COLOR = "#3FBF8F"

# The shared incubation stages plus the one creature this board ships with,
# and the face each mood wears. 开心 and 舒服 share the render the creature
# was drawn with, which is why there are four faces and five moods.
STAGES = ["egg-1", "egg-2", "egg-3", "forest-1"]
MOOD_ART = ["happy", "flat", "sad", "sleepy"]
CARES = [
    ("food", "喂食", "饱腹", "#F2762E"),
    ("play", "陪玩", "心情", "#E4568F"),
    ("bath", "洗澡", "干净", "#3AA7E0"),
]

REG = "fonts/NotoSansSC-Regular.otf"
BOLD = "fonts/NotoSansSC-Bold.otf"

# Every runtime string's glyphs have to be baked in. One charset file, shared
# by the objects whose text the application sets, keeps that in one place.
CHARSET = "charset.txt"

SONGS = [
    ("bunny", "小兔子乖乖"), ("tigers", "两只老虎"), ("stars-zh", "小星星"),
    ("ducks", "数鸭子"), ("radish", "拔萝卜"), ("friends", "找朋友"),
    ("twinkle", "Twinkle Twinkle"), ("abc", "ABC Song"),
    ("macdonald", "Old MacDonald"), ("spider", "Itsy Bitsy Spider"),
    ("lamb", "Mary Had a Little Lamb"), ("boat", "Row Row Row Your Boat"),
]

ANIMALS = [
    ("dog", "狗"), ("cat", "猫"), ("cow", "牛"), ("duck", "鸭"),
    ("sheep", "羊"), ("pig", "猪"), ("chick", "鸡"), ("frog", "青蛙"),
    ("bird", "鸟"), ("horse", "马"), ("lion", "狮子"), ("elephant", "大象"),
]

# ---- the geometry the C side also needs ----
#
# Every number below ends up both in the scene and in an animation call, and
# the two have to agree: a tween outside a property's declared min/max is
# refused, and one that stops short of the authored position leaves the object
# somewhere the scene did not put it. So they are defined once here and
# written out as main/scene_layout.h for baby_ui.c to include.

# The creature's group, and the travel its resting and acting poses have.
PET_FRAME = 300
PET_X, PET_Y = 90, 44
PET_Y_MIN, PET_Y_MAX = 8, 74
PET_LEAN = 8
SHADOW_X, SHADOW_Y = 196, 318

# The crumb's rest position under the creature, and how far up it is carried.
CRUMB_X, CRUMB_Y = 218, 300
CRUMB_TOP = 176
CRUMB_SWING = 22

# Rain falls; sparks bob and shimmer; hearts and bubbles rise.
DROP_X = [20, 48, 76]
DROP_TOP, DROP_BOTTOM = 64, 130
STARS = [(0, 30, 26), (40, 0, 20), (76, 46, 22)]
STAR_BOB, STAR_SPIN = 8, 40
HEARTS = [(4, 56, 31), (46, 20, 26), (88, 44, 28)]
HEART_RISE, HEART_DIP = 44, 8
BUBBLES = [(4, 60), (44, 24), (92, 78), (306, 30), (352, 70), (392, 22)]
BUBBLE_RISE, BUBBLE_DIP = 48, 10


class Scene:
    def __init__(self) -> None:
        self.objects: list[dict] = []

    def add(self, **obj) -> int:
        """Append one object and return its index, for use as a parent."""
        obj.setdefault("parent", -1)
        self.objects.append(obj)
        return len(self.objects) - 1


def span(default, low, high):
    """A bounded dynamic scalar, which is what makes x/y writable from C.

    A plain number stays a compile-time literal with no runtime property, and
    esp_gsp_component_set_position then fails with NOT_FOUND rather than
    moving anything.
    """
    return {"default": default, "min": low, "max": high}


def label(s: Scene, parent, x, y, w, h, text, size=22, color=INK,
          align="center", font=REG, name=None, charset=False, hidden=False,
          lines=1, live=False):
    obj = dict(type="label", parent=parent, x=x, y=y, w=w, h=h, text=text,
               font_size=size, fg_color=color, text_align=align, font=font)
    if name:
        obj["name"] = name
    if live:
        # Text the application writes needs a bind; a name alone is not enough.
        obj["bind"] = name
        obj["bind_target"] = "text"
    if charset:
        obj["font_charset_file"] = CHARSET
    if hidden:
        obj["hidden"] = True
    if lines > 1 and not live:
        obj["text_vertical_align"] = "top"
    return s.add(**obj)


def pet_page(s: Scene) -> None:
    page = s.add(type="layer", x=0, y=0, w=W, h=PAGE_H, name="page_pet",
                 bind="page_pet", bind_target="visible")

    # The window the creature lives in, tinted with its series colour.
    s.add(type="container", parent=page, x=14, y=50, w=452, h=282,
          bg_color=TINT, bg_gradient="#F3FBF1", gradient_dir="vertical",
          radius=28, name="pet_window")

    # Mood on the left, level on the right. The chip takes the mood's colour.
    chip = s.add(type="container", parent=page, x=14, y=10, w=118, h=34,
                 bg_color=MOOD_COLOR, radius=17, name="mood_chip",
                 bind="mood_chip", bind_target="color")
    label(s, chip, 0, 0, 118, 34, "舒服", 21, "#FFFFFF", name="mood_text",
          charset=True, live=True)

    label(s, page, 140, 12, 106, 30, "积分 0", 21, MUTED, name="points_text",
          charset=True, live=True)

    # The clock, which is a control rather than a readout.
    #
    # The board has no network and no battery-backed clock, so it cannot know
    # the hour, and the mood depends on it — a pet asleep every time you
    # switch the toy on is a broken toy. Rather than hide a guess, the hour is
    # shown and tapping it moves it on, which is also the only way a child can
    # reach the sleeping pet in the afternoon.
    clock = s.add(type="button", parent=page, x=252, y=10, w=74, h=34,
                  bg_color=CARD, radius=17, border_color=LINE, border_width=1,
                  callback="clock", name="clock_button")
    # Size 21, matching the other two chips: a font pack is per (font, size),
    # so a lone 20 would bake all 260 glyphs again for three characters.
    label(s, clock, 0, 0, 74, 34, "9 点", 21, MUTED, name="clock_text",
          charset=True, live=True)

    lvl = s.add(type="container", parent=page, x=334, y=10, w=132, h=34,
                bg_color=CARD, radius=17, border_color=LINE, border_width=1)
    label(s, lvl, 0, 0, 132, 34, "Lv1 蛋仔", 21, FOREST, name="level_text",
          charset=True, font=BOLD, live=True)

    # The shadow goes down before the creature so the creature sits on it, and
    # slides with the lean so the pet keeps something to stand on.
    s.add(type="container", parent=page, x=span(SHADOW_X, SHADOW_X - 28,
                                                SHADOW_X + 28),
          y=SHADOW_Y, w=88, h=12, bg_color="#00000022", radius=6,
          name="pet_shadow")

    # The creature: a stack of every render it can wear, in one group that
    # moves as a unit.
    #
    # Swapping which render is visible is how the mood changes face. The other
    # way round would be esp_gsp_component_set_image, but that wants a
    # pre-encoded GSP resource blob rather than a path, which means shipping a
    # separate external asset bundle and a filesystem to keep it on. Sixteen
    # compiled-in images and a visibility flip needs neither, and they all sit
    # in exactly the same place, so the face changes without the body moving.
    #
    # No `scalable`: it would force the raw codec, at 270KiB per render and
    # 4.3MiB for the set, and the scale it buys is uniform — it reads as the
    # creature moving towards you rather than as a squash. y and rotation
    # carry the motion instead.
    body = s.add(type="layer", parent=page, x=span(PET_X, PET_X - 28,
                                                   PET_X + 28),
                 y=span(PET_Y, PET_Y_MIN, PET_Y_MAX), w=PET_FRAME,
                 h=PET_FRAME, name="pet_body", callback="poke")
    for stage in STAGES:
        for mood in MOOD_ART:
            first = stage == STAGES[0] and mood == MOOD_ART[0]
            # The panel rotates a bitmap about its own bounding-box centre,
            # which on its own reads as a photograph being turned rather than
            # as a creature leaning. C pairs every rotation with the matching
            # x shift on the group so the pivot lands at the feet.
            s.add(type="image", parent=body, x=0, y=0, w=PET_FRAME,
                  h=PET_FRAME, image=f"img/pet-{stage}-{mood}.png",
                  codec="rle16_a8",
                  name=f"face_{stage.replace('-', '_')}_{mood}",
                  rotation=span(0, -PET_LEAN, PET_LEAN), hidden=not first,
                  bind=f"face_{stage.replace('-', '_')}_{mood}",
                  bind_target="visible")

    # The particles each caption promises. Each set is one layer, so showing a
    # mood's weather is a single call, and the loops inside pause while their
    # layer is hidden — no app-side ticking.
    rain = s.add(type="layer", parent=page, x=30, y=58, w=130, h=150,
                 name="rain", hidden=True,
                 bind="rain", bind_target="visible")
    s.add(type="image", parent=rain, x=8, y=0, w=87, h=64,
          image="img/prop-cloud.png", codec="rle16_a8")
    for i, x in enumerate(DROP_X):
        s.add(type="image", parent=rain, x=x,
              y=span(DROP_TOP, DROP_TOP - 4, DROP_BOTTOM), w=10, h=16,
              image="img/prop-drop.png", codec="rle16_a8", name=f"drop_{i}")

    spark = s.add(type="layer", parent=page, x=330, y=58, w=120, h=104,
                  name="spark", hidden=True,
                  bind="spark", bind_target="visible")
    for i, (x, y, size) in enumerate(STARS):
        s.add(type="image", parent=spark, x=x,
              y=span(y, y - STAR_BOB, y + STAR_BOB), w=size, h=size,
              image="img/prop-star.png", codec="rle16_a8", name=f"star_{i}",
              rotation=span(0, -STAR_SPIN, STAR_SPIN))

    hearts = s.add(type="layer", parent=page, x=322, y=52, w=130, h=130,
                   name="hearts", hidden=True,
                   bind="hearts", bind_target="visible")
    for i, (x, y, size) in enumerate(HEARTS):
        s.add(type="image", parent=hearts, x=x,
              y=span(y, y - HEART_RISE, y + HEART_DIP), w=size, h=size,
              image="img/prop-heart.png", codec="rle16_a8", name=f"heart_{i}")

    bubbles = s.add(type="layer", parent=page, x=26, y=60, w=430, h=210,
                    name="bubbles", hidden=True,
                    bind="bubbles", bind_target="visible")
    for i, (x, y) in enumerate(BUBBLES):
        s.add(type="image", parent=bubbles, x=x,
              y=span(y, y - BUBBLE_RISE, y + BUBBLE_DIP), w=24, h=24,
              image="img/prop-bubble.png", codec="rle16_a8",
              name=f"bubble_{i}")

    # The crumb is carried up to the mouth, so C drives both axes.
    s.add(type="image", parent=page,
          x=span(CRUMB_X, CRUMB_X - CRUMB_SWING, CRUMB_X + CRUMB_SWING),
          y=span(CRUMB_Y, CRUMB_TOP, CRUMB_Y + 20), w=46, h=46,
          image="img/prop-crumb.png", codec="rle16_a8", name="crumb",
          hidden=True)

    label(s, page, 20, 336, 440, 30, "里面好像有动静。", 23, INK,
          name="pet_line", charset=True, live=True)

    # Three care buttons, each showing the meter it fills.
    gap = 8
    bw = (W - 20 - gap * 2) // 3
    for cid, name, meter, color in CARES:
        i = [c[0] for c in CARES].index(cid)
        x = 10 + i * (bw + gap)
        btn = s.add(type="button", parent=page, x=x, y=368, w=bw, h=54,
                    bg_color=CARD, radius=16, border_color=LINE,
                    border_width=1, callback=f"care_{cid}", name=f"care_{cid}")
        label(s, btn, 0, 2, bw, 26, name, 23, color, font=BOLD)
        label(s, btn, 0, 27, bw, 18, f"{meter} 60", 15, MUTED,
              name=f"value_{cid}", charset=True, live=True)
        s.add(type="progress", parent=btn, x=16, y=46, w=bw - 32, h=4,
              value=60, min=0, max=100, radius=2, bg_color="#EDEDF2",
              fg_color=color, name=f"meter_{cid}")


def songs_page(s: Scene) -> None:
    page = s.add(type="layer", x=0, y=0, w=W, h=PAGE_H, name="page_songs",
                 hidden=True, bind="page_songs", bind_target="visible")

    label(s, page, 20, 10, 340, 34, "儿歌", 28, INK, align="left", font=BOLD,
          name="song_title", charset=True, live=True)
    stop = s.add(type="button", parent=page, x=368, y=10, w=96, h=34,
                 bg_color="#FDECE2", radius=17, callback="stop",
                 name="stop_button", hidden=True)
    label(s, stop, 0, 0, 96, 34, "停下", 21, "#F2762E")

    # The sung line, which scrolls with the track. Two lines' worth of room:
    # the longest lyric is sixteen characters and the panel is 440 wide.
    label(s, page, 20, 46, 440, 56, "点一首，它就唱给你听", 22, MUTED,
          name="song_cue", charset=True, lines=2, live=True)

    gap = 7
    bw = (W - 20 - gap) // 2
    bh = 50
    for i, (sid, title) in enumerate(SONGS):
        x = 10 + (i % 2) * (bw + gap)
        y = 106 + (i // 2) * (bh + gap)
        btn = s.add(type="button", parent=page, x=x, y=y, w=bw, h=bh,
                    bg_color=CARD, radius=14, border_color=LINE,
                    border_width=1, callback=f"play_{sid.replace('-', '_')}",
                    name=f"song_{sid.replace('-', '_')}")
        # Titles are static, so the compiler bakes their glyphs on its own.
        size = 22 if len(title) < 14 else 17
        label(s, btn, 0, 0, bw, bh, title, size, INK, font=BOLD)


def animals_page(s: Scene) -> None:
    page = s.add(type="layer", x=0, y=0, w=W, h=PAGE_H, name="page_animals",
                 hidden=True, bind="page_animals", bind_target="visible")

    label(s, page, 20, 10, 440, 34, "动物", 28, INK, align="left", font=BOLD)
    label(s, page, 20, 46, 440, 26, "点一下，听它怎么叫", 20, MUTED,
          align="left")

    cols, gap = 4, 8
    cell = (W - 16 - gap * (cols - 1)) // cols
    for i, (aid, name) in enumerate(ANIMALS):
        x = 8 + (i % cols) * (cell + gap)
        y = 80 + (i // cols) * (cell + 30)
        btn = s.add(type="button", parent=page, x=x, y=y, w=cell, h=cell + 24,
                    bg_color=CARD, radius=16, border_color=LINE,
                    border_width=1, callback=f"cry_{aid}", name=f"cry_{aid}")
        # No radius: the source is opaque, so a corner radius would only round
        # the background behind it and leave the photo's own corners square.
        s.add(type="image", parent=btn, x=(cell - 96) // 2, y=4, w=96, h=96,
              image=f"img/animal-{aid}.png", codec="jpeg", quality=84)
        label(s, btn, 0, cell + 1, cell, 22, name, 20, INK)


def tabs(s: Scene) -> None:
    s.add(type="container", x=0, y=PAGE_H, w=W, h=TABS_H, bg_color=CARD)
    s.add(type="container", x=0, y=PAGE_H, w=W, h=1, bg_color=LINE)
    names = [("pet", "小恐龙"), ("songs", "儿歌"), ("animals", "动物")]
    tw = W // 3
    for i, (tid, name) in enumerate(names):
        btn = s.add(type="button", x=i * tw, y=PAGE_H + 1, w=tw, h=TABS_H - 1,
                    bg_color=CARD, callback=f"tab_{tid}", name=f"tab_{tid}")
        # A label's fg_color is static, so the selected tab is marked by the
        # underline rather than by recolouring the word.
        label(s, btn, 0, 0, tw, TABS_H - 9, name, 22, INK, font=BOLD)
        s.add(type="container", x=i * tw + tw // 2 - 18, y=H - 9, w=36, h=4,
              radius=2, bg_color=FOREST, name=f"tab_mark_{tid}",
              bind=f"tab_mark_{tid}", bind_target="visible", hidden=i != 0)


def layout_header() -> str:
    def arr(name, values):
        body = ", ".join(str(v) for v in values)
        return (f"static const int16_t {name}[{len(values)}] "
                f"= {{ {body} }};\n")

    return (
        "/* SPDX-License-Identifier: Apache-2.0 */\n"
        "/* Generated by tools/build_scene.py — do not edit. */\n"
        "/*\n"
        " * The scene's own numbers, for the code that animates it.\n"
        " *\n"
        " * A tween that leaves a property's declared range is refused and one\n"
        " * that lands short of the authored position leaves the object\n"
        " * somewhere the scene never put it, so these cannot be re-guessed on\n"
        " * this side.\n"
        " */\n"
        "#pragma once\n\n"
        "#include <stdint.h>\n\n"
        f"#define PET_FRAME   {PET_FRAME}\n"
        f"#define PET_X       {PET_X}\n"
        f"#define PET_Y       {PET_Y}\n"
        f"#define PET_Y_MIN   {PET_Y_MIN}\n"
        f"#define PET_Y_MAX   {PET_Y_MAX}\n"
        f"#define PET_LEAN    {PET_LEAN}\n"
        f"#define SHADOW_X    {SHADOW_X}\n\n"
        f"#define CRUMB_X     {CRUMB_X}\n"
        f"#define CRUMB_Y     {CRUMB_Y}\n"
        f"#define CRUMB_TOP   {CRUMB_TOP}\n"
        f"#define CRUMB_SWING {CRUMB_SWING}\n\n"
        f"#define DROP_TOP    {DROP_TOP}\n"
        f"#define DROP_BOTTOM {DROP_BOTTOM}\n"
        f"#define STAR_BOB    {STAR_BOB}\n"
        f"#define STAR_SPIN   {STAR_SPIN}\n"
        f"#define HEART_RISE  {HEART_RISE}\n"
        f"#define HEART_DIP   {HEART_DIP}\n"
        f"#define BUBBLE_RISE {BUBBLE_RISE}\n"
        f"#define BUBBLE_DIP  {BUBBLE_DIP}\n\n"
        + arr("STAR_Y", [y for _, y, _ in STARS])
        + arr("HEART_Y", [y for _, y, _ in HEARTS])
        + arr("BUBBLE_Y", [y for _, y in BUBBLES])
    )


if __name__ == "__main__":
    s = Scene()
    pet_page(s)
    songs_page(s)
    animals_page(s)
    tabs(s)

    scene = {
        "screen": "baby",
        "w": W,
        "h": H,
        "screen_bg": CREAM,
        "font": REG,
        "default_font_size": 22,
        "swipe": False,
        "objects": s.objects,
    }
    out = HERE / "ui/main.json"
    out.write_text(json.dumps(scene, ensure_ascii=False, indent=1) + "\n",
                   encoding="utf-8")
    print(f"  ui/main.json  {len(s.objects)} objects")

    (HERE / "main/scene_layout.h").write_text(layout_header(),
                                              encoding="utf-8")
    print("  main/scene_layout.h")
