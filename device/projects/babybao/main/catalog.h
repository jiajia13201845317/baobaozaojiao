/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * What the board can play. The tables live in catalog_data.c, which is
 * generated from the encoded media by tools/build_gen.py so the indices here
 * always match the order the MP3s are embedded in.
 */
#pragma once

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define SONG_COUNT   12
#define ANIMAL_COUNT 12

typedef struct {
    uint32_t at_ms;
    const char *text;
} song_cue_t;

typedef struct {
    const char *id;
    const char *title;
    /* Index into the embedded media array. */
    uint8_t media;
    const song_cue_t *cues;
    uint8_t cue_count;
} song_t;

typedef struct {
    const char *id;
    const char *name;
    /* Index within the cries, which follow the songs in the media array. */
    uint8_t media;
} animal_t;

extern const song_t SONGS[SONG_COUNT];
extern const animal_t ANIMALS[ANIMAL_COUNT];

#ifdef __cplusplus
}
#endif
