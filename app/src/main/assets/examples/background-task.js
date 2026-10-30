// Background task: keep slow work off the script thread.
//
// - The render callback, session events and dialog results all run on the script thread, one after another, so a
//   blocking call there stalls every frame (docs/THREADING.md).
// - threads.start runs the slow part (counting primes here) on a worker thread. The worker never touches imgui or the
//   render state: it posts JSON messages to a thread-safe queue.
// - A setInterval on the script thread drains the queue into the state the render callback draws. The window keeps
//   drawing while the worker runs (at idleFps, 10 by default, once no input arrives for 3 s; enough for a progress
//   bar), and closing it cancels the worker and the timer.
(function (factory) {
    if (typeof module !== "undefined" && module.exports &&
        typeof options !== "undefined" && options.__imguiExampleLoader === true
    ) {
        module.exports = factory;
        return;
    }
    factory(imgui, {});
})(function (imgui, options) {
    options = options || {};

    var controllerOpen = imgui.ref(true);
    var upperBound = imgui.ref(200000);
    var inbox = new java.util.concurrent.ConcurrentLinkedQueue();
    var cancelFlag = null;
    var taskId = 0;
    var frames = 0;
    var task = {running: false, progress: 0, primes: 0, elapsedMs: 0, status: "idle"};

    function isPrime(value) {
        if (value < 4) {
            return value > 1;
        }
        if (value % 2 === 0) {
            return false;
        }
        for (var divisor = 3; divisor * divisor <= value; divisor += 2) {
            if (value % divisor === 0) {
                return false;
            }
        }
        return true;
    }

    function startTask(limit) {
        cancelTask();
        var id = ++taskId;
        var cancelled = new java.util.concurrent.atomic.AtomicBoolean(false);
        cancelFlag = cancelled;
        task = {running: true, progress: 0, primes: 0, elapsedMs: 0, status: "running"};
        threads.start(function () {
            var startedAt = Date.now();
            var count = 0;
            for (var value = 2; value <= limit; value += 1) {
                if (isPrime(value)) {
                    count += 1;
                }
                if (value % 5000 === 0) {
                    if (cancelled.get()) {
                        return;
                    }
                    inbox.offer(JSON.stringify({id: id, type: "progress", progress: value / limit, primes: count}));
                }
            }
            inbox.offer(JSON.stringify({id: id, type: "done", primes: count, elapsedMs: Date.now() - startedAt}));
        });
    }

    function cancelTask() {
        if (cancelFlag != null) {
            cancelFlag.set(true);
            cancelFlag = null;
        }
        if (task.running) {
            task.running = false;
            task.status = "cancelled";
        }
    }

    // Runs on the script thread, like the render callback, so it may change the render state freely.
    var pump = setInterval(function () {
        var message;
        while ((message = inbox.poll()) != null) {
            var update = JSON.parse(String(message));
            if (update.id !== taskId || !task.running) {
                continue;
            }
            task.primes = update.primes;
            if (update.type === "progress") {
                task.progress = update.progress;
            } else {
                task.progress = 1;
                task.elapsedMs = update.elapsedMs;
                task.running = false;
                task.status = "done";
                cancelFlag = null;
            }
        }
    }, 100);

    var launch = options.activity === true ? imgui.launch : imgui.launchFloaty;
    var session = launch(function (ui, window) {
        frames += 1;
        ui.setNextWindowPos(ui.dp(14), ui.dp(14), ui.Cond.FirstUseEver);
        ui.setNextWindowSize(ui.dp(380), ui.dp(280), ui.Cond.FirstUseEver);
        ui.withWindow("Background Task", controllerOpen, 0, function () {
            ui.textWrapped("A worker thread counts the primes; this window keeps drawing while it runs.");
            ui.sliderInt("Upper bound", upperBound, 50000, 2000000);
            if (ui.button(task.running ? "Restart" : "Start")) {
                startTask(upperBound.value);
            }
            ui.sameLine();
            if (ui.button("Cancel")) {
                cancelTask();
            }
            ui.progressBar(task.progress, -1, 0, Math.round(task.progress * 100) + "%");
            ui.text("Status: " + task.status);
            ui.text("Primes found: " + task.primes);
            if (task.status === "done") {
                ui.text("Elapsed: " + task.elapsedMs + " ms");
            }
            ui.textDisabled("Frames drawn: " + frames);
            if (ui.button("Close")) {
                window.close("example-closed");
            }
        });

        if (!controllerOpen.value) {
            window.close("example-window-closed");
        }
    }, {
        width: numberOption(options.width, 420),
        height: numberOption(options.height, 320),
        x: numberOption(options.x, 6),
        y: numberOption(options.y, 24),
        fps: numberOption(options.fps, 60),
        theme: options.theme || imgui.Themes.ModernDark,
        touchMode: imgui.TouchMode.Auto,
        contentAutoResize: false,
        collapseButton: true
    });

    session.on("closed", function () {
        cancelTask();
        clearInterval(pump);
    });

    function numberOption(value, fallback) {
        var result = Number(value);
        return isFinite(result) ? result : fallback;
    }

    var autoCloseMs = Math.max(0, numberOption(options.autoCloseMs, 0));
    if (autoCloseMs > 0) {
        setTimeout(function () {
            if (!session.closed) session.close("example-timeout");
        }, autoCloseMs);
    }
    if (options.autoStart === true) {
        startTask(upperBound.value);
    }
    return session;
});
