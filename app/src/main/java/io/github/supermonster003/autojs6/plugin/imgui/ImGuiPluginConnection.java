package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.ComponentName;
import android.content.Context;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.view.Surface;

import java.util.concurrent.locks.ReentrantLock;

public final class ImGuiPluginConnection implements ServiceConnection {

    private static final ReentrantLock NATIVE_LOCK = new ReentrantLock(true);
    private static volatile Object nativeOwnerToken;

    private final Context pluginContext;
    private final Object ownerToken = new Object();
    private volatile boolean revoked;
    private Thread frameThread;

    ImGuiPluginConnection(Context hostContext, Context pluginContext) {
        if (hostContext.getApplicationContext() == null) {
            throw new IllegalArgumentException("Host application context is unavailable");
        }
        Context applicationContext = pluginContext.getApplicationContext();
        this.pluginContext = applicationContext == null ? pluginContext : applicationContext;
        ImGuiNative.load();
    }

    public int getVersion() {
        return 1;
    }

    public String getAssetsScriptDir() {
        return ImGuiPluginContract.SCRIPT_DIRECTORY;
    }

    public ComponentName getService() {
        return null;
    }

    public String version() {
        return ImGuiNative.nativeVersion();
    }

    public boolean init(Surface surface, float density, String fontPath, float fontSize) {
        if (surface == null || !surface.isValid()) {
            return false;
        }
        NATIVE_LOCK.lock();
        try {
            if (nativeOwnerToken != null) {
                ImGuiNative.nativeShutdown();
            }
            nativeOwnerToken = ownerToken;
            revoked = false;
            boolean initialized = ImGuiNative.nativeInit(
                pluginContext.getAssets(),
                surface,
                density,
                fontPath,
                fontSize
            );
            if (!initialized) {
                nativeOwnerToken = null;
            }
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
            if (nativeOwnerToken == ownerToken) {
                ImGuiNative.nativeShutdown();
                nativeOwnerToken = null;
            }
            revoked = true;
        } finally {
            NATIVE_LOCK.unlock();
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

    public boolean newFrame() {
        if (frameThread != null) {
            throw new IllegalStateException("An ImGui frame is already active");
        }
        NATIVE_LOCK.lock();
        boolean keepLock = false;
        try {
            requireOwner();
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
            return ImGuiNative.nativeRender();
        } finally {
            frameThread = null;
            NATIVE_LOCK.unlock();
        }
    }

    public void touchEvent(int action, float x, float y) {
        NATIVE_LOCK.lock();
        try {
            if (isOwner()) {
                ImGuiNative.nativeTouchEvent(action, x, y);
            }
        } finally {
            NATIVE_LOCK.unlock();
        }
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
        requireOwner();
        return ImGuiNative.nativeWantCaptureMouse();
    }

    public boolean isAnyItemHovered() {
        requireOwner();
        return ImGuiNative.nativeIsAnyItemHovered();
    }

    public boolean isAnyItemActive() {
        requireOwner();
        return ImGuiNative.nativeIsAnyItemActive();
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

    public void showDemoWindow(boolean[] open) {
        requireOwner();
        ImGuiNative.nativeShowDemoWindow(open);
    }

    @Override
    public void onServiceConnected(ComponentName name, IBinder service) {
        // Version 1 plugins do not use a bound service connection.
    }

    @Override
    public void onServiceDisconnected(ComponentName name) {
        // Version 1 plugins do not use a bound service connection.
    }

    private void requireOwner() {
        if (!isOwner()) {
            throw new IllegalStateException("This ImGui bridge no longer owns the native rendering context");
        }
    }
}
