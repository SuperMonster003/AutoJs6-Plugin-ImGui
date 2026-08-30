# Frame loop and input handoff

This document records the P5 scheduling evaluation and the runtime decision used by v1.7.0.

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
