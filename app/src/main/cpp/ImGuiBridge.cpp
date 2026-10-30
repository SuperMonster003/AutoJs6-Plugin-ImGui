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
#include <cstring>
#include <limits>
#include <memory>
#include <string>
#include <string_view>
#include <unordered_map>
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
constexpr int kTextureFlagNearest = 1 << 0;
constexpr int kTextureFlagRepeat = 1 << 1;
constexpr int kTextureFlagMipmaps = 1 << 2;
constexpr char kBundledCjkFontAsset[] = "fonts/AutoJs6CjkFallback-Regular.otf";
constexpr char kBundledIconFontAsset[] = "fonts/AutoJs6MaterialIcons-Subset.ttf";
constexpr size_t kMaxDebugMessages = 64;

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
};

RendererState gState;
uint64_t gNextTextureHandle = 1U;

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
    jfloatArray additionalFontSizes
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
    if (!primaryHasCjkFallback && nativeAssetManager != nullptr) {
        primaryHasCjkFallback = MergeAssetFont(
            nativeAssetManager,
            kBundledCjkFontAsset,
            primaryFont
        );
    }
    MergeAssetFont(nativeAssetManager, kBundledIconFontAsset, primaryFont);

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
            if (AssetPathFromSpec(fontSpec) != kBundledCjkFontAsset) {
                MergeAssetFont(nativeAssetManager, kBundledCjkFontAsset, font);
            }
            MergeAssetFont(nativeAssetManager, kBundledIconFontAsset, font);
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
    DestroyPendingTextures();

    const bool swapped = eglSwapBuffers(gState.display, gState.surface) == EGL_TRUE;
    if (!swapped) {
        LOG_ERROR("eglSwapBuffers failed: 0x%x", eglGetError());
    }
    ReleaseCurrent();
    return swapped ? JNI_TRUE : JNI_FALSE;
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
        resolvedSize = gState.fontSizes[static_cast<size_t>(fontIndex)];
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
        ImGui::ShowMetricsWindow(&gState.showMetricsWindow);
    }
    if (gState.showDebugLogWindow) {
        ImGui::ShowDebugLogWindow(&gState.showDebugLogWindow);
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
    jfloat initWidthOrWeight
) {
    if (!RequireFrame(env)) return;
    const std::string value = JStringToUtf8(env, label);
    ImGui::TableSetupColumn(
        value.c_str(),
        static_cast<ImGuiTableColumnFlags>(flags),
        initWidthOrWeight
    );
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
        ? std::clamp(static_cast<float>(fontSize), 4.0F, 128.0F) * gState.density
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

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_supermonster003_autojs6_plugin_imgui_ImGuiNative_nativeWantTextInput(
    JNIEnv* env,
    jclass
) {
    if (!RequireContext(env)) return JNI_FALSE;
    return ImGui::GetIO().WantTextInput ? JNI_TRUE : JNI_FALSE;
}
