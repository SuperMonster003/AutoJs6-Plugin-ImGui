#!/usr/bin/env python3
"""Checks the R7 (v1.18.0) behavior of the ImGui plugin on a device through the AutoJs6 global `imgui`.

Usage: py -3.12 -I tools/device_r7_check.py -s SERIAL [--only names,focus,collapse,panels,examples] [--timeout 180] [--keep]

Needs AutoJs6 (debug or release, with the `imgui` module) and the plugin installed, enabled and trusted, the overlay
permission for AutoJs6, the screen on and unlocked. Pushes one script, runs it through RunIntentActivity and prints one
line per check, PASS / FAIL / SKIP with the key values. Pointer input comes from the injection API, so the tool never
touches the screen. The new members are called on the API object of the render callback (`ui`): a host older than the R7
names does not list them on the global `imgui`, and names-global then reports a SKIP. `--only names,focus` is the short
group for a release package.

Sections (default: all):
- names: the four new names on the API object and on the global `imgui`, and the example list has 10 entries.
- focus: setNextWindowFocus gives the focus to a window behind another one and brings it to the front, a request in one
  frame does not stick, an injected tap on a button that asks for it works, a call outside a frame throws.
- collapse: setNextWindowCollapsed leaves only the title bar and brings the body back, the arrow still works after a
  request in one frame, Cond.Always in every frame overrules the arrow, Cond.Once in every frame applies once.
- panels: the buttons "Focus next" and "Collapse all" / "Expand all" of examples/multi-window.js, tapped with injected input.
- examples: each of the 10 examples through runExample, one line each with PASS / FAIL, the time for runExample to return
  and the time until it closed by its own timer.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import queue
import re
import subprocess
import sys
import threading
import time

DEVICE_DIR = "/sdcard/Download/aj6-imgui-r7"
RUN_ACTIVITY = "org.autojs.autojs.external.open.RunIntentActivity"
PACKAGE = "org.autojs.autojs6"
PLUGIN_PACKAGE = "io.github.supermonster003.autojs6.plugin.imgui"
MARK = "AJ6R7"
NATIVE_LOG_TAG = "AutoJs6-ImGui"
ALL_SECTIONS = ["names", "focus", "collapse", "panels", "examples"]

SCRIPT = r"""
var MARK = 'AJ6R7';
var ONLY = __ONLY__;
var failed = 0;

function wanted(name) {
    return ONLY.indexOf(name) >= 0;
}

function report(name, ok, detail) {
    console.log(MARK + ' ' + name + ' ' + (ok ? 'PASS' : 'FAIL') + ' ' + detail);
    if (!ok) failed++;
}

function skip(name, detail) {
    console.log(MARK + ' ' + name + ' SKIP ' + detail);
}

function section(name) {
    console.log(MARK + ' section ' + name);
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
        waited += 50;
        var met = condition();
        if (met || waited >= timeoutMs) {
            clearInterval(timer);
            done(met);
        }
    }, 50);
}

function later(ms, fn) {
    setTimeout(fn, ms);
}

function failureOf(fn) {
    try {
        fn();
        return '';
    } catch (e) {
        return String(e);
    }
}

function closeTo(a, b, tolerance) {
    return Math.abs(a - b) <= tolerance;
}

function alphaAt(session, x, y) {
    var image = session.capture();
    var alpha = colors.alpha(images.pixel(image, Math.round(x), Math.round(y)));
    image.recycle();
    return alpha;
}

function injectClick(api, x, y, done) {
    api.addMousePosEvent(x, y);
    later(100, function () {
        api.addMouseButtonEvent(api.MouseButton.Left, true);
        later(100, function () {
            api.addMouseButtonEvent(api.MouseButton.Left, false);
            later(200, done);
        });
    });
}

// The checks of one section run in order; each one calls done when it is over.
function runChecks(checks, finish) {
    function run() {
        var check = checks.shift();
        if (!check) {
            finish();
            return;
        }
        try {
            check(run);
        } catch (e) {
            report('check', false, String(e).slice(0, 200));
            run();
        }
    }
    run();
}

// The screen position of the next item: getCursorPos counts from the top left of the window.
function nextItemAt(ui) {
    var window = ui.getWindowPos();
    var cursor = ui.getCursorPos();
    return [Number(window[0]) + Number(cursor[0]), Number(window[1]) + Number(cursor[1])];
}

// The API object of a render callback: it has every member, also on hosts that do not list the new names.
var pluginApi = null;
steps.push(function () {
    var probe = imgui.launchFloaty(function (ui) { pluginApi = ui; }, {width: 40, height: 40, collapseButton: false});
    waitFor(function () { return pluginApi !== null; }, 10000, function (met) {
        report('first-frame', met, 'closed=' + probe.closed);
        probe.close('check-done');
        later(300, next);
    });
});

if (wanted('names')) {
    steps.push(function () {
        section('names');
        var names = ['setNextWindowFocus', 'SetNextWindowFocus', 'setNextWindowCollapsed', 'SetNextWindowCollapsed'];
        var missing = names.filter(function (name) { return typeof pluginApi[name] !== 'function'; });
        report('names', missing.length === 0, 'functions=' + (names.length - missing.length) + ' missing=' + missing.join(','));
        var onGlobal = names.filter(function (name) { return typeof imgui[name] === 'function'; }).length;
        if (onGlobal === names.length) {
            report('names-global', true, 'functions=' + onGlobal);
        } else {
            skip('names-global', 'functions=' + onGlobal + ' host older than the R7 names');
        }
        var total = imgui.listExamples().length;
        report('example-list', total === 10, 'length=' + total);
        next();
    });
}

function harnessWindow(name, frame) {
    return {
        name: name, frame: frame, other: null, focusNow: false, collapseNow: null, collapseEvery: null, condEvery: 0,
        focused: false, collapsed: false, hovered: false, position: null, size: null, button: null, presses: 0
    };
}

function drawHarnessWindow(ui, window) {
    var frame = window.frame;
    ui.setNextWindowPos(ui.dp(frame[0]), ui.dp(frame[1]), ui.Cond.FirstUseEver);
    ui.setNextWindowSize(ui.dp(frame[2]), ui.dp(frame[3]), ui.Cond.FirstUseEver);
    if (window.focusNow) {
        window.focusNow = false;
        ui.setNextWindowFocus();
    }
    if (window.collapseNow !== null) {
        ui.setNextWindowCollapsed(window.collapseNow);
        window.collapseNow = null;
    }
    if (window.collapseEvery !== null) {
        ui.setNextWindowCollapsed(window.collapseEvery, window.condEvery);
    }
    var visible = ui.begin(window.name);
    window.focused = ui.isWindowFocused();
    window.collapsed = ui.isWindowCollapsed();
    window.hovered = ui.isWindowHovered();
    window.position = ui.getWindowPos();
    window.size = ui.getWindowSize();
    if (visible) {
        window.button = nextItemAt(ui);
        if (ui.button('Focus other') && window.other) {
            window.presses += 1;
            window.other.focusNow = true;
        }
    }
    ui.end();
}

// Two windows that overlap, Beta in front, and a third one that starts when a check asks for it.
function openHarness() {
    var harness = {
        alpha: harnessWindow('Alpha', [10, 10, 200, 160]),
        beta: harnessWindow('Beta', [120, 110, 200, 160]),
        gamma: harnessWindow('Gamma', [10, 290, 200, 100]),
        gammaActive: false,
        frameHeight: 0,
        errors: []
    };
    harness.alpha.other = harness.beta;
    harness.beta.other = harness.alpha;
    harness.session = imgui.launchFloaty(function (ui) {
        harness.frameHeight = ui.getFrameHeight();
        drawHarnessWindow(ui, harness.alpha);
        drawHarnessWindow(ui, harness.beta);
        if (harness.gammaActive) {
            drawHarnessWindow(ui, harness.gamma);
        }
    }, {
        width: 340, height: 400, x: 6, y: 24, fps: 60, touchMode: imgui.TouchMode.Auto, contentAutoResize: false,
        collapseButton: false
    });
    harness.session.on('error', function (event) {
        harness.errors.push(String(event.message || event.error).slice(0, 120));
    });
    return harness;
}

function withHarness(name, runner) {
    return function () {
        section(name);
        var harness = openHarness();
        waitFor(function () {
            return harness.session.closed || (harness.alpha.position !== null && harness.beta.position !== null);
        }, 10000, function (ready) {
            if (!ready || harness.session.closed) {
                report(name + '-start', false, 'closed=' + harness.session.closed + ' reason=' + harness.session.closeReason);
                if (!harness.session.closed) harness.session.close('check-done');
                later(300, next);
                return;
            }
            harness.session.setIdleFps(0);
            // The first frames have not reached the screen when the windows report, and new windows count as focused in them.
            later(500, function () {
                runChecks(runner(pluginApi, harness), function () {
                    report(name + '-session', !harness.session.closed && harness.errors.length === 0,
                        'closed=' + harness.session.closed + ' errors=' + harness.errors.join(' | '));
                    harness.session.close('check-done');
                    later(500, next);
                });
            });
        });
    };
}

// Right of the title text, and right of where Alpha covers Beta.
function titleOf(window, dp) {
    return [Number(window.position[0]) + 150 * dp, Number(window.position[1]) + 10 * dp];
}

// The arrow is at the left of the title bar.
function arrowOf(window, dp) {
    return [Number(window.position[0]) + 12 * dp, Number(window.position[1]) + 14 * dp];
}

function focusChecks(api, harness) {
    var alpha = harness.alpha;
    var beta = harness.beta;
    var dp = harness.session.density;
    var overlap = [160 * dp, 150 * dp];
    function state() {
        return 'alpha=' + alpha.focused + ' beta=' + beta.focused;
    }
    return [
        function (done) {
            report('focus-initial', beta.focused && !alpha.focused, state());
            api.addMousePosEvent(overlap[0], overlap[1]);
            later(200, function () {
                report('focus-front-before', beta.hovered && !alpha.hovered, 'alpha=' + alpha.hovered + ' beta=' + beta.hovered);
                done();
            });
        },
        function (done) {
            alpha.focusNow = true;
            later(250, function () {
                report('focus-call', alpha.focused && !beta.focused, state());
                report('focus-front-after', alpha.hovered && !beta.hovered, 'alpha=' + alpha.hovered + ' beta=' + beta.hovered);
                done();
            });
        },
        function (done) {
            var at = titleOf(beta, dp);
            injectClick(api, at[0], at[1], function () {
                report('focus-one-frame', beta.focused && !alpha.focused, state());
                done();
            });
        },
        function (done) {
            var x = Number(beta.button[0]) + 30 * dp;
            var y = Number(beta.button[1]) + harness.frameHeight / 2;
            injectClick(api, x, y, function () {
                later(200, function () {
                    report('focus-button', beta.presses === 1 && alpha.focused && !beta.focused, 'presses=' + beta.presses + ' ' + state());
                    done();
                });
            });
        },
        function (done) {
            var failure = failureOf(function () { api.setNextWindowFocus(); });
            report('focus-outside-frame', failure !== '', failure.slice(0, 100));
            done();
        }
    ];
}

function collapseChecks(api, harness) {
    var alpha = harness.alpha;
    var gamma = harness.gamma;
    var session = harness.session;
    var dp = session.density;
    var body = [40 * dp, 150 * dp];
    var expanded = 0;
    function height(window) {
        return Number(window.size[1]);
    }
    function state(window) {
        return 'collapsed=' + window.collapsed + ' height=' + Math.round(height(window) / dp) + ' dp';
    }
    function arrow(window, done) {
        var at = arrowOf(window, dp);
        injectClick(api, at[0], at[1], function () {
            later(200, done);
        });
    }
    return [
        function (done) {
            expanded = height(alpha);
            var visible = alphaAt(session, body[0], body[1]);
            alpha.collapseNow = true;
            later(250, function () {
                var hidden = alphaAt(session, body[0], body[1]);
                report('collapse-call', alpha.collapsed && closeTo(height(alpha), harness.frameHeight, 1.5) && visible > 0 && hidden === 0,
                    state(alpha) + ' titleBar=' + Math.round(harness.frameHeight / dp) + ' dp bodyAlpha=' + visible + '->' + hidden);
                done();
            });
        },
        function (done) {
            alpha.collapseNow = false;
            later(250, function () {
                var back = alphaAt(session, body[0], body[1]);
                report('collapse-expand', !alpha.collapsed && closeTo(height(alpha), expanded, 1) && back > 0,
                    state(alpha) + ' bodyAlpha=' + back);
                done();
            });
        },
        function (done) {
            alpha.collapseNow = true;
            later(250, function () {
                arrow(alpha, function () {
                    report('collapse-one-frame', !alpha.collapsed, state(alpha));
                    done();
                });
            });
        },
        function (done) {
            alpha.collapseEvery = true;
            alpha.condEvery = api.Cond.Always;
            later(250, function () {
                arrow(alpha, function () {
                    report('collapse-always', alpha.collapsed, state(alpha));
                    alpha.collapseEvery = null;
                    alpha.collapseNow = false;
                    later(250, done);
                });
            });
        },
        function (done) {
            gamma.collapseEvery = true;
            gamma.condEvery = api.Cond.Once;
            harness.gammaActive = true;
            waitFor(function () { return gamma.position !== null; }, 3000, function () {
                later(300, function () {
                    report('collapse-once', gamma.collapsed, state(gamma));
                    arrow(gamma, function () {
                        report('collapse-once-stops', !gamma.collapsed, state(gamma));
                        done();
                    });
                });
            });
        }
    ];
}

if (wanted('focus')) {
    steps.push(withHarness('focus', focusChecks));
}
if (wanted('collapse')) {
    steps.push(withHarness('collapse', collapseChecks));
}

// Where the buttons of "Panels" are: the same window with the same items and options, in a session of its own.
function probePanelButtons(done) {
    var at = {};
    var probe = imgui.launchFloaty(function (ui) {
        var open = ui.ref(true);
        ui.setNextWindowPos(ui.dp(8), ui.dp(8), ui.Cond.Always);
        ui.setNextWindowSize(ui.dp(344), ui.dp(180), ui.Cond.Always);
        ui.withWindow('Panels', null, 0, function () {
            ['Counter', 'Level', 'Notes'].forEach(function (name) {
                ui.checkbox(name, open);
                ui.sameLine(ui.dp(120));
                ui.text('open');
            });
            ui.button('Close all');
            ui.sameLine();
            at.focus = nextItemAt(ui);
            ui.button('Focus next');
            ui.sameLine();
            at.collapse = nextItemAt(ui);
            ui.button('Collapse all');
        });
        at.frameHeight = ui.getFrameHeight();
    }, {
        width: 360, height: 460, x: 6, y: 24, fps: 60, theme: imgui.Themes.ModernDark, touchMode: imgui.TouchMode.Auto,
        contentAutoResize: false, collapseButton: true
    });
    waitFor(function () { return at.frameHeight !== undefined; }, 10000, function () {
        probe.close('check-done');
        later(500, function () {
            done(at);
        });
    });
}

function panelChecks(api, session, at) {
    var panels = session.panels;
    var dp = session.density;
    var expanded = panels.map(function (panel) { return Number(panel.size[1]); });
    function tap(button, done) {
        injectClick(api, button[0] + 20 * dp, button[1] + at.frameHeight / 2, function () {
            later(250, done);
        });
    }
    function focusedNames() {
        return panels.filter(function (p) { return p.focused; }).map(function (p) { return p.name; }).join(',');
    }
    function heights() {
        return panels.map(function (p) { return Math.round(Number(p.size[1]) / dp); }).join(',');
    }
    return [
        function (done) {
            tap(at.focus, function () {
                report('panels-focus-first', focusedNames() === 'Counter', 'focused=' + focusedNames());
                done();
            });
        },
        function (done) {
            tap(at.focus, function () {
                report('panels-focus-second', focusedNames() === 'Level', 'focused=' + focusedNames());
                done();
            });
        },
        function (done) {
            tap(at.collapse, function () {
                var ok = panels.every(function (p) { return p.collapsed && closeTo(Number(p.size[1]), at.frameHeight, 1.5); });
                report('panels-collapse-all', ok, 'heights=' + heights() + ' dp');
                done();
            });
        },
        function (done) {
            tap(at.collapse, function () {
                var ok = panels.every(function (p, i) { return !p.collapsed && closeTo(Number(p.size[1]), expanded[i], 1); });
                report('panels-expand-all', ok, 'heights=' + heights() + ' dp');
                done();
            });
        }
    ];
}

if (wanted('panels')) {
    steps.push(function () {
        section('panels');
        probePanelButtons(function (at) {
            var session = imgui.runExample('multi-window', {});
            waitFor(function () {
                return session.closed || (session.panels != null && session.panels.every(function (p) { return p.position != null; }));
            }, 10000, function () {
                if (session.closed) {
                    report('panels-start', false, 'reason=' + session.closeReason);
                    later(300, next);
                    return;
                }
                session.setIdleFps(0);
                later(500, function () {
                    runChecks(panelChecks(pluginApi, session, at), function () {
                        session.close('check-done');
                        later(500, next);
                    });
                });
            });
        });
    });
}

if (wanted('examples')) {
    steps.push(function () {
        section('examples');
        var names = imgui.listExamples().map(String);
        var total = names.length;
        var passed = 0;
        function runNext() {
            var name = names.shift();
            if (!name) {
                report('examples', total === 10 && passed === total, 'passed=' + passed + '/' + total);
                next();
                return;
            }
            var start = Date.now();
            var session;
            try {
                session = imgui.runExample(name, {autoCloseMs: 2500, autoStart: name === 'background-task'});
            } catch (e) {
                report('example-' + name, false, 'threw ' + String(e).slice(0, 100));
                runNext();
                return;
            }
            var startMs = Date.now() - start;
            waitFor(function () { return session.closed; }, 10000, function () {
                var reason = String(session.closeReason);
                var ok = session.closed && reason === 'example-timeout';
                if (ok) passed += 1;
                report('example-' + name, ok, 'reason=' + reason + ' startMs=' + startMs + ' totalMs=' + (Date.now() - start));
                if (!session.closed) session.close('stuck');
                later(300, runNext);
            });
        }
        runNext();
    });
}

next();
"""


def adb(serial: str, *args: str, check: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["adb", "-s", serial, *args], capture_output=True, text=True, encoding="utf-8",
                          errors="replace", check=check)


def stream_logcat(serial: str) -> tuple[subprocess.Popen[str], queue.Queue[str]]:
    """Follows the console and the native log of the plugin as they are written (see device_r2_check.py)."""
    process = subprocess.Popen(["adb", "-s", serial, "logcat", "-v", "tag", "GlobalConsole:V", NATIVE_LOG_TAG + ":V", "*:S"],
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, encoding="utf-8",
                               errors="replace")
    lines: queue.Queue[str] = queue.Queue()

    def pump() -> None:
        assert process.stdout is not None
        for line in process.stdout:
            lines.put(line.rstrip())

    threading.Thread(target=pump, daemon=True).start()
    return process, lines


def console_message(line: str) -> str | None:
    """The GlobalConsole message of a log line, without the time and level prefix some devices add."""
    if "GlobalConsole: " not in line:
        return None
    text = line.split("GlobalConsole: ", 1)[1]
    at = text.find(MARK + " ")
    return text[at:] if at >= 0 else text


def example_failures(lines: list[str]) -> int:
    """Callback failures printed while the examples ran (after the "section examples" marker)."""
    start = next((i for i, line in enumerate(lines) if line == MARK + " section examples"), None)
    if start is None:
        return 0
    words = ("Render callback failed", "listener failed", "Initialization failed")
    return sum(1 for line in lines[start:] if any(word in line for word in words))


def versions(serial: str) -> str:
    """The installed versions, so that a log says which build it is about."""
    parts = []
    for package in (PACKAGE, PLUGIN_PACKAGE):
        output = adb(serial, "shell", "dumpsys", "package", package).stdout
        name = re.search(r"versionName=(\S+)", output)
        code = re.search(r"versionCode=(\d+)", output)
        parts.append("%s %s (%s)" % (package.rsplit(".", 1)[-1], name.group(1) if name else "?", code.group(1) if code else "?"))
    return ", ".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-s", "--serial", required=True)
    parser.add_argument("--only", default=",".join(ALL_SECTIONS), help="sections to run, separated by commas")
    parser.add_argument("--timeout", type=float, default=180)
    parser.add_argument("--keep", action="store_true", help="keep the pushed script and the local copy")
    args = parser.parse_args()

    only = [name for name in args.only.split(",") if name]
    unknown = [name for name in only if name not in ALL_SECTIONS]
    if unknown:
        parser.error("unknown sections: " + ",".join(unknown))
    if "mWakefulness=Awake" not in adb(args.serial, "shell", "dumpsys", "power").stdout:
        print("SETUP the screen is off: turn it on and unlock the device first")
        return 2

    print("versions " + versions(args.serial), flush=True)
    local = pathlib.Path(__file__).resolve().parent / "device_r7_check.generated.js"
    local.write_text(SCRIPT.replace("__ONLY__", json.dumps(only)), encoding="utf-8")
    remote = DEVICE_DIR + "/check.js"
    try:
        adb(args.serial, "shell", "mkdir", "-p", DEVICE_DIR, check=True)
        adb(args.serial, "push", str(local), remote, check=True)
        adb(args.serial, "logcat", "-c")
        log_process, log_lines = stream_logcat(args.serial)
        adb(args.serial, "shell", "am", "start", "-n", PACKAGE + "/" + RUN_ACTIVITY, "-e", "path", remote, check=True)
        console: list[str] = []
        seen: list[str] = []
        deadline = time.time() + args.timeout
        done = False
        while time.time() < deadline and not done:
            try:
                raw = log_lines.get(timeout=0.2)
            except queue.Empty:
                continue
            line = console_message(raw)
            if line is None:
                continue
            console.append(line)
            if line.startswith(MARK + " section ") or not line.startswith(MARK + " "):
                continue
            seen.append(line)
            print(line[len(MARK) + 1:], flush=True)
            if line.startswith(MARK + " done"):
                done = True
        log_process.terminate()
        if not done:
            print("TIMEOUT after %.0f s (%d lines seen)" % (args.timeout, len(seen)))
            return 1
        printed = example_failures(console)
        print(f"example-console {'PASS' if printed == 0 else 'FAIL'} failures={printed}")
        failed = [line for line in seen if " FAIL" in line]
        return 0 if not failed and printed == 0 else 1
    finally:
        if not args.keep:
            adb(args.serial, "shell", "rm", "-r", DEVICE_DIR)
            local.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
