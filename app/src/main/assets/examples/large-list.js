// Large list: 100000 rows with listClipper.
//
// - combo and listBox take at most imgui.Limits.SelectionMaxItems (512) items because they copy every label to native
//   code each frame. For more rows, open the popup with beginCombo (or a child window) and let listClipper submit only
//   the rows that are visible: callback(start, end) draws rows start <= i < end.
// - Row labels are built on demand from the index; nothing per row is kept in memory.
// - includeItems keeps the selected row submitted while it is scrolled out of view, so the combo can scroll to it when
//   it opens. The stats overlay shows the frame interval and the work time of the frame (the UI code itself). After
//   3 s without input it reads about 10 FPS: that is the idle frame rate (idleFps), not a slow list.
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

    var ROW_COUNT = 100000;
    var controllerOpen = imgui.ref(true);
    var jumpTarget = imgui.ref(50000);
    var selected = 0;
    var pendingScroll = -1;

    function rowLabel(index) {
        return "Row " + index + "  |  checksum " + ((index * 2654435761) % 9973) + "##row" + index;
    }

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        ui.setNextWindowPos(ui.dp(10), ui.dp(10), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(400), ui.dp(460), ui.Cond.FirstUseEver);
        ui.withWindow("Large List", controllerOpen, 0, function () {
            ui.text(ROW_COUNT + " rows, selected: " + selected);

            ui.withCombo("Pick a row", "Row " + selected, 0, function () {
                ui.listClipper(ROW_COUNT, {includeItems: [selected]}, function (start, end) {
                    for (var i = start; i < end; i += 1) {
                        if (ui.selectable(rowLabel(i), i === selected)) {
                            selected = i;
                        }
                        if (i === selected && ui.isWindowAppearing()) {
                            ui.setScrollHereY(0.5);
                        }
                    }
                });
            });

            ui.sliderInt("Jump to", jumpTarget, 0, ROW_COUNT - 1);
            ui.sameLine();
            if (ui.button("Go")) {
                selected = jumpTarget.value;
                pendingScroll = selected;
            }

            var footer = ui.getFrameHeightWithSpacing();
            ui.withChild("rows", 0, -footer, true, 0, function () {
                var rowHeight = ui.getTextLineHeightWithSpacing();
                if (pendingScroll >= 0) {
                    ui.setScrollY(pendingScroll * rowHeight);
                    pendingScroll = -1;
                }
                ui.listClipper(ROW_COUNT, {itemHeight: rowHeight, includeItems: [selected]}, function (start, end) {
                    for (var i = start; i < end; i += 1) {
                        if (ui.selectable(rowLabel(i), i === selected)) {
                            selected = i;
                        }
                    }
                });
            });

            if (ui.button("Close")) {
                window.close("example-closed");
            }
        });

        if (!controllerOpen.value) {
            window.close("example-window-closed");
        }
    }, {
        width: numberOption(options.width, 440),
        height: numberOption(options.height, 520),
        x: numberOption(options.x, 6),
        y: numberOption(options.y, 24),
        fps: numberOption(options.fps, 60),
        theme: options.theme || imgui.Themes.ModernDark,
        touchMode: imgui.TouchMode.Auto,
        contentAutoResize: false,
        collapseButton: true
    });

    session.statsOverlay("large-list", {position: imgui.ToastPosition.BottomRight});

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
