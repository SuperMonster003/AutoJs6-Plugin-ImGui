// Error handling: the "error" event, debug mode and common mistakes.
//
// - An exception thrown by the render callback or by an event callback is printed with console.error (a run of the
//   same error once) and emitted as "error" (event.error, event.phase "render" / "event", event.frame). Without an
//   "error" listener a render error closes the session with closeReason "render-error"; with one the rest of the frame
//   is skipped and the session goes on.
// - createWindow({debug: true}) reports usage errors such as begin without end with console.warn and logcat, and shows
//   the Metrics and Debug Log windows.
// - Global helpers that act on the window (imgui.setGlobalAlpha, imgui.getComponent, ...) throw
//   "imgui.<name>: no active session" when no window is open; a new window closes the previous one.
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

    var controllerOpen = imgui.ref(true);
    var failingListener = imgui.ref(false);
    var throwNextFrame = false;
    var leaveWindowOpen = false;
    var errorCount = 0;
    var lastError = "none";

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        if (throwNextFrame) {
            throwNextFrame = false;
            throw new Error("Thrown on purpose by the render callback");
        }

        ui.setNextWindowPos(ui.dp(16), ui.dp(16), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(420), ui.dp(300), ui.Cond.FirstUseEver);
        ui.withWindow("Error Handling", controllerOpen, 0, function () {
            ui.text("Debug mode: " + (window.debug ? "on" : "off"));
            ui.text("Errors received: " + errorCount);
            ui.textWrapped("Last: " + lastError);
            ui.separator();

            if (ui.button("Throw in render callback")) {
                throwNextFrame = true;
            }
            ui.textDisabled("The listener receives it, the window stays open.");

            ui.checkbox("Collapsed listener throws", failingListener);
            if (ui.button("Collapse window")) {
                window.collapse();
            }
            ui.textDisabled("Expand it with the floating button; the error has phase \"event\".");

            if (ui.button("Leave a window open")) {
                leaveWindowOpen = true;
            }
            ui.textDisabled("begin without end: debug mode prints a warning and recovers.");

            if (ui.button("Close example")) {
                window.close("example-closed");
            }
        });

        if (leaveWindowOpen) {
            leaveWindowOpen = false;
            ui.begin("Never ended");
            ui.text("This window has no matching end()");
        }

        if (!controllerOpen.value) {
            window.close("example-window-closed");
        }
    }, {
        width: numberOption(options.width, 960),
        height: numberOption(options.height, 720),
        x: numberOption(options.x, 4),
        y: numberOption(options.y, 24),
        fps: numberOption(options.fps, 30),
        theme: options.theme || imgui.Themes.ModernDark,
        debug: options.debug !== false,
        touchMode: imgui.TouchMode.Auto,
        contentAutoResize: false,
        collapseButton: true,
        onError: function (event) {
            errorCount += 1;
            lastError = event.phase + " (frame " + event.frame + "): " + event.message;
        },
        onCollapsed: function () {
            if (failingListener.value) {
                throw new Error("Thrown on purpose by the collapsed listener");
            }
        }
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
