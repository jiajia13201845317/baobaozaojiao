/* SPDX-License-Identifier: Apache-2.0 */

#include "baby_ui.h"

#include <stdio.h>
#include <string.h>

#include "baby_audio.h"
#include "baby_store.h"
#include "bundle_gsp.h"
#include "catalog.h"
#include "pet_lines.h"
#include "pet_state.h"
#include "scene_layout.h"

/*
 * How the creature moves.
 *
 * Two clocks, not one, because the platform offers two and they are good at
 * different things.
 *
 * Continuous motion — the breath, the rain, the rising hearts — is a looping
 * tween handed to the render task once and never touched again. It is smooth
 * regardless of what this code is doing, it costs nothing per frame here, and
 * a hidden target pauses it, so a mood's weather stops the moment its layer is
 * hidden.
 *
 * Discrete motion — the beats of a stretch, a bite, a hop — is sequenced from
 * this tick. Each beat hands the render task a tween that runs until the next
 * beat is due, so the tick only has to be fine enough to place the beats, not
 * to draw the motion. At 60 ms the placement error is under a frame.
 */
#define TICK_MS 60

/* The web version squashes and stretches the creature. This one cannot: GSP's
 * scale is uniform and forces the raw codec, so a squash is not available at
 * any price. Height off the ground and a lean carry the whole performance
 * instead, which is why the leans below are as large as they are. */
#define REST_GLIDE_MS 280

/* Points.
 *
 * Only two things earn them, and both are something finished rather than
 * something tapped: a song heard to the end, and a care action that actually
 * moved a meter. A pet whose level climbs while a child drums on one button
 * makes the level mean nothing, and the reveal at Lv4 is the only promise
 * this app makes. */
#define POINTS_SONG 10
#define POINTS_CARE 5

/* Sentinels for a beat's y: leave it alone, or return to the mood's own
 * resting height, which differs because a low pet sits lower. */
#define KEEP ((int16_t)-30000)
#define REST ((int16_t)-30001)

/*
 * Where the creature's feet are, measured down from the centre of its frame.
 *
 * The panel turns a bitmap about its bounding-box centre. A creature pinned
 * at its middle and rotated reads as a photograph being turned; a creature
 * pinned at its feet reads as leaning. The difference is a horizontal shift
 * of r·sin(theta), which every lean below is paired with, so the feet stay
 * where they are and only the body tips.
 */
#define FEET_R 126

typedef struct {
    uint16_t at_ms;
    int16_t y;
    int16_t lean;
    uint16_t dur_ms;
    uint8_t ease;
    /*
     * Non-zero turns `lean` into an oscillation of +/- that many degrees with
     * this period, which the render task drives. A wiggle and a shake are
     * both a fast tremor, and a tremor sequenced from a 60 ms tick looks like
     * a stutter; handed over as a looping tween it is smooth. `cycles` of 0
     * runs until a later beat with shake_ms == 0 stops it.
     */
    uint16_t shake_ms;
    uint8_t cycles;
} beat_t;

typedef struct {
    const beat_t *beats;
    uint8_t count;
} score_t;

typedef struct {
    int16_t base;
    int16_t top;
    uint16_t ms;
    int8_t lean;
} pose_t;

/*
 * The resting pose per mood.
 *
 * This is the whole difference between a picture and a creature, so the
 * numbers matter: a happy pet leaves the ground every half second, a content
 * one breathes, a flat one barely moves, and the two low moods sit lower than
 * the others and drift rather than bounce. The sleepy one also keeps a
 * permanent tilt, because a head that has gone over stays over.
 */
static const pose_t POSES[PET_MOOD_COUNT] = {
    [PET_MOOD_HAPPY] = { PET_Y, PET_Y - 12, 560, 0 },
    [PET_MOOD_CONTENT] = { PET_Y, PET_Y - 6, 1800, 0 },
    [PET_MOOD_FLAT] = { PET_Y, PET_Y - 4, 2600, 0 },
    [PET_MOOD_DOWN] = { PET_Y + 9, PET_Y + 6, 3000, 0 },
    [PET_MOOD_SLEEPY] = { PET_Y + 8, PET_Y + 4, 3400, 3 },
};

#define EASE_OUT ESP_GSP_EASE_OUT
#define EASE_BOTH ESP_GSP_EASE_IN_OUT

static const beat_t BEATS_STRETCH[] = {
    { 0, PET_Y - 10, -6, 460, EASE_BOTH, 0, 0 },
    { 500, PET_Y - 10, 6, 420, EASE_BOTH, 0, 0 },
    { 940, REST, 0, 440, EASE_BOTH, 0, 0 },
};

static const beat_t BEATS_HOP[] = {
    { 0, PET_Y_MIN + 8, KEEP, 280, EASE_OUT, 0, 0 },
    { 300, REST, KEEP, 300, EASE_BOTH, 0, 0 },
    /* The small second bounce is what sells the landing as having weight. */
    { 620, PET_Y - 5, KEEP, 120, EASE_OUT, 0, 0 },
    { 760, REST, KEEP, 140, EASE_BOTH, 0, 0 },
};

static const beat_t BEATS_WIGGLE[] = {
    { 0, KEEP, 7, 0, EASE_BOTH, 320, 3 },
    { 1000, REST, 0, 240, EASE_BOTH, 0, 0 },
};

static const beat_t BEATS_PEEK[] = {
    { 0, PET_Y - 4, 7, 420, EASE_BOTH, 0, 0 },
    /* Holds, because looking at something takes a moment. */
    { 900, PET_Y - 4, 8, 300, EASE_BOTH, 0, 0 },
    { 1300, REST, 0, 300, EASE_BOTH, 0, 0 },
};

static const beat_t BEATS_YAWN[] = {
    { 0, PET_Y - 10, -4, 700, EASE_BOTH, 0, 0 },
    { 760, PET_Y - 10, -5, 440, EASE_BOTH, 0, 0 },
    { 1240, REST, KEEP, 760, EASE_BOTH, 0, 0 },
};

/* Two bites with chewing in between, then a swallow and a pleased hop, which
 * is what 它咬了两口，全吃完了 and 它咽下去，抬头看你 describe. */
static const beat_t BEATS_EAT[] = {
    { 0, PET_Y - 6, -3, 700, EASE_BOTH, 0, 0 },
    { 700, PET_Y + 6, 0, 240, EASE_OUT, 0, 0 },
    { 940, PET_Y - 4, 0, 300, EASE_BOTH, 0, 0 },
    { 1240, PET_Y + 6, 0, 240, EASE_OUT, 0, 0 },
    { 1480, PET_Y - 4, 0, 300, EASE_BOTH, 0, 0 },
    { 1780, PET_Y - 12, 0, 400, EASE_BOTH, 0, 0 },
    { 2200, REST, 0, 380, EASE_BOTH, 0, 0 },
    { 2600, PET_Y_MIN + 10, KEEP, 200, EASE_OUT, 0, 0 },
    { 2800, REST, KEEP, 200, EASE_BOTH, 0, 0 },
};

/* The crumb's own track, one entry per beat of BEATS_EAT. It starts on the
 * ground, is carried up to the mouth, dips with each bite and is gone after
 * the second one. */
typedef struct {
    int16_t x;
    int16_t y;
    uint16_t dur_ms;
    int8_t show;
} crumb_beat_t;

static const crumb_beat_t CRUMB_EAT[] = {
    { CRUMB_X - 10, CRUMB_TOP + 16, 700, 1 },
    { CRUMB_X - 6, CRUMB_TOP + 30, 240, 1 },
    { CRUMB_X - 8, CRUMB_TOP + 18, 300, 1 },
    { CRUMB_X - 4, CRUMB_TOP + 30, 240, 1 },
    { KEEP, KEEP, 0, 0 },
    { KEEP, KEEP, 0, 0 },
    { KEEP, KEEP, 0, 0 },
    { KEEP, KEEP, 0, 0 },
    { KEEP, KEEP, 0, 0 },
};

_Static_assert(sizeof(CRUMB_EAT) / sizeof(CRUMB_EAT[0]) ==
                   sizeof(BEATS_EAT) / sizeof(BEATS_EAT[0]),
               "the crumb needs one entry per beat of the eat sequence");

static const beat_t BEATS_PLAY[] = {
    { 0, PET_Y_MIN + 10, -6, 260, EASE_OUT, 0, 0 },
    { 300, REST, 0, 280, EASE_BOTH, 0, 0 },
    { 600, PET_Y_MIN + 14, 6, 240, EASE_OUT, 0, 0 },
    { 860, REST, 0, 260, EASE_BOTH, 0, 0 },
    { 1200, PET_Y_MIN + 10, -4, 240, EASE_OUT, 0, 0 },
    { 1460, REST, 0, 260, EASE_BOTH, 0, 0 },
    { 1740, PET_Y - 6, KEEP, 140, EASE_OUT, 0, 0 },
    { 1880, REST, KEEP, 140, EASE_BOTH, 0, 0 },
};

/* A shiver, then one pleased hop once it is dry. */
static const beat_t BEATS_BATH[] = {
    { 0, KEEP, 5, 0, EASE_BOTH, 170, 0 },
    { 1600, REST, 0, 300, EASE_BOTH, 0, 0 },
    { 1940, PET_Y_MIN + 12, KEEP, 220, EASE_OUT, 0, 0 },
    { 2180, REST, KEEP, 220, EASE_BOTH, 0, 0 },
};

static const beat_t BEATS_POKE[] = {
    { 0, PET_Y + 6, KEEP, 160, EASE_OUT, 0, 0 },
    { 200, REST, KEEP, 260, EASE_BOTH, 0, 0 },
    /* The turn towards you. The event carries no touch coordinate, so the
     * side is a coin toss; `lean` is rewritten before the act starts. */
    { 480, KEEP, 6, 220, EASE_BOTH, 0, 0 },
};

static const beat_t BEATS_CHEER[] = {
    { 0, PET_Y_MIN, KEEP, 300, EASE_OUT, 0, 0 },
    { 340, REST, KEEP, 320, EASE_BOTH, 0, 0 },
    { 700, PET_Y_MIN, KEEP, 300, EASE_OUT, 0, 0 },
    { 1040, REST, KEEP, 320, EASE_BOTH, 0, 0 },
    { 1400, KEEP, 7, 0, EASE_BOTH, 300, 3 },
    { 2340, PET_Y_MIN + 10, KEEP, 240, EASE_OUT, 0, 0 },
    { 2600, REST, 0, 240, EASE_BOTH, 0, 0 },
};

#define SCORE(a) { a, sizeof(a) / sizeof(a[0]) }

static const score_t SCORES[PET_ACT_COUNT] = {
    [PET_ACT_STRETCH] = SCORE(BEATS_STRETCH),
    [PET_ACT_HOP] = SCORE(BEATS_HOP),
    [PET_ACT_WIGGLE] = SCORE(BEATS_WIGGLE),
    [PET_ACT_PEEK] = SCORE(BEATS_PEEK),
    [PET_ACT_YAWN] = SCORE(BEATS_YAWN),
    [PET_ACT_EAT] = SCORE(BEATS_EAT),
    [PET_ACT_PLAY] = SCORE(BEATS_PLAY),
    [PET_ACT_BATH] = SCORE(BEATS_BATH),
    [PET_ACT_POKE] = SCORE(BEATS_POKE),
    [PET_ACT_CHEER] = SCORE(BEATS_CHEER),
};

/* Mood colours, straight from the web app's own palette. */
static const uint32_t MOOD_RGB[PET_MOOD_COUNT] = {
    [PET_MOOD_HAPPY] = 0xF2A93B,
    [PET_MOOD_CONTENT] = 0x3FBF8F,
    [PET_MOOD_FLAT] = 0x8B94AD,
    [PET_MOOD_DOWN] = 0x7D87CF,
    [PET_MOOD_SLEEPY] = 0x6C74B8,
};

/* ---- the sixteen faces ---- */

typedef esp_err_t (*vis_fn_t)(esp_gsp_handle_t, bool);
typedef esp_err_t (*i32_fn_t)(esp_gsp_handle_t, int32_t);
typedef esp_err_t (*to_fn_t)(esp_gsp_handle_t, int32_t, uint32_t,
                             esp_gsp_ease_t);
typedef esp_err_t (*play_fn_t)(esp_gsp_handle_t, int32_t, int32_t,
                               const esp_gsp_animation_config_t *);
typedef esp_err_t (*stop_fn_t)(esp_gsp_handle_t);

typedef struct {
    vis_fn_t visible;
    i32_fn_t set_rotation;
    to_fn_t rotate_to;
    play_fn_t shake;
    stop_fn_t unshake;
} face_t;

/*
 * Four incubation stages times four faces, all stacked in the same place
 * inside pet_body, exactly one of them shown.
 *
 * The alternative was one image whose bitmap is replaced, but the setter for
 * that takes a pre-encoded GSP resource blob rather than a path, which means
 * shipping a second asset bundle and a filesystem to hold it. Sixteen
 * compiled-in renders and a visibility flip need neither, and because they
 * share a rectangle the face changes without the body moving.
 */
#define FACE(stage, mood)                                     \
    {                                                         \
        gsp_baby_face_##stage##_##mood##_set_visible,          \
        gsp_baby_face_##stage##_##mood##_set_rotation,         \
        gsp_baby_face_##stage##_##mood##_animate_rotation_to,  \
        gsp_baby_face_##stage##_##mood##_play_rotation,        \
        gsp_baby_face_##stage##_##mood##_stop_rotation,        \
    }

#define STAGE_COUNT 4
#define FACE_COUNT 4

static const face_t FACES[STAGE_COUNT][FACE_COUNT] = {
    { FACE(egg_1, happy), FACE(egg_1, flat), FACE(egg_1, sad),
      FACE(egg_1, sleepy) },
    { FACE(egg_2, happy), FACE(egg_2, flat), FACE(egg_2, sad),
      FACE(egg_2, sleepy) },
    { FACE(egg_3, happy), FACE(egg_3, flat), FACE(egg_3, sad),
      FACE(egg_3, sleepy) },
    { FACE(forest_1, happy), FACE(forest_1, flat), FACE(forest_1, sad),
      FACE(forest_1, sleepy) },
};

/* 开心 and 舒服 share the render the creature was drawn with; the other three
 * moods have their own. */
static const uint8_t MOOD_FACE[PET_MOOD_COUNT] = {
    [PET_MOOD_HAPPY] = 0, [PET_MOOD_CONTENT] = 0, [PET_MOOD_FLAT] = 1,
    [PET_MOOD_DOWN] = 2, [PET_MOOD_SLEEPY] = 3,
};

/* ---- the particles ---- */

static const play_fn_t DROP_Y[] = { gsp_baby_drop_0_play_y,
                                    gsp_baby_drop_1_play_y,
                                    gsp_baby_drop_2_play_y };
static const play_fn_t STAR_PLAY_Y[] = { gsp_baby_star_0_play_y,
                                         gsp_baby_star_1_play_y,
                                         gsp_baby_star_2_play_y };
static const play_fn_t STAR_PLAY_ROT[] = { gsp_baby_star_0_play_rotation,
                                           gsp_baby_star_1_play_rotation,
                                           gsp_baby_star_2_play_rotation };
static const play_fn_t HEART_PLAY_Y[] = { gsp_baby_heart_0_play_y,
                                          gsp_baby_heart_1_play_y,
                                          gsp_baby_heart_2_play_y };
static const play_fn_t BUBBLE_PLAY_Y[] = {
    gsp_baby_bubble_0_play_y, gsp_baby_bubble_1_play_y,
    gsp_baby_bubble_2_play_y, gsp_baby_bubble_3_play_y,
    gsp_baby_bubble_4_play_y, gsp_baby_bubble_5_play_y,
};

/* ---- pages ---- */

typedef enum { TAB_PET = 0, TAB_SONGS, TAB_ANIMALS } tab_t;

static const vis_fn_t PAGE_VIS[] = { gsp_baby_page_pet_set_visible,
                                     gsp_baby_page_songs_set_visible,
                                     gsp_baby_page_animals_set_visible };
static const vis_fn_t TAB_MARK[] = { gsp_baby_tab_mark_pet_set_visible,
                                     gsp_baby_tab_mark_songs_set_visible,
                                     gsp_baby_tab_mark_animals_set_visible };

static const i32_fn_t METER_SET[PET_CARE_COUNT] = {
    gsp_baby_meter_food_set_value, gsp_baby_meter_play_set_value,
    gsp_baby_meter_bath_set_value,
};

typedef esp_err_t (*text_fn_t)(esp_gsp_handle_t, const char *);

static const text_fn_t VALUE_SET[PET_CARE_COUNT] = {
    gsp_baby_value_food_set_text, gsp_baby_value_play_set_text,
    gsp_baby_value_bath_set_text,
};

#define SONG_PROMPT "点一首，它就唱给你听"

/* ---- state ---- */

static struct {
    pet_state_t pet;
    void *timer;

    tab_t tab;

    pet_mood_t mood;
    uint8_t stage;
    uint8_t face;
    /* A face the mood asked for while an act was playing, applied when the
     * act hands control back rather than mid-pose. */
    int8_t pending_face;

    pet_act_t act;
    uint16_t act_ms;
    uint8_t beat;
    /* Counts down the glide into the resting pose; the breath loop starts
     * when it lands, so the two never fight over the same property. */
    int16_t rest_in;
    int32_t idle_in;
    pet_ms_t pleased_until;
    /* Where the last move aimed the body. Read back from the scene instead
     * and a beat that means "hold this height" would sample whatever the
     * tween happened to be passing through. */
    int16_t lean;
    int16_t body_y;

    int8_t song;
    int8_t cue;

    int32_t level_up_to;
    uint8_t level_index;
    uint32_t rng;

    /* Last thing written to each live label, so a 1 Hz refresh does not
     * repaint text that has not changed. */
    char last_points[24];
    char last_clock[16];
    char last_level[32];
    char last_mood[12];
    char last_value[PET_CARE_COUNT][20];
    char last_line[64];
    char last_cue[80];
    char last_title[40];
    uint8_t last_particles;
} s;

static uint32_t roll(void)
{
    /* xorshift: the pet has to look like it has its own ideas, and two boards
     * side by side must not perform the same loop. Seeded from the boot
     * clock in init. */
    s.rng ^= s.rng << 13;
    s.rng ^= s.rng >> 17;
    s.rng ^= s.rng << 5;
    return s.rng;
}

/* sin(theta) * 1000 for the leans the scene allows, so the feet pivot needs
 * no floating point. */
static const int16_t SIN1000[PET_LEAN + 1] = { 0,  17,  35,  52,  70,
                                               87, 105, 122, 139 };

static int lean_dx(int deg)
{
    const int mag = deg < 0 ? -deg : deg;
    const int shift = FEET_R * SIN1000[mag > PET_LEAN ? PET_LEAN : mag] / 1000;
    return deg < 0 ? -shift : shift;
}

static const face_t *current_face(void)
{
    return &FACES[s.stage][s.face];
}

/*
 * Moves the creature.
 *
 * The lean and the matching horizontal shift are committed in one call, since
 * animating x and y separately gives no guarantee they land together, and a
 * body that arrives before its feet is exactly the distortion this is meant
 * to avoid. The shadow slides a third of the way, which is the weight moving
 * without the contact patch moving.
 */
static void move(esp_gsp_handle_t ui, int y, int lean, uint32_t dur,
                 esp_gsp_ease_t ease)
{
    s.lean = (int16_t)lean;
    s.body_y = (int16_t)y;
    const int x = PET_X + lean_dx(lean);
    if (dur == 0) {
        gsp_baby_pet_body_set_position(ui, x, y);
        current_face()->set_rotation(ui, lean);
        gsp_baby_pet_shadow_set_x(ui, SHADOW_X + lean_dx(lean) / 3);
        return;
    }
    gsp_baby_pet_body_animate_position_to(ui, x, y, dur, ease);
    current_face()->rotate_to(ui, lean, dur, ease);
    gsp_baby_pet_shadow_animate_x_to(ui, SHADOW_X + lean_dx(lean) / 3, dur,
                                     ease);
}

/* The lean a thin meter earns: towards the button that would fix it. Food is
 * the left button and bath the right, so the direction is real and not
 * decoration; play is the middle one, and leaning at it would say nothing, so
 * its wiggle carries that instead. */
static int want_lean(int want)
{
    if (want == PET_CARE_FOOD) {
        return -5;
    }
    if (want == PET_CARE_BATH) {
        return 5;
    }
    return 0;
}

static int resting_lean(void)
{
    /* A sleeping pet does not look at buttons. Its head has gone over and
     * stays over, and the caption agrees. */
    if (s.mood == PET_MOOD_SLEEPY) {
        return POSES[s.mood].lean;
    }
    return want_lean(pet_want(&s.pet, baby_now_ms()));
}

/* Glides into the mood's resting pose. The breath loop starts once the glide
 * lands, which the tick handles. */
static void rest(esp_gsp_handle_t ui, uint32_t glide_ms)
{
    current_face()->unshake(ui);
    gsp_baby_pet_body_stop_y(ui);
    move(ui, POSES[s.mood].base, resting_lean(), glide_ms, EASE_BOTH);
    s.rest_in = (int16_t)(glide_ms ? glide_ms : 1);
}

static void start_breathing(esp_gsp_handle_t ui)
{
    const pose_t *p = &POSES[s.mood];
    const esp_gsp_animation_config_t cfg = {
        .duration_ms = p->ms,
        .iterations = 0,
        .alternate = true,
        .ease = EASE_BOTH,
    };
    gsp_baby_pet_body_play_y(ui, p->base, p->top, &cfg);
}

/* ---- particles ---- */

static void particle_loops(esp_gsp_handle_t ui)
{
    /*
     * Started once, never touched again: every one of these is perpetual, and
     * a hidden target pauses playback, so hiding a layer stops its particles
     * and showing it resumes them. The staggered delays are what keep three
     * drops from falling as one.
     */
    for (int i = 0; i < 3; ++i) {
        const esp_gsp_animation_config_t fall = {
            .duration_ms = 900,
            .delay_ms = (uint32_t)i * 300,
            .iterations = 0,
            .ease = ESP_GSP_EASE_LINEAR,
        };
        DROP_Y[i](ui, DROP_TOP, DROP_BOTTOM, &fall);

        const esp_gsp_animation_config_t bob = {
            .duration_ms = 1400,
            .delay_ms = (uint32_t)i * 380,
            .iterations = 0,
            .alternate = true,
            .ease = EASE_BOTH,
        };
        STAR_PLAY_Y[i](ui, STAR_Y[i] - STAR_BOB, STAR_Y[i] + STAR_BOB, &bob);

        const esp_gsp_animation_config_t shimmer = {
            .duration_ms = 2600,
            .delay_ms = (uint32_t)i * 500,
            .iterations = 0,
            .alternate = true,
            .ease = EASE_BOTH,
        };
        STAR_PLAY_ROT[i](ui, -STAR_SPIN, STAR_SPIN, &shimmer);

        const esp_gsp_animation_config_t rise = {
            .duration_ms = 1600,
            .delay_ms = (uint32_t)i * 260,
            .iterations = 0,
            .ease = EASE_OUT,
        };
        HEART_PLAY_Y[i](ui, HEART_Y[i] + HEART_DIP, HEART_Y[i] - HEART_RISE,
                        &rise);
    }
    for (int i = 0; i < 6; ++i) {
        const esp_gsp_animation_config_t rise = {
            .duration_ms = 2000,
            .delay_ms = (uint32_t)i * 230,
            .iterations = 0,
            .ease = ESP_GSP_EASE_LINEAR,
        };
        BUBBLE_PLAY_Y[i](ui, BUBBLE_Y[i] + BUBBLE_DIP,
                         BUBBLE_Y[i] - BUBBLE_RISE, &rise);
    }
}

/* Only what the caption claims is on screen: sparkles over a happy pet, a
 * rain cloud over a low one, hearts while it is being played with, bubbles
 * while it is being washed. */
static void particles(esp_gsp_handle_t ui)
{
    const bool idle = s.act == PET_ACT_IDLE;
    const uint8_t want =
        (uint8_t)((s.act == PET_ACT_PLAY ? 1 : 0) |
                  (s.act == PET_ACT_BATH ? 2 : 0) |
                  ((s.act == PET_ACT_CHEER ||
                    (idle && s.mood == PET_MOOD_HAPPY))
                       ? 4
                       : 0) |
                  ((idle && s.mood == PET_MOOD_DOWN) ? 8 : 0));
    if (want == s.last_particles) {
        return;
    }
    s.last_particles = want;
    gsp_baby_hearts_set_visible(ui, (want & 1) != 0);
    gsp_baby_bubbles_set_visible(ui, (want & 2) != 0);
    gsp_baby_spark_set_visible(ui, (want & 4) != 0);
    gsp_baby_rain_set_visible(ui, (want & 8) != 0);
}

/* ---- labels ---- */

static void set_text(esp_gsp_handle_t ui, text_fn_t fn, char *cache,
                     size_t cache_len, const char *text)
{
    if (strncmp(cache, text, cache_len - 1) == 0) {
        return;
    }
    snprintf(cache, cache_len, "%s", text);
    fn(ui, cache);
}

static void say(esp_gsp_handle_t ui, const char *line)
{
    set_text(ui, gsp_baby_pet_line_set_text, s.last_line, sizeof(s.last_line),
             line);
}

/* The caption for whatever is happening right now. */
static void caption(esp_gsp_handle_t ui)
{
    const pet_level_t *lvl = &PET_LEVELS[pet_level_index(s.pet.total)];
    char scratch[48];
    const char *line =
        pet_line(s.act, s.mood, pet_want(&s.pet, baby_now_ms()), roll(),
                 lvl->line, (int)s.level_up_to, scratch, sizeof(scratch));
    say(ui, line);
}

static void refresh_chrome(esp_gsp_handle_t ui)
{
    char buf[40];

    set_text(ui, gsp_baby_mood_text_set_text, s.last_mood, sizeof(s.last_mood),
             pet_mood_name(s.mood));

    snprintf(buf, sizeof(buf), "积分 %d", (int)s.pet.total);
    set_text(ui, gsp_baby_points_text_set_text, s.last_points,
             sizeof(s.last_points), buf);

    snprintf(buf, sizeof(buf), "%d 点", baby_store_hour());
    set_text(ui, gsp_baby_clock_text_set_text, s.last_clock,
             sizeof(s.last_clock), buf);

    const int index = pet_level_index(s.pet.total);
    snprintf(buf, sizeof(buf), "Lv%d %s", PET_LEVELS[index].lv,
             PET_LEVELS[index].name);
    set_text(ui, gsp_baby_level_text_set_text, s.last_level,
             sizeof(s.last_level), buf);

    /* The bar and the number under each button say the same thing, so the
     * cached text doubles as the bar's change detector: at one refresh a
     * second and a drift of twelve points a day, almost every pass has
     * nothing to repaint. */
    const pet_ms_t now = baby_now_ms();
    for (int i = 0; i < PET_CARE_COUNT; ++i) {
        const int value = pet_meter(&s.pet, (pet_care_t)i, now);
        snprintf(buf, sizeof(buf), "%s %d", pet_care_meter_name((pet_care_t)i),
                 value);
        if (strcmp(s.last_value[i], buf) == 0) {
            continue;
        }
        set_text(ui, VALUE_SET[i], s.last_value[i], sizeof(s.last_value[i]),
                 buf);
        METER_SET[i](ui, value);
    }
}

/* ---- face and mood ---- */

/* Which art the creature wears: the shared incubation stages until the
 * reveal, then the creature itself. */
static uint8_t stage_for(int32_t total)
{
    const int index = pet_level_index(total);
    return (uint8_t)(index >= PET_REVEAL_LV - 1 ? STAGE_COUNT - 1 : index);
}

static void show_face(esp_gsp_handle_t ui, uint8_t stage, uint8_t face)
{
    if (stage == s.stage && face == s.face) {
        return;
    }
    /*
     * The outgoing render's rotation animation has to be stopped, not just
     * hidden. A hidden target only pauses, so a face swapped out mid-shiver
     * would still be shivering the next time its mood came round.
     */
    FACES[s.stage][s.face].unshake(ui);
    /* The incoming render takes the outgoing one's lean before it appears,
     * so the swap does not snap the body upright for one frame. */
    FACES[stage][face].set_rotation(ui, s.lean);
    FACES[stage][face].visible(ui, true);
    FACES[s.stage][s.face].visible(ui, false);
    s.stage = stage;
    s.face = face;
}

/*
 * The mood change.
 *
 * A cross-fade is impossible — there is no opacity property on this platform
 * at all — so the swap is hidden inside a movement instead: the creature dips,
 * the face changes at the bottom of the dip where the silhouette is already
 * moving, and it comes back up in the new mood's resting pose. Swapping on a
 * still creature reads as a glitch; swapping inside a take reads as it having
 * changed its mind.
 */
static void take_mood(esp_gsp_handle_t ui, pet_mood_t mood)
{
    s.mood = mood;
    gsp_baby_mood_chip_set_color_rgb888(ui, MOOD_RGB[mood]);
    const uint8_t face = MOOD_FACE[mood];
    if (s.act != PET_ACT_IDLE) {
        /* Mid-pose is the wrong moment; the act's own ending will do it. */
        s.pending_face = (int8_t)face;
        return;
    }
    current_face()->unshake(ui);
    gsp_baby_pet_body_stop_y(ui);
    move(ui, POSES[mood].base + 14, s.lean, 200, EASE_BOTH);
    s.rest_in = -200;
    s.pending_face = (int8_t)face;
}

static void apply_pending_face(esp_gsp_handle_t ui)
{
    if (s.pending_face >= 0) {
        show_face(ui, stage_for(s.pet.total), (uint8_t)s.pending_face);
        s.pending_face = -1;
    }
}

/* ---- acts ---- */

static void schedule_idle(void)
{
    s.idle_in = (int32_t)pet_next_idle_delay(s.mood, roll());
}

static void fire_beat(esp_gsp_handle_t ui, const beat_t *b)
{
    if (b->shake_ms) {
        const esp_gsp_animation_config_t cfg = {
            .duration_ms = b->shake_ms,
            .iterations = b->cycles,
            .alternate = true,
            .ease = b->ease,
        };
        current_face()->shake(ui, -b->lean, b->lean, &cfg);
        return;
    }
    current_face()->unshake(ui);
    const int y = b->y == KEEP ? s.body_y
                               : (b->y == REST ? POSES[s.mood].base : b->y);
    move(ui, y, b->lean == KEEP ? s.lean : b->lean, b->dur_ms, b->ease);
}

static void fire_crumb(esp_gsp_handle_t ui, uint8_t beat)
{
    const crumb_beat_t *c = &CRUMB_EAT[beat];
    if (!c->show) {
        gsp_baby_crumb_set_visible(ui, false);
        return;
    }
    if (beat == 0) {
        gsp_baby_crumb_set_position(ui, CRUMB_X, CRUMB_Y);
        gsp_baby_crumb_set_visible(ui, true);
    }
    gsp_baby_crumb_animate_position_to(ui, c->x, c->y, c->dur_ms, EASE_BOTH);
}

static void start_act(esp_gsp_handle_t ui, pet_act_t act)
{
    if (act == PET_ACT_IDLE || SCORES[act].count == 0) {
        return;
    }
    gsp_baby_pet_body_stop_y(ui);
    s.act = act;
    s.act_ms = 0;
    s.beat = 0;
    s.rest_in = 0;
    particles(ui);
    caption(ui);
    if (act == PET_ACT_EAT) {
        fire_crumb(ui, 0);
    }
    beat_t first = SCORES[act].beats[0];
    if (act == PET_ACT_POKE) {
        /* It turns towards you; with no touch coordinate to go on, which way
         * is a coin toss rather than a claim. */
        first.lean = (roll() & 1) ? 6 : -6;
    }
    fire_beat(ui, &first);
    s.beat = 1;
}

static void end_act(esp_gsp_handle_t ui)
{
    if (s.act == PET_ACT_EAT) {
        gsp_baby_crumb_set_visible(ui, false);
    }
    s.act = PET_ACT_IDLE;
    apply_pending_face(ui);
    particles(ui);
    rest(ui, REST_GLIDE_MS);
    caption(ui);
    schedule_idle();
}

static void advance_act(esp_gsp_handle_t ui)
{
    s.act_ms = (uint16_t)(s.act_ms + TICK_MS);
    const score_t *score = &SCORES[s.act];
    while (s.beat < score->count && score->beats[s.beat].at_ms <= s.act_ms) {
        fire_beat(ui, &score->beats[s.beat]);
        if (s.act == PET_ACT_EAT) {
            fire_crumb(ui, s.beat);
        }
        ++s.beat;
    }
    if (s.act_ms >= pet_act_ms(s.act)) {
        end_act(ui);
    }
}

/* ---- level ---- */

static void check_level(esp_gsp_handle_t ui)
{
    const int index = pet_level_index(s.pet.total);
    if (index <= s.level_index) {
        return;
    }
    s.level_index = (uint8_t)index;
    s.level_up_to = PET_LEVELS[index].lv;
    /* The reveal: at Lv4 the shell comes off and the creature is finally
     * itself, which is the one thing this app has been promising. */
    show_face(ui, stage_for(s.pet.total), s.face);
    refresh_chrome(ui);
    start_act(ui, PET_ACT_CHEER);
}

/* ---- care ---- */

static void do_care(esp_gsp_handle_t ui, pet_care_t id)
{
    const pet_ms_t now = baby_now_ms();
    const int before = pet_meter(&s.pet, id, now);
    pet_apply_care(&s.pet, id, now);
    const int after = pet_meter(&s.pet, id, now);

    /* Only a top-up that actually moved the meter is worth anything. A full
     * pet fed ten more times has not been cared for ten more times. */
    if (after - before >= 10) {
        s.pet.total += POINTS_CARE;
    }
    s.pleased_until = now + PET_PLEASED_TAIL_MS;
    baby_store_save(&s.pet);
    refresh_chrome(ui);
    start_act(ui, pet_act_for_care(id));
    /* A level-up outranks the care pose: the reveal is the bigger event and
     * the cheer replaces whatever was starting. */
    check_level(ui);
}

/* ---- the songs page ---- */

static void clear_song(esp_gsp_handle_t ui)
{
    s.song = -1;
    s.cue = -1;
    set_text(ui, gsp_baby_song_title_set_text, s.last_title,
             sizeof(s.last_title), "儿歌");
    set_text(ui, gsp_baby_song_cue_set_text, s.last_cue, sizeof(s.last_cue),
             SONG_PROMPT);
    gsp_baby_stop_button_set_visible(ui, false);
}

static void play_song(esp_gsp_handle_t ui, int index)
{
    s.song = (int8_t)index;
    s.cue = -1;
    baby_audio_play(SONGS[index].media);
    set_text(ui, gsp_baby_song_title_set_text, s.last_title,
             sizeof(s.last_title), SONGS[index].title);
    set_text(ui, gsp_baby_song_cue_set_text, s.last_cue, sizeof(s.last_cue),
             "");
    gsp_baby_stop_button_set_visible(ui, true);
}

/* Scrolls the lyric so the line on screen is the line being sung. */
static void follow_song(esp_gsp_handle_t ui)
{
    const song_t *song = &SONGS[s.song];
    const uint32_t at = baby_audio_elapsed_ms();
    int8_t want = -1;
    for (uint8_t i = 0; i < song->cue_count; ++i) {
        if (song->cues[i].at_ms <= at) {
            want = (int8_t)i;
        }
    }
    if (want == s.cue || want < 0) {
        return;
    }
    s.cue = want;
    set_text(ui, gsp_baby_song_cue_set_text, s.last_cue, sizeof(s.last_cue),
             song->cues[want].text);
}

static void show_tab(esp_gsp_handle_t ui, tab_t tab)
{
    if (tab == s.tab) {
        return;
    }
    s.tab = tab;
    for (int i = 0; i < 3; ++i) {
        PAGE_VIS[i](ui, i == (int)tab);
        TAB_MARK[i](ui, i == (int)tab);
    }
}

/* ---- events ---- */

static void on_event(esp_gsp_handle_t ui, const esp_gsp_event_t *event,
                     void *ctx)
{
    (void)ctx;
    if (!event || event->type != ESP_GSP_EVENT_CALL) {
        return;
    }

    if (gsp_baby_event_is_tab_pet(event)) {
        show_tab(ui, TAB_PET);
        return;
    }
    if (gsp_baby_event_is_tab_songs(event)) {
        show_tab(ui, TAB_SONGS);
        return;
    }
    if (gsp_baby_event_is_tab_animals(event)) {
        show_tab(ui, TAB_ANIMALS);
        return;
    }
    if (gsp_baby_event_is_clock(event)) {
        baby_store_bump_hour();
        baby_store_save(&s.pet);
        refresh_chrome(ui);
        return;
    }
    if (gsp_baby_event_is_poke(event)) {
        /* A poke always answers, even mid-pose: a creature that ignores being
         * touched is the fastest way to teach a child the screen is a
         * picture. */
        start_act(ui, PET_ACT_POKE);
        return;
    }
    if (gsp_baby_event_is_care_food(event)) {
        do_care(ui, PET_CARE_FOOD);
        return;
    }
    if (gsp_baby_event_is_care_play(event)) {
        do_care(ui, PET_CARE_PLAY);
        return;
    }
    if (gsp_baby_event_is_care_bath(event)) {
        do_care(ui, PET_CARE_BATH);
        return;
    }
    if (gsp_baby_event_is_stop(event)) {
        baby_audio_stop();
        clear_song(ui);
        return;
    }

    /* The twelve songs and twelve cries are a flat switch rather than twelve
     * more branches, because the action ids are contiguous and generated in
     * the same order as the tables. */
    static const uint16_t SONG_ACTS[SONG_COUNT] = {
        GSP_BABY_ACTION_PLAY_BUNNY,   GSP_BABY_ACTION_PLAY_TIGERS,
        GSP_BABY_ACTION_PLAY_STARS_ZH, GSP_BABY_ACTION_PLAY_DUCKS,
        GSP_BABY_ACTION_PLAY_RADISH,  GSP_BABY_ACTION_PLAY_FRIENDS,
        GSP_BABY_ACTION_PLAY_TWINKLE, GSP_BABY_ACTION_PLAY_ABC,
        GSP_BABY_ACTION_PLAY_MACDONALD, GSP_BABY_ACTION_PLAY_SPIDER,
        GSP_BABY_ACTION_PLAY_LAMB,    GSP_BABY_ACTION_PLAY_BOAT,
    };
    static const uint16_t CRY_ACTS[ANIMAL_COUNT] = {
        GSP_BABY_ACTION_CRY_DOG,   GSP_BABY_ACTION_CRY_CAT,
        GSP_BABY_ACTION_CRY_COW,   GSP_BABY_ACTION_CRY_DUCK,
        GSP_BABY_ACTION_CRY_SHEEP, GSP_BABY_ACTION_CRY_PIG,
        GSP_BABY_ACTION_CRY_CHICK, GSP_BABY_ACTION_CRY_FROG,
        GSP_BABY_ACTION_CRY_BIRD,  GSP_BABY_ACTION_CRY_HORSE,
        GSP_BABY_ACTION_CRY_LION,  GSP_BABY_ACTION_CRY_ELEPHANT,
    };
    for (int i = 0; i < SONG_COUNT; ++i) {
        if (event->action_id == SONG_ACTS[i]) {
            play_song(ui, i);
            return;
        }
    }
    for (int i = 0; i < ANIMAL_COUNT; ++i) {
        if (event->action_id == CRY_ACTS[i]) {
            /* A cry interrupts a song, because that is what tapping a second
             * sound means, and it takes the song's chrome down with it. */
            baby_audio_play((uint8_t)(SONG_COUNT + ANIMALS[i].media));
            clear_song(ui);
            return;
        }
    }
}

/* ---- the tick ---- */

static void tick(esp_gsp_handle_t ui, void *ctx)
{
    (void)ctx;

    if (s.song >= 0) {
        if (baby_audio_take_finished()) {
            /* Only a song heard to the end. */
            s.pet.total += POINTS_SONG;
            baby_store_save(&s.pet);
            clear_song(ui);
            refresh_chrome(ui);
            check_level(ui);
        } else if (baby_audio_playing()) {
            follow_song(ui);
        } else {
            clear_song(ui);
        }
    }

    if (s.rest_in != 0) {
        /* Negative counts down the dip of a mood change, positive the glide
         * back into the resting pose. */
        const bool dipping = s.rest_in < 0;
        s.rest_in = (int16_t)(dipping ? s.rest_in + TICK_MS
                                      : s.rest_in - TICK_MS);
        if (dipping && s.rest_in >= 0) {
            apply_pending_face(ui);
            rest(ui, 260);
        } else if (!dipping && s.rest_in <= 0) {
            s.rest_in = 0;
            start_breathing(ui);
        }
    }

    if (s.act != PET_ACT_IDLE) {
        advance_act(ui);
    } else {
        s.idle_in -= TICK_MS;
        if (s.idle_in <= 0) {
            start_act(ui, pet_random_idle_act(s.mood, roll()));
        }
    }

    /* Once a second is plenty for the meters, the clock and the mood: the
     * fastest of them drifts one point every two hours. */
    static uint8_t slow;
    if (++slow < 1000 / TICK_MS) {
        return;
    }
    slow = 0;

    const pet_ms_t now = baby_now_ms();
    if (s.level_up_to > 0 && s.act == PET_ACT_IDLE) {
        /* The level banner has had its moment; let the caption go back to
         * describing what is actually on screen. */
        s.level_up_to = 0;
        caption(ui);
    }
    const pet_mood_t mood = pet_mood(&s.pet, now, baby_store_hour(),
                                     now < s.pleased_until);
    if (mood != s.mood) {
        take_mood(ui, mood);
        caption(ui);
    }
    refresh_chrome(ui);
}

/* ---- setup ---- */

esp_err_t baby_ui_init(esp_gsp_handle_t ui)
{
    if (!ui) {
        return ESP_ERR_INVALID_ARG;
    }
    memset(&s, 0, sizeof(s));
    s.pending_face = -1;
    s.song = -1;
    s.cue = -1;
    /* The low bits of the boot clock: two boards switched on together must
     * not do the same thing at the same moment. */
    s.rng = (uint32_t)baby_now_ms() | 1u;

    baby_store_load(&s.pet);
    s.level_index = (uint8_t)pet_level_index(s.pet.total);

    const pet_ms_t now = baby_now_ms();
    s.mood = pet_mood(&s.pet, now, baby_store_hour(), false);

    /* The scene ships with egg-1/happy shown; move to whatever this pet
     * actually is before the first frame, so nothing is seen to change. */
    s.stage = 0;
    s.face = 0;
    show_face(ui, stage_for(s.pet.total), MOOD_FACE[s.mood]);
    gsp_baby_mood_chip_set_color_rgb888(ui, MOOD_RGB[s.mood]);

    particle_loops(ui);
    particles(ui);

    move(ui, POSES[s.mood].base, resting_lean(), 0, EASE_BOTH);
    start_breathing(ui);

    clear_song(ui);
    refresh_chrome(ui);
    caption(ui);
    schedule_idle();

    for (int i = 0; i < 3; ++i) {
        PAGE_VIS[i](ui, i == 0);
        TAB_MARK[i](ui, i == 0);
    }

    const esp_err_t err = esp_gsp_on_event(ui, on_event, NULL);
    if (err != ESP_OK) {
        return err;
    }
    s.timer = esp_gsp_timer_create(ui, TICK_MS, tick, NULL);
    return s.timer ? ESP_OK : ESP_ERR_NO_MEM;
}

void baby_ui_deinit(esp_gsp_handle_t ui)
{
    if (!ui) {
        return;
    }
    esp_gsp_on_event(ui, NULL, NULL);
    if (s.timer) {
        esp_gsp_timer_delete(ui, s.timer);
        s.timer = NULL;
    }
}
