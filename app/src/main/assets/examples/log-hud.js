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
    var autoFeed = imgui.ref(true);
    var severity = imgui.ref(0);
    var sequence = 0;
    var lastAppendAt = 0;
    var hud;

    var levels = [
        imgui.LogLevel.Debug,
        imgui.LogLevel.Info,
        imgui.LogLevel.Warn,
        imgui.LogLevel.Error
    ];
    var messages = [
        "Frame scheduler heartbeat",
        "Parameter cache refreshed",
        "Latency crossed warning threshold",
        "Synthetic worker failure"
    ];

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        if (!hud) {
            hud = window.logWindow("runtime-hud", {
                title: "Runtime Log HUD",
                position: ui.ToastPosition.TopRight,
                width: 520,
                height: 330,
                maxEntries: 300,
                autoScroll: true,
                onExport: function (text) {
                    window.toast("Exported " + text.length + " characters", 1800, {
                        level: ui.LogLevel.Info,
                        position: ui.ToastPosition.BottomRight
                    });
                }
            });
            hud.info("Log HUD initialized");
            hud.debug("Enable Auto feed to append one entry per second");
        }

        var now = Date.now();
        if (autoFeed.value && now - lastAppendAt >= 1000) {
            lastAppendAt = now;
            var index = sequence % levels.length;
            hud.append(levels[index], "#" + sequence + " " + messages[index]);
            sequence += 1;
        }

        ui.setNextWindowPos(ui.dp(16), ui.dp(16), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(390), ui.dp(230), ui.Cond.FirstUseEver);
        ui.withWindow("Log HUD Controls", controllerOpen, 0, function () {
            ui.checkbox("Auto feed", autoFeed);
            ui.combo("Manual severity", severity, ["Debug", "Info", "Warning", "Error"]);

            if (ui.button("Append entry")) {
                var selected = Math.max(0, Math.min(levels.length - 1, severity.value));
                hud.append(levels[selected], "Manual entry #" + sequence);
                sequence += 1;
            }
            ui.sameLine();
            if (ui.button("Clear")) {
                hud.clear();
                hud.info("Log cleared");
            }
            ui.sameLine();
            if (ui.button("Toggle HUD")) {
                hud.toggle();
            }

            ui.text("Entries: " + hud.entries.length + " / " + hud.maxEntries);
            ui.textDisabled("Use Export in the HUD toolbar to receive formatted text.");

            if (ui.button("Close example")) {
                window.close("example-closed");
            }
        });

        if (!controllerOpen.value) {
            window.close("example-window-closed");
        }
    }, {
        width: numberOption(options.width, 960),
        height: numberOption(options.height, 620),
        x: numberOption(options.x, 4),
        y: numberOption(options.y, 24),
        fps: numberOption(options.fps, 30),
        theme: options.theme || imgui.Themes.ModernDark,
        touchMode: imgui.TouchMode.Auto,
        contentAutoResize: false,
        collapseButton: true
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
