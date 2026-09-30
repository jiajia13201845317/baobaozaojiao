/* SPDX-License-Identifier: Apache-2.0 */

#include "pet_state.h"

/* Care is flavour, not pressure: the meters drift down slowly and stop at a
 * floor, so a pet is never sad, never sick, and never blocks anything. */
#define DRIFT_PER_DAY 12
#define FLOOR         35
#define FULL          100
#define UNTOUCHED     60
#define CARE_GAIN     30

const pet_level_t PET_LEVELS[PET_LEVEL_COUNT] = {
    { 1, 0,    "蛋仔", "egg-1", "里面好像有动静。" },
    { 2, 150,  "裂壳", "egg-2", "壳上裂了一道，它自己也吓一跳。" },
    { 3, 400,  "破壳", "egg-3", "出来啦！壳还顶在头上没舍得摘。" },
    { 4, 700,  "幼龙", NULL,    "今天也想跟着你到处跑。" },
    { 5, 1200, "闪耀", NULL,    "这一路都是你陪它长大的。" },
};

static int clampi(int v, int lo, int hi)
{
    return v < lo ? lo : (v > hi ? hi : v);
}

int pet_meter(const pet_state_t *s, pet_care_t id, pet_ms_t now)
{
    const pet_care_entry_t *e = &s->care[id];
    if (e->at <= 0) {
        return UNTOUCHED;
    }
    const pet_ms_t since = now > e->at ? now - e->at : 0;
    /* Rounded like the web app's Math.round on a fractional day count. */
    const int drop = (int)((since * DRIFT_PER_DAY + PET_DAY_MS / 2) / PET_DAY_MS);
    return clampi(e->value - drop, FLOOR, FULL);
}

void pet_apply_care(pet_state_t *s, pet_care_t id, pet_ms_t now)
{
    const int next = pet_meter(s, id, now) + CARE_GAIN;
    s->care[id].value = next > FULL ? FULL : next;
    s->care[id].at = now;
}

/*
 * Not the plain average, which hides the thing you most want to see: a pet
 * with an empty stomach and two full meters averages out to fine, and then
 * reads as fine, and "it says it is hungry while looking pleased" is the exact
 * contradiction that breaks the illusion. Three things can each hold the mood
 * down and the lowest wins.
 */
int pet_score(const pet_state_t *s, pet_ms_t now)
{
    int sum = 0;
    int worst = FULL;
    for (int i = 0; i < PET_CARE_COUNT; ++i) {
        const int v = pet_meter(s, (pet_care_t)i, now);
        sum += v;
        if (v < worst) {
            worst = v;
        }
    }
    const int food = pet_meter(s, PET_CARE_FOOD, now);
    /* (sum * 2 + count) / (count * 2) rounds the average to the nearest int. */
    int low = (sum * 2 + PET_CARE_COUNT) / (PET_CARE_COUNT * 2);
    if (food + 8 < low) {
        low = food + 8;
    }
    if (worst + 22 < low) {
        low = worst + 22;
    }
    return low;
}

bool pet_is_night(int hour)
{
    return hour >= 21 || hour < 7;
}

pet_mood_t pet_mood(const pet_state_t *s, pet_ms_t now, int hour, bool pleased)
{
    if (pleased) {
        return PET_MOOD_HAPPY;
    }
    const int score = pet_score(s, now);
    if (score >= 85) {
        return PET_MOOD_HAPPY;
    }
    if (pet_is_night(hour)) {
        return PET_MOOD_SLEEPY;
    }
    if (score >= 58) {
        return PET_MOOD_CONTENT;
    }
    if (score >= 46) {
        return PET_MOOD_FLAT;
    }
    return PET_MOOD_DOWN;
}

int pet_want(const pet_state_t *s, pet_ms_t now)
{
    int worst = -1;
    int low = FULL + 1;
    for (int i = 0; i < PET_CARE_COUNT; ++i) {
        const int v = pet_meter(s, (pet_care_t)i, now);
        if (v < low) {
            low = v;
            worst = i;
        }
    }
    return low < 60 ? worst : -1;
}

int pet_level_index(int32_t total)
{
    int index = 0;
    for (int i = 0; i < PET_LEVEL_COUNT; ++i) {
        if (total >= PET_LEVELS[i].at) {
            index = i;
        }
    }
    return index;
}

int pet_level_ratio(int32_t total)
{
    const int i = pet_level_index(total);
    if (i + 1 >= PET_LEVEL_COUNT) {
        return 100;
    }
    const int span = PET_LEVELS[i + 1].at - PET_LEVELS[i].at;
    const int into = (int)total - PET_LEVELS[i].at;
    return clampi(span > 0 ? into * 100 / span : 100, 0, 100);
}

int pet_level_need(int32_t total)
{
    const int i = pet_level_index(total);
    if (i + 1 >= PET_LEVEL_COUNT) {
        return 0;
    }
    const int need = PET_LEVELS[i + 1].at - (int)total;
    return need > 0 ? need : 0;
}

/* Kept in one table so the animation and the timer can never disagree. */
static const uint32_t ACT_MS[PET_ACT_COUNT] = {
    [PET_ACT_IDLE] = 0,
    [PET_ACT_STRETCH] = 1400,
    [PET_ACT_HOP] = 900,
    [PET_ACT_WIGGLE] = 1100,
    [PET_ACT_PEEK] = 1600,
    [PET_ACT_YAWN] = 2000,
    /* Long enough for the whole sequence: the food is brought up, bitten
     * twice with chewing in between, and swallowed. */
    [PET_ACT_EAT] = 3000,
    [PET_ACT_PLAY] = 2000,
    [PET_ACT_BATH] = 2400,
    [PET_ACT_POKE] = 700,
    [PET_ACT_CHEER] = 2800,
};

uint32_t pet_act_ms(pet_act_t act)
{
    return act >= 0 && act < PET_ACT_COUNT ? ACT_MS[act] : 0;
}

pet_act_t pet_act_for_care(pet_care_t id)
{
    switch (id) {
    case PET_CARE_FOOD: return PET_ACT_EAT;
    case PET_CARE_PLAY: return PET_ACT_PLAY;
    case PET_CARE_BATH: return PET_ACT_BATH;
    default: return PET_ACT_IDLE;
    }
}

/* A down pet does not hop and a sleepy one mostly yawns — the mix is what
 * communicates the state, more than any single frame does. */
static const pet_act_t IDLE_ACTS[PET_MOOD_COUNT][6] = {
    /* Hop twice as often as anything else: it is the pose that reads as
     * delighted from across a room, which is how a toddler sees the screen. */
    [PET_MOOD_HAPPY] = { PET_ACT_HOP, PET_ACT_WIGGLE, PET_ACT_HOP,
                         PET_ACT_STRETCH, PET_ACT_PEEK },
    [PET_MOOD_CONTENT] = { PET_ACT_WIGGLE, PET_ACT_STRETCH, PET_ACT_PEEK,
                           PET_ACT_HOP },
    [PET_MOOD_FLAT] = { PET_ACT_PEEK, PET_ACT_STRETCH, PET_ACT_WIGGLE },
    [PET_MOOD_DOWN] = { PET_ACT_PEEK, PET_ACT_STRETCH },
    [PET_MOOD_SLEEPY] = { PET_ACT_YAWN, PET_ACT_YAWN, PET_ACT_STRETCH,
                          PET_ACT_PEEK },
};

static const uint8_t IDLE_ACT_COUNT[PET_MOOD_COUNT] = {
    [PET_MOOD_HAPPY] = 5, [PET_MOOD_CONTENT] = 4, [PET_MOOD_FLAT] = 3,
    [PET_MOOD_DOWN] = 2, [PET_MOOD_SLEEPY] = 4,
};

pet_act_t pet_random_idle_act(pet_mood_t mood, uint32_t roll)
{
    if (mood < 0 || mood >= PET_MOOD_COUNT) {
        mood = PET_MOOD_CONTENT;
    }
    return IDLE_ACTS[mood][roll % IDLE_ACT_COUNT[mood]];
}

/*
 * Randomised within a window so it never falls into a rhythm the eye can
 * predict, and slower when the pet is flat or asleep, because a listless pet
 * that fidgets constantly reads as broken rather than as listless.
 */
uint32_t pet_next_idle_delay(pet_mood_t mood, uint32_t roll)
{
    uint32_t min = 6500, max = 12000;
    if (mood == PET_MOOD_HAPPY) {
        min = 4000;
        max = 8000;
    } else if (mood == PET_MOOD_SLEEPY || mood == PET_MOOD_DOWN) {
        min = 9000;
        max = 16000;
    }
    return min + roll % (max - min);
}
