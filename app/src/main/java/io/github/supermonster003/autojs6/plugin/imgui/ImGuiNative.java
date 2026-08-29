package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.res.AssetManager;
import android.view.Surface;

final class ImGuiNative {

    private static final String LIBRARY_NAME = "autojs6_imgui";
    private static boolean loaded;

    private ImGuiNative() {
        throw new AssertionError("No instances");
    }

    static synchronized void load() {
        if (loaded) {
            return;
        }
        System.loadLibrary(LIBRARY_NAME);
        loaded = true;
    }

    static native String nativeVersion();

    static native boolean nativeInit(
        AssetManager assetManager,
        Surface surface,
        float density,
        String fontPath,
        float fontSize
    );

    static native void nativeShutdown();

    static native boolean nativeIsReady();

    static native boolean nativeNewFrame();

    static native boolean nativeRender();

    static native void nativeTouchEvent(int action, float x, float y);

    static native void nativeSetNextWindowPos(
        float x,
        float y,
        int condition,
        float pivotX,
        float pivotY
    );

    static native void nativeSetNextWindowSize(float width, float height, int condition);

    static native void nativeSetNextWindowSizeConstraints(
        float minWidth,
        float minHeight,
        float maxWidth,
        float maxHeight
    );

    static native void nativeSetNextWindowBgAlpha(float alpha);

    static native boolean nativeBegin(String name, boolean[] open, int flags);

    static native void nativeEnd();

    static native boolean nativeBeginChild(
        String id,
        float width,
        float height,
        boolean borders,
        int flags
    );

    static native void nativeEndChild();

    static native float[] nativeGetWindowPos();

    static native float[] nativeGetWindowSize();

    static native float[] nativeGetContentRegionAvail();

    static native float[] nativeGetCursorPos();

    static native void nativeSetCursorPos(float x, float y);

    static native void nativeText(String text);

    static native void nativeTextWrapped(String text);

    static native void nativeTextColored(float red, float green, float blue, float alpha, String text);

    static native boolean nativeButton(String label, float width, float height);

    static native boolean nativeSmallButton(String label);

    static native boolean nativeCheckbox(String label, boolean[] value);

    static native boolean nativeRadioButton(String label, int[] value, int buttonValue);

    static native boolean nativeSliderFloat(
        String label,
        float[] value,
        float min,
        float max,
        String format,
        int flags
    );

    static native boolean nativeSliderInt(
        String label,
        int[] value,
        int min,
        int max,
        String format,
        int flags
    );

    static native boolean nativeDragFloat(
        String label,
        float[] value,
        float speed,
        float min,
        float max,
        String format,
        int flags
    );

    static native boolean nativeDragInt(
        String label,
        int[] value,
        float speed,
        int min,
        int max,
        String format,
        int flags
    );

    static native boolean nativeInputText(String label, String[] value, int maxLength, int flags);

    static native boolean nativeColorEdit3(String label, float[] value, int flags);

    static native boolean nativeColorEdit4(String label, float[] value, int flags);

    static native void nativeProgressBar(float fraction, float width, float height, String overlay);

    static native boolean nativeCombo(String label, int[] currentItem, String[] items, int popupHeight);

    static native boolean nativeSelectable(
        String label,
        boolean selected,
        int flags,
        float width,
        float height
    );

    static native boolean nativeCollapsingHeader(String label, int flags);

    static native boolean nativeTreeNode(String label);

    static native void nativeTreePop();

    static native boolean nativeBeginTabBar(String id, int flags);

    static native void nativeEndTabBar();

    static native boolean nativeBeginTabItem(String label, boolean[] open, int flags);

    static native void nativeEndTabItem();

    static native void nativeSameLine(float offsetFromStartX, float spacing);

    static native void nativeSeparator();

    static native void nativeSpacing();

    static native void nativeNewLine();

    static native void nativeDummy(float width, float height);

    static native void nativeSetNextItemWidth(float width);

    static native void nativePushItemWidth(float width);

    static native void nativePopItemWidth();

    static native boolean nativeIsItemClicked(int mouseButton);

    static native boolean nativeIsItemHovered(int flags);

    static native boolean nativeWantCaptureMouse();

    static native boolean nativeIsAnyItemHovered();

    static native boolean nativeIsAnyItemActive();

    static native void nativeStyleColorsDark();

    static native void nativeStyleColorsLight();

    static native void nativeStyleColorsClassic();

    static native void nativeShowDemoWindow(boolean[] open);
}
