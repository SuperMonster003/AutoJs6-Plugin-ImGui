#!/usr/bin/env python3
"""Checks the R0 (v1.11.0) behavior of the ImGui plugin on a device through the AutoJs6 global `imgui`.

Usage: py -3.12 -I tools/device_r0_check.py -s SERIAL [--timeout 180] [--keep]

Needs AutoJs6 (debug or release, with the `imgui` module) and the plugin installed, enabled and trusted, and the
overlay permission for AutoJs6. Pushes one script, runs it through RunIntentActivity and prints one line per check,
PASS / FAIL with the key values:

- no-session: global session helpers (and a PascalCase alias) throw "imgui.<name>: no active session".
- render-error: without an "error" listener a throwing render callback closes the session with "render-error".
- error-listener: with one, frames go on, the events match the throwing frames (phase "render", rising frame
  numbers), and a run of the same error is printed once by console.error.
- event-error: a throwing "collapsed" listener emits an "error" event with phase "event".
- close-in-handler: the error handler may close the session.
- debug: a window left open is reported by console.warn ("Missing End()") with debug: true and not without it.
- plot: plotLines / plotHistogram accept valuesOffset and stride (the pixels are checked by the instrumented test
  ImGuiRenderInstrumentedTest.plotValuesOffsetAndStrideSelectTheSamples).
- example: runExample("error-handling") starts and closes on its timer.
"""

from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys
import time

DEVICE_DIR = "/sdcard/Download/aj6-imgui-r0"
RUN_ACTIVITY = "org.autojs.autojs.external.open.RunIntentActivity"
PACKAGE = "org.autojs.autojs6"
MARK = "AJ6R0"
LOG_TAIL = 50000

SCRIPT = r"""
var MARK = 'AJ6R0';
var failed = 0;

function report(name, ok, detail) {
    console.log(MARK + ' ' + name + ' ' + (ok ? 'PASS' : 'FAIL') + ' ' + detail);
    if (!ok) failed++;
}

function section(name) {
    console.log(MARK + ' section ' + name);
}

function messageOf(fn) {
    try {
        fn();
        return 'returned';
    } catch (e) {
        return String(e && e.message);
    }
}

// Runs the steps one after another; each step calls next() when its session is done.
var steps = [];
function next() {
    var step = steps.shift();
    if (!step) {
        console.log(MARK + ' done failed=' + failed);
        exit();
        return;
    }
    try {
        step();
    } catch (e) {
        report('step', false, String(e).slice(0, 200));
        next();
    }
}

function waitFor(condition, timeoutMs, done) {
    var waited = 0;
    var timer = setInterval(function () {
        waited += 100;
        var met = condition();
        if (met || waited >= timeoutMs) {
            clearInterval(timer);
            done(met);
        }
    }, 100);
}

var WINDOW = {width: 240, height: 160, x: 0, y: 200};

function windowOptions(extra) {
    var options = {};
    for (var key in WINDOW) options[key] = WINDOW[key];
    for (var name in extra) options[name] = extra[name];
    return options;
}

steps.push(function () {
    section('no-session');
    var calls = [
        ['setGlobalAlpha', function () { imgui.setGlobalAlpha(0.5); }],
        ['setTouchable', function () { imgui.SetTouchable(true); }],
        ['setSecure', function () { imgui.setSecure(true); }],
        ['getComponent', function () { imgui.getComponent('toast', 'none'); }],
        ['addButtonEx', function () { imgui.addButtonEx('B', function () {}); }]
    ];
    var wrong = calls.filter(function (call) {
        return messageOf(call[1]) !== 'imgui.' + call[0] + ': no active session';
    });
    report('no-session', wrong.length === 0, 'calls=' + calls.length + ' wrong=' + wrong.map(function (c) { return c[0]; }).join(','));
    next();
});

steps.push(function () {
    section('render-error');
    var frames = 0;
    var session = imgui.createWindow(function (ui) {
        frames++;
        if (frames === 3) throw new Error('R0 render-error');
        ui.withWindow('R0', null, 0, function () { ui.text('frame ' + frames); });
    }, windowOptions({}));
    waitFor(function () { return session.closed; }, 10000, function () {
        report('render-error', session.closed && session.closeReason === 'render-error' && frames === 3,
            'closed=' + session.closed + ' closeReason=' + session.closeReason + ' frames=' + frames);
        next();
    });
});

steps.push(function () {
    section('error-listener');
    var frames = 0;
    var thrown = 0;
    var events = [];
    var session = imgui.createWindow(function (ui) {
        frames++;
        if (frames >= 5 && frames <= 9) {
            thrown++;
            throw new Error('R0 repeated');
        }
        if (frames === 15) {
            thrown++;
            throw new Error('R0 single');
        }
        ui.withWindow('R0', null, 0, function () { ui.text('frame ' + frames); });
    }, windowOptions({
        onError: function (event) {
            events.push(event);
        }
    }));
    waitFor(function () { return session.closed || frames >= 40; }, 15000, function () {
        var closedEarly = session.closed;
        session.close('done');
        var phases = events.every(function (e) { return e.phase === 'render' && e.error instanceof Error && e.type === 'error'; });
        var rising = events.every(function (e, i) { return i === 0 || e.frame > events[i - 1].frame; });
        report('error-listener', !closedEarly && frames >= 40 && events.length === thrown && phases && rising,
            'frames=' + frames + ' thrown=' + thrown + ' events=' + events.length + ' phases=' + phases + ' rising=' + rising +
            ' frameNumbers=' + events.map(function (e) { return e.frame; }).join(','));
        next();
    });
});

steps.push(function () {
    section('event-error');
    var frames = 0;
    var events = [];
    var session = imgui.createWindow(function (ui) {
        frames++;
        ui.withWindow('R0', null, 0, function () { ui.text('frame ' + frames); });
    }, windowOptions({
        collapseButton: true,
        onError: function (event) { events.push(event); },
        onCollapsed: function () { throw new Error('R0 collapsed listener'); }
    }));
    waitFor(function () { return session.ready; }, 10000, function () {
        session.collapse();
        setTimeout(function () {
            session.expand();
            var event = events[0];
            report('event-error', events.length === 1 && event.phase === 'event' && event.event === 'collapsed' && !session.closed,
                'events=' + events.length + ' phase=' + (event && event.phase) + ' event=' + (event && event.event) + ' closed=' + session.closed);
            session.close('done');
            next();
        }, 500);
    });
});

steps.push(function () {
    section('close-in-handler');
    var frames = 0;
    var session = imgui.createWindow(function (ui) {
        frames++;
        if (frames === 4) throw new Error('R0 close in handler');
        ui.withWindow('R0', null, 0, function () { ui.text('frame ' + frames); });
    }, windowOptions({}));
    session.on('error', function () { session.close('handled'); });
    waitFor(function () { return session.closed; }, 10000, function () {
        report('close-in-handler', session.closed && session.closeReason === 'handled',
            'closed=' + session.closed + ' closeReason=' + session.closeReason + ' frames=' + frames);
        next();
    });
});

function leftOpen(name, debug) {
    return function () {
        section(name);
        var frames = 0;
        var session = imgui.createWindow(function (ui) {
            frames++;
            ui.withWindow('R0', null, 0, function () { ui.text('frame ' + frames); });
            if (frames === 3) {
                ui.begin('R0 left open');
                ui.text('no end()');
            }
            if (frames >= 15) session.close('done');
        }, windowOptions({debug: debug, width: 480, height: 360}));
        waitFor(function () { return session.closed; }, 10000, function () {
            report(name + '-session', session.closed && session.closeReason === 'done' && session.debug === debug,
                'frames=' + frames + ' closeReason=' + session.closeReason + ' debug=' + session.debug);
            next();
        });
    };
}
steps.push(leftOpen('plain', false));
steps.push(leftOpen('debug', true));

steps.push(function () {
    section('plot');
    var errors = [];
    var session = imgui.createWindow(function (ui) {
        try {
            ui.withWindow('R0', null, 0, function () {
                var values = [0, 9, 7, 1, 2, 8, 5, 3];
                ui.plotLines('##lines', values, {valuesOffset: 2, stride: 2, scaleMin: 0, scaleMax: 10});
                ui.PlotHistogram('##histogram', values, {offset: 2, stride: 2, scaleMin: 0, scaleMax: 10});
            });
        } catch (e) {
            errors.push(String(e));
        }
        session.close('done');
    }, windowOptions({}));
    waitFor(function () { return session.closed; }, 10000, function () {
        report('plot', session.closeReason === 'done' && errors.length === 0, 'closeReason=' + session.closeReason + ' errors=' + errors.join(';'));
        next();
    });
});

steps.push(function () {
    section('example');
    var session = imgui.runExample('error-handling', {autoCloseMs: 3000, width: 480, height: 360});
    waitFor(function () { return session.closed; }, 10000, function () {
        report('example', session.closed && session.closeReason === 'example-timeout' && session.debug === true,
            'closeReason=' + session.closeReason + ' debug=' + session.debug);
        report('no-session-after', messageOf(function () { imgui.setSecure(false); }) === 'imgui.setSecure: no active session', 'setSecure throws');
        next();
    });
});

next();
"""


def adb(serial: str, *args: str, check: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["adb", "-s", serial, *args], capture_output=True, text=True, encoding="utf-8",
                          errors="replace", check=check)


def console_lines(serial: str) -> list[str]:
    """The GlobalConsole messages of logcat in order, without the time and level prefix some devices add."""
    out = adb(serial, "logcat", "-d", "-t", str(LOG_TAIL)).stdout
    lines = []
    for line in out.splitlines():
        if "GlobalConsole: " not in line:
            continue
        text = line.split("GlobalConsole: ", 1)[1].rstrip()
        at = text.find(MARK + " ")
        lines.append(text[at:] if at >= 0 else text)
    return lines


def sections(lines: list[str]) -> dict[str, list[str]]:
    """The console messages after each "section <name>" marker, up to the next marker line."""
    result: dict[str, list[str]] = {}
    current = None
    for line in lines:
        if line.startswith(MARK + " section "):
            current = line[len(MARK + " section "):]
            result[current] = []
        elif line.startswith(MARK + " "):
            continue
        elif current is not None:
            result[current].append(line)
    return result


def console_checks(lines: list[str]) -> list[tuple[str, bool, str]]:
    output = sections(lines)

    def count(name: str, text: str) -> int:
        return sum(1 for line in output.get(name, []) if text in line)

    repeated = count("error-listener", "Render callback failed: Error: R0 repeated")
    single = count("error-listener", "Render callback failed: Error: R0 single")
    render_error = count("render-error", "Render callback failed: Error: R0 render-error")
    event_error = count("event-error", "Session 'collapsed' listener failed: Error: R0 collapsed listener")
    plain = count("plain", "Missing End()")
    debug = count("debug", "Missing End()")
    return [
        ("console-render-error", render_error == 1, f"printed={render_error}"),
        ("console-once", repeated == 1 and single == 1, f"repeated={repeated} single={single}"),
        ("console-event-error", event_error == 1, f"printed={event_error}"),
        ("debug-warning", debug >= 1 and plain == 0, f"debug={debug} plain={plain}"),
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-s", "--serial", required=True)
    parser.add_argument("--timeout", type=float, default=180)
    parser.add_argument("--keep", action="store_true", help="keep the pushed script and the local copy")
    args = parser.parse_args()

    local = pathlib.Path(__file__).resolve().parent / "device_r0_check.generated.js"
    local.write_text(SCRIPT, encoding="utf-8")
    remote = DEVICE_DIR + "/check.js"
    try:
        adb(args.serial, "shell", "mkdir", "-p", DEVICE_DIR, check=True)
        adb(args.serial, "push", str(local), remote, check=True)
        adb(args.serial, "logcat", "-c")
        adb(args.serial, "shell", "am", "start", "-n", PACKAGE + "/" + RUN_ACTIVITY, "-e", "path", remote, check=True)
        seen: list[str] = []
        deadline = time.time() + args.timeout
        done = False
        while time.time() < deadline and not done:
            time.sleep(1)
            for line in console_lines(args.serial):
                if not line.startswith(MARK + " ") or line.startswith(MARK + " section ") or line in seen:
                    continue
                seen.append(line)
                print(line[len(MARK) + 1:])
                if line.startswith(MARK + " done"):
                    done = True
        if not done:
            print("TIMEOUT after %.0f s (%d lines seen)" % (args.timeout, len(seen)))
            return 1
        results = console_checks(console_lines(args.serial))
        for name, ok, detail in results:
            print(f"{name} {'PASS' if ok else 'FAIL'} {detail}")
        failed = [line for line in seen if " FAIL " in line] + [name for name, ok, _ in results if not ok]
        return 0 if not failed else 1
    finally:
        if not args.keep:
            adb(args.serial, "shell", "rm", "-r", DEVICE_DIR)
            local.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
