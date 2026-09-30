/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The creature's model, ported from the web app's src/lib/grow/pets.ts and
 * mood.ts with the numbers left alone.
 *
 * Every threshold here is load-bearing for how the pet reads, and they were
 * tuned against the web build, so this file deliberately mirrors that source
 * rather than picking device-friendly round numbers. It touches no hardware
 * and no UI, so it builds and runs on the host.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Milliseconds, like the web app, so the drift arithmetic is the same
 * expression rather than a re-derived one. */
typedef int64_t pet_ms_t;

#define PET_DAY_MS 86400000LL

typedef enum {
    PET_CARE_FOOD = 0,
    PET_CARE_PLAY,
    PET_CARE_BATH,
    PET_CARE_COUNT,
} pet_care_t;

typedef enum {
    PET_MOOD_HAPPY = 0,
    PET_MOOD_CONTENT,
    PET_MOOD_FLAT,
    PET_MOOD_DOWN,
    PET_MOOD_SLEEPY,
    PET_MOOD_COUNT,
} pet_mood_t;

/*
 * The transient poses. `idle` is the resting state; the rest play once and
 * hand control back.
 *
 * The web app has one more, `spin`. It is not here: the panel rotates a
 * bitmap about its bounding box and clips whatever leaves it, and a 264px
 * creature turned a quarter turn needs a 368px frame to stay whole. Rather
 * than ship a spin that shears the corners off, the device does without it.
 */
typedef enum {
    PET_ACT_IDLE = 0,
    PET_ACT_STRETCH,
    PET_ACT_HOP,
    PET_ACT_WIGGLE,
    PET_ACT_PEEK,
    PET_ACT_YAWN,
    PET_ACT_EAT,
    PET_ACT_PLAY,
    PET_ACT_BATH,
    PET_ACT_POKE,
    PET_ACT_CHEER,
    PET_ACT_COUNT,
} pet_act_t;

/* One care meter's last top-up. `at == 0` means never, which reads as 60. */
typedef struct {
    pet_ms_t at;
    int value;
} pet_care_entry_t;

typedef struct {
    pet_care_entry_t care[PET_CARE_COUNT];
    /* 累计积分: only ever goes up, and nothing spends it. */
    int32_t total;
    /* Which creature is inside the egg, as an index into the shipped art. */
    uint8_t creature;
} pet_state_t;

/* How long the pet stays visibly delighted after a care act finishes. */
#define PET_PLEASED_TAIL_MS 18000

/* ---- meters and mood ---- */

int pet_meter(const pet_state_t *s, pet_care_t id, pet_ms_t now);
void pet_apply_care(pet_state_t *s, pet_care_t id, pet_ms_t now);
int pet_score(const pet_state_t *s, pet_ms_t now);
bool pet_is_night(int hour);
pet_mood_t pet_mood(const pet_state_t *s, pet_ms_t now, int hour, bool pleased);
/* The thinnest meter, so the pet can hint at what it would like, or -1. */
int pet_want(const pet_state_t *s, pet_ms_t now);

/* ---- levels ---- */

typedef struct {
    int lv;
    int at;
    const char *name;
    /* The shared incubation art, or NULL once the creature is revealed. */
    const char *art;
    const char *line;
} pet_level_t;

#define PET_LEVEL_COUNT 5
#define PET_REVEAL_LV 4

extern const pet_level_t PET_LEVELS[PET_LEVEL_COUNT];

int pet_level_index(int32_t total);
/* 0..100, how far through the current level. */
int pet_level_ratio(int32_t total);
/* Points still needed for the next level, or 0 at the top. */
int pet_level_need(int32_t total);

/* ---- acts ---- */

uint32_t pet_act_ms(pet_act_t act);
pet_act_t pet_act_for_care(pet_care_t id);
/* An unprompted action, weighted by mood. `roll` is any random number. */
pet_act_t pet_random_idle_act(pet_mood_t mood, uint32_t roll);
/* Milliseconds until the next unprompted action. */
uint32_t pet_next_idle_delay(pet_mood_t mood, uint32_t roll);

#ifdef __cplusplus
}
#endif
