package io.github.supermonster003.autojs6.plugin.imgui;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.Selection;
import android.text.SpannableStringBuilder;
import android.text.TextUtils;
import android.text.method.MetaKeyKeyListener;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.BaseInputConnection;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.view.inputmethod.InputMethodManager;

/**
 * Invisible text-editor view used as the Android IME endpoint for Dear ImGui.
 *
 * <p>Dear ImGui does not expose an Android {@link InputConnection}, while Android IMEs require
 * one for composition (for example, a Pinyin pre-edit string). This view keeps a small proxy
 * editable for the IME and forwards each composing-string replacement to ImGui as backspaces
 * followed by UTF-8 input characters. The proxy is intentionally independent of the script's
 * {@code String[]} reference: it only models edits made during the current focus session.</p>
 */
@SuppressLint("ViewConstructor")
final class ImGuiImeView extends View {

    private static final int MAX_SHOW_KEYBOARD_ATTEMPTS = 8;
    private static final long SHOW_KEYBOARD_RETRY_DELAY_MS = 75L;

    interface EventSink {
        void addInputCharacters(String text);

        void addKeyEvent(int key, boolean down);
    }

    private final EventSink eventSink;
    private final Runnable showKeyboardAttempt = this::tryShowKeyboard;
    private BridgeInputConnection inputConnection;
    private boolean keyboardRequested;
    private int showKeyboardAttempts;

    ImGuiImeView(Context context, EventSink eventSink) {
        super(context);
        this.eventSink = eventSink;
        setBackgroundColor(Color.TRANSPARENT);
        setFocusable(true);
        setFocusableInTouchMode(true);
        setClickable(false);
        setLongClickable(false);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
    }

    @Override
    public boolean onCheckIsTextEditor() {
        return true;
    }

    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        outAttrs.inputType = android.text.InputType.TYPE_CLASS_TEXT
            | android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE
            | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES;
        outAttrs.imeOptions = EditorInfo.IME_ACTION_NONE | EditorInfo.IME_FLAG_NO_EXTRACT_UI;
        outAttrs.initialSelStart = 0;
        outAttrs.initialSelEnd = 0;
        inputConnection = new BridgeInputConnection(this, eventSink);
        return inputConnection;
    }

    void beginInputSession() {
        if (inputConnection != null) {
            inputConnection.reset();
        }
    }

    void showKeyboard() {
        beginInputSession();
        keyboardRequested = true;
        showKeyboardAttempts = 0;
        requestFocus();
        InputMethodManager manager = getContext().getSystemService(InputMethodManager.class);
        if (manager != null) {
            manager.restartInput(this);
        }
        removeCallbacks(showKeyboardAttempt);
        post(showKeyboardAttempt);
    }

    void hideKeyboard() {
        keyboardRequested = false;
        showKeyboardAttempts = 0;
        removeCallbacks(showKeyboardAttempt);
        InputMethodManager manager = getContext().getSystemService(InputMethodManager.class);
        if (manager != null) {
            manager.hideSoftInputFromWindow(getWindowToken(), 0);
        }
        clearFocus();
        if (inputConnection != null) {
            inputConnection.reset();
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasWindowFocus) {
        super.onWindowFocusChanged(hasWindowFocus);
        if (hasWindowFocus && keyboardRequested) {
            removeCallbacks(showKeyboardAttempt);
            post(showKeyboardAttempt);
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        keyboardRequested = false;
        removeCallbacks(showKeyboardAttempt);
        super.onDetachedFromWindow();
    }

    private void tryShowKeyboard() {
        if (!keyboardRequested) {
            return;
        }
        InputMethodManager manager = getContext().getSystemService(InputMethodManager.class);
        if (manager == null) {
            return;
        }
        if (!isAttachedToWindow() || !isFocused() || !hasWindowFocus()) {
            scheduleShowKeyboardRetry();
            return;
        }
        manager.restartInput(this);
        if (!manager.showSoftInput(this, InputMethodManager.SHOW_IMPLICIT)) {
            scheduleShowKeyboardRetry();
        }
    }

    private void scheduleShowKeyboardRetry() {
        showKeyboardAttempts += 1;
        if (showKeyboardAttempts < MAX_SHOW_KEYBOARD_ATTEMPTS && keyboardRequested) {
            postDelayed(showKeyboardAttempt, SHOW_KEYBOARD_RETRY_DELAY_MS);
        }
    }

    static int mapAndroidKey(int keyCode) {
        return BridgeInputConnection.mapAndroidKey(keyCode);
    }

    private static final class BridgeInputConnection extends BaseInputConnection {

        private static final int IMGUI_KEY_TAB = 512;
        private static final int IMGUI_KEY_LEFT_ARROW = 513;
        private static final int IMGUI_KEY_RIGHT_ARROW = 514;
        private static final int IMGUI_KEY_UP_ARROW = 515;
        private static final int IMGUI_KEY_DOWN_ARROW = 516;
        private static final int IMGUI_KEY_PAGE_UP = 517;
        private static final int IMGUI_KEY_PAGE_DOWN = 518;
        private static final int IMGUI_KEY_HOME = 519;
        private static final int IMGUI_KEY_END = 520;
        private static final int IMGUI_KEY_INSERT = 521;
        private static final int IMGUI_KEY_DELETE = 522;
        private static final int IMGUI_KEY_BACKSPACE = 523;
        private static final int IMGUI_KEY_SPACE = 524;
        private static final int IMGUI_KEY_ENTER = 525;
        private static final int IMGUI_KEY_ESCAPE = 526;
        private static final int IMGUI_KEY_A = 546;
        private static final int IMGUI_MOD_CTRL = 1 << 12;
        private static final int IMGUI_MOD_SHIFT = 1 << 13;
        private static final int IMGUI_MOD_ALT = 1 << 14;
        private static final int IMGUI_MOD_SUPER = 1 << 15;

        private final Editable editable = new SpannableStringBuilder();
        private final EventSink eventSink;
        private String composingText = "";

        BridgeInputConnection(View targetView, EventSink eventSink) {
            super(targetView, true);
            this.eventSink = eventSink;
            Selection.setSelection(editable, 0);
        }

        @Override
        public Editable getEditable() {
            return editable;
        }

        @Override
        public boolean setComposingText(CharSequence text, int newCursorPosition) {
            boolean accepted = super.setComposingText(text, newCursorPosition);
            if (accepted) {
                replaceComposingText(text);
            }
            return accepted;
        }

        @Override
        public boolean setComposingRegion(int start, int end) {
            boolean accepted = super.setComposingRegion(start, end);
            if (accepted) {
                refreshTrackedComposition();
            }
            return accepted;
        }

        @Override
        public boolean finishComposingText() {
            boolean accepted = super.finishComposingText();
            if (accepted) {
                composingText = "";
            }
            return accepted;
        }

        @Override
        public boolean commitText(CharSequence text, int newCursorPosition) {
            boolean accepted = super.commitText(text, newCursorPosition);
            if (accepted) {
                replaceComposingText(text);
                composingText = "";
            }
            return accepted;
        }

        @Override
        public boolean deleteSurroundingText(int beforeLength, int afterLength) {
            int beforeCodePoints = codePointsBeforeCursor(beforeLength);
            int afterCodePoints = codePointsAfterCursor(afterLength);
            boolean accepted = super.deleteSurroundingText(beforeLength, afterLength);
            if (accepted) {
                int backspaces = beforeCodePoints > 0 ? beforeCodePoints : beforeLength;
                int deletes = afterCodePoints > 0 ? afterCodePoints : afterLength;
                sendRepeatedKey(IMGUI_KEY_BACKSPACE, backspaces, beforeLength > 0);
                sendRepeatedKey(IMGUI_KEY_DELETE, deletes, afterLength > 0);
                refreshTrackedComposition();
            }
            return accepted;
        }

        @Override
        public boolean deleteSurroundingTextInCodePoints(int beforeLength, int afterLength) {
            boolean accepted = super.deleteSurroundingTextInCodePoints(beforeLength, afterLength);
            if (accepted) {
                sendRepeatedKey(IMGUI_KEY_BACKSPACE, beforeLength, beforeLength > 0);
                sendRepeatedKey(IMGUI_KEY_DELETE, afterLength, afterLength > 0);
                refreshTrackedComposition();
            }
            return accepted;
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean sendKeyEvent(KeyEvent event) {
            int action = event.getAction();
            if (action == KeyEvent.ACTION_MULTIPLE && !TextUtils.isEmpty(event.getCharacters())) {
                eventSink.addInputCharacters(event.getCharacters());
                return true;
            }

            int imguiKey = mapAndroidKey(event.getKeyCode());
            if (imguiKey != 0 && (action == KeyEvent.ACTION_DOWN || action == KeyEvent.ACTION_UP)) {
                eventSink.addKeyEvent(imguiKey, action == KeyEvent.ACTION_DOWN);
            }

            if (action == KeyEvent.ACTION_DOWN && !event.isCtrlPressed() && !event.isAltPressed()) {
                int unicode = event.getUnicodeChar();
                if (unicode >= 0x20 && unicode != 0x7F && Character.isValidCodePoint(unicode)) {
                    eventSink.addInputCharacters(new String(Character.toChars(unicode)));
                }
            }

            boolean accepted = super.sendKeyEvent(event);
            refreshTrackedComposition();
            return imguiKey != 0 || accepted;
        }

        @Override
        public boolean performEditorAction(int editorAction) {
            sendKeyTap(IMGUI_KEY_ENTER);
            return true;
        }

        @Override
        public boolean performPrivateCommand(String action, Bundle data) {
            return super.performPrivateCommand(action, data);
        }

        void reset() {
            composingText = "";
            editable.clear();
            MetaKeyKeyListener.clearMetaKeyState(editable, MetaKeyKeyListener.META_ALT_ON
                | MetaKeyKeyListener.META_SHIFT_ON | MetaKeyKeyListener.META_SYM_ON);
            Selection.setSelection(editable, 0);
        }

        private void replaceComposingText(CharSequence replacement) {
            String next = replacement == null ? "" : replacement.toString();
            if (next.equals(composingText)) {
                return;
            }
            sendRepeatedKey(
                IMGUI_KEY_BACKSPACE,
                composingText.codePointCount(0, composingText.length()),
                !composingText.isEmpty()
            );
            if (!next.isEmpty()) {
                eventSink.addInputCharacters(next);
            }
            composingText = next;
        }

        private void refreshTrackedComposition() {
            int start = BaseInputConnection.getComposingSpanStart(editable);
            int end = BaseInputConnection.getComposingSpanEnd(editable);
            composingText = start >= 0 && end >= start ? editable.subSequence(start, end).toString() : "";
        }

        private int codePointsBeforeCursor(int requestedCodeUnits) {
            int cursor = Math.max(0, Selection.getSelectionStart(editable));
            int start = Math.max(0, cursor - Math.max(0, requestedCodeUnits));
            return Character.codePointCount(editable, start, cursor);
        }

        private int codePointsAfterCursor(int requestedCodeUnits) {
            int cursor = Math.max(0, Selection.getSelectionEnd(editable));
            int end = Math.min(editable.length(), cursor + Math.max(0, requestedCodeUnits));
            return Character.codePointCount(editable, cursor, end);
        }

        private void sendRepeatedKey(int key, int count, boolean requested) {
            if (!requested) {
                return;
            }
            for (int index = 0; index < Math.max(1, count); index += 1) {
                sendKeyTap(key);
            }
        }

        private void sendKeyTap(int key) {
            eventSink.addKeyEvent(key, true);
            eventSink.addKeyEvent(key, false);
        }

        static int mapAndroidKey(int keyCode) {
            if (keyCode >= KeyEvent.KEYCODE_A && keyCode <= KeyEvent.KEYCODE_Z) {
                return IMGUI_KEY_A + keyCode - KeyEvent.KEYCODE_A;
            }
            switch (keyCode) {
                case KeyEvent.KEYCODE_TAB:
                    return IMGUI_KEY_TAB;
                case KeyEvent.KEYCODE_DPAD_LEFT:
                    return IMGUI_KEY_LEFT_ARROW;
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    return IMGUI_KEY_RIGHT_ARROW;
                case KeyEvent.KEYCODE_DPAD_UP:
                    return IMGUI_KEY_UP_ARROW;
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    return IMGUI_KEY_DOWN_ARROW;
                case KeyEvent.KEYCODE_PAGE_UP:
                    return IMGUI_KEY_PAGE_UP;
                case KeyEvent.KEYCODE_PAGE_DOWN:
                    return IMGUI_KEY_PAGE_DOWN;
                case KeyEvent.KEYCODE_MOVE_HOME:
                    return IMGUI_KEY_HOME;
                case KeyEvent.KEYCODE_MOVE_END:
                    return IMGUI_KEY_END;
                case KeyEvent.KEYCODE_INSERT:
                    return IMGUI_KEY_INSERT;
                case KeyEvent.KEYCODE_FORWARD_DEL:
                    return IMGUI_KEY_DELETE;
                case KeyEvent.KEYCODE_DEL:
                    return IMGUI_KEY_BACKSPACE;
                case KeyEvent.KEYCODE_SPACE:
                    return IMGUI_KEY_SPACE;
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_NUMPAD_ENTER:
                    return IMGUI_KEY_ENTER;
                case KeyEvent.KEYCODE_ESCAPE:
                case KeyEvent.KEYCODE_BACK:
                    return IMGUI_KEY_ESCAPE;
                case KeyEvent.KEYCODE_CTRL_LEFT:
                case KeyEvent.KEYCODE_CTRL_RIGHT:
                    return IMGUI_MOD_CTRL;
                case KeyEvent.KEYCODE_SHIFT_LEFT:
                case KeyEvent.KEYCODE_SHIFT_RIGHT:
                    return IMGUI_MOD_SHIFT;
                case KeyEvent.KEYCODE_ALT_LEFT:
                case KeyEvent.KEYCODE_ALT_RIGHT:
                    return IMGUI_MOD_ALT;
                case KeyEvent.KEYCODE_META_LEFT:
                case KeyEvent.KEYCODE_META_RIGHT:
                    return IMGUI_MOD_SUPER;
                default:
                    return 0;
            }
        }
    }
}
