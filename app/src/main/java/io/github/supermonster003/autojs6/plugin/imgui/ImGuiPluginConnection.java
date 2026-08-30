package io.github.supermonster003.autojs6.plugin.imgui;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.ServiceConnection;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.os.RemoteException;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.WeakHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Pattern;

public final class ImGuiPluginConnection implements ServiceConnection {

    private static final ReentrantLock NATIVE_LOCK = new ReentrantLock(true);
    private static final ImGuiInputQueue.Sink NATIVE_INPUT_SINK = new ImGuiInputQueue.Sink() {
        @Override
        public void touch(int action, float x, float y, int mouseButton) {
            ImGuiNative.nativeTouchEvent(action, x, y, mouseButton);
        }

        @Override
        public void characters(String text) {
            ImGuiNative.nativeAddInputCharacters(text);
        }

        @Override
        public void key(int key, boolean down) {
            ImGuiNative.nativeAddKeyEvent(key, down);
        }

        @Override
        public void wheel(float wheelX, float wheelY) {
            ImGuiNative.nativeAddMouseWheelEvent(wheelX, wheelY);
        }
    };
    private static final int MAX_ENCODED_TEXTURE_BYTES = 128 * 1024 * 1024;
    private static final long MAX_TEXTURE_PIXELS = 32L * 1024L * 1024L;
    private static final int MAX_PRIVILEGED_SURFACE_SIZE = 16_384;
    private static final long MAX_PRIVILEGED_START_TIMEOUT_MILLIS = 15_000L;
    private static final String PRIVILEGE_BROKER_DESCRIPTOR =
        "io.github.supermonster003.autojs6.plugin.imgui.IImGuiPrivilegeBroker";
    private static final String PRIVILEGED_PROCESS_CLASS =
        "io.github.supermonster003.autojs6.plugin.imgui.ImGuiPrivilegedProcess";
    private static final SecureRandom PRIVILEGED_SESSION_RANDOM = new SecureRandom();
    private static final Pattern PRIVILEGED_TOKEN_PATTERN = Pattern.compile("[0-9a-f]{64}");
    private static final Pattern PACKAGE_NAME_PATTERN =
        Pattern.compile("[A-Za-z][A-Za-z0-9_]*(?:\\.[A-Za-z][A-Za-z0-9_]*)+");
    private static volatile Object nativeOwnerToken;

    private final Context hostContext;
    private final Context pluginContext;
    private final Object runtime;
    private volatile ImGuiInputQueue inputQueue = new ImGuiInputQueue();
    private final Map<View, ActivitySurfaceHost> activitySurfaceHosts =
        Collections.synchronizedMap(new WeakHashMap<>());
    private final Map<View, TouchableRegionController> touchableRegionControllers =
        Collections.synchronizedMap(new WeakHashMap<>());
    private final Object privilegeBrokerLock = new Object();
    private final Object privilegedSessionLock = new Object();
    private final Map<Surface, PrivilegedSurfaceHost> privilegedSurfaceHosts =
        new IdentityHashMap<>();
    private final Object ownerToken = new Object();
    private volatile IImGuiPrivilegeBroker privilegeBroker;
    private volatile String privilegeBrokerError;
    private volatile boolean revoked;
    private Thread frameThread;
    private volatile boolean lastAnyItemHovered;
    private volatile boolean lastAnyItemActive;
    private volatile boolean lastWantCaptureMouse;
    private volatile boolean lastWantTextInput;

    ImGuiPluginConnection(Context hostContext, Context pluginContext, Object runtime) {
        if (hostContext.getApplicationContext() == null) {
            throw new IllegalArgumentException("Host application context is unavailable");
        }
        this.hostContext = hostContext;
        Context applicationContext = pluginContext.getApplicationContext();
        this.pluginContext = applicationContext == null ? pluginContext : applicationContext;
        this.runtime = runtime;
        ImGuiNative.load();
    }

    public int getVersion() {
        return 2;
    }

    public String getAssetsScriptDir() {
        return ImGuiPluginContract.SCRIPT_DIRECTORY;
    }

    public String[] listExamples() {
        return ImGuiPluginContract.exampleNames();
    }

    public String getExampleSource(String name) {
        String assetPath = ImGuiPluginContract.exampleAssetPath(name);
        try (InputStream input = pluginContext.getAssets().open(assetPath)) {
            return new String(readTextureBytes(input), StandardCharsets.UTF_8);
        } catch (IOException error) {
            throw new IllegalStateException("Unable to read ImGui example asset: " + name, error);
        }
    }

    public String[] getBackendCapabilities() {
        return ImGuiBackendCapabilities.probe(hostContext, pluginContext, runtime);
    }

    public ComponentName getService() {
        return new ComponentName(pluginContext, ImGuiPrivilegeBrokerService.class);
    }

    public String version() {
        return ImGuiNative.nativeVersion();
    }

    public boolean init(Surface surface, float density, String fontPath, float fontSize) {
        return init(surface, density, fontPath, fontSize, null, null, null);
    }

    public boolean init(
        Surface surface,
        float density,
        String fontPath,
        float fontSize,
        String[] additionalFontPaths,
        float[] additionalFontSizes
    ) {
        return init(
            surface,
            density,
            fontPath,
            fontSize,
            null,
            additionalFontPaths,
            additionalFontSizes
        );
    }

    public boolean init(
        Surface surface,
        float density,
        String fontPath,
        float fontSize,
        String iniPath,
        String[] additionalFontPaths,
        float[] additionalFontSizes
    ) {
        if (surface == null || !surface.isValid()) {
            return false;
        }
        String[] resolvedFontPaths = additionalFontPaths == null
            ? new String[0]
            : additionalFontPaths;
        float[] resolvedFontSizes = additionalFontSizes == null
            ? new float[0]
            : additionalFontSizes;
        if (resolvedFontPaths.length != resolvedFontSizes.length ||
            resolvedFontPaths.length > 16
        ) {
            throw new IllegalArgumentException(
                "Additional font paths and sizes must have equal lengths of at most 16"
            );
        }
        NATIVE_LOCK.lock();
        try {
            revoked = true;
            inputQueue = new ImGuiInputQueue();
            if (nativeOwnerToken != null) {
                ImGuiNative.nativeShutdown();
            }
            nativeOwnerToken = ownerToken;
            boolean initialized = ImGuiNative.nativeInit(
                pluginContext.getAssets(),
                surface,
                density,
                fontPath,
                fontSize,
                iniPath,
                resolvedFontPaths,
                resolvedFontSizes
            );
            if (!initialized) {
                nativeOwnerToken = null;
            }
            revoked = !initialized;
            return initialized;
        } finally {
            NATIVE_LOCK.unlock();
        }
    }

    public void shutdown() {
        if (frameThread == Thread.currentThread()) {
            throw new IllegalStateException("Cannot shut down ImGui before the current frame is rendered");
        }
        NATIVE_LOCK.lock();
        try {
            revoked = true;
            inputQueue = new ImGuiInputQueue();
            if (nativeOwnerToken == ownerToken) {
                ImGuiNative.nativeShutdown();
                nativeOwnerToken = null;
            }
            lastAnyItemHovered = false;
            lastAnyItemActive = false;
            lastWantCaptureMouse = false;
            lastWantTextInput = false;
        } finally {
            NATIVE_LOCK.unlock();
            closeAllPrivilegedSurfaces();
        }
    }

    public boolean isOwner() {
        return nativeOwnerToken == ownerToken && !revoked;
    }

    public boolean isReady() {
        NATIVE_LOCK.lock();
        try {
            return isOwner() && ImGuiNative.nativeIsReady();
        } finally {
            NATIVE_LOCK.unlock();
        }
    }

    public boolean detachSurface() {
        if (frameThread == Thread.currentThread()) {
            throw new IllegalStateException("Cannot detach the Surface during an active ImGui frame");
        }
        NATIVE_LOCK.lock();
        try {
            requireOwner();
            boolean detached = ImGuiNative.nativeDetachSurface();
            if (detached) {
                lastAnyItemHovered = false;
                lastAnyItemActive = false;
                lastWantCaptureMouse = false;
                lastWantTextInput = false;
            }
            return detached;
        } finally {
            NATIVE_LOCK.unlock();
        }
    }

    public boolean attachSurface(Surface surface) {
        if (surface == null || !surface.isValid()) {
            return false;
        }
        NATIVE_LOCK.lock();
        try {
            requireOwner();
            return ImGuiNative.nativeAttachSurface(surface);
        } finally {
            NATIVE_LOCK.unlock();
        }
    }

    public float[] getAutoResizeBounds() {
        NATIVE_LOCK.lock();
        try {
            requireOwner();
            return ImGuiNative.nativeGetAutoResizeBounds();
        } finally {
            NATIVE_LOCK.unlock();
        }
    }

    public float[] getInteractiveWindowRects() {
        NATIVE_LOCK.lock();
        try {
            requireOwner();
            return ImGuiNative.nativeGetInteractiveWindowRects();
        } finally {
            NATIVE_LOCK.unlock();
        }
    }

    public boolean newFrame() {
        if (frameThread != null) {
            throw new IllegalStateException("An ImGui frame is already active");
        }
        NATIVE_LOCK.lock();
        boolean keepLock = false;
        try {
            requireOwner();
            inputQueue.drainTo(NATIVE_INPUT_SINK);
            keepLock = ImGuiNative.nativeNewFrame();
            if (keepLock) {
                frameThread = Thread.currentThread();
            }
            return keepLock;
        } finally {
            if (!keepLock) {
                NATIVE_LOCK.unlock();
            }
        }
    }

    public boolean render() {
        if (frameThread != Thread.currentThread()) {
            throw new IllegalStateException("ImGui frame must be rendered on the thread that opened it");
        }
        try {
            requireOwner();
            boolean rendered = ImGuiNative.nativeRender();
            if (rendered) {
                lastAnyItemHovered = ImGuiNative.nativeIsAnyItemHovered();
                lastAnyItemActive = ImGuiNative.nativeIsAnyItemActive();
                lastWantCaptureMouse = ImGuiNative.nativeWantCaptureMouse();
                lastWantTextInput = ImGuiNative.nativeWantTextInput();
            } else {
                lastAnyItemHovered = false;
                lastAnyItemActive = false;
                lastWantCaptureMouse = false;
                lastWantTextInput = false;
            }
            return rendered;
        } finally {
            frameThread = null;
            NATIVE_LOCK.unlock();
        }
    }

    public void touchEvent(int action, float x, float y) {
        touchEvent(action, x, y, 0);
    }

    public void touchEvent(int action, float x, float y, int mouseButton) {
        ImGuiInputQueue queue = inputQueue;
        if (isOwner()) {
            queue.offerTouch(action, x, y, mouseButton);
        }
    }

    public long[] createTexture(Object source, int flags) {
        ResolvedBitmap resolved = resolveTextureBitmap(source, 0);
        try {
            NATIVE_LOCK.lock();
            try {
                requireOwner();
                long[] result = ImGuiNative.nativeCreateTexture(resolved.bitmap, flags);
                if (result == null || result.length < 3 || result[0] <= 0L) {
                    throw new IllegalStateException("Native texture creation returned no handle");
                }
                return result;
            } finally {
                NATIVE_LOCK.unlock();
            }
        } finally {
            resolved.recycleOwnedBitmap();
        }
    }

    public boolean destroyTexture(long handle) {
        NATIVE_LOCK.lock();
        try {
            requireOwner();
            return ImGuiNative.nativeDestroyTexture(handle);
        } finally {
            NATIVE_LOCK.unlock();
        }
    }

    public void image(
        long handle,
        float width,
        float height,
        float uv0X,
        float uv0Y,
        float uv1X,
        float uv1Y,
        float backgroundRed,
        float backgroundGreen,
        float backgroundBlue,
        float backgroundAlpha,
        float tintRed,
        float tintGreen,
        float tintBlue,
        float tintAlpha
    ) {
        requireOwner();
        ImGuiNative.nativeImage(
            handle, width, height, uv0X, uv0Y, uv1X, uv1Y,
            backgroundRed, backgroundGreen, backgroundBlue, backgroundAlpha,
            tintRed, tintGreen, tintBlue, tintAlpha
        );
    }

    public boolean imageButton(
        String id,
        long handle,
        float width,
        float height,
        float uv0X,
        float uv0Y,
        float uv1X,
        float uv1Y,
        float backgroundRed,
        float backgroundGreen,
        float backgroundBlue,
        float backgroundAlpha,
        float tintRed,
        float tintGreen,
        float tintBlue,
        float tintAlpha
    ) {
        requireOwner();
        return ImGuiNative.nativeImageButton(
            id, handle, width, height, uv0X, uv0Y, uv1X, uv1Y,
            backgroundRed, backgroundGreen, backgroundBlue, backgroundAlpha,
            tintRed, tintGreen, tintBlue, tintAlpha
        );
    }

    public void drawLine(
        int layer,
        float x1,
        float y1,
        float x2,
        float y2,
        int color,
        float thickness
    ) {
        requireOwner();
        ImGuiNative.nativeDrawLine(layer, x1, y1, x2, y2, color, thickness);
    }

    public void drawRect(
        int layer,
        float minX,
        float minY,
        float maxX,
        float maxY,
        int color,
        float rounding,
        float thickness,
        int flags
    ) {
        requireOwner();
        ImGuiNative.nativeDrawRect(
            layer, minX, minY, maxX, maxY, color, rounding, thickness, flags
        );
    }

    public void drawRectFilled(
        int layer,
        float minX,
        float minY,
        float maxX,
        float maxY,
        int color,
        float rounding,
        int flags
    ) {
        requireOwner();
        ImGuiNative.nativeDrawRectFilled(layer, minX, minY, maxX, maxY, color, rounding, flags);
    }

    public void drawCircle(
        int layer,
        float x,
        float y,
        float radius,
        int color,
        int segments,
        float thickness
    ) {
        requireOwner();
        ImGuiNative.nativeDrawCircle(layer, x, y, radius, color, segments, thickness);
    }

    public void drawCircleFilled(
        int layer,
        float x,
        float y,
        float radius,
        int color,
        int segments
    ) {
        requireOwner();
        ImGuiNative.nativeDrawCircleFilled(layer, x, y, radius, color, segments);
    }

    public void drawTriangle(
        int layer,
        float x1,
        float y1,
        float x2,
        float y2,
        float x3,
        float y3,
        int color,
        float thickness,
        boolean filled
    ) {
        requireOwner();
        ImGuiNative.nativeDrawTriangle(
            layer, x1, y1, x2, y2, x3, y3, color, thickness, filled
        );
    }

    public void drawText(
        int layer,
        float x,
        float y,
        int color,
        String text,
        int fontIndex,
        float fontSize,
        float wrapWidth
    ) {
        requireOwner();
        ImGuiNative.nativeDrawText(
            layer, x, y, color, text, fontIndex, fontSize, wrapWidth
        );
    }

    public void drawPolyline(
        int layer,
        float[] points,
        int color,
        float thickness,
        int flags
    ) {
        requireOwner();
        ImGuiNative.nativeDrawPolyline(layer, points, color, thickness, flags);
    }

    public void drawBezierCubic(
        int layer,
        float x1,
        float y1,
        float x2,
        float y2,
        float x3,
        float y3,
        float x4,
        float y4,
        int color,
        float thickness,
        int segments
    ) {
        requireOwner();
        ImGuiNative.nativeDrawBezierCubic(
            layer, x1, y1, x2, y2, x3, y3, x4, y4, color, thickness, segments
        );
    }

    public void drawImage(
        int layer,
        long handle,
        float minX,
        float minY,
        float maxX,
        float maxY,
        float uv0X,
        float uv0Y,
        float uv1X,
        float uv1Y,
        int tintColor
    ) {
        requireOwner();
        ImGuiNative.nativeDrawImage(
            layer, handle, minX, minY, maxX, maxY,
            uv0X, uv0Y, uv1X, uv1Y, tintColor
        );
    }

    public void setNextWindowPos(float x, float y, int condition, float pivotX, float pivotY) {
        requireOwner();
        ImGuiNative.nativeSetNextWindowPos(x, y, condition, pivotX, pivotY);
    }

    public void setNextWindowSize(float width, float height, int condition) {
        requireOwner();
        ImGuiNative.nativeSetNextWindowSize(width, height, condition);
    }

    public void setNextWindowSizeConstraints(
        float minWidth,
        float minHeight,
        float maxWidth,
        float maxHeight
    ) {
        requireOwner();
        ImGuiNative.nativeSetNextWindowSizeConstraints(minWidth, minHeight, maxWidth, maxHeight);
    }

    public void setNextWindowBgAlpha(float alpha) {
        requireOwner();
        ImGuiNative.nativeSetNextWindowBgAlpha(alpha);
    }

    public void setKeyboardFocusHere(int offset) {
        requireOwner();
        ImGuiNative.nativeSetKeyboardFocusHere(offset);
    }

    public boolean begin(String name, boolean[] open, int flags) {
        requireOwner();
        return ImGuiNative.nativeBegin(name, open, flags);
    }

    public void end() {
        requireOwner();
        ImGuiNative.nativeEnd();
    }

    public boolean beginChild(String id, float width, float height, boolean borders, int flags) {
        requireOwner();
        return ImGuiNative.nativeBeginChild(id, width, height, borders, flags);
    }

    public boolean beginChildEx(String id, float width, float height, int childFlags, int windowFlags) {
        requireOwner();
        return ImGuiNative.nativeBeginChildEx(id, width, height, childFlags, windowFlags);
    }

    public void endChild() {
        requireOwner();
        ImGuiNative.nativeEndChild();
    }

    public float[] getWindowPos() {
        requireOwner();
        return ImGuiNative.nativeGetWindowPos();
    }

    public float[] getWindowSize() {
        requireOwner();
        return ImGuiNative.nativeGetWindowSize();
    }

    public float[] getContentRegionAvail() {
        requireOwner();
        return ImGuiNative.nativeGetContentRegionAvail();
    }

    public float[] getCursorPos() {
        requireOwner();
        return ImGuiNative.nativeGetCursorPos();
    }

    public void setCursorPos(float x, float y) {
        requireOwner();
        ImGuiNative.nativeSetCursorPos(x, y);
    }

    public void text(String text) {
        requireOwner();
        ImGuiNative.nativeText(text);
    }

    public void textWrapped(String text) {
        requireOwner();
        ImGuiNative.nativeTextWrapped(text);
    }

    public void textColored(float red, float green, float blue, float alpha, String text) {
        requireOwner();
        ImGuiNative.nativeTextColored(red, green, blue, alpha, text);
    }

    public boolean button(String label, float width, float height) {
        requireOwner();
        return ImGuiNative.nativeButton(label, width, height);
    }

    public boolean smallButton(String label) {
        requireOwner();
        return ImGuiNative.nativeSmallButton(label);
    }

    public boolean checkbox(String label, boolean[] value) {
        requireOwner();
        return ImGuiNative.nativeCheckbox(label, value);
    }

    public boolean radioButton(String label, int[] value, int buttonValue) {
        requireOwner();
        return ImGuiNative.nativeRadioButton(label, value, buttonValue);
    }

    public boolean sliderFloat(
        String label,
        float[] value,
        float min,
        float max,
        String format,
        int flags
    ) {
        requireOwner();
        return ImGuiNative.nativeSliderFloat(label, value, min, max, format, flags);
    }

    public boolean sliderInt(
        String label,
        int[] value,
        int min,
        int max,
        String format,
        int flags
    ) {
        requireOwner();
        return ImGuiNative.nativeSliderInt(label, value, min, max, format, flags);
    }

    public boolean dragFloat(
        String label,
        float[] value,
        float speed,
        float min,
        float max,
        String format,
        int flags
    ) {
        requireOwner();
        return ImGuiNative.nativeDragFloat(label, value, speed, min, max, format, flags);
    }

    public boolean dragInt(
        String label,
        int[] value,
        float speed,
        int min,
        int max,
        String format,
        int flags
    ) {
        requireOwner();
        return ImGuiNative.nativeDragInt(label, value, speed, min, max, format, flags);
    }

    public boolean inputText(String label, String[] value, int maxLength, int flags) {
        requireOwner();
        return ImGuiNative.nativeInputText(label, value, maxLength, flags);
    }

    public boolean colorEdit3(String label, float[] value, int flags) {
        requireOwner();
        return ImGuiNative.nativeColorEdit3(label, value, flags);
    }

    public boolean colorEdit4(String label, float[] value, int flags) {
        requireOwner();
        return ImGuiNative.nativeColorEdit4(label, value, flags);
    }

    public void progressBar(float fraction, float width, float height, String overlay) {
        requireOwner();
        ImGuiNative.nativeProgressBar(fraction, width, height, overlay);
    }

    public boolean combo(String label, int[] currentItem, String[] items, int popupHeight) {
        requireOwner();
        return ImGuiNative.nativeCombo(label, currentItem, items, popupHeight);
    }

    public boolean selectable(String label, boolean selected, int flags, float width, float height) {
        requireOwner();
        return ImGuiNative.nativeSelectable(label, selected, flags, width, height);
    }

    public boolean collapsingHeader(String label, int flags) {
        requireOwner();
        return ImGuiNative.nativeCollapsingHeader(label, flags);
    }

    public boolean treeNode(String label) {
        requireOwner();
        return ImGuiNative.nativeTreeNode(label);
    }

    public void treePop() {
        requireOwner();
        ImGuiNative.nativeTreePop();
    }

    public boolean beginTabBar(String id, int flags) {
        requireOwner();
        return ImGuiNative.nativeBeginTabBar(id, flags);
    }

    public void endTabBar() {
        requireOwner();
        ImGuiNative.nativeEndTabBar();
    }

    public boolean beginTabItem(String label, boolean[] open, int flags) {
        requireOwner();
        return ImGuiNative.nativeBeginTabItem(label, open, flags);
    }

    public void endTabItem() {
        requireOwner();
        ImGuiNative.nativeEndTabItem();
    }

    public void sameLine(float offsetFromStartX, float spacing) {
        requireOwner();
        ImGuiNative.nativeSameLine(offsetFromStartX, spacing);
    }

    public void separator() {
        requireOwner();
        ImGuiNative.nativeSeparator();
    }

    public void spacing() {
        requireOwner();
        ImGuiNative.nativeSpacing();
    }

    public void newLine() {
        requireOwner();
        ImGuiNative.nativeNewLine();
    }

    public void dummy(float width, float height) {
        requireOwner();
        ImGuiNative.nativeDummy(width, height);
    }

    public void setNextItemWidth(float width) {
        requireOwner();
        ImGuiNative.nativeSetNextItemWidth(width);
    }

    public void pushItemWidth(float width) {
        requireOwner();
        ImGuiNative.nativePushItemWidth(width);
    }

    public void popItemWidth() {
        requireOwner();
        ImGuiNative.nativePopItemWidth();
    }

    public boolean isItemClicked(int mouseButton) {
        requireOwner();
        return ImGuiNative.nativeIsItemClicked(mouseButton);
    }

    public boolean isItemHovered(int flags) {
        requireOwner();
        return ImGuiNative.nativeIsItemHovered(flags);
    }

    public boolean wantCaptureMouse() {
        if (NATIVE_LOCK.isHeldByCurrentThread()) {
            requireOwner();
            return ImGuiNative.nativeWantCaptureMouse();
        }
        return isOwner() && lastWantCaptureMouse;
    }

    public boolean isAnyItemHovered() {
        if (NATIVE_LOCK.isHeldByCurrentThread()) {
            requireOwner();
            return ImGuiNative.nativeIsAnyItemHovered();
        }
        return isOwner() && lastAnyItemHovered;
    }

    public boolean isAnyItemActive() {
        if (NATIVE_LOCK.isHeldByCurrentThread()) {
            requireOwner();
            return ImGuiNative.nativeIsAnyItemActive();
        }
        return isOwner() && lastAnyItemActive;
    }

    public void styleColorsDark() {
        requireOwner();
        ImGuiNative.nativeStyleColorsDark();
    }

    public void styleColorsLight() {
        requireOwner();
        ImGuiNative.nativeStyleColorsLight();
    }

    public void styleColorsClassic() {
        requireOwner();
        ImGuiNative.nativeStyleColorsClassic();
    }

    public void resetStyle(int colorPreset) {
        requireOwner();
        ImGuiNative.nativeResetStyle(colorPreset);
    }

    public void setStyleColor(
        int index,
        float red,
        float green,
        float blue,
        float alpha
    ) {
        requireOwner();
        ImGuiNative.nativeSetStyleColor(index, red, green, blue, alpha);
    }

    public void setStyleVar(int index, float x, float y) {
        requireOwner();
        ImGuiNative.nativeSetStyleVar(index, x, y);
    }

    public void showDemoWindow(boolean[] open) {
        requireOwner();
        ImGuiNative.nativeShowDemoWindow(open);
    }

    public void separatorText(String label) {
        requireOwner();
        ImGuiNative.nativeSeparatorText(label);
    }

    public void bullet() {
        requireOwner();
        ImGuiNative.nativeBullet();
    }

    public void bulletText(String text) {
        requireOwner();
        ImGuiNative.nativeBulletText(text);
    }

    public void labelText(String label, String text) {
        requireOwner();
        ImGuiNative.nativeLabelText(label, text);
    }

    public void textDisabled(String text) {
        requireOwner();
        ImGuiNative.nativeTextDisabled(text);
    }

    public boolean arrowButton(String id, int direction) {
        requireOwner();
        return ImGuiNative.nativeArrowButton(id, direction);
    }

    public boolean invisibleButton(String id, float width, float height, int flags) {
        requireOwner();
        return ImGuiNative.nativeInvisibleButton(id, width, height, flags);
    }

    public boolean inputInt(String label, int[] value, int step, int stepFast, int flags) {
        requireOwner();
        return ImGuiNative.nativeInputInt(label, value, step, stepFast, flags);
    }

    public boolean inputFloat(
        String label,
        float[] value,
        float step,
        float stepFast,
        String format,
        int flags
    ) {
        requireOwner();
        return ImGuiNative.nativeInputFloat(label, value, step, stepFast, format, flags);
    }

    public boolean inputTextMultiline(
        String label,
        String[] value,
        int maxLength,
        float width,
        float height,
        int flags
    ) {
        requireOwner();
        return ImGuiNative.nativeInputTextMultiline(label, value, maxLength, width, height, flags);
    }

    public boolean beginListBox(String label, float width, float height) {
        requireOwner();
        return ImGuiNative.nativeBeginListBox(label, width, height);
    }

    public void endListBox() {
        requireOwner();
        ImGuiNative.nativeEndListBox();
    }

    public boolean listBox(String label, int[] currentItem, String[] items, int heightInItems) {
        requireOwner();
        return ImGuiNative.nativeListBox(label, currentItem, items, heightInItems);
    }

    public boolean colorPicker3(String label, float[] value, int flags) {
        requireOwner();
        return ImGuiNative.nativeColorPicker3(label, value, flags);
    }

    public boolean colorPicker4(String label, float[] value, int flags) {
        requireOwner();
        return ImGuiNative.nativeColorPicker4(label, value, flags);
    }

    public boolean colorButton(
        String id,
        float red,
        float green,
        float blue,
        float alpha,
        int flags,
        float width,
        float height
    ) {
        requireOwner();
        return ImGuiNative.nativeColorButton(id, red, green, blue, alpha, flags, width, height);
    }

    public void plotLines(
        String label,
        float[] values,
        int valuesOffset,
        String overlay,
        float scaleMin,
        float scaleMax,
        float width,
        float height
    ) {
        requireOwner();
        ImGuiNative.nativePlotLines(
            label, values, valuesOffset, overlay, scaleMin, scaleMax, width, height
        );
    }

    public void plotHistogram(
        String label,
        float[] values,
        int valuesOffset,
        String overlay,
        float scaleMin,
        float scaleMax,
        float width,
        float height
    ) {
        requireOwner();
        ImGuiNative.nativePlotHistogram(
            label, values, valuesOffset, overlay, scaleMin, scaleMax, width, height
        );
    }

    public boolean treeNodeEx(String label, int flags) {
        requireOwner();
        return ImGuiNative.nativeTreeNodeEx(label, flags);
    }

    public boolean vSliderFloat(
        String label,
        float width,
        float height,
        float[] value,
        float min,
        float max,
        String format,
        int flags
    ) {
        requireOwner();
        return ImGuiNative.nativeVSliderFloat(label, width, height, value, min, max, format, flags);
    }

    public boolean vSliderInt(
        String label,
        float width,
        float height,
        int[] value,
        int min,
        int max,
        String format,
        int flags
    ) {
        requireOwner();
        return ImGuiNative.nativeVSliderInt(label, width, height, value, min, max, format, flags);
    }

    public boolean toggle(String label, boolean[] value) {
        requireOwner();
        return ImGuiNative.nativeToggle(label, value);
    }

    public boolean beginCombo(String label, String preview, int flags) {
        requireOwner();
        return ImGuiNative.nativeBeginCombo(label, preview, flags);
    }

    public void endCombo() {
        requireOwner();
        ImGuiNative.nativeEndCombo();
    }

    public void openPopup(String id, int flags) {
        requireOwner();
        ImGuiNative.nativeOpenPopup(id, flags);
    }

    public boolean beginPopup(String id, int flags) {
        requireOwner();
        return ImGuiNative.nativeBeginPopup(id, flags);
    }

    public boolean beginPopupModal(String name, boolean[] open, int flags) {
        requireOwner();
        return ImGuiNative.nativeBeginPopupModal(name, open, flags);
    }

    public boolean beginPopupContextItem(String id, int flags) {
        requireOwner();
        return ImGuiNative.nativeBeginPopupContextItem(id, flags);
    }

    public boolean beginPopupContextWindow(String id, int flags) {
        requireOwner();
        return ImGuiNative.nativeBeginPopupContextWindow(id, flags);
    }

    public void endPopup() {
        requireOwner();
        ImGuiNative.nativeEndPopup();
    }

    public void closeCurrentPopup() {
        requireOwner();
        ImGuiNative.nativeCloseCurrentPopup();
    }

    public boolean isPopupOpen(String id, int flags) {
        requireOwner();
        return ImGuiNative.nativeIsPopupOpen(id, flags);
    }

    public boolean beginMenuBar() {
        requireOwner();
        return ImGuiNative.nativeBeginMenuBar();
    }

    public void endMenuBar() {
        requireOwner();
        ImGuiNative.nativeEndMenuBar();
    }

    public boolean beginMenu(String label, boolean enabled) {
        requireOwner();
        return ImGuiNative.nativeBeginMenu(label, enabled);
    }

    public void endMenu() {
        requireOwner();
        ImGuiNative.nativeEndMenu();
    }

    public boolean menuItem(String label, String shortcut, boolean[] selected, boolean enabled) {
        requireOwner();
        return ImGuiNative.nativeMenuItem(label, shortcut, selected, enabled);
    }

    public void setTooltip(String text) {
        requireOwner();
        ImGuiNative.nativeSetTooltip(text);
    }

    public void setItemTooltip(String text) {
        requireOwner();
        ImGuiNative.nativeSetItemTooltip(text);
    }

    public boolean beginTooltip() {
        requireOwner();
        return ImGuiNative.nativeBeginTooltip();
    }

    public boolean beginItemTooltip() {
        requireOwner();
        return ImGuiNative.nativeBeginItemTooltip();
    }

    public void endTooltip() {
        requireOwner();
        ImGuiNative.nativeEndTooltip();
    }

    public boolean beginTable(String id, int columns, int flags, float outerWidth, float outerHeight) {
        requireOwner();
        return ImGuiNative.nativeBeginTable(id, columns, flags, outerWidth, outerHeight);
    }

    public void endTable() {
        requireOwner();
        ImGuiNative.nativeEndTable();
    }

    public void tableNextRow(int rowFlags, float minRowHeight) {
        requireOwner();
        ImGuiNative.nativeTableNextRow(rowFlags, minRowHeight);
    }

    public boolean tableNextColumn() {
        requireOwner();
        return ImGuiNative.nativeTableNextColumn();
    }

    public boolean tableSetColumnIndex(int columnIndex) {
        requireOwner();
        return ImGuiNative.nativeTableSetColumnIndex(columnIndex);
    }

    public void tableSetupColumn(String label, int flags, float initWidthOrWeight) {
        requireOwner();
        ImGuiNative.nativeTableSetupColumn(label, flags, initWidthOrWeight);
    }

    public void tableSetupScrollFreeze(int columns, int rows) {
        requireOwner();
        ImGuiNative.nativeTableSetupScrollFreeze(columns, rows);
    }

    public void tableHeadersRow() {
        requireOwner();
        ImGuiNative.nativeTableHeadersRow();
    }

    public void tableSetBgColor(
        int target,
        float red,
        float green,
        float blue,
        float alpha,
        int columnIndex
    ) {
        requireOwner();
        ImGuiNative.nativeTableSetBgColor(target, red, green, blue, alpha, columnIndex);
    }

    public void pushStyleColor(int index, float red, float green, float blue, float alpha) {
        requireOwner();
        ImGuiNative.nativePushStyleColor(index, red, green, blue, alpha);
    }

    public void popStyleColor(int count) {
        requireOwner();
        ImGuiNative.nativePopStyleColor(count);
    }

    public void pushStyleVar(int index, float value) {
        requireOwner();
        ImGuiNative.nativePushStyleVar(index, value);
    }

    public void pushStyleVar2(int index, float x, float y) {
        requireOwner();
        ImGuiNative.nativePushStyleVar2(index, x, y);
    }

    public void popStyleVar(int count) {
        requireOwner();
        ImGuiNative.nativePopStyleVar(count);
    }

    public void setWindowFontScale(float scale) {
        requireOwner();
        ImGuiNative.nativeSetWindowFontScale(scale);
    }

    public void pushFont(int index, float fontSize) {
        requireOwner();
        ImGuiNative.nativePushFont(index, fontSize);
    }

    public void popFont() {
        requireOwner();
        ImGuiNative.nativePopFont();
    }

    public void pushIdString(String id) {
        requireOwner();
        ImGuiNative.nativePushIdString(id);
    }

    public void pushIdInt(int id) {
        requireOwner();
        ImGuiNative.nativePushIdInt(id);
    }

    public void popId() {
        requireOwner();
        ImGuiNative.nativePopId();
    }

    public void beginGroup() {
        requireOwner();
        ImGuiNative.nativeBeginGroup();
    }

    public void endGroup() {
        requireOwner();
        ImGuiNative.nativeEndGroup();
    }

    public void indent(float width) {
        requireOwner();
        ImGuiNative.nativeIndent(width);
    }

    public void unindent(float width) {
        requireOwner();
        ImGuiNative.nativeUnindent(width);
    }

    public void alignTextToFramePadding() {
        requireOwner();
        ImGuiNative.nativeAlignTextToFramePadding();
    }

    public void beginDisabled(boolean disabled) {
        requireOwner();
        ImGuiNative.nativeBeginDisabled(disabled);
    }

    public void endDisabled() {
        requireOwner();
        ImGuiNative.nativeEndDisabled();
    }

    public float getScrollX() {
        requireOwner();
        return ImGuiNative.nativeGetScrollX();
    }

    public float getScrollY() {
        requireOwner();
        return ImGuiNative.nativeGetScrollY();
    }

    public float getScrollMaxX() {
        requireOwner();
        return ImGuiNative.nativeGetScrollMaxX();
    }

    public float getScrollMaxY() {
        requireOwner();
        return ImGuiNative.nativeGetScrollMaxY();
    }

    public void setScrollX(float value) {
        requireOwner();
        ImGuiNative.nativeSetScrollX(value);
    }

    public void setScrollY(float value) {
        requireOwner();
        ImGuiNative.nativeSetScrollY(value);
    }

    public void setScrollHereX(float centerRatio) {
        requireOwner();
        ImGuiNative.nativeSetScrollHereX(centerRatio);
    }

    public void setScrollHereY(float centerRatio) {
        requireOwner();
        ImGuiNative.nativeSetScrollHereY(centerRatio);
    }

    public boolean isItemActive() {
        requireOwner();
        return ImGuiNative.nativeIsItemActive();
    }

    public boolean isItemEdited() {
        requireOwner();
        return ImGuiNative.nativeIsItemEdited();
    }

    public boolean isItemActivated() {
        requireOwner();
        return ImGuiNative.nativeIsItemActivated();
    }

    public boolean isItemDeactivated() {
        requireOwner();
        return ImGuiNative.nativeIsItemDeactivated();
    }

    public boolean isItemDeactivatedAfterEdit() {
        requireOwner();
        return ImGuiNative.nativeIsItemDeactivatedAfterEdit();
    }

    public boolean isItemFocused() {
        requireOwner();
        return ImGuiNative.nativeIsItemFocused();
    }

    public boolean isItemVisible() {
        requireOwner();
        return ImGuiNative.nativeIsItemVisible();
    }

    public boolean isWindowHovered(int flags) {
        requireOwner();
        return ImGuiNative.nativeIsWindowHovered(flags);
    }

    public boolean isWindowFocused(int flags) {
        requireOwner();
        return ImGuiNative.nativeIsWindowFocused(flags);
    }

    public boolean isWindowCollapsed() {
        requireOwner();
        return ImGuiNative.nativeIsWindowCollapsed();
    }

    public boolean isWindowAppearing() {
        requireOwner();
        return ImGuiNative.nativeIsWindowAppearing();
    }

    public float[] getMousePos() {
        requireOwner();
        return ImGuiNative.nativeGetMousePos();
    }

    public boolean isMouseDown(int button) {
        requireOwner();
        return ImGuiNative.nativeIsMouseDown(button);
    }

    public boolean isMouseClicked(int button, boolean repeat) {
        requireOwner();
        return ImGuiNative.nativeIsMouseClicked(button, repeat);
    }

    public boolean isMouseDoubleClicked(int button) {
        requireOwner();
        return ImGuiNative.nativeIsMouseDoubleClicked(button);
    }

    public boolean isMouseReleased(int button) {
        requireOwner();
        return ImGuiNative.nativeIsMouseReleased(button);
    }

    public boolean isMouseDragging(int button, float lockThreshold) {
        requireOwner();
        return ImGuiNative.nativeIsMouseDragging(button, lockThreshold);
    }

    public float[] getMouseDragDelta(int button, float lockThreshold) {
        requireOwner();
        return ImGuiNative.nativeGetMouseDragDelta(button, lockThreshold);
    }

    public void resetMouseDragDelta(int button) {
        requireOwner();
        ImGuiNative.nativeResetMouseDragDelta(button);
    }

    public float[] calcTextSize(String text, float wrapWidth) {
        requireOwner();
        return ImGuiNative.nativeCalcTextSize(text, wrapWidth);
    }

    public float getFrameHeight() {
        requireOwner();
        return ImGuiNative.nativeGetFrameHeight();
    }

    public float getFrameHeightWithSpacing() {
        requireOwner();
        return ImGuiNative.nativeGetFrameHeightWithSpacing();
    }

    public float getTextLineHeight() {
        requireOwner();
        return ImGuiNative.nativeGetTextLineHeight();
    }

    public float getTextLineHeightWithSpacing() {
        requireOwner();
        return ImGuiNative.nativeGetTextLineHeightWithSpacing();
    }

    public float getFramerate() {
        requireOwner();
        return ImGuiNative.nativeGetFramerate();
    }

    public void addInputCharacters(String text) {
        ImGuiInputQueue queue = inputQueue;
        if (isOwner()) {
            queue.offerCharacters(text);
        }
    }

    public void addKeyEvent(int key, boolean down) {
        ImGuiInputQueue queue = inputQueue;
        if (isOwner()) {
            queue.offerKey(key, down);
        }
    }

    public void addMouseWheelEvent(float wheelX, float wheelY) {
        ImGuiInputQueue queue = inputQueue;
        if (isOwner()) {
            queue.offerWheel(wheelX, wheelY);
        }
    }

    public boolean wantTextInput() {
        if (NATIVE_LOCK.isHeldByCurrentThread()) {
            requireOwner();
            return ImGuiNative.nativeWantTextInput();
        }
        return isOwner() && lastWantTextInput;
    }

    /**
     * Creates a SurfaceFlinger layer in a host-authorized root/Shizuku process, then transfers only
     * the resulting {@link Surface} back to this ordinary plugin bridge. Dear ImGui and every widget
     * API continue to run in the AutoJs6 process; no arbitrary privileged command is exposed to JS.
     */
    public Surface createPrivilegedSurface(
        String backend,
        int width,
        int height,
        int rotation,
        int timeoutMillis
    ) {
        validatePrivilegedSurfaceArguments(width, height, rotation, timeoutMillis);
        synchronized (privilegedSessionLock) {
            closeAllPrivilegedSurfacesLocked();
            String resolvedBackend = ImGuiHostPrivileges.resolveBackend(
                ImGuiHostPrivileges.probe(hostContext),
                backend
            );
            String token = newPrivilegedSessionToken();
            IImGuiPrivilegeBroker broker = awaitPrivilegeBroker(timeoutMillis);
            IImGuiPrivilegedEndpoint endpoint = null;
            Surface surface = null;
            boolean prepared = false;
            try {
                broker.prepare(token);
                prepared = true;
                String sourceDir = pluginContext.getApplicationInfo().sourceDir;
                String packageName = pluginContext.getPackageName();
                ImGuiHostPrivileges.CommandResult launch = ImGuiHostPrivileges.execute(
                    hostContext,
                    resolvedBackend,
                    buildPrivilegedLaunchCommand(
                        sourceDir,
                        token,
                        packageName,
                        Process.myUid() / 100_000
                    )
                );
                launch.throwIfError();
                endpoint = broker.awaitEndpoint(token, timeoutMillis);
                if (endpoint == null || !endpoint.asBinder().pingBinder()) {
                    throw new IllegalStateException(
                        "Timed out waiting for the " + resolvedBackend +
                            " ImGui process to register with the broker"
                    );
                }

                AtomicReference<String> inputError = new AtomicReference<>("");
                IImGuiInputCallback inputCallback = new IImGuiInputCallback.Stub() {
                    @Override
                    public void onTouch(int action, float x, float y, int trackingId) {
                        touchEvent(action, x, y, 0);
                    }

                    @Override
                    public void onError(String message) {
                        inputError.set(message == null ? "unknown direct-input error" : message);
                    }
                };
                surface = endpoint.createSurface(width, height, rotation, inputCallback);
                if (surface == null || !surface.isValid()) {
                    throw new IllegalStateException(
                        "The privileged process returned an invalid rendering Surface"
                    );
                }
                privilegedSurfaceHosts.put(
                    surface,
                    new PrivilegedSurfaceHost(
                        token,
                        resolvedBackend,
                        broker,
                        endpoint,
                        inputCallback,
                        inputError,
                        surface
                    )
                );
                return surface;
            } catch (RemoteException error) {
                throw new IllegalStateException(
                    "The privileged ImGui broker disconnected during startup",
                    error
                );
            } finally {
                if (surface == null || !privilegedSurfaceHosts.containsKey(surface)) {
                    closePrivilegedEndpointQuietly(endpoint);
                    if (prepared) {
                        clearPrivilegedBrokerQuietly(broker, token);
                    }
                    if (surface != null) {
                        surface.release();
                    }
                }
            }
        }
    }

    public String getPrivilegedSurfaceInfo(Surface surface) {
        if (surface == null) {
            return "unavailable";
        }
        synchronized (privilegedSessionLock) {
            PrivilegedSurfaceHost host = privilegedSurfaceHosts.get(surface);
            if (host == null) {
                return "unavailable";
            }
            String remoteInfo;
            try {
                remoteInfo = host.endpoint.info();
            } catch (RemoteException | RuntimeException error) {
                remoteInfo = "endpoint=disconnected;error=" + describePrivilegeError(error);
            }
            String inputError = host.inputError.get();
            return "backend=" + host.backend + ";" + remoteInfo +
                (inputError.isEmpty() ? "" : ";inputCallbackError=" + inputError);
        }
    }

    public String getPrivilegedSurfaceBackend(Surface surface) {
        if (surface == null) {
            return "";
        }
        synchronized (privilegedSessionLock) {
            PrivilegedSurfaceHost host = privilegedSurfaceHosts.get(surface);
            return host == null ? "" : host.backend;
        }
    }

    public boolean setPrivilegedInputEnabled(Surface surface, boolean enabled) {
        if (surface == null) {
            return false;
        }
        synchronized (privilegedSessionLock) {
            PrivilegedSurfaceHost host = privilegedSurfaceHosts.get(surface);
            if (host == null) {
                return false;
            }
            try {
                host.endpoint.setInputEnabled(enabled);
                return true;
            } catch (RemoteException | RuntimeException error) {
                host.inputError.set(describePrivilegeError(error));
                return false;
            }
        }
    }

    public void closePrivilegedSurface(Surface surface) {
        if (surface == null) {
            return;
        }
        synchronized (privilegedSessionLock) {
            PrivilegedSurfaceHost host = privilegedSurfaceHosts.remove(surface);
            if (host != null) {
                closePrivilegedSurfaceHost(host);
            }
        }
    }

    public SurfaceView createActivitySurface(boolean secure, boolean immersive) {
        return callOnMainThread(() -> {
            Activity activity = resolveCurrentActivity();
            if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
                throw new IllegalStateException(
                    "imgui.launch requires a currently resumed AutoJs6 Activity"
                );
            }
            Window window = activity.getWindow();
            View decorView = window.getDecorView();
            if (!(decorView instanceof ViewGroup)) {
                throw new IllegalStateException("The current Activity has no attachable decor view");
            }
            FrameLayout root = new FrameLayout(activity);
            root.setClipChildren(false);
            root.setClipToPadding(false);
            SurfaceView surfaceView = new SurfaceView(activity);
            surfaceView.setFocusable(true);
            root.addView(
                surfaceView,
                new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            );

            int originalSystemUiVisibility = decorView.getSystemUiVisibility();
            int originalWindowFlags = window.getAttributes().flags;
            int addedWindowFlags = WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
            window.addFlags(addedWindowFlags);
            if (secure) {
                window.addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                addedWindowFlags |= WindowManager.LayoutParams.FLAG_SECURE;
            }
            if (immersive) {
                decorView.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                );
            }
            ((ViewGroup) decorView).addView(
                root,
                new ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            );
            activitySurfaceHosts.put(
                surfaceView,
                new ActivitySurfaceHost(
                    activity,
                    root,
                    surfaceView,
                    originalSystemUiVisibility,
                    originalWindowFlags,
                    addedWindowFlags
                )
            );
            return surfaceView;
        });
    }

    public void closeActivitySurface(View anchor) {
        if (anchor == null) {
            return;
        }
        runOnMainThread(() -> {
            clearWindowTouchableRegionInternal(anchor);
            ActivitySurfaceHost host = activitySurfaceHosts.remove(anchor);
            if (host == null) {
                return;
            }
            ViewParent parent = host.root.getParent();
            if (parent instanceof ViewGroup) {
                ((ViewGroup) parent).removeView(host.root);
            }
            Window window = host.activity.getWindow();
            int clearableFlags = host.addedWindowFlags & ~host.originalWindowFlags;
            if (clearableFlags != 0) {
                window.clearFlags(clearableFlags);
            }
            window.getDecorView().setSystemUiVisibility(host.originalSystemUiVisibility);
        });
    }

    public boolean setWindowSecure(View anchor, boolean secure) {
        if (anchor == null) {
            return false;
        }
        return callOnMainThread(() -> {
            ActivitySurfaceHost activityHost = activitySurfaceHosts.get(anchor);
            if (activityHost != null) {
                Window window = activityHost.activity.getWindow();
                boolean originallySecure =
                    (activityHost.originalWindowFlags & WindowManager.LayoutParams.FLAG_SECURE) != 0;
                if (secure || originallySecure) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    if (!originallySecure) {
                        activityHost.addedWindowFlags |= WindowManager.LayoutParams.FLAG_SECURE;
                    }
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    activityHost.addedWindowFlags &= ~WindowManager.LayoutParams.FLAG_SECURE;
                }
                return true;
            }
            View root = anchor.getRootView();
            WindowManager.LayoutParams params = getWindowLayoutParams(root);
            if (params == null) {
                return false;
            }
            params.flags = secure
                ? params.flags | WindowManager.LayoutParams.FLAG_SECURE
                : params.flags & ~WindowManager.LayoutParams.FLAG_SECURE;
            return updateWindowLayout(root, params);
        });
    }

    /**
     * Enables Android's per-pointer window routing for the window containing {@code anchor}.
     * Both the main ImGui host and auxiliary floating buttons opt in so a new pointer can be
     * assigned to a different window while an earlier pointer remains down.
     */
    public boolean setWindowSplitTouch(View anchor, boolean enabled) {
        if (anchor == null) {
            return false;
        }
        return callOnMainThread(() -> {
            ActivitySurfaceHost activityHost = activitySurfaceHosts.get(anchor);
            if (activityHost != null) {
                Window window = activityHost.activity.getWindow();
                boolean originallyEnabled =
                    (activityHost.originalWindowFlags & WindowManager.LayoutParams.FLAG_SPLIT_TOUCH) != 0;
                if (enabled || originallyEnabled) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_SPLIT_TOUCH);
                    if (!originallyEnabled) {
                        activityHost.addedWindowFlags |= WindowManager.LayoutParams.FLAG_SPLIT_TOUCH;
                    }
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_SPLIT_TOUCH);
                    activityHost.addedWindowFlags &= ~WindowManager.LayoutParams.FLAG_SPLIT_TOUCH;
                }
                return true;
            }
            View root = anchor.getRootView();
            WindowManager.LayoutParams params = getWindowLayoutParams(root);
            if (params == null) {
                return false;
            }
            params.flags = enabled
                ? params.flags | WindowManager.LayoutParams.FLAG_SPLIT_TOUCH
                : params.flags & ~WindowManager.LayoutParams.FLAG_SPLIT_TOUCH;
            return updateWindowLayout(root, params);
        });
    }

    public boolean setWindowAlpha(View anchor, float alpha) {
        if (anchor == null) {
            return false;
        }
        float resolvedAlpha = Math.max(0.0F, Math.min(1.0F, alpha));
        return callOnMainThread(() -> {
            ActivitySurfaceHost activityHost = activitySurfaceHosts.get(anchor);
            if (activityHost != null) {
                activityHost.surfaceView.setAlpha(resolvedAlpha);
                return true;
            }
            View root = anchor.getRootView();
            WindowManager.LayoutParams params = getWindowLayoutParams(root);
            if (params == null) {
                root.setAlpha(resolvedAlpha);
                return true;
            }
            params.alpha = resolvedAlpha;
            return updateWindowLayout(root, params);
        });
    }

    public void setActivityTouchable(View anchor, boolean touchable) {
        if (anchor == null) {
            return;
        }
        runOnMainThread(() -> {
            ActivitySurfaceHost host = activitySurfaceHosts.get(anchor);
            if (host == null) {
                return;
            }
            host.surfaceView.setEnabled(touchable);
            host.surfaceView.setClickable(touchable);
        });
    }

    public int[] getViewSize(View anchor) {
        if (anchor == null) {
            return new int[] {0, 0};
        }
        return callOnMainThread(() -> new int[] {anchor.getWidth(), anchor.getHeight()});
    }

    public boolean setWindowTouchableRegion(View anchor, float[] rectangles) {
        if (anchor == null || rectangles == null || rectangles.length % 4 != 0 ||
            rectangles.length > 256
        ) {
            throw new IllegalArgumentException(
                "Touchable rectangles must contain at most 64 x1/y1/x2/y2 groups"
            );
        }
        float[] copy = rectangles.clone();
        return callOnMainThread(() -> {
            View root = resolveWindowRoot(anchor);
            if (root == null) {
                return false;
            }
            TouchableRegionController controller = touchableRegionControllers.get(root);
            if (controller == null) {
                controller = new TouchableRegionController(
                    anchor,
                    root,
                    activitySurfaceHosts.get(anchor)
                );
                touchableRegionControllers.put(root, controller);
            }
            return controller.update(copy);
        });
    }

    public void clearWindowTouchableRegion(View anchor) {
        if (anchor == null) {
            return;
        }
        runOnMainThread(() -> clearWindowTouchableRegionInternal(anchor));
    }

    public View createImeView(View anchor) {
        if (anchor == null) {
            throw new IllegalArgumentException("IME anchor view must not be null");
        }
        return callOnMainThread(() -> {
            ViewParent parent = anchor.getParent();
            if (!(parent instanceof ViewGroup)) {
                throw new IllegalStateException("IME anchor view is not attached to a ViewGroup");
            }
            ImGuiImeView inputView = new ImGuiImeView(anchor.getContext(), new ImGuiImeView.EventSink() {
                @Override
                public void addInputCharacters(String text) {
                    ImGuiPluginConnection.this.addInputCharacters(text);
                }

                @Override
                public void addKeyEvent(int key, boolean down) {
                    ImGuiPluginConnection.this.addKeyEvent(key, down);
                }
            });
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(1, 1);
            params.leftMargin = -2;
            params.topMargin = -2;
            ((ViewGroup) parent).addView(inputView, params);
            return inputView;
        });
    }

    public void showIme(View inputView) {
        if (!(inputView instanceof ImGuiImeView)) {
            throw new IllegalArgumentException("View was not created by createImeView");
        }
        runOnMainThread(((ImGuiImeView) inputView)::showKeyboard);
    }

    public void hideIme(View inputView) {
        if (!(inputView instanceof ImGuiImeView)) {
            return;
        }
        runOnMainThread(((ImGuiImeView) inputView)::hideKeyboard);
    }

    @Override
    public void onServiceConnected(ComponentName name, IBinder service) {
        if (name == null || !ImGuiPrivilegeBrokerService.class.getName().equals(name.getClassName())) {
            return;
        }
        synchronized (privilegeBrokerLock) {
            privilegeBroker = null;
            if (service == null) {
                privilegeBrokerError = "AutoJs6 supplied a null privilege-broker binder";
            } else {
                try {
                    String descriptor = service.getInterfaceDescriptor();
                    if (!PRIVILEGE_BROKER_DESCRIPTOR.equals(descriptor)) {
                        privilegeBrokerError =
                            "The plugin was not loaded from an installed APK; privileged mode " +
                                "requires the real broker service";
                    } else {
                        privilegeBroker = IImGuiPrivilegeBroker.Stub.asInterface(service);
                        privilegeBrokerError = null;
                    }
                } catch (RemoteException error) {
                    privilegeBrokerError =
                        "Unable to inspect the privilege-broker binder: " +
                            describePrivilegeError(error);
                }
            }
            privilegeBrokerLock.notifyAll();
        }
    }

    @Override
    public void onServiceDisconnected(ComponentName name) {
        if (name == null || !ImGuiPrivilegeBrokerService.class.getName().equals(name.getClassName())) {
            return;
        }
        synchronized (privilegeBrokerLock) {
            privilegeBroker = null;
            privilegeBrokerError = "The privilege-broker service disconnected";
            privilegeBrokerLock.notifyAll();
        }
    }

    private ResolvedBitmap resolveTextureBitmap(Object source, int depth) {
        if (source == null) {
            throw new IllegalArgumentException("Texture source must not be null");
        }
        if (depth > 4) {
            throw new IllegalArgumentException("Texture source wrappers are nested too deeply");
        }

        ResolvedBitmap resolved;
        if (source instanceof Bitmap) {
            resolved = new ResolvedBitmap((Bitmap) source, false);
        } else if (source instanceof byte[]) {
            resolved = decodeTextureBytes((byte[]) source);
        } else if (source instanceof ByteBuffer) {
            ByteBuffer buffer = ((ByteBuffer) source).duplicate();
            if (buffer.remaining() > MAX_ENCODED_TEXTURE_BYTES) {
                throw new IllegalArgumentException("Encoded texture data exceeds 128 MiB");
            }
            byte[] bytes = new byte[buffer.remaining()];
            buffer.get(bytes);
            resolved = decodeTextureBytes(bytes);
        } else if (source instanceof File) {
            resolved = decodeTextureFile((File) source);
        } else if (source instanceof CharSequence) {
            String path = source.toString();
            if (path.startsWith("file:")) {
                String uriPath = Uri.parse(path).getPath();
                path = uriPath == null ? path.substring("file:".length()) : uriPath;
            }
            resolved = decodeTextureFile(new File(path));
        } else if (source instanceof InputStream) {
            resolved = decodeTextureBytes(readTextureBytes((InputStream) source));
        } else {
            Object unwrapped = invokeTextureAccessor(source, "unwrap", false);
            if (unwrapped != null && unwrapped != source) {
                return resolveTextureBitmap(unwrapped, depth + 1);
            }
            Object bitmap = invokeTextureAccessor(source, "getBitmap", true);
            if (bitmap == null || bitmap == source) {
                throw new IllegalArgumentException(
                    "Unsupported texture source " + source.getClass().getName() +
                    "; expected a path, encoded bytes, Bitmap, or AutoJs6 Image"
                );
            }
            return resolveTextureBitmap(bitmap, depth + 1);
        }
        return normalizeTextureBitmap(resolved);
    }

    private ResolvedBitmap decodeTextureFile(File file) {
        if (!file.isFile() || !file.canRead()) {
            throw new IllegalArgumentException("Texture file is not readable: " + file.getAbsolutePath());
        }
        if (file.length() == 0L || file.length() > MAX_ENCODED_TEXTURE_BYTES) {
            throw new IllegalArgumentException("Encoded texture file must contain 1 byte to 128 MiB");
        }
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);
        validateTextureDimensions(bounds.outWidth, bounds.outHeight);
        Bitmap bitmap = BitmapFactory.decodeFile(file.getAbsolutePath());
        if (bitmap == null) {
            throw new IllegalArgumentException("Unable to decode texture file: " + file.getAbsolutePath());
        }
        return new ResolvedBitmap(bitmap, true);
    }

    private ResolvedBitmap decodeTextureBytes(byte[] bytes) {
        if (bytes.length == 0 || bytes.length > MAX_ENCODED_TEXTURE_BYTES) {
            throw new IllegalArgumentException("Encoded texture data must contain 1 byte to 128 MiB");
        }
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
        validateTextureDimensions(bounds.outWidth, bounds.outHeight);
        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) {
            throw new IllegalArgumentException("Unable to decode the encoded texture data");
        }
        return new ResolvedBitmap(bitmap, true);
    }

    private byte[] readTextureBytes(InputStream input) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[16 * 1024];
        int total = 0;
        try {
            int read;
            while ((read = input.read(buffer)) >= 0) {
                if (read == 0) {
                    continue;
                }
                total += read;
                if (total > MAX_ENCODED_TEXTURE_BYTES) {
                    throw new IllegalArgumentException("Encoded texture stream exceeds 128 MiB");
                }
                output.write(buffer, 0, read);
            }
        } catch (IOException error) {
            throw new IllegalArgumentException("Unable to read the encoded texture stream", error);
        }
        return output.toByteArray();
    }

    private ResolvedBitmap normalizeTextureBitmap(ResolvedBitmap resolved) {
        Bitmap bitmap = resolved.bitmap;
        if (bitmap.isRecycled()) {
            throw new IllegalArgumentException("Texture bitmap has already been recycled");
        }
        validateTextureDimensions(bitmap.getWidth(), bitmap.getHeight());
        if (bitmap.getConfig() == Bitmap.Config.ARGB_8888) {
            return resolved;
        }
        Bitmap copy = bitmap.copy(Bitmap.Config.ARGB_8888, false);
        if (copy == null) {
            resolved.recycleOwnedBitmap();
            throw new IllegalArgumentException("Unable to convert the texture bitmap to ARGB_8888");
        }
        resolved.recycleOwnedBitmap();
        return new ResolvedBitmap(copy, true);
    }

    private void validateTextureDimensions(int width, int height) {
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException("Texture data has no decodable image dimensions");
        }
        if ((long) width * (long) height > MAX_TEXTURE_PIXELS) {
            throw new IllegalArgumentException("Texture exceeds the 32-megapixel safety limit");
        }
    }

    private Object invokeTextureAccessor(Object source, String methodName, boolean reportFailure) {
        final Method method;
        try {
            method = source.getClass().getMethod(methodName);
        } catch (NoSuchMethodException ignored) {
            return null;
        }
        try {
            return method.invoke(source);
        } catch (IllegalAccessException | InvocationTargetException error) {
            if (!reportFailure) {
                return null;
            }
            Throwable cause = error instanceof InvocationTargetException &&
                ((InvocationTargetException) error).getCause() != null
                ? ((InvocationTargetException) error).getCause()
                : error;
            throw new IllegalArgumentException(
                "Unable to obtain a Bitmap from " + source.getClass().getName(),
                cause
            );
        }
    }

    private Activity resolveCurrentActivity() {
        Activity direct = unwrapActivity(hostContext);
        if (direct != null) {
            return direct;
        }
        Object app = invokeNoArg(runtime, "getApp");
        if (app == null) {
            app = readPublicField(runtime, "app");
        }
        Object current = invokeNoArg(app, "getCurrentActivity");
        if (current instanceof Activity) {
            return (Activity) current;
        }
        Object autoJs = invokeHostStaticNoArg("org.autojs.autojs.AutoJs", "getInstance");
        if (autoJs == null) {
            autoJs = invokeHostStaticNoArg("com.stardust.autojs.AutoJs", "getInstance");
        }
        Object appUtils = invokeNoArg(autoJs, "getAppUtils");
        current = invokeNoArg(appUtils, "getCurrentActivity");
        return current instanceof Activity ? (Activity) current : null;
    }

    private Activity unwrapActivity(Context context) {
        Context current = context;
        for (int depth = 0; depth < 16 && current != null; depth += 1) {
            if (current instanceof Activity) {
                return (Activity) current;
            }
            if (!(current instanceof ContextWrapper)) {
                break;
            }
            Context base = ((ContextWrapper) current).getBaseContext();
            if (base == current) {
                break;
            }
            current = base;
        }
        return null;
    }

    private Object invokeNoArg(Object target, String methodName) {
        if (target == null) {
            return null;
        }
        try {
            return target.getClass().getMethod(methodName).invoke(target);
        } catch (NoSuchMethodException | IllegalAccessException | InvocationTargetException ignored) {
            return null;
        }
    }

    private Object readPublicField(Object target, String fieldName) {
        if (target == null) {
            return null;
        }
        try {
            return target.getClass().getField(fieldName).get(target);
        } catch (NoSuchFieldException | IllegalAccessException | RuntimeException ignored) {
            return null;
        }
    }

    private Object invokeHostStaticNoArg(String className, String methodName) {
        try {
            Class<?> type = Class.forName(className, true, hostContext.getClassLoader());
            return type.getMethod(methodName).invoke(null);
        } catch (ClassNotFoundException | NoSuchMethodException | IllegalAccessException |
            InvocationTargetException | RuntimeException ignored
        ) {
            return null;
        }
    }

    private WindowManager.LayoutParams getWindowLayoutParams(View root) {
        if (root == null || !(root.getLayoutParams() instanceof WindowManager.LayoutParams)) {
            return null;
        }
        return (WindowManager.LayoutParams) root.getLayoutParams();
    }

    private boolean updateWindowLayout(View root, WindowManager.LayoutParams params) {
        Object service = root.getContext().getSystemService(Context.WINDOW_SERVICE);
        if (!(service instanceof WindowManager)) {
            return false;
        }
        try {
            ((WindowManager) service).updateViewLayout(root, params);
            return true;
        } catch (IllegalArgumentException | IllegalStateException error) {
            return false;
        }
    }

    private View resolveWindowRoot(View anchor) {
        ActivitySurfaceHost activityHost = activitySurfaceHosts.get(anchor);
        return activityHost == null ? anchor.getRootView() : activityHost.activity.getWindow().getDecorView();
    }

    private void clearWindowTouchableRegionInternal(View anchor) {
        View root = resolveWindowRoot(anchor);
        if (root == null) {
            return;
        }
        TouchableRegionController controller = touchableRegionControllers.remove(root);
        if (controller == null) {
            return;
        }
        controller.close();
    }

    private IImGuiPrivilegeBroker awaitPrivilegeBroker(long timeoutMillis) {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMillis);
        synchronized (privilegeBrokerLock) {
            while (privilegeBroker == null || !privilegeBroker.asBinder().pingBinder()) {
                if (Looper.myLooper() == Looper.getMainLooper()) {
                    throw new IllegalStateException(
                        "The privilege broker has not connected yet; start privileged mode from " +
                            "an AutoJs6 script thread"
                    );
                }
                long remainingNanos = deadline - System.nanoTime();
                if (remainingNanos <= 0L) {
                    throw new IllegalStateException(
                        privilegeBrokerError == null
                            ? "Timed out waiting for AutoJs6 to bind the privilege broker"
                            : privilegeBrokerError
                    );
                }
                try {
                    TimeUnit.NANOSECONDS.timedWait(privilegeBrokerLock, remainingNanos);
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(
                        "Interrupted while waiting for AutoJs6 to bind the privilege broker",
                        error
                    );
                }
            }
            return privilegeBroker;
        }
    }

    private void closeAllPrivilegedSurfaces() {
        synchronized (privilegedSessionLock) {
            closeAllPrivilegedSurfacesLocked();
        }
    }

    private void closeAllPrivilegedSurfacesLocked() {
        if (privilegedSurfaceHosts.isEmpty()) {
            return;
        }
        List<PrivilegedSurfaceHost> hosts = new ArrayList<>(privilegedSurfaceHosts.values());
        privilegedSurfaceHosts.clear();
        for (PrivilegedSurfaceHost host : hosts) {
            closePrivilegedSurfaceHost(host);
        }
    }

    private static void closePrivilegedSurfaceHost(PrivilegedSurfaceHost host) {
        closePrivilegedEndpointQuietly(host.endpoint);
        clearPrivilegedBrokerQuietly(host.broker, host.token);
        host.surface.release();
    }

    private static void closePrivilegedEndpointQuietly(IImGuiPrivilegedEndpoint endpoint) {
        if (endpoint == null) {
            return;
        }
        try {
            endpoint.close();
        } catch (RemoteException | RuntimeException ignored) {
            // A dead endpoint has already released its privileged layer and input reader.
        }
    }

    private static void clearPrivilegedBrokerQuietly(
        IImGuiPrivilegeBroker broker,
        String token
    ) {
        if (broker == null || token == null) {
            return;
        }
        try {
            broker.clear(token);
        } catch (RemoteException | RuntimeException ignored) {
            // A newer session or a dead broker has already made this token unusable.
        }
    }

    private static void validatePrivilegedSurfaceArguments(
        int width,
        int height,
        int rotation,
        int timeoutMillis
    ) {
        if (width < 1 || width > MAX_PRIVILEGED_SURFACE_SIZE ||
            height < 1 || height > MAX_PRIVILEGED_SURFACE_SIZE
        ) {
            throw new IllegalArgumentException(
                "Privileged Surface dimensions must be between 1 and " +
                    MAX_PRIVILEGED_SURFACE_SIZE
            );
        }
        if (rotation != 0 && rotation != 90 && rotation != 180 && rotation != 270) {
            throw new IllegalArgumentException("Rotation must be 0, 90, 180, or 270 degrees");
        }
        if (timeoutMillis < 1 || timeoutMillis > MAX_PRIVILEGED_START_TIMEOUT_MILLIS) {
            throw new IllegalArgumentException(
                "Privileged startup timeout must be between 1 and " +
                    MAX_PRIVILEGED_START_TIMEOUT_MILLIS + " milliseconds"
            );
        }
    }

    static String buildPrivilegedLaunchCommand(
        String sourceDir,
        String token,
        String packageName,
        int userId
    ) {
        if (sourceDir == null || sourceDir.isEmpty() || sourceDir.indexOf('\0') >= 0) {
            throw new IllegalArgumentException("Plugin APK path is unavailable");
        }
        if (token == null || !PRIVILEGED_TOKEN_PATTERN.matcher(token).matches()) {
            throw new IllegalArgumentException(
                "Privileged session token must be 64 lowercase hexadecimal digits"
            );
        }
        if (packageName == null || !PACKAGE_NAME_PATTERN.matcher(packageName).matches()) {
            throw new IllegalArgumentException("Plugin package name is malformed");
        }
        if (userId < 0 || userId > 21_474) {
            throw new IllegalArgumentException("Android user ID is out of range");
        }
        return "if [ ! -x /system/bin/setsid ]; then " +
            "echo 'Android setsid executable is unavailable' >&2; exit 69; fi; " +
            "CLASSPATH=" + shellQuote(sourceDir) +
            " /system/bin/setsid /system/bin/app_process /system/bin " +
            PRIVILEGED_PROCESS_CLASS + " broker-child " + token + " " + packageName +
            " " + userId +
            " </dev/null >/dev/null 2>&1 &";
    }

    private static String newPrivilegedSessionToken() {
        byte[] bytes = new byte[32];
        PRIVILEGED_SESSION_RANDOM.nextBytes(bytes);
        StringBuilder token = new StringBuilder(64);
        for (byte value : bytes) {
            token.append(Character.forDigit((value >>> 4) & 0x0F, 16));
            token.append(Character.forDigit(value & 0x0F, 16));
        }
        return token.toString();
    }

    static String shellQuote(String value) {
        if (value == null || value.indexOf('\0') >= 0) {
            throw new IllegalArgumentException("Shell value is unavailable");
        }
        return "'" + value.replace("'", "'\"'\"'") + "'";
    }

    private static String describePrivilegeError(Throwable error) {
        String message = error.getMessage();
        return error.getClass().getSimpleName() +
            (message == null || message.trim().isEmpty() ? "" : ": " + message.trim());
    }

    private void requireOwner() {
        if (!isOwner()) {
            throw new IllegalStateException("This ImGui bridge no longer owns the native rendering context");
        }
    }

    private void runOnMainThread(Runnable action) {
        callOnMainThread(() -> {
            action.run();
            return null;
        });
    }

    private <T> T callOnMainThread(MainThreadCallable<T> action) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return action.call();
        }

        AtomicReference<T> result = new AtomicReference<>();
        AtomicReference<RuntimeException> failure = new AtomicReference<>();
        CountDownLatch completed = new CountDownLatch(1);
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                result.set(action.call());
            } catch (RuntimeException error) {
                failure.set(error);
            } finally {
                completed.countDown();
            }
        });
        try {
            if (!completed.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out while updating an ImGui host view");
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while updating an ImGui host view", error);
        }
        if (failure.get() != null) {
            throw failure.get();
        }
        return result.get();
    }

    private interface MainThreadCallable<T> {
        T call();
    }

    private static final class PrivilegedSurfaceHost {

        final String token;
        final String backend;
        final IImGuiPrivilegeBroker broker;
        final IImGuiPrivilegedEndpoint endpoint;
        @SuppressWarnings("unused")
        final IImGuiInputCallback inputCallback;
        final AtomicReference<String> inputError;
        final Surface surface;

        PrivilegedSurfaceHost(
            String token,
            String backend,
            IImGuiPrivilegeBroker broker,
            IImGuiPrivilegedEndpoint endpoint,
            IImGuiInputCallback inputCallback,
            AtomicReference<String> inputError,
            Surface surface
        ) {
            this.token = token;
            this.backend = backend;
            this.broker = broker;
            this.endpoint = endpoint;
            this.inputCallback = inputCallback;
            this.inputError = inputError;
            this.surface = surface;
        }
    }

    private static final class ActivitySurfaceHost {

        final Activity activity;
        final FrameLayout root;
        final SurfaceView surfaceView;
        final int originalSystemUiVisibility;
        final int originalWindowFlags;
        int addedWindowFlags;

        ActivitySurfaceHost(
            Activity activity,
            FrameLayout root,
            SurfaceView surfaceView,
            int originalSystemUiVisibility,
            int originalWindowFlags,
            int addedWindowFlags
        ) {
            this.activity = activity;
            this.root = root;
            this.surfaceView = surfaceView;
            this.originalSystemUiVisibility = originalSystemUiVisibility;
            this.originalWindowFlags = originalWindowFlags;
            this.addedWindowFlags = addedWindowFlags;
        }
    }

    private final class TouchableRegionController {

        private final View anchor;
        private final View root;
        private final ActivitySurfaceHost activityHost;
        private final List<TouchProxy> proxies = new ArrayList<>();

        TouchableRegionController(
            View anchor,
            View root,
            ActivitySurfaceHost activityHost
        ) {
            this.anchor = anchor;
            this.root = root;
            this.activityHost = activityHost;
        }

        boolean update(float[] rectangles) {
            int maxWidth = Math.max(0, anchor.getWidth());
            int maxHeight = Math.max(0, anchor.getHeight());
            List<int[]> resolved = new ArrayList<>(rectangles.length / 4);
            for (int index = 0; index < rectangles.length; index += 4) {
                int left = Math.max(0, (int) Math.floor(rectangles[index]));
                int top = Math.max(0, (int) Math.floor(rectangles[index + 1]));
                int right = (int) Math.ceil(rectangles[index + 2]);
                int bottom = (int) Math.ceil(rectangles[index + 3]);
                if (maxWidth > 0) {
                    right = Math.min(maxWidth, right);
                }
                if (maxHeight > 0) {
                    bottom = Math.min(maxHeight, bottom);
                }
                if (right > left && bottom > top) {
                    resolved.add(new int[] {left, top, right, bottom});
                }
            }
            if (activityHost != null) {
                activityHost.surfaceView.setEnabled(false);
                activityHost.surfaceView.setClickable(false);
                updateActivityProxies(resolved);
                return true;
            }
            return updateOverlayProxies(resolved);
        }

        void close() {
            while (!proxies.isEmpty()) {
                removeProxy(proxies.size() - 1);
            }
        }

        private void updateActivityProxies(List<int[]> rectangles) {
            for (int index = 0; index < rectangles.size(); index += 1) {
                TouchProxy proxy = obtainProxy(index, false, null);
                int[] bounds = rectangles.get(index);
                proxy.left = bounds[0];
                proxy.top = bounds[1];
                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    bounds[2] - bounds[0],
                    bounds[3] - bounds[1]
                );
                params.leftMargin = bounds[0];
                params.topMargin = bounds[1];
                proxy.view.setLayoutParams(params);
                proxy.view.bringToFront();
            }
            trimProxies(rectangles.size());
        }

        private boolean updateOverlayProxies(List<int[]> rectangles) {
            WindowManager.LayoutParams hostParams = getWindowLayoutParams(root);
            Object service = root.getContext().getSystemService(Context.WINDOW_SERVICE);
            if (hostParams == null || !(service instanceof WindowManager)) {
                close();
                return false;
            }
            WindowManager manager = (WindowManager) service;
            if ((hostParams.flags & WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE) == 0) {
                hostParams.flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
                if (!updateWindowLayout(root, hostParams)) {
                    close();
                    return false;
                }
            }
            int[] location = new int[2];
            anchor.getLocationOnScreen(location);
            for (int index = 0; index < rectangles.size(); index += 1) {
                TouchProxy proxy = obtainProxy(index, true, manager);
                int[] bounds = rectangles.get(index);
                proxy.left = bounds[0];
                proxy.top = bounds[1];
                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    bounds[2] - bounds[0],
                    bounds[3] - bounds[1],
                    hostParams.type,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS |
                        WindowManager.LayoutParams.FLAG_SPLIT_TOUCH,
                    PixelFormat.TRANSLUCENT
                );
                if ((hostParams.flags & WindowManager.LayoutParams.FLAG_SECURE) != 0) {
                    params.flags |= WindowManager.LayoutParams.FLAG_SECURE;
                }
                params.gravity = Gravity.TOP | Gravity.START;
                params.x = location[0] + bounds[0];
                params.y = location[1] + bounds[1];
                params.token = hostParams.token;
                params.packageName = hostParams.packageName;
                try {
                    if (proxy.attached) {
                        manager.updateViewLayout(proxy.view, params);
                    } else {
                        manager.addView(proxy.view, params);
                        proxy.attached = true;
                    }
                } catch (IllegalArgumentException | IllegalStateException error) {
                    close();
                    return false;
                }
            }
            trimProxies(rectangles.size());
            return true;
        }

        private TouchProxy obtainProxy(
            int index,
            boolean overlay,
            WindowManager manager
        ) {
            if (index < proxies.size()) {
                return proxies.get(index);
            }
            View proxyView = new View(anchor.getContext());
            proxyView.setBackgroundColor(0x00000000);
            proxyView.setClickable(true);
            proxyView.setFocusable(false);
            TouchProxy proxy = new TouchProxy(proxyView, overlay, manager);
            proxyView.setOnTouchListener((view, event) -> dispatchProxyTouch(proxy, event));
            if (!overlay) {
                activityHost.root.addView(proxyView);
                proxy.attached = true;
            }
            proxies.add(proxy);
            return proxy;
        }

        private boolean dispatchProxyTouch(TouchProxy proxy, MotionEvent event) {
            MotionEvent translated = MotionEvent.obtain(event);
            try {
                translated.offsetLocation(proxy.left, proxy.top);
                anchor.dispatchTouchEvent(translated);
                return true;
            } finally {
                translated.recycle();
            }
        }

        private void trimProxies(int count) {
            while (proxies.size() > count) {
                removeProxy(proxies.size() - 1);
            }
        }

        private void removeProxy(int index) {
            TouchProxy proxy = proxies.remove(index);
            if (!proxy.attached) {
                return;
            }
            try {
                if (proxy.overlay && proxy.manager != null) {
                    proxy.manager.removeViewImmediate(proxy.view);
                } else {
                    ViewParent parent = proxy.view.getParent();
                    if (parent instanceof ViewGroup) {
                        ((ViewGroup) parent).removeView(proxy.view);
                    }
                }
            } catch (IllegalArgumentException | IllegalStateException ignored) {
                // The owning window may already have been removed by the host.
            }
            proxy.attached = false;
        }

        private final class TouchProxy {

            final View view;
            final boolean overlay;
            final WindowManager manager;
            int left;
            int top;
            boolean attached;

            TouchProxy(View view, boolean overlay, WindowManager manager) {
                this.view = view;
                this.overlay = overlay;
                this.manager = manager;
            }
        }

    }

    private static final class ResolvedBitmap {

        final Bitmap bitmap;
        final boolean owned;

        ResolvedBitmap(Bitmap bitmap, boolean owned) {
            this.bitmap = bitmap;
            this.owned = owned;
        }

        void recycleOwnedBitmap() {
            if (owned && !bitmap.isRecycled()) {
                bitmap.recycle();
            }
        }
    }
}
