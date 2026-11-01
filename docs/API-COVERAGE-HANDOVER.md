# API coverage handover

State of the script API at v1.18.0, for the cards B, C and D of `docs/api-coverage/IMGUI-PLAN.md` in the AutoJs6 repository.
Where that plan quotes older numbers, the ones here apply. R7 was the last planned change to the API.

## Member totals

The global `imgui` has 588 names, listed in `ImguiNames.kt` of the host: 289 functions, 255 PascalCase aliases, 43 constant
groups (`density` among them) and `__pluginId`. The headings of a reference page are therefore 289 + 43 = 332, with the 255
aliases in one table; [ALIASES.md](ALIASES.md) is generated and can be converted.

| Family | Functions | Aliases |
| --- | ---: | ---: |
| Windows and lifecycle (`createWindow`, `launch*`, `closeWindow`, `addButtonEx`, `setTouchable`) | 13 | 13 |
| Components and dialogs (`logWindow`, `toast`, `alert`, `confirm`, `statsOverlay`, `dataTable`) | 8 | 8 |
| Frame containers (`begin` / `end` pairs, `table*`, popups, menus, trees, `listClipper`, multi-select scopes) | 48 | 48 |
| `with*` scopes | 22 | 3 |
| Widgets | 61 | 61 |
| Layout (`sameLine`, `separator`, `setNextWindow*`, `indent`) | 14 | 14 |
| Draw lists and textures | 9 | 9 |
| Drag and drop | 7 | 7 |
| Style, themes, fonts, ID stack | 18 | 18 |
| Input and events | 25 | 20 |
| Item and window queries | 36 | 35 |
| Debug and statistics windows | 7 | 7 |
| Value references (`bool`, `float`, `ref`, `floats`, `selectionStorage`) | 10 | 2 |
| Information and tools (`version`, `colorU32`, `icon`, `dp`, `px`, clipboard, examples) | 11 | 10 |
| Total | 289 | 255 |

The objects the API returns are not on `ImguiNames`. Their members, counted with `python tools/check_types.py --members`:

| Object | Own members | Notes |
| --- | ---: | --- |
| `DrawList` | 71 | Inside a frame only |
| `Session` | 66 | Plus the 4 of `DialogMethods`: `alert`, `confirm`, `singleChoice`, `multiChoice` |
| `FloatingButton` | 24 | |
| `DataTable` | 20 | Extends `Component` |
| `LogWindow` | 15 | Extends `Component` |
| `Component` | 11 | |
| `Dialog` | 8 | Extends `Component`; the controller of a dialog |
| `Texture` | 8 | |
| `StatsOverlay` | 7 | Extends `Component` |
| `Toast` | 7 | Extends `Component` |
| `SelectionStorage` | 6 | |
| `MultiSelectIO` | 5 | The result of `beginMultiSelect` / `endMultiSelect` |
| `DialogPromise` | 3 | A promise with a `controller` |

`plugin_exports.py` has to follow `extends`: the interfaces above inherit from `Component<Options>` and `DialogMethods`.
`ApiCore` (337 names, options and overload helpers included) and `ApiAliases` (255) are the module root, not returned objects.

## Declarations

- Path: `app/src/main/assets/types/imgui.d.ts`, 3245 lines, namespace `ImGui`, also in the APK at `assets/types/imgui.d.ts`.
- Precision, checked by `python tools/check_types.py` in CI: no `unknown`, no `...args: any[]`, no Options that extend
  `Record<string, any>`, a JSDoc comment on every member, and `tsc --strict` over `app/src/test/types/imgui-smoke.ts` plus all
  bundled examples. The smoke file has 10 `@ts-expect-error` lines: a misspelled option name, row key or event name does
  not compile.
- The file header defines the units, threads and errors. A member comment that starts with "Any time" needs no session,
  "While a session runs" needs no frame, and all other members of `ApiCore` must be called inside a frame.
- `any` remains on purpose in the default of the row type of `DataTable` (`Row = any`), the payload of drag and drop
  (`Data = any`), and the index signature of `CapturedImage`. `CapturedImage` stands in for the host's `ImageWrapper`, which
  the plugin does not declare; card C connects `capture` to the real class.
- Corrections of R7 that a copy of the old declarations would miss: `alert` resolves to a boolean, `multiChoice` to
  `number[] | null`, `onRowsChanged` is `(rows, action, row, index, table)`, `onExport` is `(text, entries, component)`,
  `Session.on` takes only the event names of `SessionEventMap`, and `ToastOptions.title` / `background` and
  `DataTableHeader.id` are gone because the runtime never read them.

## Documentation entry points

The index is [README.md](README.md). For the reference pages of card B the sources are, by subject:

| Subject | Source |
| --- | --- |
| Each member | The JSDoc comments of `imgui.d.ts` |
| Groups and concepts | The repository `README.md`, in 10 languages under `.readme/` |
| Sessions, root windows, focus, collapsing | [MULTI-WINDOW.md](MULTI-WINDOW.md) |
| Threads and callbacks | [THREADING.md](THREADING.md) |
| Limits, capture, display changes, CJK, multi-select | [LIMITS.md](LIMITS.md) |
| Aliases | [ALIASES.md](ALIASES.md) |
| Privileged mode | [PRIVILEGED-BACKEND.md](PRIVILEGED-BACKEND.md) |

## Examples

`app/src/main/assets/examples/index.json` lists 10 examples, each run with `imgui.runExample(id, options)` and read with
`imgui.getExampleSource(id)`: widget-overview, parameter-panel, log-hud, data-table-demo, theme-gallery, error-handling,
background-task, large-list, texture-refresh, multi-window. All of them type-check against `imgui.d.ts`, and
`tools/device_r7_check.py` runs each one on a device.

## Not applicable

- Node and Bun: `imgui` is Rhino only, decided by Q213 and Q214 of the host roadmap. The plugin has no Node or Bun entry point.
- `__pluginId` is internal and has no documentation.
- Docking and multi-viewport are not in the API: [DOCKING-MULTI-VIEWPORT.md](DOCKING-MULTI-VIEWPORT.md).
- A session of `launchPrivileged` ignores `addMousePosEvent` and the other injected events, has no pinch, and throws on
  `capture` inside a render callback; see [LIMITS.md](LIMITS.md) and [PRIVILEGED-BACKEND.md](PRIVILEGED-BACKEND.md).
- OpenGL ES 3.0 is required: see "Platform and device coverage" in [LIMITS.md](LIMITS.md), which also lists what has only
  been checked with injected input.
