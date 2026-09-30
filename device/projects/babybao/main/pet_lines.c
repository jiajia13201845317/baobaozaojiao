/* SPDX-License-Identifier: Apache-2.0 */

#include "pet_lines.h"

#include <stdio.h>

static const char *MOOD_NAME[PET_MOOD_COUNT] = {
    [PET_MOOD_HAPPY] = "开心",
    [PET_MOOD_CONTENT] = "舒服",
    [PET_MOOD_FLAT] = "一般",
    [PET_MOOD_DOWN] = "低落",
    [PET_MOOD_SLEEPY] = "困了",
};

static const char *CARE_NAME[PET_CARE_COUNT] = {
    [PET_CARE_FOOD] = "喂食",
    [PET_CARE_PLAY] = "陪玩",
    [PET_CARE_BATH] = "洗澡",
};

static const char *CARE_METER[PET_CARE_COUNT] = {
    [PET_CARE_FOOD] = "饱腹",
    [PET_CARE_PLAY] = "心情",
    [PET_CARE_BATH] = "干净",
};

const char *pet_mood_name(pet_mood_t mood)
{
    return mood >= 0 && mood < PET_MOOD_COUNT ? MOOD_NAME[mood] : MOOD_NAME[0];
}

const char *pet_care_name(pet_care_t id)
{
    return id >= 0 && id < PET_CARE_COUNT ? CARE_NAME[id] : CARE_NAME[0];
}

const char *pet_care_meter_name(pet_care_t id)
{
    return id >= 0 && id < PET_CARE_COUNT ? CARE_METER[id] : CARE_METER[0];
}

typedef struct {
    const char *const *lines;
    uint8_t count;
} line_set_t;

#define SET(...) { (const char *const[]){ __VA_ARGS__ }, \
                   sizeof((const char *const[]){ __VA_ARGS__ }) / sizeof(char *) }

/* Resting: the breath loop, the mood's posture, its own render. */
static const line_set_t IDLE_LINES[PET_MOOD_COUNT] = {
    /* pet_bounce keeps it off the ground; the sparkles sit over its head. */
    [PET_MOOD_HAPPY] = SET("它一直在原地弹。", "头顶上一闪一闪的。",
                           "心情好得停不下来。"),
    /* The breath loop, and the grin it was drawn with. */
    [PET_MOOD_CONTENT] = SET("它安安静静地呼吸。", "这样就挺好。",
                             "它笑着，一下一下地起伏。"),
    /* The flat render: eyes open, mouth a straight little line. */
    [PET_MOOD_FLAT] = SET("它在发呆。", "它没什么表情地看着你。",
                          "它慢慢地呼吸。", "有点无聊的样子。"),
    /* The droop pose sinks it; the sad render drops its eyes; a rain cloud. */
    [PET_MOOD_DOWN] = SET("它蹲下来了，没什么精神。", "它耷着脑袋。",
                          "头顶上飘着一小片雨云。"),
    /* The doze pose tips it over; the sleepy render has its eyes closed. */
    [PET_MOOD_SLEEPY] = SET("它眼睛闭上了。", "它歪着头，一点一点地打瞌睡。",
                            "天黑了，它撑不住了。", "它睡得很安稳。"),
};

/* A thin meter, asking rather than scolding. The pet leans towards the button
 * it wants, so the "往那边看" lines are describing where it is facing. */
static const line_set_t WANT_LINES[PET_CARE_COUNT] = {
    [PET_CARE_FOOD] = SET("肚子有点空空的。", "它一直往喂食那边看。"),
    [PET_CARE_PLAY] = SET("它想跟你玩一会儿。", "它朝陪玩那边转过去了。",
                          "它在原地扭来扭去。"),
    [PET_CARE_BATH] = SET("身上有点痒痒的。", "它朝洗澡那边看。"),
};

/* The immediate answer to being cared for, matching each act's own sequence. */
static const line_set_t CARE_LINES[PET_CARE_COUNT] = {
    /* The eat sequence is exactly two bites and a swallow. */
    [PET_CARE_FOOD] = SET("吃饱啦，谢谢你！", "它咬了两口，全吃完了。",
                          "它咽下去，抬头看你。"),
    /* The romp throws it side to side, and hearts come up. */
    [PET_CARE_PLAY] = SET("玩得好开心！", "它左右蹦了好几下。",
                          "它头顶上冒出好多爱心。"),
    /* The shake, with bubbles. */
    [PET_CARE_BATH] = SET("洗得香香的。", "它抖了一身的泡泡。",
                          "干净了，它自己都精神了。"),
};

/* The unprompted acts get their own lines, so the caption describes the pose
 * that is playing rather than whatever the resting mood would have said. */
static const line_set_t ACT_LINES[PET_ACT_COUNT] = {
    [PET_ACT_STRETCH] = SET("它伸了个懒腰。", "它把自己抻得长长的。"),
    [PET_ACT_HOP] = SET("它蹦了一下。", "它跳起来了！"),
    [PET_ACT_WIGGLE] = SET("它左右晃了晃。", "它扭了扭身子。"),
    [PET_ACT_PEEK] = SET("它探出身子往旁边看。", "它伸着头看外面。"),
    [PET_ACT_YAWN] = SET("它打了个大哈欠。", "它张着嘴打了个长长的哈欠。"),
};

/* Being poked is what a child will do most. The poke also pulls the pet
 * towards wherever the finger landed, which is what 转过头来找你 points at. */
static const line_set_t POKE_LINES =
    SET("诶？", "它被戳得晃了一下。", "它转过头来找你。",
        "它以为你要给它吃的。", "它缩了一下又弹回来。");

/* Asleep, and the sleepy render's eyes stay shut through all of it. */
static const line_set_t POKE_SLEEPY =
    SET("别吵…它在睡。", "它动了动，没睁眼。", "它晃了一下，又歪回去了。");

/* The lean is a real few degrees towards you, which is all this claims. */
static const line_set_t POKE_DOWN =
    SET("它抬头看了你一眼。", "它朝你这边挪了一点。", "它轻轻靠了过来。");

static const char *pick(const line_set_t *set, uint32_t seed)
{
    return set->count ? set->lines[seed % set->count] : "";
}

const char *pet_line(pet_act_t act, pet_mood_t mood, int want, uint32_t seed,
                     const char *level_line, int level_up_to, char *scratch,
                     size_t scratch_len)
{
    if (level_up_to > 0) {
        snprintf(scratch, scratch_len, "升到 Lv%d 啦！", level_up_to);
        return scratch;
    }
    if (act == PET_ACT_EAT) {
        return pick(&CARE_LINES[PET_CARE_FOOD], seed);
    }
    if (act == PET_ACT_PLAY) {
        return pick(&CARE_LINES[PET_CARE_PLAY], seed);
    }
    if (act == PET_ACT_BATH) {
        return pick(&CARE_LINES[PET_CARE_BATH], seed);
    }
    if (act == PET_ACT_POKE) {
        if (mood == PET_MOOD_SLEEPY) {
            return pick(&POKE_SLEEPY, seed);
        }
        if (mood == PET_MOOD_DOWN) {
            return pick(&POKE_DOWN, seed);
        }
        return pick(&POKE_LINES, seed);
    }
    if (act >= 0 && act < PET_ACT_COUNT && ACT_LINES[act].count) {
        return pick(&ACT_LINES[act], seed);
    }
    /*
     * A thin meter is the most useful thing to say, but not to the exclusion
     * of everything else — every third line stays flavour so it is not a nag.
     *
     * Never while asleep, though. Every want line is about the pet looking or
     * turning towards a button, and the sleepy render has its eyes shut and
     * its head tipped over. The web app does say these lines at night; on a
     * screen this size the closed eyes are the first thing you see, and a
     * caption that contradicts them is worse than no caption.
     */
    if (want >= 0 && mood != PET_MOOD_SLEEPY && seed % 3 != 2) {
        return pick(&WANT_LINES[want], seed);
    }
    if (seed % 4 == 3 && level_line) {
        return level_line;
    }
    return pick(&IDLE_LINES[mood], seed);
}
