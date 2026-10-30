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
