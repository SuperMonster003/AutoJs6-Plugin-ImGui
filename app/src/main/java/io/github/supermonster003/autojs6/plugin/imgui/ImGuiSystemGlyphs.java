package io.github.supermonster003.autojs6.plugin.imgui;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;

import java.nio.ByteBuffer;

/**
 * The glyphs of createWindow({systemCjkFont: true}), for the font loader of the native side (AddSystemGlyphs). They
 * come from the Android text stack, which reads the variable CFF2 font of current Android versions and any font a vendor
 * put in its place, and picks the regional forms of the device language. Called on the script thread.
 */
final class ImGuiSystemGlyphs {
    // Bitmaps have a pixel more on each side, because the bounds of the text do not count antialiased edges.
    private static final int EDGE = 1;
    private static final Paint PAINT = createPaint();

    private ImGuiSystemGlyphs() {
    }

    private static Paint createPaint() {
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        paint.setTypeface(Typeface.DEFAULT);
        paint.setHinting(Paint.HINTING_OFF);
        paint.setColor(Color.WHITE);
        return paint;
    }

    private static String text(int codepoint) {
        return new String(Character.toChars(codepoint));
    }

    static synchronized boolean has(int codepoint) {
        return PAINT.hasGlyph(text(codepoint));
    }

    static synchronized float measure(int codepoint, float textSize) {
        PAINT.setTextSize(textSize);
        return PAINT.measureText(text(codepoint));
    }

    /**
     * Draws a glyph with the pen on the baseline.
     *
     * @param box receives the left and top of the bitmap relative to the pen, its width, height and bytes per row
     * @return the alpha of the pixels, or null for a glyph without ink
     */
    static synchronized byte[] draw(int codepoint, float textSize, int[] box) {
        String text = text(codepoint);
        Rect bounds = new Rect();
        PAINT.setTextSize(textSize);
        PAINT.getTextBounds(text, 0, text.length(), bounds);
        if (bounds.isEmpty()) {
            return null;
        }
        int left = bounds.left - EDGE;
        int top = bounds.top - EDGE;
        int width = bounds.width() + 2 * EDGE;
        int height = bounds.height() + 2 * EDGE;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ALPHA_8);
        try {
            new Canvas(bitmap).drawText(text, -left, -top, PAINT);
            byte[] pixels = new byte[bitmap.getRowBytes() * height];
            bitmap.copyPixelsToBuffer(ByteBuffer.wrap(pixels));
            box[0] = left;
            box[1] = top;
            box[2] = width;
            box[3] = height;
            box[4] = bitmap.getRowBytes();
            return pixels;
        } finally {
            bitmap.recycle();
        }
    }
}
