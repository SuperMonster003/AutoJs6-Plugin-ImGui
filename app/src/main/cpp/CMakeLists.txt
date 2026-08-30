cmake_minimum_required(VERSION 3.22.1)

project(autojs6_imgui LANGUAGES CXX)

set(IMGUI_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/third_party/imgui")

add_library(
    autojs6_imgui
    SHARED
    ImGuiBridge.cpp
    "${IMGUI_ROOT}/imgui.cpp"
    "${IMGUI_ROOT}/imgui_demo.cpp"
    "${IMGUI_ROOT}/imgui_draw.cpp"
    "${IMGUI_ROOT}/imgui_tables.cpp"
    "${IMGUI_ROOT}/imgui_widgets.cpp"
    "${IMGUI_ROOT}/backends/imgui_impl_android.cpp"
    "${IMGUI_ROOT}/backends/imgui_impl_opengl3.cpp"
)

target_compile_features(autojs6_imgui PRIVATE cxx_std_17)
target_compile_options(
    autojs6_imgui
    PRIVATE
    -fvisibility=hidden
    -fvisibility-inlines-hidden
    -Wall
    -Wextra
)
set_source_files_properties(
    "${IMGUI_ROOT}/backends/imgui_impl_android.cpp"
    PROPERTIES COMPILE_OPTIONS "-Wno-unused-variable"
)
target_include_directories(
    autojs6_imgui
    PRIVATE
    "${IMGUI_ROOT}"
    "${IMGUI_ROOT}/backends"
)

find_library(ANDROID_LIBRARY android REQUIRED)
find_library(EGL_LIBRARY EGL REQUIRED)
find_library(GLES_LIBRARY GLESv3 REQUIRED)
find_library(JNIGRAPHICS_LIBRARY jnigraphics REQUIRED)
find_library(LOG_LIBRARY log REQUIRED)

target_link_libraries(
    autojs6_imgui
    PRIVATE
    "${ANDROID_LIBRARY}"
    "${EGL_LIBRARY}"
    "${GLES_LIBRARY}"
    "${JNIGRAPHICS_LIBRARY}"
    "${LOG_LIBRARY}"
)
