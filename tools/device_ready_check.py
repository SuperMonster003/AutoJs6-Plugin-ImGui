#!/usr/bin/env python3
"""Checks on a device that a "ready" listener added after the event still gets it once (AutoJs6 Q219 (b)).

Usage: py -3.12 -I tools/device_ready_check.py -s SERIAL [--timeout 60] [--keep]

Needs AutoJs6 (debug or release, with the `imgui` module) and a build of the plugin with this change installed, enabled and
trusted, the overlay permission for AutoJs6, the screen on and unlocked. Pushes one script, runs it through RunIntentActivity
and prints one line per check, PASS / FAIL with the key values. The tool never touches the screen.

- option: a listener of the onReady option runs once.
- after-return: a listener added right after createWindow returned runs once, on the thread of the render callback, with the
  event of the session. The surface comes on the UI thread, so this is the path of a real window.
- posted: a listener added while the session is ready has not run when on returned, and runs once after that.
- once: once runs its listener, and a second wait does not run it again.
- once-session: a listener of once gets the session as its second argument, like a listener of on (AutoJs6 Q236 (a)).
- off: off right after on cancels the delivery.
- closed: a closed session delivers nothing.
"""

from __future__ import annotations

import argparse
import pathlib
import queue
import subprocess
import sys
import threading
import time

DEVICE_DIR = "/sdcard/Download/aj6-imgui-ready"
RUN_ACTIVITY = "org.autojs.autojs.external.open.RunIntentActivity"
PACKAGE = "org.autojs.autojs6"
MARK = "AJ6READY"

SCRIPT = r"""
var MARK = 'AJ6READY';
var failed = 0;

function report(name, ok, detail) {
    if (!ok) failed++;
    console.log(MARK + ' ' + name + ' ' + (ok ? 'PASS' : 'FAIL') + ' ' + detail);
}

var option = 0;
var late = 0;
var lateEvent = null;
var lateSession = null;
var lateThread = null;
var renderThread = null;
var frames = 0;

var session = imgui.createWindow(function (ui) {
    frames++;
    if (renderThread == null) renderThread = threads.currentThread();
    ui.withWindow('Q219', null, 0, function () { ui.text('frame ' + frames); });
}, {x: 100, y: 100, width: 200, height: 100, onReady: function () { option++; }});
var readyAtReturn = session.ready;
session.on('ready', function (event, eventSession) {
    late++;
    lateEvent = event;
    lateSession = eventSession;
    lateThread = threads.currentThread();
});

function waitFor(condition, millis, next) {
    var start = Date.now();
    var timer = setInterval(function () {
        if (condition() || Date.now() - start > millis) {
            clearInterval(timer);
            next();
        }
    }, 50);
}

function counter() {
    var listener = function () { listener.count++; };
    listener.count = 0;
    return listener;
}

waitFor(function () { return session.closed || (session.ready && frames >= 10); }, 15000, function () {
    report('option', option === 1, 'calls=' + option);
    report('after-return', late === 1 && lateEvent !== null && lateEvent.type === 'ready' && lateEvent.restored === false &&
        lateEvent.session === session && lateSession === session && lateThread === renderThread,
        'calls=' + late + ' readyAtReturn=' + readyAtReturn + ' sameThread=' + (lateThread === renderThread));
    var posted = counter();
    var returned = session.on('ready', posted) === session;
    var atReturn = posted.count;
    var once = counter();
    session.once('ready', once);
    var onceEvent = null;
    var onceSession = null;
    session.once('ready', function (event, eventSession) {
        onceEvent = event;
        onceSession = eventSession;
    });
    var removed = counter();
    session.on('ready', removed);
    session.off('ready', removed);
    setTimeout(function () {
        report('posted', returned && atReturn === 0 && posted.count === 1, 'atReturn=' + atReturn + ' calls=' + posted.count);
        var onceFirst = once.count;
        setTimeout(function () {
            report('once', onceFirst === 1 && once.count === 1, 'calls=' + once.count);
            report('once-session', onceEvent !== null && onceEvent.type === 'ready' && onceSession === session,
                'event=' + (onceEvent && onceEvent.type) + ' session=' + (onceSession === session));
            report('off', removed.count === 0, 'calls=' + removed.count);
            report('no-repeat', option === 1 && late === 1 && posted.count === 1, 'option=' + option + ' late=' + late + ' posted=' + posted.count);
            var closed = counter();
            session.on('ready', closed);
            session.close('check');
            setTimeout(function () {
                report('closed', closed.count === 0, 'calls=' + closed.count);
                console.log(MARK + ' done failed=' + failed);
                exit();
            }, 200);
        }, 300);
    }, 300);
});
"""


def adb(serial: str, *args: str, check: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["adb", "-s", serial, *args], capture_output=True, text=True, encoding="utf-8",
                          errors="replace", check=check)


def stream_console(serial: str) -> tuple[subprocess.Popen[str], queue.Queue[str]]:
    process = subprocess.Popen(["adb", "-s", serial, "logcat", "-v", "tag", "GlobalConsole:V", "*:S"],
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, encoding="utf-8",
                               errors="replace")
    lines: queue.Queue[str] = queue.Queue()

    def pump() -> None:
        assert process.stdout is not None
        for line in process.stdout:
            lines.put(line.rstrip())

    threading.Thread(target=pump, daemon=True).start()
    return process, lines


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-s", "--serial", required=True)
    parser.add_argument("--timeout", type=float, default=60)
    parser.add_argument("--keep", action="store_true", help="keep the pushed script and the local copy")
    args = parser.parse_args()
    if "mWakefulness=Awake" not in adb(args.serial, "shell", "dumpsys", "power").stdout:
        print("SETUP the screen is off: turn it on and unlock the device first")
        return 2

    local = pathlib.Path(__file__).resolve().parent / "device_ready_check.generated.js"
    local.write_text(SCRIPT, encoding="utf-8")
    remote = DEVICE_DIR + "/check.js"
    try:
        adb(args.serial, "shell", "mkdir", "-p", DEVICE_DIR, check=True)
        adb(args.serial, "push", str(local), remote, check=True)
        adb(args.serial, "logcat", "-c")
        log_process, log_lines = stream_console(args.serial)
        adb(args.serial, "shell", "am", "start", "-n", PACKAGE + "/" + RUN_ACTIVITY, "-e", "path", remote, check=True)
        results: list[str] = []
        deadline = time.time() + args.timeout
        done = False
        while time.time() < deadline and not done:
            try:
                raw = log_lines.get(timeout=0.2)
            except queue.Empty:
                continue
            at = raw.find(MARK + " ")
            if at < 0:
                continue
            line = raw[at + len(MARK) + 1:]
            results.append(line)
            print(line, flush=True)
            done = line.startswith("done")
        log_process.terminate()
        if not done:
            print("TIMEOUT after %.0f s (%d lines seen)" % (args.timeout, len(results)))
            return 1
        return 0 if not any(" FAIL" in line for line in results) else 1
    finally:
        if not args.keep:
            adb(args.serial, "shell", "rm", "-r", DEVICE_DIR)
            local.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
