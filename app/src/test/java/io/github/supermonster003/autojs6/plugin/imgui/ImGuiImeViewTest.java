package io.github.supermonster003.autojs6.plugin.imgui;

import static org.junit.Assert.assertEquals;

import android.view.KeyEvent;

import org.junit.Test;

public class ImGuiImeViewTest {

    @Test
    public void mapsAndroidEditingAndNavigationKeysToImGuiKeys() {
        assertEquals(512, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_TAB));
        assertEquals(513, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_DPAD_LEFT));
        assertEquals(522, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_FORWARD_DEL));
        assertEquals(523, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_DEL));
        assertEquals(525, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_ENTER));
        assertEquals(526, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_ESCAPE));
    }

    @Test
    public void mapsLettersAndModifiersAndRejectsUnknownKeys() {
        assertEquals(546, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_A));
        assertEquals(571, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_Z));
        assertEquals(1 << 12, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_CTRL_LEFT));
        assertEquals(1 << 13, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_SHIFT_RIGHT));
        assertEquals(1 << 14, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_ALT_LEFT));
        assertEquals(1 << 15, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_META_RIGHT));
        assertEquals(0, ImGuiImeView.mapAndroidKey(KeyEvent.KEYCODE_UNKNOWN));
    }
}
