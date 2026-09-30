/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The PC simulator's half of the board.
 *
 * The simulator draws the real scene and runs the real baby_ui.c, so
 * everything about how the creature moves and what it says can be watched and
 * corrected here rather than on a flashed board. What it cannot do is play a
 * 24 kHz MP3 out of an ES8311 or write to NVS, so those two are stood in for:
 * the clock runs off the host, the pet starts fresh every launch, and a track
 * "plays" for a plausible length of time so the lyric still scrolls and a
 * finished song still pays out.
 */

#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <time.h>

#include "baby_audio.h"
#include "baby_store.h"
#include "baby_ui.h"
#include "gsp_sim_bridge.h"

/* Long enough for every cue in the longest track to have its turn. */
#define FAKE_TRACK_MS 40000

static bool s_playing;
static bool s_finished;
static int64_t s_started_ms;
static uint8_t s_base_hour = 9;
static int64_t s_hour_at;

static int64_t host_ms(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (int64_t)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

pet_ms_t baby_now_ms(void)
{
    return PET_DAY_MS + host_ms();
}

void baby_store_load(pet_state_t *out)
{
    *out = (pet_state_t){0};
    s_hour_at = host_ms();
}

void baby_store_save(const pet_state_t *s)
{
    (void)s;
}

int baby_store_hour(void)
{
    return (int)((s_base_hour + (host_ms() - s_hour_at) / 3600000) % 24);
}

void baby_store_bump_hour(void)
{
    s_base_hour = (uint8_t)((baby_store_hour() + 1) % 24);
    s_hour_at = host_ms();
}

bool baby_audio_init(void)
{
    return false;
}

void baby_audio_play(uint8_t media)
{
    fprintf(stderr, "babybao: would play media %u\n", (unsigned)media);
    s_playing = true;
    s_finished = false;
    s_started_ms = host_ms();
}

void baby_audio_stop(void)
{
    s_playing = false;
    s_finished = false;
}

bool baby_audio_playing(void)
{
    if (s_playing && host_ms() - s_started_ms > FAKE_TRACK_MS) {
        s_playing = false;
        s_finished = true;
    }
    return s_playing;
}

uint32_t baby_audio_elapsed_ms(void)
{
    return s_playing ? (uint32_t)(host_ms() - s_started_ms) : 0;
}

bool baby_audio_take_finished(void)
{
    const bool done = s_finished;
    s_finished = false;
    return done;
}

/*
 * The one piece of the GSP API the simulator's RPC shim does not carry.
 *
 * On the board a position tween commits both axes on every step, which is why
 * the creature's lean and its compensating shift cannot come apart. Here they
 * are two tweens of the same length, so a frame can in principle show the
 * body a pixel ahead of its feet. That is a property of the simulator and not
 * of the firmware, and it is not worth weakening the device path to avoid.
 */
esp_gsp_err_t esp_gsp_component_animate_position_to(
    esp_gsp_handle_t gsp, gsp_component_key_t component, int32_t x, int32_t y,
    uint32_t duration_ms, esp_gsp_ease_t ease)
{
    const gsp_value_t to_x = { .type = GSP_VALUE_I32, .data = { .i32 = x } };
    const gsp_value_t to_y = { .type = GSP_VALUE_I32, .data = { .i32 = y } };
    const esp_gsp_err_t err = esp_gsp_component_animate_property_to(
        gsp, component, GSP_PROPERTY_KEY_X, &to_x, duration_ms, ease);
    if (err != ESP_GSP_OK) {
        return err;
    }
    return esp_gsp_component_animate_property_to(
        gsp, component, GSP_PROPERTY_KEY_Y, &to_y, duration_ms, ease);
}

esp_gsp_err_t gsp_bridge_app_init(esp_gsp_handle_t ui)
{
    return baby_ui_init(ui);
}

void gsp_bridge_app_deinit(esp_gsp_handle_t ui)
{
    baby_ui_deinit(ui);
}
