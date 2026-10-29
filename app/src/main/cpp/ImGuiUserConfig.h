// Dear ImGui build configuration of the plugin, included by imgui.h through IMGUI_USER_CONFIG (CMakeLists.txt).
#pragma once

// The plugin runs inside the AutoJs6 process, so a failed IM_ASSERT must never abort it. While a session runs in debug
// mode (createWindow({debug: true})) the failure is reported as a warning (console.warn and logcat) and Dear ImGui goes
// on as in a release build; otherwise the check is skipped without evaluating its expression.
extern bool gImGuiAssertReporting;
void ReportImGuiAssert(const char* expression, const char* file, int line);
#define IM_ASSERT(_EXPR) ((gImGuiAssertReporting && !(_EXPR)) ? ReportImGuiAssert(#_EXPR, __FILE__, __LINE__) : (void)0)
