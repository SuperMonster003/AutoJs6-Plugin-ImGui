#!/usr/bin/env python3
"""Checks the R2 (v1.13.0) behavior of the ImGui plugin on a device through the AutoJs6 global `imgui`.

Usage: py -3.12 -I tools/device_r2_check.py -s SERIAL [--timeout 240] [--skip-screen | --manual-unlock] [--keep]

Needs AutoJs6 (debug or release, with the `imgui` module) and the plugin installed, enabled and trusted, the overlay
permission for AutoJs6, the screen on and unlocked, and no one touching the device while it runs. Pushes one script,
runs it through RunIntentActivity and prints one line per check, PASS / FAIL with the key values. The script asks
for the inputs it cannot make itself (an "action" line): this tool then injects a tap on the window (after a Shift
key, see perform; sent again when no input arrived, at most 3 times: tapAttempts of idle-wake), turns the screen
off (keyevent 26) or wakes and
unlocks it (keyevent 224, a swipe up and `wm dismiss-keyguard`). A device with a secure lock screen skips the
screen checks (SKIP), since unlocking it needs the owner; with --manual-unlock this tool only wakes the screen and
the owner unlocks the device within 2 minutes. The screen checks run last.

- list-*: ui.listClipper over 100000 rows in a child window submits only the visible rows (with and without
  options.itemHeight), keeps options.includeItems submitted while they are out of view and ignores indices outside
  the list, and follows setScrollY to row 50000 and to the end. list-work measures the work time of the frame
  (session._workTime, what statsOverlay shows) frame by frame in turn for an empty child, the visible rows as a plain
  loop, a clipper over only the visible rows and the clipper over 100000 rows: the 100000 rows may cost at most
  1 ms (or 15 %) more than the visible rows alone.
  list-work-5ms wants the median <= 5 ms; on a debuggable host, whose script engine runs mostly in the ART
  interpreter, it is a SKIP with the numbers.
- texture-*: 100 consecutive texture.update calls with generated bitmaps of the same size keep the handle, raise no
  OpenGL error (the native side checks glGetError after each upload and throws), keep the texture count, the native
  heap and the graphics memory flat and the update and frame times stable; an update with another size reallocates
  under the same handle. The times are divided by the time the same frame took to draw its bitmap before they are
  compared: 63751f63 switches its CPU between two speeds every few seconds, which doubles every time at once.
- idle-*: with the defaults (idleFps 10, idleDelay 3000) the session raises idle after 3 s without input and renders
  at 10 fps (+-2); getFps / setFps follow; a tap on the window raises active (reason input) and the frame that sees
  the tap is already at the full rate, within one frame interval of the input.
- screen-*: keyevent 26 stops the frames within 2 s (session.paused, getFps() 0); the screen on behind the keyguard
  draws nothing; waking and unlocking resumes the full rate.
- examples: listExamples() has 9 entries and each one (background-task with its worker running) starts and closes
  on its timer.
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

DEVICE_DIR = "/sdcard/Download/aj6-imgui-r2"
RUN_ACTIVITY = "org.autojs.autojs.external.open.RunIntentActivity"
PACKAGE = "org.autojs.autojs6"
MARK = "AJ6R2"
NATIVE_LOG_TAG = "AutoJs6-ImGui"

SCRIPT = r"""
var MARK = 'AJ6R2';
var SKIP_SCREEN = __SKIP_SCREEN__;
var MANUAL_UNLOCK = __MANUAL_UNLOCK__;
var failed = 0;
var Context = android.content.Context;

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

function nowMs() {
    return java.lang.System.nanoTime() / 1e6;
}

function round2(value) {
    return typeof value === 'number' ? Math.round(value * 100) / 100 : value;
}

function percentile(values, p) {
    if (values.length === 0) return NaN;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function interactive() {
    return Boolean(context.getSystemService(Context.POWER_SERVICE).isInteractive());
}

function keyguardLocked() {
    return Boolean(context.getSystemService(Context.KEYGUARD_SERVICE).isKeyguardLocked());
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

// The rows a frame submitted, from its [start, end) ranges.
function covers(ranges, index) {
    return ranges.some(function (r) { return r[0] <= index && index < r[1]; });
}

function submitted(ranges) {
    return ranges.reduce(function (sum, r) { return sum + (r[1] - r[0]); }, 0);
}

function rangesText(ranges) {
    return ranges.map(function (r) { return r[0] + '-' + r[1]; }).join(',');
}

steps.push(function () {
    section('list');
    var ROWS = 100000;
    var phases = [
        {name: 'top', frames: 12, includeItems: null, itemHeight: true, scroll: 0},
        {name: 'measured', frames: 12, includeItems: null, itemHeight: false, scroll: null},
        {name: 'include', frames: 12, includeItems: [77777, -5, 100000, 99999], itemHeight: true, scroll: null},
        {name: 'jump', frames: 15, includeItems: null, itemHeight: true, scroll: 50000},
        {name: 'end', frames: 15, includeItems: null, itemHeight: true, scroll: 'max'},
        {name: 'work', frames: 4 * 150, includeItems: null, itemHeight: true, scroll: null}
    ];
    // The work phase draws, frame by frame in turn, an empty child, the rows the clipper shows as a plain loop, the
    // same rows through listClipper over only that many rows and the 100000 rows through listClipper (scrolled to
    // row 30000), each in its own child, so that CPU frequency changes hit them alike.
    var WORK_MODES = ['empty', 'plain', 'small', 'clip'];
    var phaseIndex = 0;
    var phaseFrame = 0;
    var results = {};
    var workTimes = {empty: [], plain: [], small: [], clip: []};
    var lastWorkMode = null;
    var error = null;
    var session = null;
    var debuggableHost = (context.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) !== 0;

    session = imgui.createWindow(function (ui) {
        if (error != null || phaseIndex >= phases.length) return;
        var phase = phases[phaseIndex];
        // _workTime is the work of the previous frame; the first rounds settle the scroll of the clipper's child.
        if (phase.name === 'work' && lastWorkMode != null && phaseFrame > 30 && session != null) {
            workTimes[lastWorkMode].push(session._workTime);
        }
        ui.setNextWindowPos(0, 0, ui.Cond.Always);
        ui.setNextWindowSize(ui.dp(280), ui.dp(380), ui.Cond.Always);
        try {
            ui.withWindow('R2 list', null, 0, function () {
                if (phase.name === 'work') {
                    var mode = WORK_MODES[phaseFrame % WORK_MODES.length];
                    lastWorkMode = mode;
                    ui.withChild('work-' + mode, 0, 0, true, 0, function () {
                        var rowHeight = ui.getTextLineHeightWithSpacing();
                        var rows = Math.ceil(Number(ui.getWindowSize()[1]) / rowHeight);
                        if (mode === 'empty') {
                            ui.text('empty');
                        } else if (mode === 'plain') {
                            for (var p = 0; p < rows; p += 1) ui.selectable('Row ' + p + '##r' + p, p === 0);
                        } else {
                            if (mode === 'clip' && phaseFrame < WORK_MODES.length) ui.setScrollY(30000 * rowHeight);
                            ui.listClipper(mode === 'clip' ? ROWS : rows, {itemHeight: rowHeight}, function (start, end) {
                                for (var i = start; i < end; i += 1) ui.selectable('Row ' + i + '##r' + i, i === 0);
                            });
                        }
                    });
                    return;
                }
                ui.withChild('rows', 0, 0, true, 0, function () {
                    var rowHeight = ui.getTextLineHeightWithSpacing();
                    if (phaseFrame === 0 && phase.scroll != null) {
                        ui.setScrollY(phase.scroll === 'max' ? ui.getScrollMaxY() : phase.scroll * rowHeight);
                    }
                    if (phase.scroll === 'max' && phaseFrame === 5) ui.setScrollY(ui.getScrollMaxY());
                    var options = {};
                    if (phase.itemHeight) options.itemHeight = rowHeight;
                    if (phase.includeItems) options.includeItems = phase.includeItems;
                    var ranges = [];
                    ui.listClipper(ROWS, options, function (start, end) {
                        ranges.push([start, end]);
                        for (var i = start; i < end; i += 1) {
                            ui.selectable('Row ' + i + '##r' + i, i === 0);
                        }
                    });
                    results[phase.name] = {
                        ranges: ranges, rowHeight: rowHeight, scrollY: ui.getScrollY(), scrollMaxY: ui.getScrollMaxY(),
                        height: Number(ui.getWindowSize()[1])
                    };
                });
            });
        } catch (e) {
            error = String(e).slice(0, 200);
        }
        phaseFrame += 1;
        if (phaseFrame >= phase.frames) {
            phaseIndex += 1;
            phaseFrame = 0;
        }
    }, {x: 20, y: 120, width: 300, height: 400, fps: 60, idleFps: 0, contentAutoResize: false});

    waitFor(function () { return session.closed || error != null || phaseIndex >= phases.length; }, 45000, function () {
        if (error != null || phaseIndex < phases.length) {
            report('list', false, 'error=' + error + ' phase=' + phaseIndex + ' closed=' + session.closed);
            session.close('done');
            next();
            return;
        }
        var top = results.top;
        var visible = Math.ceil(top.height / top.rowHeight);
        var topOk = top.ranges.length >= 1 && top.ranges[0][0] === 0 && covers(top.ranges, visible - 2) &&
            submitted(top.ranges) <= visible + 3 && !covers(top.ranges, visible + 5);
        report('list-visible', topOk, 'rowHeight=' + round2(top.rowHeight) + ' childHeight=' + round2(top.height) +
            ' visible~' + visible + ' ranges=' + rangesText(top.ranges) + ' submitted=' + submitted(top.ranges));

        var measured = results.measured;
        var measuredOk = covers(measured.ranges, 0) && covers(measured.ranges, visible - 2) &&
            submitted(measured.ranges) <= visible + 4 && !covers(measured.ranges, visible + 5);
        report('list-measured', measuredOk, 'ranges=' + rangesText(measured.ranges) + ' submitted=' + submitted(measured.ranges));

        var include = results.include;
        var includeOk = covers(include.ranges, 0) && covers(include.ranges, 77777) && covers(include.ranges, 99999) &&
            !covers(include.ranges, 77776) && !covers(include.ranges, 77778) &&
            submitted(include.ranges) <= visible + 5 && !covers(results.top.ranges, 77777);
        report('list-include', includeOk, 'ranges=' + rangesText(include.ranges) + ' submitted=' + submitted(include.ranges));

        var jump = results.jump;
        var jumpStart = Math.min.apply(null, jump.ranges.map(function (r) { return r[0]; }));
        var contentHeight = ROWS * jump.rowHeight;
        var jumpOk = covers(jump.ranges, 50000) && jumpStart >= 49998 && jumpStart <= 50000 &&
            Math.abs(jump.scrollY - 50000 * jump.rowHeight) <= jump.rowHeight &&
            Math.abs(jump.scrollMaxY - (contentHeight - jump.height)) <= 3 * jump.rowHeight;
        report('list-scroll', jumpOk, 'ranges=' + rangesText(jump.ranges) + ' scrollY=' + round2(jump.scrollY) +
            ' scrollMaxY=' + round2(jump.scrollMaxY) + ' content=' + round2(contentHeight));

        var end = results.end;
        var lastEnd = Math.max.apply(null, end.ranges.map(function (r) { return r[1]; }));
        report('list-end', covers(end.ranges, 99999) && lastEnd === ROWS && Math.abs(end.scrollY - end.scrollMaxY) <= 1,
            'ranges=' + rangesText(end.ranges) + ' scrollY=' + round2(end.scrollY) + ' scrollMaxY=' + round2(end.scrollMaxY));

        function stats(mode) {
            var values = workTimes[mode];
            return mode + ' median=' + round2(percentile(values, 0.5)) + ' p90=' + round2(percentile(values, 0.9));
        }
        var clipMedian = percentile(workTimes.clip, 0.5);
        var smallMedian = percentile(workTimes.small, 0.5);
        var emptyMedian = percentile(workTimes.empty, 0.5);
        var workDetail = 'frames=' + workTimes.clip.length + ' workTime ' + stats('empty') + ', ' + stats('plain') + ', ' +
            stats('small') + ', ' + stats('clip') + ' ms';
        // 100000 rows through the clipper cost what a clipper over the visible rows alone costs.
        report('list-work', workTimes.clip.length >= 100 && clipMedian <= smallMedian + Math.max(1, smallMedian * 0.15),
            workDetail);
        if (clipMedian <= 5) {
            report('list-work-5ms', true, 'clip median=' + round2(clipMedian) + ' ms');
        } else if (debuggableHost) {
            // A debuggable host runs the script engine mostly in the ART interpreter: the empty child alone is slower.
            skip('list-work-5ms', 'debuggable host: clip median=' + round2(clipMedian) + ' ms, empty child median=' +
                round2(emptyMedian) + ' ms; check with a release host');
        } else {
            report('list-work-5ms', false, 'clip median=' + round2(clipMedian) + ' ms, empty child median=' + round2(emptyMedian) + ' ms');
        }
        session.close('done');
        later(500, next);
    });
});

steps.push(function () {
    section('texture');
    var Bitmap = android.graphics.Bitmap;
    var Canvas = android.graphics.Canvas;
    var Debug = android.os.Debug;
    var UPDATES = 100;

    function generated(n, width, height) {
        var bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        var canvas = new Canvas(bitmap);
        // drawRGB: drawColor also takes a long since Android 10, and Rhino may pick that overload for a number.
        canvas.drawRGB((n * 37) % 256, (n * 11) % 256, 128);
        return bitmap;
    }

    function memory() {
        java.lang.System.gc();
        java.lang.System.runFinalization();
        java.lang.System.gc();
        var info = new Debug.MemoryInfo();
        Debug.getMemoryInfo(info);
        var graphics = Number(info.getMemoryStat('summary.graphics'));
        return {native: Number(Debug.getNativeHeapAllocatedSize()) / 1024, graphics: isFinite(graphics) ? graphics : -1};
    }

    var texture = null;
    var handle = null;
    var phase = 'create';
    var updates = 0;
    var updateTimes = [];
    var workTimes = [];
    var drawTimes = [];
    var handles = {};
    var errors = [];
    var resize = null;
    var session = null;

    session = imgui.createWindow(function (ui) {
        if (phase === 'create') {
            var first = generated(0, 256, 256);
            try {
                texture = ui.createTexture(first);
                handle = texture.handle;
            } catch (e) {
                errors.push('create ' + String(e).slice(0, 120));
            } finally {
                first.recycle();
            }
            phase = 'warm';
        } else if (phase === 'update' && updates < UPDATES) {
            // The work time of the frame before, the one of update (updates - 1): workTimes[k] goes with drawTimes[k].
            if (session != null && updates > 0) workTimes.push(session._workTime);
            var drawStartedAt = nowMs();
            var bitmap = generated(updates + 1, 256, 256);
            var startedAt = nowMs();
            drawTimes.push(startedAt - drawStartedAt);
            try {
                texture.update(bitmap);
                handles[texture.handle] = true;
            } catch (e) {
                errors.push('update ' + updates + ' ' + String(e).slice(0, 120));
            } finally {
                bitmap.recycle();
            }
            updateTimes.push(nowMs() - startedAt);
            updates += 1;
        } else if (phase === 'resize') {
            var small = generated(999, 128, 64);
            try {
                var sameObject = texture.update(small) === texture;
                var shrunk = [texture.handle, texture.width, texture.height];
                var big = generated(1000, 256, 256);
                try {
                    texture.update(big);
                } finally {
                    big.recycle();
                }
                resize = {sameObject: sameObject, shrunk: shrunk, restored: [texture.handle, texture.width, texture.height]};
            } catch (e) {
                errors.push('resize ' + String(e).slice(0, 120));
                resize = {error: true};
            } finally {
                small.recycle();
            }
            phase = 'done';
        }
        ui.setNextWindowPos(0, 0, ui.Cond.Always);
        ui.setNextWindowSize(ui.dp(200), ui.dp(220), ui.Cond.Always);
        ui.withWindow('R2 texture', null, 0, function () {
            ui.text('updates ' + updates);
            if (texture != null) ui.image(texture, ui.dp(128), ui.dp(128));
        });
    }, {x: 20, y: 120, width: 220, height: 240, fps: 60, idleFps: 0, contentAutoResize: false});

    waitFor(function () { return session.closed || (session.ready && phase === 'warm'); }, 15000, function () {
        later(800, function () {
            var before = memory();
            var countBefore = session._textures.length;
            phase = 'update';
            waitFor(function () { return session.closed || updates >= UPDATES; }, 30000, function () {
                later(500, function () {
                    var after = memory();
                    var countAfter = session._textures.length;
                    var handleList = Object.keys(handles);
                    report('texture-update', errors.length === 0 && updates === UPDATES && handleList.length === 1 &&
                        String(handleList[0]) === String(handle),
                        'updates=' + updates + ' handles=' + handleList.join(',') + ' errors=' + errors.length +
                        (errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''));
                    var nativeGrowth = after.native - before.native;
                    var graphicsGrowth = before.graphics >= 0 && after.graphics >= 0 ? after.graphics - before.graphics : null;
                    report('texture-memory', countAfter === countBefore && nativeGrowth <= 4096 &&
                        (graphicsGrowth == null || graphicsGrowth <= 1024),
                        'textures=' + countBefore + '->' + countAfter + ' nativeHeapKb=' + Math.round(before.native) + '->' +
                        Math.round(after.native) + ' graphicsKb=' + (graphicsGrowth == null ? 'n/a' : before.graphics + '->' + after.graphics));
                    // Each time over the bitmap drawing of its frame, so that a CPU speed change cancels out.
                    function relative(times) {
                        return times.map(function (time, k) { return time / Math.max(drawTimes[k], 0.01); });
                    }
                    var updateRatios = relative(updateTimes);
                    var workRatios = relative(workTimes);
                    var firstUpdates = percentile(updateRatios.slice(0, 20), 0.5);
                    var lastUpdates = percentile(updateRatios.slice(-20), 0.5);
                    var firstWork = percentile(workRatios.slice(0, 20), 0.5);
                    var lastWork = percentile(workRatios.slice(-20), 0.5);
                    report('texture-timing', lastUpdates <= firstUpdates * 1.5 && lastWork <= firstWork * 1.5,
                        'update/draw median first20=' + round2(firstUpdates) + ' last20=' + round2(lastUpdates) +
                        ', workTime/draw first20=' + round2(firstWork) + ' last20=' + round2(lastWork) +
                        '; update ms median first20=' + round2(percentile(updateTimes.slice(0, 20), 0.5)) + ' last20=' +
                        round2(percentile(updateTimes.slice(-20), 0.5)) + ' max=' + round2(Math.max.apply(null, updateTimes)) +
                        ', draw ms median first20=' + round2(percentile(drawTimes.slice(0, 20), 0.5)) + ' last20=' +
                        round2(percentile(drawTimes.slice(-20), 0.5)));
                    phase = 'resize';
                    waitFor(function () { return session.closed || phase === 'done'; }, 5000, function () {
                        var ok = resize != null && !resize.error && resize.sameObject &&
                            String(resize.shrunk[0]) === String(handle) && resize.shrunk[1] === 128 && resize.shrunk[2] === 64 &&
                            String(resize.restored[0]) === String(handle) && resize.restored[1] === 256 && resize.restored[2] === 256;
                        report('texture-resize', ok, resize == null ? 'no resize frame' :
                            'shrunk=' + resize.shrunk + ' restored=' + resize.restored + ' sameObject=' + resize.sameObject);
                        session.close('done');
                        later(500, next);
                    });
                });
            });
        });
    });
});

steps.push(function () {
    section('idle');
    var frames = [];
    var events = {idle: [], active: []};
    var clickFrame = null;
    var tapRequestedAt = 0;
    var createdAt = Date.now();
    var session = null;

    session = imgui.createWindow(function (ui) {
        var at = Date.now();
        frames.push(at);
        var clicked = tapRequestedAt > 0 && clickFrame == null && (ui.isMouseClicked(0) || ui.isMouseDown(0));
        if (clicked) clickFrame = {at: at, idle: session.idle, fps: session.getFps()};
        ui.setNextWindowPos(0, 0, ui.Cond.Always);
        ui.setNextWindowSize(ui.dp(250), ui.dp(190), ui.Cond.Always);
        ui.withWindow('R2 idle', null, 0, function () {
            ui.text('frames ' + frames.length);
            ui.text(session != null && session.idle ? 'idle' : 'active');
        });
    }, {
        x: 20, y: 120, width: 260, height: 200, fps: 60, contentAutoResize: false,
        onIdle: function (event) { events.idle.push(event); },
        onActive: function (event) { events.active.push(event); }
    });

    function framesBetween(from, to) {
        return frames.filter(function (t) { return t >= from && t < to; }).length;
    }

    report('idle-defaults', session.idleFps === 10 && session.idleDelay === 3000 && session.fps === 60 && session.getFps() === 60,
        'idleFps=' + session.idleFps + ' idleDelay=' + session.idleDelay + ' fps=' + session.fps + ' getFps=' + session.getFps());

    later(7000, function () {
        var idle = events.idle[0];
        var idleAfter = idle ? idle.timestamp - createdAt : -1;
        var idleFrom = idle ? idle.timestamp + 500 : 0;
        var count = idle ? framesBetween(idleFrom, idleFrom + 3000) : 0;
        var rate = count / 3;
        report('idle-rate', idle != null && idle.fps === 10 && idle.idleDelay === 3000 && session.idle &&
            session.getFps() === 10 && idleAfter >= 2900 && idleAfter <= 4500 && rate >= 8 && rate <= 12,
            'idleAfterMs=' + idleAfter + ' event.fps=' + (idle && idle.fps) + ' getFps=' + session.getFps() + ' fps=' + round2(rate) +
            ' (' + count + ' frames in 3 s)');

        var loc = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
        session.surfaceView.getLocationOnScreen(loc);
        var tapX = Number(loc[0]) + Math.round(Number(session.surfaceView.getWidth()) / 2);
        var tapY = Number(loc[1]) + Math.round(Number(session.surfaceView.getHeight()) / 2);
        var activeBefore = events.active.length;
        var tapAttempts = 0;
        function requestTap() {
            tapAttempts += 1;
            tapRequestedAt = Date.now();
            action('tap ' + tapX + ' ' + tapY + ' ' + tapAttempts);
        }
        requestTap();
        // An injected tap can reach no window at all (no event, no touch; on 968e9f18 a dimmed display takes the
        // first touch, which the tool now prevents): the tap is sent again, at most 3 times, while the session stays idle.
        var retry = setInterval(function () {
            if (session.closed || events.active.length > activeBefore || tapAttempts >= 3) {
                clearInterval(retry);
                return;
            }
            requestTap();
        }, 2500);
        waitFor(function () { return session.closed || (events.active.length > activeBefore && clickFrame != null); }, 15000, function () {
            clearInterval(retry);
            var active = events.active[activeBefore];
            later(1000, function () {
                // The active event is raised when the input arrives (the armed wake); the first frame after it must
                // follow within one frame interval, and the frame that sees the tap must already run at the full rate.
                var firstFrame = active ? frames.filter(function (t) { return t >= active.timestamp; })[0] : undefined;
                var toFrame = firstFrame != null ? firstFrame - active.timestamp : NaN;
                var toClick = active && clickFrame ? clickFrame.at - active.timestamp : NaN;
                var after = active ? framesBetween(active.timestamp, active.timestamp + 1000) : 0;
                report('idle-wake', active != null && active.reason === 'input' && active.fps === 60 && toFrame <= 1000 / 60 + 10 &&
                    clickFrame != null && !clickFrame.idle && toClick >= 0 && toClick <= 2 * 1000 / 60 + 10 && after >= 40,
                    'reason=' + (active && active.reason) + ' inputToFrameMs=' + toFrame + ' inputToClickFrameMs=' + toClick +
                    ' clickFrameIdle=' + (clickFrame && clickFrame.idle) + ' framesNext1s=' + after + ' tap=' + tapX + ',' + tapY +
                    ' tapAttempts=' + tapAttempts + ' touchable=' + session.touchable);

                var fpsChecks = [];
                session.setFps(30);
                fpsChecks.push(session.getFps() === 30 && session.fps === 30);
                session.setFps(60);
                session.setIdleFps(20, 1000);
                fpsChecks.push(session.idleFps === 20 && session.idleDelay === 1000);
                later(2500, function () {
                    var idle20 = session.idle && session.getFps() === 20;
                    var lastIdle = events.idle[events.idle.length - 1];
                    var from = lastIdle ? lastIdle.timestamp + 300 : 0;
                    var rate20 = lastIdle ? framesBetween(from, from + 1000) : 0;
                    session.setIdleFps(10, 3000);
                    report('idle-api', fpsChecks.every(Boolean) && idle20 && lastIdle && lastIdle.fps === 20 && rate20 >= 16 && rate20 <= 24,
                        'setFps=' + fpsChecks[0] + ' setIdleFps=' + fpsChecks[1] + ' idleAt20=' + idle20 + ' fps=' + rate20);
                    session.close('done');
                    later(500, next);
                });
            });
        });
    });
});

// Last, since a device with a secure lock screen stays locked until its owner unlocks it.
function screenChecks() {
    section('screen');
    var keyguard = context.getSystemService(Context.KEYGUARD_SERVICE);
    if (SKIP_SCREEN) {
        skip('screen', 'skipped by --skip-screen');
        next();
        return;
    }
    var secure = Boolean(keyguard.isDeviceSecure());
    if (secure && !MANUAL_UNLOCK) {
        skip('screen', 'the device has a secure lock screen: run with --manual-unlock while its owner can unlock it');
        next();
        return;
    }
    var frames = [];
    var session = imgui.createWindow(function (ui) {
        frames.push(Date.now());
        ui.setNextWindowPos(0, 0, ui.Cond.Always);
        ui.setNextWindowSize(ui.dp(250), ui.dp(190), ui.Cond.Always);
        ui.withWindow('R2 screen', null, 0, function () {
            ui.text('frames ' + frames.length);
        });
    }, {x: 20, y: 120, width: 260, height: 200, fps: 60, contentAutoResize: false});

    function framesBetween(from, to) {
        return frames.filter(function (t) { return t >= from && t < to; }).length;
    }

    var offAt = 0;
    later(1500, function () {
        action('screen-off');
    });
    waitFor(function () { return !interactive(); }, 12000, function (off) {
        offAt = Date.now();
        if (!off) {
            report('screen-off', false, 'the screen stayed on');
            session.close('done');
            later(500, next);
            return;
        }
        later(3500, function () {
            var lastFrame = frames.length ? frames[frames.length - 1] : 0;
            var stoppedAfter = lastFrame - offAt;
            var trailing = framesBetween(offAt + 2000, Date.now());
            report('screen-off', session.paused && session.getFps() === 0 && stoppedAfter <= 2000 && trailing === 0,
                'paused=' + session.paused + ' getFps=' + session.getFps() + ' lastFrameAfterOffMs=' + stoppedAfter +
                ' framesAfter2s=' + trailing + ' keyguardLocked=' + keyguardLocked());
            action(secure ? 'wake-manual' : 'wake');
            var wokeAt = 0;
            var lockedOnWake = false;
            waitFor(function () {
                if (wokeAt === 0 && interactive()) {
                    wokeAt = Date.now();
                    lockedOnWake = keyguardLocked();
                }
                return interactive() && !keyguardLocked();
            }, secure ? 120000 : 20000, function (unlocked) {
                var unlockedAt = Date.now();
                if (lockedOnWake) {
                    // The screen is on but the keyguard is up: the window is not shown, so the loop stays paused.
                    var lockedFrames = framesBetween(wokeAt + 200, unlockedAt);
                    report('screen-locked', lockedFrames === 0, 'framesWhileLocked=' + lockedFrames + ' lockedMs=' + (unlockedAt - wokeAt));
                } else {
                    skip('screen-locked', 'the keyguard was not up when the screen turned on');
                }
                if (!unlocked) {
                    report('screen-resume', false, 'not unlocked: interactive=' + interactive() + ' keyguardLocked=' + keyguardLocked());
                    session.close('done');
                    later(500, next);
                    return;
                }
                later(2000, function () {
                    var firstAfter = frames.filter(function (t) { return t >= unlockedAt; })[0];
                    var resumeDelay = firstAfter ? firstAfter - unlockedAt : -1;
                    var count = firstAfter ? framesBetween(firstAfter, firstAfter + 1000) : 0;
                    report('screen-resume', !session.paused && session.getFps() === 60 && firstAfter != null && resumeDelay <= 1000 && count >= 40,
                        'paused=' + session.paused + ' getFps=' + session.getFps() + ' firstFrameAfterUnlockMs=' + resumeDelay +
                        ' framesNext1s=' + count);
                    session.close('done');
                    later(500, next);
                });
            });
        });
    });
}

steps.push(function () {
    section('examples');
    var names = imgui.listExamples().map(function (e) { return String(e && e.name !== undefined ? e.name : e); });
    var total = names.length;
    report('example-list', total === 9 && names.indexOf('large-list') >= 0 && names.indexOf('texture-refresh') >= 0,
        'length=' + total);
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

steps.push(screenChecks);

next();
"""


def adb(serial: str, *args: str, check: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["adb", "-s", serial, *args], capture_output=True, text=True, encoding="utf-8",
                          errors="replace", check=check)


def stream_logcat(serial: str) -> tuple[subprocess.Popen[str], queue.Queue[str]]:
    """Follows the console and the native log of the plugin as they are written.

    Polling `logcat -d` lags by seconds on a busy device, and another session clearing the buffer loses lines;
    a stream sees each line once, at once.
    """
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


def screen_size(serial: str) -> tuple[int, int]:
    out = adb(serial, "shell", "wm", "size").stdout
    sizes = re.findall(r"(\d+)x(\d+)", out)
    width, height = sizes[-1] if sizes else ("1080", "2400")
    return int(width), int(height)


def perform(serial: str, request: str) -> str:
    """Runs an input the device script asked for and returns a short note."""
    words = request.split()
    if words[0] == "tap":
        # After 2 minutes without user activity the display dims (stay awake while charging keeps it on), and MIUI
        # (968e9f18) spends the first touch on a dimmed display on brightening it: the tap reaches no window. A Shift
        # key ends the dimming first; it goes to the focused window (the launcher), never to the overlay, which only
        # takes focus for text input. KEYCODE_WAKEUP does not count as user activity on an awake display.
        adb(serial, "shell", "input", "keyevent", "KEYCODE_SHIFT_LEFT")
        time.sleep(0.3)
        result = adb(serial, "shell", "input", "tap", words[1], words[2])
        return "tap " + ("ok" if result.returncode == 0 and not result.stderr.strip() else result.stderr.strip()[:120])
    if words[0] == "screen-off":
        adb(serial, "shell", "input", "keyevent", "26")
        return "keyevent 26"
    if words[0] == "wake-manual":
        adb(serial, "shell", "input", "keyevent", "224")
        print("UNLOCK the screen is on behind the lock screen: unlock the device within 2 minutes", flush=True)
        return "keyevent 224, waiting for the owner"
    if words[0] == "wake":
        adb(serial, "shell", "input", "keyevent", "224")
        time.sleep(1.0)
        width, height = screen_size(serial)
        adb(serial, "shell", "input", "swipe", str(width // 2), str(height * 85 // 100), str(width // 2),
            str(height * 30 // 100), "250")
        time.sleep(1.0)
        adb(serial, "shell", "wm", "dismiss-keyguard")
        return "keyevent 224 + swipe up + dismiss-keyguard"
    return "unknown action " + request


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-s", "--serial", required=True)
    parser.add_argument("--timeout", type=float, default=240)
    screen = parser.add_mutually_exclusive_group()
    screen.add_argument("--skip-screen", action="store_true", help="skip the screen off / unlock checks")
    screen.add_argument("--manual-unlock", action="store_true",
                        help="run the screen checks on a device with a secure lock screen; its owner unlocks it")
    parser.add_argument("--keep", action="store_true", help="keep the pushed script and the local copy")
    args = parser.parse_args()

    if "mWakefulness=Awake" not in adb(args.serial, "shell", "dumpsys", "power").stdout:
        print("SETUP the screen is off: turn it on and unlock the device first")
        return 2

    local = pathlib.Path(__file__).resolve().parent / "device_r2_check.generated.js"
    script = SCRIPT.replace("__SKIP_SCREEN__", "true" if args.skip_screen else "false")
    local.write_text(script.replace("__MANUAL_UNLOCK__", "true" if args.manual_unlock else "false"), encoding="utf-8")
    remote = DEVICE_DIR + "/check.js"
    try:
        adb(args.serial, "shell", "mkdir", "-p", DEVICE_DIR, check=True)
        adb(args.serial, "push", str(local), remote, check=True)
        adb(args.serial, "logcat", "-c")
        log_process, log_lines = stream_logcat(args.serial)
        adb(args.serial, "shell", "am", "start", "-n", PACKAGE + "/" + RUN_ACTIVITY, "-e", "path", remote, check=True)
        console: list[str] = []
        seen: list[str] = []
        gl_errors = 0
        deadline = time.time() + args.timeout
        done = False
        while time.time() < deadline and not done:
            try:
                raw = log_lines.get(timeout=0.2)
            except queue.Empty:
                continue
            if NATIVE_LOG_TAG + ":" in raw and "OpenGL texture update failed" in raw:
                gl_errors += 1
            line = console_message(raw)
            if line is None:
                continue
            console.append(line)
            if not line.startswith(MARK + " ") or line.startswith(MARK + " section "):
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
        printed = example_failures(console)
        print(f"example-console {'PASS' if printed == 0 else 'FAIL'} failures={printed}")
        print(f"gl-error-log {'PASS' if gl_errors == 0 else 'FAIL'} count={gl_errors}")
        failed = [line for line in seen if " FAIL " in line]
        return 0 if not failed and printed == 0 and gl_errors == 0 else 1
    finally:
        if not args.keep:
            adb(args.serial, "shell", "rm", "-r", DEVICE_DIR)
            local.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
