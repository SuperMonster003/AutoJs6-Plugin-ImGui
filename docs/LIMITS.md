# Runtime limits

The limits below protect JNI local-reference use, transient allocations, and renderer responsiveness. The
public values are available from `imgui.Limits`; callers should use those values instead of duplicating
numeric literals.

| Area | Public limit | Behavior | Configuration decision |
| --- | ---: | --- | --- |
| `inputText` / `inputTextMultiline` buffer | 65,536 bytes | A requested capacity above the limit throws `RangeError`; native code enforces the same ceiling. | Per-call capacity remains configurable from 2 bytes through 64 KiB. Raising the hard ceiling is intentionally not a session option because every active edit allocates a contiguous native buffer. |
| `combo` / `listBox` items | 512 items | More than 512 items throws `RangeError` in JavaScript and `IllegalArgumentException` at JNI defense-in-depth. No silent truncation occurs. | The hard ceiling remains fixed. Large data sets should use filtering, paging, or `beginCombo` plus virtualized/selectable rows. Passing thousands of Java strings across JNI per frame is not a useful configuration target. |
| Input FIFO | 2,048 events | Producers discard the oldest event on overflow; the renderer drains pending input before the next frame. | Fixed per native session. The value is sized to absorb bursts while bounding retained Java objects. |
| Additional fonts | 16 fonts | `createWindow({fonts})` rejects larger arrays. | Fixed because every font expands the atlas and increases initialization/GPU memory. |
| Draw-list points | 4,096 points per polyline call | JNI rejects larger flattened point arrays. | Split unusually large paths into multiple draw calls. |
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

## Large selections

For a data source larger than `imgui.Limits.SelectionMaxItems`, filter before calling the widget or build a
custom popup. This keeps Java-to-native work proportional to visible/searchable data and avoids allocating
hundreds of JNI local string references every frame.

```javascript
var visible = allItems.filter(matchesQuery).slice(0, imgui.Limits.SelectionMaxItems);
imgui.combo("Result", selectedIndex, visible);
```
