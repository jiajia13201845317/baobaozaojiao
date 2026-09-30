/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * One voice, and a way to ask what it is doing.
 *
 * The board plays exactly one thing at a time: a nursery rhyme or an animal's
 * cry. That is not a limitation to work around, it is the product — two
 * sounds at once out of a single small speaker is noise, and a child who taps
 * a second button means "that one instead".
 *
 * The UI never gets called back from the audio task. It asks these questions
 * from its own tick instead, which keeps every GSP call on one thread without
 * a lock.
 */
#pragma once

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Brings up the codec and the decoder. Returns false if the board has no
 * working speaker, in which case the rest of these calls do nothing and the
 * app still runs — a silent pet is better than no pet. */
bool baby_audio_init(void);

/* Starts one embedded track, replacing whatever was playing. The index is the
 * position in the embedded media array, which catalog.h's `media` fields
 * point into. */
void baby_audio_play(uint8_t media);

void baby_audio_stop(void);

/* True from the moment play is asked for until the track ends or is stopped. */
bool baby_audio_playing(void);

/* How far into the current track, for scrolling the lyric. Measured from when
 * play was asked for, not from the decoder, so it drifts by however long the
 * pipeline takes to spin up — tens of milliseconds against lyric lines that
 * are seconds apart. */
uint32_t baby_audio_elapsed_ms(void);

/*
 * True once per track that reached its end on its own, and false after.
 *
 * A song finishing is worth points and a cleared lyric; a song the child
 * stopped is not. Consuming the flag rather than reading it keeps that
 * distinction without the UI having to remember what it last saw.
 */
bool baby_audio_take_finished(void);

#ifdef __cplusplus
}
#endif
