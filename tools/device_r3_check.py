#!/usr/bin/env python3
"""Checks the R3 (v1.14.0) behavior of the ImGui plugin on a device through the AutoJs6 global `imgui`.

Usage: py -3.12 -I tools/device_r3_check.py -s SERIAL [--timeout 300] [--keep]

Needs AutoJs6 (debug or release, with the `imgui` module) and the plugin installed, enabled and trusted, the overlay
permission for AutoJs6, the screen on and unlocked, and no one touching the device while it runs. Pushes one script,
runs it through RunIntentActivity and prints one line per check, PASS / FAIL with the key values. The script asks
for the inputs it cannot make itself (an "action" line): this tool then injects a tap or a swipe on the window
(after a Shift key, see perform; sent again when the widget did not react, at most 3 times), the back key
(keyevent 4) or starts the AutoJs6 launcher Activity. The new members are called on the API object of the render
callback (`ui`): a host older than the R3 names lists them on the global `imgui` only after the load.

- tools: showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow /
  showUserGuide each draw for one frame without a reference, with imgui.bool(true) and as the PascalCase alias with
  {value: true}, without an exception or a session "error" event; the reference stays true.
- sort-*: a table with Sortable | SortMulti | SortTristate (DefaultSort on column 0, PreferSortDescending on column
  1, user ids 11 / 22 / 33): tableGetSortSpecs reports the initial sort once, then after each tap on a header exactly
  one frame with specsDirty and the expected {columnIndex, columnUserId, sortDirection, sortOrder} (column 1
  descending, ascending, none; column 0 ascending; Shift (addKeyEvent ModShift) + column 2 appended). sort-dataTable:
  dataTable with options.sortable sorts its rows by the DefaultSort | PreferSortDescending column and sorts rows set
  later with setRows again; without sortable the rows keep their order.
- multi-*: a swipe on the first component of dragFloat3 (imgui.floats), sliderInt2 ({value: [...]}), the lower end
  of dragFloatRange2 and on sliderAngle writes the new value back to the reference and leaves the other components.
- slow-*: createWindow({debug: true}) whose callback sleeps 300 ms in two frames prints exactly one console.warn
  "The render callback blocked the frame for N ms" (N >= 250, naming threads.start; the second is rate limited);
  without debug none.
- back-*: in Activity mode (imgui.launch over the AutoJs6 launcher Activity) the back key (keyevent 4) closes a
  session without a "back" listener with closeReason "back" and leaves the Activity resumed; a listener that calls
  preventDefault keeps the session open and counts one event.
- examples: listExamples() has 9 entries, widget-overview has the "Debug" menu and data-table-demo sets sortable,
  and each one (background-task with its worker running) starts and closes on its timer.
"""

from __future__ import annotations

import argparse
import pathlib
import queue
import re
import subprocess
import sys
import threading
import time

DEVICE_DIR = "/sdcard/Download/aj6-imgui-r3"
RUN_ACTIVITY = "org.autojs.autojs.external.open.RunIntentActivity"
LAUNCHER_ACTIVITY = "org.autojs.autojs.launcher.AdaptiveIconAlias"
PACKAGE = "org.autojs.autojs6"
MARK = "AJ6R3"
NATIVE_LOG_TAG = "AutoJs6-ImGui"
SLOW_WARNING = "The render callback blocked the frame for "

SCRIPT = r"""
var MARK = 'AJ6R3';
var failed = 0;

function report(name, ok, detail) {
    console.log(MARK + ' ' + name + ' ' + (ok ? 'PASS' : 'FAIL') + ' ' + detail);
    if (!ok) failed++;
}

function section(name) {
    console.log(MARK + ' section ' + name);
}

function action(name) {
    console.log(MARK + ' action ' + name);
}

function round2(value) {
    return typeof value === 'number' ? Math.round(value * 100) / 100 : value;
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

function surfaceOrigin(session) {
    var loc = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
    session.surfaceView.getLocationOnScreen(loc);
    return [Number(loc[0]), Number(loc[1])];
}

// The screen position of the cursor of the current window (pixels of the surface).
function cursorScreen(ui) {
    var wp = ui.getWindowPos();
    var cp = ui.getCursorPos();
    return [Number(wp[0]) + Number(cp[0]), Number(wp[1]) + Number(cp[1])];
}

function fixedWindow(ui, title, width, height, body) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(width, height, ui.Cond.Always);
    var flags = ui.WindowFlags.NoTitleBar | ui.WindowFlags.NoResize | ui.WindowFlags.NoMove |
        ui.WindowFlags.NoScrollbar | ui.WindowFlags.NoSavedSettings;
    ui.withWindow(title, null, flags, body);
}

// Asks for an input until changed() holds, at most 3 times, then calls done(changed, attempts).
function inputUntil(request, changed, done) {
    var attempts = 0;
    function attempt() {
        attempts += 1;
        action(request() + ' ' + attempts);
        waitFor(changed, 3000, function (met) {
            if (met || attempts >= 3) {
                done(met, attempts);
                return;
            }
            attempt();
        });
    }
    attempt();
}

steps.push(function () {
    section('tools');
    var names = ['showMetricsWindow', 'showDebugLogWindow', 'showIdStackToolWindow', 'showStyleEditor',
        'showAboutWindow', 'showUserGuide'];
    var aliases = ['ShowMetricsWindow', 'ShowDebugLogWindow', 'ShowIDStackToolWindow', 'ShowStyleEditor',
        'ShowAboutWindow', 'ShowUserGuide'];
    var calls = 0;
    var errors = [];
    var refs = [];
    var frames = 0;
    var session = imgui.createWindow(function (ui, s) {
        frames++;
        fixedWindow(ui, 'R3 tools', ui.dp(250), ui.dp(120), function () {
            ui.text('frame ' + frames);
        });
        // Frames 3 - 8 without a reference, 9 - 14 with imgui.bool(true), 15 - 20 as the alias with {value: true}.
        var index = frames - 3;
        if (index >= 0 && index < 18) {
            var tool = index % 6;
            try {
                if (index < 6) {
                    ui[names[tool]]();
                } else if (index < 12) {
                    var bool = imgui.bool(true);
                    ui[names[tool]](bool);
                    refs.push(Boolean(bool[0]));
                } else {
                    var ref = {value: true};
                    ui[aliases[tool]](ref);
                    refs.push(ref.value === true);
                }
                calls++;
            } catch (e) {
                errors.push(names[tool] + ': ' + String(e).slice(0, 80));
            }
        }
        if (frames === 30) s.close('done');
    }, {x: 0, y: 200, width: 260, height: 130, contentAutoResize: false});
    session.on('error', function (event) {
        errors.push('event ' + String(event && event.message).slice(0, 80));
    });
    waitFor(function () { return session.closed; }, 15000, function () {
        var refsTrue = refs.filter(Boolean).length;
        report('tools', calls === 18 && errors.length === 0 && refsTrue === 12 && session.closeReason === 'done',
            'calls=' + calls + ' refsStillTrue=' + refsTrue + ' errors=' + errors.length +
            (errors.length ? ' ' + errors.slice(0, 2).join('; ') : '') + ' frames=' + frames +
            ' closeReason=' + session.closeReason);
        if (!session.closed) session.close('stuck');
        later(500, next);
    });
});

function specsText(specs) {
    return specs.map(function (s) {
        return s.columnIndex + ':' + s.columnUserId + ':' + s.sortDirection + ':' + s.sortOrder;
    }).join(',') || 'none';
}

steps.push(function () {
    section('sort');
    var frames = 0;
    var dirty = [];
    var nulls = 0;
    var geo = null;
    var shift = null;
    var session = imgui.createWindow(function (ui) {
        frames++;
        if (shift !== null) {
            ui.addKeyEvent(ui.Key.ModShift, shift);
            shift = null;
        }
        fixedWindow(ui, 'R3 sort', ui.dp(330), ui.dp(170), function () {
            var origin = cursorScreen(ui);
            var width = ui.dp(300);
            var flags = ui.TableFlags.Sortable | ui.TableFlags.SortMulti | ui.TableFlags.SortTristate | ui.TableFlags.Borders;
            ui.withTable('sorted', 3, flags, width, 0, function () {
                ui.tableSetupColumn('Id', ui.TableColumnFlags.WidthStretch | ui.TableColumnFlags.DefaultSort, 1, 11);
                ui.tableSetupColumn('Name', ui.TableColumnFlags.WidthStretch | ui.TableColumnFlags.PreferSortDescending, 1, 22);
                ui.tableSetupColumn('Cost', ui.TableColumnFlags.WidthStretch, 1, 33);
                var sortSpecs = ui.tableGetSortSpecs();
                if (sortSpecs == null) {
                    nulls++;
                } else if (sortSpecs.specsDirty) {
                    dirty.push({frame: frames, text: specsText(sortSpecs.specs)});
                }
                ui.tableHeadersRow();
                for (var row = 0; row < 3; row++) {
                    ui.tableNextRow(0, 0);
                    for (var column = 0; column < 3; column++) {
                        ui.tableSetColumnIndex(column);
                        ui.text('r' + row + 'c' + column);
                    }
                }
            });
            geo = {x: origin[0], y: origin[1], width: width, header: ui.getFrameHeight()};
        });
    }, {x: 0, y: 200, width: 340, height: 180, contentAutoResize: false, idleDelay: 600000});

    var expected = [
        ['initial', null, false, '0:11:1:0'],
        ['column1', 1, false, '1:22:2:0'],
        ['column1-again', 1, false, '1:22:1:0'],
        ['column1-tristate', 1, false, 'none'],
        ['column0', 0, false, '0:11:1:0'],
        ['shift-column2', 2, true, '0:11:1:0,2:33:1:1']
    ];
    var results = [];
    var attemptsTotal = 0;

    function finish() {
        // Every dirty frame belongs to one of the changes: specsDirty is never true twice for one change.
        var texts = dirty.map(function (d) { return d.text; });
        var wanted = expected.map(function (e) { return e[3]; });
        report('sort-specs', results.every(Boolean) && texts.join('|') === wanted.join('|'),
            'got=' + texts.join('|') + ' tapAttempts=' + attemptsTotal);
        report('sort-dirty', dirty.length === expected.length && nulls === 0 && frames > 10 * expected.length,
            'dirtyFrames=' + dirty.length + ' of frames=' + frames + ' nullFrames=' + nulls +
            ' at=' + dirty.map(function (d) { return d.frame; }).join(','));
        session.close('done');
        later(500, next);
    }

    function step(index) {
        if (index >= expected.length) {
            finish();
            return;
        }
        var item = expected[index];
        var before = dirty.length;
        if (item[1] === null) {
            waitFor(function () { return frames >= 20; }, 5000, function () {
                results.push(dirty.length === 1);
                step(index + 1);
            });
            return;
        }
        if (item[2]) shift = true;
        later(item[2] ? 300 : 0, function () {
            var origin = surfaceOrigin(session);
            inputUntil(function () {
                var x = Math.round(origin[0] + geo.x + geo.width * (item[1] + 0.5) / 3);
                var y = Math.round(origin[1] + geo.y + geo.header * 0.45);
                return 'tap ' + x + ' ' + y;
            }, function () { return dirty.length > before; }, function (met, attempts) {
                attemptsTotal += attempts;
                // Let a few frames pass: a second dirty frame for the same tap would show up here.
                later(600, function () {
                    results.push(met && dirty.length === before + 1);
                    if (item[2]) shift = false;
                    later(300, function () { step(index + 1); });
                });
            });
        });
    }
    step(0);
});

steps.push(function () {
    section('sort-dataTable');
    var tables = {};
    var frames = 0;
    var rows = [{id: 1, cost: 3}, {id: 2, cost: 1}, {id: 3, cost: 2}];
    var session = imgui.createWindow(function (ui, s) {
        frames++;
        if (!tables.sorted) {
            var headers = [
                {key: 'id', label: '#'},
                {key: 'cost', label: 'Cost', flags: ui.TableColumnFlags.DefaultSort | ui.TableColumnFlags.PreferSortDescending}
            ];
            tables.sorted = s.dataTable('r3-sorted', headers, rows.slice(), {sortable: true, width: 200, height: 160});
            tables.plain = s.dataTable('r3-plain', headers, rows.slice(), {width: 200, height: 160});
        }
    }, {x: 0, y: 200, width: 300, height: 200, contentAutoResize: false});
    function ids(table) {
        return table.getRows().map(function (row) { return row.id; }).join(',');
    }
    waitFor(function () { return frames >= 15; }, 6000, function () {
        var first = ids(tables.sorted);
        var plain = ids(tables.plain);
        tables.sorted.setRows([{id: 4, cost: 5}, {id: 5, cost: 9}, {id: 6, cost: 7}]);
        var at = frames;
        waitFor(function () { return frames >= at + 10; }, 4000, function () {
            var reset = ids(tables.sorted);
            report('sort-dataTable', first === '1,3,2' && reset === '5,6,4' && plain === '1,2,3',
                'sorted=' + first + ' afterSetRows=' + reset + ' unsorted=' + plain);
            session.close('done');
            later(500, next);
        });
    });
});

steps.push(function () {
    section('multi');
    var refs = {
        dragFloat3: imgui.floats([100, 200, 300]),
        sliderInt2: {value: [10, 20]},
        rangeMin: {value: 10},
        rangeMax: {value: 90},
        sliderAngle: {value: 0}
    };
    var geo = {};
    var errors = [];
    var session = imgui.createWindow(function (ui) {
        fixedWindow(ui, 'R3 multi', ui.dp(330), ui.dp(230), function () {
            var width = ui.dp(300);
            function place(key, components) {
                var origin = cursorScreen(ui);
                var inner = ui.dp(4);
                geo[key] = {
                    x: origin[0], y: origin[1], height: ui.getFrameHeight(),
                    component: (width - (components - 1) * inner) / components,
                    dp: ui.dp(1)
                };
                ui.setNextItemWidth(width);
            }
            try {
                place('dragFloat3', 3);
                ui.dragFloat3('##df3', refs.dragFloat3, 0.5, 0, 1000);
                ui.dummy(1, ui.dp(14));
                place('sliderInt2', 2);
                ui.sliderInt2('##si2', refs.sliderInt2, 0, 100);
                ui.dummy(1, ui.dp(14));
                place('dragFloatRange2', 2);
                ui.dragFloatRange2('##range', refs.rangeMin, refs.rangeMax, 0.5, 0, 100);
                ui.dummy(1, ui.dp(14));
                place('sliderAngle', 1);
                ui.sliderAngle('##angle', refs.sliderAngle, -180, 180);
            } catch (e) {
                if (errors.length < 3) errors.push(String(e).slice(0, 120));
            }
        });
    }, {x: 0, y: 200, width: 340, height: 240, contentAutoResize: false, idleDelay: 600000});

    var dragFloat3 = refs.dragFloat3;
    var checks = [
        {
            name: 'dragFloat3', drag: true,
            changed: function () { return Number(dragFloat3[0]) !== 100; },
            ok: function () { return Number(dragFloat3[0]) > 100 && Number(dragFloat3[1]) === 200 && Number(dragFloat3[2]) === 300; },
            value: function () { return [0, 1, 2].map(function (i) { return round2(Number(dragFloat3[i])); }).join(','); }
        },
        {
            name: 'sliderInt2', drag: false,
            changed: function () { return refs.sliderInt2.value[0] !== 10; },
            ok: function () { return refs.sliderInt2.value[0] > 50 && refs.sliderInt2.value[1] === 20; },
            value: function () { return refs.sliderInt2.value.join(','); }
        },
        {
            name: 'dragFloatRange2', drag: true,
            changed: function () { return refs.rangeMin.value !== 10; },
            ok: function () { return refs.rangeMin.value > 10 && refs.rangeMin.value <= 90 && refs.rangeMax.value === 90; },
            value: function () { return round2(refs.rangeMin.value) + ',' + round2(refs.rangeMax.value); }
        },
        {
            name: 'sliderAngle', drag: false,
            changed: function () { return refs.sliderAngle.value !== 0; },
            // Radians: the swipe ends short of the right end (the release frame keeps the previous position), and a
            // value in degrees would be far above pi.
            ok: function () { return refs.sliderAngle.value > 1 && refs.sliderAngle.value <= Math.PI + 1e-4; },
            value: function () { return round2(refs.sliderAngle.value) + ' rad'; }
        }
    ];

    function run(index) {
        if (index >= checks.length) {
            report('multi-errors', errors.length === 0, 'errors=' + errors.length + (errors.length ? ' ' + errors[0] : ''));
            session.close('done');
            later(500, next);
            return;
        }
        var check = checks[index];
        var origin = surfaceOrigin(session);
        inputUntil(function () {
            var g = geo[check.name];
            var y = Math.round(origin[1] + g.y + g.height / 2);
            // A drag moves 50 dp right from the middle of the first component; a slider goes to its right end.
            var x1 = Math.round(origin[0] + g.x + g.component / 2);
            var x2 = check.drag ? Math.round(x1 + 50 * g.dp) : Math.round(origin[0] + g.x + g.component - 2 * g.dp);
            return 'swipe ' + x1 + ' ' + y + ' ' + x2 + ' ' + y + ' 600';
        }, check.changed, function (met, attempts) {
            later(400, function () {
                report('multi-' + check.name, met && check.ok(), 'value=' + check.value() + ' attempts=' + attempts);
                run(index + 1);
            });
        });
    }
    waitFor(function () { return geo.sliderAngle != null; }, 5000, function () {
        later(500, function () { run(0); });
    });
});

function slowRun(name, debug, done) {
    var frames = 0;
    var slow = 0;
    var session = imgui.createWindow(function (ui, s) {
        frames++;
        if (frames === 5 || frames === 12) {
            sleep(300);
            slow++;
        }
        fixedWindow(ui, 'R3 ' + name, ui.dp(200), ui.dp(80), function () {
            ui.text('frame ' + frames);
        });
        if (frames === 25) s.close('done');
    }, {x: 0, y: 200, width: 210, height: 90, contentAutoResize: false, debug: debug});
    waitFor(function () { return session.closed; }, 20000, function () {
        report(name, slow === 2 && frames >= 25 && session.closeReason === 'done',
            'slowFrames=' + slow + ' frames=' + frames + ' debug=' + session.debug + ' closeReason=' + session.closeReason);
        if (!session.closed) session.close('stuck');
        later(500, done);
    });
}

steps.push(function () {
    // The tool counts the warnings of each section: slow-debug wants 1, slow-plain 0.
    section('slow-debug');
    slowRun('slow-run-debug', true, function () {
        section('slow-plain');
        slowRun('slow-run-plain', false, function () {
            section('slow-end');
            next();
        });
    });
});

function currentActivity() {
    try {
        return runtime.app.getCurrentActivity();
    } catch (e) {
        return null;
    }
}

steps.push(function () {
    section('back');
    action('main-activity');
    var last = null;
    var stableSince = 0;
    // An AutoJs6 Activity that stayed resumed for a second (the launcher alias may pass through a splash screen).
    waitFor(function () {
        var activity = currentActivity();
        if (activity == null || !activity.equals(last)) {
            last = activity;
            stableSince = Date.now();
            return false;
        }
        return Date.now() - stableSince >= 1000;
    }, 15000, function (resumed) {
        var activityName = last == null ? 'null' : String(last.getClass().getSimpleName());
        if (!resumed) {
            report('back-activity', false, 'no resumed AutoJs6 Activity: ' + activityName);
            next();
            return;
        }
        var frames = 0;
        var plain;
        try {
            plain = imgui.launch(function (ui) {
                frames++;
                fixedWindow(ui, 'R3 back', ui.dp(240), ui.dp(80), function () {
                    ui.text('frame ' + frames);
                });
            });
        } catch (e) {
            report('back-close', false, 'launch threw ' + String(e).slice(0, 160));
            next();
            return;
        }
        waitFor(function () { return frames >= 10; }, 5000, function () {
            action('back');
            waitFor(function () { return plain.closed; }, 5000, function (closed) {
                later(1200, function () {
                    var kept = currentActivity();
                    report('back-close', closed && plain.closeReason === 'back' && kept != null && kept.equals(last),
                        'closed=' + closed + ' closeReason=' + plain.closeReason + ' activity=' + activityName +
                        ' activityKept=' + (kept != null && kept.equals(last)));
                    if (!plain.closed) plain.close('stuck');
                    preventedRun(activityName);
                });
            });
        });
    });

    function preventedRun(activityName) {
        var frames = 0;
        var events = [];
        var kept;
        try {
            kept = imgui.launch(function (ui) {
                frames++;
                fixedWindow(ui, 'R3 back kept', ui.dp(240), ui.dp(80), function () {
                    ui.text('back ' + events.length);
                });
            });
        } catch (e) {
            report('back-prevent', false, 'launch threw ' + String(e).slice(0, 160));
            next();
            return;
        }
        kept.on('back', function (event, s) {
            events.push({type: event.type, same: s === kept});
            event.preventDefault();
        });
        waitFor(function () { return frames >= 10; }, 5000, function () {
            action('back');
            waitFor(function () { return events.length > 0; }, 5000, function () {
                later(2000, function () {
                    var first = events[0];
                    report('back-prevent', !kept.closed && events.length === 1 && first.type === 'back' && first.same,
                        'closed=' + kept.closed + ' events=' + events.length + ' type=' + (first && first.type) +
                        ' framesAfter=' + frames + ' activity=' + activityName);
                    kept.close('done');
                    later(800, next);
                });
            });
        });
    }
});

steps.push(function () {
    section('examples');
    var names = imgui.listExamples().map(function (e) { return String(e && e.name !== undefined ? e.name : e); });
    var total = names.length;
    var overview = String(imgui.getExampleSource('widget-overview'));
    var dataTable = String(imgui.getExampleSource('data-table-demo'));
    report('example-list', total === 9 && overview.indexOf('withMenu("Debug"') >= 0 && dataTable.indexOf('sortable: true') >= 0,
        'length=' + total + ' debugMenu=' + (overview.indexOf('withMenu("Debug"') >= 0) +
        ' sortable=' + (dataTable.indexOf('sortable: true') >= 0));
    var results = [];
    function runNext() {
        var name = names.shift();
        if (!name) {
            var bad = results.filter(function (r) { return r[1] !== 'example-timeout'; });
            report('examples', results.length === total && bad.length === 0,
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
        return -1
    words = ("Render callback failed", "listener failed", "Initialization failed")
    return sum(1 for line in lines[start:] if any(word in line for word in words))


def perform(serial: str, request: str) -> str:
    """Runs an input the device script asked for and returns a short note."""
    words = request.split()
    if words[0] in ("tap", "swipe"):
        # A Shift key first ends the dimming of an idle display, which spends the first touch on brightening it
        # (968e9f18, see device_r2_check.py); it goes to the focused window, never to the overlay.
        adb(serial, "shell", "input", "keyevent", "KEYCODE_SHIFT_LEFT")
        time.sleep(0.3)
        count = 3 if words[0] == "tap" else 6
        result = adb(serial, "shell", "input", *words[:count])
        note = "ok" if result.returncode == 0 and not result.stderr.strip() else result.stderr.strip()[:120]
        return " ".join(words) + " " + note
    if words[0] == "back":
        adb(serial, "shell", "input", "keyevent", "4")
        return "keyevent 4"
    if words[0] == "main-activity":
        result = adb(serial, "shell", "am", "start", "-n", PACKAGE + "/" + LAUNCHER_ACTIVITY)
        return "am start launcher " + ("ok" if result.returncode == 0 else result.stderr.strip()[:120])
    return "unknown action " + request


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-s", "--serial", required=True)
    parser.add_argument("--timeout", type=float, default=300)
    parser.add_argument("--keep", action="store_true", help="keep the pushed script and the local copy")
    args = parser.parse_args()

    if "mWakefulness=Awake" not in adb(args.serial, "shell", "dumpsys", "power").stdout:
        print("SETUP the screen is off: turn it on and unlock the device first")
        return 2

    local = pathlib.Path(__file__).resolve().parent / "device_r3_check.generated.js"
    local.write_text(SCRIPT, encoding="utf-8")
    remote = DEVICE_DIR + "/check.js"
    try:
        adb(args.serial, "shell", "mkdir", "-p", DEVICE_DIR, check=True)
        adb(args.serial, "push", str(local), remote, check=True)
        adb(args.serial, "logcat", "-c")
        log_process, log_lines = stream_logcat(args.serial)
        adb(args.serial, "shell", "am", "start", "-n", PACKAGE + "/" + RUN_ACTIVITY, "-e", "path", remote, check=True)
        console: list[str] = []
        seen: list[str] = []
        section = ""
        warnings: dict[str, list[str]] = {}
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
            if SLOW_WARNING in line:
                warnings.setdefault(section, []).append(line)
                continue
            if line.startswith(MARK + " section "):
                section = line[len(MARK + " section "):]
                continue
            if not line.startswith(MARK + " "):
                continue
            seen.append(line)
            if line.startswith(MARK + " action "):
                note = perform(args.serial, line[len(MARK + " action "):])
                print("action " + note, flush=True)
                continue
            print(line[len(MARK) + 1:], flush=True)
            if line.startswith(MARK + " done"):
                done = True
        log_process.terminate()
        if not done:
            print("TIMEOUT after %.0f s (%d lines seen)" % (args.timeout, len(seen)))
            return 1
        debug = warnings.get("slow-debug", [])
        times = [int(m.group(1)) for m in (re.search(r"blocked the frame for (\d+) ms", w) for w in debug) if m]
        slow_ok = len(debug) == 1 and len(times) == 1 and times[0] >= 250 and "threads.start" in debug[0]
        print(f"slow-warn-debug {'PASS' if slow_ok else 'FAIL'} warnings={len(debug)} ms={','.join(map(str, times))}")
        plain = warnings.get("slow-plain", [])
        others = sum(len(v) for k, v in warnings.items() if k not in ("slow-debug", "slow-plain"))
        print(f"slow-warn-plain {'PASS' if not plain else 'FAIL'} warnings={len(plain)} elsewhere={others}")
        printed = example_failures(console)
        print(f"example-console {'PASS' if printed == 0 else 'FAIL'} failures={printed}")
        failed = [line for line in seen if " FAIL " in line]
        return 0 if not failed and slow_ok and not plain and printed == 0 else 1
    finally:
        if not args.keep:
            adb(args.serial, "shell", "rm", "-r", DEVICE_DIR)
            local.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
