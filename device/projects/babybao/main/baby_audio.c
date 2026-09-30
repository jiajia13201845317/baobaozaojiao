/* SPDX-License-Identifier: Apache-2.0 */

#include "baby_audio.h"

#include <stdatomic.h>
#include <stdio.h>
#include <string.h>

#include "bsp/esp_mosaico.h"
#include "embedded_media.h"
#include "esp_audio_simple_player.h"
#include "esp_audio_simple_player_advance.h"
#include "esp_codec_dev.h"
#include "esp_gmf_io_embed_flash.h"
#include "esp_gmf_pipeline.h"
#include "esp_log.h"
#include "esp_timer.h"

static const char *TAG = "baby_audio";

/* Loud enough to carry across a room, quiet enough at arm's length: this is a
 * toy a child holds. */
#define VOLUME 68

static esp_codec_dev_handle_t s_speaker;
static esp_asp_handle_t s_player;

/*
 * The decoder runs on its own task and the UI polls from the render task, so
 * these three are the whole boundary between them, and each is a single word
 * written by one side.
 *
 * `s_playing` is set by the UI when it asks for a track and cleared by
 * whichever side gets there first — the decoder reaching the end, or the UI
 * stopping it. `s_finished` is set only by the decoder, and only on a natural
 * end, and the UI clears it by consuming it.
 */
static atomic_bool s_playing;
static atomic_bool s_finished;
static atomic_int_least64_t s_started_us;

static int write_out(uint8_t *data, int size, void *ctx)
{
    esp_codec_dev_handle_t dev = (esp_codec_dev_handle_t)ctx;
    if (dev && data && size > 0) {
        (void)esp_codec_dev_write(dev, data, size);
    }
    return 0;
}

static void reopen_codec(const esp_asp_music_info_t *info)
{
    if (!s_speaker) {
        return;
    }
    /*
     * The tracks are not all encoded at one rate — the songs are 24 kHz mono
     * and the cries keep whatever the source had — so the codec is retuned to
     * each one as the decoder reports it. Skipping this plays a 24 kHz track
     * through a 48 kHz codec, which is the chipmunk everybody has shipped
     * once.
     */
    (void)esp_codec_dev_close(s_speaker);
    esp_codec_dev_sample_info_t sample = {
        .sample_rate = info->sample_rate,
        .bits_per_sample = info->bits,
        .channel = info->channels,
        .channel_mask = 0,
    };
    if (esp_codec_dev_open(s_speaker, &sample) != ESP_CODEC_DEV_OK) {
        ESP_LOGE(TAG, "reopen speaker failed at %d Hz", (int)info->sample_rate);
        return;
    }
    (void)esp_codec_dev_set_out_vol(s_speaker, VOLUME);
}

static int on_event(esp_asp_event_pkt_t *event, void *ctx)
{
    (void)ctx;
    if (event->type == ESP_ASP_EVENT_TYPE_MUSIC_INFO) {
        esp_asp_music_info_t info = {0};
        memcpy(&info, event->payload, event->payload_size);
        reopen_codec(&info);
        return 0;
    }
    if (event->type != ESP_ASP_EVENT_TYPE_STATE) {
        return 0;
    }
    esp_asp_state_t state = 0;
    memcpy(&state, event->payload, event->payload_size);
    if (state == ESP_ASP_STATE_FINISHED) {
        atomic_store(&s_finished, true);
        atomic_store(&s_playing, false);
    } else if (state == ESP_ASP_STATE_STOPPED ||
               state == ESP_ASP_STATE_ERROR) {
        /* Not finished: a track the child cut short, or one that would not
         * decode. Neither earns the reward a completed song does. */
        atomic_store(&s_playing, false);
    }
    return 0;
}

/* Called before each run. Handing over the whole table every time costs
 * nothing and means the index in the URI is always the index in this array. */
static int bind_media(esp_asp_handle_t handle, void *ctx)
{
    (void)ctx;
    esp_gmf_pipeline_handle_t pipe = NULL;
    int ret = esp_audio_simple_player_get_pipeline(handle, &pipe);
    if (ret != ESP_GMF_ERR_OK || pipe == NULL) {
        return ret;
    }
    esp_gmf_io_handle_t flash = NULL;
    ret = esp_gmf_pipeline_get_in(pipe, &flash);
    if (ret != ESP_GMF_ERR_OK || flash == NULL) {
        return ret;
    }
    embed_item_info_t items[BABY_MEDIA_COUNT];
    for (int i = 0; i < BABY_MEDIA_COUNT; ++i) {
        items[i].address = BABY_MEDIA[i].start;
        items[i].size = (int)(BABY_MEDIA[i].end - BABY_MEDIA[i].start);
    }
    return esp_gmf_io_embed_flash_set_context(flash, items,
                                              BABY_MEDIA_COUNT);
}

bool baby_audio_init(void)
{
    s_speaker = bsp_audio_codec_speaker_init();
    if (!s_speaker) {
        ESP_LOGE(TAG, "no speaker; the app will run silently");
        return false;
    }
    esp_codec_dev_sample_info_t sample = {
        .sample_rate = BSP_AUDIO_DEFAULT_SAMPLE_RATE,
        .bits_per_sample = BSP_AUDIO_DEFAULT_BITS_PER_SAMPLE,
        .channel = BSP_AUDIO_DEFAULT_CHANNELS,
        .channel_mask = 0,
    };
    if (esp_codec_dev_open(s_speaker, &sample) != ESP_CODEC_DEV_OK) {
        ESP_LOGE(TAG, "speaker open failed; the app will run silently");
        s_speaker = NULL;
        return false;
    }
    (void)esp_codec_dev_set_out_vol(s_speaker, VOLUME);

    esp_asp_cfg_t cfg = {
        .out.cb = write_out,
        .out.user_ctx = s_speaker,
        .task_prio = 5,
        .task_stack = 4096,
        .task_core = 0,
        /* The decoder's stack goes to PSRAM: internal RAM is wanted for the
         * framebuffers and the image decode. */
        .task_stack_in_ext = true,
        .prev = bind_media,
    };
    if (esp_audio_simple_player_new(&cfg, &s_player) != ESP_GMF_ERR_OK) {
        ESP_LOGE(TAG, "player alloc failed; the app will run silently");
        s_player = NULL;
        return false;
    }
    if (esp_audio_simple_player_set_event(s_player, on_event, NULL) !=
        ESP_GMF_ERR_OK) {
        ESP_LOGW(TAG, "no player events; tracks will not report finishing");
    }
    return true;
}

void baby_audio_play(uint8_t media)
{
    if (!s_player || media >= BABY_MEDIA_COUNT) {
        return;
    }
    baby_audio_stop();

    /* The name after the index is decoration — the embed IO reads the digits
     * before the underscore and ignores the rest. */
    char uri[48];
    snprintf(uri, sizeof(uri), "embed://baby/%u_track.mp3", (unsigned)media);

    atomic_store(&s_finished, false);
    atomic_store(&s_started_us, esp_timer_get_time());
    atomic_store(&s_playing, true);
    if (esp_audio_simple_player_run(s_player, uri, NULL) != ESP_GMF_ERR_OK) {
        ESP_LOGE(TAG, "play %s failed", uri);
        atomic_store(&s_playing, false);
    }
}

void baby_audio_stop(void)
{
    if (!s_player) {
        return;
    }
    if (atomic_exchange(&s_playing, false)) {
        (void)esp_audio_simple_player_stop(s_player);
    }
    atomic_store(&s_finished, false);
}

bool baby_audio_playing(void)
{
    return atomic_load(&s_playing);
}

uint32_t baby_audio_elapsed_ms(void)
{
    const int64_t started = atomic_load(&s_started_us);
    return started > 0 ? (uint32_t)((esp_timer_get_time() - started) / 1000) : 0;
}

bool baby_audio_take_finished(void)
{
    return atomic_exchange(&s_finished, false);
}
