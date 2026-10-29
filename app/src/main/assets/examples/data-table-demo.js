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

    var controlsOpen = imgui.ref(true);
    var nextId = 7;
    var table;
    var rows = [
        {id: 1, task: "Initialize EGL", owner: "Renderer", state: "Done", cost: 4.2},
        {id: 2, task: "Build font atlas", owner: "Fonts", state: "Done", cost: 7.8},
        {id: 3, task: "Drain input queue", owner: "Input", state: "Active", cost: 0.3},
        {id: 4, task: "Compose UI", owner: "Script", state: "Active", cost: 2.6},
        {id: 5, task: "Submit draw data", owner: "Renderer", state: "Pending", cost: 1.1},
        {id: 6, task: "Swap buffers", owner: "EGL", state: "Pending", cost: 0.8}
    ];

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        if (!table) {
            table = window.dataTable(
                "frame-pipeline",
                [
                    {key: "id", label: "#", width: 38},
                    {key: "task", label: "Task", width: 180},
                    {key: "owner", label: "Owner", width: 90},
                    {key: "state", label: "State", width: 82},
                    {
                        key: "cost",
                        label: "Cost (ms)",
                        width: 90,
                        render: function (value) {
                            ui.text(Number(value).toFixed(1));
                        }
                    }
                ],
                rows,
                {
                    title: "Frame Pipeline Table",
                    position: ui.ToastPosition.TopRight,
                    width: 650,
                    height: 430,
                    rowKey: "id",
                    multiSelect: true,
                    emptyText: "No pipeline stages",
                    onRowClick: function (row) {
                        window.toast("Selected: " + row.task, 1400, {
                            level: ui.LogLevel.Info,
                            position: ui.ToastPosition.BottomRight
                        });
                    }
                }
            );
        }

        ui.setNextWindowPos(14 * window.density, 14 * window.density, ui.Cond.FirstUseEver);
        ui.setNextWindowSize(430 * window.density, 275 * window.density, ui.Cond.FirstUseEver);
        ui.withWindow("Table Demo Controls", controlsOpen, 0, function () {
            ui.text("Rows: " + table.rows.length + ", selected: " + table.selectedRows().length);

            if (ui.button("Add stage")) {
                table.addRow({
                    id: nextId,
                    task: "Custom stage " + nextId,
                    owner: "User",
                    state: "New",
                    cost: 0.5 + (nextId % 5) * 0.4
                });
                nextId += 1;
            }
            ui.sameLine();
            if (ui.button("Toggle first state")) {
                var first = table.getRows()[0];
                if (first) {
                    table.updateRow(0, {state: first.state === "Done" ? "Active" : "Done"});
                }
            }

            if (ui.button("Remove selected")) {
                table.removeSelected();
            }
            ui.sameLine();
            if (ui.button("Restore rows")) {
                table.setRows(rows);
            }
            ui.sameLine();
            if (ui.button("Toggle table")) {
                table.toggle();
            }

            ui.textDisabled("Click rows in the table; Ctrl-style multi-select is managed by the wrapper.");
            if (ui.button("Close example")) {
                window.close("example-closed");
            }
        });

        if (!controlsOpen.value) {
            window.close("example-window-closed");
        }
    }, {
        width: numberOption(options.width, 1120),
        height: numberOption(options.height, 650),
        x: numberOption(options.x, 10),
        y: numberOption(options.y, 46),
        fps: numberOption(options.fps, 45),
        theme: options.theme || imgui.Themes.Dark,
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
