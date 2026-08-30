(function (factory) {
    if (typeof module !== "undefined" && module.exports &&
        typeof options !== "undefined" && options.__imguiExampleLoader === true
    ) {
        module.exports = factory;
        return;
    }
    factory(
        plugins.load("io.github.supermonster003.autojs6.plugin.imgui"),
        {}
    );
})(function (imgui, options) {
    options = options || {};

    var open = imgui.ref(true);
    var enabled = imgui.ref(true);
    var value = imgui.ref(0.62);
    var selected = imgui.ref(0);
    var accent = imgui.ref([0.30, 0.72, 0.98, 1]);
    var themes = [
        ["Dark", imgui.Themes.Dark],
        ["Light", imgui.Themes.Light],
        ["Classic", imgui.Themes.Classic],
        ["Pink", imgui.Themes.Pink],
        ["Blue", imgui.Themes.Blue],
        ["Modern Dark", imgui.Themes.ModernDark],
        ["Cyan Dusk", imgui.Themes.CyanDusk],
        ["Orange Dark", imgui.Themes.OrangeDark],
        ["Crystal Clear", imgui.Themes.CrystalClear],
        ["Vibrant Night", imgui.Themes.VibrantNight],
        ["Purple Dream", imgui.Themes.PurpleDream]
    ];
    var currentTheme = options.theme || imgui.Themes.ModernDark;

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        ui.setNextWindowPos(14 * window.density, 14 * window.density, ui.Cond.FirstUseEver);
        ui.setNextWindowSize(680 * window.density, 590 * window.density, ui.Cond.FirstUseEver);
        ui.withWindow("ImGui Theme Gallery", open, 0, function () {
            ui.text("Current theme: " + currentTheme);
            ui.textDisabled("Select a preset; the controls below update immediately.");
            ui.separatorText("Presets");

            for (var index = 0; index < themes.length; index += 1) {
                if (ui.button(themes[index][0] + "##theme-" + index, 150 * window.density, 0)) {
                    currentTheme = ui.setTheme(themes[index][1]);
                    window.theme = currentTheme;
                    window.toast(themes[index][0] + " applied", 1200, {
                        position: ui.ToastPosition.BottomCenter,
                        level: ui.LogLevel.Info
                    });
                }
                if (index % 3 !== 2 && index !== themes.length - 1) {
                    ui.sameLine();
                }
            }

            ui.separatorText("Control preview");
            ui.checkbox("Enabled", enabled);
            ui.sliderFloat("Intensity", value, 0, 1, "%.2f");
            ui.combo("Rendering", selected, ["Balanced", "Quality", "Performance"]);
            ui.colorEdit4("Accent color", accent);
            ui.progressBar(value.value, -1, 0, Math.round(value.value * 100) + "%");

            ui.separatorText("Semantic colors");
            var swatches = [
                ["Accent", accent.value],
                ["Success", [0.22, 0.78, 0.42, 1]],
                ["Warning", [1.00, 0.66, 0.18, 1]],
                ["Error", [0.94, 0.28, 0.32, 1]],
                ["Info", [0.24, 0.64, 0.96, 1]]
            ];
            for (var swatchIndex = 0; swatchIndex < swatches.length; swatchIndex += 1) {
                var color = swatches[swatchIndex][1];
                ui.colorButton(
                    "##swatch-" + swatchIndex,
                    color[0], color[1], color[2], color[3],
                    0, 34 * window.density, 24 * window.density
                );
                ui.sameLine();
                ui.text(swatches[swatchIndex][0]);
                if (swatchIndex % 3 !== 2 && swatchIndex !== swatches.length - 1) {
                    ui.sameLine();
                }
            }

            ui.separatorText("Appearance shortcuts");
            if (ui.button("Flat")) {
                ui.setStyleProperties({windowRounding: 0, frameRounding: 0, grabRounding: 0});
                window.appearance = ui.Appearance.Flat;
            }
            ui.sameLine();
            if (ui.button("Rounded")) {
                ui.setStyleProperties({windowRounding: 10, frameRounding: 6, grabRounding: 6});
                window.appearance = ui.Appearance.Rounded;
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
        width: numberOption(options.width, 720),
        height: numberOption(options.height, 630),
        x: numberOption(options.x, 18),
        y: numberOption(options.y, 56),
        fps: numberOption(options.fps, 45),
        theme: currentTheme,
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
