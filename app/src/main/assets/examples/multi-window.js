// Multi window: several ImGui root windows in one session.
//
// - One session has one surface. Every begin or withWindow with its own name in the render callback adds a root window
//   inside that surface; they move, collapse and overlap by themselves. docs/MULTI-WINDOW.md has the details.
// - createWindow's width and height size the surface, so make it large enough for all the windows: a window dragged past
//   its edge is cut off. With TouchMode.Auto touches on the empty parts of the surface reach the app underneath.
// - Position and size are in dp through ui.dp. Cond.FirstUseEver only sets the first position: after that the window
//   belongs to the user, who can drag it by its title bar.
// - A close button comes from a mutable boolean: the button sets it to false, and the window is gone once the script
//   stops submitting it. Keeping the boolean in the script lets the "Panels" window open it again.
// - begin returns false while a window is collapsed, and end is still needed. Tapping a window focuses it and brings it
//   to the front; the "Notes" panel starts on top of the two others to show that.
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

    var taps = 0;
    var level = imgui.ref(40);

    var panels = [
        {name: "Counter", x: 8, y: 196, width: 180, height: 150, open: imgui.ref(true), draw: function (ui) {
            ui.text("Taps: " + taps);
            if (ui.button("Tap")) {
                taps += 1;
            }
        }},
        {name: "Level", x: 196, y: 196, width: 180, height: 150, open: imgui.ref(true), draw: function (ui) {
            ui.progressBar(level.value / 100);
            ui.sliderInt("##level", level, 0, 100);
        }},
        {name: "Notes", x: 96, y: 280, width: 200, height: 170, open: imgui.ref(true), draw: function (ui) {
            ui.textWrapped("Tap a window to bring it to the front.");
        }}
    ];

    function drawPanels(ui, window) {
        ui.setNextWindowPos(ui.dp(8), ui.dp(8), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(368), ui.dp(180), ui.Cond.FirstUseEver);
        ui.withWindow("Panels", null, 0, function () {
            panels.forEach(function (panel) {
                ui.checkbox(panel.name, panel.open);
                ui.sameLine(ui.dp(120));
                ui.text(!panel.open.value ? "closed" : panel.collapsed ? "collapsed" :
                    panel.focused ? "in front" : "open");
            });
            if (ui.button("Close all")) {
                window.close("example-closed");
            }
        });
    }

    function drawPanel(ui, panel) {
        // A closed window is one that is not submitted.
        if (!panel.open.value) {
            return;
        }
        ui.setNextWindowPos(ui.dp(panel.x), ui.dp(panel.y), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(panel.width), ui.dp(panel.height), ui.Cond.FirstUseEver);
        var visible = ui.begin(panel.name, panel.open);
        panel.collapsed = ui.isWindowCollapsed();
        panel.focused = ui.isWindowFocused();
        panel.position = ui.getWindowPos();
        panel.size = ui.getWindowSize();
        if (visible) {
            panel.draw(ui);
        }
        ui.end();
    }

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        drawPanels(ui, window);
        panels.forEach(function (panel) {
            drawPanel(ui, panel);
        });
    }, {
        width: numberOption(options.width, 384),
        height: numberOption(options.height, 460),
        x: numberOption(options.x, 6),
        y: numberOption(options.y, 24),
        fps: numberOption(options.fps, 60),
        theme: options.theme || imgui.Themes.ModernDark,
        touchMode: imgui.TouchMode.Auto,
        contentAutoResize: false,
        collapseButton: true
    });

    function numberOption(value, fallback) {
        var result = Number(value);
        return isFinite(result) ? result : fallback;
    }

    // What the panels report each frame, for scripts that check this example.
    session.panels = panels;

    var autoCloseMs = Math.max(0, numberOption(options.autoCloseMs, 0));
    if (autoCloseMs > 0) {
        setTimeout(function () {
            if (!session.closed) session.close("example-timeout");
        }, autoCloseMs);
    }
    return session;
});
