package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;

/**
 * The Android clipboard for imgui.getClipboardText / setClipboardText and the Ctrl+C / Ctrl+V of Dear ImGui, the same
 * primary clip as the host's setClip / getClip. From Android 10 the system returns nothing to an application without
 * the input focus (docs/LIMITS.md).
 */
final class ImGuiClipboard {

    private static final String CLIP_LABEL = "ImGui";

    private final Context context;

    ImGuiClipboard(Context context) {
        this.context = context;
    }

    /** The text of the primary clip; empty when there is none or the system does not allow reading it. */
    String getText() {
        ClipData clip = manager().getPrimaryClip();
        if (clip == null || clip.getItemCount() == 0) {
            return "";
        }
        CharSequence text = clip.getItemAt(0).getText();
        return text == null ? "" : text.toString();
    }

    void setText(String text) {
        manager().setPrimaryClip(ClipData.newPlainText(CLIP_LABEL, text));
    }

    private ClipboardManager manager() {
        return (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
    }
}
