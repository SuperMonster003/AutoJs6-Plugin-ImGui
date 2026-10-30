<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Create floating user interfaces with Dear ImGui</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-ImGui?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-ImGui?color=A24232&label=Issues"/></a>
    <a href="https://github.com/ocornut/imgui"><img alt="Dear ImGui" src="https://img.shields.io/badge/Dear%20ImGui-1.92.9-3D6CB4"/></a>
    <br>
    <a href="https://developer.android.com/studio/archive"><img alt="Android Studio" src="https://img.shields.io/badge/Android%20Studio-2023.3+-B64FC8"/></a>
    <a href="https://www.jetbrains.com/idea/download/other.html"><img alt="IntelliJ IDEA" src="https://img.shields.io/badge/IntelliJ%20IDEA-2023.3+-EE4677"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-ImGui?color=534BAE&label=License"/></a>
  </p>
</div>

******

### Languages

******

The current README.md supports the following languages:

- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
- English [en] # current
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-fr.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-es.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ru.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ar.md)

******

### Introduction

******

The ImGui Plugin brings the [Dear ImGui](https://github.com/ocornut/imgui) immediate-mode GUI library to AutoJs6, rendering controls with OpenGL ES inside a transparent floating window. It is a natural fit for lightweight floating interfaces such as debug panels, parameter tuners, and runtime HUDs, and keeps window creation, frame scheduling, touch input, and native resource cleanup in one compact API.

Once the plugin is enabled in the Plugin Center, scripts use the global `imgui` object directly (registered by AutoJs6, which loads the plugin on the first member call); `plugins.load` is not needed. Requires AutoJs6 6.8.0 or later. When the plugin is newer than AutoJs6, members AutoJs6 does not list yet appear on `imgui` only after the plugin is loaded (on the first use of any `imgui` member); the `ui` argument of render callbacks is always complete.

******

### Features

******

- Adaptive overlay and full-screen Activity sessions with automatic touch pass-through, collapse/expand, independent floating buttons, alpha/security controls, persistent layouts, and lifecycle events.
- `launchPrivileged` provides an explicit production SurfaceFlinger mode through AutoJs6-managed Shizuku/root; authenticated Binder transfers the privileged Surface to the complete existing renderer, while `/dev/input` supplies observational pointer input.
- AutoJs6 registers the plugin directly as the global `imgui` object, so no loading step is needed once it is enabled, consistent with official plugins such as pinyin / mediainfo.
- Transparent floating windows with configurable size, position, frame rate, and font; drag a blank area to move the window, use two-finger inertial scrolling, and long-press with one finger for a right click. After a few seconds without input the frame rate drops to save battery, and drawing pauses while the screen is off.
- The `inputText` family is fully connected to the system IME, including composing text, automatic soft-keyboard visibility, and common editing keys.
- Windows, tabs, tree nodes, tables, popups, menus, tooltips, and 60+ immediate-mode widgets, including a mobile-style `toggle` switch.
- Visual and font system with 11 `Themes`, bulk styles, rounded/bordered/shadowed appearances, a multi-font stack, CJK fallback, and a Material Icons subset.
- Managed textures accept file paths, encoded bytes, Android `Bitmap`, and AutoJs6 `Image` objects; `image` / `imageButton` and three DrawList layers cover image display and custom overlay drawing.
- `session.capture()` returns the window as an AutoJs6 `Image`; with `systemCjkFont: true` the system draws the CJK characters outside the bundled font, with `pinchZoom: true` two fingers change the font scale, and windows follow changes of the display density and the system font size.
- Lightweight `imgui.ref(value)` / `{value: x}` references work with every stateful control while the legacy Java-array reference helpers remain fully compatible.
- Session-managed `logWindow`, stacked `toast`, Promise dialogs, threshold-colored `statsOverlay`, and selectable CRUD `dataTable` components provide ready-made debugging UI.
- Common APIs and constant enums have PascalCase aliases (e.g. `ui.Button`) that keep the plugin's argument style; the alias list and the differences from the upstream C++ signatures are in [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md).
- Engineering support includes complete TypeScript declarations, nine runnable examples, Android rendering instrumentation, a lock-free input queue, verified upstream-update tooling, and CI release automation.
- Localized plugin metadata, usage instructions, README, and changelog for ten languages.

******

### Installation

******

- Download the APK matching your device architecture from [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases); pick the `universal` package when unsure.
- Install the APK, open AutoJs6, and confirm on the plugin management page that this plugin is recognized and enabled.
- Call `imgui.createWindow(...)` directly in your script; grant AutoJs6 the overlay (floating window) permission on first use.
- For `launchPrivileged`, first configure and authorize Root or Shizuku in AutoJs6 as usual. The plugin reuses that host state and privileged mode does not require the overlay permission.

Host requirement: AutoJs6 with versionCode 5935 or later. The plugin ships `arm64-v8a` / `armeabi-v7a` / `x86_64` / `x86` binaries and requires Android 7.0 (API 24) or later plus an OpenGL ES 3.0-capable GPU/driver.

******

### Quick Start

******

With the plugin installed and enabled, create mutable references and open a floating window:

```js
var enabled = imgui.ref(true);
var volume = imgui.ref(0.5);
var themeColor = imgui.ref([0.25, 0.55, 0.90]);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(ui.dp(overlay.width), ui.dp(overlay.height), ui.Cond.Always);
    ui.withWindow(
        "ImGui Panel",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("Enabled", enabled);
            ui.sliderFloat("Volume", volume, 0, 1, "%.2f");
            ui.colorEdit3("Theme", themeColor);
            if (ui.button("Close", 120, 0)) {
                overlay.close();
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

Mutable controls accept lightweight references created by `imgui.ref(value)` or plain `{ value: ... }` objects; the legacy `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` helpers remain compatible. Focusing `inputText` automatically opens the system IME with composing-text support; pass `ime: false` to disable automatic IME handling. Window sizes and positions are dp: the `width`, `height`, `x` and `y` options, the session fields and the event data, and `fontSize` is dp as well. Coordinates inside a frame are px; convert with `ui.dp()` / `ui.px()`. Event and button callbacks run on the script thread (see [THREADING.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/THREADING.md)), and [MIGRATION-1.12.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/MIGRATION-1.12.md) lists the changes from earlier versions. Drag a blank area to move the window (`movable: false` keeps it fixed); two-finger vertical swipes have configurable inertia (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`), and a one-finger long press emits a right click (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). When the system font does not cover the required characters, point `fontPath` at a TTF or OTF font file.

Themes and fonts: `setTheme` accepts all 11 `Themes`, while `setStyleProperties` updates `StyleVar` values in bulk; `createWindow` also accepts `theme`, `appearance`, `style`, and `shadow`. Its `fonts` array preloads asset (`asset://...`) or file fonts for `pushFont` / `withFont`. The bundled CJK fallback and icon subset are merged automatically; use `Icons` / `icon(name)` to obtain icon glyphs.

Textures and custom drawing: call `createTexture` only after the window session is ready (normally once inside its render callback). The returned object exposes `width`, `height`, `update(source)` (replaces the pixels and keeps the handle; `width` / `height` follow a new size), and idempotent `dispose()` / `close()`; all remaining textures are released automatically when the session closes. `image` / `imageButton` display textures, while `getWindowDrawList`, `getForegroundDrawList`, and `getBackgroundDrawList` expose common drawing primitives. DrawList coordinates are surface-space pixels. AutoJs6 `images.read(...)` and screenshot `Image` values can be passed directly, as can an `ArrayBuffer` or typed array holding PNG or JPEG data.

Window sessions: overlays default to `TouchMode.Auto`, which keeps ImGui root windows interactive while letting blank surface areas reach the app underneath; choose `Touchable` or `Passthrough` for a fixed policy. A session can change alpha/security/touch mode, collapse into a low-FPS mini bubble, create independent draggable `addButtonEx` buttons, follow `AlwaysAutoResize` content, persist layout with `iniPath`, and subscribe through `on` / `once` / `off` or option callbacks. Use `imgui.launch(...)` for a full-screen Surface in the currently resumed AutoJs6 Activity and `launchFloaty(...)` for an explicit overlay. Each script engine owns one native renderer session, but that render callback may create any number of ImGui roots with `begin` / `withWindow`; creating another session closes the previous one. An exception thrown by the render callback or an event callback is printed with its stack by `console.error` (a run of the same error once) and emitted as an `error` event (`error` / `phase` / `frame`); without an `error` listener a render error closes the session (`closeReason` is `render-error`), with one the rest of the frame is skipped and rendering goes on. The `debug: true` option reports usage errors such as `begin` without `end` through `console.warn` and logcat, and shows the Metrics and Debug Log windows. Global methods such as `setTouchable` / `setGlobalAlpha` / `getComponent` act on the current session and throw `imgui.<name>: no active session` without one. In an `imgui.launch` session the back key closes the session (`closeReason` is `back`) unless a `back` listener calls `event.preventDefault()`; a shown soft keyboard takes the back key first. Overlay windows get the back key only while their text input has focus, and then it only hides the keyboard. With `debug: true`, a render callback that takes more than 250 ms also prints a `console.warn` suggesting `threads.start` (at most once every 10 seconds).

High-level components attach to the active session and render after the user callback: `logWindow` provides colored levels, clearing, export callbacks, and auto-scroll; `toast` provides positioned timed notices; `alert` / `confirm` / `singleChoice` / `multiChoice` resolve Promises; `statsOverlay` plots frame time and shows the work time of each frame; and `dataTable` provides selection and CRUD. The nine bundled examples (`widget-overview`, `parameter-panel`, `log-hud`, `data-table-demo`, `theme-gallery`, `error-handling`, `background-task`, `large-list`, and `texture-refresh`) are discoverable through `listExamples` / `getExampleSource` and launchable with `runExample`. AutoJs6 6.8 does not yet consume the generic example metadata in its Plugin Center, so launch an example directly with the call below until host support lands:

```js
imgui.runExample("widget-overview");
```

******

### API Overview

******

Common APIs also have PascalCase aliases (e.g. `ui.Button` equals `ui.button`). The aliases keep the plugin's argument style (mutable values through `imgui.ref`, for example) and do not match the upstream C++ signatures one to one; see [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md) for the list and the differences. Lower camel case methods mirror the Dear ImGui operations of the same name and fall into these groups:

- Session runtime: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, `density` / `dp` / `px` unit conversion, session `on` / `once` / `off` plus their per-session forms, the session `error` event that reports callback errors, the `debug` option that turns on debug mode, and power saving through `idleFps` / `idleDelay`, `setFps` / `setIdleFps` / `getFps`, and the `idle` / `active` events.
- Backend discovery: `getBackendCapabilities` / `BackendStatus` reports availability and production readiness for windows, split touch, the privileged process, direct input, Docking, and Multi-Viewport without performing elevation.
- Session and windows: `createWindow` / `closeWindow` / `withWindow` / `withChild` / `setNextWindowPos` / `setNextWindowSize` / `setNextWindowBgAlpha`, plus window state queries such as `isWindowHovered`.
- Text and widgets: `text` / `textColored` / `textWrapped` / `separatorText` / `bulletText` / `labelText` / `button` / `arrowButton` / `invisibleButton` / `checkbox` / `toggle` / `radioButton` / `sliderFloat` / `sliderInt` / `vSliderFloat` / `dragFloat` / `dragInt` / `inputText` / `inputInt` / `inputFloat` / `inputTextMultiline` / `colorEdit3` / `colorEdit4` / `colorPicker4` / `colorButton` / `progressBar` / `plotLines` / `plotHistogram`, and more. Widgets with 2 to 4 values: `dragFloat2/3/4` / `dragInt2/3/4` / `sliderFloat2/3/4` / `sliderInt2/3/4` / `inputFloat2/3/4` / `inputInt2/3/4` / `dragFloatRange2` / `dragIntRange2` / `sliderAngle`.
- Containers and navigation: `withTabBar` / `withTabItem` / `withTreeNode` / `treeNodeEx` / `collapsingHeader` / the `withTable` table family / `withListBox` / `withCombo` / `selectable`, plus `listClipper` for long lists. Table sorting: `tableGetSortSpecs` / `SortDirection`, and `dataTable` with `sortable: true`.
- Popups and menus: `openPopup` / `withPopup` / `withPopupModal` / `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` / `closeCurrentPopup` / `withMenuBar` / `withMenu` / `menuItem` / `setTooltip` / `setItemTooltip` / `withItemTooltip`.
- Style and layout: `styleColorsDark` / `styleColorsLight` / `styleColorsClassic` / `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` / `withGroup` / `withDisabled` / `withId` / `indent` / `sameLine` / `separator` / `spacing`, plus the cursor and scrolling families.
- Textures and drawing: `createTexture` / `texture.update` / `destroyTexture` / `image` / `imageButton` / `colorU32`, plus `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` with line, rectangle, circle, triangle, text, polyline, Bézier, and image primitives. Path drawing: `pathLineTo` / `pathArcTo` / `pathArcToFast` / `pathBezierCubicCurveTo` / `pathBezierQuadraticCurveTo` / `pathRect` / `pathStroke` / `pathFillConvex` / `pathFillConcave`; `pushClipRect` / `popClipRect` on draw lists and windows; more shapes: `addEllipse` / `addNgon` / `addQuad` / `addBezierQuadratic` / `addRectFilledMultiColor` / `addConvexPolyFilled` / `addConcavePolyFilled` / `addImageQuad` / `addImageRounded`.
- Queries and input: state queries such as `isItemClicked` / `isItemHovered` / `isItemActive` / `isItemEdited` / `isMouseDown` / `getMousePos` / `calcTextSize` / `framerate`, active focus via `setKeyboardFocusHere`, and the input primitives `addInputCharacters` / `sendKey` / `addMouseWheel` / `wantTextInput`. Every currently exposed `InputTextFlags` value is passed through to Dear ImGui; callback-dependent flags are intentionally omitted, and `WordWrap` applies only to multiline input. Key queries and shortcuts: `isKeyDown` / `isKeyPressed` / `isKeyReleased` / `getKeyPressedAmount` / `getKeyName` / `isKeyChordPressed` / `shortcut` / `setNextItemShortcut`, with key chords such as `ui.Mod.Ctrl | ui.Key.S`. Clipboard: `getClipboardText` / `setClipboardText`. Pointer injection for automated UI tests: `addMousePosEvent` / `addMouseButtonEvent` (frame pixels, like `getMousePos`).
- Drag and drop: `withDragDropSource` / `withDragDropTarget`, `beginDragDropSource` / `setDragDropPayload` / `endDragDropSource` / `beginDragDropTarget` / `acceptDragDropPayload` / `endDragDropTarget` / `getDragDropPayload`, with `DragDropFlags`; the payload is a string, a number or any JSON-serializable object.
- Debug tools: `showMetricsWindow` / `showDebugLogWindow` / `showIdStackToolWindow` / `showStyleEditor` / `showAboutWindow` / `showUserGuide` show the built-in Dear ImGui tool windows; each takes an optional mutable boolean that its close button sets to false.
- High-level components and examples: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, plus `listExamples` / `getExampleSource` / `runExample`; the same factories are available on each session.
- Mutable references: lightweight `imgui.ref` (or a plain `{value: x}` object), plus compatible Java-array helpers `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.ints` / `imgui.strings`.
- Constants: `BackendStatus` / `Cond` / `WindowFlags` / `ChildFlags` / `InputTextFlags` / `SliderFlags` / `TreeNodeFlags` / `SelectableFlags` / `TabBarFlags` / `TabItemFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `SortDirection` / `Col` / `StyleVar` / `Themes` / `Appearance` / `Fonts` / `Icons` / `Dir` / `Key` / `Mod` / `InputFlags` / `DragDropFlags` / `MouseButton` / `ButtonFlags` / `TextureFlags` / `DrawListLayer` / `DrawFlags` / `LogLevel` / `ToastPosition` / `Limits`, matching the Dear ImGui enums or plugin tables of the same names.

******

### Known Limitations

******

- Each script engine supports one native renderer session at a time; create multiple ImGui root windows inside that session when several panels are needed. Creating another overlay or Activity session closes the previous one.
- `imgui.launch` requires a currently resumed AutoJs6 Activity; use `launchFloaty` when the script must keep rendering without a foreground host Activity.
- Privileged mode is fixed full-display and pointer-only: text fields use a temporary AutoJs6 input box that needs the overlay permission and only adds text at the cursor, and it has no key input, host-layer alpha/security, collapse, companion Android buttons, or live rotation rebuild. Direct input observes without `EVIOCGRAB`, and OEM SurfaceControl/SELinux policy may still reject startup; capability probing never executes `su` or requests a Shizuku grant.

******

### Release History

******

#### v1.16.0

###### 2026/10/31

* `Feature` session.capture(options) takes a picture of the window and returns an image for the images module, for example images.save(session.capture(), path). options.region picks a part of the window, in dp. A window in privileged mode can only be captured between two frames, for example from setTimeout(fn, 0)
* `Feature` createWindow({systemCjkFont: true}) shows every CJK character the device has, including rare ones like 龘 that are missing from the bundled font. Android draws each character when it is first used, so this takes almost no extra memory; docs/LIMITS.md lists what the bundled font covers
* `Feature` createWindow({pinchZoom: true}) lets two fingers change the text size from 0.5 to 3 times; moving both fingers together still scrolls. Read the scale from session.fontScale, set it with session.setFontScale(scale), and listen to the new fontScaleChanged event. The widget-overview example shows all of this
* `Feature` Text input in privileged mode: tapping an inputText now opens a small input box of AutoJs6 with the keyboard (this needs the overlay permission of AutoJs6). The OK button, the done key or a tap elsewhere enters the text at the cursor of the field; text already in the field can not be edited in the box
* `Improvement` Windows now follow changes of the display size (density) and the system font size while they run: text and controls get the new size, and the window keeps its size in dp. configurationChanged has the new fields density, oldDensity, fontScale and oldFontScale. A full-screen window of imgui.launch closes instead (session.closeReason is "configuration-changed"), because Android recreates the Activity it lives in

#### v1.15.0

###### 2026/10/30

* `Feature` Keyboard queries: isKeyDown / isKeyPressed / isKeyReleased / getKeyPressedAmount / getKeyName / isKeyChordPressed, plus keyboard shortcuts with shortcut and setNextItemShortcut. Combine keys as ui.Mod.Ctrl | ui.Key.S. The Key constants now cover the whole keyboard: A to Z, Digit0 to Digit9, F1 to F24, the keypad and more
* `Feature` Clipboard: getClipboardText / setClipboardText use the same Android clipboard as the host's getClip / setClip, and so do Ctrl+C / Ctrl+V in text fields. From Android 10 the system lets an app read the clipboard only while it has the input focus; docs/LIMITS.md explains what that means for floating windows
* `Feature` Drag and drop: drag an item onto another with beginDragDropSource / setDragDropPayload / beginDragDropTarget / acceptDragDropPayload and the helpers withDragDropSource / withDragDropTarget (DragDropFlags sets the options). The payload can be a string, a number or any JSON-serializable object, and colors can be dragged from color widgets; see the new section of the widget-overview example
* `Feature` Custom drawing: Path functions (pathLineTo / pathArcTo / pathBezierCubicCurveTo / pathStroke / pathFillConvex and more), pushClipRect / popClipRect on draw lists and windows, and new shapes: addEllipse, addNgon, addQuad and their filled forms, addBezierQuadratic, addRectFilledMultiColor, addConvexPolyFilled, addConcavePolyFilled, addImageQuad, addImageRounded; see the widget-overview example
* `Feature` Simulated touch: addMousePosEvent(x, y) and addMouseButtonEvent(button, down) let a script act like a finger on the window, for example to test a UI automatically. Coordinates are frame pixels, like getMousePos, not the dp of createWindow; the apps below the window are not affected

#### v1.14.0

###### 2026/10/30

* `Hint` Behavior change: in a full-screen window opened with imgui.launch, the back key now closes the window (session.closeReason is "back"). To keep the window open, call e.preventDefault() in session.on("back", e). Floating windows (launchFloaty) behave as before
* `Feature` Debug tool windows: showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow / showUserGuide (aliases ShowMetricsWindow and so on) show the built-in Dear ImGui tools; pass imgui.bool(true) to let the close button hide them. The widget-overview example has a new Debug menu that opens them
* `Feature` Table sorting: in a table with the Sortable flag, a tap on a column header changes the sort; tableGetSortSpecs() returns the sort columns and directions (imgui.SortDirection), and specsDirty is true only in the frame they change. The fourth argument of tableSetupColumn is the column's user id. dataTable sorts its rows with sortable: true, and a column's compare function sets a custom order; see the data-table-demo example
* `Feature` Widgets with 2 to 4 values: dragFloat2 / 3 / 4, dragInt2 / 3 / 4, sliderFloat2 / 3 / 4, sliderInt2 / 3 / 4, inputFloat2 / 3 / 4, inputInt2 / 3 / 4, plus dragFloatRange2 / dragIntRange2 for a min-max range and sliderAngle for an angle (stored in radians, shown in degrees). Pass the values as {value: [x, y, z]}, imgui.floats(...) or the new imgui.ints(...); see the new section of the widget-overview example
* `Improvement` With createWindow({debug: true}), a render callback that takes more than 250 ms prints a console.warn with the time and a hint to move slow work (sleep, network, files) to threads.start, at most once every 10 seconds; docs/THREADING.md explains how

##### For more release history

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-en.md)

******

### Build

******

```powershell
.\gradlew.bat :app:assembleDebug
```

Release build with CRC32 digest filenames:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

Verify the native source inventory, JNI declaration parity, unit tests, and ABI split integrity:

```powershell
.\gradlew.bat :app:verifyImGuiDebugApks
```

Build parameters come from `version.properties`; the current minimum SDK is 24 and target SDK is 37.

******

### Project Layout

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/assets/plugin/index.js
app/src/main/assets/examples/widget-overview.js
app/src/main/cpp/ImGuiBridge.cpp
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
Roadmap.md
```

`index.js` is the script-engine-side `imgui` module and `ImGuiBridge.cpp` is the JNI bridge to Dear ImGui. `strings.xml` contains localized plugin descriptions and `plugin_instruction.md` contains the usage instructions displayed by the host. README and CHANGELOG files are generated from JSON sources by `.python/generate_markdown.py`; edit the JSON sources instead of the generated files.

******

### Links

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui official project: https://github.com/ocornut/imgui
- Capability roadmap: https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)
