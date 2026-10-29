# Threading

Since v1.12.0 every script callback of an ImGui session runs on one thread: the script thread that called
`imgui.createWindow` (or `launch` / `launchFloaty`). The frame callback, session events, floating button
callbacks and dialog results run there one after another, never at the same time, so they can share the render
state without locks.

## Which thread runs what

| Callback | Thread | Notes |
| --- | --- | --- |
| Render callback `(ui, session) => {...}` | Script thread | Scheduled by a deadline-compensated timer, see [FRAME-LOOP.md](FRAME-LOOP.md). |
| High-level components (log window, toast, stats overlay, data table) | Script thread | Drawn inside the frame, after the render callback. |
| Session events (`session.on`, `options.events`, `options.onXxx`): `ready`, `surfaceRestored`, `moved`, `resized`, `configurationChanged`, `collapsed`, `expanded`, `closed`, `touchableChanged`, `moreTouchChanged`, `alphaChanged`, `secureChanged`, `error` | Script thread | An event raised on the Android UI thread (surface, drag, display change) is posted to the script thread and runs between two frames. An event raised on the script thread (for example by `session.setPosition`) runs at once. |
| Floating button `onClick` / `onMoved`, collapse button `onClick` | Script thread | Posted from the UI thread that received the touch. |
| Dialog results (`alert`, `confirm`, `singleChoice`, `multiChoice` promises and `onResult`) | Script thread | Resolved inside the frame that closes the dialog; promise reactions follow on the same thread. |
| Touch, IME and key input | Android UI thread | Not script callbacks: producers push events to the input FIFO, which the script thread drains before `NewFrame()`. |
| `threads.start(...)` | A worker thread | Your own work; it must not call `imgui` or touch the render state, see below. |

Before v1.12.0 session events and floating button callbacks ran on the thread that raised them, often the UI thread.
There a blocking call such as `sleep` throws, and a listener could race with the frame callback.

## Do not block in callbacks

A callback that blocks stops the whole session: no frame is drawn, no input is handled and no other event runs
until it returns. `sleep(300)` in a listener is legal (the script thread may block), but the window freezes for
300 ms. Keep callbacks short:

- Change state that the next frame reads, then return.
- Use `setTimeout` / `setInterval` for delays; they run on the script thread too.
- Move slow work (network, files, image processing, long loops) to a worker thread.

## Background tasks

A worker started with `threads.start` runs in parallel with the frames. It must not call `imgui` functions,
change refs, or change objects the render callback reads. Pass results through a thread-safe queue and apply
them on the script thread:

```javascript
var inbox = new java.util.concurrent.ConcurrentLinkedQueue();
var state = {progress: 0, done: false};

threads.start(function () {
    for (var step = 1; step <= 100; step += 1) {
        doSlowWork(step);
        inbox.offer(JSON.stringify({progress: step / 100}));
    }
    inbox.offer(JSON.stringify({done: true}));
});

// Runs on the script thread, like the render callback.
var pump = setInterval(function () {
    var message;
    while ((message = inbox.poll()) != null) {
        var update = JSON.parse(String(message));
        if (update.done) {
            state.done = true;
        } else {
            state.progress = update.progress;
        }
    }
}, 100);

var session = imgui.createWindow(function (ui) {
    ui.withWindow("Task", null, 0, function () {
        ui.progressBar(state.progress);
        ui.text(state.done ? "Done" : "Working...");
    });
});
session.on("closed", function () {
    clearInterval(pump);
});
```

The bundled example `background-task` (`imgui.runExample("background-task")`) adds cancellation with an
`AtomicBoolean` and ignores messages from a cancelled task. To cancel a worker, let it check a flag; do not
interrupt a thread that may be inside a Java call.

## When the script thread has no event loop

The events above are posted through `events.emitter(thread)` of the thread that created the window. If the
engine cannot create that emitter, callbacks run on the thread that raised them, as before v1.12.0. This does not
happen in AutoJs6 scripts; it is a fallback for embedding without the AutoJs6 runtime.
