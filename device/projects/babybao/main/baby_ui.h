/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The application: three pages, one pet, one voice.
 *
 * There is one of everything on this board — one screen, one creature, one
 * speaker — so this is a singleton rather than a handle the caller passes
 * around. The same two calls serve the firmware and the PC simulator.
 */
#pragma once

#include "esp_gsp.h"

#ifdef __cplusplus
extern "C" {
#endif

esp_err_t baby_ui_init(esp_gsp_handle_t ui);
void baby_ui_deinit(esp_gsp_handle_t ui);

#ifdef __cplusplus
}
#endif
