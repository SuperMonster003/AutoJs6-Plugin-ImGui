package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.res.AssetManager;
import android.graphics.Bitmap;
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

    static synchronized void loadAbsolute(String absolutePath) {
        if (loaded) {
            return;
        }
        if (absolutePath == null || absolutePath.isEmpty()) {
            throw new IllegalArgumentException("Native library path must not be empty");
        }
        System.load(absolutePath);
        loaded = true;
    }

    static native String nativeVersion();

    static native boolean nativeInit(
        AssetManager assetManager,
        Surface surface,
        float density,
        String fontPath,
        float fontSize,
        String iniPath,
        String[] additionalFontPaths,
        float[] additionalFontSizes
    );

    static native void nativeShutdown();

    static native boolean nativeDetachSurface();

    static native boolean nativeAttachSurface(Surface surface);

    static native boolean nativeIsReady();

    static native boolean nativeNewFrame();

    static native boolean nativeRender();

    static native float[] nativeGetAutoResizeBounds();

    static native float[] nativeGetInteractiveWindowRects();

    static native void nativeTouchEvent(int action, float x, float y, int mouseButton);

    static native long[] nativeCreateTexture(Bitmap bitmap, int flags);

    static native boolean nativeDestroyTexture(long handle);

    static native void nativeImage(
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
    );

    static native boolean nativeImageButton(
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
    );

    static native void nativeDrawLine(
        int layer,
        float x1,
        float y1,
        float x2,
        float y2,
        int color,
        float thickness
    );

    static native void nativeDrawRect(
        int layer,
        float minX,
        float minY,
        float maxX,
        float maxY,
        int color,
        float rounding,
        float thickness,
        int flags
    );

    static native void nativeDrawRectFilled(
        int layer,
        float minX,
        float minY,
        float maxX,
        float maxY,
        int color,
        float rounding,
        int flags
    );

    static native void nativeDrawCircle(
        int layer,
        float x,
        float y,
        float radius,
        int color,
        int segments,
        float thickness
    );

    static native void nativeDrawCircleFilled(
        int layer,
        float x,
        float y,
        float radius,
        int color,
        int segments
    );

    static native void nativeDrawTriangle(
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
    );

    static native void nativeDrawText(
        int layer,
        float x,
        float y,
        int color,
        String text,
        int fontIndex,
        float fontSize,
        float wrapWidth
    );

    static native void nativeDrawPolyline(
        int layer,
        float[] points,
        int color,
        float thickness,
        int flags
    );

    static native void nativeDrawBezierCubic(
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
    );

    static native void nativeDrawImage(
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
    );

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

    static native void nativeSetKeyboardFocusHere(int offset);

    static native boolean nativeBegin(String name, boolean[] open, int flags);

    static native void nativeEnd();

    static native boolean nativeBeginChild(
        String id,
        float width,
        float height,
        boolean borders,
        int flags
    );

    static native boolean nativeBeginChildEx(
        String id,
        float width,
        float height,
        int childFlags,
        int windowFlags
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

    static native void nativeResetStyle(int colorPreset);

    static native void nativeSetStyleColor(
        int index,
        float red,
        float green,
        float blue,
        float alpha
    );

    static native void nativeSetStyleVar(int index, float x, float y);

    static native void nativeShowDemoWindow(boolean[] open);

    static native void nativeSetDebugMode(boolean enabled);

    static native void nativeShowDebugWindows();

    static native void nativeRecoverFrame();

    static native String[] nativeTakeDebugMessages();

    static native void nativeSeparatorText(String label);

    static native void nativeBullet();

    static native void nativeBulletText(String text);

    static native void nativeLabelText(String label, String text);

    static native void nativeTextDisabled(String text);

    static native boolean nativeArrowButton(String id, int direction);

    static native boolean nativeInvisibleButton(String id, float width, float height, int flags);

    static native boolean nativeInputInt(String label, int[] value, int step, int stepFast, int flags);

    static native boolean nativeInputFloat(
        String label,
        float[] value,
        float step,
        float stepFast,
        String format,
        int flags
    );

    static native boolean nativeInputTextMultiline(
        String label,
        String[] value,
        int maxLength,
        float width,
        float height,
        int flags
    );

    static native boolean nativeBeginListBox(String label, float width, float height);

    static native void nativeEndListBox();

    static native boolean nativeListBox(
        String label,
        int[] currentItem,
        String[] items,
        int heightInItems
    );

    static native boolean nativeColorPicker3(String label, float[] value, int flags);

    static native boolean nativeColorPicker4(String label, float[] value, int flags);

    static native boolean nativeColorButton(
        String id,
        float red,
        float green,
        float blue,
        float alpha,
        int flags,
        float width,
        float height
    );

    static native void nativePlotLines(
        String label,
        float[] values,
        int valuesOffset,
        int stride,
        String overlay,
        float scaleMin,
        float scaleMax,
        float width,
        float height
    );

    static native void nativePlotHistogram(
        String label,
        float[] values,
        int valuesOffset,
        int stride,
        String overlay,
        float scaleMin,
        float scaleMax,
        float width,
        float height
    );

    static native boolean nativeTreeNodeEx(String label, int flags);

    static native boolean nativeVSliderFloat(
        String label,
        float width,
        float height,
        float[] value,
        float min,
        float max,
        String format,
        int flags
    );

    static native boolean nativeVSliderInt(
        String label,
        float width,
        float height,
        int[] value,
        int min,
        int max,
        String format,
        int flags
    );

    static native boolean nativeToggle(String label, boolean[] value);

    static native boolean nativeBeginCombo(String label, String preview, int flags);

    static native void nativeEndCombo();

    static native void nativeOpenPopup(String id, int flags);

    static native boolean nativeBeginPopup(String id, int flags);

    static native boolean nativeBeginPopupModal(String name, boolean[] open, int flags);

    static native boolean nativeBeginPopupContextItem(String id, int flags);

    static native boolean nativeBeginPopupContextWindow(String id, int flags);

    static native void nativeEndPopup();

    static native void nativeCloseCurrentPopup();

    static native boolean nativeIsPopupOpen(String id, int flags);

    static native boolean nativeBeginMenuBar();

    static native void nativeEndMenuBar();

    static native boolean nativeBeginMenu(String label, boolean enabled);

    static native void nativeEndMenu();

    static native boolean nativeMenuItem(
        String label,
        String shortcut,
        boolean[] selected,
        boolean enabled
    );

    static native void nativeSetTooltip(String text);

    static native void nativeSetItemTooltip(String text);

    static native boolean nativeBeginTooltip();

    static native boolean nativeBeginItemTooltip();

    static native void nativeEndTooltip();

    static native boolean nativeBeginTable(
        String id,
        int columns,
        int flags,
        float outerWidth,
        float outerHeight
    );

    static native void nativeEndTable();

    static native void nativeTableNextRow(int rowFlags, float minRowHeight);

    static native boolean nativeTableNextColumn();

    static native boolean nativeTableSetColumnIndex(int columnIndex);

    static native void nativeTableSetupColumn(String label, int flags, float initWidthOrWeight);

    static native void nativeTableSetupScrollFreeze(int columns, int rows);

    static native void nativeTableHeadersRow();

    static native void nativeTableSetBgColor(
        int target,
        float red,
        float green,
        float blue,
        float alpha,
        int columnIndex
    );

    static native void nativePushStyleColor(
        int index,
        float red,
        float green,
        float blue,
        float alpha
    );

    static native void nativePopStyleColor(int count);

    static native void nativePushStyleVar(int index, float value);

    static native void nativePushStyleVar2(int index, float x, float y);

    static native void nativePopStyleVar(int count);

    static native void nativeSetWindowFontScale(float scale);

    static native void nativePushFont(int index, float fontSize);

    static native void nativePopFont();

    static native void nativePushIdString(String id);

    static native void nativePushIdInt(int id);

    static native void nativePopId();

    static native void nativeBeginGroup();

    static native void nativeEndGroup();

    static native void nativeIndent(float width);

    static native void nativeUnindent(float width);

    static native void nativeAlignTextToFramePadding();

    static native void nativeBeginDisabled(boolean disabled);

    static native void nativeEndDisabled();

    static native float nativeGetScrollX();

    static native float nativeGetScrollY();

    static native float nativeGetScrollMaxX();

    static native float nativeGetScrollMaxY();

    static native void nativeSetScrollX(float value);

    static native void nativeSetScrollY(float value);

    static native void nativeSetScrollHereX(float centerRatio);

    static native void nativeSetScrollHereY(float centerRatio);

    static native boolean nativeIsItemActive();

    static native boolean nativeIsItemEdited();

    static native boolean nativeIsItemActivated();

    static native boolean nativeIsItemDeactivated();

    static native boolean nativeIsItemDeactivatedAfterEdit();

    static native boolean nativeIsItemFocused();

    static native boolean nativeIsItemVisible();

    static native boolean nativeIsWindowHovered(int flags);

    static native boolean nativeIsWindowFocused(int flags);

    static native boolean nativeIsWindowCollapsed();

    static native boolean nativeIsWindowAppearing();

    static native float[] nativeGetMousePos();

    static native boolean nativeIsMouseDown(int button);

    static native boolean nativeIsMouseClicked(int button, boolean repeat);

    static native boolean nativeIsMouseDoubleClicked(int button);

    static native boolean nativeIsMouseReleased(int button);

    static native boolean nativeIsMouseDragging(int button, float lockThreshold);

    static native float[] nativeGetMouseDragDelta(int button, float lockThreshold);

    static native void nativeResetMouseDragDelta(int button);

    static native float[] nativeCalcTextSize(String text, float wrapWidth);

    static native float nativeGetFrameHeight();

    static native float nativeGetFrameHeightWithSpacing();

    static native float nativeGetTextLineHeight();

    static native float nativeGetTextLineHeightWithSpacing();

    static native float nativeGetFramerate();

    static native void nativeAddInputCharacters(String text);

    static native void nativeAddKeyEvent(int key, boolean down);

    static native void nativeAddMouseWheelEvent(float wheelX, float wheelY);

    static native boolean nativeWantTextInput();
}
