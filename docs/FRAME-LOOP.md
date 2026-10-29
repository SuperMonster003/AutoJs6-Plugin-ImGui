# Frame loop and input handoff

This document records the P5 scheduling evaluation and the runtime decision used by v1.7.0, and the R8 evaluation
of an independent render thread (2026-11).

## Current frame path

The JavaScript engine owns the immediate-mode UI callback and the native ImGui frame:

1. A deadline-compensated `setTimeout` wakes the AutoJs6 script thread.
2. `ImGuiPluginConnection.newFrame()` acquires the single native-context lock.
3. The renderer drains the lock-free input FIFO into Dear ImGui IO.
4. `ImGui::NewFrame()` starts the frame.
5. The script callback and bundled high-level components build the UI immediately.
6. `render()` submits draw data, swaps buffers, snapshots capture state, and releases the lock.
7. Post-frame window/IME state is updated and the next absolute deadline is scheduled.

The scheduler advances from the previous deadline instead of waiting a full interval after rendering.
This prevents JavaScript and GPU work from being added to every frame period. A missed deadline greater
than one interval resets the schedule rather than issuing an unbounded burst of catch-up frames. Collapsed
windows switch to their independent `collapsedFps` deadline.

## Choreographer evaluation

`Choreographer` aligns callbacks with Android display vsync, but its callback runs on the thread whose
`Looper` owns the instance—normally the Android UI thread. AutoJs6 Rhino values, closures, and script
runtime state are owned by the script engine thread. Calling the render closure directly from a
`Choreographer.FrameCallback` would therefore cross the engine boundary and is not safe.

Posting from `Choreographer` back to the script engine would only be useful if the host exposed a stable,
low-latency engine-thread dispatcher. The current plugin API does not provide that contract. A UI-thread
callback followed by an ordinary timer hop would add another queue without guaranteeing that the script
starts before the next vsync.

Decision for v1.7.0: keep the script-thread timer, compensate against absolute deadlines, and do not run
Rhino callbacks on the UI thread. Revisit direct vsync alignment when AutoJs6 provides an engine-owned
frame dispatcher or timestamped frame callback.

## Render/script separation evaluation

Separating script UI construction from rendering would require a command buffer containing every widget,
style stack operation, draw-list command, callback boundary, and mutable reference update. Immediate return
values such as `button()`, `begin()`, hover state, popup visibility, and table selection make that buffer a
two-way protocol rather than a simple display list.

Potential benefits are shorter native lock ownership and the ability to render the previous command buffer
on a dedicated thread. The costs are one-frame interaction latency, serialization/allocation pressure,
complex lifetime rules for textures/fonts/refs, and a second API execution model that can diverge from Dear
ImGui semantics.

Decision for v1.7.0: retain same-thread immediate mode. The new input FIFO removes the measurable UI-thread
lock wait without changing widget semantics. Before command buffering is reconsidered, collect frame-time
traces showing that script construction—not GPU submission or user code—is the dominant bottleneck.

## Input queue contract

- Producers: Surface touch listener, IME proxy, key injection, and wheel/fling input.
- Consumer: the script/render thread immediately before `nativeNewFrame()`.
- Ordering: FIFO for all event kinds within the concurrent queue.
- Capacity: 2048 events, exposed as `imgui.Limits.InputQueueCapacity`.
- Overflow: discard the oldest event so the most recent pointer/key state is preserved.
- Lifecycle: initialization and shutdown replace the queue; delayed events from an old Surface cannot leak
  into a new native context.
- Synchronization: producers use `ConcurrentLinkedQueue` and atomics and never acquire `NATIVE_LOCK`.

The unit suite covers mixed-event FIFO ordering, bounded overflow, lifecycle reset, and concurrent
multi-producer delivery. The connected instrumentation test covers the queue-integrated native lifecycle.

## Independent render thread evaluation (2026-11)

R8 revisits the render/script separation above with a working prototype and device measurements. The prototype is
not merged; the series is kept as `docs/prototypes/render-thread.patch` (base commit `9c1b366`, plugin v1.11.0) and
applies on a scratch branch at that commit with `git am --empty=drop docs/prototypes/render-thread.patch`.

### Motivation

Every step of a frame runs on the script thread. A render callback that blocks (a `sleep`, a synchronous HTTP
request, a long file or image operation) stops presentation and visible touch feedback for the whole call, because
nothing else draws the window. The native lock is also held from `newFrame()` to `render()`, so UI-thread work that
needs native state waits for the callback. The evaluation asks whether a dedicated render thread shortens frames or
touch latency, whether it keeps the window responsive while the callback blocks, and what it costs in threads, memory
and API semantics.

### Prototype design

The patch series has three parts:

- Probe (patch 1): native frame statistics and MotionEvent times, read by the measurement script through
  `ui._renderStats()` and `ui._lastReleaseEventNanos()`. It does not change the frame path; a build of patch 1 is the
  "current code" column below.
- Render thread (patches 2 and 4): `createWindow({renderThread: "off" | "snapshot" | "replay"})`, selected before
  `init`. Both new modes start one thread, `ImGuiRender`, at the first frame and join it when the window closes.
  `"off"` keeps the current path.
- Measurement script (patch 3, adjusted in patches 4 to 7): `tools/device_r8_render_thread.py`. It prints only
  PASS / FAIL and measured values; `--table` prints the comparison below from the saved summaries.

**snapshot** keeps immediate mode on the script thread. The script builds the frame as before, but on a pbuffer
context that shares objects with the window context. After `ImGui::Render()` it uploads textures, copies `ImDrawData`
into a three-slot latest-wins mailbox guarded by a GPU fence, and returns. The render thread owns the window surface,
draws the newest copy and swaps. Every API keeps its semantics because Dear ImGui still runs where the script runs;
only submission and the swap move.

**replay** moves Dear ImGui itself to the render thread. The script records a subset of calls (`setNextWindowPos`,
`setNextWindowSize`, `begin`, `end`, `text`, `button`, `checkbox`, `sliderFloat`, `sameLine`, `separator`); any other
call throws. The render thread runs `NewFrame()` at the window fps with live input (the UI thread hands touches
directly to it, bypassing the input FIFO and the native lock), executes the newest recording, and stores widget
results (clicks, edited values, window visibility) in a table keyed by widget label. The next script frame receives
them as return values and reference updates. Hover and capture queries answer from the last replayed frame.

Prototype size on top of the probe: 856 changed lines in `ImGuiBridge.cpp` and 24 in Java and `index.js`. Replay
records 10 of the 459 public functions.

### Measurements

Device 968e9f18 (Xiaomi 23046RP50C, Android 15, AutoJs6 6.8.0 debug build 5935); arm64 debug builds of patch 1
(current code) and patch 4 (prototype); the same script and window for every column. The window is 1200 x 1300 px
with a slider and a button. Phases:

- light / heavy: 5 s each; the heavy window adds 300 text lines.
- touch: 3 slider swipes and 5 button taps through `adb shell input`. Touch-to-present runs from the MotionEvent time
  to the first present after it; touch-to-script runs from the release to the script frame in which `button()`
  returned `true`.
- `sleep(500)`: the callback sleeps 500 ms once per second while the slider is swiped for about 4 s.
- threads and memory: `/proc` task count and `dumpsys meminfo` (PSS, graphics, native heap) before the window, while
  it is open and after it closed.

Every cell is the median of three runs (each run reports its own percentiles). Times are in ms.

| metric | current code | prototype off | snapshot | replay |
|---|---|---|---|---|
| light: present fps | 58.7 | 58.7 | 58.7 | 60.0 |
| light: frame interval p50 / p95 | 16.9 / 20.5 | 17.0 / 21.2 | 17.0 / 20.0 | 16.7 / 17.7 |
| light: script build p50 / p95 | 6.8 / 8.1 | 6.7 / 7.9 | 7.0 / 8.3 | 6.2 / 7.6 |
| light: script submit p50 / p95 | 1.9 / 2.4 | 1.9 / 2.4 | 0.2 / 0.3 | 0.0 / 0.0 |
| heavy: present fps | 58.2 | 58.5 | 58.4 | 60.0 |
| heavy: frame interval p50 / p95 | 17.0 / 22.1 | 17.1 / 21.7 | 17.1 / 21.4 | 16.6 / 17.7 |
| heavy: script build p50 / p95 | 11.3 / 13.8 | 11.3 / 13.7 | 12.1 / 14.7 | 11.9 / 13.7 |
| heavy: script submit p50 / p95 | 0.8 / 1.0 | 0.8 / 1.0 | 0.1 / 0.1 | 0.0 / 0.1 |
| touch-to-present p50 / p95 | 18.1 / 25.8 | 17.8 / 24.8 | 17.9 / 25.2 | 16.9 / 23.1 |
| touch-to-script p50 / p95 | 33.0 / 53.9 | 40.3 / 44.0 | 35.5 / 52.9 | 41.7 / 65.4 |
| `sleep(500)`: presents inside 5 sleeps | 0 | 0 | 0 | 138 |
| `sleep(500)`: max present gap | 519.4 | 519.0 | 519.0 | 18.8 |
| `sleep(500)`: touch-to-present p95 / max | 503.4 / 527.8 | 506.3 / 529.6 | 504.1 / 528.6 | 23.1 / 24.6 |
| `ImGuiRender` threads open / closed | 0 / 0 | 0 / 0 | 1 / 0 | 1 / 0 |
| process threads before / open / closed | 52 / 52 / 51 | 53 / 52 / 51 | 52 / 53 / 51 | 51 / 52 / 51 |
| PSS delta while open (KB) | 81227 | 80934 | 81867 | 81347 |
| graphics delta while open (KB) | 47992 | 47992 | 48316 | 48456 |
| native heap delta while open (KB) | 33156 | 32720 | 33632 | 33228 |

Build is the time from `NewFrame()` to the start of `render()` (the callback); submit is the script-thread time in
`render()` (current code: `ImGui::Render()`, draw and swap; snapshot: `ImGui::Render()`, texture upload and the
draw-data copy; replay: publishing the recording). All functional checks passed in every run: the clicks and slider
edits arrived, the render thread ran only in its mode and exited on close, and replay rejected an unsupported call.

Findings:

- Prototype off matches the current code within the run-to-run spread, so the prototype leaves the default path
  unchanged.
- Script construction is the cost driver: about 7 ms per frame for the light window and 11-12 ms for the heavy one,
  within 1 ms in every mode. In replay the script thread does not run Dear ImGui at all and still spends the same
  time, so the cost lies in the script and bridge calls themselves, which no render thread can move.
- Submission and the swap took 1.9 ms (light) and 0.8 ms (heavy) of script time. Snapshot reduces that to 0.1-0.2 ms
  and replay to under 0.1 ms. That is the whole throughput gain on offer, and both windows already present at
  58-59 fps.
- Pacing: replay presents from its own timer at 60.0 fps with a p95 interval of 17.7 ms; the script-paced modes reach
  58.2-58.7 fps with a p95 of 20-22 ms.
- Touch-to-present is 17-18 ms (p50) in every mode: the v1.7.0 input FIFO already keeps touches off the native lock.
- Touch-to-script is higher in replay (41.7 / 65.4 ms against 33.0-40.3 / 44.0-53.9) because a click is decided on
  the render thread before the next script frame reads it. With 5 taps per run the per-run p50 of the current code
  alone spreads over 31.9-38.4 ms, so the added delay is up to about one frame.
- `sleep(500)`: the current code, prototype off and snapshot present nothing during the sleep (the longest gap is
  about 519 ms, and a touch waits up to 528 ms to be drawn). Replay keeps presenting (138 presents in 5 sleeps,
  longest gap 19 ms) and draws touches within 25 ms; the script still receives the click or edit after it wakes.
- Threads: one `ImGuiRender` thread while the window is open and none after close; the process total varies by 1-2
  threads between samples because of the host. Memory: opening the window costs about 81 MB PSS (48 MB graphics,
  33 MB native heap) in every mode; the medians differ by less than 1 MB, inside the run-to-run spread.

### Compatibility and risks

snapshot:

- API semantics are unchanged, but the gain is 1-2 ms of script time per frame, and the freeze, the one difference
  users can see, remains.
- It adds a second EGL context and a pbuffer surface that share objects with the window context. That is a driver
  dependency to verify on every target (emulators, ColorOS, 16 KB devices); the prototype ran on one device.
- Each frame copies the vertex and index buffers, and texture deletion has to wait until no mailbox slot still
  references the texture.

replay:

- `button()`, `begin()`, `isItemHovered()`, popups, trees, combos, tables (sort specs, selection), text input
  (callbacks, IME), drag and drop and layout queries (`calcTextSize`, cursor and content-region queries) return values
  the script uses in the same frame. In replay each needs a recorded form, a result channel and a staleness rule, and
  layout queries can only answer from the previous frame. The prototype keys results by label; matching Dear ImGui
  identity would also require recording the ID stack (`pushId`, loops with repeated labels).
- Script writes and user edits race. The prototype lets an edit made on the render thread win until a script frame
  has observed it; every mutable reference type would need such a rule.
- Draw lists, style stacks, fonts, textures and the bundled components in `index.js` would each need a recorded form
  and tests in both modes. Native entry points that touch the context outside a frame (style editing, fonts,
  textures, IME, key injection, settings) would have to be marshalled to the render thread, which changes the
  native-lock contract.
- Error handling changes: when a script frame throws, the render thread keeps showing the last recording, so the
  error event and debug mode from v1.11.0 would need a new definition of a failed frame.

### Recommendation

The render thread is not a 2.0 candidate, in either mode:

- Script construction is the measured cost driver, and neither mode removes it.
- snapshot changes nothing users can see.
- replay fixes the freeze only by becoming a second execution model for the whole API, the cost named in the v1.7.0
  evaluation above. The two modes took 856 changed native lines, replay still records only 10 functions, and every
  later API phase would have to be implemented and tested twice.

Same-thread immediate mode stays. Blocking in a render callback is treated as a usage error: R1.4 documents the thread
model in `docs/THREADING.md` and adds a background-task example (blocking work in `threads.start`, results rendered by
the frame callback). Replay is worth revisiting only for a narrow opt-in case, such as a status overlay with a fixed
widget set, if real scripts show that moving blocking work out of the callback is impractical.
