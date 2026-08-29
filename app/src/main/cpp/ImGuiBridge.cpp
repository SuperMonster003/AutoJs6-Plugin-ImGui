#include <jni.h>

#include <EGL/egl.h>
#include <GLES3/gl3.h>
#include <android/asset_manager_jni.h>
#include <android/log.h>
#include <android/native_window_jni.h>
#include <unistd.h>

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <limits>
#include <string>
#include <string_view>
#include <vector>

#include "imgui.h"
#include "imgui_impl_android.h"
#include "imgui_impl_opengl3.h"

namespace {

constexpr char kLogTag[] = "AutoJs6-ImGui";
constexpr int kInputTextMaxBytes = 64 * 1024;
constexpr int kComboMaxItems = 512;

#define LOG_ERROR(...) __android_log_print(ANDROID_LOG_ERROR, kLogTag, __VA_ARGS__)
#define LOG_INFO(...) __android_log_print(ANDROID_LOG_INFO, kLogTag, __VA_ARGS__)

struct RendererState {
    EGLDisplay display = EGL_NO_DISPLAY;
    EGLSurface surface = EGL_NO_SURFACE;
    EGLContext context = EGL_NO_CONTEXT;
    ANativeWindow* window = nullptr;
    bool platformBackendInitialized = false;
    bool rendererBackendInitialized = false;
    bool ready = false;
    bool frameActive = false;
};

RendererState gState;

void ThrowJavaException(JNIEnv* env, const char* className, const char* message) {
    jclass exceptionClass = env->FindClass(className);
    if (exceptionClass != nullptr) {
        env->ThrowNew(exceptionClass, message);
        env->DeleteLocalRef(exceptionClass);
    }
}

void ThrowIllegalArgument(JNIEnv* env, const char* message) {
    ThrowJavaException(env, "java/lang/IllegalArgumentException", message);
}

void ThrowIllegalState(JNIEnv* env, const char* message) {
    ThrowJavaException(env, "java/lang/IllegalStateException", message);
}

std::string JStringToUtf8(JNIEnv* env, jstring value) {
    if (value == nullptr) {
        return {};
    }
    const jsize length = env->GetStringLength(value);
    const jchar* chars = env->GetStringChars(value, nullptr);
    if (chars == nullptr) {
        return {};
    }

    std::string result;
    result.reserve(static_cast<size_t>(length) * 3U);
    for (jsize index = 0; index < length; ++index) {
        uint32_t codePoint = chars[index];
        if (codePoint >= 0xD800U && codePoint <= 0xDBFFU && index + 1 < length) {
            const uint32_t low = chars[index + 1];
            if (low >= 0xDC00U && low <= 0xDFFFU) {
                codePoint = 0x10000U + ((codePoint - 0xD800U) << 10U) + (low - 0xDC00U);
                ++index;
            }
        }

        if (codePoint <= 0x7FU) {
            result.push_back(static_cast<char>(codePoint));
        } else if (codePoint <= 0x7FFU) {
            result.push_back(static_cast<char>(0xC0U | (codePoint >> 6U)));
            result.push_back(static_cast<char>(0x80U | (codePoint & 0x3FU)));
        } else if (codePoint <= 0xFFFFU) {
            result.push_back(static_cast<char>(0xE0U | (codePoint >> 12U)));
            result.push_back(static_cast<char>(0x80U | ((codePoint >> 6U) & 0x3FU)));
            result.push_back(static_cast<char>(0x80U | (codePoint & 0x3FU)));
        } else {
            result.push_back(static_cast<char>(0xF0U | (codePoint >> 18U)));
            result.push_back(static_cast<char>(0x80U | ((codePoint >> 12U) & 0x3FU)));
            result.push_back(static_cast<char>(0x80U | ((codePoint >> 6U) & 0x3FU)));
            result.push_back(static_cast<char>(0x80U | (codePoint & 0x3FU)));
        }
    }
    env->ReleaseStringChars(value, chars);
    return result;
}

jstring Utf8ToJString(JNIEnv* env, std::string_view value) {
    std::vector<jchar> utf16;
    utf16.reserve(value.size());
    size_t index = 0;
    while (index < value.size()) {
        const uint8_t first = static_cast<uint8_t>(value[index]);
        uint32_t codePoint = 0xFFFDU;
        size_t consumed = 1;
        if (first < 0x80U) {
            codePoint = first;
        } else if ((first & 0xE0U) == 0xC0U && index + 1 < value.size()) {
            const uint8_t second = static_cast<uint8_t>(value[index + 1]);
            if ((second & 0xC0U) == 0x80U) {
                codePoint = ((first & 0x1FU) << 6U) | (second & 0x3FU);
                consumed = 2;
            }
        } else if ((first & 0xF0U) == 0xE0U && index + 2 < value.size()) {
            const uint8_t second = static_cast<uint8_t>(value[index + 1]);
            const uint8_t third = static_cast<uint8_t>(value[index + 2]);
            if ((second & 0xC0U) == 0x80U && (third & 0xC0U) == 0x80U) {
                codePoint = ((first & 0x0FU) << 12U) | ((second & 0x3FU) << 6U) | (third & 0x3FU);
                consumed = 3;
            }
        } else if ((first & 0xF8U) == 0xF0U && index + 3 < value.size()) {
            const uint8_t second = static_cast<uint8_t>(value[index + 1]);
            const uint8_t third = static_cast<uint8_t>(value[index + 2]);
            const uint8_t fourth = static_cast<uint8_t>(value[index + 3]);
            if ((second & 0xC0U) == 0x80U &&
                (third & 0xC0U) == 0x80U &&
                (fourth & 0xC0U) == 0x80U
            ) {
                codePoint = ((first & 0x07U) << 18U) |
                    ((second & 0x3FU) << 12U) |
                    ((third & 0x3FU) << 6U) |
                    (fourth & 0x3FU);
                consumed = 4;
            }
        }

        index += consumed;
        if (codePoint <= 0xFFFFU) {
            utf16.push_back(static_cast<jchar>(codePoint));
        } else if (codePoint <= 0x10FFFFU) {
            codePoint -= 0x10000U;
            utf16.push_back(static_cast<jchar>(0xD800U + (codePoint >> 10U)));
            utf16.push_back(static_cast<jchar>(0xDC00U + (codePoint & 0x3FFU)));
        } else {
            utf16.push_back(static_cast<jchar>(0xFFFDU));
        }
    }
    return env->NewString(utf16.data(), static_cast<jsize>(utf16.size()));
}

bool EnsureCurrent() {
    if (!gState.ready ||
        gState.display == EGL_NO_DISPLAY ||
        gState.surface == EGL_NO_SURFACE ||
        gState.context == EGL_NO_CONTEXT
    ) {
        return false;
    }
    if (eglGetCurrentDisplay() == gState.display &&
        eglGetCurrentContext() == gState.context &&
        eglGetCurrentSurface(EGL_DRAW) == gState.surface
    ) {
        return true;
    }
    if (eglMakeCurrent(gState.display, gState.surface, gState.surface, gState.context) != EGL_TRUE) {
        LOG_ERROR("eglMakeCurrent failed: 0x%x", eglGetError());
        return false;
    }
    return true;
}

void ReleaseCurrent() {
    if (gState.display != EGL_NO_DISPLAY) {
        eglMakeCurrent(gState.display, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
    }
}

void ShutdownRenderer() {
    gState.ready = false;
    gState.frameActive = false;

    if (gState.display != EGL_NO_DISPLAY &&
        gState.surface != EGL_NO_SURFACE &&
        gState.context != EGL_NO_CONTEXT
    ) {
        eglMakeCurrent(gState.display, gState.surface, gState.surface, gState.context);
    }

    if (ImGui::GetCurrentContext() != nullptr) {
        if (gState.rendererBackendInitialized) {
            ImGui_ImplOpenGL3_Shutdown();
        }
        if (gState.platformBackendInitialized) {
            ImGui_ImplAndroid_Shutdown();
        }
        ImGui::DestroyContext();
    }
    gState.rendererBackendInitialized = false;
    gState.platformBackendInitialized = false;

    if (gState.display != EGL_NO_DISPLAY) {
        eglMakeCurrent(gState.display, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
        if (gState.context != EGL_NO_CONTEXT) {
            eglDestroyContext(gState.display, gState.context);
        }
        if (gState.surface != EGL_NO_SURFACE) {
            eglDestroySurface(gState.display, gState.surface);
        }
        eglTerminate(gState.display);
    }
    if (gState.window != nullptr) {
        ANativeWindow_release(gState.window);
    }
    gState = RendererState{};
}

bool InitializeEgl(ANativeWindow* window) {
    gState.display = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    if (gState.display == EGL_NO_DISPLAY || eglInitialize(gState.display, nullptr, nullptr) != EGL_TRUE) {
        LOG_ERROR("eglInitialize failed: 0x%x", eglGetError());
        return false;
    }
    if (eglBindAPI(EGL_OPENGL_ES_API) != EGL_TRUE) {
        LOG_ERROR("eglBindAPI failed: 0x%x", eglGetError());
        return false;
    }

    constexpr EGLint configAttributes[] = {
        EGL_SURFACE_TYPE, EGL_WINDOW_BIT,
        EGL_RENDERABLE_TYPE, EGL_OPENGL_ES3_BIT,
        EGL_RED_SIZE, 8,
        EGL_GREEN_SIZE, 8,
        EGL_BLUE_SIZE, 8,
        EGL_ALPHA_SIZE, 8,
        EGL_DEPTH_SIZE, 0,
        EGL_STENCIL_SIZE, 8,
        EGL_NONE,
    };
    EGLConfig config = nullptr;
    EGLint configCount = 0;
    if (eglChooseConfig(gState.display, configAttributes, &config, 1, &configCount) != EGL_TRUE ||
        configCount < 1
    ) {
        LOG_ERROR("eglChooseConfig failed: 0x%x", eglGetError());
        return false;
    }

    EGLint nativeVisualId = 0;
    eglGetConfigAttrib(gState.display, config, EGL_NATIVE_VISUAL_ID, &nativeVisualId);
    ANativeWindow_setBuffersGeometry(window, 0, 0, nativeVisualId);

    gState.surface = eglCreateWindowSurface(gState.display, config, window, nullptr);
    if (gState.surface == EGL_NO_SURFACE) {
        LOG_ERROR("eglCreateWindowSurface failed: 0x%x", eglGetError());
        return false;
    }

    constexpr EGLint contextAttributes[] = {
        EGL_CONTEXT_CLIENT_VERSION, 3,
        EGL_NONE,
    };
    gState.context = eglCreateContext(gState.display, config, EGL_NO_CONTEXT, contextAttributes);
    if (gState.context == EGL_NO_CONTEXT) {
        LOG_ERROR("eglCreateContext failed: 0x%x", eglGetError());
        return false;
    }
    if (eglMakeCurrent(gState.display, gState.surface, gState.surface, gState.context) != EGL_TRUE) {
        LOG_ERROR("Initial eglMakeCurrent failed: 0x%x", eglGetError());
        return false;
    }
    return true;
}

const char* SelectFontPath(const std::string& requestedPath) {
    if (!requestedPath.empty() && access(requestedPath.c_str(), R_OK) == 0) {
        return requestedPath.c_str();
    }
    static constexpr std::array<const char*, 6> candidates = {
        "/system/fonts/NotoSansCJK-Regular.ttc",
        "/system/fonts/NotoSansCJK-Regular.otf",
        "/system/fonts/NotoSansSC-Regular.otf",
        "/system/fonts/DroidSansFallback.ttf",
        "/system/fonts/NotoSans-Regular.ttf",
        "/system/fonts/Roboto-Regular.ttf",
    };
    for (const char* candidate : candidates) {
        if (access(candidate, R_OK) == 0) {
            return candidate;
        }
    }
    return nullptr;
}

bool RequireFrame(JNIEnv* env) {
    if (!gState.ready || !gState.frameActive || ImGui::GetCurrentContext() == nullptr) {
        ThrowIllegalState(env, "ImGui widgets may only be used inside a createWindow render callback");
        return false;
    }
    return true;
}

bool RequireContext(JNIEnv* env) {
    if (!gState.ready || ImGui::GetCurrentContext() == nullptr) {
        ThrowIllegalState(env, "ImGui rendering context is not ready");
        return false;
    }
    return true;
}

bool ValidateArrayLength(JNIEnv* env, jarray array, jsize minimum, const char* message) {
    if (array == nullptr || env->GetArrayLength(array) < minimum) {
        ThrowIllegalArgument(env, message);
        return false;
    }
    return true;
}

jfloatArray NewFloatPair(JNIEnv* env, const ImVec2& value) {
    const jfloat values[] = {value.x, value.y};
    jfloatArray result = env->NewFloatArray(2);
    if (result != nullptr) {
        env->SetFloatArrayRegion(result, 0, 2, values);
    }
    return result;
}

bool ReadOptionalBoolean(JNIEnv* env, jbooleanArray array, bool& value, bool& present) {
    present = array != nullptr;
    if (!present) {
        return true;
    }
    if (!ValidateArrayLength(env, array, 1, "Boolean reference must contain at least one value")) {
        return false;
    }
    jboolean raw = JNI_FALSE;
    env->GetBooleanArrayRegion(array, 0, 1, &raw);
    value = raw == JNI_TRUE;
    return !env->ExceptionCheck();
}

void WriteOptionalBoolean(JNIEnv* env, jbooleanArray array, bool present, bool value) {
    if (present && array != nullptr) {
        const jboolean raw = value ? JNI_TRUE : JNI_FALSE;
        env->SetBooleanArrayRegion(array, 0, 1, &raw);
    }
}

bool ReadIntReference(JNIEnv* env, jintArray array, jint& value) {
    if (!ValidateArrayLength(env, array, 1, "Integer reference must contain at least one value")) {
        return false;
    }
    env->GetIntArrayRegion(array, 0, 1, &value);
    return !env->ExceptionCheck();
}

void WriteIntReference(JNIEnv* env, jintArray array, jint value) {
    env->SetIntArrayRegion(array, 0, 1, &value);
}

std::string ReadStringReference(JNIEnv* env, jobjectArray array) {
    if (!ValidateArrayLength(env, array, 1, "String reference must contain at least one value")) {
        return {};
    }
    jstring value = static_cast<jstring>(env->GetObjectArrayElement(array, 0));
    std::string result = JStringToUtf8(env, value);
    if (value != nullptr) {
        env->DeleteLocalRef(value);
    }
    return result;
}

void WriteStringReference(JNIEnv* env, jobjectArray array, std::string_view value) {
    jstring javaValue = Utf8ToJString(env, value);
    if (javaValue != nullptr) {
        env->SetObjectArrayElement(array, 0, javaValue);
        env->DeleteLocalRef(javaValue);
    }
}

}  // namespace

extern "C" JNIEXPORT jstring JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeVersion(
    JNIEnv* env,
    jclass
) {
    return Utf8ToJString(env, ImGui::GetVersion());
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeInit(
    JNIEnv* env,
    jclass,
    jobject assetManager,
    jobject surface,
    jfloat density,
    jstring fontPath,
    jfloat fontSize
) {
    ShutdownRenderer();
    if (surface == nullptr) {
        ThrowIllegalArgument(env, "Surface must not be null");
        return JNI_FALSE;
    }
    gState.window = ANativeWindow_fromSurface(env, surface);
    if (gState.window == nullptr) {
        LOG_ERROR("ANativeWindow_fromSurface returned null");
        return JNI_FALSE;
    }
    if (!InitializeEgl(gState.window)) {
        ShutdownRenderer();
        return JNI_FALSE;
    }

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.IniFilename = nullptr;
    io.LogFilename = nullptr;
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;
    io.ConfigWindowsMoveFromTitleBarOnly = true;
    io.ConfigErrorRecoveryEnableAssert = false;
    io.ConfigErrorRecoveryEnableDebugLog = false;

    const float safeDensity = std::clamp(static_cast<float>(density), 0.5F, 4.0F);
    const float safeFontSize = std::clamp(
        fontSize > 0.0F ? static_cast<float>(fontSize) : 16.0F,
        8.0F,
        64.0F
    );
    const std::string requestedFont = JStringToUtf8(env, fontPath);
    const char* selectedFont = SelectFontPath(requestedFont);
    if (selectedFont != nullptr) {
        ImFont* font = io.Fonts->AddFontFromFileTTF(selectedFont, safeFontSize * safeDensity);
        if (font == nullptr) {
            LOG_ERROR("Unable to load font: %s", selectedFont);
        } else {
            LOG_INFO("Loaded ImGui font: %s", selectedFont);
        }
    }
    if (io.Fonts->Fonts.empty()) {
        io.Fonts->AddFontDefault();
    }

    ImGui::StyleColorsDark();
    ImGuiStyle& style = ImGui::GetStyle();
    style.ScaleAllSizes(safeDensity);
    style.TouchExtraPadding = ImVec2(2.0F * safeDensity, 2.0F * safeDensity);

    gState.platformBackendInitialized = ImGui_ImplAndroid_Init(gState.window);
    gState.rendererBackendInitialized = ImGui_ImplOpenGL3_Init("#version 300 es");
    if (!gState.platformBackendInitialized || !gState.rendererBackendInitialized) {
        LOG_ERROR("Dear ImGui backend initialization failed");
        ShutdownRenderer();
        return JNI_FALSE;
    }

    glDisable(GL_DEPTH_TEST);
    glDisable(GL_CULL_FACE);
    glClearColor(0.0F, 0.0F, 0.0F, 0.0F);
    gState.ready = true;
    ReleaseCurrent();
    static_cast<void>(assetManager);
    return JNI_TRUE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeShutdown(
    JNIEnv*,
    jclass
) {
    ShutdownRenderer();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsReady(
    JNIEnv*,
    jclass
) {
    return gState.ready ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeNewFrame(
    JNIEnv*,
    jclass
) {
    if (!gState.ready || gState.frameActive || !EnsureCurrent()) {
        return JNI_FALSE;
    }
    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplAndroid_NewFrame();
    ImGui::NewFrame();
    gState.frameActive = true;
    return JNI_TRUE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeRender(
    JNIEnv*,
    jclass
) {
    if (!gState.ready || !gState.frameActive || !EnsureCurrent()) {
        gState.frameActive = false;
        ReleaseCurrent();
        return JNI_FALSE;
    }

    ImGui::Render();
    gState.frameActive = false;

    EGLint width = 0;
    EGLint height = 0;
    eglQuerySurface(gState.display, gState.surface, EGL_WIDTH, &width);
    eglQuerySurface(gState.display, gState.surface, EGL_HEIGHT, &height);
    if (width <= 0 || height <= 0) {
        ReleaseCurrent();
        return JNI_FALSE;
    }

    glViewport(0, 0, width, height);
    glClearColor(0.0F, 0.0F, 0.0F, 0.0F);
    glClear(GL_COLOR_BUFFER_BIT);
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    const bool swapped = eglSwapBuffers(gState.display, gState.surface) == EGL_TRUE;
    if (!swapped) {
        LOG_ERROR("eglSwapBuffers failed: 0x%x", eglGetError());
    }
    ReleaseCurrent();
    return swapped ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTouchEvent(
    JNIEnv*,
    jclass,
    jint action,
    jfloat x,
    jfloat y
) {
    if (!gState.ready || ImGui::GetCurrentContext() == nullptr) {
        return;
    }
    ImGuiIO& io = ImGui::GetIO();
    io.AddMouseSourceEvent(ImGuiMouseSource_TouchScreen);
    io.AddMousePosEvent(x, y);
    if (action == 0) {
        io.AddMouseButtonEvent(ImGuiMouseButton_Left, true);
    } else if (action == 1 || action == 3) {
        io.AddMouseButtonEvent(ImGuiMouseButton_Left, false);
    }
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetNextWindowPos(
    JNIEnv* env,
    jclass,
    jfloat x,
    jfloat y,
    jint condition,
    jfloat pivotX,
    jfloat pivotY
) {
    if (!RequireFrame(env)) return;
    ImGui::SetNextWindowPos(
        ImVec2(x, y),
        static_cast<ImGuiCond>(condition),
        ImVec2(pivotX, pivotY)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetNextWindowSize(
    JNIEnv* env,
    jclass,
    jfloat width,
    jfloat height,
    jint condition
) {
    if (!RequireFrame(env)) return;
    ImGui::SetNextWindowSize(ImVec2(width, height), static_cast<ImGuiCond>(condition));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetNextWindowSizeConstraints(
    JNIEnv* env,
    jclass,
    jfloat minWidth,
    jfloat minHeight,
    jfloat maxWidth,
    jfloat maxHeight
) {
    if (!RequireFrame(env)) return;
    ImGui::SetNextWindowSizeConstraints(
        ImVec2(minWidth, minHeight),
        ImVec2(maxWidth, maxHeight)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetNextWindowBgAlpha(
    JNIEnv* env,
    jclass,
    jfloat alpha
) {
    if (!RequireFrame(env)) return;
    ImGui::SetNextWindowBgAlpha(alpha);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBegin(
    JNIEnv* env,
    jclass,
    jstring name,
    jbooleanArray open,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    bool openValue = true;
    bool hasOpen = false;
    if (!ReadOptionalBoolean(env, open, openValue, hasOpen)) return JNI_FALSE;
    const std::string label = JStringToUtf8(env, name);
    const bool visible = ImGui::Begin(
        label.empty() ? "ImGui" : label.c_str(),
        hasOpen ? &openValue : nullptr,
        static_cast<ImGuiWindowFlags>(flags)
    );
    WriteOptionalBoolean(env, open, hasOpen, openValue);
    return visible ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEnd(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::End();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginChild(
    JNIEnv* env,
    jclass,
    jstring id,
    jfloat width,
    jfloat height,
    jboolean borders,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string label = JStringToUtf8(env, id);
    const ImGuiChildFlags childFlags = borders == JNI_TRUE ? ImGuiChildFlags_Borders : 0;
    return ImGui::BeginChild(
        label.empty() ? "##child" : label.c_str(),
        ImVec2(width, height),
        childFlags,
        static_cast<ImGuiWindowFlags>(flags)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndChild(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndChild();
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetWindowPos(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return nullptr;
    return NewFloatPair(env, ImGui::GetWindowPos());
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetWindowSize(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return nullptr;
    return NewFloatPair(env, ImGui::GetWindowSize());
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetContentRegionAvail(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return nullptr;
    return NewFloatPair(env, ImGui::GetContentRegionAvail());
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetCursorPos(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return nullptr;
    return NewFloatPair(env, ImGui::GetCursorPos());
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetCursorPos(
    JNIEnv* env,
    jclass,
    jfloat x,
    jfloat y
) {
    if (!RequireFrame(env)) return;
    ImGui::SetCursorPos(ImVec2(x, y));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeText(
    JNIEnv* env,
    jclass,
    jstring text
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, text);
    ImGui::TextUnformatted(value.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTextWrapped(
    JNIEnv* env,
    jclass,
    jstring text
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, text);
    ImGui::TextWrapped("%s", value.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTextColored(
    JNIEnv* env,
    jclass,
    jfloat red,
    jfloat green,
    jfloat blue,
    jfloat alpha,
    jstring text
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, text);
    ImGui::TextColored(ImVec4(red, green, blue, alpha), "%s", value.c_str());
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeButton(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloat width,
    jfloat height
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, label);
    return ImGui::Button(value.c_str(), ImVec2(width, height)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSmallButton(
    JNIEnv* env,
    jclass,
    jstring label
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, label);
    return ImGui::SmallButton(value.c_str()) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeCheckbox(
    JNIEnv* env,
    jclass,
    jstring label,
    jbooleanArray value
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    bool checked = false;
    bool present = false;
    if (!ReadOptionalBoolean(env, value, checked, present) || !present) {
        if (!env->ExceptionCheck()) ThrowIllegalArgument(env, "Checkbox value reference must not be null");
        return JNI_FALSE;
    }
    const std::string text = JStringToUtf8(env, label);
    const bool changed = ImGui::Checkbox(text.c_str(), &checked);
    WriteOptionalBoolean(env, value, true, checked);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeRadioButton(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray value,
    jint buttonValue
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    jint selected = 0;
    if (!ReadIntReference(env, value, selected)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    int nativeSelected = selected;
    const bool changed = ImGui::RadioButton(text.c_str(), &nativeSelected, buttonValue);
    WriteIntReference(env, value, nativeSelected);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSliderFloat(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray value,
    jfloat min,
    jfloat max,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateArrayLength(env, value, 1, "Float reference must contain at least one value")) return JNI_FALSE;
    jfloat* data = env->GetFloatArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const bool changed = ImGui::SliderFloat(
        text.c_str(),
        data,
        min,
        max,
        formatText.empty() ? "%.3f" : formatText.c_str(),
        static_cast<ImGuiSliderFlags>(flags)
    );
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSliderInt(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray value,
    jint min,
    jint max,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    jint current = 0;
    if (!ReadIntReference(env, value, current)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    int nativeValue = current;
    const bool changed = ImGui::SliderInt(
        text.c_str(),
        &nativeValue,
        min,
        max,
        formatText.empty() ? "%d" : formatText.c_str(),
        static_cast<ImGuiSliderFlags>(flags)
    );
    WriteIntReference(env, value, nativeValue);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDragFloat(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray value,
    jfloat speed,
    jfloat min,
    jfloat max,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateArrayLength(env, value, 1, "Float reference must contain at least one value")) return JNI_FALSE;
    jfloat* data = env->GetFloatArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const bool changed = ImGui::DragFloat(
        text.c_str(),
        data,
        speed,
        min,
        max,
        formatText.empty() ? "%.3f" : formatText.c_str(),
        static_cast<ImGuiSliderFlags>(flags)
    );
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDragInt(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray value,
    jfloat speed,
    jint min,
    jint max,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    jint current = 0;
    if (!ReadIntReference(env, value, current)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    int nativeValue = current;
    const bool changed = ImGui::DragInt(
        text.c_str(),
        &nativeValue,
        speed,
        min,
        max,
        formatText.empty() ? "%d" : formatText.c_str(),
        static_cast<ImGuiSliderFlags>(flags)
    );
    WriteIntReference(env, value, nativeValue);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeInputText(
    JNIEnv* env,
    jclass,
    jstring label,
    jobjectArray value,
    jint maxLength,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateArrayLength(env, value, 1, "String reference must contain at least one value")) return JNI_FALSE;
    const int capacity = std::clamp(static_cast<int>(maxLength), 2, kInputTextMaxBytes);
    const std::string current = ReadStringReference(env, value);
    if (env->ExceptionCheck()) return JNI_FALSE;
    std::vector<char> buffer(static_cast<size_t>(capacity), '\0');
    const size_t copyLength = std::min(current.size(), buffer.size() - 1U);
    std::memcpy(buffer.data(), current.data(), copyLength);
    const std::string text = JStringToUtf8(env, label);
    const bool changed = ImGui::InputText(
        text.c_str(),
        buffer.data(),
        buffer.size(),
        static_cast<ImGuiInputTextFlags>(flags)
    );
    if (changed) {
        WriteStringReference(env, value, buffer.data());
    }
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeColorEdit3(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray value,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateArrayLength(env, value, 3, "Color3 reference must contain three values")) return JNI_FALSE;
    jfloat* data = env->GetFloatArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const bool changed = ImGui::ColorEdit3(text.c_str(), data, static_cast<ImGuiColorEditFlags>(flags));
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeColorEdit4(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray value,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateArrayLength(env, value, 4, "Color4 reference must contain four values")) return JNI_FALSE;
    jfloat* data = env->GetFloatArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const bool changed = ImGui::ColorEdit4(text.c_str(), data, static_cast<ImGuiColorEditFlags>(flags));
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeProgressBar(
    JNIEnv* env,
    jclass,
    jfloat fraction,
    jfloat width,
    jfloat height,
    jstring overlay
) {
    if (!RequireFrame(env)) return;
    const bool hasOverlay = overlay != nullptr;
    const std::string text = JStringToUtf8(env, overlay);
    ImGui::ProgressBar(fraction, ImVec2(width, height), hasOverlay ? text.c_str() : nullptr);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeCombo(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray currentItem,
    jobjectArray items,
    jint popupHeight
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    jint selected = 0;
    if (!ReadIntReference(env, currentItem, selected)) return JNI_FALSE;
    if (items == nullptr) {
        ThrowIllegalArgument(env, "Combo items must not be null");
        return JNI_FALSE;
    }
    const jsize itemCount = std::min(env->GetArrayLength(items), static_cast<jsize>(kComboMaxItems));
    if (itemCount <= 0) {
        ThrowIllegalArgument(env, "Combo items must not be empty");
        return JNI_FALSE;
    }
    std::vector<std::string> strings;
    strings.reserve(static_cast<size_t>(itemCount));
    for (jsize index = 0; index < itemCount; ++index) {
        jstring item = static_cast<jstring>(env->GetObjectArrayElement(items, index));
        strings.push_back(JStringToUtf8(env, item));
        if (item != nullptr) env->DeleteLocalRef(item);
    }
    std::vector<const char*> pointers;
    pointers.reserve(strings.size());
    for (const std::string& item : strings) pointers.push_back(item.c_str());
    int nativeSelected = std::clamp(static_cast<int>(selected), 0, static_cast<int>(strings.size()) - 1);
    const std::string text = JStringToUtf8(env, label);
    const bool changed = ImGui::Combo(
        text.c_str(),
        &nativeSelected,
        pointers.data(),
        static_cast<int>(pointers.size()),
        popupHeight
    );
    WriteIntReference(env, currentItem, nativeSelected);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSelectable(
    JNIEnv* env,
    jclass,
    jstring label,
    jboolean selected,
    jint flags,
    jfloat width,
    jfloat height
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    return ImGui::Selectable(
        text.c_str(),
        selected == JNI_TRUE,
        static_cast<ImGuiSelectableFlags>(flags),
        ImVec2(width, height)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeCollapsingHeader(
    JNIEnv* env,
    jclass,
    jstring label,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    return ImGui::CollapsingHeader(text.c_str(), static_cast<ImGuiTreeNodeFlags>(flags))
        ? JNI_TRUE
        : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTreeNode(
    JNIEnv* env,
    jclass,
    jstring label
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    return ImGui::TreeNode(text.c_str()) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTreePop(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::TreePop();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginTabBar(
    JNIEnv* env,
    jclass,
    jstring id,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, id);
    return ImGui::BeginTabBar(text.c_str(), static_cast<ImGuiTabBarFlags>(flags))
        ? JNI_TRUE
        : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndTabBar(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndTabBar();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginTabItem(
    JNIEnv* env,
    jclass,
    jstring label,
    jbooleanArray open,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    bool openValue = true;
    bool hasOpen = false;
    if (!ReadOptionalBoolean(env, open, openValue, hasOpen)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const bool visible = ImGui::BeginTabItem(
        text.c_str(),
        hasOpen ? &openValue : nullptr,
        static_cast<ImGuiTabItemFlags>(flags)
    );
    WriteOptionalBoolean(env, open, hasOpen, openValue);
    return visible ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndTabItem(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndTabItem();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSameLine(
    JNIEnv* env,
    jclass,
    jfloat offsetFromStartX,
    jfloat spacing
) {
    if (!RequireFrame(env)) return;
    ImGui::SameLine(offsetFromStartX, spacing);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSeparator(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::Separator();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSpacing(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::Spacing();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeNewLine(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::NewLine();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDummy(
    JNIEnv* env,
    jclass,
    jfloat width,
    jfloat height
) {
    if (!RequireFrame(env)) return;
    ImGui::Dummy(ImVec2(width, height));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetNextItemWidth(
    JNIEnv* env,
    jclass,
    jfloat width
) {
    if (!RequireFrame(env)) return;
    ImGui::SetNextItemWidth(width);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePushItemWidth(
    JNIEnv* env,
    jclass,
    jfloat width
) {
    if (!RequireFrame(env)) return;
    ImGui::PushItemWidth(width);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePopItemWidth(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::PopItemWidth();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsItemClicked(
    JNIEnv* env,
    jclass,
    jint mouseButton
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsItemClicked(static_cast<ImGuiMouseButton>(mouseButton))
        ? JNI_TRUE
        : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsItemHovered(
    JNIEnv* env,
    jclass,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsItemHovered(static_cast<ImGuiHoveredFlags>(flags)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeWantCaptureMouse(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return JNI_FALSE;
    return ImGui::GetIO().WantCaptureMouse ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsAnyItemHovered(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return JNI_FALSE;
    return ImGui::IsAnyItemHovered() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsAnyItemActive(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return JNI_FALSE;
    return ImGui::IsAnyItemActive() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeStyleColorsDark(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return;
    ImGui::StyleColorsDark();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeStyleColorsLight(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return;
    ImGui::StyleColorsLight();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeStyleColorsClassic(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return;
    ImGui::StyleColorsClassic();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeShowDemoWindow(
    JNIEnv* env,
    jclass,
    jbooleanArray open
) {
    if (!RequireFrame(env)) return;
    bool openValue = true;
    bool hasOpen = false;
    if (!ReadOptionalBoolean(env, open, openValue, hasOpen)) return;
    ImGui::ShowDemoWindow(hasOpen ? &openValue : nullptr);
    WriteOptionalBoolean(env, open, hasOpen, openValue);
}
