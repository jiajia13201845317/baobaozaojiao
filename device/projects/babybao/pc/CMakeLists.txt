cmake_minimum_required(VERSION 3.20)
project(babybao_backend LANGUAGES C)

if(NOT ESP_GSP_COMPONENT_DIR AND DEFINED ENV{ESP_GSP_COMPONENT_DIR})
    set(ESP_GSP_COMPONENT_DIR "$ENV{ESP_GSP_COMPONENT_DIR}")
endif()
if(NOT ESP_GSP_COMPONENT_DIR)
    foreach(candidate IN ITEMS
            "${CMAKE_CURRENT_LIST_DIR}/../managed_components/espressif__esp-gsp")
        get_filename_component(candidate "${candidate}" ABSOLUTE)
        if(EXISTS "${candidate}/tools/sim_bridge/CMakeLists.txt")
            set(ESP_GSP_COMPONENT_DIR "${candidate}")
            break()
        endif()
    endforeach()
endif()
if(NOT EXISTS "${ESP_GSP_COMPONENT_DIR}/tools/sim_bridge/CMakeLists.txt")
    message(FATAL_ERROR
        "Install espressif/esp-gsp first, or set ESP_GSP_COMPONENT_DIR")
endif()

add_subdirectory("${ESP_GSP_COMPONENT_DIR}/tools/sim_bridge" sim_bridge)

# The behaviour layer, unchanged from what the board runs. The two files the
# simulator cannot have — the codec and NVS — are stood in for by
# platform_pc.c.
gsp_add_backend(babybao_backend
    SOURCES
        ../main/baby_ui.c
        ../main/pet_state.c
        ../main/pet_lines.c
        ../main/catalog_data.c
        platform_pc.c
    INCLUDE_DIRECTORIES ../main
    SCENES ../ui/main.json)
