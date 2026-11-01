# Multiple windows

A script gets one Android surface at a time. Several panels are several **ImGui root windows** inside that surface, not
several overlay windows. The bundled example `examples/multi-window.js` shows everything below; run it with
`imgui.runExample("multi-window")`.

| Term | What it is | How many |
| --- | --- | --- |
| Session | What `createWindow`, `launchFloaty`, `launch` and `launchPrivileged` return | One at a time |
| Surface | The Android view or layer the session draws on | One per session |
| Root window | An ImGui window from `begin` or `withWindow`, with a title bar of its own | Any number per session |

## One session at a time

The plugin has one native renderer in the AutoJs6 process. A new session in the same script closes the previous one
(`closeReason` is `replaced`). A session started by another script takes the renderer over, and the session of the
first script closes with `native-context-replaced`. Two overlay windows on the screen at once are not possible, and
Dear ImGui Multi-Viewport, which would give a root window a surface of its own, is deferred (see
[DOCKING-MULTI-VIEWPORT.md](DOCKING-MULTI-VIEWPORT.md)). Docking is not available either.

## Root windows in one session

Each `begin` + `end` pair or `withWindow` call with a different name in the render callback adds a root window. Windows
are identified by name: submitting the same name twice in a frame appends to one window, and `"Log##left"` and
`"Log##right"` are two windows that both show "Log".

```javascript
var logOpen = imgui.ref(true);
var session = imgui.launchFloaty(function (ui, window) {
    ui.setNextWindowPos(ui.dp(8), ui.dp(8), ui.Cond.FirstUseEver);
    ui.setNextWindowSize(ui.dp(240), ui.dp(160), ui.Cond.FirstUseEver);
    ui.withWindow("Controls", null, 0, function () {
        ui.checkbox("Show log", logOpen);
    });

    if (logOpen.value) {
        ui.setNextWindowPos(ui.dp(8), ui.dp(176), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(240), ui.dp(160), ui.Cond.FirstUseEver);
        ui.withWindow("Log", logOpen, 0, function () {
            ui.text("Second window");
        });
    }
}, {width: 256, height: 344, contentAutoResize: false});
```

## Position and size

`setNextWindowPos` and `setNextWindowSize` apply to the next `begin` and take frame pixels, relative to the surface, so
convert dp with `ui.dp`. `Cond.FirstUseEver` sets the value once and leaves the window to the user; `Cond.Always` pins it
every frame, and the user can no longer move it. Positions are forgotten when the session closes, unless
`createWindow({iniPath: true})` stores them.

The `width` and `height` of `createWindow` size the surface, in dp, not a root window. It clips every root window, so
make it large enough for all of them and for the places the user may drag them to. A larger surface costs more GPU
memory and fill time, but with `TouchMode.Auto` its empty parts do not block the app underneath.

`contentAutoResize` is on by default. It only reacts to root windows with `WindowFlags.AlwaysAutoResize`: the surface then
follows the bounding box of those windows, so one such window among others resizes the surface for all of them. Pass
`contentAutoResize: false` to keep the size you asked for.

The user moves a root window by its title bar and resizes it by its corners. A touch that starts inside a root window
never moves the overlay; a touch on an empty part of the surface moves the whole overlay when `touchMode` is
`Touchable` and `movable` is not false. Move the overlay from the script with `session.setPosition(x, y)` (dp).

## Collapsing

The arrow in the title bar collapses a root window to its title bar. `begin` then returns false, and `end` must still be
called; `withWindow` does this and skips its body. Inside `begin` and `end` `ui.isWindowCollapsed()` reads the state.
`WindowFlags.NoCollapse` removes the arrow and `WindowFlags.NoTitleBar` the whole title bar.

`ui.setNextWindowCollapsed(collapsed, condition)` does the same from the script, for the next `begin` or `withWindow`.
Call it in one frame, from a button for example: with `Cond.Always`, the default, a call in every frame overrules the arrow.
`Cond.Once` applies once per session, `Cond.Appearing` each time the window appears, and `Cond.FirstUseEver` only to a window
that has no saved settings. `WindowFlags.NoCollapse` removes the arrow, not this call.

```javascript
var collapseLog = null; // true or false for one frame
// In the render callback:
if (collapseLog !== null) {
    ui.setNextWindowCollapsed(collapseLog);
    collapseLog = null;
}
ui.withWindow("Log", null, 0, function () {
    ui.text("Second window");
});
```

`session.collapse()` is something else: it hides the whole session behind a small button, all root windows included.

## Close button

The second argument of `begin` and `withWindow` turns the close button on: a mutable boolean (`imgui.ref(true)`, a
`{value: true}` object or `imgui.bool(true)`) that the button sets to false. `null` or `undefined` means no close button.

```javascript
var open = imgui.ref(true);
// In the render callback:
if (open.value) {
    ui.withWindow("Tool", open, 0, function () {
        ui.text("Tap the x in the title bar");
    });
}
```

The button does not hide anything by itself. A window with a false boolean that is still submitted stays on the screen,
so test the boolean first, as above. Setting it back to true opens the window again at its last position and size.

## Focus and order

Tapping a root window focuses it and brings it to the front, and it stays there until another window takes its place.
A tap on an empty part of the surface removes the focus and leaves the order alone. The order of the calls in the render
callback only decides the order the first time, and a window that appears later takes the focus and the front. Tooltips
and popups stay above root windows, and a modal popup blocks input to all of them.

- `ui.isWindowFocused()` tells whether the current window has the focus, and `ui.FocusedFlags` widens the question, for
  example to child windows or to any window.
- `WindowFlags.NoBringToFrontOnFocus` keeps a window in place when tapped, which suits a background panel, and
  `WindowFlags.NoFocusOnAppearing` keeps a new window from taking the focus.
- Text input and injected keys go to the focused window. `addKeyEvent` chords such as Ctrl+A reach a multi-select list
  only while its window has the focus.
- `ui.setNextWindowFocus()` focuses the next `begin` or `withWindow` and brings it to the front, whatever its place in the
  render callback. Call it in one frame: a call in every frame keeps taking the focus back from the user. A window with
  `NoBringToFrontOnFocus` takes the focus and keeps its place, and a modal popup stays above it. Nothing changes the order
  without the focus.

## Touch regions and window modes

`TouchMode.Auto`, the default of overlays, makes only the root windows touchable: at most 64 rectangles, refreshed when no
finger is down. Touches elsewhere reach the app below. With 65 root windows or more, the rest would not receive touches,
so use `Touchable` then. `Touchable` claims the whole surface, and `Passthrough` none of it.

| | `launchFloaty` / overlay | `launch` / Activity | `launchPrivileged` |
| --- | --- | --- | --- |
| Surface | `width` x `height` dp, at `x`, `y`, limited to the display | The whole resumed AutoJs6 Activity; `width`, `height`, `x`, `y` have no effect | A full-display layer; `width`, `height`, `x`, `y` have no effect |
| Size available to root windows | `session.width`, `session.height` | The same fields | The same fields |
| Outside root windows | Follows `touchMode` | The Activity keeps the touch | The app below gets every touch; the layer only observes |
| Touch on a root window | Reaches the window only | Reaches the window only | Reaches the window and the app below, see [PRIVILEGED-BACKEND.md](PRIVILEGED-BACKEND.md) |
| `session.collapse()` | Hides the surface behind a small button | The same | Throws an `Error` |

The session fields are in dp, like the options; multiply by `ui.dp(1)` or use `ui.dp` to compare them with frame
coordinates.

## Limits worth knowing

- All root windows share one frame: a slow window slows the others, and `listClipper` in a long list helps all of them.
- A render callback that throws skips the rest of the frame, so the windows after it are not drawn in that frame (with an
  `error` listener) or the session closes (without one).
- `ui` and the session are the same for all root windows. `session.setPosition` and `session.setSize` act on the surface
  of an overlay, and `session.close` on the whole session.
