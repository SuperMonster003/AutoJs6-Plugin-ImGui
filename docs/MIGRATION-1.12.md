# Migrating to v1.12.0

v1.12.0 changes four things that existing scripts may depend on. Most scripts need only the changes in the
first section; the other sections matter when a script relied on silent fixes of bad arguments, wrote session
fields, or blocked in callbacks.

## 1. Window geometry is dp

Positions and sizes of the Android window are now density-independent pixels (dp) everywhere. Before v1.12.0
`width` / `height` options were dp but `x` / `y`, the session fields and the event payloads were px.

| API | Before | v1.12.0 |
| --- | --- | --- |
| `createWindow` options `width`, `height` (`w`, `h`) | dp | dp |
| `createWindow` options `x`, `y` | px | dp |
| `session.x`, `y`, `width`, `height`, `displayWidth`, `displayHeight` | px | dp |
| `session.setPosition(x, y)`, `session.setSize(width, height)` | px | dp |
| Event payloads: `moved`, `resized`, `ready`, `surfaceRestored`, `configurationChanged`, `expanded` | px | dp |
| Floating button options `size`, `width`, `height` | dp | dp |
| Floating button options `x`, `y` | px | dp |
| Floating button fields `x`, `y`, `width`, `height` | px | dp |
| `button.setPosition(x, y)`, `onMoved` event `x`, `y` | px | dp |
| Coordinates inside a frame: `setNextWindowPos`, `setNextWindowSize`, `getWindowPos`, `dummy`, draw lists, ... | px | px (unchanged) |

New members convert between the two units:

- `imgui.density`: px per dp of the active session (of the display when no session is open).
- `imgui.dp(value)` (alias `Dp`): dp to px, for coordinates inside a frame.
- `imgui.px(value)` (alias `Px`): px to dp.

```javascript
// Before
imgui.createWindow(render, {x: 30 * density, y: 60 * density, width: 320, height: 240});
ui.setNextWindowSize(300 * window.density, 200 * window.density, ui.Cond.FirstUseEver);
if (session.x > 500) { /* px */ }

// v1.12.0
imgui.createWindow(render, {x: 30, y: 60, width: 320, height: 240});
ui.setNextWindowSize(ui.dp(300), ui.dp(200), ui.Cond.FirstUseEver);
if (session.x > ui.px(500)) { /* session.x is dp */ }
```

A script that passed px for `x` / `y` now places the window `density` times further away; the position is then
clamped to the display, so the window usually ends up at the right or bottom edge. Divide such values by
`imgui.density`, or better, write them in dp.

## 2. Arguments are validated

Every public function and option checks its arguments. A value of the wrong type, NaN, Infinity or a value out of
range throws instead of being converted or clamped silently:

- `TypeError` for a wrong type, `RangeError` for a value out of range or an unknown name.
- The message names the function and the argument, for example
  `imgui.sliderFloat: argument "max" must be a finite number` or
  `imgui.createWindow: argument "options.fps" must be between 15 and 120, got 200`.
- Numbers must be numbers: numeric strings such as `"10"` are no longer accepted.
- `null` or `undefined` for an optional argument still selects its default.

Options that used to be clamped and now throw when out of range:

| Option | Range |
| --- | --- |
| `fps` | 15..120 |
| `collapsedFps` | 1..15 |
| `startupTimeout` | 1..15000 ms |
| `alpha`, `session.setAlpha`, button `alpha` / `setAlpha` | 0..1 |
| `flingFriction` | 0.5..30 |
| `longPressDuration` | 250..2000 ms |
| `fontSize` | 8..64 |
| `fonts[i].size` | 8..128 |
| `fonts` | at most 16 entries |
| `rotation` | 0, 90, 180 or 270 |
| `toast` / `statsOverlay` `backgroundAlpha` | 0..1 |

Colors accept four forms everywhere a color is taken (`textColored`, `pushStyleColor`, `setStyleColor`,
`colorButton`, `tableSetBgColor`, `colorU32`, draw lists, toasts, window shadows and floating buttons):

```javascript
ui.textColored(0xFFCC6633, "packed 0xAABBGGRR, as returned by imgui.colorU32");
ui.textColored("#3366ccff", "#rgb, #rgba, #rrggbb or #rrggbbaa");
ui.textColored([0.2, 0.4, 0.8, 1], "array, components 0..1");
ui.textColored({r: 0.2, g: 0.4, b: 0.8, a: 1}, "object");
ui.textColored(0.2, 0.4, 0.8, 1, "components as separate arguments");
```

Floating buttons: a number for `backgroundColor`, `borderColor` or `textColor` is now read as a packed Dear ImGui
color (0xAABBGGRR), like every other color, instead of an Android ARGB integer (0xAARRGGBB). Convert an Android
color with a hex string (`"#rrggbbaa"`) or swap the red and blue bytes.

## 3. Session and button fields are read-only

The fields of a session (`x`, `y`, `width`, `height`, `displayWidth`, `displayHeight`, `alpha`, `secure`,
`moreTouch`, `touchMode`, `touchable`, `interactiveRegionCount`, `collapsed`, `ready`, `closed`, `closeReason`,
`theme`, `appearance`, `mode`, `density`, ...) and of a floating button (`text`, `x`, `y`, `width`, `height`,
`alpha`, `secure`, `moreTouch`, `visible`, `touchable`, `closed`) are getters. Writing one throws `TypeError` in
strict mode and is ignored otherwise; before v1.12.0 the write changed the field without changing the window.
Use the setters:

| Instead of | Use |
| --- | --- |
| `session.x = 10` | `session.setPosition(10, null)` |
| `session.width = 300` | `session.setSize(300, null)` |
| `session.alpha = 0.5` | `session.setAlpha(0.5)` |
| `session.collapsed = true` | `session.collapse()` |
| `session.closed = true` | `session.close()` |
| `button.text = "Go"` | `button.setText("Go")` |
| `button.x = 10` | `button.setPosition(10, null)` |

`button.setPosition(x, y)` no longer takes a third `source` argument; its `onMoved` event reports `"api"`.
`session.theme` now also reflects `imgui.setTheme`.

## 4. Callbacks run on the script thread

Session events, floating button callbacks and dialog results now run on the script thread, the thread of the
render callback, instead of the Android UI thread that raised them. They no longer race with the frame callback,
and blocking calls such as `sleep` no longer throw there; they still freeze the window while they block. See
[THREADING.md](THREADING.md) for the thread table and the background-task pattern.

Other event changes:

- Dragging the window reports `moved` with `source: "drag"` (before: `"api"`).
- An event raised on the UI thread is posted to the script thread and runs between two frames, not while a frame
  is being built.
