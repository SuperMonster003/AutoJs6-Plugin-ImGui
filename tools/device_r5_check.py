#!/usr/bin/env python3
"""Checks the R5 (v1.16.0) behavior of the ImGui plugin on a device through the AutoJs6 global `imgui`.

Usage: py -3.12 -I tools/device_r5_check.py -s SERIAL [--only capture,rotation,...] [--timeout 300] [--keep]

Needs AutoJs6 (debug or release, with the `imgui` module) and the plugin installed, enabled and trusted, the overlay
permission for AutoJs6, the screen on and unlocked. Pushes one script, runs it through RunIntentActivity and prints one
line per check, PASS / FAIL / SKIP with the key values. The tool rotates the display through the settings (restored at
the end), starts the launcher Activity, swipes once on what lies below the text box and takes screenshots. The new
members are called on the session object or on the API object of the render callback (`ui`).

Sections (default: all but density and pinch-manual):
- capture: session.capture() in the overlay and Activity modes: size, the colors of the pixels, a region in dp, in a
  frame, images.save and images.read, memory around 20 captures.
- rotation: the window keeps its dp position and size when the display turns and when it turns back.
- density (emulator only, wm density and font_scale): text and control sizes follow the display, the window keeps its dp
  size, capture still works.
- density-activity (emulator only): what happens to an Activity window when the density changes.
- cjk: a font without the glyph, with and without systemCjkFont: advance of the glyph, ink in a screenshot, memory.
- pinch: two-finger MotionEvents on the surface view: scrolling keeps the scale, a pinch doubles it, halves it and stops
  at the limit; text follows the scale.
- pinch-manual: opens a window for --manual-seconds and prints every scale; the fingers are the maintainer's.
- privileged: capture between frames and in a frame, the text box with Chinese text through the done key, the OK button
  and a touch outside, single and multi-line, the empty layer while the box is open.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import queue
import struct
import subprocess
import sys
import threading
import time

DEVICE_DIR = "/sdcard/Download/aj6-imgui-r5"
RUN_ACTIVITY = "org.autojs.autojs.external.open.RunIntentActivity"
LAUNCHER_ACTIVITY = "org.autojs.autojs.launcher.AdaptiveIconAlias"
PACKAGE = "org.autojs.autojs6"
MARK = "AJ6R5"
NATIVE_LOG_TAG = "AutoJs6-ImGui"
ALL_SECTIONS = ["capture", "rotation", "cjk", "pinch", "privileged"]
BUNDLED_FONT = "asset://fonts/AutoJs6CjkFallback-Regular.otf"
LAYER_INK_MINIMUM = 2000

SCRIPT = r"""
var MARK = 'AJ6R5';
var ONLY = __ONLY__;
var MANUAL_SECONDS = __MANUAL_SECONDS__;
var BUNDLED_FONT = '__BUNDLED_FONT__';
var DEVICE_DIR = '__DEVICE_DIR__';
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

// Goes on when the tool has taken the screenshot.
function ink(name, done) {
    action('ink-' + name);
    var ack = DEVICE_DIR + '/ack-' + name;
    waitFor(function () { return files.exists(ack); }, 30000, function () { done(); });
}

function region(name, x, y, width, height) {
    console.log(MARK + ' region ' + name + ' ' + [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(' '));
}

function round3(value) {
    return Math.round(value * 1000) / 1000;
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

// Each failure of a step reports and moves on, so one broken check does not stop the next section.
function guarded(name, session, fn) {
    return function () {
        try {
            fn.apply(null, arguments);
        } catch (e) {
            report(name, false, String(e).slice(0, 200));
            if (session) session.close('failed');
            later(300, next);
        }
    };
}

function surfaceOrigin(session) {
    var loc = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
    session.surfaceView.getLocationOnScreen(loc);
    return [Number(loc[0]), Number(loc[1])];
}

function surfaceSize(session) {
    return [Number(session.surfaceView.getWidth()), Number(session.surfaceView.getHeight())];
}

function fixedWindow(ui, title, width, height, body) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(width, height, ui.Cond.Always);
    var flags = ui.WindowFlags.NoTitleBar | ui.WindowFlags.NoResize | ui.WindowFlags.NoMove |
        ui.WindowFlags.NoScrollbar | ui.WindowFlags.NoSavedSettings;
    ui.withWindow(title, null, flags, body);
}

function paintHalves(ui, width, height) {
    var list = ui.getForegroundDrawList();
    list.addRectFilled([0, 0], [width / 2, height], [1, 0, 0, 1]);
    list.addRectFilled([width / 2, 0], [width, height], [0, 0, 1, 1]);
}

function channels(pixel) {
    return [colors.red(pixel), colors.green(pixel), colors.blue(pixel)];
}

function isRed(pixel) {
    var c = channels(pixel);
    return c[0] > 180 && c[1] < 80 && c[2] < 80;
}

function isBlue(pixel) {
    var c = channels(pixel);
    return c[2] > 180 && c[0] < 80 && c[1] < 80;
}

function settledMemory(done) {
    java.lang.Runtime.getRuntime().gc();
    later(500, function () {
        done({
            pss: Number(android.os.Debug.getPss()),
            native: Math.round(Number(android.os.Debug.getNativeHeapAllocatedSize()) / 1024)
        });
    });
}

function captureLoop(session, count, done) {
    var index = 0;
    function one() {
        if (index++ >= count) {
            done();
            return;
        }
        session.capture().recycle();
        later(30, one);
    }
    one();
}

// Size, colors, a region, saving and memory of one window. width, height: the window in px.
function checkCapture(session, name, width, height, done) {
    var density = session.density;
    var image = session.capture();
    var w = Number(image.getWidth());
    var h = Number(image.getHeight());
    report(name + '-size', w === width && h === height, w + 'x' + h + ' window ' + width + 'x' + height);
    var left = images.pixel(image, Math.floor(w / 4), Math.floor(h / 2));
    var right = images.pixel(image, Math.floor(3 * w / 4), Math.floor(h / 2));
    report(name + '-pixels', isRed(left) && isBlue(right), channels(left).join(',') + ' ' + channels(right).join(','));

    var part = session.capture({region: {x: 10, y: 20, width: 50, height: 40}});
    var partWidth = Number(part.getWidth());
    var partHeight = Number(part.getHeight());
    var expectedWidth = Math.round(50 * density);
    var expectedHeight = Math.round(40 * density);
    report(name + '-region', partWidth === expectedWidth && partHeight === expectedHeight,
        partWidth + 'x' + partHeight + ' expected ' + expectedWidth + 'x' + expectedHeight);
    part.recycle();

    var path = DEVICE_DIR + '/' + name + '.png';
    images.save(image, path, 'png');
    var saved = images.read(path);
    var bytes = Number(new java.io.File(path).length());
    report(name + '-save', saved != null && Number(saved.getWidth()) === w && Number(saved.getHeight()) === h && bytes > 0,
        (saved == null ? 'unreadable' : saved.getWidth() + 'x' + saved.getHeight()) + ' bytes=' + bytes);
    if (saved != null) saved.recycle();
    image.recycle();

    captureLoop(session, 5, function () {
        settledMemory(function (before) {
            captureLoop(session, 20, function () {
                settledMemory(function (after) {
                    var leakLimit = Math.round(w * h * 4 * 20 / 1024 / 2);
                    var pssDelta = after.pss - before.pss;
                    var nativeDelta = after.native - before.native;
                    report(name + '-memory-20', Math.max(pssDelta, nativeDelta) < leakLimit,
                        'pss ' + before.pss + '->' + after.pss + ' KB native ' + before.native + '->' + after.native +
                        ' KB limit=' + leakLimit + ' KB');
                    done();
                });
            });
        });
    });
}

if (wanted('capture')) steps.push(function () {
    section('capture');
    var frames = 0;
    var inFrame = null;
    var session = imgui.createWindow(function (ui) {
        frames++;
        fixedWindow(ui, 'R5 capture', ui.dp(220), ui.dp(120), function () {
            ui.text('capture');
        });
        paintHalves(ui, ui.dp(220), ui.dp(120));
        if (frames === 8) {
            try {
                var image = session.capture();
                inFrame = image.getWidth() + 'x' + image.getHeight();
                image.recycle();
            } catch (e) {
                inFrame = 'threw ' + String(e).slice(0, 120);
            }
        }
    }, {x: 0, y: 200, width: 220, height: 120, contentAutoResize: false, idleDelay: 600000});

    waitFor(function () { return frames > 12; }, 8000, guarded('capture', session, function (ready) {
        if (!ready) {
            report('capture-window', false, 'frames=' + frames);
            session.close('failed');
            later(300, next);
            return;
        }
        report('capture-overlay-in-frame', inFrame != null && inFrame.indexOf('threw') < 0, String(inFrame));
        var size = surfaceSize(session);
        checkCapture(session, 'capture-overlay', size[0], size[1], guarded('capture', session, function () {
            session.close('done');
            later(600, activityCapture);
        }));
    }));
});

function currentActivity() {
    try {
        return runtime.app.getCurrentActivity();
    } catch (e) {
        return null;
    }
}

function resumedActivity(done) {
    action('main-activity');
    var last = null;
    var stableSince = 0;
    waitFor(function () {
        var activity = currentActivity();
        if (activity == null || !activity.equals(last)) {
            last = activity;
            stableSince = Date.now();
            return false;
        }
        return Date.now() - stableSince >= 1000;
    }, 15000, done);
}

// A slow device can take a while from a stable current Activity to a resumed one.
function launchInActivity(render, done) {
    var attempts = 0;
    function attempt() {
        try {
            done(imgui.launch(render, {idleDelay: 600000}));
        } catch (e) {
            if (++attempts >= 20) {
                done(null, String(e).slice(0, 160));
            } else {
                later(500, attempt);
            }
        }
    }
    attempt();
}

function activityCapture() {
    resumedActivity(function (resumed) {
        if (!resumed) {
            skip('capture-activity', 'no resumed AutoJs6 Activity');
            next();
            return;
        }
        var frames = 0;
        var width = 0;
        var height = 0;
        launchInActivity(function (ui, session) {
            frames++;
            width = Number(session.surfaceView.getWidth());
            height = Number(session.surfaceView.getHeight());
            fixedWindow(ui, 'R5 capture activity', width, height, function () {
                ui.text('capture');
            });
            paintHalves(ui, width, height);
        }, startedCapture);

        function startedCapture(session, error) {
            if (session == null) {
                skip('capture-activity', error);
                next();
                return;
            }
            waitFor(function () { return frames > 12; }, 8000, guarded('capture-activity', session, function (ready) {
                if (!ready) {
                    report('capture-activity', false, 'frames=' + frames);
                    session.close('failed');
                    later(600, next);
                    return;
                }
                checkCapture(session, 'capture-activity', width, height, guarded('capture-activity', session, function () {
                    session.close('done');
                    later(600, next);
                }));
            }));
        }
    });
}

if (wanted('rotation')) steps.push(function () {
    section('rotation');
    var frames = 0;
    var changes = [];
    var session = imgui.createWindow(function (ui) {
        frames++;
        fixedWindow(ui, 'R5 rotation', ui.dp(220), ui.dp(120), function () {
            ui.text('rotation');
        });
    }, {x: 40, y: 120, width: 220, height: 120, contentAutoResize: false, idleDelay: 600000});
    session.on('configurationChanged', function (e) {
        changes.push(e.orientation);
    });

    function geometry() {
        return [session.x, session.y, session.width, session.height].join(',');
    }

    waitFor(function () { return frames > 8; }, 8000, guarded('rotation', session, function () {
        var before = geometry();
        var density = session.density;
        var surfaceBefore = surfaceSize(session).join('x');
        action('rotate-1');
        waitFor(function () { return changes.indexOf('landscape') >= 0; }, 10000, guarded('rotation', session, function (turned) {
            if (!turned) {
                skip('rotation', 'the display did not turn: ' + changes.join(','));
                action('rotate-restore');
                session.close('done');
                later(300, next);
                return;
            }
            later(800, guarded('rotation', session, function () {
                report('rotation-landscape', geometry() === before && session.density === density &&
                    surfaceSize(session).join('x') === surfaceBefore,
                    geometry() + ' density=' + session.density + ' surface=' + surfaceSize(session).join('x'));
                changes.length = 0;
                action('rotate-0');
                waitFor(function () { return changes.indexOf('portrait') >= 0; }, 10000, guarded('rotation', session, function (back) {
                    later(800, guarded('rotation', session, function () {
                        report('rotation-portrait', back && geometry() === before && frames > 0,
                            geometry() + ' surface=' + surfaceSize(session).join('x'));
                        action('rotate-restore');
                        session.close('done');
                        later(600, next);
                    }));
                }));
            }));
        }));
    }));
});

if (wanted('density')) steps.push(function () {
    section('density');
    var frames = 0;
    var seen = [];
    var metrics = {};
    var session = imgui.createWindow(function (ui) {
        frames++;
        fixedWindow(ui, 'R5 density', ui.dp(200), ui.dp(140), function () {
            ui.button('Measure');
            metrics.line = Number(ui.calcTextSize('Mg')[1]);
            metrics.frame = Number(ui.getFrameHeight());
            metrics.dp = Number(ui.dp(100));
        });
        paintHalves(ui, ui.dp(30), ui.dp(30));
    }, {x: 20, y: 100, width: 200, height: 140, contentAutoResize: false, idleDelay: 600000});
    session.addButtonEx('B', function () {}, {x: 20, y: 300});
    session.on('configurationChanged', function (e) {
        seen.push(e);
    });

    function snapshot() {
        return {
            line: metrics.line,
            frame: metrics.frame,
            padding: metrics.frame - metrics.line,
            dp: metrics.dp,
            density: session.density,
            surface: surfaceSize(session),
            geometry: [session.x, session.y, session.width, session.height]
        };
    }

    // The window sits on whole pixels, so its dp values move by a fraction of a dp with the density.
    function sameGeometry(a, b) {
        return a.geometry.every(function (value, index) { return Math.abs(value - b.geometry[index]) < 0.6; });
    }

    function describe(s) {
        return 'line=' + round3(s.line) + ' frame=' + round3(s.frame) + ' density=' + round3(s.density) +
            ' surface=' + s.surface.join('x') + ' dp=' + s.geometry.map(round3).join(',');
    }

    function waitForChange(check, done) {
        seen.length = 0;
        var frameMark = frames;
        waitFor(function () { return check() && frames > frameMark + 6; }, 12000, function (met) {
            later(500, function () { done(met); });
        });
    }

    function close(met) {
        return Math.abs(met) < 0.08;
    }

    waitFor(function () { return frames > 8; }, 8000, guarded('density', session, function () {
        var base = snapshot();
        var target = Math.round(base.density * 160 * 1.5);
        action('density-' + target);
        waitForChange(function () { return session.density !== base.density; }, guarded('density', session, function (changed) {
            var large = snapshot();
            var ratio = large.density / base.density;
            report('density-text', changed && close(large.line / base.line / ratio - 1), describe(base) + ' -> ' + describe(large));
            report('density-controls', changed && close(large.frame / base.frame / ratio - 1) && close(large.dp / base.dp / ratio - 1),
                'frame ' + round3(large.frame / base.frame) + ' dp ' + round3(large.dp / base.dp) + ' expected ' + round3(ratio));
            report('density-window', changed && sameGeometry(large, base) &&
                Math.abs(large.surface[0] - 200 * large.density) <= 3 && Math.abs(large.surface[1] - 140 * large.density) <= 3,
                describe(large));
            var image = session.capture({region: {x: 5, y: 5, width: 20, height: 20}});
            report('density-capture', Number(image.getWidth()) === Math.round(20 * large.density) && isRed(images.pixel(image, 2, 2)),
                image.getWidth() + 'x' + image.getHeight() + ' ' + channels(images.pixel(image, 2, 2)).join(','));
            image.recycle();

            action('font-scale-1.3');
            waitForChange(function () { return metrics.line > large.line * 1.15; }, guarded('density', session, function (scaled) {
                var fonts = snapshot();
                report('font-scale', scaled && close(fonts.line / large.line / 1.3 - 1) && Math.abs(fonts.padding - large.padding) <= 2,
                    'line ' + round3(large.line) + '->' + round3(fonts.line) + ' padding ' + round3(large.padding) + '->' + round3(fonts.padding));
                var event = seen[seen.length - 1];
                report('font-scale-event', event != null && round3(event.fontScale) === 1.3,
                    event == null ? 'no event' : 'fontScale=' + event.fontScale + ' old=' + event.oldFontScale);
                action('font-scale-1');
                waitForChange(function () { return metrics.line < fonts.line * 0.85; }, guarded('density', session, function () {
                    action('density-reset');
                    waitForChange(function () { return session.density === base.density; }, guarded('density', session, function (reset) {
                        var restored = snapshot();
                        report('density-restored', reset && close(restored.line / base.line - 1) && sameGeometry(restored, base),
                            describe(restored));
                        session.close('done');
                        later(600, next);
                    }));
                }));
            }));
        }));
    }));
});

if (wanted('density-activity')) steps.push(function () {
    section('density-activity');
    resumedActivity(function (resumed) {
        if (!resumed) {
            skip('density-activity', 'no resumed AutoJs6 Activity');
            next();
            return;
        }
        var frames = 0;
        var closed = null;
        var metrics = {};
        launchInActivity(function (ui) {
            frames++;
            fixedWindow(ui, 'R5 density activity', ui.dp(300), ui.dp(140), function () {
                ui.button('Measure');
                metrics.line = Number(ui.calcTextSize('Mg')[1]);
            });
        }, function (session, error) {
            if (session == null) {
                skip('density-activity', error);
                next();
                return;
            }
            session.on('closed', function (e) {
                closed = String(e.reason);
            });
            waitFor(function () { return frames > 8; }, 8000, guarded('density-activity', session, function () {
                var line = metrics.line;
                var density = session.density;
                action('density-' + Math.round(density * 160 * 1.5));
                waitFor(function () { return closed != null || metrics.line > line * 1.3; }, 12000, function () {
                    report('density-activity', closed === 'configuration-changed',
                        'closed=' + closed + ' line ' + round3(line) + '->' + round3(metrics.line));
                    action('density-reset');
                    later(2500, function () {
                        session.close('done');
                        later(600, next);
                    });
                });
            }));
        });
    });
});

function cjkWindow(name, extra, done) {
    var frames = 0;
    var size = null;
    var options = {x: 0, y: 200, width: 220, height: 130, contentAutoResize: false, idleDelay: 600000,
        fontPath: BUNDLED_FONT, fontSize: 64};
    for (var key in extra) options[key] = extra[key];
    var session = imgui.createWindow(function (ui) {
        frames++;
        fixedWindow(ui, 'R5 cjk', ui.dp(220), ui.dp(130), function () {
            ui.text('龘');
            size = [Number(ui.calcTextSize('龘')[0]), Number(ui.calcTextSize('中')[0])];
        });
    }, options);
    waitFor(function () { return frames > 20; }, 10000, guarded('cjk-' + name, session, function (ready) {
        if (!ready) {
            report('cjk-' + name, false, 'frames=' + frames);
            session.close('failed');
            later(600, next);
            return;
        }
        settledMemory(function (memory) {
            var origin = surfaceOrigin(session);
            var surface = surfaceSize(session);
            region(name, origin[0], origin[1], surface[0], surface[1]);
            ink(name, function () {
                session.close('done');
                later(800, function () {
                    done({advance: size[0], full: size[1], memory: memory});
                });
            });
        });
    }));
}

if (wanted('cjk')) steps.push(function () {
    section('cjk');
    cjkWindow('builtin', {}, function (builtin) {
        report('cjk-builtin-advance', builtin.advance < builtin.full * 0.8,
            'missing glyph ' + round3(builtin.advance) + ' full glyph ' + round3(builtin.full));
        cjkWindow('system', {systemCjkFont: true}, function (system) {
            report('cjk-system-advance', Math.abs(system.advance - system.full) < 2,
                'glyph ' + round3(system.advance) + ' full glyph ' + round3(system.full));
            cjkWindow('builtin-again', {}, function (again) {
                var pssBase = (builtin.memory.pss + again.memory.pss) / 2;
                var nativeBase = (builtin.memory.native + again.memory.native) / 2;
                report('cjk-memory', true,
                    'pss delta=' + Math.round(system.memory.pss - pssBase) + ' KB native delta=' +
                    Math.round(system.memory.native - nativeBase) + ' KB (' + builtin.memory.pss + ' / ' +
                    system.memory.pss + ' / ' + again.memory.pss + ' KB)');
                next();
            });
        });
    });
});

// Fingers as [x, y] pairs, in px of the surface.
function motion(view, downTime, actionCode, fingers) {
    var MotionEvent = android.view.MotionEvent;
    var properties = java.lang.reflect.Array.newInstance(MotionEvent.PointerProperties, fingers.length);
    var coordinates = java.lang.reflect.Array.newInstance(MotionEvent.PointerCoords, fingers.length);
    for (var i = 0; i < fingers.length; i++) {
        var property = new MotionEvent.PointerProperties();
        property.id = i;
        property.toolType = MotionEvent.TOOL_TYPE_FINGER;
        properties[i] = property;
        var coordinate = new MotionEvent.PointerCoords();
        coordinate.x = fingers[i][0];
        coordinate.y = fingers[i][1];
        coordinate.pressure = 1;
        coordinate.size = 1;
        coordinates[i] = coordinate;
    }
    var event = MotionEvent.obtain(downTime, android.os.SystemClock.uptimeMillis(), actionCode, fingers.length,
        properties, coordinates, 0, 0, 1, 1, 0, 0, android.view.InputDevice.SOURCE_TOUCHSCREEN, 0);
    try {
        view.dispatchTouchEvent(event);
    } finally {
        event.recycle();
    }
}

// Runs one gesture on the UI thread, one event every 40 ms. Moves: lists of fingers. The first two fingers go down
// from the first move and stay down until the end.
function gesture(session, moves, done) {
    var MotionEvent = android.view.MotionEvent;
    var view = session.surfaceView;
    var handler = new android.os.Handler(android.os.Looper.getMainLooper());
    var downTime = android.os.SystemClock.uptimeMillis();
    var first = moves[0];
    var last = moves[moves.length - 1];
    var events = [[MotionEvent.ACTION_DOWN, [first[0]]],
        [MotionEvent.ACTION_POINTER_DOWN | (1 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), first]];
    for (var i = 1; i < moves.length; i++) events.push([MotionEvent.ACTION_MOVE, moves[i]]);
    events.push([MotionEvent.ACTION_POINTER_UP | (1 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), last]);
    events.push([MotionEvent.ACTION_UP, [last[0]]]);
    events.forEach(function (entry, index) {
        handler.postDelayed(new java.lang.Runnable({
            run: function () { motion(view, downTime, entry[0], entry[1]); }
        }), index * 40);
    });
    later(events.length * 40 + 400, done);
}

function spread(centerY, leftX, distances) {
    return distances.map(function (distance) {
        return [[leftX, centerY], [leftX + distance, centerY]];
    });
}

if (wanted('pinch')) steps.push(function () {
    section('pinch');
    var frames = 0;
    var changes = [];
    var measured = {line: 0, scroll: 0};
    var session = imgui.createWindow(function (ui) {
        frames++;
        ui.setNextWindowPos(0, 0, ui.Cond.Always);
        ui.setNextWindowSize(ui.dp(300), ui.dp(300), ui.Cond.Always);
        ui.withWindow('R5 pinch', null, ui.WindowFlags.NoTitleBar | ui.WindowFlags.NoResize | ui.WindowFlags.NoMove |
            ui.WindowFlags.NoSavedSettings, function () {
            for (var i = 0; i < 60; i++) ui.text('Row ' + i);
            measured.line = Number(ui.calcTextSize('Mg')[1]);
            measured.scroll = Number(ui.getScrollY());
        });
    }, {x: 0, y: 150, width: 300, height: 300, contentAutoResize: false, idleDelay: 600000, pinchZoom: true});
    session.on('fontScaleChanged', function (e) {
        changes.push(e.source + ':' + round3(e.scale));
    });

    waitFor(function () { return frames > 8; }, 8000, guarded('pinch', session, function () {
        var d = session.density;
        var baseLine = measured.line;
        var scrollMoves = [];
        for (var step = 0; step < 10; step++) {
            var y = (200 - step * 12) * d;
            scrollMoves.push([[60 * d, y], [200 * d, y]]);
        }
        gesture(session, scrollMoves, guarded('pinch', session, function () {
            report('pinch-scroll', measured.scroll > 0 && session.fontScale === 1 && changes.length === 0,
                'scrollY=' + round3(measured.scroll) + ' fontScale=' + session.fontScale);
            // 24 dp starts the pinch at 90 dp; 180 dp doubles the scale.
            var grow = spread(150 * d, 50 * d, [60 * d, 70 * d, 90 * d, 120 * d, 150 * d, 180 * d]);
            gesture(session, grow, guarded('pinch', session, function () {
                report('pinch-grow', Math.abs(session.fontScale - 2) < 0.02 && changes[changes.length - 1].indexOf('pinch:') === 0,
                    'fontScale=' + round3(session.fontScale) + ' events=' + changes.length);
                report('pinch-text', Math.abs(measured.line / baseLine - 2) < 0.1,
                    'line ' + round3(baseLine) + '->' + round3(measured.line));
                var shrink = spread(150 * d, 50 * d, [200 * d, 170 * d, 120 * d, 85 * d]);
                gesture(session, shrink, guarded('pinch', session, function () {
                    report('pinch-shrink', Math.abs(session.fontScale - 1) < 0.02,
                        'fontScale=' + round3(session.fontScale) + ' line=' + round3(measured.line));
                    var limit = spread(150 * d, 20 * d, [40 * d, 70 * d, 140 * d, 230 * d, 270 * d]);
                    gesture(session, limit, guarded('pinch', session, function () {
                        report('pinch-limit', session.fontScale === 3, 'fontScale=' + session.fontScale);
                        session.setFontScale(1);
                        later(300, guarded('pinch', session, function () {
                            report('pinch-api', session.fontScale === 1 && changes[changes.length - 1] === 'api:1',
                                'fontScale=' + session.fontScale + ' last=' + changes[changes.length - 1]);
                            session.close('done');
                            later(600, next);
                        }));
                    }));
                }));
            }));
        }));
    }));
});

if (wanted('pinch-manual')) steps.push(function () {
    section('pinch-manual');
    var frames = 0;
    var changes = 0;
    var session = imgui.createWindow(function (ui) {
        frames++;
        ui.setNextWindowPos(0, 0, ui.Cond.Always);
        ui.setNextWindowSize(ui.dp(320), ui.dp(400), ui.Cond.Always);
        ui.withWindow('R5 pinch', null, ui.WindowFlags.NoTitleBar | ui.WindowFlags.NoResize | ui.WindowFlags.NoMove |
            ui.WindowFlags.NoSavedSettings, function () {
            ui.textWrapped('Pinch here with two fingers. Moving both fingers together scrolls.');
            ui.text('Scale: ' + round3(session.fontScale));
            for (var i = 0; i < 60; i++) ui.text('Row ' + i);
        });
    }, {x: 10, y: 150, width: 320, height: 400, contentAutoResize: false, idleDelay: 600000, pinchZoom: true});
    session.on('fontScaleChanged', function (e) {
        changes++;
        console.log(MARK + ' pinch-manual scale=' + round3(e.scale) + ' source=' + e.source);
    });
    console.log(MARK + ' pinch-manual open for ' + MANUAL_SECONDS + ' s');
    later(MANUAL_SECONDS * 1000, function () {
        report('pinch-manual', changes > 0, 'changes=' + changes + ' fontScale=' + round3(session.fontScale));
        session.close('done');
        later(600, next);
    });
});

if (wanted('privileged')) steps.push(function () {
    section('privileged');
    var capabilities = imgui.GetBackendCapabilities();
    var status = capabilities.privileged.status;
    if (status === 'unavailable' || status === 'deferred') {
        skip('privileged', 'status=' + status + ' backends=' + JSON.stringify(capabilities.privileged));
        next();
        return;
    }
    var frames = 0;
    var lastError = null;
    var inFrame = null;
    var focusNext = null;
    var single = imgui.ref('');
    var multi = imgui.ref('');
    var enterReturned = 0;
    var active = {single: false, multi: false};
    var session = imgui.launchPrivileged(function (ui) {
        frames++;
        fixedWindow(ui, 'R5 privileged', ui.dp(300), ui.dp(300), function () {
            if (focusNext === 'single') {
                ui.setKeyboardFocusHere();
                focusNext = null;
            }
            if (ui.inputText('##single', single, 256, ui.InputTextFlags.EnterReturnsTrue)) enterReturned++;
            active.single = ui.isItemActive();
            if (focusNext === 'multi') {
                ui.setKeyboardFocusHere();
                focusNext = null;
            }
            ui.inputTextMultiline('##multi', multi, 256, ui.dp(260), ui.dp(80));
            active.multi = ui.isItemActive();
        });
        var list = ui.getForegroundDrawList();
        list.addRectFilled([0, ui.dp(200)], [ui.dp(150), ui.dp(300)], [1, 0, 0, 1]);
        list.addRectFilled([ui.dp(150), ui.dp(200)], [ui.dp(300), ui.dp(300)], [0, 0, 1, 1]);
        if (frames === 8) {
            try {
                session.capture().recycle();
                inFrame = 'captured';
            } catch (e) {
                inFrame = String(e);
            }
        }
    }, {x: 20, y: 300, width: 300, height: 300, contentAutoResize: false, idleDelay: 600000, startupTimeout: 10000,
        onError: function (e) { lastError = String(e.message).slice(0, 160); }});

    var EditorInfo = android.view.inputmethod.EditorInfo;

    function edit(field, text, submit) {
        field.post(new java.lang.Runnable({
            run: function () {
                field.setText(text);
                submit(field);
            }
        }));
    }

    function pressDone(field) {
        field.onEditorAction(EditorInfo.IME_ACTION_DONE);
    }

    function pressOk(field) {
        field.getParent().getChildAt(1).performClick();
    }

    function afterBox(check, done) {
        waitFor(function () { return session.imeView == null && check(); }, 5000, function (met) {
            later(300, function () { done(met); });
        });
    }

    function outsideTouch() {
        focusNext = 'single';
        waitFor(function () { return session.imeView != null; }, 5000, guarded('privileged-outside', session, function (opened) {
            report('privileged-outside-open', opened, 'imeView=' + (session.imeView != null));
            if (!opened) {
                finish();
                return;
            }
            later(800, guarded('privileged-outside', session, function () {
                var text = '窗外';
                session.imeView.post(new java.lang.Runnable({
                    run: function () { session.imeView.setText(text); }
                }));
                later(500, guarded('privileged-outside', session, function () {
                    // The status bar and the keyboard lie above an overlay and hide a touch from it.
                    action('swipe-outside-' + Math.round(40 * session.density) + '-' + Math.round(200 * session.density));
                    afterBox(function () { return single.value.indexOf(text) >= 0; }, function (met) {
                        report('privileged-outside', met, 'length=' + single.value.length + ' box=' + (session.imeView != null));
                        finish();
                    });
                }));
            }));
        }));
    }

    function finish() {
        if (session.imeView != null) {
            session.imeView.post(new java.lang.Runnable({
                run: function () { pressDone(session.imeView); }
            }));
        }
        later(600, function () {
            report('privileged-running', lastError == null && session.closed !== true,
                'frames=' + frames + ' error=' + lastError);
            session.close('done');
            later(800, next);
        });
    }

    waitFor(function () { return frames > 12; }, 15000, guarded('privileged', session, function (ready) {
        if (!ready) {
            report('privileged-window', false, 'frames=' + frames + ' error=' + lastError);
            session.close('failed');
            later(800, next);
            return;
        }
        report('privileged-capture-in-frame', inFrame != null && inFrame.indexOf('between two frames') >= 0,
            String(inFrame).slice(0, 120));
        var density = session.density;
        var width = Math.round(session.width * density);
        var height = Math.round(session.height * density);
        var image = session.capture();
        var w = Number(image.getWidth());
        var h = Number(image.getHeight());
        report('privileged-capture-size', w === width && h === height, w + 'x' + h + ' window ' + width + 'x' + height);
        var left = images.pixel(image, Math.round(75 * density), Math.round(250 * density));
        var right = images.pixel(image, Math.round(225 * density), Math.round(250 * density));
        report('privileged-capture-pixels', isRed(left) && isBlue(right),
            channels(left).join(',') + ' ' + channels(right).join(','));
        var path = DEVICE_DIR + '/privileged.png';
        images.save(image, path, 'png');
        report('privileged-capture-save', Number(new java.io.File(path).length()) > 0,
            'bytes=' + new java.io.File(path).length());
        image.recycle();
        var part = session.capture({region: {x: 150, y: 200, width: 100, height: 50}});
        report('privileged-capture-region', Number(part.getWidth()) === Math.round(100 * density) &&
            Number(part.getHeight()) === Math.round(50 * density) && isBlue(images.pixel(part, 10, 10)),
            part.getWidth() + 'x' + part.getHeight() + ' ' + channels(images.pixel(part, 10, 10)).join(','));
        part.recycle();

        var layerX = (session.x + 10) * density;
        var layerY = (session.y + 205) * density;
        region('layer-before', layerX, layerY, 120 * density, 60 * density);
        ink('layer-before', guarded('privileged-input', session, function () {
            focusNext = 'single';
            waitFor(function () { return session.imeView != null; }, 5000, guarded('privileged-input', session, function (opened) {
                report('privileged-box-open', opened, 'imeView=' + (session.imeView != null));
                if (!opened) {
                    finish();
                    return;
                }
                later(800, guarded('privileged-input', session, function () {
                    region('layer-open', layerX, layerY, 120 * density, 60 * density);
                    ink('layer-open', guarded('privileged-input', session, function () {
                        var text = '中文输入 R5';
                        edit(session.imeView, text, pressDone);
                        afterBox(function () { return single.value === text; }, guarded('privileged-input', session, function (met) {
                            report('privileged-input-single', met && enterReturned === 1 && !active.single,
                                'match=' + (single.value === text) + ' enterReturned=' + enterReturned + ' active=' + active.single);
                            region('layer-after', layerX, layerY, 120 * density, 60 * density);
                            ink('layer-after', guarded('privileged-input', session, function () {
                                focusNext = 'multi';
                                waitFor(function () { return session.imeView != null; }, 5000, guarded('privileged-input', session, function (openedMulti) {
                                    report('privileged-box-multi', openedMulti, 'imeView=' + (session.imeView != null));
                                    if (!openedMulti) {
                                        finish();
                                        return;
                                    }
                                    later(800, guarded('privileged-input', session, function () {
                                        var lines = '第一行\n第二行';
                                        edit(session.imeView, lines, pressOk);
                                        afterBox(function () { return multi.value === lines; }, guarded('privileged-input', session, function (metMulti) {
                                            report('privileged-input-multi', metMulti && !active.multi,
                                                'match=' + (multi.value === lines) + ' length=' + multi.value.length + ' active=' + active.multi);
                                            later(600, outsideTouch);
                                        }));
                                    }));
                                }));
                            }));
                        }));
                    }));
                }));
            }));
        }));
    }));
});

next();
"""


def color_ink(red: int, green: int, blue: int) -> bool:
    return min(red, green, blue) > 150


def color_layer(red: int, green: int, blue: int) -> bool:
    return red > 170 and red - green > 80 and red - blue > 80


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


def screenshot(serial: str) -> tuple[int, int, bytes]:
    """Width, height and RGBA rows of the raw screencap format, whose header has grown with Android versions."""
    data = subprocess.run(["adb", "-s", serial, "exec-out", "screencap"], capture_output=True).stdout
    width, height = struct.unpack("<II", data[:8])
    return width, height, data[len(data) - width * height * 4:]


def count_pixels(serial: str, box: tuple[int, int, int, int], matches, keep: pathlib.Path | None = None) -> int:
    """Pixels of the box that a color test accepts, in a screenshot, which goes to the path `keep` if there is one."""
    width, height, pixels = screenshot(serial)
    if keep is not None:
        png = subprocess.run(["adb", "-s", serial, "exec-out", "screencap", "-p"], capture_output=True)
        keep.write_bytes(png.stdout)
    left, top, box_width, box_height = box
    count = 0
    for y in range(max(0, top), min(height, top + box_height)):
        row = y * width * 4
        for x in range(max(0, left), min(width, left + box_width)):
            offset = row + x * 4
            if matches(pixels[offset], pixels[offset + 1], pixels[offset + 2]):
                count += 1
    return count


class Device:
    """The actions the device script asks for, and what they changed, to put it back."""

    def __init__(self, serial: str, screens: pathlib.Path | None = None) -> None:
        self.serial = serial
        self.screens = screens
        self.regions: dict[str, tuple[int, int, int, int]] = {}
        self.ink: dict[str, int] = {}
        self.rotation: tuple[str, str] | None = None
        self.density_changed = False
        self.font_scale: str | None = None

    def settings(self, *args: str) -> str:
        return adb(self.serial, "shell", "settings", *args).stdout.strip()

    def rotate(self, value: str) -> str:
        if self.rotation is None:
            self.rotation = (self.settings("get", "system", "accelerometer_rotation"),
                             self.settings("get", "system", "user_rotation"))
        self.settings("put", "system", "accelerometer_rotation", "0")
        self.settings("put", "system", "user_rotation", value)
        return "rotation " + value

    def restore_rotation(self) -> str:
        if self.rotation is None:
            return "rotation unchanged"
        accelerometer, user = self.rotation
        self.rotation = None
        self.settings("put", "system", "user_rotation", "0" if user == "null" else user)
        self.settings("put", "system", "accelerometer_rotation", "1" if accelerometer == "null" else accelerometer)
        return "rotation restored"

    def set_density(self, value: str) -> str:
        self.density_changed = True
        adb(self.serial, "shell", "wm", "density", value)
        return "wm density " + value

    def set_font_scale(self, value: str) -> str:
        if self.font_scale is None:
            self.font_scale = self.settings("get", "system", "font_scale")
        self.settings("put", "system", "font_scale", value)
        return "font_scale " + value

    def restore(self) -> None:
        self.restore_rotation()
        if self.density_changed:
            adb(self.serial, "shell", "wm", "density", "reset")
            self.density_changed = False
        if self.font_scale is not None:
            self.settings("put", "system", "font_scale", "1.0" if self.font_scale == "null" else self.font_scale)
            self.font_scale = None

    def perform(self, request: str) -> tuple[str, list[str]]:
        """Runs what the device script asked for; returns a short note and result lines."""
        if request == "main-activity":
            result = adb(self.serial, "shell", "am", "start", "-n", PACKAGE + "/" + LAUNCHER_ACTIVITY)
            return "am start launcher " + ("ok" if result.returncode == 0 else result.stderr.strip()[:120]), []
        if request.startswith("rotate-restore"):
            return self.restore_rotation(), []
        if request.startswith("rotate-"):
            return self.rotate(request.split("-", 1)[1]), []
        if request == "density-reset":
            return self.set_density("reset"), []
        if request.startswith("density-"):
            return self.set_density(request.split("-", 1)[1]), []
        if request.startswith("font-scale-"):
            return self.set_font_scale(request.rsplit("-", 1)[1]), []
        if request.startswith("swipe-outside-"):
            x, y = request.rsplit("-", 2)[1:]
            adb(self.serial, "shell", "input", "swipe", x, y, str(int(x) + 150), y, "200")
            return "swipe outside the box", []
        if request.startswith("ink-"):
            name = request.split("-", 1)[1]
            layer = name.startswith("layer-")
            keep = self.screens / (name + ".png") if self.screens is not None else None
            count = count_pixels(self.serial, self.regions[name], color_layer if layer else color_ink, keep)
            self.ink[name] = count
            adb(self.serial, "shell", "touch", DEVICE_DIR + "/ack-" + name)
            return f"screencap {name} pixels={count}", []
        return "unknown action " + request, []


def ink_results(ink: dict[str, int]) -> list[tuple[str, str, str]]:
    """Checks that compare the screenshots: name, PASS / FAIL / SKIP, detail."""
    results = []
    if "system" in ink:
        builtin = max(ink.get("builtin", 0), ink.get("builtin-again", 0))
        system = ink["system"]
        results.append(("cjk-ink", "PASS" if builtin > 0 and system > builtin * 1.5 else "FAIL",
                        f"system={system} builtin={builtin}"))
    if "layer-before" in ink:
        before, opened, after = ink["layer-before"], ink.get("layer-open", -1), ink.get("layer-after", -1)
        detail = f"before={before} open={opened} after={after}"
        if before < LAYER_INK_MINIMUM:
            results.append(("privileged-layer", "SKIP", "the screenshot has no privileged layer: " + detail))
        else:
            ok = 0 <= opened < before / 10 and after > before / 2
            results.append(("privileged-layer", "PASS" if ok else "FAIL", detail))
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-s", "--serial", required=True)
    parser.add_argument("--only", default=",".join(ALL_SECTIONS), help="comma-separated sections")
    parser.add_argument("--timeout", type=float, default=300)
    parser.add_argument("--manual-seconds", type=int, default=60)
    parser.add_argument("--keep", action="store_true", help="keep the pushed script and the local copy")
    parser.add_argument("--screens", type=pathlib.Path, help="directory for the screenshots of the ink checks")
    args = parser.parse_args()
    sections = [name for name in args.only.split(",") if name]

    if "mWakefulness=Awake" not in adb(args.serial, "shell", "dumpsys", "power").stdout:
        print("SETUP the screen is off: turn it on and unlock the device first")
        return 2
    if any(name.startswith("density") for name in sections) \
            and adb(args.serial, "shell", "getprop", "ro.kernel.qemu").stdout.strip() != "1" \
            and adb(args.serial, "shell", "getprop", "ro.boot.qemu").stdout.strip() != "1":
        print("density SKIP not an emulator: the display density of a phone stays as it is")
        sections = [name for name in sections if not name.startswith("density")]

    source = (SCRIPT.replace("__ONLY__", json.dumps(sections))
              .replace("__MANUAL_SECONDS__", str(args.manual_seconds))
              .replace("__BUNDLED_FONT__", BUNDLED_FONT)
              .replace("__DEVICE_DIR__", DEVICE_DIR))
    local = pathlib.Path(__file__).resolve().parent / "device_r5_check.generated.js"
    local.write_text(source, encoding="utf-8")
    remote = DEVICE_DIR + "/check.js"
    device = Device(args.serial, args.screens)
    try:
        adb(args.serial, "shell", "mkdir", "-p", DEVICE_DIR, check=True)
        adb(args.serial, "push", str(local), remote, check=True)
        adb(args.serial, "logcat", "-c")
        log_process, log_lines = stream_logcat(args.serial)
        adb(args.serial, "shell", "am", "start", "-n", PACKAGE + "/" + RUN_ACTIVITY, "-e", "path", remote, check=True)
        seen: list[str] = []
        deadline = time.time() + args.timeout
        done = False
        while time.time() < deadline and not done:
            try:
                raw = log_lines.get(timeout=0.2)
            except queue.Empty:
                continue
            line = console_message(raw)
            if line is None or line.startswith(MARK + " section ") or not line.startswith(MARK + " "):
                continue
            if line.startswith(MARK + " region "):
                _, name, *values = line[len(MARK) + 1:].split()
                x, y, width, height = (int(value) for value in values)
                device.regions[name] = (x, y, width, height)
                continue
            seen.append(line)
            if line.startswith(MARK + " action "):
                note, results = device.perform(line[len(MARK + " action "):])
                print("action " + note, flush=True)
                for result in results:
                    print(result, flush=True)
                    seen.append(MARK + " " + result)
                continue
            print(line[len(MARK) + 1:], flush=True)
            if line.startswith(MARK + " done"):
                done = True
        log_process.terminate()
        if not done:
            print("TIMEOUT after %.0f s (%d lines seen)" % (args.timeout, len(seen)))
            return 1
        for name, verdict, detail in ink_results(device.ink):
            print(f"{name} {verdict} {detail}")
            seen.append(f"{MARK} {name} {verdict} {detail}")
        failed = [line for line in seen if " FAIL" in line]
        return 1 if failed else 0
    finally:
        device.restore()
        if not args.keep:
            adb(args.serial, "shell", "rm", "-r", DEVICE_DIR)
            local.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
