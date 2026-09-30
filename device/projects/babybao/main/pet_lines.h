/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The line under the pet, and the names beside it.
 *
 * One rule, carried over from the web app: a line may only describe something
 * that is actually on the screen while it is showing. The web version has a
 * mouse, so several of its lines are about the pet tracking a pointer around
 * the card. A touch panel has no hover — there is nothing to track between
 * taps — so those lines are not here. What is left points at a pose this
 * firmware actually plays, a particle it actually draws, or the mood's own
 * render. If you add a line, name what it is describing first.
 */
#pragma once

#include "pet_state.h"

#ifdef __cplusplus
extern "C" {
#endif

const char *pet_mood_name(pet_mood_t mood);
const char *pet_care_name(pet_care_t id);
const char *pet_care_meter_name(pet_care_t id);

/*
 * `seed` picks between the lines that fit. The caller rolls it once per
 * caption change rather than per repaint, so a line stays put while it is on
 * screen; it is random rather than a counter because two boards switched on
 * together should not narrate the same sequence.
 */
const char *pet_line(pet_act_t act, pet_mood_t mood, int want, uint32_t seed,
                     const char *level_line, int level_up_to, char *scratch,
                     size_t scratch_len);

#ifdef __cplusplus
}
#endif
