# Runtime limits

The limits below protect JNI local-reference use, transient allocations, and renderer responsiveness. The
public values are available from `imgui.Limits`; callers should use those values instead of duplicating
numeric literals.

| Area | Public limit | Behavior | Configuration decision |
| --- | ---: | --- | --- |
| `inputText` / `inputTextMultiline` buffer | 65,536 bytes | A requested capacity above the limit throws `RangeError`; native code enforces the same ceiling. | Per-call capacity remains configurable from 2 bytes through 64 KiB. Raising the hard ceiling is intentionally not a session option because every active edit allocates a contiguous native buffer. |
| `combo` / `listBox` items | 512 items | More than 512 items throws `RangeError` in JavaScript and `IllegalArgumentException` at JNI defense-in-depth. No silent truncation occurs. | The hard ceiling remains fixed. Large data sets should use `beginCombo` plus `listClipper` and `selectable` rows (see below), filtering, or paging. Passing thousands of Java strings across JNI per frame is not a useful configuration target. |
| Input FIFO | 2,048 events | Producers discard the oldest event on overflow; the renderer drains pending input before the next frame. | Fixed per native session. The value is sized to absorb bursts while bounding retained Java objects. |
| Additional fonts | 16 fonts | `createWindow({fonts})` rejects larger arrays. | Fixed because every font expands the atlas and increases initialization/GPU memory. |
| Draw-list points | 4,096 points per polyline or filled polygon call | JNI rejects larger flattened point arrays. | Split unusually large paths into multiple draw calls. |
| Draw-list arcs | 16 turns per `pathArcTo` / `pathArcToFast` call | A larger sweep throws `RangeError`. | Fixed: a path is built point by point, so a stray angle would otherwise exhaust the memory. |
| Drag-and-drop payload | 65,536 bytes of JSON, `imgui.Limits.DragDropPayloadMaxBytes`; type of 32 bytes | A larger payload or type throws `RangeError`. | Fixed: the payload is serialized and copied each frame of a drag. Pass an index or a key instead of a large object. |
| Encoded texture source | 128 MiB | Java rejects larger encoded inputs before decode. | Fixed safety ceiling. |
| Decoded texture area | 32 megapixels | Java rejects larger bitmaps before upload. | Fixed safety ceiling; downsample source images before creating textures. |

## Text capacity is measured in bytes

Dear ImGui stores text as UTF-8. `maxLength` is therefore a byte capacity including the terminating null,
not a JavaScript UTF-16 character count. A value of 256 can hold at most 255 ASCII characters and fewer
multi-byte CJK characters. Use a larger per-call capacity when necessary, up to
`imgui.Limits.InputTextMaxBytes`.

```javascript
var query = imgui.string("");
imgui.inputText("Query", query, Math.min(4096, imgui.Limits.InputTextMaxBytes));
```

## Clipboard

`getClipboardText` / `setClipboardText` and Ctrl+C / Ctrl+V in text fields use the Android clipboard, the same one as the
host's `getClip` / `setClip`. Writing always works. Reading is restricted by the system: from Android 10 only the
default input method and the application with the input focus can read it, so `getClipboardText` returns an empty or an
old value while the script runs in the background. An AutoJs6 Activity in the foreground, `imgui.launch`, or an overlay
window whose text field has the keyboard open have the focus; a plain overlay window does not. A value read earlier
stays valid, so read it while a window has the focus and keep it if it is needed later. The privileged renderer
(`launchPrivileged`) is a separate process without Android context: Ctrl+C / Ctrl+V in it stay inside that process.

## Injected pointer events

`addMousePosEvent(x, y)` and `addMouseButtonEvent(button, down)` queue events like a finger on the window: the same
input FIFO, in the order of the calls, taking effect from the next frame. Coordinates are frame pixels (`getMousePos`,
`getCursorPos`), not the dp of `createWindow`, and `button` takes the `MouseButton` values. Dear ImGui applies a change of
position and a change of button in separate frames, so one call per frame is not needed, but a press needs a frame at
that position first to count as a press on the item below it. The events reach only Dear ImGui: nothing happens on the
apps below the window, and a session in `launchPrivileged` ignores them.

## Window capture

`session.capture(options)` returns the pixels of the window as an AutoJs6 image, the class `images.read` returns, so
`images.save` and the rest of the `images` module take it. Its size is the window in px. `options.region` picks a part in
dp, like the window parameters, and is cut at the window; `width` and `height` default to the rest of the window.
`recycle()` frees the image at once, and the end of the script frees what is left. 20 captures in a row, each recycled,
left the PSS and the native heap unchanged on the test devices.

- Overlay and Activity windows are copied from the last presented frame with `PixelCopy`, waiting up to 5 s. This also
  works inside a render callback, where it returns the previous frame.
- A privileged window has no view to copy from: its last frame is drawn a second time and read with `glReadPixels`. This
  needs the draw data of a finished frame, so `capture` throws inside a render callback; call it between two frames, for
  example from `setTimeout(fn, 0)`.
- A window that is closed, collapsed or has not shown a frame yet throws.

## Display changes

The frame loop looks at the density and the system font size four times a second, and applies a change between two
frames.

- A new density scales the fonts and all style sizes by the ratio. Windows and floating buttons keep their size and
  position in dp, also with `responsive: false`, which only concerns the display size. Style sizes are whole pixels, so
  a value can end up a pixel or two smaller after a change and its way back (frame height 56 -> 83 -> 54 px).
- A new system font size scales the fonts only, because controls sized in dp do not follow it on Android either. It
  counts relative to the moment of `createWindow`: `fontSize` is dp, so the system font size at that moment has no
  effect.
- `configurationChanged` reports `density`, `oldDensity`, `fontScale` and `oldFontScale` besides the display size.
- Rotation keeps the dp position and size of a window, as long as the window fits the display.
- A window of `imgui.launch` lives in an AutoJs6 Activity, and Android recreates that Activity on a change of density or
  font size. The session then closes with `closeReason` `"configuration-changed"`, like a privileged session on a change
  of the display size; create the window again in the `closed` listener if needed.

## CJK coverage

The bundled `fonts/AutoJs6CjkFallback-Regular.otf` has 8,284 code points: everyday simplified Chinese, kana and CJK
punctuation. Traditional-only and rare characters (for example 龘, 镕, 喆, 堃) and Korean syllables are missing and show
as `?`.

| Block | Code points in the font |
| --- | ---: |
| CJK Unified Ideographs | 6,763 of 20,992: exactly GB 2312 |
| CJK Extension A, CJK Compatibility Ideographs, Hangul Syllables, beyond the BMP | 0 |
| CJK Symbols and Punctuation | 64 of 64 |
| Hiragana | 93 of 96 |
| Katakana | 96 of 96 |
| Bopomofo | 43 of 48 |
| Hangul Compatibility Jamo | 93 of 96 |
| Halfwidth and Fullwidth Forms | 224 of 240 |
| Basic Latin and Latin-1 | 191 of 224 |
| General Punctuation | 34 of 112 |

Without `fontPath` the runtime first tries the system CJK font files, but only static fonts work. Android 13 and older
ship `NotoSansCJK-Regular.ttc` as a static CFF font (44,776 code points). On Android 15 and 16 it is a variable CFF2 font
that the font loader (stb_truetype) cannot read, so the bundled subset is the default font there.

`createWindow({systemCjkFont: true})` adds a last source to every font: for characters in the CJK and Hangul blocks of
the BMP that the other sources lack, the Android text stack draws one glyph at a time, on first use, into the font atlas.
This reads any font the system has, including a font a vendor put in place of Noto, and picks the regional forms of the
device language. No font file stays in memory: with the window open the native heap differed by 0.8 MB on a Xiaomi
23046RP50C (Android 15) and by less than the noise of the measurement on a Sony G8441 (Android 9). A device without CJK
system fonts keeps the bundled subset. Characters beyond the BMP stay out of reach, because `ImWchar` has 16 bits here.

## Font scale and pinch

`session.setFontScale(scale)` sets the scale of all text, 0.5 to 3, default 1, from the next frame on (Dear ImGui's
`style.FontScaleMain`). `session.fontScale` reads the scale in use and the `fontScaleChanged` event reports `scale`,
`oldScale` and `source` (`"pinch"` or `"api"`). Only text and what is derived from it change size; padding and spacing
stay.

With `createWindow({pinchZoom: true})` two fingers on a window still scroll; once their distance has changed by 24 dp, the
gesture turns into a pinch until they lift, and the scale follows the ratio of the distances. Privileged windows have no
pinch, because their direct input follows one finger.

## Large selections

For a data source larger than `imgui.Limits.SelectionMaxItems`, open the popup with `beginCombo` (or use
`beginListBox` / a child window) and draw the rows with `listClipper` plus `selectable`. The clipper submits only
the rows that are visible, so the work per frame stays proportional to the window height instead of the item
count: `callback(start, end)` draws rows `start <= i < end`. Row labels can be built on demand from the index.

```javascript
var selected = 0;
// In the render callback:
if (ui.beginCombo("Row", "Row " + selected)) {
    // includeItems keeps the selected row submitted, so it can be scrolled into view when the popup opens.
    ui.listClipper(allItems.length, {includeItems: [selected]}, function (start, end) {
        for (var i = start; i < end; i += 1) {
            if (ui.selectable(allItems[i] + "##" + i, i === selected)) {
                selected = i;
            }
            if (i === selected && ui.isWindowAppearing()) {
                ui.setScrollHereY(0.5);
            }
        }
    });
    ui.endCombo();
}
```

`options.itemHeight` (px) skips measuring the first row when every row has the same known height, and indices in
`options.includeItems` outside the list are ignored. The bundled example `examples/large-list.js` draws 100,000
rows this way. Filtering before calling `combo` remains a good fit for searchable data:

```javascript
var visible = allItems.filter(matchesQuery).slice(0, imgui.Limits.SelectionMaxItems);
imgui.combo("Result", selectedIndex, visible);
```
