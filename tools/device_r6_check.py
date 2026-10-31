#!/usr/bin/env python3
"""Checks the R6 (v1.17.0) behavior of the ImGui plugin on a device through the AutoJs6 global `imgui`.

Usage: py -3.12 -I tools/device_r6_check.py -s SERIAL [--only select,window,examples] [--timeout 300] [--keep]

Needs AutoJs6 (debug or release, with the `imgui` module) and the plugin installed, enabled and trusted, the overlay
permission for AutoJs6, the screen on and unlocked. Pushes one script, runs it through RunIntentActivity and prints one
line per check, PASS / FAIL / SKIP with the key values. Pointer and key input of the lists comes from the injection API, so
the results are exact; the tool only sends one real tap, one real swipe and starts the launcher Activity. The new members
are called on the API object of the render callback (`ui`): a host older than the R6 names lists them on the global
`imgui` only after the load, or not at all.

Sections (default: all):
- select: a list of 100000 rows with listClipper, only the visible rows submitted. A click selects one row, Shift+click a
  range over rows that were never submitted (forwards and backwards), Ctrl+click toggles one row and keeps the others,
  Ctrl+A selects all, Escape with ClearOnEscape clears, Shift+Down extends from the focused row; the flags NoSelectAll,
  NoRangeSelect, SingleSelect; no ClearOnEscape; isItemToggledSelection; two scopes in one window; checkboxes with
  NoAutoSelect | NoAutoClear; one real tap; misuse (unmatched end, end in another window, a missing end, a throw inside
  the scope) leaves the session running. Prints the time to apply large ranges and the work per frame.
- window: examples/multi-window.js: four root windows at their dp positions, tap order decides the front window, collapse
  and close buttons, a closed window coming back at its place, a real swipe on a title bar moves that window and not the
  overlay, and the same example in an Activity.
- examples: listExamples() has 10 entries, each one starts and closes, and large-list selects a range in multi-select mode.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import queue
import subprocess
import sys
import threading
import time

DEVICE_DIR = "/sdcard/Download/aj6-imgui-r6"
RUN_ACTIVITY = "org.autojs.autojs.external.open.RunIntentActivity"
LAUNCHER_ACTIVITY = "org.autojs.autojs.launcher.AdaptiveIconAlias"
PACKAGE = "org.autojs.autojs6"
MARK = "AJ6R6"
NATIVE_LOG_TAG = "AutoJs6-ImGui"
ALL_SECTIONS = ["select", "window", "examples"]

SCRIPT = r"""
var MARK = 'AJ6R6';
var ONLY = __ONLY__;
var DEVICE_DIR = '__DEVICE_DIR__';
var ROWS = 100000;
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

function action(name) {
    console.log(MARK + ' action ' + name);
}

// Goes on when the tool has done what was asked.
function perform(name, done) {
    action(name);
    var ack = DEVICE_DIR + '/ack-' + name.split(' ')[0];
    waitFor(function () { return files.exists(ack); }, 20000, function () {
        files.remove(ack);
        done();
    });
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

function median(values) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

function failureOf(fn) {
    try {
        fn();
        return '';
    } catch (e) {
        return String(e);
    }
}

function fixedWindow(ui, title, width, height, body) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(width, height, ui.Cond.Always);
    var flags = ui.WindowFlags.NoTitleBar | ui.WindowFlags.NoResize | ui.WindowFlags.NoMove |
        ui.WindowFlags.NoScrollbar | ui.WindowFlags.NoSavedSettings;
    ui.withWindow(title, null, flags, body);
}

// Steps run one per frame from a render callback, each with the ui object; an empty step waits a frame.
function Script() {
    this.steps = [];
}
Script.prototype.tick = function (ui) {
    var step = this.steps.shift();
    if (step) step(ui);
};
Script.prototype.idle = function () {
    return this.steps.length === 0;
};
Script.prototype.wait = function (frames) {
    for (var i = 0; i < frames; i++) this.steps.push(function () {});
    return this;
};
Script.prototype.add = function (step) {
    this.steps.push(step);
    return this;
};

// The list of the select section.
var list = {
    flags: 0, mode: 'clipper', selection: null, second: null, scrollTo: -1, rows: {}, submitted: 0, toggled: [],
    anchor: -1, nav: -1, beginRequests: [], endRequests: [], applyMs: 0, timing: false, frameMs: [], misuse: null
};

// The screen position of the next row: getCursorPos counts from the top of the content, not from the scrolled view.
function rowPosition(ui) {
    var windowPos = ui.getWindowPos();
    var cursor = ui.getCursorPos();
    return [Number(windowPos[0]) + Number(cursor[0]), Number(windowPos[1]) + Number(cursor[1]) - ui.getScrollY()];
}

function applyTimed(selection, io) {
    var start = java.lang.System.nanoTime();
    selection.apply(io);
    list.applyMs = Number(java.lang.System.nanoTime() - start) / 1e6;
}

function submitRow(ui, index, selection, key) {
    ui.setNextItemSelectionUserData(index);
    list.rows[key === undefined ? index : key] = rowPosition(ui);
    list.submitted += 1;
    ui.selectable('Row ' + index + '##' + index, selection.has(index));
    if (ui.isItemToggledSelection()) {
        list.toggled.push(index);
    }
}

function drawClippedList(ui) {
    var rowHeight = ui.getTextLineHeightWithSpacing();
    if (list.scrollTo >= 0) {
        ui.setScrollY(list.scrollTo * rowHeight);
        list.scrollTo = -1;
    }
    var selection = list.selection;
    var scope = ui.beginMultiSelect(list.flags, selection.size, ROWS);
    list.anchor = scope.rangeSrcItem;
    list.nav = scope.navIdItem;
    if (scope.requests.length > 0) {
        list.beginRequests = scope.requests;
        applyTimed(selection, scope);
    }
    list.submitted = 0;
    list.rows = {};
    ui.listClipper(ROWS, {itemHeight: rowHeight, includeItems: [scope.rangeSrcItem, scope.navIdItem]}, function (start, end) {
        for (var i = start; i < end; i += 1) {
            submitRow(ui, i, selection);
        }
    });
    var ended = ui.endMultiSelect();
    if (ended.requests.length > 0) {
        list.endRequests = ended.requests;
        applyTimed(selection, ended);
    }
}

function drawTwoScopes(ui) {
    [['a', list.selection], ['b', list.second]].forEach(function (entry) {
        ui.pushId(entry[0]);
        var scope = ui.beginMultiSelect(ui.MultiSelectFlags.ScopeRect, entry[1].size, 3);
        entry[1].apply(scope);
        for (var i = 0; i < 3; i += 1) {
            submitRow(ui, i, entry[1], entry[0] + i);
        }
        entry[1].apply(ui.endMultiSelect());
        ui.popId();
    });
}

function drawCheckboxes(ui) {
    var selection = list.selection;
    var flags = ui.MultiSelectFlags.NoAutoSelect | ui.MultiSelectFlags.NoAutoClear;
    var scope = ui.beginMultiSelect(flags, selection.size, 5);
    selection.apply(scope);
    for (var i = 0; i < 5; i += 1) {
        ui.setNextItemSelectionUserData(i);
        list.rows[i] = rowPosition(ui);
        ui.checkbox('Item ' + i, ui.ref(selection.has(i)));
    }
    selection.apply(ui.endMultiSelect());
}

function drawMisuse(ui) {
    var misuse = list.misuse;
    misuse.noBegin = failureOf(function () { ui.endMultiSelect(); });
    misuse.toggledOutside = failureOf(function () { ui.isItemToggledSelection(); });
    ui.beginMultiSelect(0, 0, 10);
    ui.withChild('inner', 0, 40, false, 0, function () {
        misuse.otherWindow = failureOf(function () { ui.endMultiSelect(); });
    });
    misuse.stillOpen = failureOf(function () { ui.endMultiSelect(); });
    if (misuse.leaveOpen) {
        ui.beginMultiSelect(0, 0, 10);
        misuse.leftOpen += 1;
    }
    if (misuse.throwInside) {
        misuse.throwInside = false;
        ui.beginMultiSelect(0, 0, 10);
        throw new Error('r6-probe');
    }
}

function drawList(ui) {
    var start = java.lang.System.nanoTime();
    if (list.mode === 'clipper') {
        ui.withChild('rows', 0, 0, true, 0, function () { drawClippedList(ui); });
        if (list.timing) {
            list.frameMs.push(Number(java.lang.System.nanoTime() - start) / 1e6);
        }
    } else if (list.mode === 'two') {
        drawTwoScopes(ui);
    } else if (list.mode === 'checkbox') {
        drawCheckboxes(ui);
    } else if (list.mode === 'misuse') {
        drawMisuse(ui);
    }
}

Script.prototype.clickAt = function (key, offsetX, offsetY) {
    return this
        .add(function (ui) {
            var pos = list.rows[key];
            if (!pos) {
                report('click', false, 'row ' + key + ' is not submitted');
                return;
            }
            ui.addMousePosEvent(pos[0] + offsetX, pos[1] + offsetY);
        }).wait(2)
        .add(function (ui) { ui.addMouseButtonEvent(ui.MouseButton.Left, true); }).wait(2)
        .add(function (ui) { ui.addMouseButtonEvent(ui.MouseButton.Left, false); }).wait(3);
};
Script.prototype.click = function (key) {
    return this.clickAt(key, 60, 8);
};
Script.prototype.withKey = function (key, body) {
    this.add(function (ui) { ui.addKeyEvent(ui.Key[key], true); }).wait(2);
    body(this);
    return this.add(function (ui) { ui.addKeyEvent(ui.Key[key], false); }).wait(2);
};
Script.prototype.press = function (key) {
    return this.add(function (ui) { ui.sendKey(ui.Key[key]); }).wait(4);
};
Script.prototype.scrollTo = function (row) {
    return this.add(function () { list.scrollTo = row; }).wait(4);
};
Script.prototype.setUp = function (mode, flagsOf) {
    return this.add(function (ui) {
        list.mode = mode;
        list.flags = flagsOf ? flagsOf(ui.MultiSelectFlags) : ui.MultiSelectFlags.ClearOnEscape;
        list.selection.clear();
        if (list.second) list.second.clear();
        list.toggled = [];
    }).wait(3);
};

function requestText(requests) {
    return requests.map(function (r) {
        return r.type + ':' + r.selected + ':' + r.rangeFirstItem + '-' + r.rangeLastItem + ':' + r.rangeDirection;
    }).join(' ');
}

function ids(selection) {
    return selection.toArray().join(',');
}

function runSelectChecks(ui, script, finish) {
    var selection = list.selection;
    var rangeMs = 0;
    script.scrollTo(0).click(3).add(function () {
        report('select-click', selection.size === 1 && selection.has(3) && list.anchor === 3,
            'size=' + selection.size + ' anchor=' + list.anchor + ' requests=' + requestText(list.endRequests) +
            ' submitted=' + list.submitted);
    });
    script.scrollTo(50000).wait(3).add(function () {
        report('select-anchor-kept', list.submitted < 100 && list.rows[3] !== undefined && list.rows[25000] === undefined,
            'submitted=' + list.submitted + ' anchorSubmitted=' + (list.rows[3] !== undefined));
    });
    script.withKey('ModShift', function (s) { s.click(50005); }).add(function () {
        rangeMs = list.applyMs;
        report('select-shift',
            selection.size === 50003 && selection.has(3) && selection.has(25000) && selection.has(50005) &&
            !selection.has(2) && !selection.has(50006) && requestText(list.endRequests).indexOf('setRange:true:3-50005:1') >= 0,
            'size=' + selection.size + ' requests=' + requestText(list.endRequests) + ' applyMs=' + round2(rangeMs));
    });
    script.withKey('ModCtrl', function (s) { s.click(50002); }).add(function () {
        report('select-ctrl-off', selection.size === 50002 && !selection.has(50002) && selection.has(50001) && selection.has(3),
            'size=' + selection.size + ' requests=' + requestText(list.endRequests) +
            ' toggled=' + list.toggled.slice(-1).join(','));
    });
    script.withKey('ModCtrl', function (s) { s.click(50010); }).add(function () {
        report('select-ctrl-on', selection.size === 50003 && selection.has(50010) && selection.has(25000),
            'size=' + selection.size + ' requests=' + requestText(list.endRequests));
        report('select-toggled', list.toggled.indexOf(50002) >= 0 && list.toggled.indexOf(50010) >= 0,
            'toggled=' + list.toggled.slice(-4).join(','));
    });
    script.click(50012).add(function () {
        report('select-replace', selection.size === 1 && selection.has(50012), 'size=' + selection.size);
    });
    script.scrollTo(100).wait(3).withKey('ModShift', function (s) { s.click(110); }).add(function () {
        report('select-shift-back',
            selection.size === 49903 && selection.has(110) && selection.has(50012) && !selection.has(109) &&
            requestText(list.endRequests).indexOf('setRange:true:110-50012:-1') >= 0,
            'size=' + selection.size + ' requests=' + requestText(list.endRequests));
    });
    script.add(function (ui) { ui.addKeyEvent(ui.Key.ModCtrl, true); }).wait(2).press('A')
        .add(function (ui) { ui.addKeyEvent(ui.Key.ModCtrl, false); }).wait(3).add(function () {
            report('select-all', selection.size === ROWS && selection.has(0) && selection.has(ROWS - 1),
                'size=' + selection.size + ' requests=' + requestText(list.beginRequests) + ' applyMs=' + round2(list.applyMs));
            list.frameMs = [];
            list.timing = true;
        }).wait(60).add(function () {
            list.timing = false;
            list.allSelectedMs = median(list.frameMs);
        });
    script.press('Escape').add(function () {
        report('select-escape', selection.size === 0, 'size=' + selection.size + ' requests=' + requestText(list.beginRequests));
        list.frameMs = [];
        list.timing = true;
    }).wait(60).add(function () {
        list.timing = false;
        var empty = median(list.frameMs);
        report('select-work', list.allSelectedMs <= Math.max(empty * 1.5, empty + 3),
            'listMs noneSelected=' + round2(empty) + ' allSelected=' + round2(list.allSelectedMs) + ' rangeApplyMs=' + round2(rangeMs));
    });
    script.scrollTo(0).click(7).withKey('ModShift', function (s) {
        s.press('DownArrow').press('DownArrow');
    }).add(function () {
        report('select-nav', ids(selection) === '7,8,9' && list.nav === 9, 'ids=' + ids(selection) + ' nav=' + list.nav);
    });
    script.setUp('clipper', function (f) { return f.NoSelectAll; }).click(5)
        .add(function (ui) { ui.addKeyEvent(ui.Key.ModCtrl, true); }).wait(2).press('A')
        .add(function (ui) { ui.addKeyEvent(ui.Key.ModCtrl, false); }).wait(3).add(function () {
            report('flag-no-select-all', ids(selection) === '5', 'ids=' + ids(selection));
        });
    script.press('Escape').add(function () {
        report('flag-no-clear-on-escape', ids(selection) === '5', 'ids=' + ids(selection));
    });
    script.setUp('clipper', function (f) { return f.NoRangeSelect; }).click(4)
        .withKey('ModShift', function (s) { s.click(8); }).add(function () {
            report('flag-no-range', ids(selection) === '8', 'ids=' + ids(selection));
        });
    script.setUp('clipper', function (f) { return f.SingleSelect; }).click(4)
        .withKey('ModCtrl', function (s) { s.click(8); }).add(function () {
            report('flag-single', ids(selection) === '8', 'ids=' + ids(selection));
        });
    script.setUp('two').wait(2).click('a1').click('b2').add(function () {
        report('two-scopes', ids(selection) === '1' && ids(list.second) === '2',
            'a=' + ids(selection) + ' b=' + ids(list.second));
    });
    script.setUp('checkbox').wait(2).clickAt(2, 12, 12).clickAt(4, 12, 12).add(function () {
        list.checkboxes = ids(selection);
    }).clickAt(2, 12, 12).add(function () {
        report('checkbox-toggle', list.checkboxes === '2,4' && ids(selection) === '4',
            'first=' + list.checkboxes + ' then=' + ids(selection));
    });
    script.setUp('clipper').scrollTo(0).add(finish);
}

function runMisuseChecks(script, session, finish) {
    list.misuse = {noBegin: '', toggledOutside: '', otherWindow: '', stillOpen: 'unset', leaveOpen: false, throwInside: false, leftOpen: 0};
    var errors = [];
    session.on('error', function (event) { errors.push(String(event.error)); });
    script.add(function () { list.mode = 'misuse'; }).wait(3).add(function () {
        var misuse = list.misuse;
        report('misuse-end', misuse.noBegin.indexOf('without a matching') >= 0, misuse.noBegin.slice(0, 90));
        report('misuse-toggled', misuse.toggledOutside.indexOf('outside a multi-select') >= 0, misuse.toggledOutside.slice(0, 90));
        report('misuse-other-window', misuse.otherWindow.indexOf('window of its beginMultiSelect') >= 0 && misuse.stillOpen === '',
            misuse.otherWindow.slice(0, 90) + ' stillOpen=' + misuse.stillOpen.slice(0, 60));
        misuse.leaveOpen = true;
    }).wait(120).add(function () {
        list.misuse.leaveOpen = false;
        list.misuse.throwInside = true;
    }).wait(5).add(function () { list.mode = 'clipper'; list.selection.clear(); }).wait(4).click(2).add(function () {
        report('misuse-recovered', !session.closed && list.misuse.leftOpen >= 100 && list.selection.size === 1 && errors.length === 1,
            'leftOpen=' + list.misuse.leftOpen + ' errors=' + errors.length + ' size=' + list.selection.size);
    });
    script.add(finish);
}

if (wanted('select')) {
    steps.push(function () {
        section('select');
        var script = new Script();
        var started = false;
        var realTap = null;
        var session = imgui.launchFloaty(function (ui, window) {
            if (list.selection === null) {
                list.selection = ui.selectionStorage();
                list.second = ui.selectionStorage();
                list.flags = ui.MultiSelectFlags.ClearOnEscape;
            }
            script.tick(ui);
            if (!started && script.idle()) {
                started = true;
                script.wait(10);
                runSelectChecks(ui, script, function (ui) {
                    runMisuseChecks(script, session, function () {
                        realTap = 'ready';
                    });
                });
            }
            fixedWindow(ui, 'Multi-select check', window.width * ui.dp(1), window.height * ui.dp(1), function () {
                drawList(ui);
            });
        }, {width: 340, height: 400, x: 8, y: 80, fps: 60, idleFps: 0, collapseButton: false, touchMode: imgui.TouchMode.Touchable});
        waitFor(function () { return realTap === 'ready' || session.closed; }, 120000, function (met) {
            if (!met || session.closed) {
                report('select', false, 'stopped: closed=' + session.closed + ' reason=' + session.closeReason +
                    ' steps left=' + script.steps.length);
                if (!session.closed) session.close('check-done');
                later(500, next);
                return;
            }
            var pos = list.rows[12];
            var loc = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
            session.surfaceView.getLocationOnScreen(loc);
            var x = Math.round(Number(loc[0]) + pos[0] + 60);
            var y = Math.round(Number(loc[1]) + pos[1] + 10);
            list.selection.clear();
            perform('tap ' + x + ' ' + y, function () {
                later(400, function () {
                    report('select-real-tap', ids(list.selection) === '12', 'ids=' + ids(list.selection));
                    session.close('check-done');
                    later(500, next);
                });
            });
        });
    });
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

function closeTo(a, b, tolerance) {
    return Math.abs(a - b) <= tolerance;
}

function alphaAt(session, x, y) {
    var image = session.capture();
    var alpha = colors.alpha(images.pixel(image, Math.round(x), Math.round(y)));
    image.recycle();
    return alpha;
}

function centerOf(panel) {
    return [Number(panel.position[0]) + Number(panel.size[0]) / 2, Number(panel.position[1]) + Number(panel.size[1]) / 2];
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

function runWindowChecks(api, session, finish) {
    var panels = session.panels;
    var counter = panels[0];
    var level = panels[1];
    var notes = panels[2];
    var dp = session.density;
    var title = 28 * dp;
    var fontSize = 16 * dp;
    var checks = [];

    function then(fn) { checks.push(fn); }
    function run() {
        var check = checks.shift();
        if (!check) {
            finish();
            return;
        }
        try {
            check(run);
        } catch (e) {
            report('window-step', false, String(e).slice(0, 200));
            run();
        }
    }
    function titleOf(panel) {
        return [Number(panel.position[0]) + 60 * dp, Number(panel.position[1]) + title / 2];
    }

    // The first frames have not reached the screen when the panels report, and all new windows count as focused in them.
    then(function (done) {
        later(500, done);
    });
    then(function (done) {
        var ok = true;
        var text = panels.map(function (panel) {
            ok = ok && closeTo(Number(panel.position[0]), panel.x * dp, 1) && closeTo(Number(panel.position[1]), panel.y * dp, 1);
            return panel.name + '@' + Math.round(Number(panel.position[0]) / dp) + ',' + Math.round(Number(panel.position[1]) / dp);
        }).join(' ');
        report('window-positions', ok, text);
        var alphas = panels.map(function (panel) {
            var center = centerOf(panel);
            return alphaAt(session, center[0], center[1]);
        });
        var gap = alphaAt(session, 2 * dp, 2 * dp);
        report('window-visible', alphas.every(function (a) { return a > 0; }) && gap === 0,
            'bodyAlpha=' + alphas.join(',') + ' gapAlpha=' + gap);
        report('window-focus-initial', notes.focused && !counter.focused && !level.focused,
            'focused=' + panels.filter(function (p) { return p.focused; }).map(function (p) { return p.name; }).join(','));
        done();
    });
    // Notes starts on top of Counter: a tap on the shared area goes to the window in front.
    var overlap = function () {
        return [Number(notes.position[0]) + 30 * dp, Number(counter.position[1]) + Number(counter.size[1]) - 20 * dp];
    };
    then(function (done) {
        var at = overlap();
        injectClick(api, at[0], at[1], function () {
            report('window-front-notes', notes.focused && !counter.focused, 'notes=' + notes.focused + ' counter=' + counter.focused);
            done();
        });
    });
    then(function (done) {
        var at = titleOf(counter);
        injectClick(api, at[0], at[1], function () {
            report('window-focus-tap', counter.focused && !notes.focused, 'counter=' + counter.focused + ' notes=' + notes.focused);
            done();
        });
    });
    then(function (done) {
        var at = overlap();
        injectClick(api, at[0], at[1], function () {
            report('window-front-counter', counter.focused && !notes.focused, 'counter=' + counter.focused + ' notes=' + notes.focused);
            done();
        });
    });
    // The arrow is at the left of the title bar, the close button at its right.
    then(function (done) {
        var expanded = Number(level.size[1]);
        var center = centerOf(level);
        var x = Number(level.position[0]) + 4 * dp + fontSize / 2;
        var y = Number(level.position[1]) + title / 2;
        injectClick(api, x, y, function () {
            later(200, function () {
                var alpha = alphaAt(session, center[0], center[1]);
                report('window-collapse', level.collapsed && Number(level.size[1]) < expanded / 2 && alpha === 0,
                    'collapsed=' + level.collapsed + ' height=' + Math.round(Number(level.size[1]) / dp) + ' bodyAlpha=' + alpha);
                injectClick(api, x, y, function () {
                    later(200, function () {
                        var back = alphaAt(session, center[0], center[1]);
                        report('window-expand', !level.collapsed && closeTo(Number(level.size[1]), expanded, 1) && back > 0,
                            'collapsed=' + level.collapsed + ' height=' + Math.round(Number(level.size[1]) / dp) + ' bodyAlpha=' + back);
                        done();
                    });
                });
            });
        });
    });
    then(function (done) {
        var center = centerOf(level);
        var x = Number(level.position[0]) + Number(level.size[0]) - 4 * dp - fontSize / 2;
        var y = Number(level.position[1]) + title / 2;
        var position = [Number(level.position[0]), Number(level.position[1])];
        injectClick(api, x, y, function () {
            later(200, function () {
                var alpha = alphaAt(session, center[0], center[1]);
                report('window-close', level.open.value === false && alpha === 0, 'open=' + level.open.value + ' bodyAlpha=' + alpha);
                level.open.value = true;
                later(300, function () {
                    var back = alphaAt(session, center[0], center[1]);
                    report('window-reopen', back > 0 && closeTo(Number(level.position[0]), position[0], 1),
                        'bodyAlpha=' + back + ' x=' + Math.round(Number(level.position[0]) / dp));
                    done();
                });
            });
        });
    });
    then(function (done) {
        var at = titleOf(notes);
        injectClick(api, at[0], at[1], function () {
            var loc = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
            session.surfaceView.getLocationOnScreen(loc);
            var from = titleOf(counter);
            perform('tap ' + Math.round(Number(loc[0]) + from[0]) + ' ' + Math.round(Number(loc[1]) + from[1]), function () {
                later(400, function () {
                    report('window-real-tap', counter.focused && !notes.focused, 'counter=' + counter.focused + ' notes=' + notes.focused);
                    done();
                });
            });
        });
    });
    then(function (done) {
        var loc = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
        session.surfaceView.getLocationOnScreen(loc);
        var from = titleOf(counter);
        var x1 = Math.round(Number(loc[0]) + from[0]);
        var y1 = Math.round(Number(loc[1]) + from[1]);
        var before = [Number(counter.position[0]), Number(counter.position[1])];
        var overlayBefore = [session.x, session.y];
        var moveBy = Math.round(30 * dp);
        perform('swipe ' + x1 + ' ' + y1 + ' ' + (x1 + moveBy) + ' ' + (y1 + moveBy), function () {
            later(500, function () {
                var movedX = Number(counter.position[0]) - before[0];
                var movedY = Number(counter.position[1]) - before[1];
                report('window-title-drag', movedX > moveBy / 2 && movedY > moveBy / 2 &&
                    session.x === overlayBefore[0] && session.y === overlayBefore[1],
                    'moved=' + Math.round(movedX / dp) + ',' + Math.round(movedY / dp) + ' dp overlayMoved=' +
                    (session.x - overlayBefore[0]) + ',' + (session.y - overlayBefore[1]));
                done();
            });
        });
    });
    then(function (done) {
        report('window-touch-regions', session.interactiveRegionCount === 4, 'regions=' + session.interactiveRegionCount);
        done();
    });
    run();
}

if (wanted('window')) {
    steps.push(function () {
        section('window');
        var session = imgui.runExample('multi-window', {});
        waitFor(function () {
            return session.panels != null && session.panels.every(function (p) { return p.position != null; });
        }, 10000, function (ready) {
            if (!ready) {
                report('window-start', false, 'closed=' + session.closed + ' reason=' + session.closeReason);
                if (!session.closed) session.close('check-done');
                later(300, next);
                return;
            }
            report('window-start', true, 'surface=' + session.width + 'x' + session.height + ' dp');
            session.setIdleFps(0);
            runWindowChecks(pluginApi, session, function () {
                session.close('check-done');
                later(500, next);
            });
        });
    });
    steps.push(function () {
        perform('main-activity', function () {
            later(1500, function () {
                var session = imgui.runExample('multi-window', {activity: true, autoCloseMs: 3000});
                waitFor(function () {
                    return session.closed || (session.panels != null && session.panels.every(function (p) { return p.position != null; }));
                }, 8000, function () {
                    var drawn = session.panels != null && session.panels.every(function (p) { return p.position != null; });
                    report('window-activity', drawn, 'surface=' + session.width + 'x' + session.height + ' dp closed=' + session.closed);
                    waitFor(function () { return session.closed; }, 6000, function () {
                        report('window-activity-close', session.closeReason === 'example-timeout', 'reason=' + session.closeReason);
                        if (!session.closed) session.close('check-done');
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
        var hasWindow = names.indexOf('multi-window') >= 0;
        var largeList = String(imgui.getExampleSource('large-list'));
        report('example-list', total === 10 && hasWindow && largeList.indexOf('beginMultiSelect') >= 0,
            'length=' + total + ' multiWindow=' + hasWindow);
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
    steps.push(function () {
        var session = imgui.runExample('large-list', {multiSelect: true, width: 440, height: 520, autoCloseMs: 6000});
        var api = pluginApi;
        session.on('error', function (event) {
            report('large-list-multi', false, String(event.error).slice(0, 120));
        });
        // The rows start below the title bar and four lines of controls, the middle of the window is in the list.
        var dp = session.density;
        var x = 200 * dp;
        var first = 260 * dp;
        var second = 340 * dp;
        later(800, function () {
            injectClick(api, x, first, function () {
                api.addKeyEvent(api.Key.ModShift, true);
                later(150, function () {
                    injectClick(api, x, second, function () {
                        api.addKeyEvent(api.Key.ModShift, false);
                        later(200, function () {
                            var selection = session.selection;
                            report('large-list-multi', selection.size >= 2 && !session.closed, 'selected=' + selection.size);
                            session.close('check-done');
                            later(500, next);
                        });
                    });
                });
            });
        });
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


def perform(serial: str, request: str) -> str:
    """Runs what the device script asked for and leaves the acknowledgement file it waits for."""
    words = request.split(" ")
    if words[0] == "main-activity":
        result = adb(serial, "shell", "am", "start", "-n", PACKAGE + "/" + LAUNCHER_ACTIVITY)
        note = "am start launcher " + ("ok" if result.returncode == 0 else result.stderr.strip()[:120])
    elif words[0] in ("tap", "swipe"):
        # MIUI uses the first touch of a dimmed screen to light it up: a key press counts as activity without touching.
        adb(serial, "shell", "input", "keyevent", "KEYCODE_SHIFT_LEFT")
        time.sleep(0.2)
        result = adb(serial, "shell", "input", *words, *(["400"] if words[0] == "swipe" else []))
        note = request + (" ok" if result.returncode == 0 else " " + result.stderr.strip()[:120])
    else:
        note = "unknown action " + request
    adb(serial, "shell", "touch", DEVICE_DIR + "/ack-" + words[0])
    return note


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-s", "--serial", required=True)
    parser.add_argument("--only", default=",".join(ALL_SECTIONS), help="sections to run, separated by commas")
    parser.add_argument("--timeout", type=float, default=300)
    parser.add_argument("--keep", action="store_true", help="keep the pushed script and the local copy")
    args = parser.parse_args()

    only = [name for name in args.only.split(",") if name]
    unknown = [name for name in only if name not in ALL_SECTIONS]
    if unknown:
        parser.error("unknown sections: " + ",".join(unknown))
    if "mWakefulness=Awake" not in adb(args.serial, "shell", "dumpsys", "power").stdout:
        print("SETUP the screen is off: turn it on and unlock the device first")
        return 2

    local = pathlib.Path(__file__).resolve().parent / "device_r6_check.generated.js"
    source = SCRIPT.replace("__ONLY__", json.dumps(only)).replace("__DEVICE_DIR__", DEVICE_DIR)
    local.write_text(source, encoding="utf-8")
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
            if line.startswith(MARK + " action "):
                print("action " + perform(args.serial, line[len(MARK + " action "):]), flush=True)
                continue
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
