#include <jni.h>

#include <EGL/egl.h>
#include <GLES3/gl3.h>
#include <android/asset_manager.h>
#include <android/asset_manager_jni.h>
#include <android/bitmap.h>
#include <android/log.h>
#include <android/native_window_jni.h>
#include <unistd.h>

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <limits>
#include <memory>
#include <string>
#include <string_view>
#include <unordered_map>
#include <utility>
#include <vector>

#include "imgui.h"
#include "imgui_internal.h"
#include "imgui_impl_android.h"
#include "imgui_impl_opengl3.h"

namespace {

constexpr char kLogTag[] = "AutoJs6-ImGui";
constexpr int kInputTextMaxBytes = 64 * 1024;
constexpr int kComboMaxItems = 512;
constexpr int kMaxAdditionalFonts = 16;
constexpr int kMaxDrawPoints = 4096;
constexpr int kMaxDragDropPayloadBytes = 65536;
constexpr int kTextureFlagNearest = 1 << 0;
constexpr int kTextureFlagRepeat = 1 << 1;
constexpr int kTextureFlagMipmaps = 1 << 2;
constexpr char kBundledCjkFontAsset[] = "fonts/AutoJs6CjkFallback-Regular.otf";
constexpr char kBundledIconFontAsset[] = "fonts/AutoJs6MaterialIcons-Subset.ttf";
constexpr size_t kMaxDebugMessages = 64;
constexpr float kMinFontScale = 0.5F;
constexpr float kMaxFontScale = 3.0F;
constexpr int kTextInputMultiline = 1 << 0;
constexpr int kTextInputPassword = 1 << 1;
constexpr int kTextInputCtrlEnterForNewLine = 1 << 2;
// Dear ImGui sizes a font by its line height; 1.448 is the line height of Noto Sans CJK in em, as for the bundled font.
constexpr float kSystemGlyphEmPerLine = 1.0F / 1.448F;
// The first and last code point of the ranges the Android text stack draws, sorted.
constexpr std::array<std::pair<ImWchar, ImWchar>, 11> kSystemGlyphRanges = {{
    {0x1100, 0x11FF},  // Hangul Jamo.
    {0x2E80, 0x2FDF},  // CJK and Kangxi radicals.
    {0x2FF0, 0x4DBF},  // Description characters, symbols, kana, Bopomofo, compatibility, extension A.
    {0x4E00, 0x9FFF},  // CJK unified ideographs.
    {0xA960, 0xA97F},  // Hangul Jamo extended A.
    {0xAC00, 0xD7A3},  // Hangul syllables.
    {0xD7B0, 0xD7FF},  // Hangul Jamo extended B.
    {0xF900, 0xFAFF},  // CJK compatibility ideographs.
    {0xFE10, 0xFE1F},  // Vertical forms.
    {0xFE30, 0xFE4F},  // CJK compatibility forms.
    {0xFF00, 0xFFEF},  // Halfwidth and fullwidth forms.
}};

#define LOG_ERROR(...) __android_log_print(ANDROID_LOG_ERROR, kLogTag, __VA_ARGS__)
#define LOG_INFO(...) __android_log_print(ANDROID_LOG_INFO, kLogTag, __VA_ARGS__)

struct TextureRecord {
    GLuint glId = 0U;
    int width = 0;
    int height = 0;
    bool pendingDelete = false;
    bool mipmaps = false;
};

struct RendererState {
    EGLDisplay display = EGL_NO_DISPLAY;
    EGLSurface surface = EGL_NO_SURFACE;
    EGLContext context = EGL_NO_CONTEXT;
    EGLConfig config = nullptr;
    ANativeWindow* window = nullptr;
    bool platformBackendInitialized = false;
    bool rendererBackendInitialized = false;
    bool ready = false;
    bool suspended = false;
    bool frameActive = false;
    float density = 1.0F;
    // The density the fonts were added with. style.FontScaleDpi carries a later change of the density.
    float fontDensity = 1.0F;
    // Presents empty frames while the frame loop goes on, so that windows below the surface can be seen.
    bool frameHidden = false;
    std::string iniPath;
    std::vector<ImFont*> fonts;
    std::vector<float> fontSizes;
    std::unordered_map<uint64_t, TextureRecord> textures;
    std::array<float, 4> autoResizeBounds{};
    bool hasAutoResizeBounds = false;
    std::vector<float> interactiveWindowRects;
    unsigned int cancelledMouseButtons = 0U;
    bool debugMode = false;
    bool showMetricsWindow = false;
    bool showDebugLogWindow = false;
    std::vector<std::string> debugMessages;
    std::vector<std::string> debugMessagesInFrame;
    std::vector<std::string> debugMessagesInPreviousFrame;
    // Open listClipper scopes, innermost last. The script facade ends each one in a finally block.
    std::vector<std::unique_ptr<ImGuiListClipper>> clippers;
    // PushClipRect calls without a PopClipRect yet, per draw list and frame: a pop never reaches the clip rectangles
    // Dear ImGui pushed itself, which would leave the list with an empty stack.
    std::unordered_map<ImDrawList*, int> clipRectDepths;
    // The text returned to Dear ImGui by the clipboard callback, which stays valid until the next call.
    std::string clipboardText;
};

RendererState gState;
uint64_t gNextTextureHandle = 1U;
JavaVM* gJavaVm = nullptr;
jclass gNativeClass = nullptr;
jmethodID gReadClipboardMethod = nullptr;
jmethodID gWriteClipboardMethod = nullptr;
jclass gSystemGlyphsClass = nullptr;
jmethodID gHasSystemGlyphMethod = nullptr;
jmethodID gMeasureSystemGlyphMethod = nullptr;
jmethodID gDrawSystemGlyphMethod = nullptr;

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

// Debug mode: a usage error Dear ImGui recovers from or a failed IM_ASSERT goes to logcat and to the queue the script
// drains after each frame. A message already reported in this frame or in the previous one is not reported again, so an
// error repeating every frame appears once until a frame passes without it.
void QueueDebugMessage(std::string message) {
    std::vector<std::string>& current = gState.debugMessagesInFrame;
    const std::vector<std::string>& previous = gState.debugMessagesInPreviousFrame;
    const bool repeated = std::find(current.begin(), current.end(), message) != current.end() ||
        std::find(previous.begin(), previous.end(), message) != previous.end();
    if (!repeated && current.size() < kMaxDebugMessages) {
        current.push_back(message);
    }
    if (repeated) {
        return;
    }
    __android_log_print(ANDROID_LOG_WARN, kLogTag, "%s", message.c_str());
    if (gState.debugMessages.size() < kMaxDebugMessages) {
        gState.debugMessages.push_back(std::move(message));
    }
}

void OnImGuiError(ImGuiContext* context, void*, const char* message) {
    const ImGuiWindow* window = context->CurrentWindow;
    QueueDebugMessage(std::string("In window '") + (window != nullptr ? window->Name : "NULL") + "': " + message);
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

bool IsRendererContextCurrent() {
    return gState.display != EGL_NO_DISPLAY &&
        gState.surface != EGL_NO_SURFACE &&
        gState.context != EGL_NO_CONTEXT &&
        eglGetCurrentDisplay() == gState.display &&
        eglGetCurrentContext() == gState.context &&
        eglGetCurrentSurface(EGL_DRAW) == gState.surface;
}

void DestroyAllTextures() {
    if (gState.textures.empty()) {
        return;
    }
    std::vector<GLuint> textureIds;
    textureIds.reserve(gState.textures.size());
    for (const auto& entry : gState.textures) {
        if (entry.second.glId != 0U) {
            textureIds.push_back(entry.second.glId);
        }
    }
    if (!textureIds.empty() && IsRendererContextCurrent()) {
        glDeleteTextures(static_cast<GLsizei>(textureIds.size()), textureIds.data());
    }
    LOG_INFO("Released %zu managed ImGui textures", gState.textures.size());
    gState.textures.clear();
}

void DestroyPendingTextures() {
    if (!IsRendererContextCurrent()) {
        return;
    }
    std::vector<GLuint> textureIds;
    for (auto iterator = gState.textures.begin(); iterator != gState.textures.end();) {
        if (!iterator->second.pendingDelete) {
            ++iterator;
            continue;
        }
        if (iterator->second.glId != 0U) {
            textureIds.push_back(iterator->second.glId);
        }
        iterator = gState.textures.erase(iterator);
    }
    if (!textureIds.empty()) {
        glDeleteTextures(static_cast<GLsizei>(textureIds.size()), textureIds.data());
    }
}

// Drops clippers a previous frame left open without seeking the cursor of a window that no longer exists.
void DiscardOpenClippers() {
    if (gState.clippers.empty()) {
        return;
    }
    ImGuiContext* context = ImGui::GetCurrentContext();
    for (auto& clipper : gState.clippers) {
        if (clipper->TempData != nullptr && context != nullptr && context->ClipperTempDataStacked > 0) {
            --context->ClipperTempDataStacked;
        }
        clipper->TempData = nullptr;
        clipper->ItemsCount = -1;
    }
    gState.clippers.clear();
}

void ShutdownRenderer() {
    gState.ready = false;
    gState.suspended = false;
    gState.frameActive = false;

    if (gState.display != EGL_NO_DISPLAY &&
        gState.surface != EGL_NO_SURFACE &&
        gState.context != EGL_NO_CONTEXT
    ) {
        eglMakeCurrent(gState.display, gState.surface, gState.surface, gState.context);
    } else if (gState.display != EGL_NO_DISPLAY &&
        gState.context != EGL_NO_CONTEXT &&
        gState.config != nullptr
    ) {
        constexpr EGLint cleanupSurfaceAttributes[] = {
            EGL_WIDTH, 1,
            EGL_HEIGHT, 1,
            EGL_NONE,
        };
        EGLSurface cleanupSurface = eglCreatePbufferSurface(
            gState.display,
            gState.config,
            cleanupSurfaceAttributes
        );
        if (cleanupSurface != EGL_NO_SURFACE &&
            eglMakeCurrent(
                gState.display,
                cleanupSurface,
                cleanupSurface,
                gState.context
            ) == EGL_TRUE
        ) {
            gState.surface = cleanupSurface;
        } else if (cleanupSurface != EGL_NO_SURFACE) {
            eglDestroySurface(gState.display, cleanupSurface);
        }
    }

    if (ImGui::GetCurrentContext() != nullptr) {
        if (!gState.iniPath.empty()) {
            ImGui::SaveIniSettingsToDisk(gState.iniPath.c_str());
        }
        DiscardOpenClippers();
        DestroyAllTextures();
        if (gState.rendererBackendInitialized) {
            ImGui_ImplOpenGL3_Shutdown();
        }
        if (gState.platformBackendInitialized) {
            ImGui_ImplAndroid_Shutdown();
        }
        ImGui::DestroyContext();
    }
    gState.frameHidden = false;
    gImGuiAssertReporting = false;
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

bool CreateWindowSurface(ANativeWindow* window) {
    if (window == nullptr || gState.display == EGL_NO_DISPLAY || gState.config == nullptr) {
        return false;
    }
    EGLint nativeVisualId = 0;
    eglGetConfigAttrib(gState.display, gState.config, EGL_NATIVE_VISUAL_ID, &nativeVisualId);
    ANativeWindow_setBuffersGeometry(window, 0, 0, nativeVisualId);
    gState.surface = eglCreateWindowSurface(gState.display, gState.config, window, nullptr);
    if (gState.surface == EGL_NO_SURFACE) {
        LOG_ERROR("eglCreateWindowSurface failed: 0x%x", eglGetError());
        return false;
    }
    return true;
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
    EGLint configCount = 0;
    if (eglChooseConfig(
            gState.display,
            configAttributes,
            &gState.config,
            1,
            &configCount
        ) != EGL_TRUE ||
        configCount < 1
    ) {
        LOG_ERROR("eglChooseConfig failed: 0x%x", eglGetError());
        return false;
    }
    if (!CreateWindowSurface(window)) {
        return false;
    }

    constexpr EGLint contextAttributes[] = {
        EGL_CONTEXT_CLIENT_VERSION, 3,
        EGL_NONE,
    };
    gState.context = eglCreateContext(
        gState.display,
        gState.config,
        EGL_NO_CONTEXT,
        contextAttributes
    );
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

bool DetachWindowSurface() {
    if (gState.frameActive || gState.display == EGL_NO_DISPLAY ||
        gState.context == EGL_NO_CONTEXT || ImGui::GetCurrentContext() == nullptr
    ) {
        return false;
    }
    gState.ready = false;
    if (gState.platformBackendInitialized) {
        ImGui_ImplAndroid_Shutdown();
        gState.platformBackendInitialized = false;
    }
    eglMakeCurrent(gState.display, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
    if (gState.surface != EGL_NO_SURFACE) {
        eglDestroySurface(gState.display, gState.surface);
        gState.surface = EGL_NO_SURFACE;
    }
    if (gState.window != nullptr) {
        ANativeWindow_release(gState.window);
        gState.window = nullptr;
    }
    gState.suspended = true;
    gState.hasAutoResizeBounds = false;
    gState.interactiveWindowRects.clear();
    return true;
}

bool AttachWindowSurface(ANativeWindow* window) {
    if (!gState.suspended || window == nullptr || gState.frameActive ||
        gState.display == EGL_NO_DISPLAY || gState.context == EGL_NO_CONTEXT ||
        ImGui::GetCurrentContext() == nullptr
    ) {
        return false;
    }
    gState.window = window;
    if (!CreateWindowSurface(gState.window)) {
        ANativeWindow_release(gState.window);
        gState.window = nullptr;
        return false;
    }
    if (eglMakeCurrent(gState.display, gState.surface, gState.surface, gState.context) != EGL_TRUE) {
        LOG_ERROR("Restored eglMakeCurrent failed: 0x%x", eglGetError());
        eglDestroySurface(gState.display, gState.surface);
        gState.surface = EGL_NO_SURFACE;
        ANativeWindow_release(gState.window);
        gState.window = nullptr;
        return false;
    }
    gState.platformBackendInitialized = ImGui_ImplAndroid_Init(gState.window);
    if (!gState.platformBackendInitialized) {
        LOG_ERROR("Dear ImGui Android backend restoration failed");
        ReleaseCurrent();
        eglDestroySurface(gState.display, gState.surface);
        gState.surface = EGL_NO_SURFACE;
        ANativeWindow_release(gState.window);
        gState.window = nullptr;
        return false;
    }
    gState.suspended = false;
    gState.ready = true;
    ReleaseCurrent();
    return true;
}

ImFont* AddFontFromAsset(
    AAssetManager* assetManager,
    const char* assetPath,
    float sizePixels,
    const ImFontConfig* config = nullptr
) {
    if (assetManager == nullptr || assetPath == nullptr || assetPath[0] == '\0') {
        return nullptr;
    }
    AAsset* asset = AAssetManager_open(assetManager, assetPath, AASSET_MODE_BUFFER);
    if (asset == nullptr) {
        LOG_ERROR("Unable to open font asset: %s", assetPath);
        return nullptr;
    }
    const off_t length = AAsset_getLength(asset);
    if (length <= 100 || length > std::numeric_limits<int>::max()) {
        LOG_ERROR("Invalid font asset length for %s: %lld", assetPath, static_cast<long long>(length));
        AAsset_close(asset);
        return nullptr;
    }

    void* data = IM_ALLOC(static_cast<size_t>(length));
    if (data == nullptr) {
        AAsset_close(asset);
        return nullptr;
    }
    size_t totalRead = 0;
    while (totalRead < static_cast<size_t>(length)) {
        const int read = AAsset_read(
            asset,
            static_cast<unsigned char*>(data) + totalRead,
            static_cast<size_t>(length) - totalRead
        );
        if (read <= 0) {
            break;
        }
        totalRead += static_cast<size_t>(read);
    }
    AAsset_close(asset);
    if (totalRead != static_cast<size_t>(length)) {
        LOG_ERROR("Unable to read complete font asset: %s", assetPath);
        IM_FREE(data);
        return nullptr;
    }

    ImFontConfig resolvedConfig = config != nullptr ? *config : ImFontConfig{};
    resolvedConfig.FontDataOwnedByAtlas = true;
    if (resolvedConfig.Name[0] == '\0') {
        ImFormatString(
            resolvedConfig.Name,
            IM_COUNTOF(resolvedConfig.Name),
            "asset://%s",
            assetPath
        );
    }
    ImFont* font = ImGui::GetIO().Fonts->AddFontFromMemoryTTF(
        data,
        static_cast<int>(length),
        sizePixels,
        &resolvedConfig
    );
    if (font != nullptr) {
        LOG_INFO("Loaded ImGui font asset: %s", assetPath);
    } else {
        LOG_ERROR("Unable to parse font asset: %s", assetPath);
    }
    return font;
}

bool StartsWith(std::string_view value, std::string_view prefix) {
    return value.size() >= prefix.size() && value.substr(0, prefix.size()) == prefix;
}

std::string AssetPathFromSpec(const std::string& spec) {
    constexpr std::string_view longPrefix = "asset://";
    constexpr std::string_view shortPrefix = "asset:";
    std::string_view value = spec;
    if (StartsWith(value, longPrefix)) {
        value.remove_prefix(longPrefix.size());
    } else if (StartsWith(value, shortPrefix)) {
        value.remove_prefix(shortPrefix.size());
    }
    while (!value.empty() && value.front() == '/') {
        value.remove_prefix(1);
    }
    return std::string(value);
}

ImFont* AddFontFromSpec(
    AAssetManager* assetManager,
    const std::string& spec,
    float sizePixels,
    const ImFontConfig* config = nullptr
) {
    if (spec.empty()) {
        return nullptr;
    }
    if (StartsWith(spec, "asset:") || spec.front() != '/') {
        const std::string assetPath = AssetPathFromSpec(spec);
        ImFont* assetFont = AddFontFromAsset(assetManager, assetPath.c_str(), sizePixels, config);
        if (assetFont != nullptr || StartsWith(spec, "asset:")) {
            return assetFont;
        }
    }
    if (access(spec.c_str(), R_OK) != 0) {
        LOG_ERROR("Font file is not readable: %s", spec.c_str());
        return nullptr;
    }
    ImFont* font = ImGui::GetIO().Fonts->AddFontFromFileTTF(
        spec.c_str(),
        sizePixels,
        config
    );
    if (font != nullptr) {
        LOG_INFO("Loaded ImGui font file: %s", spec.c_str());
    } else {
        LOG_ERROR("Unable to parse font file: %s", spec.c_str());
    }
    return font;
}

ImFont* AddFirstReadableSystemFont(float sizePixels, bool cjkOnly) {
    static constexpr std::array<const char*, 4> cjkCandidates = {
        "/system/fonts/NotoSansCJK-Regular.ttc",
        "/system/fonts/NotoSansCJK-Regular.otf",
        "/system/fonts/NotoSansSC-Regular.otf",
        "/system/fonts/DroidSansFallback.ttf",
    };
    static constexpr std::array<const char*, 2> latinCandidates = {
        "/system/fonts/NotoSans-Regular.ttf",
        "/system/fonts/Roboto-Regular.ttf",
    };
    const auto addCandidate = [sizePixels](const char* candidate) -> ImFont* {
        if (access(candidate, R_OK) == 0) {
            ImFont* font = ImGui::GetIO().Fonts->AddFontFromFileTTF(candidate, sizePixels);
            if (font != nullptr) {
                LOG_INFO("Loaded ImGui system font: %s", candidate);
            }
            return font;
        }
        return nullptr;
    };
    if (cjkOnly) {
        for (const char* candidate : cjkCandidates) {
            if (ImFont* font = addCandidate(candidate); font != nullptr) {
                return font;
            }
        }
    } else {
        for (const char* candidate : latinCandidates) {
            if (ImFont* font = addCandidate(candidate); font != nullptr) {
                return font;
            }
        }
    }
    return nullptr;
}

// createWindow({systemCjkFont: true}): a font source without font data, for which Android draws one glyph at a time
// (ImGuiSystemGlyphs). The CJK font of current Android versions is a variable CFF2 font, which stb_truetype cannot read; the
// Android text stack reads it, as well as the fonts vendors put in its place, and no font file stays in memory.
// Dear ImGui calls the loader inside native calls of the script thread, so the thread is attached.
bool BindSystemGlyphs(JNIEnv* env) {
    if (gSystemGlyphsClass != nullptr) {
        return true;
    }
    jclass glyphsClass = env->FindClass("io/github/supermonster003/autojs6/plugin/imgui/ImGuiSystemGlyphs");
    if (glyphsClass == nullptr) {
        env->ExceptionClear();
        return false;
    }
    gHasSystemGlyphMethod = env->GetStaticMethodID(glyphsClass, "has", "(I)Z");
    gMeasureSystemGlyphMethod = env->GetStaticMethodID(glyphsClass, "measure", "(IF)F");
    gDrawSystemGlyphMethod = env->GetStaticMethodID(glyphsClass, "draw", "(IF[I)[B");
    if (gHasSystemGlyphMethod != nullptr && gMeasureSystemGlyphMethod != nullptr && gDrawSystemGlyphMethod != nullptr) {
        env->GetJavaVM(&gJavaVm);
        gSystemGlyphsClass = static_cast<jclass>(env->NewGlobalRef(glyphsClass));
    }
    env->ExceptionClear();
    env->DeleteLocalRef(glyphsClass);
    return gSystemGlyphsClass != nullptr;
}

bool IsSystemGlyphCodepoint(ImWchar codepoint) {
    return std::any_of(kSystemGlyphRanges.begin(), kSystemGlyphRanges.end(), [codepoint](const auto& range) {
        return codepoint >= range.first && codepoint <= range.second;
    });
}

JNIEnv* SystemGlyphEnv(ImWchar codepoint) {
    JNIEnv* env = nullptr;
    if (!IsSystemGlyphCodepoint(codepoint) || gJavaVm == nullptr ||
        gJavaVm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return nullptr;
    }
    const jboolean found = env->CallStaticBooleanMethod(
        gSystemGlyphsClass,
        gHasSystemGlyphMethod,
        static_cast<jint>(codepoint)
    );
    if (env->ExceptionCheck()) {
        env->ExceptionClear();
        return nullptr;
    }
    return found == JNI_TRUE ? env : nullptr;
}

bool SystemGlyphSourceContains(ImFontAtlas*, ImFontConfig*, ImWchar codepoint) {
    return SystemGlyphEnv(codepoint) != nullptr;
}

void DrawSystemGlyph(
    JNIEnv* env,
    ImFontAtlas* atlas,
    ImFontConfig* src,
    ImFontBaked* baked,
    ImWchar codepoint,
    jfloat textSize,
    float density,
    ImFontGlyph* glyph
) {
    jintArray box = env->NewIntArray(5);
    if (box == nullptr) {
        env->ExceptionClear();
        return;
    }
    auto pixels = static_cast<jbyteArray>(env->CallStaticObjectMethod(
        gSystemGlyphsClass,
        gDrawSystemGlyphMethod,
        static_cast<jint>(codepoint),
        textSize,
        box
    ));
    if (env->ExceptionCheck()) {
        env->ExceptionClear();
    } else if (pixels != nullptr) {
        std::array<jint, 5> values{};
        env->GetIntArrayRegion(box, 0, static_cast<jsize>(values.size()), values.data());
        const auto [left, top, width, height, pitch] = values;
        const ImFontAtlasRectId packId = ImFontAtlasPackAddRect(atlas, width, height);
        jbyte* data = packId == ImFontAtlasRectId_Invalid ? nullptr : env->GetByteArrayElements(pixels, nullptr);
        if (data != nullptr) {
            ImTextureRect* rect = ImFontAtlasPackGetRect(atlas, packId);
            const float offsetY = IM_ROUND(baked->Ascent);
            glyph->X0 = static_cast<float>(left) / density;
            glyph->Y0 = static_cast<float>(top) / density + offsetY;
            glyph->X1 = static_cast<float>(left + static_cast<int>(rect->w)) / density;
            glyph->Y1 = static_cast<float>(top + static_cast<int>(rect->h)) / density + offsetY;
            glyph->Visible = true;
            glyph->PackId = packId;
            ImFontAtlasBakedSetFontGlyphBitmap(
                atlas,
                baked,
                src,
                glyph,
                rect,
                reinterpret_cast<const unsigned char*>(data),
                ImTextureFormat_Alpha8,
                pitch
            );
            env->ReleaseByteArrayElements(pixels, data, JNI_ABORT);
        }
    }
    if (pixels != nullptr) {
        env->DeleteLocalRef(pixels);
    }
    env->DeleteLocalRef(box);
}

bool LoadSystemGlyph(
    ImFontAtlas* atlas,
    ImFontConfig* src,
    ImFontBaked* baked,
    void*,
    ImWchar codepoint,
    ImFontGlyph* glyph,
    float* advanceOnly
) {
    JNIEnv* env = SystemGlyphEnv(codepoint);
    if (env == nullptr) {
        return false;
    }
    const float density = src->RasterizerDensity * baked->RasterizerDensity;
    const jfloat textSize = baked->Size * density * kSystemGlyphEmPerLine;
    const jfloat advance = env->CallStaticFloatMethod(
        gSystemGlyphsClass,
        gMeasureSystemGlyphMethod,
        static_cast<jint>(codepoint),
        textSize
    );
    if (env->ExceptionCheck()) {
        env->ExceptionClear();
        return false;
    }
    if (advanceOnly != nullptr) {
        *advanceOnly = advance / density;
        return true;
    }
    glyph->Codepoint = codepoint;
    glyph->AdvanceX = advance / density;
    DrawSystemGlyph(env, atlas, src, baked, codepoint, textSize, density, glyph);
    return true;
}

const ImFontLoader* SystemGlyphLoader() {
    static ImFontLoader loader;
    loader.Name = "android-system-glyphs";
    loader.FontSrcContainsGlyph = SystemGlyphSourceContains;
    loader.FontBakedLoadGlyph = LoadSystemGlyph;
    return &loader;
}

// Goes after the sources of destination: they keep their glyphs, and the private use area of the icon font stays theirs.
void AddSystemGlyphs(ImFont* destination) {
    ImFontConfig config;
    config.MergeMode = true;
    config.DstFont = destination;
    config.FontLoader = SystemGlyphLoader();
    ImFormatString(config.Name, IM_COUNTOF(config.Name), "system-glyphs");
    ImGui::GetIO().Fonts->AddFont(&config);
}

bool MergeAssetFont(AAssetManager* assetManager, const char* assetPath, ImFont* destination) {
    if (destination == nullptr) {
        return false;
    }
    ImFontConfig mergeConfig;
    mergeConfig.MergeMode = true;
    mergeConfig.DstFont = destination;
    return AddFontFromAsset(assetManager, assetPath, 0.0F, &mergeConfig) != nullptr;
}

void ResetStyle(int colorPreset) {
    ImGuiStyle& current = ImGui::GetStyle();
    const float fontSizeBase = current.FontSizeBase;
    const float fontScaleMain = current.FontScaleMain;
    const float fontScaleDpi = current.FontScaleDpi;
    const float nextFrameFontSizeBase = current._NextFrameFontSizeBase;

    ImGuiStyle replacement;
    switch (colorPreset) {
        case 1:
            ImGui::StyleColorsLight(&replacement);
            break;
        case 2:
            ImGui::StyleColorsClassic(&replacement);
            break;
        default:
            ImGui::StyleColorsDark(&replacement);
            break;
    }
    replacement.ScaleAllSizes(gState.density);
    replacement.TouchExtraPadding = ImVec2(2.0F * gState.density, 2.0F * gState.density);
    replacement.FontSizeBase = fontSizeBase;
    replacement.FontScaleMain = fontScaleMain;
    replacement.FontScaleDpi = fontScaleDpi;
    replacement._NextFrameFontSizeBase = nextFrameFontSizeBase;
    current = replacement;
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

jlongArray NewTextureResult(JNIEnv* env, uint64_t handle, int width, int height) {
    const jlong values[] = {
        static_cast<jlong>(handle),
        static_cast<jlong>(width),
        static_cast<jlong>(height),
    };
    jlongArray result = env->NewLongArray(3);
    if (result != nullptr) {
        env->SetLongArrayRegion(result, 0, 3, values);
    }
    return result;
}

TextureRecord* ResolveTexture(JNIEnv* env, jlong handle) {
    if (handle <= 0) {
        ThrowIllegalArgument(env, "Texture handle must be positive");
        return nullptr;
    }
    const auto found = gState.textures.find(static_cast<uint64_t>(handle));
    if (found == gState.textures.end() || found->second.glId == 0U ||
        found->second.pendingDelete
    ) {
        ThrowIllegalArgument(env, "Texture handle is unknown, disposed, or belongs to another session");
        return nullptr;
    }
    return &found->second;
}

ImDrawList* ResolveDrawList(JNIEnv* env, jint layer) {
    if (!RequireFrame(env)) {
        return nullptr;
    }
    switch (layer) {
        case 0:
            return ImGui::GetWindowDrawList();
        case 1:
            return ImGui::GetForegroundDrawList();
        case 2:
            return ImGui::GetBackgroundDrawList();
        default:
            ThrowIllegalArgument(env, "Draw-list layer must be Window, Foreground, or Background");
            return nullptr;
    }
}

bool ConsumeClipRectDepth(JNIEnv* env, ImDrawList* drawList) {
    const auto found = gState.clipRectDepths.find(drawList);
    if (found == gState.clipRectDepths.end() || found->second <= 0) {
        ThrowIllegalState(env, "popClipRect called without a matching pushClipRect in this frame");
        return false;
    }
    found->second -= 1;
    return true;
}

bool ReadDrawPoints(JNIEnv* env, jfloatArray points, std::vector<ImVec2>& output) {
    if (points == nullptr) {
        ThrowIllegalArgument(env, "Draw-list points must not be null");
        return false;
    }
    const jsize componentCount = env->GetArrayLength(points);
    if (componentCount < 4 || (componentCount % 2) != 0) {
        ThrowIllegalArgument(env, "Draw-list points require at least two [x, y] pairs");
        return false;
    }
    const jsize pointCount = componentCount / 2;
    if (pointCount > kMaxDrawPoints) {
        ThrowIllegalArgument(env, "Draw-list polyline accepts at most 4096 points");
        return false;
    }
    std::vector<jfloat> components(static_cast<size_t>(componentCount));
    env->GetFloatArrayRegion(points, 0, componentCount, components.data());
    if (env->ExceptionCheck()) {
        return false;
    }
    output.reserve(static_cast<size_t>(pointCount));
    for (jsize index = 0; index < pointCount; ++index) {
        const float x = components[static_cast<size_t>(index * 2)];
        const float y = components[static_cast<size_t>(index * 2 + 1)];
        if (!std::isfinite(x) || !std::isfinite(y)) {
            ThrowIllegalArgument(env, "Draw-list point coordinates must be finite");
            return false;
        }
        output.emplace_back(x, y);
    }
    return true;
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

constexpr float kFloatMax = std::numeric_limits<float>::max();

bool ReadStringItems(
    JNIEnv* env,
    jobjectArray items,
    std::vector<std::string>& strings,
    const char* emptyMessage
) {
    if (items == nullptr) {
        ThrowIllegalArgument(env, emptyMessage);
        return false;
    }
    const jsize itemCount = env->GetArrayLength(items);
    if (itemCount <= 0) {
        ThrowIllegalArgument(env, emptyMessage);
        return false;
    }
    if (itemCount > static_cast<jsize>(kComboMaxItems)) {
        ThrowIllegalArgument(env, "Selection controls accept at most 512 items");
        return false;
    }
    strings.reserve(static_cast<size_t>(itemCount));
    for (jsize index = 0; index < itemCount; ++index) {
        jstring item = static_cast<jstring>(env->GetObjectArrayElement(items, index));
        strings.push_back(JStringToUtf8(env, item));
        if (item != nullptr) env->DeleteLocalRef(item);
    }
    return true;
}

std::string VisibleLabel(const std::string& label) {
    const size_t marker = label.find("##");
    return marker == std::string::npos ? label : label.substr(0, marker);
}

bool DrawToggle(const char* label, const char* visibleLabel, bool* value) {
    const float frameHeight = ImGui::GetFrameHeight();
    const float width = frameHeight * 1.7F;
    const float radius = frameHeight * 0.5F;
    const ImVec2 position = ImGui::GetCursorScreenPos();
    ImGui::InvisibleButton(label, ImVec2(width, frameHeight));
    bool changed = false;
    if (ImGui::IsItemClicked()) {
        *value = !*value;
        changed = true;
    }
    const bool hovered = ImGui::IsItemHovered();
    const ImU32 track = *value
        ? ImGui::GetColorU32(hovered ? ImGuiCol_SliderGrabActive : ImGuiCol_CheckMark)
        : ImGui::GetColorU32(hovered ? ImGuiCol_FrameBgHovered : ImGuiCol_FrameBg);
    ImDrawList* drawList = ImGui::GetWindowDrawList();
    drawList->AddRectFilled(
        position,
        ImVec2(position.x + width, position.y + frameHeight),
        track,
        radius
    );
    drawList->AddCircleFilled(
        ImVec2(position.x + (*value ? width - radius : radius), position.y + radius),
        radius * 0.8F,
        ImGui::GetColorU32(ImVec4(1.0F, 1.0F, 1.0F, 1.0F))
    );
    if (visibleLabel != nullptr && visibleLabel[0] != '\0') {
        ImGui::SameLine(0.0F, ImGui::GetStyle().ItemInnerSpacing.x);
        ImGui::TextUnformatted(visibleLabel);
    }
    return changed;
}

bool CopyBitmapToRgba(
    JNIEnv* env,
    jobject bitmap,
    std::vector<uint8_t>& rgba,
    int& width,
    int& height
) {
    if (bitmap == nullptr) {
        ThrowIllegalArgument(env, "Texture bitmap must not be null");
        return false;
    }
    AndroidBitmapInfo info{};
    const int infoResult = AndroidBitmap_getInfo(env, bitmap, &info);
    if (infoResult != ANDROID_BITMAP_RESULT_SUCCESS) {
        ThrowIllegalArgument(env, "Unable to inspect the texture bitmap");
        return false;
    }
    if (info.width == 0U || info.height == 0U ||
        info.width > static_cast<uint32_t>(std::numeric_limits<int>::max()) ||
        info.height > static_cast<uint32_t>(std::numeric_limits<int>::max())
    ) {
        ThrowIllegalArgument(env, "Texture bitmap dimensions are invalid");
        return false;
    }
    if (info.format != ANDROID_BITMAP_FORMAT_RGBA_8888) {
        ThrowIllegalArgument(env, "Texture bitmap must use ARGB_8888 pixels");
        return false;
    }
    const size_t pixelCount = static_cast<size_t>(info.width) * static_cast<size_t>(info.height);
    if (pixelCount > std::numeric_limits<size_t>::max() / 4U) {
        ThrowIllegalArgument(env, "Texture bitmap is too large");
        return false;
    }

    void* lockedPixels = nullptr;
    const int lockResult = AndroidBitmap_lockPixels(env, bitmap, &lockedPixels);
    if (lockResult != ANDROID_BITMAP_RESULT_SUCCESS || lockedPixels == nullptr) {
        ThrowIllegalArgument(env, "Unable to lock the texture bitmap pixels");
        return false;
    }

    rgba.resize(pixelCount * 4U);
    const bool premultiplied =
        ((info.flags >> ANDROID_BITMAP_FLAGS_ALPHA_SHIFT) & ANDROID_BITMAP_FLAGS_ALPHA_MASK) ==
        ANDROID_BITMAP_FLAGS_ALPHA_PREMUL;
    const auto* sourceBase = static_cast<const uint8_t*>(lockedPixels);
    for (uint32_t row = 0; row < info.height; ++row) {
        const uint8_t* source = sourceBase + static_cast<size_t>(row) * info.stride;
        uint8_t* destination = rgba.data() +
            static_cast<size_t>(row) * static_cast<size_t>(info.width) * 4U;
        for (uint32_t column = 0; column < info.width; ++column) {
            const uint8_t red = source[column * 4U];
            const uint8_t green = source[column * 4U + 1U];
            const uint8_t blue = source[column * 4U + 2U];
            const uint8_t alpha = source[column * 4U + 3U];
            if (premultiplied && alpha > 0U && alpha < 255U) {
                destination[column * 4U] = static_cast<uint8_t>(std::min(
                    255U,
                    (static_cast<unsigned int>(red) * 255U + alpha / 2U) / alpha
                ));
                destination[column * 4U + 1U] = static_cast<uint8_t>(std::min(
                    255U,
                    (static_cast<unsigned int>(green) * 255U + alpha / 2U) / alpha
                ));
                destination[column * 4U + 2U] = static_cast<uint8_t>(std::min(
                    255U,
                    (static_cast<unsigned int>(blue) * 255U + alpha / 2U) / alpha
                ));
            } else {
                destination[column * 4U] = red;
                destination[column * 4U + 1U] = green;
                destination[column * 4U + 2U] = blue;
            }
            destination[column * 4U + 3U] = alpha;
        }
    }
    AndroidBitmap_unlockPixels(env, bitmap);
    width = static_cast<int>(info.width);
    height = static_cast<int>(info.height);
    return true;
}

void UpdateWindowMetadata() {
    gState.hasAutoResizeBounds = false;
    gState.autoResizeBounds = {};
    gState.interactiveWindowRects.clear();
    ImGuiContext* context = ImGui::GetCurrentContext();
    if (context == nullptr) {
        return;
    }
    const ImVec2 displaySize = ImGui::GetIO().DisplaySize;
    bool hasAutoResizeWindow = false;
    for (ImGuiWindow* window : context->Windows) {
        if (window == nullptr || !window->WasActive || window->Hidden ||
            window->IsFallbackWindow || window->RootWindow != window
        ) {
            continue;
        }
        const ImGuiWindowFlags flags = window->Flags;
        if ((flags & ImGuiWindowFlags_NoMouseInputs) == 0) {
            const ImRect clipped = window->OuterRectClipped;
            const float minX = std::clamp(clipped.Min.x, 0.0F, displaySize.x);
            const float minY = std::clamp(clipped.Min.y, 0.0F, displaySize.y);
            const float maxX = std::clamp(clipped.Max.x, 0.0F, displaySize.x);
            const float maxY = std::clamp(clipped.Max.y, 0.0F, displaySize.y);
            if (maxX > minX && maxY > minY &&
                gState.interactiveWindowRects.size() < 64U * 4U
            ) {
                gState.interactiveWindowRects.insert(
                    gState.interactiveWindowRects.end(),
                    {minX, minY, maxX, maxY}
                );
            }
        }
        if ((flags & ImGuiWindowFlags_AlwaysAutoResize) == 0 ||
            (flags & (ImGuiWindowFlags_ChildWindow |
                      ImGuiWindowFlags_Popup |
                      ImGuiWindowFlags_Tooltip)) != 0
        ) {
            continue;
        }
        const ImRect bounds = window->Rect();
        if (!hasAutoResizeWindow) {
            gState.autoResizeBounds = {
                bounds.Min.x,
                bounds.Min.y,
                bounds.Max.x,
                bounds.Max.y,
            };
            hasAutoResizeWindow = true;
        } else {
            gState.autoResizeBounds[0] = std::min(gState.autoResizeBounds[0], bounds.Min.x);
            gState.autoResizeBounds[1] = std::min(gState.autoResizeBounds[1], bounds.Min.y);
            gState.autoResizeBounds[2] = std::max(gState.autoResizeBounds[2], bounds.Max.x);
            gState.autoResizeBounds[3] = std::max(gState.autoResizeBounds[3], bounds.Max.y);
        }
    }
    gState.hasAutoResizeBounds = hasAutoResizeWindow;
}

struct PlotSamples {
    int count;
    int offset;
    int strideBytes;
};

// stride counts values (1 = every value): the plot reads values[0], values[stride], ... and starts at sample offset.
PlotSamples ResolvePlotSamples(jsize length, jint valuesOffset, jint stride) {
    const int step = std::max(1, static_cast<int>(stride));
    const int count = (static_cast<int>(length) - 1) / step + 1;
    return PlotSamples{
        count,
        std::clamp(static_cast<int>(valuesOffset), 0, count - 1),
        step * static_cast<int>(sizeof(float))
    };
}

}  // namespace

bool gImGuiAssertReporting = false;

void ReportImGuiAssert(const char* expression, const char* file, int line) {
    const char* separator = std::strrchr(file, '/');
    QueueDebugMessage(
        std::string("Assertion failed: ") + expression + " (" + (separator != nullptr ? separator + 1 : file) + ":" +
        std::to_string(line) + ")"
    );
}

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
    jfloat fontSize,
    jstring iniPath,
    jobjectArray additionalFontPaths,
    jfloatArray additionalFontSizes,
    jboolean systemCjkFont
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
    gState.iniPath = JStringToUtf8(env, iniPath);
    if (gState.iniPath.size() > 4096U) {
        ThrowIllegalArgument(env, "ImGui ini path must not exceed 4096 UTF-8 bytes");
        ShutdownRenderer();
        return JNI_FALSE;
    }
    io.IniFilename = gState.iniPath.empty() ? nullptr : gState.iniPath.c_str();
    io.LogFilename = nullptr;
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;
    io.ConfigWindowsMoveFromTitleBarOnly = true;
    io.ConfigErrorRecoveryEnableAssert = false;
    io.ConfigErrorRecoveryEnableDebugLog = false;

    const float safeDensity = std::clamp(static_cast<float>(density), 0.5F, 4.0F);
    gState.density = safeDensity;
    gState.fontDensity = safeDensity;
    const float safeFontSize = std::clamp(
        fontSize > 0.0F ? static_cast<float>(fontSize) : 16.0F,
        8.0F,
        64.0F
    );
    const jsize additionalFontCount = additionalFontPaths == nullptr
        ? 0
        : env->GetArrayLength(additionalFontPaths);
    const jsize additionalSizeCount = additionalFontSizes == nullptr
        ? 0
        : env->GetArrayLength(additionalFontSizes);
    if (additionalFontCount != additionalSizeCount ||
        additionalFontCount > kMaxAdditionalFonts
    ) {
        ThrowIllegalArgument(
            env,
            "Additional font paths and sizes must have equal lengths of at most 16"
        );
        ShutdownRenderer();
        return JNI_FALSE;
    }
    std::vector<jfloat> requestedFontSizes(static_cast<size_t>(additionalFontCount));
    if (additionalFontCount > 0) {
        env->GetFloatArrayRegion(
            additionalFontSizes,
            0,
            additionalFontCount,
            requestedFontSizes.data()
        );
        if (env->ExceptionCheck()) {
            ShutdownRenderer();
            return JNI_FALSE;
        }
    }

    AAssetManager* nativeAssetManager = assetManager == nullptr
        ? nullptr
        : AAssetManager_fromJava(env, assetManager);
    if (nativeAssetManager == nullptr) {
        LOG_ERROR("Android AssetManager is unavailable; bundled font fallbacks are disabled");
    }
    const float primarySizePixels = safeFontSize * safeDensity;
    const std::string requestedFont = JStringToUtf8(env, fontPath);
    // The bundled font stays the fallback of a device without CJK glyphs, or if the Java side cannot be reached.
    const bool useSystemGlyphs = systemCjkFont == JNI_TRUE && BindSystemGlyphs(env) &&
        env->CallStaticBooleanMethod(gSystemGlyphsClass, gHasSystemGlyphMethod, static_cast<jint>(0x4E00)) == JNI_TRUE;
    ImFont* primaryFont = nullptr;
    bool primaryHasCjkFallback = false;
    if (!requestedFont.empty()) {
        primaryFont = AddFontFromSpec(
            nativeAssetManager,
            requestedFont,
            primarySizePixels
        );
        primaryHasCjkFallback = primaryFont != nullptr &&
            AssetPathFromSpec(requestedFont) == kBundledCjkFontAsset;
    }
    if (primaryFont == nullptr) {
        primaryFont = AddFirstReadableSystemFont(primarySizePixels, true);
        primaryHasCjkFallback = primaryFont != nullptr;
    }
    if (primaryFont == nullptr) {
        primaryFont = AddFontFromAsset(
            nativeAssetManager,
            kBundledCjkFontAsset,
            primarySizePixels
        );
        primaryHasCjkFallback = primaryFont != nullptr;
    }
    if (primaryFont == nullptr) {
        primaryFont = AddFirstReadableSystemFont(primarySizePixels, false);
    }
    if (primaryFont == nullptr) {
        primaryFont = io.Fonts->AddFontDefault();
        LOG_INFO("Loaded built-in Dear ImGui default font");
    }
    if (!primaryHasCjkFallback && !useSystemGlyphs && nativeAssetManager != nullptr) {
        primaryHasCjkFallback = MergeAssetFont(
            nativeAssetManager,
            kBundledCjkFontAsset,
            primaryFont
        );
    }
    MergeAssetFont(nativeAssetManager, kBundledIconFontAsset, primaryFont);
    if (useSystemGlyphs) {
        AddSystemGlyphs(primaryFont);
    }

    const float resolvedPrimarySize = primaryFont != nullptr && primaryFont->LegacySize > 0.0F
        ? primaryFont->LegacySize
        : primarySizePixels;
    gState.fonts = {primaryFont, primaryFont, primaryFont};
    gState.fontSizes = {resolvedPrimarySize, resolvedPrimarySize, resolvedPrimarySize};

    for (jsize index = 0; index < additionalFontCount; ++index) {
        jstring pathValue = static_cast<jstring>(
            env->GetObjectArrayElement(additionalFontPaths, index)
        );
        const std::string fontSpec = JStringToUtf8(env, pathValue);
        if (pathValue != nullptr) {
            env->DeleteLocalRef(pathValue);
        }
        const float logicalSize = std::clamp(
            requestedFontSizes[static_cast<size_t>(index)] > 0.0F
                ? requestedFontSizes[static_cast<size_t>(index)]
                : safeFontSize,
            8.0F,
            128.0F
        );
        const float sizePixels = logicalSize * safeDensity;
        ImFont* font = fontSpec.empty()
            ? primaryFont
            : AddFontFromSpec(nativeAssetManager, fontSpec, sizePixels);
        if (font == nullptr) {
            LOG_ERROR("Additional font %d failed to load; using the default font", index);
            font = primaryFont;
        } else if (font != primaryFont) {
            if (!useSystemGlyphs && AssetPathFromSpec(fontSpec) != kBundledCjkFontAsset) {
                MergeAssetFont(nativeAssetManager, kBundledCjkFontAsset, font);
            }
            MergeAssetFont(nativeAssetManager, kBundledIconFontAsset, font);
            if (useSystemGlyphs) {
                AddSystemGlyphs(font);
            }
        }
        gState.fonts.push_back(font);
        gState.fontSizes.push_back(sizePixels);
    }
    LOG_INFO("Initialized %zu ImGui font handles", gState.fonts.size());

    ResetStyle(0);

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
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDetachSurface(
    JNIEnv*,
    jclass
) {
    return DetachWindowSurface() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeAttachSurface(
    JNIEnv* env,
    jclass,
    jobject surface
) {
    if (surface == nullptr) {
        ThrowIllegalArgument(env, "Surface must not be null");
        return JNI_FALSE;
    }
    ANativeWindow* window = ANativeWindow_fromSurface(env, surface);
    if (window == nullptr) {
        LOG_ERROR("ANativeWindow_fromSurface returned null while restoring the surface");
        return JNI_FALSE;
    }
    return AttachWindowSurface(window) ? JNI_TRUE : JNI_FALSE;
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
    DiscardOpenClippers();
    gState.clipRectDepths.clear();
    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplAndroid_NewFrame();
    ImGui::NewFrame();
    if (gState.cancelledMouseButtons != 0U) {
        ImGuiIO& io = ImGui::GetIO();
        ImGuiContext& context = *GImGui;
        for (int button = 0; button < ImGuiMouseButton_COUNT; ++button) {
            const unsigned int mask = 1U << static_cast<unsigned int>(button);
            if ((gState.cancelledMouseButtons & mask) == 0U) {
                continue;
            }
            io.MouseClicked[button] = false;
            io.MouseReleased[button] = false;
            if (context.ActiveIdMouseButton == button) {
                ImGui::ClearActiveID();
            }
            if (!io.MouseDown[button]) {
                gState.cancelledMouseButtons &= ~mask;
            }
        }
    }
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
    UpdateWindowMetadata();
    gState.frameActive = false;
    gState.debugMessagesInPreviousFrame.swap(gState.debugMessagesInFrame);
    gState.debugMessagesInFrame.clear();

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
    if (gState.frameHidden) {
        // After the draw data, whose texture updates must still reach the GL textures.
        glClear(GL_COLOR_BUFFER_BIT);
    }
    DestroyPendingTextures();

    const bool swapped = eglSwapBuffers(gState.display, gState.surface) == EGL_TRUE;
    if (!swapped) {
        LOG_ERROR("eglSwapBuffers failed: 0x%x", eglGetError());
    }
    ReleaseCurrent();
    return swapped ? JNI_TRUE : JNI_FALSE;
}

// Privileged windows have no Surface to copy from (R5.1): draws the last frame again without presenting it and reads
// the rectangle of the bitmap's size at (x, y), y from the top. Returns false before the first frame.
extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeCaptureFrame(
    JNIEnv* env,
    jclass,
    jobject bitmap,
    jint x,
    jint y
) {
    if (!RequireContext(env)) return JNI_FALSE;
    if (gState.frameActive) {
        ThrowIllegalState(env, "A frame cannot be read back inside the render callback");
        return JNI_FALSE;
    }
    ImDrawData* drawData = ImGui::GetDrawData();
    if (drawData == nullptr) {
        return JNI_FALSE;
    }
    AndroidBitmapInfo info;
    if (AndroidBitmap_getInfo(env, bitmap, &info) != ANDROID_BITMAP_RESULT_SUCCESS ||
        info.format != ANDROID_BITMAP_FORMAT_RGBA_8888
    ) {
        ThrowIllegalArgument(env, "The capture bitmap must be ARGB_8888");
        return JNI_FALSE;
    }
    if (!EnsureCurrent()) {
        ThrowIllegalState(env, "Unable to make the ImGui OpenGL context current");
        return JNI_FALSE;
    }
    EGLint surfaceWidth = 0;
    EGLint surfaceHeight = 0;
    eglQuerySurface(gState.display, gState.surface, EGL_WIDTH, &surfaceWidth);
    eglQuerySurface(gState.display, gState.surface, EGL_HEIGHT, &surfaceHeight);
    const int width = static_cast<int>(info.width);
    const int height = static_cast<int>(info.height);
    if (x < 0 || y < 0 || width <= 0 || height <= 0 || width > surfaceWidth - x || height > surfaceHeight - y) {
        ReleaseCurrent();
        ThrowIllegalArgument(env, "The capture rectangle is outside the surface");
        return JNI_FALSE;
    }

    void* pixels = nullptr;
    if (AndroidBitmap_lockPixels(env, bitmap, &pixels) != ANDROID_BITMAP_RESULT_SUCCESS || pixels == nullptr) {
        ReleaseCurrent();
        ThrowIllegalState(env, "Unable to lock the capture bitmap");
        return JNI_FALSE;
    }
    while (glGetError() != GL_NO_ERROR) {
        // Clear unrelated errors so the readback failure reporting remains deterministic.
    }
    glViewport(0, 0, surfaceWidth, surfaceHeight);
    glClearColor(0.0F, 0.0F, 0.0F, 0.0F);
    glClear(GL_COLOR_BUFFER_BIT);
    ImGui_ImplOpenGL3_RenderDrawData(drawData);
    GLint previousPackAlignment = 4;
    GLint previousPackRowLength = 0;
    glGetIntegerv(GL_PACK_ALIGNMENT, &previousPackAlignment);
    glGetIntegerv(GL_PACK_ROW_LENGTH, &previousPackRowLength);
    glPixelStorei(GL_PACK_ALIGNMENT, 1);
    glPixelStorei(GL_PACK_ROW_LENGTH, static_cast<GLint>(info.stride / 4U));
    glReadPixels(x, surfaceHeight - y - height, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels);
    glPixelStorei(GL_PACK_ROW_LENGTH, previousPackRowLength);
    glPixelStorei(GL_PACK_ALIGNMENT, previousPackAlignment);
    const GLenum readError = glGetError();

    // OpenGL rows run from the bottom up.
    std::vector<uint8_t> row(static_cast<size_t>(width) * 4U);
    auto* rows = static_cast<uint8_t*>(pixels);
    for (int top = 0, bottom = height - 1; top < bottom; ++top, --bottom) {
        uint8_t* topRow = rows + static_cast<size_t>(top) * info.stride;
        uint8_t* bottomRow = rows + static_cast<size_t>(bottom) * info.stride;
        std::memcpy(row.data(), topRow, row.size());
        std::memcpy(topRow, bottomRow, row.size());
        std::memcpy(bottomRow, row.data(), row.size());
    }
    AndroidBitmap_unlockPixels(env, bitmap);
    ReleaseCurrent();
    if (readError != GL_NO_ERROR) {
        LOG_ERROR("glReadPixels failed: 0x%x", readError);
        ThrowIllegalState(env, "Reading the frame back failed");
        return JNI_FALSE;
    }
    return JNI_TRUE;
}

// A density or system font scale change of the running session (R5.2): the sizes of the style follow the density, and
// style.FontScaleDpi scales every font on top of the size it was added with. fontScale is relative to the session's
// start. The atlas bakes glyphs at the new size on demand, and compacting it drops the ones of the old size.
extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetDisplayScale(
    JNIEnv* env,
    jclass,
    jfloat density,
    jfloat fontScale
) {
    if (!RequireContext(env)) return;
    if (gState.frameActive) {
        ThrowIllegalState(env, "The display scale cannot change inside the render callback");
        return;
    }
    if (!std::isfinite(density) || !std::isfinite(fontScale) || density <= 0.0F || fontScale <= 0.0F) {
        ThrowIllegalArgument(env, "The display scale must be positive");
        return;
    }
    const float safeDensity = std::clamp(static_cast<float>(density), 0.5F, 4.0F);
    ImGuiStyle& style = ImGui::GetStyle();
    if (safeDensity != gState.density) {
        style.ScaleAllSizes(safeDensity / gState.density);
        gState.density = safeDensity;
    }
    style.FontScaleDpi = safeDensity / gState.fontDensity * static_cast<float>(fontScale);
    ImGui::GetIO().Fonts->CompactCache();
}

// The font scale of the session (session.setFontScale, pinch zoom), style.FontScaleMain since Dear ImGui 1.92 moved
// io.FontGlobalScale there.
extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetFontScale(
    JNIEnv* env,
    jclass,
    jfloat scale
) {
    if (!RequireContext(env)) return;
    if (gState.frameActive) {
        ThrowIllegalState(env, "The font scale cannot change inside the render callback");
        return;
    }
    if (!std::isfinite(scale)) {
        ThrowIllegalArgument(env, "The font scale must be a finite number");
        return;
    }
    ImGui::GetStyle().FontScaleMain = std::clamp(static_cast<float>(scale), kMinFontScale, kMaxFontScale);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetFrameHidden(
    JNIEnv*,
    jclass,
    jboolean hidden
) {
    gState.frameHidden = hidden == JNI_TRUE;
}

// What the text field being edited needs from a text box outside Dear ImGui, 0 when no field is active.
extern "C" JNIEXPORT jint JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetTextInputFlags(
    JNIEnv*,
    jclass
) {
    if (!gState.ready || ImGui::GetCurrentContext() == nullptr) {
        return 0;
    }
    const ImGuiContext& context = *GImGui;
    if (context.ActiveId == 0U || context.InputTextState.ID != context.ActiveId) {
        return 0;
    }
    const ImGuiInputTextFlags flags = context.InputTextState.Flags;
    return ((flags & ImGuiInputTextFlags_Multiline) != 0 ? kTextInputMultiline : 0) |
        ((flags & ImGuiInputTextFlags_Password) != 0 ? kTextInputPassword : 0) |
        ((flags & ImGuiInputTextFlags_CtrlEnterForNewLine) != 0 ? kTextInputCtrlEnterForNewLine : 0);
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetAutoResizeBounds(
    JNIEnv* env,
    jclass
) {
    if (!gState.hasAutoResizeBounds) {
        return nullptr;
    }
    jfloatArray result = env->NewFloatArray(4);
    if (result != nullptr) {
        env->SetFloatArrayRegion(result, 0, 4, gState.autoResizeBounds.data());
    }
    return result;
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetInteractiveWindowRects(
    JNIEnv* env,
    jclass
) {
    const jsize length = static_cast<jsize>(gState.interactiveWindowRects.size());
    jfloatArray result = env->NewFloatArray(length);
    if (result != nullptr && length > 0) {
        env->SetFloatArrayRegion(
            result,
            0,
            length,
            gState.interactiveWindowRects.data()
        );
    }
    return result;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTouchEvent(
    JNIEnv*,
    jclass,
    jint action,
    jfloat x,
    jfloat y,
    jint mouseButton
) {
    if (!gState.ready || ImGui::GetCurrentContext() == nullptr) {
        return;
    }
    ImGuiIO& io = ImGui::GetIO();
    io.AddMouseSourceEvent(ImGuiMouseSource_TouchScreen);
    io.AddMousePosEvent(x, y);
    const int button = static_cast<int>(mouseButton);
    if (button < 0 || button >= ImGuiMouseButton_COUNT) {
        return;
    }
    if (action == 0) {
        io.AddMouseButtonEvent(button, true);
    } else if (action == 1) {
        io.AddMouseButtonEvent(button, false);
    } else if (action == 3) {
        io.AddMouseButtonEvent(button, false);
        gState.cancelledMouseButtons |= 1U << static_cast<unsigned int>(button);
    }
}

extern "C" JNIEXPORT jlongArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeCreateTexture(
    JNIEnv* env,
    jclass,
    jobject bitmap,
    jint flags
) {
    if (!RequireContext(env)) return nullptr;

    std::vector<uint8_t> pixels;
    int width = 0;
    int height = 0;
    if (!CopyBitmapToRgba(env, bitmap, pixels, width, height)) {
        return nullptr;
    }

    const bool contextWasCurrent = IsRendererContextCurrent();
    if (!EnsureCurrent()) {
        ThrowIllegalState(env, "Unable to make the ImGui OpenGL context current");
        return nullptr;
    }
    const auto releaseIfAcquired = [contextWasCurrent]() {
        if (!contextWasCurrent && !gState.frameActive) {
            ReleaseCurrent();
        }
    };

    GLint maxTextureSize = 0;
    glGetIntegerv(GL_MAX_TEXTURE_SIZE, &maxTextureSize);
    if (maxTextureSize <= 0 || width > maxTextureSize || height > maxTextureSize) {
        releaseIfAcquired();
        ThrowIllegalArgument(env, "Texture dimensions exceed the device OpenGL limit");
        return nullptr;
    }

    GLint previousActiveTexture = GL_TEXTURE0;
    GLint previousTexture = 0;
    GLint previousUnpackAlignment = 4;
    glGetIntegerv(GL_ACTIVE_TEXTURE, &previousActiveTexture);
    glActiveTexture(GL_TEXTURE0);
    glGetIntegerv(GL_TEXTURE_BINDING_2D, &previousTexture);
    glGetIntegerv(GL_UNPACK_ALIGNMENT, &previousUnpackAlignment);
    while (glGetError() != GL_NO_ERROR) {
        // Clear unrelated errors so upload failure reporting remains deterministic.
    }

    GLuint textureId = 0U;
    glGenTextures(1, &textureId);
    glBindTexture(GL_TEXTURE_2D, textureId);
    const bool nearest = (flags & kTextureFlagNearest) != 0;
    const bool repeat = (flags & kTextureFlagRepeat) != 0;
    const bool mipmaps = (flags & kTextureFlagMipmaps) != 0;
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, nearest ? GL_NEAREST : GL_LINEAR);
    glTexParameteri(
        GL_TEXTURE_2D,
        GL_TEXTURE_MIN_FILTER,
        mipmaps
            ? (nearest ? GL_NEAREST_MIPMAP_NEAREST : GL_LINEAR_MIPMAP_LINEAR)
            : (nearest ? GL_NEAREST : GL_LINEAR)
    );
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, repeat ? GL_REPEAT : GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, repeat ? GL_REPEAT : GL_CLAMP_TO_EDGE);
    glPixelStorei(GL_UNPACK_ALIGNMENT, 1);
    glTexImage2D(
        GL_TEXTURE_2D,
        0,
        GL_RGBA,
        width,
        height,
        0,
        GL_RGBA,
        GL_UNSIGNED_BYTE,
        pixels.data()
    );
    if (mipmaps) {
        glGenerateMipmap(GL_TEXTURE_2D);
    }
    const GLenum uploadError = glGetError();
    glPixelStorei(GL_UNPACK_ALIGNMENT, previousUnpackAlignment);
    glBindTexture(GL_TEXTURE_2D, static_cast<GLuint>(previousTexture));
    glActiveTexture(static_cast<GLenum>(previousActiveTexture));

    if (textureId == 0U || uploadError != GL_NO_ERROR) {
        if (textureId != 0U) {
            glDeleteTextures(1, &textureId);
        }
        releaseIfAcquired();
        LOG_ERROR("OpenGL texture upload failed: 0x%x", uploadError);
        ThrowIllegalState(env, "OpenGL texture upload failed");
        return nullptr;
    }

    uint64_t handle = gNextTextureHandle++;
    while (handle == 0U || handle > static_cast<uint64_t>(std::numeric_limits<jlong>::max()) ||
        gState.textures.find(handle) != gState.textures.end()
    ) {
        if (gNextTextureHandle == 0U ||
            gNextTextureHandle > static_cast<uint64_t>(std::numeric_limits<jlong>::max())
        ) {
            gNextTextureHandle = 1U;
        }
        handle = gNextTextureHandle++;
    }
    gState.textures.emplace(handle, TextureRecord{textureId, width, height, false, mipmaps});
    releaseIfAcquired();
    LOG_INFO(
        "Created managed ImGui texture %llu (%dx%d, GL %u)",
        static_cast<unsigned long long>(handle),
        width,
        height,
        textureId
    );
    return NewTextureResult(env, handle, width, height);
}

// Replaces the pixels of a managed texture: the same size reuses the storage (glTexSubImage2D), another size
// respecifies it on the same GL texture, so the handle and the GL id stay the same either way.
extern "C" JNIEXPORT jlongArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeUpdateTexture(
    JNIEnv* env,
    jclass,
    jlong handle,
    jobject bitmap
) {
    if (!RequireContext(env)) return nullptr;
    TextureRecord* texture = ResolveTexture(env, handle);
    if (texture == nullptr) {
        return nullptr;
    }

    std::vector<uint8_t> pixels;
    int width = 0;
    int height = 0;
    if (!CopyBitmapToRgba(env, bitmap, pixels, width, height)) {
        return nullptr;
    }

    const bool contextWasCurrent = IsRendererContextCurrent();
    if (!EnsureCurrent()) {
        ThrowIllegalState(env, "Unable to make the ImGui OpenGL context current");
        return nullptr;
    }
    const auto releaseIfAcquired = [contextWasCurrent]() {
        if (!contextWasCurrent && !gState.frameActive) {
            ReleaseCurrent();
        }
    };

    const bool resized = width != texture->width || height != texture->height;
    if (resized) {
        GLint maxTextureSize = 0;
        glGetIntegerv(GL_MAX_TEXTURE_SIZE, &maxTextureSize);
        if (maxTextureSize <= 0 || width > maxTextureSize || height > maxTextureSize) {
            releaseIfAcquired();
            ThrowIllegalArgument(env, "Texture dimensions exceed the device OpenGL limit");
            return nullptr;
        }
    }

    GLint previousActiveTexture = GL_TEXTURE0;
    GLint previousTexture = 0;
    GLint previousUnpackAlignment = 4;
    glGetIntegerv(GL_ACTIVE_TEXTURE, &previousActiveTexture);
    glActiveTexture(GL_TEXTURE0);
    glGetIntegerv(GL_TEXTURE_BINDING_2D, &previousTexture);
    glGetIntegerv(GL_UNPACK_ALIGNMENT, &previousUnpackAlignment);
    while (glGetError() != GL_NO_ERROR) {
        // Clear unrelated errors so upload failure reporting remains deterministic.
    }

    glBindTexture(GL_TEXTURE_2D, texture->glId);
    glPixelStorei(GL_UNPACK_ALIGNMENT, 1);
    if (resized) {
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    } else {
        glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    }
    if (texture->mipmaps) {
        glGenerateMipmap(GL_TEXTURE_2D);
    }
    const GLenum uploadError = glGetError();
    glPixelStorei(GL_UNPACK_ALIGNMENT, previousUnpackAlignment);
    glBindTexture(GL_TEXTURE_2D, static_cast<GLuint>(previousTexture));
    glActiveTexture(static_cast<GLenum>(previousActiveTexture));

    if (uploadError != GL_NO_ERROR) {
        releaseIfAcquired();
        LOG_ERROR("OpenGL texture update failed: 0x%x", uploadError);
        ThrowIllegalState(env, "OpenGL texture update failed");
        return nullptr;
    }
    texture->width = width;
    texture->height = height;
    const GLuint textureId = texture->glId;
    releaseIfAcquired();
    if (resized) {
        LOG_INFO(
            "Resized managed ImGui texture %llu to %dx%d (GL %u)",
            static_cast<unsigned long long>(handle),
            width,
            height,
            textureId
        );
    }
    return NewTextureResult(env, static_cast<uint64_t>(handle), width, height);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDestroyTexture(
    JNIEnv* env,
    jclass,
    jlong handle
) {
    if (!RequireContext(env) || handle <= 0) return JNI_FALSE;
    const auto found = gState.textures.find(static_cast<uint64_t>(handle));
    if (found == gState.textures.end()) {
        return JNI_FALSE;
    }
    if (found->second.pendingDelete) {
        return JNI_FALSE;
    }
    if (gState.frameActive) {
        found->second.pendingDelete = true;
        return JNI_TRUE;
    }
    const bool contextWasCurrent = IsRendererContextCurrent();
    if (!EnsureCurrent()) {
        ThrowIllegalState(env, "Unable to make the ImGui OpenGL context current");
        return JNI_FALSE;
    }
    const GLuint textureId = found->second.glId;
    if (textureId != 0U) {
        glDeleteTextures(1, &textureId);
    }
    gState.textures.erase(found);
    if (!contextWasCurrent && !gState.frameActive) {
        ReleaseCurrent();
    }
    return JNI_TRUE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeImage(
    JNIEnv* env,
    jclass,
    jlong handle,
    jfloat width,
    jfloat height,
    jfloat uv0X,
    jfloat uv0Y,
    jfloat uv1X,
    jfloat uv1Y,
    jfloat backgroundRed,
    jfloat backgroundGreen,
    jfloat backgroundBlue,
    jfloat backgroundAlpha,
    jfloat tintRed,
    jfloat tintGreen,
    jfloat tintBlue,
    jfloat tintAlpha
) {
    if (!RequireFrame(env)) return;
    TextureRecord* texture = ResolveTexture(env, handle);
    if (texture == nullptr) return;
    const float resolvedWidth = width > 0.0F ? width : static_cast<float>(texture->width);
    const float resolvedHeight = height > 0.0F ? height : static_cast<float>(texture->height);
    ImGui::ImageWithBg(
        ImTextureRef(static_cast<ImTextureID>(texture->glId)),
        ImVec2(resolvedWidth, resolvedHeight),
        ImVec2(uv0X, uv0Y),
        ImVec2(uv1X, uv1Y),
        ImVec4(backgroundRed, backgroundGreen, backgroundBlue, backgroundAlpha),
        ImVec4(tintRed, tintGreen, tintBlue, tintAlpha)
    );
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeImageButton(
    JNIEnv* env,
    jclass,
    jstring id,
    jlong handle,
    jfloat width,
    jfloat height,
    jfloat uv0X,
    jfloat uv0Y,
    jfloat uv1X,
    jfloat uv1Y,
    jfloat backgroundRed,
    jfloat backgroundGreen,
    jfloat backgroundBlue,
    jfloat backgroundAlpha,
    jfloat tintRed,
    jfloat tintGreen,
    jfloat tintBlue,
    jfloat tintAlpha
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    TextureRecord* texture = ResolveTexture(env, handle);
    if (texture == nullptr) return JNI_FALSE;
    const std::string resolvedId = JStringToUtf8(env, id);
    const float resolvedWidth = width > 0.0F ? width : static_cast<float>(texture->width);
    const float resolvedHeight = height > 0.0F ? height : static_cast<float>(texture->height);
    return ImGui::ImageButton(
        resolvedId.c_str(),
        ImTextureRef(static_cast<ImTextureID>(texture->glId)),
        ImVec2(resolvedWidth, resolvedHeight),
        ImVec2(uv0X, uv0Y),
        ImVec2(uv1X, uv1Y),
        ImVec4(backgroundRed, backgroundGreen, backgroundBlue, backgroundAlpha),
        ImVec4(tintRed, tintGreen, tintBlue, tintAlpha)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawLine(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x1,
    jfloat y1,
    jfloat x2,
    jfloat y2,
    jint color,
    jfloat thickness
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->AddLine(
        ImVec2(x1, y1),
        ImVec2(x2, y2),
        static_cast<ImU32>(color),
        std::max(0.1F, static_cast<float>(thickness))
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawRect(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat minX,
    jfloat minY,
    jfloat maxX,
    jfloat maxY,
    jint color,
    jfloat rounding,
    jfloat thickness,
    jint flags
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->AddRect(
        ImVec2(minX, minY),
        ImVec2(maxX, maxY),
        static_cast<ImU32>(color),
        std::max(0.0F, static_cast<float>(rounding)),
        std::max(0.1F, static_cast<float>(thickness)),
        static_cast<ImDrawFlags>(flags)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawRectFilled(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat minX,
    jfloat minY,
    jfloat maxX,
    jfloat maxY,
    jint color,
    jfloat rounding,
    jint flags
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->AddRectFilled(
        ImVec2(minX, minY),
        ImVec2(maxX, maxY),
        static_cast<ImU32>(color),
        std::max(0.0F, static_cast<float>(rounding)),
        static_cast<ImDrawFlags>(flags)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawCircle(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x,
    jfloat y,
    jfloat radius,
    jint color,
    jint segments,
    jfloat thickness
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->AddCircle(
        ImVec2(x, y),
        std::max(0.0F, static_cast<float>(radius)),
        static_cast<ImU32>(color),
        std::clamp(static_cast<int>(segments), 0, 512),
        std::max(0.1F, static_cast<float>(thickness))
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawCircleFilled(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x,
    jfloat y,
    jfloat radius,
    jint color,
    jint segments
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->AddCircleFilled(
        ImVec2(x, y),
        std::max(0.0F, static_cast<float>(radius)),
        static_cast<ImU32>(color),
        std::clamp(static_cast<int>(segments), 0, 512)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawTriangle(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x1,
    jfloat y1,
    jfloat x2,
    jfloat y2,
    jfloat x3,
    jfloat y3,
    jint color,
    jfloat thickness,
    jboolean filled
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    if (filled == JNI_TRUE) {
        drawList->AddTriangleFilled(
            ImVec2(x1, y1),
            ImVec2(x2, y2),
            ImVec2(x3, y3),
            static_cast<ImU32>(color)
        );
    } else {
        drawList->AddTriangle(
            ImVec2(x1, y1),
            ImVec2(x2, y2),
            ImVec2(x3, y3),
            static_cast<ImU32>(color),
            std::max(0.1F, static_cast<float>(thickness))
        );
    }
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawText(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x,
    jfloat y,
    jint color,
    jstring text,
    jint fontIndex,
    jfloat fontSize,
    jfloat wrapWidth
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    const std::string value = JStringToUtf8(env, text);
    if (fontIndex < 0 && fontSize <= 0.0F && wrapWidth <= 0.0F) {
        drawList->AddText(ImVec2(x, y), static_cast<ImU32>(color), value.c_str());
        return;
    }
    ImFont* font = ImGui::GetFont();
    float resolvedSize = ImGui::GetFontSize();
    if (fontIndex >= 0) {
        if (static_cast<size_t>(fontIndex) >= gState.fonts.size() ||
            gState.fonts[static_cast<size_t>(fontIndex)] == nullptr
        ) {
            ThrowIllegalArgument(env, "Draw-list text font index is out of range");
            return;
        }
        font = gState.fonts[static_cast<size_t>(fontIndex)];
        const ImGuiStyle& style = ImGui::GetStyle();
        resolvedSize = gState.fontSizes[static_cast<size_t>(fontIndex)] * style.FontScaleMain * style.FontScaleDpi;
    }
    if (fontSize > 0.0F) {
        resolvedSize = std::clamp(static_cast<float>(fontSize), 4.0F, 128.0F) * gState.density;
    }
    drawList->AddText(
        font,
        resolvedSize,
        ImVec2(x, y),
        static_cast<ImU32>(color),
        value.c_str(),
        nullptr,
        std::max(0.0F, static_cast<float>(wrapWidth))
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPolyline(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloatArray points,
    jint color,
    jfloat thickness,
    jint flags
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    std::vector<ImVec2> values;
    if (!ReadDrawPoints(env, points, values)) return;
    drawList->AddPolyline(
        values.data(),
        static_cast<int>(values.size()),
        static_cast<ImU32>(color),
        std::max(0.1F, static_cast<float>(thickness)),
        static_cast<ImDrawFlags>(flags)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawBezierCubic(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x1,
    jfloat y1,
    jfloat x2,
    jfloat y2,
    jfloat x3,
    jfloat y3,
    jfloat x4,
    jfloat y4,
    jint color,
    jfloat thickness,
    jint segments
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->AddBezierCubic(
        ImVec2(x1, y1),
        ImVec2(x2, y2),
        ImVec2(x3, y3),
        ImVec2(x4, y4),
        static_cast<ImU32>(color),
        std::max(0.1F, static_cast<float>(thickness)),
        std::clamp(static_cast<int>(segments), 0, 512)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawImage(
    JNIEnv* env,
    jclass,
    jint layer,
    jlong handle,
    jfloat minX,
    jfloat minY,
    jfloat maxX,
    jfloat maxY,
    jfloat uv0X,
    jfloat uv0Y,
    jfloat uv1X,
    jfloat uv1Y,
    jint tintColor
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    TextureRecord* texture = ResolveTexture(env, handle);
    if (texture == nullptr) return;
    drawList->AddImage(
        ImTextureRef(static_cast<ImTextureID>(texture->glId)),
        ImVec2(minX, minY),
        ImVec2(maxX, maxY),
        ImVec2(uv0X, uv0Y),
        ImVec2(uv1X, uv1Y),
        static_cast<ImU32>(tintColor)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawImageQuad(
    JNIEnv* env,
    jclass,
    jint layer,
    jlong handle,
    jfloatArray corners,
    jfloatArray uvs,
    jint tintColor
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    TextureRecord* texture = ResolveTexture(env, handle);
    if (texture == nullptr) return;
    if (corners == nullptr || uvs == nullptr ||
        env->GetArrayLength(corners) != 8 || env->GetArrayLength(uvs) != 8
    ) {
        ThrowIllegalArgument(env, "Draw-list image quad requires four corners and four UV points");
        return;
    }
    std::array<jfloat, 8> p{};
    std::array<jfloat, 8> uv{};
    env->GetFloatArrayRegion(corners, 0, 8, p.data());
    env->GetFloatArrayRegion(uvs, 0, 8, uv.data());
    drawList->AddImageQuad(
        ImTextureRef(static_cast<ImTextureID>(texture->glId)),
        ImVec2(p[0], p[1]),
        ImVec2(p[2], p[3]),
        ImVec2(p[4], p[5]),
        ImVec2(p[6], p[7]),
        ImVec2(uv[0], uv[1]),
        ImVec2(uv[2], uv[3]),
        ImVec2(uv[4], uv[5]),
        ImVec2(uv[6], uv[7]),
        static_cast<ImU32>(tintColor)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawImageRounded(
    JNIEnv* env,
    jclass,
    jint layer,
    jlong handle,
    jfloat minX,
    jfloat minY,
    jfloat maxX,
    jfloat maxY,
    jfloat uv0X,
    jfloat uv0Y,
    jfloat uv1X,
    jfloat uv1Y,
    jint tintColor,
    jfloat rounding,
    jint flags
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    TextureRecord* texture = ResolveTexture(env, handle);
    if (texture == nullptr) return;
    drawList->AddImageRounded(
        ImTextureRef(static_cast<ImTextureID>(texture->glId)),
        ImVec2(minX, minY),
        ImVec2(maxX, maxY),
        ImVec2(uv0X, uv0Y),
        ImVec2(uv1X, uv1Y),
        static_cast<ImU32>(tintColor),
        std::max(0.0F, static_cast<float>(rounding)),
        static_cast<ImDrawFlags>(flags)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawRectFilledMultiColor(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat minX,
    jfloat minY,
    jfloat maxX,
    jfloat maxY,
    jint colorUpperLeft,
    jint colorUpperRight,
    jint colorBottomRight,
    jint colorBottomLeft
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->AddRectFilledMultiColor(
        ImVec2(minX, minY),
        ImVec2(maxX, maxY),
        static_cast<ImU32>(colorUpperLeft),
        static_cast<ImU32>(colorUpperRight),
        static_cast<ImU32>(colorBottomRight),
        static_cast<ImU32>(colorBottomLeft)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawQuad(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x1,
    jfloat y1,
    jfloat x2,
    jfloat y2,
    jfloat x3,
    jfloat y3,
    jfloat x4,
    jfloat y4,
    jint color,
    jfloat thickness,
    jboolean filled
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    if (filled == JNI_TRUE) {
        drawList->AddQuadFilled(
            ImVec2(x1, y1),
            ImVec2(x2, y2),
            ImVec2(x3, y3),
            ImVec2(x4, y4),
            static_cast<ImU32>(color)
        );
    } else {
        drawList->AddQuad(
            ImVec2(x1, y1),
            ImVec2(x2, y2),
            ImVec2(x3, y3),
            ImVec2(x4, y4),
            static_cast<ImU32>(color),
            std::max(0.1F, static_cast<float>(thickness))
        );
    }
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawNgon(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x,
    jfloat y,
    jfloat radius,
    jint color,
    jint segments,
    jfloat thickness,
    jboolean filled
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    const float safeRadius = std::max(0.0F, static_cast<float>(radius));
    const int safeSegments = std::clamp(static_cast<int>(segments), 3, 512);
    if (filled == JNI_TRUE) {
        drawList->AddNgonFilled(ImVec2(x, y), safeRadius, static_cast<ImU32>(color), safeSegments);
    } else {
        drawList->AddNgon(
            ImVec2(x, y),
            safeRadius,
            static_cast<ImU32>(color),
            safeSegments,
            std::max(0.1F, static_cast<float>(thickness))
        );
    }
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawEllipse(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x,
    jfloat y,
    jfloat radiusX,
    jfloat radiusY,
    jint color,
    jfloat rotation,
    jint segments,
    jfloat thickness,
    jboolean filled
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    const ImVec2 radius(std::max(0.0F, static_cast<float>(radiusX)), std::max(0.0F, static_cast<float>(radiusY)));
    const int safeSegments = std::clamp(static_cast<int>(segments), 0, 512);
    if (filled == JNI_TRUE) {
        drawList->AddEllipseFilled(ImVec2(x, y), radius, static_cast<ImU32>(color), rotation, safeSegments);
    } else {
        drawList->AddEllipse(
            ImVec2(x, y),
            radius,
            static_cast<ImU32>(color),
            rotation,
            safeSegments,
            std::max(0.1F, static_cast<float>(thickness))
        );
    }
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawBezierQuadratic(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x1,
    jfloat y1,
    jfloat x2,
    jfloat y2,
    jfloat x3,
    jfloat y3,
    jint color,
    jfloat thickness,
    jint segments
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->AddBezierQuadratic(
        ImVec2(x1, y1),
        ImVec2(x2, y2),
        ImVec2(x3, y3),
        static_cast<ImU32>(color),
        std::max(0.1F, static_cast<float>(thickness)),
        std::clamp(static_cast<int>(segments), 0, 512)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPolyFilled(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloatArray points,
    jint color,
    jboolean concave
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    std::vector<ImVec2> values;
    if (!ReadDrawPoints(env, points, values)) return;
    if (values.size() < 3U) {
        ThrowIllegalArgument(env, "Draw-list filled polygons require at least three points");
        return;
    }
    if (concave == JNI_TRUE) {
        drawList->AddConcavePolyFilled(values.data(), static_cast<int>(values.size()), static_cast<ImU32>(color));
    } else {
        drawList->AddConvexPolyFilled(values.data(), static_cast<int>(values.size()), static_cast<ImU32>(color));
    }
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPathClear(
    JNIEnv* env,
    jclass,
    jint layer
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->PathClear();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPathLineTo(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x,
    jfloat y
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->PathLineTo(ImVec2(x, y));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPathArcTo(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x,
    jfloat y,
    jfloat radius,
    jfloat angleMin,
    jfloat angleMax,
    jint segments
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->PathArcTo(
        ImVec2(x, y),
        std::max(0.0F, static_cast<float>(radius)),
        angleMin,
        angleMax,
        std::clamp(static_cast<int>(segments), 0, 512)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPathArcToFast(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x,
    jfloat y,
    jfloat radius,
    jint minOf12,
    jint maxOf12
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->PathArcToFast(ImVec2(x, y), std::max(0.0F, static_cast<float>(radius)), minOf12, maxOf12);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPathBezierCubicCurveTo(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x2,
    jfloat y2,
    jfloat x3,
    jfloat y3,
    jfloat x4,
    jfloat y4,
    jint segments
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->PathBezierCubicCurveTo(
        ImVec2(x2, y2),
        ImVec2(x3, y3),
        ImVec2(x4, y4),
        std::clamp(static_cast<int>(segments), 0, 512)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPathBezierQuadraticCurveTo(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat x2,
    jfloat y2,
    jfloat x3,
    jfloat y3,
    jint segments
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->PathBezierQuadraticCurveTo(
        ImVec2(x2, y2),
        ImVec2(x3, y3),
        std::clamp(static_cast<int>(segments), 0, 512)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPathRect(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat minX,
    jfloat minY,
    jfloat maxX,
    jfloat maxY,
    jfloat rounding,
    jint flags
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->PathRect(
        ImVec2(minX, minY),
        ImVec2(maxX, maxY),
        std::max(0.0F, static_cast<float>(rounding)),
        static_cast<ImDrawFlags>(flags)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPathStroke(
    JNIEnv* env,
    jclass,
    jint layer,
    jint color,
    jfloat thickness,
    jint flags
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->PathStroke(
        static_cast<ImU32>(color),
        std::max(0.1F, static_cast<float>(thickness)),
        static_cast<ImDrawFlags>(flags)
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPathFill(
    JNIEnv* env,
    jclass,
    jint layer,
    jint color,
    jboolean concave
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    if (concave == JNI_TRUE) {
        drawList->PathFillConcave(static_cast<ImU32>(color));
    } else {
        drawList->PathFillConvex(static_cast<ImU32>(color));
    }
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPushClipRect(
    JNIEnv* env,
    jclass,
    jint layer,
    jfloat minX,
    jfloat minY,
    jfloat maxX,
    jfloat maxY,
    jboolean intersectWithCurrent
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr) return;
    drawList->PushClipRect(ImVec2(minX, minY), ImVec2(maxX, maxY), intersectWithCurrent == JNI_TRUE);
    gState.clipRectDepths[drawList] += 1;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDrawPopClipRect(
    JNIEnv* env,
    jclass,
    jint layer
) {
    ImDrawList* drawList = ResolveDrawList(env, layer);
    if (drawList == nullptr || !ConsumeClipRectDepth(env, drawList)) return;
    drawList->PopClipRect();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePushClipRect(
    JNIEnv* env,
    jclass,
    jfloat minX,
    jfloat minY,
    jfloat maxX,
    jfloat maxY,
    jboolean intersectWithCurrent
) {
    if (!RequireFrame(env)) return;
    ImGui::PushClipRect(ImVec2(minX, minY), ImVec2(maxX, maxY), intersectWithCurrent == JNI_TRUE);
    gState.clipRectDepths[ImGui::GetWindowDrawList()] += 1;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePopClipRect(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env) || !ConsumeClipRectDepth(env, ImGui::GetWindowDrawList())) return;
    ImGui::PopClipRect();
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

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetKeyboardFocusHere(
    JNIEnv* env,
    jclass,
    jint offset
) {
    if (!RequireFrame(env)) return;
    ImGui::SetKeyboardFocusHere(static_cast<int>(offset));
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

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginChildEx(
    JNIEnv* env,
    jclass,
    jstring id,
    jfloat width,
    jfloat height,
    jint childFlags,
    jint windowFlags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string label = JStringToUtf8(env, id);
    return ImGui::BeginChild(
        label.empty() ? "##child" : label.c_str(),
        ImVec2(width, height),
        static_cast<ImGuiChildFlags>(childFlags),
        static_cast<ImGuiWindowFlags>(windowFlags)
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
    const jsize itemCount = env->GetArrayLength(items);
    if (itemCount <= 0) {
        ThrowIllegalArgument(env, "Combo items must not be empty");
        return JNI_FALSE;
    }
    if (itemCount > static_cast<jsize>(kComboMaxItems)) {
        ThrowIllegalArgument(env, "Combo accepts at most 512 items");
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

// listClipper (R2.1): Begin, then Step until it returns null; every Step yields the visible range [start, end).
extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeListClipperBegin(
    JNIEnv* env,
    jclass,
    jint itemsCount,
    jfloat itemsHeight,
    jintArray includeItems
) {
    if (!RequireFrame(env)) return;
    if (itemsCount < 0) {
        ThrowIllegalArgument(env, "listClipper item count must not be negative");
        return;
    }
    auto clipper = std::make_unique<ImGuiListClipper>();
    clipper->Begin(static_cast<int>(itemsCount), itemsHeight > 0.0F ? itemsHeight : -1.0F);
    if (includeItems != nullptr) {
        const jsize length = env->GetArrayLength(includeItems);
        std::vector<jint> indices(static_cast<size_t>(length));
        if (length > 0) {
            env->GetIntArrayRegion(includeItems, 0, length, indices.data());
        }
        for (const jint index : indices) {
            if (index >= 0 && index < itemsCount) {
                clipper->IncludeItemByIndex(static_cast<int>(index));
            }
        }
    }
    gState.clippers.push_back(std::move(clipper));
}

extern "C" JNIEXPORT jintArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeListClipperStep(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return nullptr;
    if (gState.clippers.empty()) {
        ThrowIllegalState(env, "listClipper step without an open clipper");
        return nullptr;
    }
    ImGuiListClipper& clipper = *gState.clippers.back();
    if (!clipper.Step()) {
        return nullptr;
    }
    const jint range[] = {
        static_cast<jint>(clipper.DisplayStart),
        static_cast<jint>(clipper.DisplayEnd),
    };
    jintArray result = env->NewIntArray(2);
    if (result != nullptr) {
        env->SetIntArrayRegion(result, 0, 2, range);
    }
    return result;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeListClipperEnd(
    JNIEnv*,
    jclass
) {
    if (gState.clippers.empty()) return;
    // Runs from a finally block: never throw over the callback's own exception.
    if (!gState.ready || !gState.frameActive || ImGui::GetCurrentContext() == nullptr) {
        DiscardOpenClippers();
        return;
    }
    gState.clippers.back()->End();
    gState.clippers.pop_back();
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
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeResetStyle(
    JNIEnv* env,
    jclass,
    jint colorPreset
) {
    if (!RequireContext(env)) return;
    if (colorPreset < 0 || colorPreset > 2) {
        ThrowIllegalArgument(env, "Style color preset must be Dark (0), Light (1), or Classic (2)");
        return;
    }
    ResetStyle(static_cast<int>(colorPreset));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetStyleColor(
    JNIEnv* env,
    jclass,
    jint index,
    jfloat red,
    jfloat green,
    jfloat blue,
    jfloat alpha
) {
    if (!RequireContext(env)) return;
    if (index < 0 || index >= ImGuiCol_COUNT) {
        ThrowIllegalArgument(env, "Style color index is out of range");
        return;
    }
    if (!std::isfinite(red) || !std::isfinite(green) ||
        !std::isfinite(blue) || !std::isfinite(alpha)
    ) {
        ThrowIllegalArgument(env, "Style color components must be finite numbers");
        return;
    }
    ImGui::GetStyle().Colors[index] = ImVec4(red, green, blue, alpha);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetStyleVar(
    JNIEnv* env,
    jclass,
    jint index,
    jfloat x,
    jfloat y
) {
    if (!RequireContext(env)) return;
    if (index < 0 || index >= ImGuiStyleVar_COUNT) {
        ThrowIllegalArgument(env, "Style variable index is out of range");
        return;
    }
    if (!std::isfinite(x) || !std::isfinite(y)) {
        ThrowIllegalArgument(env, "Style variable values must be finite numbers");
        return;
    }
    const ImGuiStyleVarInfo* info = ImGui::GetStyleVarInfo(static_cast<ImGuiStyleVar>(index));
    if (info->DataType != ImGuiDataType_Float || (info->Count != 1U && info->Count != 2U)) {
        ThrowIllegalArgument(env, "Unsupported style variable type");
        return;
    }
    float* target = static_cast<float*>(info->GetVarPtr(&ImGui::GetStyle()));
    target[0] = x;
    if (info->Count == 2U) {
        target[1] = y;
    }
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

// The debug and information windows of Dear ImGui (R3.1), numbered as the script facade's showToolWindow calls them.
// ShowStyleEditor and ShowUserGuide draw a block, not a window, upstream, so they get a window of their own here.
enum ToolWindow {
    kToolWindowMetrics = 0,
    kToolWindowDebugLog = 1,
    kToolWindowIdStackTool = 2,
    kToolWindowStyleEditor = 3,
    kToolWindowAbout = 4,
    kToolWindowUserGuide = 5,
};

void ShowToolWindow(int tool, bool* open) {
    switch (tool) {
        case kToolWindowMetrics:
            ImGui::ShowMetricsWindow(open);
            break;
        case kToolWindowDebugLog:
            ImGui::ShowDebugLogWindow(open);
            break;
        case kToolWindowIdStackTool:
            ImGui::ShowIDStackToolWindow(open);
            break;
        case kToolWindowStyleEditor:
            if (ImGui::Begin("Dear ImGui Style Editor", open)) {
                ImGui::ShowStyleEditor();
            }
            ImGui::End();
            break;
        case kToolWindowAbout:
            ImGui::ShowAboutWindow(open);
            break;
        case kToolWindowUserGuide:
            if (ImGui::Begin("Dear ImGui User Guide", open)) {
                ImGui::ShowUserGuide();
            }
            ImGui::End();
            break;
        default:
            break;
    }
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeShowToolWindow(
    JNIEnv* env,
    jclass,
    jint tool,
    jbooleanArray open
) {
    if (!RequireFrame(env)) return;
    if (tool < kToolWindowMetrics || tool > kToolWindowUserGuide) {
        ThrowIllegalArgument(env, "Unknown tool window");
        return;
    }
    bool openValue = true;
    bool hasOpen = false;
    if (!ReadOptionalBoolean(env, open, openValue, hasOpen)) return;
    ShowToolWindow(tool, hasOpen ? &openValue : nullptr);
    WriteOptionalBoolean(env, open, hasOpen, openValue);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetDebugMode(
    JNIEnv* env,
    jclass,
    jboolean enabled
) {
    if (!RequireContext(env)) return;
    const bool debug = enabled == JNI_TRUE;
    ImGuiContext& context = *GImGui;
    context.IO.ConfigErrorRecoveryEnableDebugLog = debug;
    context.ErrorCallback = debug ? OnImGuiError : nullptr;
    context.ErrorCallbackUserData = nullptr;
    gImGuiAssertReporting = debug;
    gState.debugMode = debug;
    gState.showMetricsWindow = debug;
    gState.showDebugLogWindow = debug;
    gState.debugMessages.clear();
}

// Debug mode: the Metrics and Debug Log windows, shown after the render callback until the user closes them. What the
// callback left open is closed first (and reported), so they are not nested in a window of the script.
extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeShowDebugWindows(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env) || !gState.debugMode) return;
    ImGui::ErrorRecoveryTryToRecoverState(&GImGui->StackSizesInNewFrame);
    if (gState.showMetricsWindow) {
        ShowToolWindow(kToolWindowMetrics, &gState.showMetricsWindow);
    }
    if (gState.showDebugLogWindow) {
        ShowToolWindow(kToolWindowDebugLog, &gState.showDebugLogWindow);
    }
}

// After the render callback threw: closes the windows, tables and pushed styles it left open without reporting them as
// usage errors (the script reports the exception), so the frame can still be presented.
extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeRecoverFrame(
    JNIEnv*,
    jclass
) {
    if (!gState.ready || !gState.frameActive || ImGui::GetCurrentContext() == nullptr) return;
    ImGuiContext& context = *GImGui;
    ImGuiIO& io = context.IO;
    const bool tooltip = io.ConfigErrorRecoveryEnableTooltip;
    const bool debugLog = io.ConfigErrorRecoveryEnableDebugLog;
    const bool assertReporting = gImGuiAssertReporting;
    const ImGuiErrorCallback callback = context.ErrorCallback;
    io.ConfigErrorRecoveryEnableTooltip = false;
    io.ConfigErrorRecoveryEnableDebugLog = false;
    context.ErrorCallback = nullptr;
    gImGuiAssertReporting = false;
    ImGui::ErrorRecoveryTryToRecoverState(&context.StackSizesInNewFrame);
    io.ConfigErrorRecoveryEnableTooltip = tooltip;
    io.ConfigErrorRecoveryEnableDebugLog = debugLog;
    context.ErrorCallback = callback;
    gImGuiAssertReporting = assertReporting;
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTakeDebugMessages(
    JNIEnv* env,
    jclass
) {
    if (gState.debugMessages.empty()) {
        return nullptr;
    }
    jclass stringClass = env->FindClass("java/lang/String");
    if (stringClass == nullptr) {
        return nullptr;
    }
    jobjectArray result = env->NewObjectArray(static_cast<jsize>(gState.debugMessages.size()), stringClass, nullptr);
    env->DeleteLocalRef(stringClass);
    if (result == nullptr) {
        return nullptr;
    }
    for (size_t index = 0; index < gState.debugMessages.size(); ++index) {
        jstring message = Utf8ToJString(env, gState.debugMessages[index]);
        if (message != nullptr) {
            env->SetObjectArrayElement(result, static_cast<jsize>(index), message);
            env->DeleteLocalRef(message);
        }
    }
    gState.debugMessages.clear();
    return result;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSeparatorText(
    JNIEnv* env,
    jclass,
    jstring label
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, label);
    ImGui::SeparatorText(value.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBullet(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::Bullet();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBulletText(
    JNIEnv* env,
    jclass,
    jstring text
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, text);
    ImGui::BulletText("%s", value.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeLabelText(
    JNIEnv* env,
    jclass,
    jstring label,
    jstring text
) {
    if (!RequireFrame(env)) return;
    const std::string labelValue = JStringToUtf8(env, label);
    const std::string textValue = JStringToUtf8(env, text);
    ImGui::LabelText(labelValue.c_str(), "%s", textValue.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTextDisabled(
    JNIEnv* env,
    jclass,
    jstring text
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, text);
    ImGui::TextDisabled("%s", value.c_str());
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeArrowButton(
    JNIEnv* env,
    jclass,
    jstring id,
    jint direction
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, id);
    const ImGuiDir safeDirection = direction >= ImGuiDir_Left && direction <= ImGuiDir_Down
        ? static_cast<ImGuiDir>(direction)
        : ImGuiDir_Down;
    return ImGui::ArrowButton(value.c_str(), safeDirection) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeInvisibleButton(
    JNIEnv* env,
    jclass,
    jstring id,
    jfloat width,
    jfloat height,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, id);
    return ImGui::InvisibleButton(
        value.empty() ? "##invisible" : value.c_str(),
        ImVec2(width > 0.0F ? width : 1.0F, height > 0.0F ? height : 1.0F),
        static_cast<ImGuiButtonFlags>(flags)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeInputInt(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray value,
    jint step,
    jint stepFast,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    jint current = 0;
    if (!ReadIntReference(env, value, current)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    int nativeValue = current;
    const bool changed = ImGui::InputInt(
        text.c_str(),
        &nativeValue,
        step,
        stepFast,
        static_cast<ImGuiInputTextFlags>(flags)
    );
    WriteIntReference(env, value, nativeValue);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeInputFloat(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray value,
    jfloat step,
    jfloat stepFast,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateArrayLength(env, value, 1, "Float reference must contain at least one value")) return JNI_FALSE;
    jfloat* data = env->GetFloatArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const bool changed = ImGui::InputFloat(
        text.c_str(),
        data,
        step,
        stepFast,
        formatText.empty() ? "%.3f" : formatText.c_str(),
        static_cast<ImGuiInputTextFlags>(flags)
    );
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeInputTextMultiline(
    JNIEnv* env,
    jclass,
    jstring label,
    jobjectArray value,
    jint maxLength,
    jfloat width,
    jfloat height,
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
    const bool changed = ImGui::InputTextMultiline(
        text.c_str(),
        buffer.data(),
        buffer.size(),
        ImVec2(width, height),
        static_cast<ImGuiInputTextFlags>(flags)
    );
    if (changed) {
        WriteStringReference(env, value, buffer.data());
    }
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginListBox(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloat width,
    jfloat height
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    return ImGui::BeginListBox(
        text.empty() ? "##listbox" : text.c_str(),
        ImVec2(width, height)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndListBox(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndListBox();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeListBox(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray currentItem,
    jobjectArray items,
    jint heightInItems
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    jint selected = 0;
    if (!ReadIntReference(env, currentItem, selected)) return JNI_FALSE;
    std::vector<std::string> strings;
    if (!ReadStringItems(env, items, strings, "ListBox items must not be empty")) return JNI_FALSE;
    std::vector<const char*> pointers;
    pointers.reserve(strings.size());
    for (const std::string& item : strings) pointers.push_back(item.c_str());
    int nativeSelected = std::clamp(static_cast<int>(selected), 0, static_cast<int>(strings.size()) - 1);
    const std::string text = JStringToUtf8(env, label);
    const bool changed = ImGui::ListBox(
        text.c_str(),
        &nativeSelected,
        pointers.data(),
        static_cast<int>(pointers.size()),
        heightInItems
    );
    WriteIntReference(env, currentItem, nativeSelected);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeColorPicker3(
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
    const bool changed = ImGui::ColorPicker3(text.c_str(), data, static_cast<ImGuiColorEditFlags>(flags));
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeColorPicker4(
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
    const bool changed = ImGui::ColorPicker4(text.c_str(), data, static_cast<ImGuiColorEditFlags>(flags));
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeColorButton(
    JNIEnv* env,
    jclass,
    jstring id,
    jfloat red,
    jfloat green,
    jfloat blue,
    jfloat alpha,
    jint flags,
    jfloat width,
    jfloat height
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, id);
    return ImGui::ColorButton(
        value.empty() ? "##color" : value.c_str(),
        ImVec4(red, green, blue, alpha),
        static_cast<ImGuiColorEditFlags>(flags),
        ImVec2(width, height)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePlotLines(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray values,
    jint valuesOffset,
    jint stride,
    jstring overlay,
    jfloat scaleMin,
    jfloat scaleMax,
    jfloat width,
    jfloat height
) {
    if (!RequireFrame(env)) return;
    if (!ValidateArrayLength(env, values, 1, "Plot values must contain at least one value")) return;
    jfloat* data = env->GetFloatArrayElements(values, nullptr);
    if (data == nullptr) return;
    const jsize count = env->GetArrayLength(values);
    const std::string text = JStringToUtf8(env, label);
    const bool hasOverlay = overlay != nullptr;
    const std::string overlayText = JStringToUtf8(env, overlay);
    const PlotSamples samples = ResolvePlotSamples(count, valuesOffset, stride);
    ImGui::PlotLines(
        text.c_str(),
        data,
        samples.count,
        samples.offset,
        hasOverlay ? overlayText.c_str() : nullptr,
        std::isfinite(scaleMin) ? static_cast<float>(scaleMin) : kFloatMax,
        std::isfinite(scaleMax) ? static_cast<float>(scaleMax) : kFloatMax,
        ImVec2(width, height),
        samples.strideBytes
    );
    env->ReleaseFloatArrayElements(values, data, JNI_ABORT);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePlotHistogram(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray values,
    jint valuesOffset,
    jint stride,
    jstring overlay,
    jfloat scaleMin,
    jfloat scaleMax,
    jfloat width,
    jfloat height
) {
    if (!RequireFrame(env)) return;
    if (!ValidateArrayLength(env, values, 1, "Plot values must contain at least one value")) return;
    jfloat* data = env->GetFloatArrayElements(values, nullptr);
    if (data == nullptr) return;
    const jsize count = env->GetArrayLength(values);
    const std::string text = JStringToUtf8(env, label);
    const bool hasOverlay = overlay != nullptr;
    const std::string overlayText = JStringToUtf8(env, overlay);
    const PlotSamples samples = ResolvePlotSamples(count, valuesOffset, stride);
    ImGui::PlotHistogram(
        text.c_str(),
        data,
        samples.count,
        samples.offset,
        hasOverlay ? overlayText.c_str() : nullptr,
        std::isfinite(scaleMin) ? static_cast<float>(scaleMin) : kFloatMax,
        std::isfinite(scaleMax) ? static_cast<float>(scaleMax) : kFloatMax,
        ImVec2(width, height),
        samples.strideBytes
    );
    env->ReleaseFloatArrayElements(values, data, JNI_ABORT);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTreeNodeEx(
    JNIEnv* env,
    jclass,
    jstring label,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    return ImGui::TreeNodeEx(text.c_str(), static_cast<ImGuiTreeNodeFlags>(flags))
        ? JNI_TRUE
        : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeVSliderFloat(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloat width,
    jfloat height,
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
    const bool changed = ImGui::VSliderFloat(
        text.c_str(),
        ImVec2(width, height),
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
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeVSliderInt(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloat width,
    jfloat height,
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
    const bool changed = ImGui::VSliderInt(
        text.c_str(),
        ImVec2(width, height),
        &nativeValue,
        min,
        max,
        formatText.empty() ? "%d" : formatText.c_str(),
        static_cast<ImGuiSliderFlags>(flags)
    );
    WriteIntReference(env, value, nativeValue);
    return changed ? JNI_TRUE : JNI_FALSE;
}

// Multi-component and range widgets (R3.4). The script facade passes the components in one array (imgui.floats /
// imgui.ints or a {value: [...]} reference), as DragFloat2 .. 4 and the other forms take float v[2] .. v[4]; they are
// the DragScalarN / SliderScalarN / InputScalarN calls the upstream forms make.
static_assert(sizeof(jint) == sizeof(int), "ImGuiDataType_S32 widgets write jint arrays in place");

bool ValidateComponents(JNIEnv* env, jarray array, jint components) {
    if (components < 2 || components > 4) {
        ThrowIllegalArgument(env, "Multi-component widgets take 2 to 4 components");
        return false;
    }
    return ValidateArrayLength(env, array, components, "The reference has fewer values than the widget has components");
}

const char* FormatOrDefault(const std::string& format, const char* fallback) {
    return format.empty() ? fallback : format.c_str();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDragFloatN(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray value,
    jint components,
    jfloat speed,
    jfloat min,
    jfloat max,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateComponents(env, value, components)) return JNI_FALSE;
    jfloat* data = env->GetFloatArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const bool changed = ImGui::DragScalarN(
        text.c_str(),
        ImGuiDataType_Float,
        data,
        components,
        speed,
        &min,
        &max,
        FormatOrDefault(formatText, "%.3f"),
        static_cast<ImGuiSliderFlags>(flags)
    );
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDragIntN(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray value,
    jint components,
    jfloat speed,
    jint min,
    jint max,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateComponents(env, value, components)) return JNI_FALSE;
    jint* data = env->GetIntArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const bool changed = ImGui::DragScalarN(
        text.c_str(),
        ImGuiDataType_S32,
        data,
        components,
        speed,
        &min,
        &max,
        FormatOrDefault(formatText, "%d"),
        static_cast<ImGuiSliderFlags>(flags)
    );
    env->ReleaseIntArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSliderFloatN(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray value,
    jint components,
    jfloat min,
    jfloat max,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateComponents(env, value, components)) return JNI_FALSE;
    jfloat* data = env->GetFloatArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const bool changed = ImGui::SliderScalarN(
        text.c_str(),
        ImGuiDataType_Float,
        data,
        components,
        &min,
        &max,
        FormatOrDefault(formatText, "%.3f"),
        static_cast<ImGuiSliderFlags>(flags)
    );
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSliderIntN(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray value,
    jint components,
    jint min,
    jint max,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateComponents(env, value, components)) return JNI_FALSE;
    jint* data = env->GetIntArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const bool changed = ImGui::SliderScalarN(
        text.c_str(),
        ImGuiDataType_S32,
        data,
        components,
        &min,
        &max,
        FormatOrDefault(formatText, "%d"),
        static_cast<ImGuiSliderFlags>(flags)
    );
    env->ReleaseIntArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeInputFloatN(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray value,
    jint components,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateComponents(env, value, components)) return JNI_FALSE;
    jfloat* data = env->GetFloatArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const bool changed = ImGui::InputScalarN(
        text.c_str(),
        ImGuiDataType_Float,
        data,
        components,
        nullptr,
        nullptr,
        FormatOrDefault(formatText, "%.3f"),
        static_cast<ImGuiInputTextFlags>(flags)
    );
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeInputIntN(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray value,
    jint components,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateComponents(env, value, components)) return JNI_FALSE;
    jint* data = env->GetIntArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const bool changed = ImGui::InputScalarN(
        text.c_str(),
        ImGuiDataType_S32,
        data,
        components,
        nullptr,
        nullptr,
        "%d",
        static_cast<ImGuiInputTextFlags>(flags)
    );
    env->ReleaseIntArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDragFloatRange2(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray currentMin,
    jfloatArray currentMax,
    jfloat speed,
    jfloat min,
    jfloat max,
    jstring format,
    jstring formatMax,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateArrayLength(env, currentMin, 1, "Float reference must contain at least one value")) return JNI_FALSE;
    if (!ValidateArrayLength(env, currentMax, 1, "Float reference must contain at least one value")) return JNI_FALSE;
    jfloat low = 0.0F;
    jfloat high = 0.0F;
    env->GetFloatArrayRegion(currentMin, 0, 1, &low);
    env->GetFloatArrayRegion(currentMax, 0, 1, &high);
    if (env->ExceptionCheck()) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const std::string formatMaxText = JStringToUtf8(env, formatMax);
    const bool changed = ImGui::DragFloatRange2(
        text.c_str(),
        &low,
        &high,
        speed,
        min,
        max,
        FormatOrDefault(formatText, "%.3f"),
        formatMaxText.empty() ? nullptr : formatMaxText.c_str(),
        static_cast<ImGuiSliderFlags>(flags)
    );
    env->SetFloatArrayRegion(currentMin, 0, 1, &low);
    env->SetFloatArrayRegion(currentMax, 0, 1, &high);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeDragIntRange2(
    JNIEnv* env,
    jclass,
    jstring label,
    jintArray currentMin,
    jintArray currentMax,
    jfloat speed,
    jint min,
    jint max,
    jstring format,
    jstring formatMax,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    jint low = 0;
    jint high = 0;
    if (!ReadIntReference(env, currentMin, low) || !ReadIntReference(env, currentMax, high)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const std::string formatMaxText = JStringToUtf8(env, formatMax);
    int nativeLow = low;
    int nativeHigh = high;
    const bool changed = ImGui::DragIntRange2(
        text.c_str(),
        &nativeLow,
        &nativeHigh,
        speed,
        min,
        max,
        FormatOrDefault(formatText, "%d"),
        formatMaxText.empty() ? nullptr : formatMaxText.c_str(),
        static_cast<ImGuiSliderFlags>(flags)
    );
    WriteIntReference(env, currentMin, nativeLow);
    WriteIntReference(env, currentMax, nativeHigh);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSliderAngle(
    JNIEnv* env,
    jclass,
    jstring label,
    jfloatArray value,
    jfloat degreesMin,
    jfloat degreesMax,
    jstring format,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!ValidateArrayLength(env, value, 1, "Float reference must contain at least one value")) return JNI_FALSE;
    jfloat* data = env->GetFloatArrayElements(value, nullptr);
    if (data == nullptr) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string formatText = JStringToUtf8(env, format);
    const bool changed = ImGui::SliderAngle(
        text.c_str(),
        data,
        degreesMin,
        degreesMax,
        FormatOrDefault(formatText, "%.0f deg"),
        static_cast<ImGuiSliderFlags>(flags)
    );
    env->ReleaseFloatArrayElements(value, data, 0);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeToggle(
    JNIEnv* env,
    jclass,
    jstring label,
    jbooleanArray value
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    bool checked = false;
    bool present = false;
    if (!ReadOptionalBoolean(env, value, checked, present) || !present) {
        if (!env->ExceptionCheck()) ThrowIllegalArgument(env, "Toggle value reference must not be null");
        return JNI_FALSE;
    }
    const std::string text = JStringToUtf8(env, label);
    const std::string visible = VisibleLabel(text);
    const bool changed = DrawToggle(
        text.empty() ? "##toggle" : text.c_str(),
        visible.c_str(),
        &checked
    );
    WriteOptionalBoolean(env, value, true, checked);
    return changed ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginCombo(
    JNIEnv* env,
    jclass,
    jstring label,
    jstring preview,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string text = JStringToUtf8(env, label);
    const std::string previewText = JStringToUtf8(env, preview);
    return ImGui::BeginCombo(
        text.empty() ? "##combo" : text.c_str(),
        previewText.c_str(),
        static_cast<ImGuiComboFlags>(flags)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndCombo(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndCombo();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeOpenPopup(
    JNIEnv* env,
    jclass,
    jstring id,
    jint flags
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, id);
    ImGui::OpenPopup(value.empty() ? "##popup" : value.c_str(), static_cast<ImGuiPopupFlags>(flags));
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginPopup(
    JNIEnv* env,
    jclass,
    jstring id,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, id);
    return ImGui::BeginPopup(
        value.empty() ? "##popup" : value.c_str(),
        static_cast<ImGuiWindowFlags>(flags)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginPopupModal(
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
    const std::string value = JStringToUtf8(env, name);
    const bool visible = ImGui::BeginPopupModal(
        value.empty() ? "##modal" : value.c_str(),
        hasOpen ? &openValue : nullptr,
        static_cast<ImGuiWindowFlags>(flags)
    );
    WriteOptionalBoolean(env, open, hasOpen, openValue);
    return visible ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginPopupContextItem(
    JNIEnv* env,
    jclass,
    jstring id,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, id);
    const char* nativeId = id == nullptr || value.empty() ? nullptr : value.c_str();
    return ImGui::BeginPopupContextItem(
        nativeId,
        static_cast<ImGuiPopupFlags>(flags)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginPopupContextWindow(
    JNIEnv* env,
    jclass,
    jstring id,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, id);
    const char* nativeId = id == nullptr || value.empty() ? nullptr : value.c_str();
    return ImGui::BeginPopupContextWindow(
        nativeId,
        static_cast<ImGuiPopupFlags>(flags)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndPopup(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndPopup();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeCloseCurrentPopup(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::CloseCurrentPopup();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsPopupOpen(
    JNIEnv* env,
    jclass,
    jstring id,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, id);
    return ImGui::IsPopupOpen(
        value.empty() ? "##popup" : value.c_str(),
        static_cast<ImGuiPopupFlags>(flags)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginMenuBar(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::BeginMenuBar() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndMenuBar(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndMenuBar();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginMenu(
    JNIEnv* env,
    jclass,
    jstring label,
    jboolean enabled
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, label);
    return ImGui::BeginMenu(
        value.empty() ? "##menu" : value.c_str(),
        enabled == JNI_TRUE
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndMenu(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndMenu();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeMenuItem(
    JNIEnv* env,
    jclass,
    jstring label,
    jstring shortcut,
    jbooleanArray selected,
    jboolean enabled
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    bool selectedValue = false;
    bool hasSelected = false;
    if (!ReadOptionalBoolean(env, selected, selectedValue, hasSelected)) return JNI_FALSE;
    const std::string value = JStringToUtf8(env, label);
    const bool hasShortcut = shortcut != nullptr;
    const std::string shortcutText = JStringToUtf8(env, shortcut);
    const bool activated = ImGui::MenuItem(
        value.c_str(),
        hasShortcut ? shortcutText.c_str() : nullptr,
        hasSelected ? &selectedValue : nullptr,
        enabled == JNI_TRUE
    );
    WriteOptionalBoolean(env, selected, hasSelected, selectedValue);
    return activated ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetTooltip(
    JNIEnv* env,
    jclass,
    jstring text
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, text);
    ImGui::SetTooltip("%s", value.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetItemTooltip(
    JNIEnv* env,
    jclass,
    jstring text
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, text);
    ImGui::SetItemTooltip("%s", value.c_str());
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginTooltip(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::BeginTooltip() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginItemTooltip(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::BeginItemTooltip() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndTooltip(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndTooltip();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginTable(
    JNIEnv* env,
    jclass,
    jstring id,
    jint columns,
    jint flags,
    jfloat outerWidth,
    jfloat outerHeight
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (columns < 1) {
        ThrowIllegalArgument(env, "Table must declare at least one column");
        return JNI_FALSE;
    }
    const std::string value = JStringToUtf8(env, id);
    return ImGui::BeginTable(
        value.empty() ? "##table" : value.c_str(),
        columns,
        static_cast<ImGuiTableFlags>(flags),
        ImVec2(outerWidth, outerHeight)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndTable(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndTable();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTableNextRow(
    JNIEnv* env,
    jclass,
    jint rowFlags,
    jfloat minRowHeight
) {
    if (!RequireFrame(env)) return;
    ImGui::TableNextRow(static_cast<ImGuiTableRowFlags>(rowFlags), minRowHeight);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTableNextColumn(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::TableNextColumn() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTableSetColumnIndex(
    JNIEnv* env,
    jclass,
    jint columnIndex
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::TableSetColumnIndex(columnIndex) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTableSetupColumn(
    JNIEnv* env,
    jclass,
    jstring label,
    jint flags,
    jfloat initWidthOrWeight,
    jint userId
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, label);
    ImGui::TableSetupColumn(
        value.c_str(),
        static_cast<ImGuiTableColumnFlags>(flags),
        initWidthOrWeight,
        static_cast<ImGuiID>(userId)
    );
}

// R3.3: the sort specs of the current table, null when there is no table or it is not sortable, otherwise
// [specsDirty, count, then columnIndex, columnUserId, sortDirection, sortOrder per spec]. The caller sorts when
// specsDirty is set, so reading the specs clears it, as Dear ImGui expects after sorting.
extern "C" JNIEXPORT jintArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTableGetSortSpecs(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return nullptr;
    ImGuiTableSortSpecs* sortSpecs = ImGui::TableGetSortSpecs();
    if (sortSpecs == nullptr) {
        return nullptr;
    }
    const int count = std::max(0, sortSpecs->SpecsCount);
    std::vector<jint> values;
    values.reserve(static_cast<size_t>(2 + count * 4));
    values.push_back(sortSpecs->SpecsDirty ? 1 : 0);
    values.push_back(static_cast<jint>(count));
    for (int index = 0; index < count; ++index) {
        const ImGuiTableColumnSortSpecs& spec = sortSpecs->Specs[index];
        values.push_back(static_cast<jint>(spec.ColumnIndex));
        values.push_back(static_cast<jint>(spec.ColumnUserID));
        values.push_back(static_cast<jint>(spec.SortDirection));
        values.push_back(static_cast<jint>(spec.SortOrder));
    }
    sortSpecs->SpecsDirty = false;
    jintArray result = env->NewIntArray(static_cast<jsize>(values.size()));
    if (result != nullptr) {
        env->SetIntArrayRegion(result, 0, static_cast<jsize>(values.size()), values.data());
    }
    return result;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTableSetupScrollFreeze(
    JNIEnv* env,
    jclass,
    jint columns,
    jint rows
) {
    if (!RequireFrame(env)) return;
    ImGui::TableSetupScrollFreeze(std::max(0, static_cast<int>(columns)), std::max(0, static_cast<int>(rows)));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTableHeadersRow(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::TableHeadersRow();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeTableSetBgColor(
    JNIEnv* env,
    jclass,
    jint target,
    jfloat red,
    jfloat green,
    jfloat blue,
    jfloat alpha,
    jint columnIndex
) {
    if (!RequireFrame(env)) return;
    ImGui::TableSetBgColor(
        static_cast<ImGuiTableBgTarget>(target),
        ImGui::GetColorU32(ImVec4(red, green, blue, alpha)),
        columnIndex
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePushStyleColor(
    JNIEnv* env,
    jclass,
    jint index,
    jfloat red,
    jfloat green,
    jfloat blue,
    jfloat alpha
) {
    if (!RequireFrame(env)) return;
    if (index < 0 || index >= ImGuiCol_COUNT) {
        ThrowIllegalArgument(env, "Style color index is out of range");
        return;
    }
    ImGui::PushStyleColor(static_cast<ImGuiCol>(index), ImVec4(red, green, blue, alpha));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePopStyleColor(
    JNIEnv* env,
    jclass,
    jint count
) {
    if (!RequireFrame(env)) return;
    ImGui::PopStyleColor(std::max(1, static_cast<int>(count)));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePushStyleVar(
    JNIEnv* env,
    jclass,
    jint index,
    jfloat value
) {
    if (!RequireFrame(env)) return;
    if (index < 0 || index >= ImGuiStyleVar_COUNT) {
        ThrowIllegalArgument(env, "Style variable index is out of range");
        return;
    }
    ImGui::PushStyleVar(static_cast<ImGuiStyleVar>(index), static_cast<float>(value));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePushStyleVar2(
    JNIEnv* env,
    jclass,
    jint index,
    jfloat x,
    jfloat y
) {
    if (!RequireFrame(env)) return;
    if (index < 0 || index >= ImGuiStyleVar_COUNT) {
        ThrowIllegalArgument(env, "Style variable index is out of range");
        return;
    }
    ImGui::PushStyleVar(static_cast<ImGuiStyleVar>(index), ImVec2(x, y));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePopStyleVar(
    JNIEnv* env,
    jclass,
    jint count
) {
    if (!RequireFrame(env)) return;
    ImGui::PopStyleVar(std::max(1, static_cast<int>(count)));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetWindowFontScale(
    JNIEnv* env,
    jclass,
    jfloat scale
) {
    if (!RequireFrame(env)) return;
    ImGui::SetWindowFontScale(std::clamp(static_cast<float>(scale), 0.25F, 4.0F));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePushFont(
    JNIEnv* env,
    jclass,
    jint index,
    jfloat fontSize
) {
    if (!RequireFrame(env)) return;
    if (index < 0 || static_cast<size_t>(index) >= gState.fonts.size()) {
        ThrowIllegalArgument(env, "Font index is out of range");
        return;
    }
    if (!std::isfinite(fontSize)) {
        ThrowIllegalArgument(env, "Font size must be a finite number");
        return;
    }
    ImFont* font = gState.fonts[static_cast<size_t>(index)];
    if (font == nullptr) {
        ThrowIllegalState(env, "Requested font is unavailable");
        return;
    }
    const float resolvedSize = fontSize > 0.0F
        ? std::clamp(static_cast<float>(fontSize), 4.0F, 128.0F) * gState.fontDensity
        : gState.fontSizes[static_cast<size_t>(index)];
    ImGui::PushFont(font, resolvedSize);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePopFont(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    if (GImGui == nullptr || GImGui->FontStack.empty()) {
        ThrowIllegalState(env, "PopFont called without a matching PushFont");
        return;
    }
    ImGui::PopFont();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePushIdString(
    JNIEnv* env,
    jclass,
    jstring id
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, id);
    ImGui::PushID(value.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePushIdInt(
    JNIEnv* env,
    jclass,
    jint id
) {
    if (!RequireFrame(env)) return;
    ImGui::PushID(static_cast<int>(id));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativePopId(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::PopID();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginGroup(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::BeginGroup();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndGroup(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndGroup();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIndent(
    JNIEnv* env,
    jclass,
    jfloat width
) {
    if (!RequireFrame(env)) return;
    ImGui::Indent(width);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeUnindent(
    JNIEnv* env,
    jclass,
    jfloat width
) {
    if (!RequireFrame(env)) return;
    ImGui::Unindent(width);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeAlignTextToFramePadding(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::AlignTextToFramePadding();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginDisabled(
    JNIEnv* env,
    jclass,
    jboolean disabled
) {
    if (!RequireFrame(env)) return;
    ImGui::BeginDisabled(disabled == JNI_TRUE);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndDisabled(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    ImGui::EndDisabled();
}

extern "C" JNIEXPORT jfloat JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetScrollX(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return 0.0F;
    return ImGui::GetScrollX();
}

extern "C" JNIEXPORT jfloat JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetScrollY(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return 0.0F;
    return ImGui::GetScrollY();
}

extern "C" JNIEXPORT jfloat JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetScrollMaxX(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return 0.0F;
    return ImGui::GetScrollMaxX();
}

extern "C" JNIEXPORT jfloat JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetScrollMaxY(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return 0.0F;
    return ImGui::GetScrollMaxY();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetScrollX(
    JNIEnv* env,
    jclass,
    jfloat value
) {
    if (!RequireFrame(env)) return;
    ImGui::SetScrollX(value);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetScrollY(
    JNIEnv* env,
    jclass,
    jfloat value
) {
    if (!RequireFrame(env)) return;
    ImGui::SetScrollY(value);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetScrollHereX(
    JNIEnv* env,
    jclass,
    jfloat centerRatio
) {
    if (!RequireFrame(env)) return;
    ImGui::SetScrollHereX(std::clamp(static_cast<float>(centerRatio), 0.0F, 1.0F));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetScrollHereY(
    JNIEnv* env,
    jclass,
    jfloat centerRatio
) {
    if (!RequireFrame(env)) return;
    ImGui::SetScrollHereY(std::clamp(static_cast<float>(centerRatio), 0.0F, 1.0F));
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsItemActive(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsItemActive() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsItemEdited(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsItemEdited() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsItemActivated(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsItemActivated() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsItemDeactivated(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsItemDeactivated() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsItemDeactivatedAfterEdit(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsItemDeactivatedAfterEdit() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsItemFocused(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsItemFocused() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsItemVisible(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsItemVisible() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsWindowHovered(
    JNIEnv* env,
    jclass,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsWindowHovered(static_cast<ImGuiHoveredFlags>(flags)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsWindowFocused(
    JNIEnv* env,
    jclass,
    jint flags
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsWindowFocused(static_cast<ImGuiFocusedFlags>(flags)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsWindowCollapsed(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsWindowCollapsed() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsWindowAppearing(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    return ImGui::IsWindowAppearing() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetMousePos(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return nullptr;
    return NewFloatPair(env, ImGui::GetMousePos());
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsMouseDown(
    JNIEnv* env,
    jclass,
    jint button
) {
    if (!RequireContext(env)) return JNI_FALSE;
    if (button < 0 || button >= ImGuiMouseButton_COUNT) return JNI_FALSE;
    return ImGui::IsMouseDown(static_cast<ImGuiMouseButton>(button)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsMouseClicked(
    JNIEnv* env,
    jclass,
    jint button,
    jboolean repeat
) {
    if (!RequireContext(env)) return JNI_FALSE;
    if (button < 0 || button >= ImGuiMouseButton_COUNT) return JNI_FALSE;
    return ImGui::IsMouseClicked(static_cast<ImGuiMouseButton>(button), repeat == JNI_TRUE)
        ? JNI_TRUE
        : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsMouseDoubleClicked(
    JNIEnv* env,
    jclass,
    jint button
) {
    if (!RequireContext(env)) return JNI_FALSE;
    if (button < 0 || button >= ImGuiMouseButton_COUNT) return JNI_FALSE;
    return ImGui::IsMouseDoubleClicked(static_cast<ImGuiMouseButton>(button)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsMouseReleased(
    JNIEnv* env,
    jclass,
    jint button
) {
    if (!RequireContext(env)) return JNI_FALSE;
    if (button < 0 || button >= ImGuiMouseButton_COUNT) return JNI_FALSE;
    return ImGui::IsMouseReleased(static_cast<ImGuiMouseButton>(button)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsMouseDragging(
    JNIEnv* env,
    jclass,
    jint button,
    jfloat lockThreshold
) {
    if (!RequireContext(env)) return JNI_FALSE;
    if (button < 0 || button >= ImGuiMouseButton_COUNT) return JNI_FALSE;
    return ImGui::IsMouseDragging(static_cast<ImGuiMouseButton>(button), lockThreshold)
        ? JNI_TRUE
        : JNI_FALSE;
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetMouseDragDelta(
    JNIEnv* env,
    jclass,
    jint button,
    jfloat lockThreshold
) {
    if (!RequireContext(env)) return nullptr;
    const ImGuiMouseButton safeButton = button >= 0 && button < ImGuiMouseButton_COUNT
        ? static_cast<ImGuiMouseButton>(button)
        : ImGuiMouseButton_Left;
    return NewFloatPair(env, ImGui::GetMouseDragDelta(safeButton, lockThreshold));
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeResetMouseDragDelta(
    JNIEnv* env,
    jclass,
    jint button
) {
    if (!RequireContext(env)) return;
    if (button < 0 || button >= ImGuiMouseButton_COUNT) return;
    ImGui::ResetMouseDragDelta(static_cast<ImGuiMouseButton>(button));
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeCalcTextSize(
    JNIEnv* env,
    jclass,
    jstring text,
    jfloat wrapWidth
) {
    if (!RequireFrame(env)) return nullptr;
    const std::string value = JStringToUtf8(env, text);
    return NewFloatPair(env, ImGui::CalcTextSize(value.c_str(), nullptr, false, wrapWidth));
}

extern "C" JNIEXPORT jfloat JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetFrameHeight(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return 0.0F;
    return ImGui::GetFrameHeight();
}

extern "C" JNIEXPORT jfloat JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetFrameHeightWithSpacing(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return 0.0F;
    return ImGui::GetFrameHeightWithSpacing();
}

extern "C" JNIEXPORT jfloat JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetTextLineHeight(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return 0.0F;
    return ImGui::GetTextLineHeight();
}

extern "C" JNIEXPORT jfloat JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetTextLineHeightWithSpacing(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return 0.0F;
    return ImGui::GetTextLineHeightWithSpacing();
}

extern "C" JNIEXPORT jfloat JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetFramerate(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return 0.0F;
    return ImGui::GetIO().Framerate;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeAddInputCharacters(
    JNIEnv* env,
    jclass,
    jstring text
) {
    if (!gState.ready || ImGui::GetCurrentContext() == nullptr) {
        return;
    }
    const std::string value = JStringToUtf8(env, text);
    if (!value.empty()) {
        ImGui::GetIO().AddInputCharactersUTF8(value.c_str());
    }
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeAddKeyEvent(
    JNIEnv*,
    jclass,
    jint key,
    jboolean down
) {
    if (!gState.ready || ImGui::GetCurrentContext() == nullptr) {
        return;
    }
    const int keyValue = static_cast<int>(key);
    const bool named = keyValue >= ImGuiKey_NamedKey_BEGIN && keyValue < ImGuiKey_NamedKey_END;
    const bool modifier = keyValue == ImGuiMod_Ctrl ||
        keyValue == ImGuiMod_Shift ||
        keyValue == ImGuiMod_Alt ||
        keyValue == ImGuiMod_Super;
    if (!named && !modifier) {
        return;
    }
    ImGui::GetIO().AddKeyEvent(static_cast<ImGuiKey>(keyValue), down == JNI_TRUE);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeAddMouseWheelEvent(
    JNIEnv*,
    jclass,
    jfloat wheelX,
    jfloat wheelY
) {
    if (!gState.ready || ImGui::GetCurrentContext() == nullptr) {
        return;
    }
    ImGui::GetIO().AddMouseWheelEvent(wheelX, wheelY);
}

// Injected pointer events count as touch input, like the finger events of nativeTouchEvent.
extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeAddMousePosEvent(
    JNIEnv*,
    jclass,
    jfloat x,
    jfloat y
) {
    if (!gState.ready || ImGui::GetCurrentContext() == nullptr) {
        return;
    }
    ImGuiIO& io = ImGui::GetIO();
    io.AddMouseSourceEvent(ImGuiMouseSource_TouchScreen);
    io.AddMousePosEvent(x, y);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeAddMouseButtonEvent(
    JNIEnv*,
    jclass,
    jint button,
    jboolean down
) {
    if (!gState.ready || ImGui::GetCurrentContext() == nullptr ||
        button < 0 || button >= ImGuiMouseButton_COUNT
    ) {
        return;
    }
    ImGuiIO& io = ImGui::GetIO();
    io.AddMouseSourceEvent(ImGuiMouseSource_TouchScreen);
    io.AddMouseButtonEvent(static_cast<int>(button), down == JNI_TRUE);
}

namespace {

// index.js checks keys against the same end value.
static_assert(ImGuiKey_NamedKey_END == 667);

// A named key or one of ImGuiMod_Ctrl / Shift / Alt / Super. Dear ImGui indexes its key table with the value unchecked.
bool RequireKey(JNIEnv* env, jint key) {
    const int value = static_cast<int>(key);
    const bool named = value >= ImGuiKey_NamedKey_BEGIN && value < ImGuiKey_NamedKey_END;
    const bool modifier = value == ImGuiMod_Ctrl ||
        value == ImGuiMod_Shift ||
        value == ImGuiMod_Alt ||
        value == ImGuiMod_Super;
    if (!named && !modifier) {
        ThrowIllegalArgument(env, "Key must be a value of imgui.Key or imgui.Mod");
        return false;
    }
    return true;
}

// A named key with optional modifiers, or a single modifier.
bool RequireKeyChord(JNIEnv* env, jint keyChord) {
    const int value = static_cast<int>(keyChord);
    const int key = value & ~ImGuiMod_Mask_;
    const int modifiers = value & ImGuiMod_Mask_;
    const bool named = key >= ImGuiKey_NamedKey_BEGIN && key < ImGuiKey_NamedKey_END;
    if (!named && !(key == 0 && modifiers != 0 && ImIsPowerOfTwo(modifiers))) {
        ThrowIllegalArgument(env, "Key chord must be a value of imgui.Key, optionally combined with imgui.Mod values");
        return false;
    }
    return true;
}

}  // namespace

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsKeyDown(
    JNIEnv* env,
    jclass,
    jint key
) {
    if (!RequireContext(env) || !RequireKey(env, key)) return JNI_FALSE;
    return ImGui::IsKeyDown(static_cast<ImGuiKey>(key)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsKeyPressed(
    JNIEnv* env,
    jclass,
    jint key,
    jboolean repeat
) {
    if (!RequireContext(env) || !RequireKey(env, key)) return JNI_FALSE;
    return ImGui::IsKeyPressed(static_cast<ImGuiKey>(key), repeat == JNI_TRUE) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsKeyReleased(
    JNIEnv* env,
    jclass,
    jint key
) {
    if (!RequireContext(env) || !RequireKey(env, key)) return JNI_FALSE;
    return ImGui::IsKeyReleased(static_cast<ImGuiKey>(key)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jint JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetKeyPressedAmount(
    JNIEnv* env,
    jclass,
    jint key,
    jfloat repeatDelay,
    jfloat rate
) {
    if (!RequireContext(env) || !RequireKey(env, key)) return 0;
    return ImGui::GetKeyPressedAmount(static_cast<ImGuiKey>(key), repeatDelay, rate);
}

extern "C" JNIEXPORT jstring JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetKeyName(
    JNIEnv* env,
    jclass,
    jint key
) {
    if (!RequireContext(env) || (key != ImGuiKey_None && !RequireKey(env, key))) return nullptr;
    return Utf8ToJString(env, ImGui::GetKeyName(static_cast<ImGuiKey>(key)));
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeIsKeyChordPressed(
    JNIEnv* env,
    jclass,
    jint keyChord
) {
    if (!RequireContext(env) || !RequireKeyChord(env, keyChord)) return JNI_FALSE;
    return ImGui::IsKeyChordPressed(static_cast<ImGuiKeyChord>(keyChord)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeShortcut(
    JNIEnv* env,
    jclass,
    jint keyChord,
    jint flags
) {
    if (!RequireFrame(env) || !RequireKeyChord(env, keyChord)) return JNI_FALSE;
    return ImGui::Shortcut(static_cast<ImGuiKeyChord>(keyChord), static_cast<ImGuiInputFlags>(flags))
        ? JNI_TRUE
        : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetNextItemShortcut(
    JNIEnv* env,
    jclass,
    jint keyChord,
    jint flags
) {
    if (!RequireFrame(env) || !RequireKeyChord(env, keyChord)) return;
    ImGui::SetNextItemShortcut(static_cast<ImGuiKeyChord>(keyChord), static_cast<ImGuiInputFlags>(flags));
}

namespace {

// Platform_GetClipboardTextFn / Platform_SetClipboardTextFn: Dear ImGui calls them on the render thread, inside a
// frame, so the thread is attached and no Java exception is pending. ImGuiNative catches what the clipboard throws.
const char* ReadPlatformClipboard(ImGuiContext*) {
    JNIEnv* env = nullptr;
    if (gJavaVm == nullptr || gJavaVm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return "";
    }
    auto text = static_cast<jstring>(env->CallStaticObjectMethod(gNativeClass, gReadClipboardMethod));
    if (env->ExceptionCheck()) {
        env->ExceptionClear();
        return "";
    }
    gState.clipboardText = text == nullptr ? std::string() : JStringToUtf8(env, text);
    if (text != nullptr) {
        env->DeleteLocalRef(text);
    }
    return gState.clipboardText.c_str();
}

void WritePlatformClipboard(ImGuiContext*, const char* text) {
    JNIEnv* env = nullptr;
    if (gJavaVm == nullptr || gJavaVm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return;
    }
    jstring value = Utf8ToJString(env, text == nullptr ? "" : text);
    if (value == nullptr) {
        env->ExceptionClear();
        return;
    }
    env->CallStaticVoidMethod(gNativeClass, gWriteClipboardMethod, value);
    if (env->ExceptionCheck()) {
        env->ExceptionClear();
    }
    env->DeleteLocalRef(value);
}

}  // namespace

// Routes the clipboard of Dear ImGui to the Android clipboard. The privileged renderer process does not call this and
// keeps the local clipboard of Dear ImGui.
extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeUsePlatformClipboard(
    JNIEnv* env,
    jclass nativeClass
) {
    if (!RequireContext(env)) return;
    if (gNativeClass == nullptr) {
        env->GetJavaVM(&gJavaVm);
        gReadClipboardMethod = env->GetStaticMethodID(nativeClass, "readClipboardForNative", "()Ljava/lang/String;");
        gWriteClipboardMethod = env->GetStaticMethodID(nativeClass, "writeClipboardForNative", "(Ljava/lang/String;)V");
        if (gReadClipboardMethod == nullptr || gWriteClipboardMethod == nullptr) return;
        gNativeClass = static_cast<jclass>(env->NewGlobalRef(nativeClass));
    }
    ImGuiPlatformIO& platformIo = ImGui::GetPlatformIO();
    platformIo.Platform_GetClipboardTextFn = ReadPlatformClipboard;
    platformIo.Platform_SetClipboardTextFn = WritePlatformClipboard;
}

namespace {

bool RequireDragDropRoot(JNIEnv* env) {
    if (GImGui->DragDropWithinSource || GImGui->DragDropWithinTarget) {
        ThrowIllegalState(env, "Drag-and-drop sources and targets cannot be nested");
        return false;
    }
    return true;
}

// {type, data as JSON or null, "1" while the target previews it, "1" when it is delivered}. The data of the payloads
// Dear ImGui makes itself is known only for the color types; the plugin's own payloads are JSON.
jobjectArray DragDropPayloadToJava(JNIEnv* env, const ImGuiPayload* payload) {
    if (payload == nullptr) return nullptr;
    std::string data;
    bool hasData = true;
    if (payload->DataType[0] != '_') {
        data.assign(static_cast<const char*>(payload->Data), static_cast<size_t>(payload->DataSize));
    } else if (payload->IsDataType(IMGUI_PAYLOAD_TYPE_COLOR_3F) || payload->IsDataType(IMGUI_PAYLOAD_TYPE_COLOR_4F)) {
        const auto* values = static_cast<const float*>(payload->Data);
        const int count = payload->DataSize / static_cast<int>(sizeof(float));
        data = "[";
        for (int index = 0; index < count; ++index) {
            std::array<char, 32> number{};
            snprintf(number.data(), number.size(), index == 0 ? "%g" : ",%g", values[index]);
            data += number.data();
        }
        data += "]";
    } else {
        hasData = false;
    }
    jclass stringClass = env->FindClass("java/lang/String");
    if (stringClass == nullptr) return nullptr;
    jobjectArray result = env->NewObjectArray(4, stringClass, nullptr);
    env->DeleteLocalRef(stringClass);
    if (result == nullptr) return nullptr;
    const std::array<std::string, 3> fields = {
        std::string(payload->DataType),
        payload->Preview ? "1" : "0",
        payload->Delivery ? "1" : "0",
    };
    const std::array<int, 3> indices = {0, 2, 3};
    for (size_t index = 0; index < fields.size(); ++index) {
        jstring field = Utf8ToJString(env, fields[index]);
        if (field == nullptr) return nullptr;
        env->SetObjectArrayElement(result, indices[index], field);
        env->DeleteLocalRef(field);
    }
    if (hasData) {
        jstring field = Utf8ToJString(env, data);
        if (field == nullptr) return nullptr;
        env->SetObjectArrayElement(result, 1, field);
        env->DeleteLocalRef(field);
    }
    return result;
}

}  // namespace

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginDragDropSource(
    JNIEnv* env,
    jclass,
    jint flags
) {
    if (!RequireFrame(env) || !RequireDragDropRoot(env)) return JNI_FALSE;
    return ImGui::BeginDragDropSource(static_cast<ImGuiDragDropFlags>(flags)) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeSetDragDropPayload(
    JNIEnv* env,
    jclass,
    jstring type,
    jstring json,
    jint condition
) {
    if (!RequireFrame(env)) return JNI_FALSE;
    if (!GImGui->DragDropWithinSource) {
        ThrowIllegalState(env, "setDragDropPayload called outside a drag-and-drop source");
        return JNI_FALSE;
    }
    const std::string typeValue = JStringToUtf8(env, type);
    const std::string data = JStringToUtf8(env, json);
    if (typeValue.empty() || typeValue.size() >= sizeof(ImGuiPayload::DataType) || typeValue[0] == '_') {
        ThrowIllegalArgument(env, "Drag-and-drop type must have 1 to 32 UTF-8 bytes and must not start with '_'");
        return JNI_FALSE;
    }
    if (data.empty() || data.size() > static_cast<size_t>(kMaxDragDropPayloadBytes)) {
        ThrowIllegalArgument(env, "Drag-and-drop payload must have 1 to 65536 UTF-8 bytes");
        return JNI_FALSE;
    }
    return ImGui::SetDragDropPayload(
        typeValue.c_str(),
        data.data(),
        data.size(),
        static_cast<ImGuiCond>(condition)
    ) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndDragDropSource(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    if (!GImGui->DragDropWithinSource) {
        ThrowIllegalState(env, "endDragDropSource called without a matching beginDragDropSource");
        return;
    }
    ImGui::EndDragDropSource();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeBeginDragDropTarget(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env) || !RequireDragDropRoot(env)) return JNI_FALSE;
    return ImGui::BeginDragDropTarget() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeAcceptDragDropPayload(
    JNIEnv* env,
    jclass,
    jstring type,
    jint flags
) {
    if (!RequireFrame(env)) return nullptr;
    if (!GImGui->DragDropWithinTarget) {
        ThrowIllegalState(env, "acceptDragDropPayload called outside a drag-and-drop target");
        return nullptr;
    }
    const std::string typeValue = JStringToUtf8(env, type);
    return DragDropPayloadToJava(
        env,
        ImGui::AcceptDragDropPayload(typeValue.c_str(), static_cast<ImGuiDragDropFlags>(flags))
    );
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeEndDragDropTarget(
    JNIEnv* env,
    jclass
) {
    if (!RequireFrame(env)) return;
    if (!GImGui->DragDropWithinTarget) {
        ThrowIllegalState(env, "endDragDropTarget called without a matching beginDragDropTarget");
        return;
    }
    ImGui::EndDragDropTarget();
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeGetDragDropPayload(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return nullptr;
    return DragDropPayloadToJava(env, ImGui::GetDragDropPayload());
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeWantTextInput(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return JNI_FALSE;
    return ImGui::GetIO().WantTextInput ? JNI_TRUE : JNI_FALSE;
}
