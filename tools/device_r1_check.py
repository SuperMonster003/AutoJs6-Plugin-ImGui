#!/usr/bin/env python3
"""Checks the R1 (v1.12.0) behavior of the ImGui plugin on a device through the AutoJs6 global `imgui`.

Usage: py -3.12 -I tools/device_r1_check.py -s SERIAL [--timeout 180] [--keep]

Needs AutoJs6 (debug or release, with the `imgui` module) and the plugin installed, enabled and trusted, and the
overlay permission for AutoJs6. Pushes one script, runs it through RunIntentActivity and prints one line per check,
PASS / FAIL with the key values:

- units: imgui.density, dp / px and the Dp / Px aliases convert with the display density (an INFO line tells whether
  the host lists them before the plugin is loaded).
- validation: wrong arguments throw TypeError / RangeError naming the API and the argument, outside a frame, inside
  a frame and on a session method.
- colors: a packed number, [r, g, b, a], {r, g, b, a} and "#rrggbbaa" give the same colorU32 and draw with
  textColored, as the positional overload does.
- geometry: createWindow({x: 100, y: 100, width: 200, height: 100}) places a window of value * density px (+-1),
  the session fields read back dp, and setPosition / setSize take dp and report dp in moved / resized.
- read-only: writing session fields throws in strict mode and changes nothing otherwise.
- thread-<event>: ready, configurationChanged, resized, moved and error run on the thread of the render callback,
  where sleep(300) works; ready and configurationChanged are raised on the UI thread by the surface callbacks.
- examples: listExamples() has 7 entries and each one (background-task with its worker running) starts and closes
  on its timer.
"""

from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys
import time

DEVICE_DIR = "/sdcard/Download/aj6-imgui-r1"
RUN_ACTIVITY = "org.autojs.autojs.external.open.RunIntentActivity"
PACKAGE = "org.autojs.autojs6"
MARK = "AJ6R1"
LOG_TAIL = 50000

SCRIPT = r"""
var MARK = 'AJ6R1';
var failed = 0;
var mainThread = threads.currentThread();

function report(name, ok, detail) {
    console.log(MARK + ' ' + name + ' ' + (ok ? 'PASS' : 'FAIL') + ' ' + detail);
    if (!ok) failed++;
}

function section(name) {
    console.log(MARK + ' section ' + name);
}

function near(actual, expected, tolerance) {
    return typeof actual === 'number' && Math.abs(actual - expected) <= tolerance;
}

function round2(value) {
    return typeof value === 'number' ? Math.round(value * 100) / 100 : value;
}

// [label, error name, API, argument, call]; the message must start with 'imgui.<API>: argument "<argument>" '.
function checkErrors(name, cases) {
    var wrong = [];
    cases.forEach(function (c) {
        var actual;
        try {
            c[4]();
            actual = 'returned';
        } catch (e) {
            actual = String(e && e.name) + ':' + String(e && e.message);
        }
        var expected = c[1] + ':imgui.' + c[2] + ': argument "' + c[3] + '" ';
        if (actual.indexOf(expected) !== 0) wrong.push(c[0] + ' -> ' + actual.slice(0, 120));
    });
    report(name, wrong.length === 0, 'cases=' + cases.length + ' wrong=' + wrong.length + (wrong.length ? ' ' + wrong.join(' | ') : ''));
}

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

function later(ms, action) {
    setTimeout(action, ms);
}

steps.push(function () {
    section('units');
    // A host that lists dp / px / density (AutoJs6 25eac064a and later) has them before the plugin is loaded; an
    // older one forwards them once a listed member has loaded it.
    var listed = typeof imgui.dp === 'function';
    console.log(MARK + ' units-before-load INFO listed=' + listed);
    imgui.listExamples();
    var forwarded = typeof imgui.dp === 'function';
    if (forwarded) {
        var density = imgui.density;
        var ok = typeof density === 'number' && density > 0 && imgui.dp(10) === 10 * density &&
            near(imgui.px(imgui.dp(7)), 7, 1e-9) && imgui.Dp(4) === imgui.dp(4) && imgui.Px(10) === imgui.px(10);
        report('units', ok, 'density=' + density + ' dp(10)=' + imgui.dp(10) + ' px(100)=' + round2(imgui.px(100)));
    } else {
        // Hosts before 656f5cd05 neither list nor forward the members the plugin added after them.
        console.log(MARK + ' units SKIP the host has no imgui.dp (older than AutoJs6 656f5cd05)');
    }

    var outside = [
        ['createWindow', 'RangeError', 'createWindow', 'options.width', function () { imgui.createWindow(function () {}, {width: 0}); }],
        ['colorU32', 'TypeError', 'colorU32', 'color', function () { imgui.colorU32('zz'); }],
        ['setTheme', 'RangeError', 'setTheme', 'name', function () { imgui.setTheme('neon'); }]
    ];
    if (forwarded) outside.unshift(['dp', 'TypeError', 'dp', 'value', function () { imgui.dp('1'); }]);
    checkErrors('validation-outside-frame', outside);
    next();
});

steps.push(function () {
    section('geometry');
    var density = null;
    var frames = 0;
    var frameThread = null;
    var seen = {};
    var inFrame = null;

    function probe(name) {
        return function (event) {
            var entry = {thread: threads.currentThread(), source: event.source, x: event.x, y: event.y, width: event.width, height: event.height};
            var list = seen[name] || (seen[name] = []);
            if (list.length === 0) {
                var startedAt = Date.now();
                try {
                    sleep(300);
                    entry.slept = Date.now() - startedAt;
                } catch (e) {
                    entry.sleepError = String(e).slice(0, 120);
                }
            }
            list.push(entry);
        };
    }

    function frameChecks() {
        var cases = [
            ['sliderFloat', 'TypeError', 'sliderFloat', 'max', function () { imgui.sliderFloat('s', 0.5, 0, NaN); }],
            ['setNextWindowBgAlpha', 'RangeError', 'setNextWindowBgAlpha', 'alpha', function () { imgui.setNextWindowBgAlpha(2); }],
            ['checkbox', 'TypeError', 'checkbox', 'value', function () { imgui.checkbox('c', 'yes'); }],
            ['textColored', 'TypeError', 'textColored', 'color', function () { imgui.textColored('#12', 'x'); }],
            ['beginTable', 'RangeError', 'beginTable', 'columns', function () { imgui.beginTable('t', 0); }]
        ];
        var exact = '';
        try {
            imgui.sliderFloat('s', 0.5, 0, NaN);
        } catch (e) {
            exact = String(e.name) + ': ' + String(e.message);
        }
        var expected = 0xFFCC6633 | 0;
        var forms = [0xFFCC6633, '#3366ccff', [0.2, 0.4, 0.8, 1], {r: 0.2, g: 0.4, b: 0.8, a: 1}];
        var values = forms.map(function (form) { return imgui.colorU32(form); });
        var drawErrors = [];
        forms.concat([null]).forEach(function (form, index) {
            try {
                if (form === null) {
                    imgui.textColored(0.2, 0.4, 0.8, 1, 'positional');
                } else {
                    imgui.textColored(form, 'form ' + index);
                }
            } catch (e) {
                drawErrors.push(index + ':' + String(e).slice(0, 80));
            }
        });
        inFrame = {cases: cases, exact: exact, values: values, expected: expected,
            positional: imgui.colorU32(0.2, 0.4, 0.8, 1), drawErrors: drawErrors};
    }

    var errorThrown = false;
    var session = imgui.createWindow(function (ui) {
        frames++;
        if (frameThread == null) frameThread = threads.currentThread();
        if (frames === 40 && !errorThrown) {
            errorThrown = true;
            throw new Error('R1 error event');
        }
        ui.withWindow('R1', null, 0, function () {
            ui.text('frame ' + frames);
            if (frames === 5) frameChecks();
        });
    }, {
        x: 100, y: 100, width: 200, height: 100,
        onReady: probe('ready'),
        onConfigurationChanged: probe('configurationChanged'),
        onResized: probe('resized'),
        onMoved: probe('moved'),
        onError: probe('error')
    });

    waitFor(function () { return session.closed || (session.ready && frames >= 10 && inFrame != null); }, 15000, function () {
        density = session.density;
        if (inFrame == null) {
            report('validation-in-frame', false, 'no frame checks: frames=' + frames + ' ready=' + session.ready + ' closed=' + session.closed);
        } else {
            checkErrors('validation-in-frame', inFrame.cases);
            report('validation-message', inFrame.exact === 'TypeError: imgui.sliderFloat: argument "max" must be a finite number', inFrame.exact);
            var same = inFrame.values.every(function (v) { return v === inFrame.expected; }) && inFrame.positional === inFrame.expected;
            report('colors', same && inFrame.drawErrors.length === 0,
                'forms=4 colorU32=' + inFrame.values.join(',') + ' positional=' + inFrame.positional + ' drawErrors=' + inFrame.drawErrors.join(';'));
        }
        checkErrors('validation-session', [
            ['setSize', 'RangeError', 'Session.setSize', 'height', function () { session.setSize(10, 0); }],
            ['setPosition', 'TypeError', 'Session.setPosition', 'x', function () { session.setPosition('a', 0); }]
        ]);

        var px = null;
        var pxError = '';
        try {
            var w = session.window;
            px = [Number(w.getX()), Number(w.getY()), Number(w.getWidth()), Number(w.getHeight())];
        } catch (e) {
            pxError = String(e).slice(0, 120);
        }
        var surface = [Number(session.surfaceView.getWidth()), Number(session.surfaceView.getHeight())];
        var want = [100, 100, 200, 100];
        var pxOk = px != null && px.every(function (v, i) { return near(v, want[i] * density, 1); }) &&
            near(surface[0], 200 * density, 1) && near(surface[1], 100 * density, 1);
        report('geometry-px', pxOk, 'density=' + density + ' windowPx=' + (px ? px.join(',') : pxError) + ' surfacePx=' + surface.join(',') +
            ' expected=' + want.map(function (v) { return round2(v * density); }).join(','));
        var dp = [session.x, session.y, session.width, session.height];
        report('geometry-dp', dp.every(function (v, i) { return near(v, want[i], 1); }), 'session=' + dp.map(round2).join(','));

        var strict = ['x', 'y', 'width', 'height', 'ready', 'closed', 'closeReason', 'density'].filter(function (field) {
            return (function () {
                'use strict';
                try {
                    session[field] = 1;
                    return 'returned';
                } catch (e) {
                    return e.name;
                }
            })() !== 'TypeError';
        });
        var beforeX = session.x;
        session.x = 5;
        session.closed = true;
        report('read-only', strict.length === 0 && session.x === beforeX && session.closed === false,
            'strictNotThrowing=' + strict.join(',') + ' x=' + round2(session.x) + ' closed=' + session.closed);

        var movedBefore = (seen.moved || []).length;
        var resizedBefore = (seen.resized || []).length;
        session.setPosition(50, 60);
        session.setSize(220, 120);
        later(1500, function () {
            var moved = (seen.moved || []).slice(movedBefore);
            var resized = (seen.resized || []).slice(resizedBefore);
            var lastMoved = moved[moved.length - 1];
            var apiResize = resized.filter(function (e) { return e.source === 'api'; })[0];
            var px2 = null;
            try {
                px2 = [Number(session.window.getX()), Number(session.window.getY()), Number(session.window.getWidth()), Number(session.window.getHeight())];
            } catch (ignored) {
            }
            var want2 = [50, 60, 220, 120];
            report('set-geometry', lastMoved && lastMoved.source === 'api' && near(lastMoved.x, 50, 1) && near(lastMoved.y, 60, 1) &&
                apiResize && near(apiResize.width, 220, 1) && near(apiResize.height, 120, 1) &&
                px2 != null && px2.every(function (v, i) { return near(v, want2[i] * density, 1); }),
                'moved=' + (lastMoved ? [lastMoved.source, round2(lastMoved.x), round2(lastMoved.y)].join(',') : 'none') +
                ' resized=' + (apiResize ? [round2(apiResize.width), round2(apiResize.height)].join(',') : 'none') +
                ' windowPx=' + (px2 ? px2.join(',') : 'n/a'));

            waitFor(function () { return session.closed || (frames >= 60 && seen.error); }, 15000, function () {
                var sources = (seen.resized || []).map(function (e) { return e.source; });
                ['ready', 'configurationChanged', 'resized', 'moved', 'error'].forEach(function (name) {
                    var list = seen[name] || [];
                    var first = list[0];
                    var same = list.length > 0 && frameThread != null && list.every(function (e) { return e.thread.equals(frameThread); });
                    var sleptOk = first != null && !first.sleepError && first.slept >= 290;
                    report('thread-' + name, same && sleptOk,
                        'events=' + list.length + ' sameThread=' + same + ' slept=' + (first ? (first.sleepError || first.slept) : 'n/a') +
                        (name === 'resized' ? ' sources=' + sources.join(',') : ''));
                });
                report('frame-thread', frameThread != null && frameThread.equals(mainThread) && !session.closed && frames > 40,
                    'main=' + (frameThread != null && frameThread.equals(mainThread)) + ' frames=' + frames + ' closed=' + session.closed);
                session.close('done');
                report('closed', session.closed && session.closeReason === 'done', 'closeReason=' + session.closeReason);
                next();
            });
        });
    });
});

steps.push(function () {
    section('examples');
    var names = imgui.listExamples().map(function (e) { return String(e && e.name !== undefined ? e.name : e); });
    report('example-list', names.length === 7 && names.indexOf('background-task') >= 0, 'length=' + names.length);
    var results = [];
    function runNext() {
        var name = names.shift();
        if (!name) {
            var bad = results.filter(function (r) { return r[1] !== 'example-timeout'; });
            report('examples', results.length === 7 && bad.length === 0,
                'run=' + results.length + ' bad=' + bad.map(function (r) { return r.join('='); }).join(','));
            next();
            return;
        }
        var session;
        try {
            session = imgui.runExample(name, {autoCloseMs: 2500, autoStart: name === 'background-task'});
        } catch (e) {
            results.push([name, 'threw ' + String(e).slice(0, 80)]);
            runNext();
            return;
        }
        waitFor(function () { return session.closed; }, 10000, function () {
            results.push([name, String(session.closeReason)]);
            if (!session.closed) session.close('stuck');
            later(300, runNext);
        });
    }
    runNext();
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


def example_failures(lines: list[str]) -> int:
    """Callback failures printed while the examples ran (after the "section examples" marker)."""
    start = next((i for i, line in enumerate(lines) if line == MARK + " section examples"), None)
    if start is None:
        return -1
    words = ("Render callback failed", "listener failed", "Initialization failed")
    return sum(1 for line in lines[start:] if any(word in line for word in words))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-s", "--serial", required=True)
    parser.add_argument("--timeout", type=float, default=180)
    parser.add_argument("--keep", action="store_true", help="keep the pushed script and the local copy")
    args = parser.parse_args()

    local = pathlib.Path(__file__).resolve().parent / "device_r1_check.generated.js"
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
        printed = example_failures(console_lines(args.serial))
        print(f"example-console {'PASS' if printed == 0 else 'FAIL'} failures={printed}")
        failed = [line for line in seen if " FAIL " in line]
        return 0 if not failed and printed == 0 else 1
    finally:
        if not args.keep:
            adb(args.serial, "shell", "rm", "-r", DEVICE_DIR)
            local.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
