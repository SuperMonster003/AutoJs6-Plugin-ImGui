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

    var enabled = imgui.ref(true);
    var gain = imgui.ref(0.65);
    var count = imgui.ref(3);
    var name = imgui.ref("AutoJs6");
    var accent = imgui.ref([0.20, 0.62, 0.96, 1.0]);
    var choice = imgui.ref(0);
    var mainOpen = imgui.ref(true);
    var position = imgui.ref([0.5, -1.25, 2.0]);
    var margins = imgui.ref([8, 8, 16, 16]);
    var levels = imgui.ref([20, 80]);
    var spanMin = imgui.ref(0.25);
    var spanMax = imgui.ref(0.75);
    var angle = imgui.ref(Math.PI / 4);
    var slots = ["Alpha", "Beta", "Gamma", null];
    var debugWindows = [
        {label: "Metrics/Debugger", show: imgui.showMetricsWindow, open: imgui.ref(false)},
        {label: "Debug Log", show: imgui.showDebugLogWindow, open: imgui.ref(false)},
        {label: "ID Stack Tool", show: imgui.showIdStackToolWindow, open: imgui.ref(false)},
        {label: "Style Editor", show: imgui.showStyleEditor, open: imgui.ref(false)},
        {label: "About Dear ImGui", show: imgui.showAboutWindow, open: imgui.ref(false)},
        {label: "User Guide", show: imgui.showUserGuide, open: imgui.ref(false)}
    ];
    var initialized = false;
    var logWindow;
    var dataTable;
    var stats;
    var lastLogAt = 0;

    var rows = [
        {id: 1, component: "logWindow", state: "ready", notes: "Level colors and export"},
        {id: 2, component: "toast", state: "ready", notes: "Stacked timed overlays"},
        {id: 3, component: "dialogs", state: "ready", notes: "Promise-based modals"},
        {id: 4, component: "statsOverlay", state: "ready", notes: "FPS and frame-time history"},
        {id: 5, component: "dataTable", state: "ready", notes: "Selection and CRUD"}
    ];

    function appendResult(label, value) {
        if (logWindow && !logWindow.closed) {
            logWindow.info(label + ": " + JSON.stringify(value));
        }
    }

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        if (!initialized) {
            initialized = true;
            logWindow = window.logWindow("Component log", {
                title: "P4 Log Window",
                width: 390,
                height: 245,
                position: ui.ToastPosition.BottomLeft,
                maxEntries: 200,
                onExport: function (text) {
                    toast("Export prepared: " + text.length + " characters", "info");
                }
            });
            logWindow.info("Widget overview started");
            logWindow.debug("Lightweight refs use the {value: x} shape");

            dataTable = window.dataTable(
                "Component inventory",
                [
                    {key: "id", label: "#", width: 34},
                    {key: "component", label: "Component"},
                    {key: "state", label: "State"},
                    {key: "notes", label: "Notes"}
                ],
                rows,
                {
                    title: "P4 Data Table",
                    width: 590,
                    height: 320,
                    position: ui.ToastPosition.BottomRight,
                    rowKey: "id",
                    multiSelect: true,
                    onRowClick: function (row) {
                        logWindow.log("Selected row: " + row.component);
                    }
                }
            );
            stats = window.statsOverlay({
                position: ui.ToastPosition.TopRight,
                historySize: 120
            });
            window.toast("P4 component overview is ready", 2600, {
                level: ui.LogLevel.Info
            });
        }

        function toast(text, level) {
            window.toast(text, 2200, {level: level || ui.LogLevel.Info});
        }

        ui.setNextWindowPos(ui.dp(14), ui.dp(14), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(520), ui.dp(520), ui.Cond.FirstUseEver);
        ui.withWindow("ImGui P4 Widget Overview", mainOpen, ui.WindowFlags.MenuBar, function () {
            ui.withMenuBar(function () {
                ui.withMenu("Debug", true, function () {
                    debugWindows.forEach(function (entry) {
                        ui.menuItem(entry.label, null, entry.open);
                    });
                });
            });

            ui.separatorText("Lightweight references");
            ui.checkbox("Enabled", enabled);
            ui.sliderFloat("Gain", gain, 0, 1, "%.2f");
            ui.inputInt("Count", count, 1, 10);
            ui.inputText("Name", name, 128);
            ui.colorEdit4("Accent", accent);
            ui.combo("Mode", choice, ["Overlay", "Activity", "Auto"], -1);
            ui.textWrapped(
                "Values: enabled=" + enabled.value +
                ", gain=" + gain.value.toFixed(2) +
                ", count=" + count.value +
                ", name=" + name.value
            );

            ui.separatorText("Multi-component widgets");
            ui.dragFloat3("Position", position, 0.01, -10, 10, "%.2f");
            ui.dragInt4("Margins", margins, 1, 0, 64);
            ui.sliderInt2("Levels", levels, 0, 100);
            ui.dragFloatRange2("Span", spanMin, spanMax, 0.01, 0, 1, "Min %.2f", "Max %.2f");
            ui.sliderAngle("Angle", angle);
            ui.textDisabled(
                "Position=" + position.value.map(function (v) { return v.toFixed(2); }).join(", ") +
                ", angle=" + angle.value.toFixed(3) + " rad"
            );

            ui.separatorText("Drag and drop");
            ui.textDisabled("Drag a slot onto another to swap them.");
            slots.forEach(function (slot, index) {
                if (index > 0) {
                    ui.sameLine();
                }
                ui.button((slot === null ? "Empty" : slot) + "##slot" + index, ui.dp(72), 0);
                if (slot !== null) {
                    ui.withDragDropSource(function () {
                        ui.setDragDropPayload("OVERVIEW_SLOT", index);
                        ui.text("Move " + slot);
                    });
                }
                ui.withDragDropTarget(function () {
                    var payload = ui.acceptDragDropPayload("OVERVIEW_SLOT");
                    if (payload !== null) {
                        var moved = slots[payload.data];
                        slots[payload.data] = slots[index];
                        slots[index] = moved;
                    }
                });
            });

            ui.separatorText("Custom drawing");
            var origin = ui.getWindowPos();
            var cursor = ui.getCursorPos();
            var size = ui.dp(64);
            var left = origin[0] + cursor[0];
            var top = origin[1] + cursor[1] - ui.getScrollY();
            var draw = ui.getWindowDrawList();
            ui.dummy(size * 5, size);
            draw.addRectFilledMultiColor(
                [left, top], [left + size, top + size],
                [0.96, 0.26, 0.21, 1], [0.13, 0.59, 0.95, 1], [0.30, 0.69, 0.31, 1], [1, 0.76, 0.03, 1]
            );
            draw.addNgonFilled([left + size * 1.6, top + size / 2], size * 0.45, accent.value, 6);
            draw.addEllipse([left + size * 2.7, top + size / 2], [size * 0.48, size * 0.28], accent.value, 0.5, 0, ui.dp(2));
            // A pie slice built as a path: from the center along an arc and back.
            draw.pathClear()
                .pathLineTo([left + size * 3.8, top + size / 2])
                .pathArcTo([left + size * 3.8, top + size / 2], size * 0.45, 0, Math.PI * 1.5)
                .pathFillConcave([0.13, 0.59, 0.95, 1]);
            // Only the left half of this circle stays inside the clip rectangle.
            draw.pushClipRect([left + size * 4.4, top], [left + size * 4.8, top + size], true)
                .addCircleFilled([left + size * 4.8, top + size / 2], size * 0.45, [0.30, 0.69, 0.31, 1])
                .popClipRect();

            ui.separatorText("Window");
            ui.text("Font scale: " + window.fontScale.toFixed(2) + ", pinch with two fingers to change it");
            ui.text("A character outside the bundled font: 龘");
            if (ui.button("100%")) {
                window.setFontScale(1);
            }
            ui.sameLine();
            if (ui.button("150%")) {
                window.setFontScale(1.5);
            }
            ui.sameLine();
            if (ui.button("Capture")) {
                var shot = window.capture();
                logWindow.info("Captured " + shot.getWidth() + "x" + shot.getHeight() + " px");
                shot.recycle();
            }

            ui.separatorText("Toast and log");
            if (ui.button("Info toast")) {
                toast("Hello, " + name.value, ui.LogLevel.Info);
                logWindow.info("Info toast requested");
            }
            ui.sameLine();
            if (ui.button("Warning toast")) {
                toast("Gain is " + gain.value.toFixed(2), ui.LogLevel.Warn);
                logWindow.warn("Warning toast requested");
            }
            ui.sameLine();
            if (ui.button("Error toast")) {
                toast("Demonstration error", ui.LogLevel.Error);
                logWindow.error("Error toast requested");
            }

            ui.separatorText("Promise dialogs");
            if (ui.button("Alert")) {
                window.alert("P4 Alert", "This modal resolves a Promise.")
                    .then(function (result) { appendResult("Alert", result); });
            }
            ui.sameLine();
            if (ui.button("Confirm")) {
                window.confirm("P4 Confirm", "Keep the statistics overlay visible?")
                    .then(function (result) {
                        stats.visible = result;
                        appendResult("Confirm", result);
                    });
            }
            if (ui.button("Single choice")) {
                window.singleChoice(
                    "Select a theme",
                    ["Dark", "Light", "ModernDark"],
                    0
                ).then(function (result) { appendResult("Single choice", result); });
            }
            ui.sameLine();
            if (ui.button("Multi choice")) {
                window.multiChoice(
                    "Visible components",
                    ["Log", "Table", "Stats"],
                    [0, 1, 2]
                ).then(function (result) { appendResult("Multi choice", result); });
            }

            ui.separatorText("Data-table CRUD");
            if (ui.button("Add row")) {
                var nextId = dataTable.rows.length + 1;
                dataTable.addRow({
                    id: nextId,
                    component: "custom-" + nextId,
                    state: "new",
                    notes: "Added from the overview"
                });
            }
            ui.sameLine();
            if (ui.button("Update first")) {
                dataTable.updateRow(0, {state: "updated"});
            }
            ui.sameLine();
            if (ui.button("Remove selected")) {
                dataTable.removeSelected();
            }
            ui.textDisabled(
                "The separate table window also includes Add / Remove / Clear controls."
            );

            ui.separatorText("Session");
            if (ui.button("Close overview")) {
                window.close("example-closed");
            }
        });

        debugWindows.forEach(function (entry) {
            if (entry.open.value) {
                entry.show(entry.open);
            }
        });

        if (!mainOpen.value) {
            window.close("example-window-closed");
        }
        var now = Date.now();
        if (now - lastLogAt >= 2000) {
            lastLogAt = now;
            logWindow.debug(
                "Frame snapshot: " + stats.fps.toFixed(1) + " FPS, " +
                dataTable.rows.length + " rows"
            );
        }
    }, {
        width: numberOption(options.width, 760),
        height: numberOption(options.height, 640),
        x: numberOption(options.x, 6),
        y: numberOption(options.y, 24),
        fps: numberOption(options.fps, 60),
        theme: options.theme || imgui.Themes.ModernDark,
        touchMode: imgui.TouchMode.Auto,
        contentAutoResize: false,
        collapseButton: true,
        pinchZoom: true,
        systemCjkFont: true
    });

    function numberOption(value, fallback) {
        var result = Number(value);
        return isFinite(result) ? result : fallback;
    }

    var autoCloseMs = Math.max(0, numberOption(options.autoCloseMs, 0));
    if (autoCloseMs > 0) {
        setTimeout(function () {
            if (!session.closed) {
                session.close("example-timeout");
            }
        }, autoCloseMs);
    }
    return session;
});
