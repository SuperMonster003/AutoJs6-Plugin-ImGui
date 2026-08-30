package io.github.supermonster003.autojs6.plugin.imgui;

import static org.junit.Assert.assertTrue;

import android.graphics.Bitmap;
import android.graphics.Color;

final class ImGuiScreenshotBaseline {

    private static final int CHANNEL_TOLERANCE = 18;

    private ImGuiScreenshotBaseline() {
        throw new AssertionError("No instances");
    }

    static void assertCoverage(
        Bitmap bitmap,
        int expectedColor,
        int minimumPixels,
        int maximumPixels,
        String label
    ) {
        int matchingPixels = 0;
        for (int y = 0; y < bitmap.getHeight(); y++) {
            for (int x = 0; x < bitmap.getWidth(); x++) {
                if (isNear(bitmap.getPixel(x, y), expectedColor)) {
                    matchingPixels++;
                }
            }
        }
        assertTrue(
            label + " coverage " + matchingPixels + " was below baseline " + minimumPixels,
            matchingPixels >= minimumPixels
        );
        assertTrue(
            label + " coverage " + matchingPixels + " exceeded baseline " + maximumPixels,
            matchingPixels <= maximumPixels
        );
    }

    private static boolean isNear(int actual, int expected) {
        return Math.abs(Color.red(actual) - Color.red(expected)) <= CHANNEL_TOLERANCE &&
            Math.abs(Color.green(actual) - Color.green(expected)) <= CHANNEL_TOLERANCE &&
            Math.abs(Color.blue(actual) - Color.blue(expected)) <= CHANNEL_TOLERANCE &&
            Color.alpha(actual) >= 220;
    }
}
