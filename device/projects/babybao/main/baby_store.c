/* SPDX-License-Identifier: Apache-2.0 */

#include "baby_store.h"

#include "esp_log.h"
#include "esp_timer.h"
#include "nvs.h"

static const char *TAG = "baby_store";

#define NS      "babybao"
#define KEY     "pet"
#define MAGIC   0x4231 /* 'B1' */
#define VERSION 1

/* One day, so the clock starts well clear of zero and the drift arithmetic in
 * pet_meter never sees a negative interval. */
#define CLOCK_BASE PET_DAY_MS

/* A fresh board opens in the morning rather than at midnight, so the first
 * thing a child sees is an awake pet. */
#define DEFAULT_HOUR 9

/*
 * The saved form is not pet_state_t.
 *
 * pet_state_t holds absolute timestamps, and this board has no clock that
 * survives a power cycle, so a saved timestamp would be meaningless on the
 * next boot. What is saved instead is each meter's value at the moment of
 * saving, which the next boot treats as freshly topped up.
 *
 * The consequence is deliberate: the meters do not drift while the board is
 * off. A toy that has been in a drawer for a week should not greet the child
 * with a starving pet, and since the device cannot know how long it was in
 * there, pretending otherwise would be a guess dressed up as a fact.
 */
typedef struct {
    uint16_t magic;
    uint8_t version;
    uint8_t creature;
    int32_t total;
    /* 0 means never topped up; anything else is a meter reading. */
    uint8_t meter[PET_CARE_COUNT];
    uint8_t hour;
} record_t;

static uint8_t s_base_hour = DEFAULT_HOUR;
static pet_ms_t s_base_at;

pet_ms_t baby_now_ms(void)
{
    return CLOCK_BASE + esp_timer_get_time() / 1000;
}

static void write_record(const record_t *rec)
{
    nvs_handle_t h;
    esp_err_t err = nvs_open(NS, NVS_READWRITE, &h);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "nvs_open failed (0x%x); this session will not persist",
                 err);
        return;
    }
    err = nvs_set_blob(h, KEY, rec, sizeof(*rec));
    if (err == ESP_OK) {
        err = nvs_commit(h);
    }
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "save failed (0x%x)", err);
    }
    nvs_close(h);
}

void baby_store_load(pet_state_t *out)
{
    *out = (pet_state_t){0};
    s_base_hour = DEFAULT_HOUR;
    s_base_at = baby_now_ms();

    nvs_handle_t h;
    if (nvs_open(NS, NVS_READONLY, &h) != ESP_OK) {
        ESP_LOGI(TAG, "no saved pet; starting a new one");
        return;
    }
    record_t rec;
    size_t len = sizeof(rec);
    const esp_err_t err = nvs_get_blob(h, KEY, &rec, &len);
    nvs_close(h);

    /* A short read, the wrong magic or an older layout all mean the same
     * thing to a toy: start over rather than show the child a pet built out
     * of whatever bytes happened to be there. */
    if (err != ESP_OK || len != sizeof(rec) || rec.magic != MAGIC ||
        rec.version != VERSION) {
        ESP_LOGI(TAG, "no usable saved pet (0x%x); starting a new one", err);
        return;
    }

    out->total = rec.total;
    out->creature = rec.creature;
    for (int i = 0; i < PET_CARE_COUNT; ++i) {
        if (rec.meter[i] > 0) {
            out->care[i].value = rec.meter[i];
            out->care[i].at = s_base_at;
        }
    }
    if (rec.hour < 24) {
        s_base_hour = rec.hour;
    }
    ESP_LOGI(TAG, "loaded pet: %d points, hour %u", (int)out->total,
             s_base_hour);
}

void baby_store_save(const pet_state_t *s)
{
    const pet_ms_t now = baby_now_ms();
    record_t rec = {
        .magic = MAGIC,
        .version = VERSION,
        .creature = s->creature,
        .total = s->total,
        .hour = (uint8_t)baby_store_hour(),
    };
    for (int i = 0; i < PET_CARE_COUNT; ++i) {
        rec.meter[i] = s->care[i].at > 0
                           ? (uint8_t)pet_meter(s, (pet_care_t)i, now)
                           : 0;
    }
    write_record(&rec);
}

int baby_store_hour(void)
{
    const int64_t hours = (baby_now_ms() - s_base_at) / 3600000;
    return (int)((s_base_hour + hours) % 24);
}

void baby_store_bump_hour(void)
{
    s_base_hour = (uint8_t)((baby_store_hour() + 1) % 24);
    s_base_at = baby_now_ms();
}
