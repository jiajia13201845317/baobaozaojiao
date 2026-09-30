include("${CMAKE_CURRENT_LIST_DIR}/embedded_media.cmake")

idf_component_register(
    SRCS "main.c" "baby_ui.c" "baby_audio.c" "baby_store.c" "pet_state.c"
        "pet_lines.c" "catalog_data.c" "embedded_media.c" "board_display.c"
    INCLUDE_DIRS "."
    REQUIRES esp_iris esp-mosaico-bsp esp_mosaico_app_recovery
        esp_mosaico_gsp_bundle esp_mosaico_gsp_iris freertos nvs_flash
    PRIV_REQUIRES esp_timer esp-gsp esp_display_present esp_lcd
        esp_audio_simple_player gmf_io esp_codec_dev
    EMBED_FILES ${BABYBAO_EMBED_FILES})
include("${MOSAICO_UTILS_ROOT}/mosaico-tools/cmake/gsp_bundle.cmake")
mosaico_gsp_add_ui_bundle(${COMPONENT_LIB} "../ui/main.json")
