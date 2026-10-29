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

    var open = imgui.ref(true);
    var animated = imgui.ref(true);
    var amplitude = imgui.ref(46);
    var speed = imgui.ref(1.2);
    var radius = imgui.ref(18);
    var thickness = imgui.ref(4);
    var segments = imgui.ref(32);
    var opacity = imgui.ref(1);
    var accent = imgui.ref([0.12, 0.72, 0.96, 1]);
    var wave = [];
    var startedAt = Date.now();
    var lastAlpha = opacity.value;

    for (var index = 0; index < 90; index += 1) {
        wave.push(0);
    }

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        var elapsed = (Date.now() - startedAt) / 1000;
        var phase = animated.value ? elapsed * speed.value : 0;
        var sample = Math.sin(phase * Math.PI * 2) * amplitude.value;
        wave.shift();
        wave.push(sample);

        if (Math.abs(lastAlpha - opacity.value) > 0.001) {
            lastAlpha = opacity.value;
            window.setAlpha(lastAlpha);
        }

        ui.setNextWindowPos(ui.dp(14), ui.dp(14), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(560), ui.dp(510), ui.Cond.FirstUseEver);
        ui.withWindow("ImGui Parameter Panel", open, 0, function () {
            ui.separatorText("Live parameters");
            ui.checkbox("Animate preview", animated);
            ui.sliderFloat("Amplitude", amplitude, 4, 90, "%.1f px");
            ui.sliderFloat("Speed", speed, 0.1, 4, "%.2f Hz");
            ui.sliderFloat("Radius", radius, 4, 52, "%.1f px");
            ui.sliderFloat("Line thickness", thickness, 1, 12, "%.1f px");
            ui.sliderInt("Circle segments", segments, 8, 96);
            ui.sliderFloat("Window opacity", opacity, 0.25, 1, "%.2f");
            ui.colorEdit4("Accent", accent);

            ui.separatorText("Preview");
            var origin = ui.getCursorPos();
            var available = ui.getContentRegionAvail();
            var previewHeight = ui.dp(150);
            ui.invisibleButton("parameter-preview", available[0], previewHeight);
            var windowPosition = ui.getWindowPos();
            var center = [
                windowPosition[0] + origin[0] + available[0] * 0.5,
                windowPosition[1] + origin[1] + previewHeight * 0.5
            ];
            var orbit = ui.dp(sample);
            var color = ui.colorU32(accent.value);
            var draw = ui.getWindowDrawList();
            draw.addRectFilled(
                [windowPosition[0] + origin[0], windowPosition[1] + origin[1]],
                [windowPosition[0] + origin[0] + available[0], windowPosition[1] + origin[1] + previewHeight],
                [0.05, 0.07, 0.10, 0.75],
                ui.dp(10)
            );
            draw.addLine(
                [center[0] - ui.dp(amplitude.value), center[1]],
                [center[0] + ui.dp(amplitude.value), center[1]],
                [0.35, 0.38, 0.44, 1],
                1
            );
            draw.addCircleFilled(
                [center[0] + orbit, center[1]],
                ui.dp(radius.value),
                color,
                segments.value
            );
            draw.addCircle(
                center,
                ui.dp(radius.value + 12),
                [accent.value[0], accent.value[1], accent.value[2], 0.35],
                segments.value,
                thickness.value
            );

            ui.plotLines("Motion history", wave, {
                scaleMin: -90,
                scaleMax: 90,
                width: -1,
                height: ui.dp(72),
                overlay: sample.toFixed(1) + " px"
            });

            if (ui.button("Reset parameters")) {
                animated.value = true;
                amplitude.value = 46;
                speed.value = 1.2;
                radius.value = 18;
                thickness.value = 4;
                segments.value = 32;
                opacity.value = 1;
                accent.value = [0.12, 0.72, 0.96, 1];
            }
            ui.sameLine();
            if (ui.button("Close")) {
                window.close("example-closed");
            }
        });

        if (!open.value) {
            window.close("example-window-closed");
        }
    }, {
        width: numberOption(options.width, 590),
        height: numberOption(options.height, 550),
        x: numberOption(options.x, 8),
        y: numberOption(options.y, 28),
        fps: numberOption(options.fps, 60),
        theme: options.theme || imgui.Themes.CyanDusk,
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
