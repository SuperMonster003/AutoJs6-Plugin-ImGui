/// <reference path="../../main/assets/types/imgui.d.ts" />

const plugin: ImGui.Api = imgui;
const enabled = plugin.bool(true);
const count = plugin.int(3);
const title = plugin.ref("P6");
const backendCapabilities: ImGui.BackendCapabilities = plugin.GetBackendCapabilities();
const backendState: ImGui.BackendStatus = backendCapabilities.privileged.status;
const privilegedOptions: ImGui.WindowOptions = {
    mode: plugin.WindowMode.Privileged,
    backend: "auto",
    startupTimeout: 10_000,
    rotation: 0,
};

plugin.checkbox(title.value, enabled);
plugin.text(`${backendState}:${backendCapabilities.directInput.readerImplemented}`);
plugin.text(`${backendCapabilities.privileged.transport}:${privilegedOptions.backend}`);
plugin.sliderInt("Count", count, 0, 10);
plugin.SetTheme(plugin.Themes.ModernDark);
plugin.getForegroundDrawList().addCircleFilled([24, 24], 8, [0.2, 0.8, 1, 1]);

const session: ImGui.Session = plugin.createWindow((ui, windowSession) => {
    const typedUi: ImGui.Api = ui;
    const typedSession: ImGui.Session = windowSession;
    typedUi.begin("Typed ImGui");
    typedUi.text(`Limit: ${typedUi.Limits.InputTextMaxBytes}`);
    typedUi.end();
    typedSession.setMoreTouch(true);
}, {
    mode: plugin.WindowMode.Activity,
    theme: plugin.Themes.Dark,
    fps: 60,
    moreTouch: true,
    onMoreTouchChanged: event => plugin.text(event.type),
});

session.on("closed", event => plugin.text(event.type));
session.on("error", event => {
    const phase: "render" | "event" = event.phase;
    plugin.text(`${phase}:${event.frame}:${event.message}`);
});
session.setMoreTouch(true);
const debugSession: ImGui.Session = plugin.createWindow(ui => {
    ui.plotLines("Samples", [0, 1, 2, 3, 4, 5, 6, 7], {valuesOffset: 2, stride: 2});
}, {
    debug: true,
    onError: event => event.session.close(event.phase),
});
const debugMode: boolean = debugSession.debug;
plugin.text(`${debugMode}`);
let pixels: ImGui.Texture | null = null;
const idleSession: ImGui.Session = plugin.createWindow(ui => {
    pixels = pixels ?? ui.createTexture("images/red.png", {nearest: true});
    pixels.update("images/green.png");
    ui.listClipper(100_000, (start, end) => {
        for (let row = start; row < end; row++) ui.text(`Row ${row}`);
    });
    ui.ListClipper(100, {itemHeight: 24, includeItems: [42]}, (start, end) => ui.text(`${start}..${end}`));
}, {
    fps: 60,
    idleFps: 10,
    idleDelay: 3000,
    onIdle: event => plugin.text(`${event.fps}`),
    onActive: event => plugin.text(`${event.reason}`),
});
const stats: ImGui.StatsOverlay = idleSession.statsOverlay();
const workTime: number = stats.snapshot().workTime + stats.workTime;
idleSession.setFps(30).setIdleFps(0, 1000);
const idleState: string = `${idleSession.idle}:${idleSession.paused}:${idleSession.idleFps}:${idleSession.idleDelay}`;
plugin.text(`${idleState}:${idleSession.getFps()}:${workTime}`);
idleSession.close("type-smoke-complete");
plugin.SetMoreTouch(false);
session.close("type-smoke-complete");

const privilegedSession: ImGui.Session = plugin.LaunchPrivileged(() => {
    plugin.begin("Typed privileged ImGui");
    plugin.text("Binder Surface");
    plugin.end();
}, privilegedOptions);
const activeBackend: ImGui.ActivePrivilegedBackend | null = privilegedSession.privilegedBackend;
plugin.text(`${activeBackend}:${privilegedSession.getBackendInfo()}`);
privilegedSession.close("type-smoke-complete");

plugin.isKeyPressed(plugin.Key.F1, false);
plugin.Shortcut(plugin.Mod.Ctrl | plugin.Key.S, plugin.InputFlags.RouteGlobal);
const clipboardText: string = plugin.getClipboardText();
plugin.setClipboardText(clipboardText);
plugin.addMousePosEvent(10, 20);
plugin.addMouseButtonEvent(plugin.MouseButton.Left, true);
plugin.withDragDropSource(plugin.DragDropFlags.SourceAllowNullID, () => {
    plugin.setDragDropPayload("ROW", {id: 1});
});
plugin.withDragDropSource(() => {
    plugin.setDragDropPayload("ROW", 1, plugin.Cond.Once);
});
plugin.withDragDropTarget(() => {
    const payload = plugin.acceptDragDropPayload<{ id: number }>("ROW");
    if (payload !== null && payload.delivery) {
        plugin.text(payload.data.id);
    }
});
plugin.getWindowDrawList()
    .pathClear()
    .pathArcTo([10, 10], 5, 0, 1)
    .pathStroke([1, 1, 1, 1], 2, plugin.DrawFlags.Closed)
    .pushClipRect([0, 0], [10, 10], true)
    .addNgon([5, 5], 4, 0xFFFFFFFF, 6)
    .popClipRect();
plugin.pushClipRect([0, 0], [10, 10]);
plugin.PopClipRect();
