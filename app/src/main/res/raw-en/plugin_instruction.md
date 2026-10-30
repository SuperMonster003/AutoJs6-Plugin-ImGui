Once the plugin is enabled in the Plugin Center, use the global `imgui` object directly (requires AutoJs6 6.8.0 or later); there is no need to call `plugins.load`.

Create mutable references before opening the floating window:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(ui.dp(window.width), ui.dp(window.height), ui.Cond.Always);
    ui.withWindow(
        "ImGui controls",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("Enabled", enabled);
            ui.sliderFloat("Level", level, 0, 1, "%.2f");
            if (ui.button("Close", 120, 0)) {
                window.close();
            }
        }
    );
}, {
    width: 360,
    height: 240,
    fontSize: 16,
    theme: imgui.Themes.ModernDark,
    appearance: imgui.Appearance.Rounded,
    fps: 60
});
```

Window sizes and positions (`width`, `height`, `x`, `y`, session fields and events) and `fontSize` are dp; coordinates inside a frame are px, so convert with `ui.dp()` / `ui.px()`. Event and button callbacks run on the script thread. Focusing `inputText` automatically opens the system IME with composing-text support. Drag a blank area to move the floating window; a two-finger vertical swipe scrolls with inertia, and a one-finger long press emits a right click. Pass `movable: false` to disable dragging. Use `fontPath` to load a readable TTF or OTF file when the system font does not cover the required characters.

Use `Themes` / `setTheme`, `setStyleProperties`, and `Appearance` for visual presets. `createWindow.fonts` preloads asset or file fonts for `pushFont` / `withFont`; the bundled CJK fallback and Material icon subset are merged automatically, with icons available through `Icons` / `icon(name)`.

`createTexture` accepts a path, encoded bytes, Android `Bitmap`, or an AutoJs6 `Image` from `images.read` or screen capture. Use `image` / `imageButton` to display it and call `dispose()` when no longer needed; the session releases any remaining textures automatically. `getWindowDrawList`, `getForegroundDrawList`, and `getBackgroundDrawList` provide line, shape, text, and image primitives in Surface-pixel coordinates.

Overlay sessions use `TouchMode.Auto` by default, keeping ImGui windows interactive while passing blank areas through. The session can change touchability, alpha, and security; collapse to a low-FPS mini bubble; create independent `addButtonEx` buttons; persist layout with `iniPath`; and publish lifecycle events. Use `imgui.launch(...)` for a full-screen Surface in the currently resumed AutoJs6 Activity. One native session may contain multiple `begin` / `withWindow` roots; creating a new session closes the previous one.

`setMoreTouch(true)` enables Android split touch for the main window and independent buttons. `launchPrivileged(callback, {backend: "auto"})` explicitly selects the production SurfaceFlinger mode and reuses AutoJs6's existing Shizuku/root authorization without overlay permission; direct `/dev/input` is observational and never grabs the touchscreen. `getBackendCapabilities()` reports the host state without elevating privileges.

`session.capture({region})` returns the window as an `Image` for `images.save`; the region is in dp, and a privileged window can only be captured between two frames. `createWindow({systemCjkFont: true})` lets the system draw CJK characters outside the bundled font, and `pinchZoom: true` lets two fingers change the font scale (`session.fontScale`, `session.setFontScale`). In privileged mode a text field opens a temporary AutoJs6 input box, which needs the overlay permission.

Tables, context popups, menus, tooltips, style stacks, and 60+ widgets are available; helpers such as `withTable`, `withPopupModal`, `withContextItem`, and `withMenuBar` pair begin/end calls safely. See the project README and Roadmap for the full API overview.

Stateful controls also accept lightweight references from `imgui.ref(value)` or plain `{ value: ... }` objects; the legacy `bool`, `float`, `int`, `string`, and color-array helpers remain compatible. Session-managed `logWindow`, `toast`, Promise dialogs, `statsOverlay`, and `dataTable` components render after the user callback and close automatically with their session.

Run any of the seven bundled examples with `imgui.runExample("widget-overview")`, `"parameter-panel"`, `"log-hud"`, `"data-table-demo"`, `"theme-gallery"`, `"error-handling"`, or `"background-task"`; discover them through `listExamples` and inspect their source through `getExampleSource`. AutoJs6 6.8 Plugin Center does not yet expose a generic one-click example action.

Version 1.7 also publishes complete editor declarations at `types/imgui.d.ts`. Runtime safety limits are available as `imgui.Limits` (64 KiB text input, 512 selection items, and 2,048 queued input events); over-limit API input is rejected instead of silently truncated.
