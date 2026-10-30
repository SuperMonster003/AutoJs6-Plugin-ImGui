#!/usr/bin/env python3
"""Checks the R4 (v1.15.0) behavior of the ImGui plugin on a device through the AutoJs6 global `imgui`.

Usage: py -3.12 -I tools/device_r4_check.py -s SERIAL [--timeout 300] [--keep]

Needs AutoJs6 (debug or release, with the `imgui` module) and the plugin installed, enabled and trusted, the overlay
permission for AutoJs6, the screen on and unlocked. Pushes one script, runs it through RunIntentActivity and prints one
line per check, PASS / FAIL with the key values. All pointer and key input comes from the new injection API, so the
results are exact and do not depend on the display dimming; the tool only starts the launcher Activity (the clipboard
needs the input focus) and takes a screenshot for the drawing checks. The new members are called on the API object of
the render callback (`ui`): a host older than the R4 names lists them on the global `imgui` only after the load.

- keys: addKeyEvent(F5, true): isKeyPressed true in the next frame, false in the one after, isKeyDown stays true,
  isKeyReleased true after the release; sendKey the same in two frames; getKeyPressedAmount counts repeats; getKeyName;
  isKeyChordPressed / shortcut with Ctrl+S, with and without Ctrl held; setNextItemShortcut presses a button.
- multi-*: injected drags on dragFloat3, sliderInt2, dragFloatRange2 and sliderAngle reach the exact values (R3.4).
- drop-*: injected drags deliver a string, a number and an object to a target, preview with AcceptBeforeDelivery,
  getDragDropPayload during the drag, a text item with SourceAllowNullID and a color from colorButton ("_COL4F").
- misuse: unmatched endDragDropSource / endDragDropTarget / popClipRect, a payload or an accept outside a source or a
  target and nesting throw and leave the session running.
- clipboard (Activity mode, which has the focus): set then get, the host's getClip, the host's setClip then get,
  Ctrl+C and Ctrl+V in an inputText.
- draw-*: a grid of cells with the new DrawList primitives, each checked by sample pixels of a screenshot.
- examples: listExamples() has 9 entries, widget-overview has the new sections, and each one starts and closes.
"""

from __future__ import annotations

import argparse
import pathlib
import queue
import struct
import subprocess
import sys
import threading
import time
import zlib

DEVICE_DIR = "/sdcard/Download/aj6-imgui-r4"
RUN_ACTIVITY = "org.autojs.autojs.external.open.RunIntentActivity"
LAUNCHER_ACTIVITY = "org.autojs.autojs.launcher.AdaptiveIconAlias"
PACKAGE = "org.autojs.autojs6"
MARK = "AJ6R4"
NATIVE_LOG_TAG = "AutoJs6-ImGui"

SCRIPT = r"""
var MARK = 'AJ6R4';
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
Script.prototype.moveTo = function (x, y) {
    return this.add(function (ui) { ui.addMousePosEvent(x, y); }).wait(2);
};
// Press at (x1, y1), move in `moves` frames to (x2, y2), hold, then release.
Script.prototype.drag = function (x1, y1, x2, y2, moves) {
    var self = this;
    this.moveTo(x1, y1);
    this.add(function (ui) { ui.addMouseButtonEvent(ui.MouseButton.Left, true); }).wait(3);
    for (var i = 1; i <= moves; i++) {
        (function (t) {
            self.add(function (ui) { ui.addMousePosEvent(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); });
        })(i / moves);
        this.wait(1);
    }
    this.wait(3);
    this.add(function (ui) { ui.addMouseButtonEvent(ui.MouseButton.Left, false); }).wait(3);
    return this;
};
Script.prototype.chord = function (modifier, key) {
    return this
        .add(function (ui) { ui.addKeyEvent(modifier, true); }).wait(1)
        .add(function (ui) { ui.sendKey(key); }).wait(3)
        .add(function (ui) { ui.addKeyEvent(modifier, false); }).wait(2);
};

steps.push(function () {
    section('keys');
    var frames = 0;
    var log = {};
    var buttonPresses = 0;
    var chordFrames = {};
    var names = null;
    var amount = 0;
    var errors = [];
    var script = new Script();
    var phase = 'press';

    function track(ui, name, key) {
        var entry = log[name] = log[name] || [];
        entry.push({
            frame: frames,
            pressed: ui.isKeyPressed(key, false),
            down: ui.isKeyDown(key),
            released: ui.isKeyReleased(key)
        });
    }

    var session = imgui.createWindow(function (ui) {
        frames++;
        fixedWindow(ui, 'R4 keys', ui.dp(250), ui.dp(100), function () {
            try {
                script.tick(ui);
                track(ui, 'f5', ui.Key.F5);
                track(ui, 'f6', ui.Key.F6);
                if (phase === 'hold') amount += ui.getKeyPressedAmount(ui.Key.F7, 0.05, 0.05);
                var chord = ui.Mod.Ctrl | ui.Key.S;
                if (ui.isKeyChordPressed(chord)) chordFrames.chord = (chordFrames.chord || 0) + 1;
                if (ui.shortcut(chord)) chordFrames.focused = (chordFrames.focused || 0) + 1;
                if (ui.shortcut(ui.Mod.Ctrl | ui.Key.D, ui.InputFlags.RouteGlobal)) {
                    chordFrames.global = (chordFrames.global || 0) + 1;
                }
                if (ui.isKeyChordPressed(ui.Key.S)) chordFrames.plain = (chordFrames.plain || 0) + 1;
                ui.setNextItemShortcut(ui.Key.F8);
                if (ui.button('F8')) buttonPresses++;
                if (names === null) {
                    names = [ui.getKeyName(ui.Key.F5), ui.getKeyName(ui.Key.None), ui.getKeyName(ui.Mod.Ctrl),
                        ui.getKeyName(ui.Key.Digit3), ui.getKeyName(ui.Key.Keypad5)].join(',');
                }
            } catch (e) {
                if (errors.length < 3) errors.push(String(e).slice(0, 160));
            }
        });
    }, {x: 0, y: 200, width: 260, height: 110, contentAutoResize: false, idleDelay: 600000});

    var press = {};
    script.wait(10)
        .add(function (ui) { press.f5 = frames; ui.addKeyEvent(ui.Key.F5, true); }).wait(5)
        .add(function (ui) { press.f5up = frames; ui.addKeyEvent(ui.Key.F5, false); }).wait(5)
        .add(function (ui) { press.f6 = frames; ui.sendKey(ui.Key.F6); }).wait(5)
        .add(function (ui) { phase = 'hold'; ui.addKeyEvent(ui.Key.F7, true); }).wait(40)
        .add(function (ui) { phase = 'done'; ui.addKeyEvent(ui.Key.F7, false); }).wait(3)
        .chord(imgui.Key.ModCtrl, imgui.Key.S)
        .chord(imgui.Key.ModCtrl, imgui.Key.D)
        .add(function (ui) { ui.sendKey(ui.Key.S); }).wait(3)
        .add(function (ui) { ui.sendKey(ui.Key.F8); }).wait(8);

    waitFor(function () { return script.idle(); }, 15000, function (met) {
        function at(name, frame) {
            return log[name].filter(function (e) { return e.frame === frame; })[0] || {};
        }
        var f = press.f5;
        var ok1 = at('f5', f + 1).pressed === true && at('f5', f + 2).pressed === false && at('f5', f + 2).down === true;
        var r = press.f5up;
        var ok2 = at('f5', r + 1).released === true && at('f5', r + 1).down === false && at('f5', r + 2).released === false;
        report('key-pressed', met && ok1 && ok2,
            'addKeyEvent frame+1 pressed=' + at('f5', f + 1).pressed + ' frame+2 pressed=' + at('f5', f + 2).pressed +
            ' down=' + at('f5', f + 2).down + ' released+1=' + at('f5', r + 1).released);
        var g = press.f6;
        report('key-sendKey', at('f6', g + 1).pressed === true && at('f6', g + 2).pressed === false &&
            at('f6', g + 2).released === true,
            'frame+1 pressed=' + at('f6', g + 1).pressed + ' frame+2 pressed=' + at('f6', g + 2).pressed +
            ' released=' + at('f6', g + 2).released);
        report('key-amount', amount >= 5, 'repeats in 40 frames=' + amount);
        report('key-name', names === 'F5,None,ModCtrl,3,Keypad5', 'names=' + names);
        // Ctrl+S, Ctrl+D, then S alone: a chord needs exactly its modifiers, so each query fires once.
        report('key-chord', chordFrames.chord === 1 && chordFrames.focused === 1 && chordFrames.global === 1 &&
            chordFrames.plain === 1, 'ctrlS=' + chordFrames.chord + ' shortcutFocused=' + chordFrames.focused +
            ' shortcutGlobal=' + chordFrames.global + ' plainS=' + (chordFrames.plain || 0));
        report('key-item-shortcut', buttonPresses === 1, 'presses=' + buttonPresses);
        report('key-errors', errors.length === 0, 'errors=' + errors.length + (errors.length ? ' ' + errors[0] : ''));
        session.close('done');
        later(500, next);
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
    var script = new Script();
    var session = imgui.createWindow(function (ui) {
        fixedWindow(ui, 'R4 multi', ui.dp(330), ui.dp(230), function () {
            var width = ui.dp(300);
            function place(key, components) {
                var origin = cursorScreen(ui);
                var inner = ui.dp(4);
                geo[key] = {
                    x: origin[0], y: origin[1] + ui.getFrameHeight() / 2,
                    component: (width - (components - 1) * inner) / components
                };
                ui.setNextItemWidth(width);
            }
            try {
                script.tick(ui);
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

    waitFor(function () { return geo.sliderAngle != null; }, 5000, function () {
        later(300, function () {
            // Drags move 100 px in 5 frames, past the drag threshold from the first one: the speed gives the value.
            // Sliders go past the right end, which is the maximum.
            function start(g) { return [g.x + g.component / 2, g.y]; }
            var a = start(geo.dragFloat3);
            var b = start(geo.sliderInt2);
            var c = start(geo.dragFloatRange2);
            var d = start(geo.sliderAngle);
            var checks = [];
            script.drag(a[0], a[1], a[0] + 100, a[1], 5)
                .add(function () { checks.push('dragFloat3'); })
                .drag(b[0], b[1], b[0] + geo.sliderInt2.component, b[1], 5)
                .add(function () { checks.push('sliderInt2'); })
                .drag(c[0], c[1], c[0] + 60, c[1], 3)
                .add(function () { checks.push('dragFloatRange2'); })
                .drag(d[0], d[1], d[0] + geo.sliderAngle.component, d[1], 5);
            waitFor(function () { return script.idle(); }, 10000, function (met) {
                var f = refs.dragFloat3;
                report('multi-dragFloat3', Math.abs(Number(f[0]) - 150) < 0.01 && Number(f[1]) === 200 && Number(f[2]) === 300,
                    'value=' + [0, 1, 2].map(function (i) { return round3(Number(f[i])); }).join(',') + ' expected=150,200,300');
                var s = refs.sliderInt2.value;
                report('multi-sliderInt2', s[0] === 100 && s[1] === 20, 'value=' + s.join(',') + ' expected=100,20');
                report('multi-dragFloatRange2', Math.abs(refs.rangeMin.value - 40) < 0.01 && refs.rangeMax.value === 90,
                    'value=' + round3(refs.rangeMin.value) + ',' + refs.rangeMax.value + ' expected=40,90');
                report('multi-sliderAngle', Math.abs(refs.sliderAngle.value - Math.PI) < 1e-4,
                    'value=' + round3(refs.sliderAngle.value) + ' rad expected=' + round3(Math.PI));
                report('multi-errors', met && errors.length === 0, 'errors=' + errors.length + (errors.length ? ' ' + errors[0] : ''));
                session.close('done');
                later(500, next);
            });
        });
    });
});

steps.push(function () {
    section('drop');
    var payloads = [
        ['string', 'text 中文 "quoted"'],
        ['number', 42.5],
        ['object', {id: 7, tags: ['a', 'b'], nested: {ok: true}, none: null}]
    ];
    var current = 0;
    var geo = {};
    var script = new Script();
    var delivered = [];
    var previews = 0;
    var beforeDelivery = 0;
    var dragging = [];
    var nested = 0;
    var textDropped = [];
    var colors = [];
    var errors = [];
    var misuse = null;
    var frames = 0;

    function center(ui, width, height) {
        var origin = cursorScreen(ui);
        return [origin[0] + width / 2, origin[1] + height / 2];
    }

    function attempt(ui, name, fn) {
        try {
            fn();
            return name + '=returned';
        } catch (e) {
            return /called|nested/.test(String(e)) ? '' : name + '=' + String(e).slice(0, 80);
        }
    }

    var session = imgui.createWindow(function (ui) {
        frames++;
        fixedWindow(ui, 'R4 drop', ui.dp(330), ui.dp(280), function () {
            try {
                script.tick(ui);
                var size = ui.dp(70);
                var height = ui.dp(36);
                geo.source = center(ui, size, height);
                ui.button('source', size, height);
                ui.withDragDropSource(function () {
                    ui.setDragDropPayload('R4_ITEM', payloads[current][1]);
                    ui.text('dragging');
                    try {
                        ui.beginDragDropTarget();
                    } catch (e) {
                        if (/nested/.test(String(e))) nested++;
                    }
                });
                ui.sameLine();
                geo.target = center(ui, size, height);
                ui.button('target', size, height);
                ui.withDragDropTarget(function () {
                    var payload = ui.acceptDragDropPayload('R4_ITEM');
                    if (payload !== null) delivered.push(payload);
                });
                ui.sameLine();
                geo.preview = center(ui, size, height);
                ui.button('preview', size, height);
                ui.withDragDropTarget(function () {
                    var flags = ui.DragDropFlags.AcceptBeforeDelivery;
                    var payload = ui.acceptDragDropPayload('R4_ITEM', flags);
                    if (payload !== null) {
                        if (payload.preview && !payload.delivery) beforeDelivery++;
                        if (payload.delivery) previews++;
                    }
                });
                var active = ui.getDragDropPayload();
                if (active !== null) dragging.push(active.type);

                ui.dummy(1, ui.dp(10));
                var textOrigin = cursorScreen(ui);
                ui.text('plain text item');
                geo.text = [textOrigin[0] + ui.dp(30), textOrigin[1] + ui.getTextLineHeight() / 2];
                ui.withDragDropSource(ui.DragDropFlags.SourceAllowNullID, function () {
                    ui.setDragDropPayload('R4_TEXT', 'from text');
                    ui.text('text');
                });
                ui.dummy(1, ui.dp(10));
                geo.color = center(ui, size, height);
                ui.colorButton('##color', [1, 0.5, 0, 1], 0, size, height);
                ui.sameLine();
                geo.colorTarget = center(ui, size, height);
                ui.button('drop here', size, height);
                ui.withDragDropTarget(function () {
                    var text = ui.acceptDragDropPayload('R4_TEXT');
                    if (text !== null) textDropped.push(text.data);
                    var color = ui.acceptDragDropPayload('_COL4F');
                    if (color !== null) colors.push(JSON.stringify(color.data));
                });

                if (frames === 5) {
                    misuse = [
                        attempt(ui, 'endSource', function () { ui.endDragDropSource(); }),
                        attempt(ui, 'endTarget', function () { ui.endDragDropTarget(); }),
                        attempt(ui, 'payload', function () { ui.setDragDropPayload('R4_ITEM', 1); }),
                        attempt(ui, 'accept', function () { ui.acceptDragDropPayload('R4_ITEM'); }),
                        attempt(ui, 'popClip', function () { ui.popClipRect(); }),
                        attempt(ui, 'popListClip', function () { ui.getWindowDrawList().popClipRect(); })
                    ].filter(Boolean);
                }
            } catch (e) {
                if (errors.length < 3) errors.push(String(e).slice(0, 160));
            }
        });
    }, {x: 0, y: 200, width: 340, height: 290, contentAutoResize: false, idleDelay: 600000});

    waitFor(function () { return geo.colorTarget != null && frames > 8; }, 5000, function () {
        later(300, function () {
            function run(index) {
                if (index >= payloads.length) {
                    extras();
                    return;
                }
                current = index;
                delivered = [];
                script.wait(2).drag(geo.source[0], geo.source[1], geo.target[0], geo.target[1], 8);
                waitFor(function () { return script.idle(); }, 6000, function () {
                    var payload = delivered[0];
                    var sent = JSON.stringify(payloads[index][1]);
                    var got = payload ? JSON.stringify(payload.data) : 'none';
                    report('drop-' + payloads[index][0], delivered.length === 1 && got === sent &&
                        payload.type === 'R4_ITEM' && payload.delivery === true,
                        'deliveries=' + delivered.length + ' equal=' + (got === sent) + ' jsonLength=' + got.length);
                    run(index + 1);
                });
            }
            function extras() {
                current = 0;
                dragging = [];
                delivered = [];
                script.wait(2).drag(geo.source[0], geo.source[1], geo.preview[0], geo.preview[1], 8);
                script.drag(geo.text[0], geo.text[1], geo.colorTarget[0], geo.colorTarget[1], 8);
                script.drag(geo.color[0], geo.color[1], geo.colorTarget[0], geo.colorTarget[1], 8);
                script.wait(4).add(function (ui) {
                    dragging.push(ui.getDragDropPayload() === null ? 'idle' : 'active');
                });
                waitFor(function () { return script.idle(); }, 8000, function () {
                    later(100, function () {
                        report('drop-preview', beforeDelivery >= 3 && previews === 1 && delivered.length === 0,
                            'framesBeforeDelivery=' + beforeDelivery + ' deliveries=' + previews);
                        report('drop-active', dragging.length > 5 && dragging[0] === 'R4_ITEM' &&
                            dragging[dragging.length - 1] === 'idle',
                            'framesWithPayload=' + (dragging.length - 1) + ' last=' + dragging[dragging.length - 1]);
                        report('drop-text', textDropped.length === 1 && textDropped[0] === 'from text',
                            'deliveries=' + textDropped.length + ' data=' + textDropped[0]);
                        report('drop-color', colors.length === 1 && colors[0] === '[1,0.5,0,1]',
                            'deliveries=' + colors.length + ' data=' + colors[0]);
                        report('drop-misuse', misuse !== null && misuse.length === 0 && nested > 0 && !session.closed,
                            'unexpected=' + (misuse === null ? 'not run' : misuse.join(' ')) + ' nestedThrows=' + nested +
                            ' closed=' + session.closed);
                        report('drop-errors', errors.length === 0, 'errors=' + errors.length + (errors.length ? ' ' + errors[0] : ''));
                        session.close('done');
                        later(500, next);
                    });
                });
            }
            run(0);
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

steps.push(function () {
    section('clipboard');
    var value = imgui.ref('copy me');
    var focus = 0;
    var frames = 0;
    var script = new Script();
    var results = {};
    var errors = [];
    var session = null;

    resumedActivity(function (resumed) {
        if (!resumed) {
            report('clipboard-activity', false, 'no resumed AutoJs6 Activity');
            next();
            return;
        }
        session = imgui.launch(function (ui) {
            frames++;
            fixedWindow(ui, 'R4 clipboard', ui.dp(300), ui.dp(120), function () {
                try {
                    script.tick(ui);
                    if (focus > 0) {
                        focus--;
                        ui.setKeyboardFocusHere(0);
                    }
                    ui.setNextItemWidth(ui.dp(280));
                    ui.inputText('##clip', value, 256);
                } catch (e) {
                    if (errors.length < 3) errors.push(String(e).slice(0, 160));
                }
            });
        }, {ime: false});

        waitFor(function () { return frames >= 10; }, 5000, function () {
            var text = 'AJ6R4 ' + Date.now() + ' 中文';
            imgui.setClipboardText(text);
            var read = imgui.getClipboardText();
            var host = String(getClip());
            report('clipboard-set-get', read === text, 'equal=' + (read === text) + ' length=' + read.length);
            report('clipboard-host-sees', host === text, 'getClip equal=' + (host === text));
            var fromHost = 'host ' + Date.now();
            setClip(fromHost);
            var back = imgui.getClipboardText();
            report('clipboard-host-writes', back === fromHost, 'equal=' + (back === fromHost));

            focus = 2;
            var ctrl = imgui.Key.ModCtrl;
            script.wait(6).chord(ctrl, imgui.Key.A).chord(ctrl, imgui.Key.C).add(function () {
                results.copied = imgui.getClipboardText();
                setClip('pasted 中文');
            }).wait(3).chord(ctrl, imgui.Key.A).chord(ctrl, imgui.Key.V).wait(4);
            waitFor(function () { return script.idle(); }, 8000, function () {
                report('clipboard-ctrl-c', results.copied === 'copy me', 'clipboard=' + results.copied);
                report('clipboard-ctrl-v', value.value === 'pasted 中文', 'equal=' + (value.value === 'pasted 中文'));
                report('clipboard-errors', errors.length === 0, 'errors=' + errors.length + (errors.length ? ' ' + errors[0] : ''));
                session.close('done');
                later(800, next);
            });
        });
    });
});

var CELL = 100;
var GREEN = [0, 1, 0, 1];
var RED = [1, 0, 0, 1];
var BLUE = [0, 0, 1, 1];
var WHITE = [1, 1, 1, 1];

// Each cell draws in a 100 px square and names sample points as fractions of it, with the expected color.
function drawCells(texture) {
    var L = [[0.05, 0.05], [0.4, 0.05], [0.4, 0.6], [0.95, 0.6], [0.95, 0.95], [0.05, 0.95]];
    var T = [[0.05, 0.05], [0.95, 0.05], [0.5, 0.95]];
    return [
        {name: 'ellipseFilled', at: [[0.5, 0.5, 'g'], [0.85, 0.5, 'g'], [0.5, 0.85, 'k']], draw: function (d, p) {
            d.addEllipseFilled(p(0.5, 0.5), [45, 20], GREEN);
        }},
        {name: 'ellipse', at: [[0.5, 0.5, 'k'], [0.95, 0.5, 'g'], [0.5, 0.85, 'k']], draw: function (d, p) {
            d.addEllipse(p(0.5, 0.5), [45, 20], GREEN, 0, 0, 6);
        }},
        {name: 'ngonFilled', at: [[0.5, 0.5, 'g'], [0.8, 0.5, 'g'], [0.1, 0.5, 'k']], draw: function (d, p) {
            d.addNgonFilled(p(0.5, 0.5), 45, GREEN, 3);
        }},
        {name: 'ngon', at: [[0.5, 0.5, 'k'], [0.94, 0.5, 'g']], draw: function (d, p) {
            d.addNgon(p(0.5, 0.5), 45, GREEN, 6, 6);
        }},
        {name: 'quadFilled', at: [[0.5, 0.5, 'g'], [0.1, 0.1, 'k']], draw: function (d, p) {
            d.addQuadFilled(p(0.5, 0.05), p(0.95, 0.5), p(0.5, 0.95), p(0.05, 0.5), GREEN);
        }},
        {name: 'quad', at: [[0.5, 0.5, 'k'], [0.725, 0.275, 'g']], draw: function (d, p) {
            d.addQuad(p(0.5, 0.05), p(0.95, 0.5), p(0.5, 0.95), p(0.05, 0.5), GREEN, 6);
        }},
        {name: 'bezierQuadratic', at: [[0.5, 0.45, 'g'], [0.5, 0.9, 'k']], draw: function (d, p) {
            d.addBezierQuadratic(p(0.05, 0.9), p(0.5, 0), p(0.95, 0.9), GREEN, 10);
        }},
        {name: 'rectMultiColor', at: [[0.05, 0.05, 'r'], [0.95, 0.05, 'g'], [0.95, 0.95, 'b'], [0.05, 0.95, 'w']],
            draw: function (d, p) {
                d.addRectFilledMultiColor(p(0, 0), p(1, 1), RED, GREEN, BLUE, WHITE);
            }},
        {name: 'convexPoly', at: [[0.5, 0.4, 'g'], [0.1, 0.9, 'k']], draw: function (d, p) {
            d.addConvexPolyFilled(T.map(function (q) { return p(q[0], q[1]); }), GREEN);
        }},
        {name: 'concavePoly', at: [[0.2, 0.3, 'g'], [0.8, 0.8, 'g'], [0.7, 0.3, 'k']], draw: function (d, p) {
            d.addConcavePolyFilled(L.map(function (q) { return p(q[0], q[1]); }), GREEN);
        }},
        {name: 'pathFillConvex', at: [[0.5, 0.4, 'g'], [0.1, 0.9, 'k']], draw: function (d, p) {
            d.pathClear();
            T.forEach(function (q) { d.pathLineTo(p(q[0], q[1])); });
            d.pathFillConvex(GREEN);
        }},
        {name: 'pathFillConcave', at: [[0.2, 0.3, 'g'], [0.8, 0.8, 'g'], [0.7, 0.3, 'k']], draw: function (d, p) {
            L.forEach(function (q) { d.pathLineTo(p(q[0], q[1])); });
            d.pathFillConcave(GREEN);
        }},
        {name: 'pathArcTo', at: [[0.7, 0.7, 'g'], [0.3, 0.3, 'k'], [0.7, 0.3, 'k']], draw: function (d, p) {
            d.pathLineTo(p(0.5, 0.5)).pathArcTo(p(0.5, 0.5), 45, 0, Math.PI / 2).pathFillConvex(GREEN);
        }},
        {name: 'pathArcToFast', at: [[0.7, 0.7, 'g'], [0.3, 0.3, 'k'], [0.7, 0.3, 'k']], draw: function (d, p) {
            d.pathLineTo(p(0.5, 0.5)).pathArcToFast(p(0.5, 0.5), 45, 0, 3).pathFillConvex(GREEN);
        }},
        {name: 'pathBezierCubic', at: [[0.5, 0.5, 'g'], [0.2, 0.9, 'k']], draw: function (d, p) {
            d.pathLineTo(p(0.05, 0.5)).pathBezierCubicCurveTo(p(0.35, 0.05), p(0.65, 0.95), p(0.95, 0.5))
                .pathStroke(GREEN, 10);
        }},
        {name: 'pathBezierQuadratic', at: [[0.5, 0.45, 'g'], [0.5, 0.9, 'k']], draw: function (d, p) {
            d.pathLineTo(p(0.05, 0.9)).pathBezierQuadraticCurveTo(p(0.5, 0), p(0.95, 0.9)).pathStroke(GREEN, 10);
        }},
        {name: 'pathRect', at: [[0.5, 0.5, 'k'], [0.5, 0.1, 'g']], draw: function (d, p, ui) {
            d.pathRect(p(0.1, 0.1), p(0.9, 0.9), 10).pathStroke(GREEN, 6, ui.DrawFlags.Closed);
        }},
        {name: 'listClip', at: [[0.5, 0.5, 'g'], [0.1, 0.1, 'k'], [0.87, 0.87, 'g']], draw: function (d, p) {
            d.pushClipRect(p(0.3, 0.3), p(0.7, 0.7), true).addRectFilled(p(0, 0), p(1, 1), GREEN).popClipRect();
            d.addRectFilled(p(0.8, 0.8), p(0.95, 0.95), GREEN);
        }},
        {name: 'windowClip', at: [[0.5, 0.5, 'g'], [0.1, 0.1, 'k'], [0.87, 0.87, 'g']], draw: function (d, p, ui) {
            ui.pushClipRect(p(0.3, 0.3), p(0.7, 0.7));
            d.addRectFilled(p(0, 0), p(1, 1), GREEN);
            ui.popClipRect();
            d.addRectFilled(p(0.8, 0.8), p(0.95, 0.95), GREEN);
        }},
        {name: 'imageQuad', at: [[0.25, 0.5, 'g'], [0.75, 0.5, 'r']], draw: function (d, p) {
            // The texture has red on the left: the coordinates flip it horizontally.
            d.addImageQuad(texture, p(0.05, 0.05), p(0.95, 0.05), p(0.95, 0.95), p(0.05, 0.95),
                {uv1: [1, 0], uv2: [0, 0], uv3: [0, 1], uv4: [1, 1]});
        }},
        {name: 'imageRounded', at: [[0.25, 0.5, 'r'], [0.75, 0.5, 'g'], [0.07, 0.07, 'k']], draw: function (d, p) {
            d.addImageRounded(texture, p(0.05, 0.05), p(0.95, 0.95), 40);
        }}
    ];
}

steps.push(function () {
    section('draw');
    var frames = 0;
    var errors = [];
    var texture = null;
    var cells = null;
    var origins = [];
    var session = imgui.createWindow(function (ui) {
        frames++;
        if (texture === null) {
            var bitmap = android.graphics.Bitmap.createBitmap(2, 1, android.graphics.Bitmap.Config.ARGB_8888);
            bitmap.setPixel(0, 0, android.graphics.Color.RED);
            bitmap.setPixel(1, 0, android.graphics.Color.GREEN);
            texture = ui.createTexture(bitmap, {flags: ui.TextureFlags.Nearest});
            cells = drawCells(texture);
        }
        var columns = 5;
        var rows = Math.ceil(cells.length / columns);
        var width = columns * CELL + 40;
        var height = rows * CELL + 40;
        fixedWindow(ui, 'R4 draw', width, height, function () {
            var d = ui.getWindowDrawList();
            d.addRectFilled([0, 0], [width, height], [0, 0, 0, 1]);
            cells.forEach(function (cell, index) {
                var left = 10 + (index % columns) * (CELL + 2);
                var top = 10 + Math.floor(index / columns) * (CELL + 2);
                origins[index] = [left, top];
                var p = function (fx, fy) { return [left + fx * CELL, top + fy * CELL]; };
                try {
                    cell.draw(d, p, ui);
                } catch (e) {
                    if (errors.length < 3) errors.push(cell.name + ': ' + String(e).slice(0, 120));
                }
            });
        });
    }, {x: 0, y: 200, width: 390, height: 420, contentAutoResize: false, idleDelay: 600000});
    session.on('error', function (event) {
        errors.push('event ' + String(event && event.message).slice(0, 120));
    });

    waitFor(function () { return frames >= 20; }, 8000, function () {
        var origin = surfaceOrigin(session);
        var width = Number(session.surfaceView.getWidth());
        var height = Number(session.surfaceView.getHeight());
        report('draw-surface', width >= 5 * CELL + 40 && height >= 5 * CELL + 40, 'surface=' + width + 'x' + height);
        cells.forEach(function (cell, index) {
            cell.at.forEach(function (sample) {
                var x = Math.round(origin[0] + origins[index][0] + sample[0] * CELL);
                var y = Math.round(origin[1] + origins[index][1] + sample[1] * CELL);
                console.log(MARK + ' sample ' + cell.name + ' ' + x + ' ' + y + ' ' + sample[2]);
            });
        });
        action('screencap');
        later(4000, function () {
            report('draw-errors', errors.length === 0, 'errors=' + errors.length + (errors.length ? ' ' + errors[0] : ''));
            session.close('done');
            later(500, next);
        });
    });
});

steps.push(function () {
    section('examples');
    var names = imgui.listExamples().map(function (e) { return String(e && e.name !== undefined ? e.name : e); });
    var total = names.length;
    var overview = String(imgui.getExampleSource('widget-overview'));
    var hasDrop = overview.indexOf('withDragDropSource') >= 0;
    var hasDraw = overview.indexOf('pathArcTo') >= 0;
    report('example-list', total === 9 && hasDrop && hasDraw, 'length=' + total + ' dragDrop=' + hasDrop + ' drawing=' + hasDraw);
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



def color_matches(color: str, red: int, green: int, blue: int) -> bool:
    """Coarse color classes: a wide-gamut display maps pure green to about (117, 251, 76) in the screenshot."""
    if color == "k":
        return max(red, green, blue) < 64
    if color == "w":
        return min(red, green, blue) > 180
    main, *others = {"r": (red, green, blue), "g": (green, red, blue), "b": (blue, red, green)}[color]
    return main > 170 and all(main - other > 80 for other in others)


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


def decode_png(data: bytes) -> tuple[int, int, int, bytes]:
    """Width, height, bytes per pixel and raw rows without filters of an 8-bit non-interlaced PNG (screencap -p)."""
    position = 8
    idat = bytearray()
    width = height = channels = 0
    while position < len(data):
        length, kind = struct.unpack(">I4s", data[position:position + 8])
        body = data[position + 8:position + 8 + length]
        if kind == b"IHDR":
            width, height, depth, color_type = struct.unpack(">IIBB", body[:10])
            channels = {2: 3, 6: 4}[color_type]
            if depth != 8 or body[12] != 0:
                raise ValueError("unsupported PNG")
        elif kind == b"IDAT":
            idat += body
        position += 12 + length
    raw = zlib.decompress(bytes(idat))
    stride = width * channels
    result = bytearray(height * stride)
    previous = bytearray(stride)
    for row in range(height):
        start = row * (stride + 1)
        kind = raw[start]
        line = bytearray(raw[start + 1:start + 1 + stride])
        for i in range(stride):
            left = line[i - channels] if i >= channels else 0
            up = previous[i]
            corner = previous[i - channels] if i >= channels else 0
            if kind == 1:
                line[i] = (line[i] + left) & 255
            elif kind == 2:
                line[i] = (line[i] + up) & 255
            elif kind == 3:
                line[i] = (line[i] + (left + up) // 2) & 255
            elif kind == 4:
                estimate = left + up - corner
                a, b, c = abs(estimate - left), abs(estimate - up), abs(estimate - corner)
                line[i] = (line[i] + (left if a <= b and a <= c else up if b <= c else corner)) & 255
        result[row * stride:(row + 1) * stride] = line
        previous = line
    return width, height, channels, bytes(result)


def check_samples(serial: str, samples: list[str]) -> list[str]:
    """Compares the sample points with a screenshot and returns one result line per cell."""
    capture = subprocess.run(["adb", "-s", serial, "exec-out", "screencap", "-p"], capture_output=True)
    width, height, channels, pixels = decode_png(capture.stdout)
    cells: dict[str, list[str]] = {}
    for sample in samples:
        _, name, x_text, y_text, color = sample.split()
        x, y = int(x_text), int(y_text)
        offset = (y * width + x) * channels
        actual = tuple(pixels[offset:offset + 3]) if 0 <= x < width and 0 <= y < height else (-1, -1, -1)
        if not color_matches(color, *actual):
            cells.setdefault(name, []).append(f"{x},{y} {color} got {actual}")
        else:
            cells.setdefault(name, [])
    return [f"draw-{name} {'FAIL ' + '; '.join(bad[:2]) if bad else 'PASS'}" for name, bad in cells.items()]


def perform(serial: str, request: str, samples: list[str]) -> tuple[str, list[str]]:
    """Runs what the device script asked for; returns a short note and the result lines of the screenshot."""
    if request == "main-activity":
        result = adb(serial, "shell", "am", "start", "-n", PACKAGE + "/" + LAUNCHER_ACTIVITY)
        return "am start launcher " + ("ok" if result.returncode == 0 else result.stderr.strip()[:120]), []
    if request == "screencap":
        return f"screencap samples={len(samples)}", check_samples(serial, samples)
    return "unknown action " + request, []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-s", "--serial", required=True)
    parser.add_argument("--timeout", type=float, default=300)
    parser.add_argument("--keep", action="store_true", help="keep the pushed script and the local copy")
    args = parser.parse_args()

    if "mWakefulness=Awake" not in adb(args.serial, "shell", "dumpsys", "power").stdout:
        print("SETUP the screen is off: turn it on and unlock the device first")
        return 2

    local = pathlib.Path(__file__).resolve().parent / "device_r4_check.generated.js"
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
        samples: list[str] = []
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
            if line.startswith(MARK + " sample "):
                samples.append(line[len(MARK) + 1:])
                continue
            seen.append(line)
            if line.startswith(MARK + " action "):
                note, results = perform(args.serial, line[len(MARK + " action "):], samples)
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
        printed = example_failures(console)
        print(f"example-console {'PASS' if printed == 0 else 'FAIL'} failures={printed}")
        failed = [line for line in seen if " FAIL" in line]
        drawn = [line for line in seen if line.startswith(MARK + " draw-") and " PASS" in line]
        print(f"draw-cells {'PASS' if len(drawn) >= 21 else 'FAIL'} passed={len(drawn)}")
        return 0 if not failed and printed == 0 and len(drawn) >= 21 else 1
    finally:
        if not args.keep:
            adb(args.serial, "shell", "rm", "-r", DEVICE_DIR)
            local.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
