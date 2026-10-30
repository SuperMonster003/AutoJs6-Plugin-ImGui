// Texture refresh: replace the pixels of one texture every 500 ms.
//
// - texture.update(source) takes the same sources as createTexture (path, encoded bytes, Bitmap, AutoJs6 Image). The
//   same size reuses the GL storage; another size reallocates it. The handle stays the same either way, so the image
//   call below never changes.
// - By default each refresh draws a generated frame on a Canvas, which needs no permission. "Use screen" asks for
//   screen capture on a worker thread (the system dialog would block the script thread) and then previews a quarter
//   size screenshot instead.
// - "Half size" switches the frame size to show a reallocating update.
(function (factory) {
    if (typeof module !== "undefined" && module.exports &&
        typeof options !== "undefined" && options.__imguiExampleLoader === true
    ) {
        module.exports = factory;
        return;
    }
    factory(imgui, {});
})(function (imgui, options) {
    options = options || {};

    var Bitmap = android.graphics.Bitmap;
    var Canvas = android.graphics.Canvas;
    var Paint = android.graphics.Paint;

    // Screen capture state, written by the worker thread: 0 off, 1 asking, 2 granted, 3 denied.
    var CAPTURE_OFF = 0;
    var CAPTURE_ASKING = 1;
    var CAPTURE_GRANTED = 2;
    var CAPTURE_DENIED = 3;
    var captureState = new java.util.concurrent.atomic.AtomicInteger(CAPTURE_OFF);

    var controllerOpen = imgui.ref(true);
    var halfSize = imgui.ref(false);
    var texture = null;
    var tick = 0;
    var updates = 0;
    var lastUpdateMs = 0;
    var lastError = null;
    var paint = new Paint(Paint.ANTI_ALIAS_FLAG);

    // Hue (0 - 360), saturation and value (0 - 1) to [r, g, b] in 0 - 255. Colors go to Canvas / Paint as separate
    // channels: since Android 10 drawColor and setColor also take a long (a color with a color space), and Rhino may
    // pick that overload for a JavaScript number.
    function hsvToRgb(hue, saturation, value) {
        var chroma = value * saturation;
        var x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
        var sector = Math.floor(hue / 60) % 6;
        var rgb = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]][sector];
        return rgb.map(function (channel) {
            return Math.round((channel + value - chroma) * 255);
        });
    }

    function generatedFrame() {
        var width = halfSize.value ? 160 : 320;
        var height = halfSize.value ? 90 : 180;
        var bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        var canvas = new Canvas(bitmap);
        var background = hsvToRgb((tick * 12) % 360, 0.55, 0.45);
        canvas.drawRGB(background[0], background[1], background[2]);
        paint.setARGB(255, 255, 255, 255);
        var x = (tick * width / 16) % width;
        canvas.drawCircle(x, height / 2, height / 5, paint);
        paint.setTextSize(height / 8);
        var label = "Frame " + tick + "  " + new Date().toLocaleTimeString();
        canvas.drawText(label, height / 12, height - height / 12, paint);
        return bitmap;
    }

    function refresh() {
        if (texture == null || texture.isDisposed()) {
            return;
        }
        var startedAt = java.lang.System.nanoTime();
        try {
            if (captureState.get() === CAPTURE_GRANTED) {
                var scale = halfSize.value ? 0.125 : 0.25;
                var scaled = images.scale(images.captureScreen(), scale, scale);
                try {
                    texture.update(scaled);
                } finally {
                    scaled.recycle();
                }
            } else {
                var bitmap = generatedFrame();
                try {
                    texture.update(bitmap);
                } finally {
                    bitmap.recycle();
                }
            }
            updates += 1;
            lastError = null;
        } catch (error) {
            lastError = String(error);
        }
        lastUpdateMs = (java.lang.System.nanoTime() - startedAt) / 1e6;
        tick += 1;
    }

    function askForScreenCapture() {
        if (!captureState.compareAndSet(CAPTURE_OFF, CAPTURE_ASKING) &&
            !captureState.compareAndSet(CAPTURE_DENIED, CAPTURE_ASKING)
        ) {
            return;
        }
        threads.start(function () {
            var granted = false;
            try {
                granted = Boolean(images.requestScreenCapture());
            } catch (ignored) {
                granted = false;
            }
            captureState.set(granted ? CAPTURE_GRANTED : CAPTURE_DENIED);
        });
    }

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        if (texture == null || texture.isDisposed()) {
            var first = generatedFrame();
            try {
                texture = ui.createTexture(first);
            } finally {
                first.recycle();
            }
        }

        ui.setNextWindowPos(ui.dp(10), ui.dp(10), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(380), ui.dp(360), ui.Cond.FirstUseEver);
        ui.withWindow("Texture Refresh", controllerOpen, 0, function () {
            ui.text("Texture #" + texture.handle + ", " + texture.width + " x " + texture.height + " px");
            ui.textDisabled(updates + " updates, last " + lastUpdateMs.toFixed(1) + " ms");
            if (lastError != null) {
                ui.textColored("#ff6b6b", lastError);
            }
            ui.checkbox("Half size", halfSize);
            ui.sameLine();
            var state = captureState.get();
            if (state === CAPTURE_GRANTED) {
                ui.textDisabled("Screen capture");
            } else if (state === CAPTURE_ASKING) {
                ui.textDisabled("Waiting for permission...");
            } else if (ui.button(state === CAPTURE_DENIED ? "Use screen (denied, retry)" : "Use screen")) {
                askForScreenCapture();
            }

            var available = ui.getContentRegionAvail();
            var width = Math.max(1, available[0]);
            ui.image(texture, width, width * texture.height / texture.width);

            if (ui.button("Close")) {
                window.close("example-closed");
            }
        });

        if (!controllerOpen.value) {
            window.close("example-window-closed");
        }
    }, {
        width: numberOption(options.width, 400),
        height: numberOption(options.height, 400),
        x: numberOption(options.x, 6),
        y: numberOption(options.y, 24),
        fps: numberOption(options.fps, 30),
        theme: options.theme || imgui.Themes.ModernDark,
        touchMode: imgui.TouchMode.Auto,
        contentAutoResize: false,
        collapseButton: true
    });

    // Runs on the script thread, between frames; the next frame draws the new pixels.
    var timer = setInterval(refresh, 500);
    session.on("closed", function () {
        clearInterval(timer);
    });

    function numberOption(value, fallback) {
        var result = Number(value);
        return isFinite(result) ? result : fallback;
    }

    var autoCloseMs = Math.max(0, numberOption(options.autoCloseMs, 0));
    if (autoCloseMs > 0) {
        setTimeout(function () {
            if (!session.closed) session.close("example-timeout");
        }, autoCloseMs);
    }
    return session;
});
