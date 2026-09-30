/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Where the pet lives between power cycles.
 *
 * The web app keeps this in localStorage; on the board it is NVS. Two things
 * are saved: the creature's state, and what the clock reads. The clock matters
 * because the mood depends on the hour — a board with no network and no RTC
 * battery wakes up believing it is midnight, and a pet that is asleep every
 * time you switch it on is a broken toy.
 */
#pragma once

#include "pet_state.h"

#ifdef __cplusplus
extern "C" {
#endif

/*
 * The app's clock, in milliseconds.
 *
 * Monotonic since boot, offset so it is never zero — pet_state reads `at == 0`
 * as "this meter was never topped up".
 */
pet_ms_t baby_now_ms(void);

/* Loads the saved pet, or a fresh one with every meter untouched. Never
 * fails in a way the caller has to handle: a missing or corrupt record just
 * means a new pet. */
void baby_store_load(pet_state_t *out);

/* Writes the pet back. Called after care and after points change, not on a
 * timer — the state only moves when the child does something. A failed write
 * costs this session's progress and nothing else, so it is logged, not
 * returned: there is no useful way for the UI to react. */
void baby_store_save(const pet_state_t *s);

/*
 * The wall clock, as an hour of the day.
 *
 * Nothing on this board knows the real time, so the hour is a number the user
 * owns: it starts at the saved value, advances as the board stays on, and can
 * be nudged forward by tapping the points chip. That is honest about what the
 * device knows, and it is also the only way a child can reach the sleepy pet
 * in the afternoon, which is the most charming thing the toy does.
 */
int baby_store_hour(void);
/* Moves the clock on by one hour. The new hour reaches NVS with the next
 * baby_store_save, which the caller does anyway after any user action. */
void baby_store_bump_hour(void);

#ifdef __cplusplus
}
#endif
