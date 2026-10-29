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
session.setMoreTouch(true);
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
