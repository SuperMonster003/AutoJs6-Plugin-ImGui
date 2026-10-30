package io.github.supermonster003.autojs6.plugin.imgui;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Runs the JavaScript facade (assets/plugin/index.js) in Rhino with a recording bridge, for the argument mapping that
 * needs no native library or Android window. The overlay window of createWindow is a script stub with a display of
 * 1080 x 2400 px at density 2.5.
 */
public class ImGuiScriptFacadeTest {

    private static final String SETUP = String.join("\n",
        "var android = Packages.android;",
        "var module = {exports: null};",
        "var printed = [];",
        "var console = {",
        "    log: function (m) { printed.push(String(m)); },",
        "    warn: function (m) { printed.push(String(m)); },",
        "    error: function (m) { printed.push(String(m)); }",
        "};",
        "var calls = [];",
        "function record(name) {",
        "    return function () {",
        "        calls.push({name: name, args: Array.prototype.slice.call(arguments)});",
        "    };",
        "}",
        "var bridge = {};",
        "['plotLines', 'plotHistogram', 'textColored', 'pushStyleColor', 'setStyleColor', 'setWindowSecure',",
        "    'setWindowSplitTouch', 'setWindowAlpha', 'clearWindowTouchableRegion', 'setWindowTouchableRegion'",
        "].forEach(function (name) { bridge[name] = record(name); });",
        "var timers = [];",
        "function setTimeout(callback) { timers.push(callback); return timers.length; }",
        "function clearTimeout() {}",
        // events.emitter(thread) queues each emit for the test to run, as the host queues it on the thread's timer.
        "var dispatched = [];",
        "var events = {",
        "    on: function () {},",
        "    removeListener: function () {},",
        "    emitter: function () {",
        "        var handlers = {};",
        "        return {",
        "            on: function (name, handler) { handlers[name] = handler; },",
        "            emit: function (name, value) { dispatched.push(function () { handlers[name](value); }); }",
        "        };",
        "    }",
        "};",
        "var metrics = {density: 2.5, widthPixels: 1080, heightPixels: 2400};",
        "var configuration = {fontScale: 1};",
        "var context = {",
        "    getResources: function () {",
        "        return {",
        "            getDisplayMetrics: function () { return metrics; },",
        "            getConfiguration: function () { return configuration; }",
        "        };",
        "    },",
        "    getSystemService: function () { throw new Error('no window service'); }",
        "};",
        "var runtime = {};",
        "var org = {autojs: {autojs: {core: {image: {ImageWrapper: {",
        "    ofBitmap: function (owner, bitmap) { return {owner: owner, bitmap: bitmap}; }",
        "}}}}}};",
        "var holderCallbacks = [];",
        "var holder = {",
        "    setFormat: function () {},",
        "    addCallback: function (callback) { holderCallbacks.push(callback); },",
        "    getSurface: function () { return {isValid: function () { return false; }}; }",
        "};",
        "var surfaceView = {",
        "    setZOrderOnTop: function () {},",
        "    getHolder: function () { return holder; },",
        "    post: function () { return true; },",
        "    setOnTouchListener: function (listener) { touchListener = listener; }",
        "};",
        "var touchListener = null;",
        "var windowCalls = [];",
        "var floaty = {",
        "    rawWindow: function () {",
        "        return {",
        "            imgui_surface: surfaceView,",
        "            setSize: function (w, h) { windowCalls.push('size:' + w + 'x' + h); },",
        "            setPosition: function (x, y) { windowCalls.push('position:' + x + ',' + y); },",
        "            setTouchable: function () {},",
        "            close: function () {}",
        "        };",
        "    }",
        "};",
        "function openWindow() {",
        "    return api.createWindow(function () {}, {x: 100, y: 100, width: 200, height: 100, ime: false});",
        "}",
        // A window that has a surface and has rendered one frame; frame() renders the next one.
        "function frame() { timers.splice(0).forEach(function (timer) { timer(); }); }",
        "function openReadyWindow(extra) {",
        "    timers.length = 0;",
        "    ['init', 'isOwner', 'isReady', 'newFrame', 'render'].forEach(function (name) {",
        "        var recorded = record(name);",
        "        bridge[name] = function () { recorded.apply(null, arguments); return true; };",
        "    });",
        "    ['getInteractiveWindowRects', 'getAutoResizeBounds'].forEach(function (name) {",
        "        bridge[name] = function () { return null; };",
        "    });",
        "    bridge.wantTextInput = function () { return false; };",
        "    bridge.touchEvent = record('touchEvent');",
        "    bridge.addMouseWheelEvent = record('addMouseWheelEvent');",
        "    bridge.setDisplayScale = record('setDisplayScale');",
        "    bridge.setFontScale = record('setFontScale');",
        "    bridge.shutdown = record('shutdown');",
        "    var windowOptions = {x: 100, y: 100, width: 200, height: 100, ime: false};",
        "    for (var name in extra) { windowOptions[name] = extra[name]; }",
        "    var session = api.createWindow(function () {}, windowOptions);",
        "    holderCallbacks[holderCallbacks.length - 1].surfaceCreated({getSurface: function () { return null; }});",
        "    frame();",
        "    return session;",
        "}",
        // Pointers as [x, y] pairs; the first one is also the raw position.
        "function touch(action, pointers) {",
        "    return touchListener(surfaceView, {",
        "        getActionMasked: function () { return action; },",
        "        getX: function (index) { return pointers[index || 0][0]; },",
        "        getY: function (index) { return pointers[index || 0][1]; },",
        "        getRawX: function () { return pointers[0][0]; },",
        "        getRawY: function () { return pointers[0][1]; },",
        "        getPointerCount: function () { return pointers.length; },",
        "        getEventTime: function () { return 1000; }",
        "    });",
        "}",
        "var MotionEvent = android.view.MotionEvent;",
        "function namedCalls(name) {",
        "    return calls.filter(function (c) { return c.name === name; }).map(function (c) { return c.args.join(' '); });",
        "}"
    );

    private Context context;
    private Scriptable scope;

    @Before
    public void loadFacade() throws IOException {
        context = Context.enter();
        context.setLanguageVersion(Context.VERSION_ES6);
        context.setInterpretedMode(true);
        scope = context.initStandardObjects();
        context.evaluateString(scope, SETUP, "setup", 1, null);
        context.evaluateString(scope, readFacade(), "index.js", 1, null);
        context.evaluateString(scope, "var api = module.exports.call(this, bridge);", "load", 1, null);
    }

    @After
    public void exit() {
        Context.exit();
    }

    @Test
    public void plotValuesOffsetIsPreferredOverLegacyOffset() {
        assertEquals("2,1", plot("plotLines", "{valuesOffset: 2}"));
        assertEquals("3,1", plot("plotLines", "{offset: 3}"));
        assertEquals("1,1", plot("plotLines", "{valuesOffset: 1, offset: 5}"));
        assertEquals("0,1", plot("plotLines", "{}"));
        assertEquals("0,1", plot("plotLines", "undefined"));
    }

    @Test
    public void plotStrideReachesTheBridge() {
        assertEquals("2,2", plot("plotLines", "{valuesOffset: 2, stride: 2}"));
        assertEquals("2,2", plot("plotHistogram", "{offset: 2, stride: 2}"));
        assertEquals("0,3", plot("plotHistogram", "{stride: 3}"));
    }

    @Test
    public void plotPassesTheValuesUnchanged() {
        Object values = eval(
            "calls.length = 0; api.plotLines('p', [0, 1, 2, 3, 4, 5, 6, 7], {valuesOffset: 2, stride: 2});"
                + "var sent = calls[0].args[1]; sent.length + ':' + sent[0] + ':' + sent[7];"
        );
        assertEquals("8:0:7", String.valueOf(values));
    }

    @Test
    public void invalidArgumentsNameTheApiAndTheArgument() {
        String[][] cases = {
            // expression, error, API, argument
            {"api.sliderFloat('s', 0.5, 0, NaN)", "TypeError", "sliderFloat", "max"},
            {"api.sliderFloat('s', 0.5, 'a', 1)", "TypeError", "sliderFloat", "min"},
            {"api.sliderInt('s', 1, 0, Infinity)", "TypeError", "sliderInt", "max"},
            {"api.checkbox('c', 'yes')", "TypeError", "checkbox", "value"},
            {"api.setNextWindowPos('x', 10)", "TypeError", "setNextWindowPos", "x"},
            {"api.setNextWindowPos(10, null)", "TypeError", "setNextWindowPos", "y"},
            {"api.setNextWindowBgAlpha(2)", "RangeError", "setNextWindowBgAlpha", "alpha"},
            {"api.progressBar(NaN)", "TypeError", "progressBar", "fraction"},
            {"api.dummy('10', 10)", "TypeError", "dummy", "width"},
            {"api.arrowButton('a', 9)", "RangeError", "arrowButton", "direction"},
            {"api.invisibleButton('b', 0, 10)", "RangeError", "invisibleButton", "width"},
            {"api.beginTable('t', 0)", "RangeError", "beginTable", "columns"},
            {"api.tableSetColumnIndex(-1)", "RangeError", "tableSetColumnIndex", "columnIndex"},
            {"api.pushStyleColor('nope', 0)", "RangeError", "pushStyleColor", "index"},
            {"api.pushStyleColor(999, 0)", "RangeError", "pushStyleColor", "index"},
            {"api.pushStyleVar('nope', 1)", "RangeError", "pushStyleVar", "index"},
            {"api.setWindowFontScale(0)", "RangeError", "setWindowFontScale", "scale"},
            {"api.setScrollHereY(2)", "RangeError", "setScrollHereY", "centerRatio"},
            {"api.isMouseClicked(9)", "RangeError", "isMouseClicked", "button"},
            {"api.sameLine('a')", "TypeError", "sameLine", "offsetFromStartX"},
            {"api.setCursorPos('x', 1)", "TypeError", "setCursorPos", "x"},
            {"api.indent(NaN)", "TypeError", "indent", "width"},
            {"api.pushItemWidth(NaN)", "TypeError", "pushItemWidth", "width"},
            {"api.plotLines('p', [1, 2], {stride: 0})", "RangeError", "plotLines", "options.stride"},
            {"api.plotHistogram('p', [1, 2], {stride: -4})", "RangeError", "plotHistogram", "options.stride"},
            {"api.plotLines('p', 'abc')", "TypeError", "plotLines", "values"},
            {"api.imageButton('i', null, 10, 10)", "TypeError", "imageButton", "texture"},
            {"api.textColored('#12', 'x')", "TypeError", "textColored", "color"},
            {"api.textColored({r: 0, g: 0}, 'x')", "TypeError", "textColored", "color"},
            {"api.textColored([0, 300, 0], 'x')", "RangeError", "textColored", "color[1]"},
            {"api.colorU32('zz')", "TypeError", "colorU32", "color"},
            {"api.setTheme('neon')", "RangeError", "setTheme", "name"},
            {"api.icon('no-such-icon')", "RangeError", "icon", "name"},
            {"api.dp('1')", "TypeError", "dp", "value"},
            {"api.px(NaN)", "TypeError", "px", "value"},
            {"api.createWindow(null)", "TypeError", "createWindow", "renderCallback"},
            {"api.createWindow(function () {}, {x: 'a'})", "TypeError", "createWindow", "options.x"},
            {"api.createWindow(function () {}, {width: 0})", "RangeError", "createWindow", "options.width"},
            {"api.createWindow(function () {}, {fps: 200})", "RangeError", "createWindow", "options.fps"},
            {"api.createWindow(function () {}, {alpha: 1.5})", "RangeError", "createWindow", "options.alpha"},
            {"api.createWindow(function () {}, {mode: 'weird'})", "RangeError", "createWindow", "options.mode"},
            {"api.createWindow(function () {}, {touchMode: 'sometimes'})", "RangeError", "createWindow",
                "options.touchMode"},
            {"api.createWindow(function () {}, {fonts: [{path: 'a', id: 'default'}]})", "RangeError",
                "createWindow", "options.fonts[0].id"},
            {"api.createWindow(function () {}, {rotation: 45})", "RangeError", "createWindow", "options.rotation"},
            {"openWindow().setPosition('a', 0)", "TypeError", "Session.setPosition", "x"},
            {"openWindow().setSize(10, 0)", "RangeError", "Session.setSize", "height"},
            {"openWindow().setAlpha(-1)", "RangeError", "Session.setAlpha", "alpha"},
            {"openWindow().on('moved', 1)", "TypeError", "Session.on", "listener"},
            {"api.showMetricsWindow(true)", "TypeError", "showMetricsWindow", "open"},
            {"api.tableSetupColumn('c', 0, 0, -1)", "RangeError", "tableSetupColumn", "userId"},
            {"api.dragFloat3('d', {value: [1, 2]})", "TypeError", "dragFloat3", "value.value"},
            {"api.dragInt2('d', {value: [1, 'x']})", "TypeError", "dragInt2", "value.value[1]"},
            {"api.sliderFloat2('s', [1, 2])", "TypeError", "sliderFloat2", "value"},
            {"api.inputInt4('i', api.floats([1, 2, 3, 4]))", "TypeError", "inputInt4", "value"},
            {"api.sliderInt2('s', {value: [1, 2]}, 'a')", "TypeError", "sliderInt2", "min"},
            {"api.dragFloatRange2('r', {value: 0}, 1)", "TypeError", "dragFloatRange2", "currentMax"},
            {"api.sliderAngle('a', {value: 0}, 'x')", "TypeError", "sliderAngle", "degreesMin"},
            {"api.ints([1, NaN])", "TypeError", "ints", "values[1]"},
            {"api.addMousePosEvent(NaN, 1)", "TypeError", "addMousePosEvent", "x"},
            {"api.addMousePosEvent(1)", "TypeError", "addMousePosEvent", "y"},
            {"api.addMouseButtonEvent(5, true)", "RangeError", "addMouseButtonEvent", "button"},
            {"api.isKeyDown()", "TypeError", "isKeyDown", "key"},
            {"api.isKeyDown(0)", "RangeError", "isKeyDown", "key"},
            {"api.isKeyPressed(100)", "RangeError", "isKeyPressed", "key"},
            {"api.isKeyReleased(667)", "RangeError", "isKeyReleased", "key"},
            {"api.isKeyReleased(api.Mod.Ctrl | api.Mod.Shift)", "RangeError", "isKeyReleased", "key"},
            {"api.getKeyPressedAmount(api.Key.A, 'x', 1)", "TypeError", "getKeyPressedAmount", "repeatDelay"},
            {"api.getKeyName(1)", "RangeError", "getKeyName", "key"},
            {"api.isKeyChordPressed(0)", "RangeError", "isKeyChordPressed", "keyChord"},
            {"api.shortcut(api.Mod.Ctrl | api.Mod.Shift)", "RangeError", "shortcut", "keyChord"},
            {"api.shortcut(api.Mod.Ctrl | 5)", "RangeError", "shortcut", "keyChord"},
            {"api.setNextItemShortcut(api.Key.A, 'x')", "TypeError", "setNextItemShortcut", "flags"},
            {"api.setDragDropPayload(1, 2)", "TypeError", "setDragDropPayload", "type"},
            {"api.setDragDropPayload('', 2)", "RangeError", "setDragDropPayload", "type"},
            {"api.setDragDropPayload('_COL4F', 2)", "RangeError", "setDragDropPayload", "type"},
            {"api.setDragDropPayload(new Array(34).join('x'), 2)", "RangeError", "setDragDropPayload", "type"},
            {"api.setDragDropPayload('T', undefined)", "TypeError", "setDragDropPayload", "data"},
            {"var o = {}; o.o = o; api.setDragDropPayload('T', o)", "TypeError", "setDragDropPayload", "data"},
            {"api.setDragDropPayload('T', new Array(65537).join('x'))", "RangeError", "setDragDropPayload", "data"},
            {"api.setDragDropPayload('T', 1, api.Cond.Appearing)", "RangeError", "setDragDropPayload", "condition"},
            {"api.acceptDragDropPayload(null)", "TypeError", "acceptDragDropPayload", "type"},
            {"api.pushClipRect([0], [1, 1])", "TypeError", "pushClipRect", "minimum"},
            {"api.getWindowDrawList().addNgon([0, 0], 1, 0, 2)", "RangeError", "DrawList.addNgon", "segments"},
            {"api.getWindowDrawList().addEllipse([0, 0], 1, 0)", "TypeError", "DrawList.addEllipse", "radius"},
            {"api.getWindowDrawList().addConvexPolyFilled([[0, 0], [1, 1]], 0)",
                "RangeError", "DrawList.addConvexPolyFilled", "points"},
            {"api.getWindowDrawList().addRectFilledMultiColor([0, 0], [1, 1], 0, 0, 0)",
                "TypeError", "DrawList.addRectFilledMultiColor", "colorBottomLeft"},
            {"api.getWindowDrawList().pathArcTo([0, 0], 1, 0, 1000)", "RangeError", "DrawList.pathArcTo", "angleMax"},
            {"api.getWindowDrawList().pathArcToFast([0, 0], 1, 5, 4)", "RangeError", "DrawList.pathArcToFast", "maxOf12"},
            {"api.getWindowDrawList().pathArcToFast([0, 0], 1, 0, 193)", "RangeError", "DrawList.pathArcToFast", "maxOf12"},
        };
        for (String[] c : cases) {
            String expected = c[1] + ":imgui." + c[2] + ": argument " + '"' + c[3] + '"' + " ";
            String actual = failure(c[0]);
            assertTrue(c[0] + " -> " + actual, actual.startsWith(expected));
        }
        assertEquals(
            "TypeError:imgui.sliderFloat: argument " + '"' + "max" + '"' + " must be a finite number",
            failure("api.sliderFloat('s', 0.5, 0, NaN)")
        );
        assertEquals(
            "RangeError:imgui.setNextWindowBgAlpha: argument " + '"' + "alpha" + '"' + " must be between 0 and 1, got 2",
            failure("api.setNextWindowBgAlpha(2)")
        );
    }

    @Test
    public void listClipperPassesIncludeItemsAndEndsEveryScope() {
        eval(
            "var clipperRanges = [];"
                + "bridge.listClipperBegin = function (count, height, include) {"
                + "    var kept = [];"
                + "    for (var i = 0; include != null && i < include.length; i += 1) kept.push(include[i]);"
                + "    calls.push({name: 'begin', args: [count, height, include == null ? 'null' : kept.join(' ')]});"
                + "};"
                + "bridge.listClipperStep = function () { return clipperRanges.length ? clipperRanges.shift() : null; };"
                + "bridge.listClipperEnd = record('end');"
        );
        assertEquals(
            "begin:100,20,5 99 7|end:|0-10;50-51",
            String.valueOf(eval(
                "calls.length = 0; clipperRanges = [[0, 10], [50, 51]]; var seen = [];"
                    + "api.listClipper(100, {itemHeight: 20, includeItems: [5, -1, 100, 99, 7.4]},"
                    + "    function (start, end) { seen.push(start + '-' + end); });"
                    + "calls.map(function (c) { return c.name + ':' + c.args.join(','); }).join('|') + '|'"
                    + " + seen.join(';')"
            ))
        );
        assertEquals(
            "begin:3,-1,null|end:|0-3",
            String.valueOf(eval(
                "calls.length = 0; clipperRanges = [[0, 3]]; seen = [];"
                    + "api.ListClipper(3, function (start, end) { seen.push(start + '-' + end); });"
                    + "calls.map(function (c) { return c.name + ':' + c.args.join(','); }).join('|') + '|'"
                    + " + seen.join(';')"
            ))
        );
        assertEquals(
            "boom|begin,end",
            String.valueOf(eval(
                "calls.length = 0; clipperRanges = [[0, 3]];"
                    + "var thrown = (function () { try { api.listClipper(3, function () { throw new Error('boom'); }); }"
                    + " catch (e) { return e.message; } })();"
                    + "thrown + '|' + calls.map(function (c) { return c.name; }).join(',')"
            ))
        );
        String[][] cases = {
            {"api.listClipper(-1, function () {})", "RangeError", "itemCount"},
            {"api.listClipper('10', function () {})", "TypeError", "itemCount"},
            {"api.listClipper(10, {})", "TypeError", "callback"},
            {"api.listClipper(10, 5, function () {})", "TypeError", "options"},
            {"api.listClipper(10, {itemHeight: 0}, function () {})", "RangeError", "options.itemHeight"},
            {"api.listClipper(10, {includeItems: 'abc'}, function () {})", "TypeError", "options.includeItems"},
            {"api.listClipper(10, {includeItems: [1, 'x']}, function () {})", "TypeError", "options.includeItems[1]"},
        };
        for (String[] c : cases) {
            String expected = c[1] + ":imgui.listClipper: argument " + '"' + c[2] + '"' + " ";
            String actual = failure("calls.length = 0; " + c[0]);
            assertTrue(c[0] + " -> " + actual, actual.startsWith(expected));
            assertEquals(c[0], Boolean.TRUE, eval("calls.length === 0"));
        }
    }

    @Test
    public void textureUpdateKeepsTheHandleAndTracksTheSize() {
        eval(
            "var owner = {closed: false, ready: true, _textures: []}; api._activeSession = owner;"
                + "bridge.isOwner = function () { return true; };"
                + "var sources = [];"
                + "function describe(source) {"
                + "    if (typeof source !== 'string' && source != null && typeof source.length === 'number') {"
                + "        var values = []; for (var i = 0; i < source.length; i += 1) values.push(source[i]);"
                + "        return 'bytes:' + values.join(' ');"
                + "    }"
                + "    return String(source);"
                + "}"
                + "bridge.createTexture = function (source) { sources.push(describe(source)); return [5, 2, 3]; };"
                + "var nextSize = [2, 3];"
                + "bridge.updateTexture = function (handle, source) {"
                + "    sources.push(handle + ':' + describe(source)); return [handle, nextSize[0], nextSize[1]];"
                + "};"
        );
        assertEquals(
            "5,2x3|5,2x3|5,40x30,true|bytes:-1 1|5:/sdcard/a.png|5:bytes:1 -128",
            String.valueOf(eval(
                "var t = api.createTexture(new Uint8Array([255, 1]));"
                    + "var before = [t.handle, t.width + 'x' + t.height].join(',');"
                    + "var same = t.update('/sdcard/a.png');"
                    + "var kept = [t.handle, t.width + 'x' + t.height].join(',');"
                    + "nextSize = [40, 30]; t.update(new Uint8Array([7, 1, 128, 9]).subarray(1, 3));"
                    + "[before, kept, [t.handle, t.width + 'x' + t.height, same === t].join(','), sources.join('|')]"
                    + ".join('|')"
            ))
        );
        assertTrue(failure("t.update(null)").startsWith(
            "TypeError:imgui.Texture.update: argument " + '"' + "source" + '"' + " "
        ));
        assertEquals(
            "TypeError",
            String.valueOf(eval("(function () { 'use strict'; try { t.width = 1; return 'returned'; }"
                + " catch (e) { return e.name; } })()"))
        );
        assertEquals(
            "Error:imgui.Texture.update: the texture has already been disposed",
            failure("bridge.destroyTexture = function () { return true; }; t.dispose(); t.update('/sdcard/a.png')")
        );
    }

    @Test
    public void colorArgumentsAcceptEveryColorForm() {
        String[] forms = {
            "0xFFCC6633", "'#3366ccff'", "'#36c'", "[0.2, 0.4, 0.8, 1]", "[0.2, 0.4, 0.8]",
            "{r: 0.2, g: 0.4, b: 0.8, a: 1}", "{r: 0.2, g: 0.4, b: 0.8}", "[51, 102, 204, 255]"
        };
        for (String form : forms) {
            assertEquals(form, "0.2,0.4,0.8,1,x", lastCall("api.textColored(" + form + ", 'x')"));
            assertEquals(form, "0,0.2,0.4,0.8,1", lastCall("api.pushStyleColor('Text', " + form + ")"));
            assertEquals(form, Boolean.TRUE, eval("api.colorU32(" + form + ") === (0xFFCC6633 | 0)"));
        }
        assertEquals("0.2,0.4,0.8,1,x", lastCall("api.textColored(0.2, 0.4, 0.8, 1, 'x')"));
        assertEquals("0,0.2,0.4,0.8,1", lastCall("api.pushStyleColor('Text', 0.2, 0.4, 0.8, 1)"));
        assertEquals(Boolean.TRUE, eval("api.colorU32(0.2, 0.4, 0.8, 1) === (0xFFCC6633 | 0)"));
    }

    @Test
    public void windowGeometryIsDp() {
        assertEquals(
            "size:500x250;position:250,250|100,100,200,100,2.5,432,960",
            String.valueOf(eval(
                "var s = openWindow();"
                    + "windowCalls.join(';') + '|' + [s.x, s.y, s.width, s.height, s.density,"
                    + " s.displayWidth, s.displayHeight].join(',')"
            ))
        );
        assertEquals(
            "position:100,150|40,60,100,100,api|40,60",
            String.valueOf(eval(
                "var moved = [];"
                    + "s.on('moved', function (e) { moved.push([e.x, e.y, e.oldX, e.oldY, e.source].join(',')); });"
                    + "windowCalls.length = 0; s.setPosition(40, 60);"
                    + "windowCalls.join(';') + '|' + moved.join(';') + '|' + s.x + ',' + s.y"
            ))
        );
        assertEquals(
            "size:300x200|120,80,200,100,api|120,80",
            String.valueOf(eval(
                "var resized = [];"
                    + "s.on('resized', function (e) {"
                    + " resized.push([e.width, e.height, e.oldWidth, e.oldHeight, e.source].join(',')); });"
                    + "windowCalls.length = 0; s.setSize(120, 80);"
                    + "windowCalls.join(';') + '|' + resized.join(';') + '|' + s.width + ',' + s.height"
            ))
        );
    }

    @Test
    public void densityConvertsBetweenDpAndPx() {
        assertEquals("2.5,10,4", String.valueOf(eval("[api.density, api.dp(4), api.px(10)].join(',')")));
        assertEquals("2.5,10,4", String.valueOf(eval("openWindow(); [api.density, api.Dp(4), api.Px(10)].join(',')")));
    }

    @Test
    public void sessionFieldsAreReadOnly() {
        assertEquals(
            "100,200,false,null",
            String.valueOf(eval(
                "var s = openWindow(); s.x = 5; s.width = 1; s.closed = true; s.closeReason = 'x';"
                    + "[s.x, s.width, s.closed, String(s.closeReason)].join(',')"
            ))
        );
        String[] fields = {"x", "y", "width", "height", "ready", "closed", "closeReason", "mode", "collapsed",
            "touchable", "touchMode", "alpha", "secure", "density", "displayWidth", "theme", "fps", "idle", "paused",
            "idleFps", "idleDelay"};
        for (String field : fields) {
            assertEquals(field, "TypeError", String.valueOf(eval(
                "(function () { 'use strict'; try { s." + field + " = 1; return 'returned'; }"
                    + " catch (e) { return e.name; } })()"
            )));
        }
        assertEquals("TypeError", String.valueOf(eval(
            "(function () { 'use strict'; try { api.density = 1; return 'returned'; } catch (e) { return e.name; } })()"
        )));
    }

    @Test
    public void screenStatePausesAndResumesTheFrameLoop() {
        eval(
            "var wake = null; var screenOn = true;"
                + "bridge.startActivityMonitor = function (listener) { wake = listener; return 7; };"
                + "bridge.isScreenActive = function () { return screenOn; };"
                + "bridge.getInputIdleMillis = function () { return 0; };"
                + "bridge.armInputWake = record('armInputWake');"
                + "bridge.noteActivity = record('noteActivity');"
                + "bridge.stopActivityMonitor = record('stopActivityMonitor');"
        );
        assertEquals(
            "60,10,3000,false,false,60",
            String.valueOf(eval(
                "var s = openWindow(); [s.fps, s.idleFps, s.idleDelay, s.idle, s.paused, s.getFps()].join(',')"
            ))
        );
        assertEquals(
            "true,0|false,60,1",
            String.valueOf(eval(
                "screenOn = false; wake.run(); var off = [s.paused, s.getFps()].join(',');"
                    + "var queued = timers.length; screenOn = true; wake.run();"
                    + "off + '|' + [s.paused, s.getFps(), timers.length - queued].join(',')"
            ))
        );
        assertEquals(
            "30,30,0,500",
            String.valueOf(eval(
                "s.setFps(30); s.setIdleFps(0, 500); [s.fps, s.getFps(), s.idleFps, s.idleDelay].join(',')"
            ))
        );
        String[][] cases = {
            {"s.setFps(10)", "RangeError", "Session.setFps", "fps"},
            {"s.setFps('a')", "TypeError", "Session.setFps", "fps"},
            {"s.setIdleFps(-1)", "RangeError", "Session.setIdleFps", "idleFps"},
            {"s.setIdleFps(5, 50)", "RangeError", "Session.setIdleFps", "idleDelay"},
        };
        assertFailures(cases);
        assertEquals(
            "stopActivityMonitor:7",
            String.valueOf(eval(
                "calls.length = 0; s.close();"
                    + "calls.filter(function (c) { return c.name === 'stopActivityMonitor'; })"
                    + ".map(function (c) { return c.name + ':' + c.args.join(','); }).join('|')"
            ))
        );
        // createWindow replaces the active session before it reads the frame rate options, so these run last.
        assertFailures(new String[][] {
            {"api.createWindow(function () {}, {idleFps: 200})", "RangeError", "createWindow", "options.idleFps"},
            {"api.createWindow(function () {}, {idleDelay: 'a'})", "TypeError", "createWindow", "options.idleDelay"},
        });
    }

    @Test
    public void keyConstantsMatchTheImGuiKeyEnum() {
        assertEquals(
            "512,526,527,535,536,545,546,571,572,595,596,606,631,4096,4096",
            String.valueOf(eval(
                "var K = api.Key; [K.Tab, K.Escape, K.LeftCtrl, K.Menu, K.Digit0, K.Digit9, K.A, K.Z, K.F1, K.F24,"
                    + " K.Apostrophe, K.GraveAccent, K.Oem102, K.ModCtrl, api.Mod.Ctrl].join(',')"
            ))
        );
        assertEquals("548,567,1024,4096", String.valueOf(eval(
            "[api.Key.C, api.Key.V, api.DragDropFlags.AcceptBeforeDelivery, api.InputFlags.RouteGlobal].join(',')"
        )));
    }

    @Test
    public void keyQueriesMapTheirArguments() {
        eval(
            "['isKeyDown', 'isKeyPressed', 'isKeyReleased', 'getKeyPressedAmount', 'getKeyName', 'isKeyChordPressed',"
                + "    'shortcut', 'setNextItemShortcut', 'addMousePosEvent', 'addMouseButtonEvent'"
                + "].forEach(function (name) { bridge[name] = record(name); });"
        );
        String[][] cases = {
            {"api.isKeyPressed(api.Key.A)", "546,true"},
            {"api.IsKeyPressed(api.Key.A, false)", "546,false"},
            {"api.isKeyDown(api.Mod.Shift)", "8192"},
            {"api.getKeyPressedAmount(api.Key.A, 0.5, 0.1)", "546,0.5,0.1"},
            {"api.getKeyName(api.Key.None)", "0"},
            {"api.isKeyChordPressed(api.Mod.Ctrl | api.Key.S)", "4660"},
            {"api.isKeyChordPressed(api.Mod.Alt)", "16384"},
            {"api.shortcut(api.Mod.Ctrl | api.Mod.Shift | api.Key.S, api.InputFlags.Repeat)", "12852,1"},
            {"api.SetNextItemShortcut(api.Key.F1)", "572,0"},
            {"api.addMousePosEvent(10.5, 20)", "10.5,20"},
            {"api.AddMouseButtonEvent(1, 1)", "1,true"},
            {"api.addMouseButtonEvent(undefined, false)", "0,false"},
        };
        for (String[] c : cases) {
            assertEquals(c[0], c[1], lastCall(c[0]));
        }
    }

    @Test
    public void clipboardConvertsTextBothWays() {
        assertEquals(
            "12|string|text|string",
            String.valueOf(eval(
                "bridge.setClipboardText = record('set');"
                    + "bridge.getClipboardText = function () { return new java.lang.String('text'); };"
                    + "calls.length = 0; api.SetClipboardText(12); var value = api.getClipboardText();"
                    + "[calls[0].args[0], typeof calls[0].args[0], value, typeof value].join('|')"
            ))
        );
    }

    @Test
    public void dragDropPayloadsAreSerializedAndParsed() {
        eval(
            "['beginDragDropSource', 'setDragDropPayload', 'endDragDropSource', 'beginDragDropTarget',"
                + "    'endDragDropTarget'].forEach(function (name) { bridge[name] = record(name); });"
        );
        String[][] cases = {
            {"api.setDragDropPayload('ROW', 'a\"b')", "ROW,\"a\\\"b\",1"},
            {"api.SetDragDropPayload('ROW', 3, api.Cond.Once)", "ROW,3,2"},
            {"api.setDragDropPayload('ROW', {id: 1, tags: ['x']})", "ROW,{\"id\":1,\"tags\":[\"x\"]},1"},
            {"api.setDragDropPayload('ROW', null)", "ROW,null,1"},
            {"api.setDragDropPayload('ROW', new java.lang.String('s'))", "ROW,\"s\",1"},
        };
        for (String[] c : cases) {
            assertEquals(c[0], c[1], lastCall(c[0]));
        }
        assertEquals(
            "null|ROW:7:true:false|ROW:{\"id\":1}:false:true|_IMG:null:false:false|_COL4F:[1,0.5,0,1]:false:true",
            String.valueOf(eval(
                "var raw = null; bridge.acceptDragDropPayload = function () { return raw; };"
                    + "bridge.getDragDropPayload = function () { return raw; };"
                    + "function show(p) {"
                    + "    return p == null ? 'null'"
                    + "        : [p.type, JSON.stringify(p.data), p.preview, p.delivery].join(':');"
                    + "}"
                    + "var out = [show(api.acceptDragDropPayload('ROW'))];"
                    + "raw = ['ROW', '7', '1', '0']; out.push(show(api.AcceptDragDropPayload('ROW')));"
                    + "raw = ['ROW', '{\"id\":1}', '0', '1']; out.push(show(api.getDragDropPayload()));"
                    + "raw = ['_IMG', null, '0', '0']; out.push(show(api.getDragDropPayload()));"
                    + "raw = ['_COL4F', '[1,0.5,0,1]', '0', '1']; out.push(show(api.acceptDragDropPayload('_COL4F')));"
                    + "out.join('|')"
            ))
        );
    }

    @Test
    public void dragDropHelpersEndWhatTheyBegan() {
        assertEquals(
            "4,body,end|2,body,end|target,body,end|",
            String.valueOf(eval(
                "var log; var open = true;"
                    + "bridge.beginDragDropSource = function (flags) { log.push(flags); return open; };"
                    + "bridge.endDragDropSource = function () { log.push('end'); };"
                    + "bridge.beginDragDropTarget = function () { log.push('target'); return open; };"
                    + "bridge.endDragDropTarget = function () { log.push('end'); };"
                    + "function body() { log.push('body'); throw new Error('stop'); }"
                    + "function run(f) { log = []; try { f(); } catch (e) {} return log.join(','); }"
                    + "var out = [run(function () { api.withDragDropSource(4, body); })];"
                    + "out.push(run(function () { api.withDragDropSource(2, body); }));"
                    + "out.push(run(function () { api.withDragDropTarget(body); }));"
                    + "open = false; log = []; api.withDragDropTarget(body);"
                    + "out.push(log.slice(1).join(','));"
                    + "out.join('|')"
            ))
        );
        assertEquals("0,body", String.valueOf(eval(
            "open = true; log = [];"
                + "api.WithDragDropSource(function () { log.push('body'); });"
                + "log.slice(0, 2).join(',')"
        )));
    }

    @Test
    public void drawListPrimitivesMapTheirArguments() {
        eval(
            "['drawBezierQuadratic', 'drawQuad', 'drawNgon', 'drawEllipse', 'drawRectFilledMultiColor',"
                + "    'drawImageRounded', 'drawPathClear', 'drawPathLineTo', 'drawPathArcTo', 'drawPathArcToFast',"
                + "    'drawPathBezierCubicCurveTo', 'drawPathBezierQuadraticCurveTo', 'drawPathRect', 'drawPathStroke',"
                + "    'drawPathFill', 'drawPushClipRect', 'drawPopClipRect', 'pushClipRect', 'popClipRect'"
                + "].forEach(function (name) { bridge[name] = record(name); });"
                + "function floats(a) { var o = []; for (var i = 0; i < a.length; i += 1) o.push(a[i]); return o.join(' '); }"
                + "bridge.drawPolyFilled = function (layer, points, color, concave) {"
                + "    calls.push({args: [layer, floats(points), color, concave]});"
                + "};"
                + "bridge.drawImageQuad = function (layer, handle, corners, uvs, tint) {"
                + "    calls.push({args: [layer, handle, floats(corners), floats(uvs), tint]});"
                + "};"
                + "var draw = api.getForegroundDrawList();"
        );
        String[][] cases = {
            {"draw.addBezierQuadratic([0, 1], [2, 3], [4, 5], 7)", "1,0,1,2,3,4,5,7,1,0"},
            {"draw.AddQuad([0, 1], [2, 3], [4, 5], [6, 7], 9, 2)", "1,0,1,2,3,4,5,6,7,9,2,false"},
            {"draw.addQuadFilled([0, 1], [2, 3], [4, 5], [6, 7], 9)", "1,0,1,2,3,4,5,6,7,9,1,true"},
            {"draw.addNgon([1, 2], 3, 9, 6)", "1,1,2,3,9,6,1,false"},
            {"draw.addNgonFilled([1, 2], 3, 9, 6)", "1,1,2,3,9,6,1,true"},
            {"draw.addEllipse([1, 2], [3, 4], 9, 0.5, 8, 2)", "1,1,2,3,4,9,0.5,8,2,false"},
            {"draw.addEllipseFilled([1, 2], {x: 3, y: 4}, 9)", "1,1,2,3,4,9,0,0,1,true"},
            {"draw.addRectFilledMultiColor([0, 1], [2, 3], 4, 5, 6, 7)", "1,0,1,2,3,4,5,6,7"},
            {"draw.addConvexPolyFilled([[0, 1], [2, 3], [4, 5]], 9)", "1,0 1 2 3 4 5,9,false"},
            {"draw.AddConcavePolyFilled([[0, 1], [2, 3], [4, 5]], 9)", "1,0 1 2 3 4 5,9,true"},
            {"draw.pathClear()", "1"},
            {"draw.pathLineTo([1, 2])", "1,1,2"},
            {"draw.pathArcTo([1, 2], 3, 0, 1.5)", "1,1,2,3,0,1.5,0"},
            {"draw.pathArcToFast([1, 2], 3, 0, 6)", "1,1,2,3,0,6"},
            {"draw.pathBezierCubicCurveTo([1, 2], [3, 4], [5, 6])", "1,1,2,3,4,5,6,0"},
            {"draw.pathBezierQuadraticCurveTo([1, 2], [3, 4], 12)", "1,1,2,3,4,12"},
            {"draw.pathRect([1, 2], [3, 4], 5, api.DrawFlags.RoundCornersTopLeft)", "1,1,2,3,4,5,16"},
            {"draw.pathStroke(9, 2, api.DrawFlags.Closed)", "1,9,2,512"},
            {"draw.PathStroke(9)", "1,9,1,0"},
            {"draw.pathFillConvex(9)", "1,9,false"},
            {"draw.pathFillConcave(9)", "1,9,true"},
            {"draw.pushClipRect([1, 2], [3, 4])", "1,1,2,3,4,false"},
            {"draw.PushClipRect([1, 2], [3, 4], true)", "1,1,2,3,4,true"},
            {"api.pushClipRect([1, 2], [3, 4])", "1,2,3,4,true"},
            {"api.PushClipRect([1, 2], [3, 4], false)", "1,2,3,4,false"},
        };
        for (String[] c : cases) {
            assertEquals(c[0], c[1], lastCall(c[0]));
        }
        assertEquals("true", String.valueOf(eval(
            "draw.pathClear().pathLineTo([0, 0]).popClipRect() === draw && draw.PathClear === draw.pathClear"
        )));
    }

    @Test
    public void toolWindowsPassTheToolAndTheOpenFlag() {
        eval(
            "bridge.showToolWindow = function (tool, open) {"
                + "    calls.push({name: 'tool', args: [tool, open == null ? 'null' : open.length + ':' + open[0]]});"
                + "    if (open != null) open[0] = false;"
                + "};"
        );
        assertEquals(
            "0:null|1:1:true|2:null|3:null|4:null|5:null|false|true",
            String.valueOf(eval(
                "calls.length = 0; var open = {value: true};"
                    + "api.showMetricsWindow(); api.showDebugLogWindow(open); api.ShowIDStackToolWindow(null);"
                    + "api.showStyleEditor(false); api.showAboutWindow(); api.ShowUserGuide();"
                    + "calls.map(function (c) { return c.args.join(':'); }).join('|') + '|' + open.value"
                    + " + '|' + (api.ShowStyleEditor === api.showStyleEditor)"
            ))
        );
    }

    @Test
    public void tableSortSpecsAreCopiedFromTheBridge() {
        eval("bridge.tableSetupColumn = record('tableSetupColumn');");
        assertEquals("c,0,0,5", lastCall("api.tableSetupColumn('c', 0, 0, 5)"));
        assertEquals("c,0,0,0", lastCall("api.tableSetupColumn('c')"));
        assertEquals(
            "null|true:0/7/1/0,2/0/2/1|false:",
            String.valueOf(eval(
                "var raw = null; bridge.tableGetSortSpecs = function () { return raw; };"
                    + "function specs() {"
                    + "    var s = api.TableGetSortSpecs(); if (s == null) return 'null';"
                    + "    return s.specsDirty + ':' + s.specs.map(function (e) {"
                    + "        return [e.columnIndex, e.columnUserId, e.sortDirection, e.sortOrder].join('/');"
                    + "    }).join(',');"
                    + "}"
                    + "var out = [specs()]; raw = [1, 2, 0, 7, 1, 0, 2, 0, 2, 1]; out.push(specs());"
                    + "raw = [0, 0]; out.push(specs()); out.join('|')"
            ))
        );
        assertEquals("0,1,2", String.valueOf(eval(
            "[api.SortDirection.None, api.SortDirection.Ascending, api.SortDirection.Descending].join(',')"
        )));
    }

    @Test
    public void sortableDataTableSortsItsRowsWhenTheSpecsChange() {
        eval(
            "var s = openWindow();"
                + "['endTable', 'tableSetupColumn', 'tableSetupScrollFreeze', 'tableHeadersRow', 'tableNextRow',"
                + "    'tableSetColumnIndex', 'selectable', 'text', 'textDisabled'"
                + "].forEach(function (name) { bridge[name] = record(name); });"
                + "bridge.beginTable = function () { return true; };"
                // Like Dear ImGui, reading the specs clears the dirty flag.
                + "var raw = null;"
                + "bridge.tableGetSortSpecs = function () {"
                + "    var result = raw; if (raw != null) raw = [0].concat(raw.slice(1)); return result;"
                + "};"
                + "var order = ['New', 'Active', 'Done']; var actions = [];"
                + "var t = api.dataTable('t', ["
                + "    {key: 'name'}, {key: 'n'},"
                + "    {key: 'state', compare: function (a, b) { return order.indexOf(a) - order.indexOf(b); }}"
                + "], ["
                + "    {name: 'b', n: 2, state: 'Done'}, {name: 'a', n: 10, state: 'New'},"
                + "    {name: 'c', n: 1, state: 'New'}, {name: 'd', n: null, state: 'Active'}"
                + "], {sortable: true, toolbar: false, onRowsChanged: function (rows, action) { actions.push(action); }});"
                + "function frame(specs) {"
                + "    if (specs !== undefined) raw = specs;"
                + "    t.renderTable(); return t.rows.map(function (r) { return r.name; }).join('');"
                + "}"
        );
        assertEquals(
            "true|bacd|cbad|cbad|abcd|acdb|bacd|ecbad|set,sort,sort,sort,sort,add,sort",
            String.valueOf(eval(
                "var out = [t.sortable, frame(null)];"
                    + "out.push(frame([1, 1, 1, 1, 1, 0]));"
                    + "out.push(frame());"
                    + "out.push(frame([1, 1, 1, 1, 2, 0]));"
                    + "out.push(frame([1, 2, 2, 2, 1, 0, 0, 0, 1, 1]));"
                    + "out.push(frame([1, 0]));"
                    + "raw = [0, 1, 1, 1, 1, 0]; t.addRow({name: 'e', n: 0, state: 'New'});"
                    + "out.push(frame());"
                    + "out.push(actions.join(','));"
                    + "out.join('|')"
            ))
        );
    }

    @Test
    public void multiComponentWidgetsMapTheirArgumentsAndWriteBack() {
        eval(
            "function show(a) {"
                + "    if (a != null && typeof a === 'object' && typeof a.length === 'number') {"
                + "        var out = []; for (var i = 0; i < a.length; i += 1) out.push(Number(a[i]));"
                + "        return '[' + out.join(' ') + ']';"
                + "    }"
                + "    return String(a);"
                + "}"
                + "['dragFloatN', 'dragIntN', 'sliderFloatN', 'sliderIntN', 'inputFloatN', 'inputIntN',"
                + "    'dragFloatRange2', 'dragIntRange2', 'sliderAngle'"
                + "].forEach(function (name) {"
                + "    bridge[name] = function () {"
                + "        var args = Array.prototype.slice.call(arguments);"
                + "        calls.push({name: name, args: args.map(show)});"
                + "        args[1][args[1].length - 1] = 9;"
                + "        return true;"
                + "    };"
                + "});"
        );
        String[][] cases = {
            {"api.dragFloat3('p', {value: [1, 2, 3]}, 0.5, -1, 1, '%.1f', 4)", "p,[1 2 3],3,0.5,-1,1,%.1f,4"},
            {"api.DragInt2('i', {value: [1.6, 2]})", "i,[2 2],2,1,0,0,%d,0"},
            {"api.sliderFloat4('s', api.floats([0, 0.25, 0.5, 1]))", "s,[0 0.25 0.5 1],4,0,1,%.3f,0"},
            {"api.sliderInt3('s', api.ints([1, 2, 3]), 0, 10)", "s,[1 2 3],3,0,10,%d,0"},
            {"api.sliderInt2('s', {value: [1, 2]})", "s,[1 2],2,0,100,%d,0"},
            {"api.inputFloat2('f', {value: [1, 2]}, '%.2f')", "f,[1 2],2,%.2f,0"},
            {"api.inputInt4('n', {value: [1, 2, 3, 4, 5]})", "n,[1 2 3 4 5],4,0"},
            {"api.dragFloatRange2('r', {value: 0.25}, {value: 0.75}, 0.5, 0, 1, 'Min %.2f', 'Max %.2f')",
                "r,[0.25],[0.75],0.5,0,1,Min %.2f,Max %.2f,0"},
            {"api.dragIntRange2('r', {value: 1}, {value: 5})", "r,[1],[5],1,0,0,%d,null,0"},
            {"api.SliderAngle('a', {value: 0.5})", "a,[0.5],-360,360,%.0f deg,0"},
        };
        for (String[] c : cases) {
            assertEquals(c[0], c[1], lastCall(c[0]));
        }
        assertEquals(
            "true:1 2 9|2 9|9|9",
            String.valueOf(eval(
                "var v = {value: [1, 2, 3]}; var changed = api.dragFloat3('p', v);"
                    + "var w = {value: [1.6, 2]}; api.dragInt2('i', w);"
                    + "var lo = {value: 1}; api.dragIntRange2('r', lo, {value: 5});"
                    + "var angle = {value: 0}; api.sliderAngle('a', angle);"
                    + "changed + ':' + v.value.join(' ') + '|' + w.value.join(' ') + '|' + lo.value + '|' + angle.value"
            ))
        );
    }

    private void assertFailures(String[][] cases) {
        for (String[] c : cases) {
            String expected = c[1] + ":imgui." + c[2] + ": argument " + '"' + c[3] + '"' + " ";
            String actual = failure(c[0]);
            assertTrue(c[0] + " -> " + actual, actual.startsWith(expected));
        }
    }

    @Test
    public void captureTakesTheRegionInDpAndCutsItAtTheWindow() {
        eval(
            "var s = openReadyWindow({});"
                + "bridge.captureSurface = function (view, x, y, width, height) {"
                + "    calls.push({name: 'captureSurface', args: [view === surfaceView, x, y, width, height]});"
                + "    return 'bitmap';"
                + "};"
                + "function capture(options) {"
                + "    var image = s.capture(options);"
                + "    return image.bitmap + ':' + calls[calls.length - 1].args.join(',');"
                + "}"
        );
        String[][] cases = {
            {"undefined", "bitmap:true,0,0,500,250"},
            {"{}", "bitmap:true,0,0,500,250"},
            {"{region: {x: 10, y: 20, width: 40, height: 30}}", "bitmap:true,25,50,100,75"},
            {"{region: {x: 180, y: 90}}", "bitmap:true,450,225,50,25"},
            {"{region: {x: 180, width: 100}}", "bitmap:true,450,0,50,250"},
        };
        for (String[] c : cases) {
            assertEquals(c[0], c[1], String.valueOf(eval("capture(" + c[0] + ")")));
        }
        assertFailures(new String[][] {
            {"s.capture(1)", "TypeError", "Session.capture", "options"},
            {"s.capture({region: 1})", "TypeError", "Session.capture", "options.region"},
            {"s.capture({region: {x: 'a'}})", "TypeError", "Session.capture", "options.region.x"},
            {"s.capture({region: {y: -1}})", "RangeError", "Session.capture", "options.region.y"},
            {"s.capture({region: {width: 0}})", "RangeError", "Session.capture", "options.region.width"},
            {"s.capture({region: {x: 200}})", "RangeError", "Session.capture", "options.region"},
        });
        eval("s.close('done');");
        assertEquals("Error:imgui.Session.capture: the window is closed", failure("s.capture()"));
    }

    @Test
    public void captureNeedsAPresentedFrame() {
        assertEquals(
            "Error:imgui.Session.capture: the window is not showing a frame yet",
            failure("openWindow().capture()")
        );
    }

    @Test
    public void systemCjkFontReachesTheNativeInit() {
        eval("openReadyWindow({}); var plain = calls.filter(function (c) { return c.name === 'init'; })[0];");
        assertEquals(false, eval("plain.args[7]"));
        eval("openReadyWindow({systemCjkFont: true});");
        assertEquals(true, eval("calls.filter(function (c) { return c.name === 'init'; }).pop().args[7]"));
    }

    @Test
    public void aDensityChangeKeepsTheWindowInDp() {
        Object result = eval(
            "var s = openReadyWindow({}); var seen = [];"
                + "s.on('configurationChanged', function (e) {"
                + "    seen.push([e.density, e.oldDensity, e.fontScale, e.oldFontScale, e.oldWidth].join(' '));"
                + "});"
                + "calls.length = 0; windowCalls.length = 0;"
                + "metrics.density = 3; s._lastDisplayScaleCheck = 0; frame();"
                + "[namedCalls('setDisplayScale').join(','), windowCalls.join(','), s.density, s.x, s.y, s.width, s.height,"
                + "    api.dp(1), seen[0]].join('|')"
        );
        assertEquals(
            "3 1|size:600x300,position:300,300|3|100|100|200|100|3|3 2.5 1 1 432",
            String.valueOf(result)
        );
    }

    @Test
    public void aDensityChangeIgnoresResponsiveFalse() {
        assertEquals(
            "size:600x300,position:300,300",
            String.valueOf(eval(
                "var s = openReadyWindow({responsive: false}); windowCalls.length = 0;"
                    + "metrics.density = 3; s._lastDisplayScaleCheck = 0; frame(); windowCalls.join(',')"
            ))
        );
    }

    @Test
    public void aSystemFontScaleChangeScalesTheFontsOnly() {
        Object result = eval(
            "configuration.fontScale = 1.5; var s = openReadyWindow({}); var seen = [];"
                + "s.on('configurationChanged', function (e) { seen.push(e.fontScale + ' ' + e.oldFontScale); });"
                + "calls.length = 0; windowCalls.length = 0;"
                + "configuration.fontScale = 1.8; s._lastDisplayScaleCheck = 0; frame();"
                + "[namedCalls('setDisplayScale').join(','), windowCalls.length, seen[0]].join('|')"
        );
        assertEquals("2.5 " + (float) (1.8 / 1.5) + "|0|1.8 1.5", normalizeFloats(String.valueOf(result)));
    }

    @Test
    public void setFontScaleAppliesBetweenFrames() {
        assertFailures(new String[][] {
            {"openWindow().setFontScale(0.4)", "RangeError", "Session.setFontScale", "scale"},
            {"openWindow().setFontScale(3.5)", "RangeError", "Session.setFontScale", "scale"},
            {"openWindow().setFontScale('a')", "TypeError", "Session.setFontScale", "scale"},
        });
        assertEquals(
            "1|0|2|1|2 1 api",
            String.valueOf(eval(
                "var s = openReadyWindow({}); var seen = [];"
                    + "s.on('fontScaleChanged', function (e) { seen.push([e.scale, e.oldScale, e.source].join(' ')); });"
                    + "calls.length = 0; s.setFontScale(2);"
                    + "var before = s.fontScale; var applied = namedCalls('setFontScale').length; frame();"
                    + "[before, applied, s.fontScale, namedCalls('setFontScale').length, seen[0]].join('|')"
            ))
        );
    }

    @Test
    public void pinchZoomScalesTheFontsOnceTheFingersSpreadPastTheThreshold() {
        eval(
            "var s = openReadyWindow({pinchZoom: true}); var seen = [];"
                + "s.on('fontScaleChanged', function (e) { seen.push(e.scale + ' ' + e.source); });"
                + "calls.length = 0;"
                + "touch(MotionEvent.ACTION_DOWN, [[100, 100]]);"
                + "touch(MotionEvent.ACTION_POINTER_DOWN, [[100, 100], [200, 100]]);"
                // Moving together keeps the distance, so this is the two-finger scroll.
                + "touch(MotionEvent.ACTION_MOVE, [[100, 150], [200, 150]]);"
                + "var scrolled = namedCalls('addMouseWheelEvent').length;"
                // The threshold is 24 dp, 60 px: these stay below it, then pass it and set the start of the pinch.
                + "touch(MotionEvent.ACTION_MOVE, [[100, 150], [250, 150]]);"
                + "var belowThreshold = requestedScaleAfterFrame();"
                + "touch(MotionEvent.ACTION_MOVE, [[100, 150], [300, 150]]);"
                + "touch(MotionEvent.ACTION_MOVE, [[100, 150], [500, 150]]);"
                + "var doubled = requestedScaleAfterFrame();"
                + "touch(MotionEvent.ACTION_MOVE, [[100, 150], [4000, 150]]);"
                + "var clampedHigh = requestedScaleAfterFrame();"
                + "touch(MotionEvent.ACTION_MOVE, [[100, 150], [101, 150]]);"
                + "var clampedLow = requestedScaleAfterFrame();"
                + "var wheelEvents = namedCalls('addMouseWheelEvent').length;"
                + "touch(MotionEvent.ACTION_UP, [[100, 150]]);"
                + "function requestedScaleAfterFrame() { frame(); return s.fontScale; }"
        );
        assertEquals("1", String.valueOf(eval("'' + scrolled")));
        assertEquals("1", String.valueOf(eval("'' + belowThreshold")));
        assertEquals("2", String.valueOf(eval("'' + doubled")));
        assertEquals("3", String.valueOf(eval("'' + clampedHigh")));
        assertEquals("0.5", String.valueOf(eval("'' + clampedLow")));
        assertEquals("1", String.valueOf(eval("'' + wheelEvents")));
        assertEquals("2 pinch,3 pinch,0.5 pinch", String.valueOf(eval("seen.join(',')")));
    }

    @Test
    public void withoutPinchZoomTwoFingersOnlyScroll() {
        assertEquals(
            "1|2|0",
            String.valueOf(eval(
                "var s = openReadyWindow({}); calls.length = 0;"
                    + "touch(MotionEvent.ACTION_DOWN, [[100, 100]]);"
                    + "touch(MotionEvent.ACTION_POINTER_DOWN, [[100, 100], [200, 100]]);"
                    + "touch(MotionEvent.ACTION_MOVE, [[100, 150], [500, 150]]);"
                    + "touch(MotionEvent.ACTION_MOVE, [[100, 170], [900, 170]]);"
                    + "frame();"
                    + "[s.fontScale, namedCalls('addMouseWheelEvent').length, namedCalls('setFontScale').length].join('|')"
            ))
        );
    }

    @Test
    public void aLiftedFingerRestartsThePinchMeasurement() {
        assertEquals(
            "2",
            String.valueOf(eval(
                "var s = openReadyWindow({pinchZoom: true});"
                    + "touch(MotionEvent.ACTION_DOWN, [[100, 100]]);"
                    + "touch(MotionEvent.ACTION_POINTER_DOWN, [[100, 100], [200, 100]]);"
                    + "touch(MotionEvent.ACTION_MOVE, [[100, 100], [300, 100]]);"
                    + "touch(MotionEvent.ACTION_MOVE, [[100, 100], [500, 100]]);"
                    + "touch(MotionEvent.ACTION_POINTER_UP, [[100, 100], [500, 100]]);"
                    + "touch(MotionEvent.ACTION_POINTER_DOWN, [[100, 100], [150, 100]]);"
                    + "touch(MotionEvent.ACTION_MOVE, [[100, 100], [160, 100]]);"
                    + "touch(MotionEvent.ACTION_UP, [[100, 100]]);"
                    + "frame(); '' + s.fontScale"
            ))
        );
    }

    private static String normalizeFloats(String text) {
        return text.replace("1.2000000000000002", "1.2").replace("1.2000000476837158", "1.2");
    }

    @Test
    public void sessionWithoutActivityMonitorRunsAtTheFullRate() {
        assertEquals(
            "false,false,60|true",
            String.valueOf(eval(
                "var s = openWindow(); [s.idle, s.paused, s.getFps()].join(',') + '|'"
                    + " + printed.some(function (m) { return m.indexOf('Power saving is unavailable') >= 0; })"
            ))
        );
    }

    @Test
    public void eventsRaisedOnAnotherThreadRunOnTheScriptThread() {
        Object result = eval(
            "var s = openWindow();"
                + "var scriptThread = java.lang.Thread.currentThread();"
                + "var seen = [];"
                + "s.on('resized', function (e) {"
                + "    seen.push([e.width, e.height, e.oldWidth, e.oldHeight, e.source,"
                + "        java.lang.Thread.currentThread().equals(scriptThread)].join(','));"
                + "});"
                + "var failures = [];"
                + "var worker = new java.lang.Thread(new java.lang.Runnable({run: function () {"
                + "    try { holderCallbacks[0].surfaceChanged(null, 0, 600, 300); }"
                + "    catch (e) { failures.push(String(e)); }"
                + "}}));"
                + "worker.start(); worker.join();"
                + "var queued = seen.length === 0 && dispatched.length > 0;"
                + "while (dispatched.length > 0) { dispatched.shift()(); }"
                + "queued + '|' + failures.join(';') + '|' + seen[0]"
        );
        assertEquals("true||240,120,200,100,surface,true", String.valueOf(result));
    }

    @Test
    public void eventsRaisedOnTheScriptThreadRunAtOnce() {
        Object result = eval(
            "var s = openWindow(); var seen = 0;"
                + "s.on('moved', function () { seen += 1; });"
                + "s.setPosition(10, 10); seen + ',' + dispatched.length"
        );
        assertEquals("1,0", String.valueOf(result));
    }

    @Test
    public void sessionHelpersThrowWithoutAnActiveSession() {
        String[][] calls = {
            {"addButtonEx", "api.addButtonEx('B', function () {})"},
            {"setTouchable", "api.setTouchable(true)"},
            {"setMoreTouch", "api.setMoreTouch(true)"},
            {"setGlobalAlpha", "api.setGlobalAlpha(0.5)"},
            {"setSecure", "api.setSecure(true)"},
            {"collapseWindow", "api.collapseWindow()"},
            {"expandWindow", "api.expandWindow()"},
            {"getComponent", "api.getComponent('toast', 'id')"},
            {"setTouchable", "api.SetTouchable(false)"},
        };
        for (String[] call : calls) {
            Object message = eval(
                "(function () { try { " + call[1] + "; return 'returned'; }"
                    + " catch (e) { return (e instanceof Error) + ':' + e.message; } })()"
            );
            assertEquals(call[1], "true:imgui." + call[0] + ": no active session", String.valueOf(message));
        }
    }

    @Test
    public void closedSessionCountsAsNoActiveSession() {
        Object message = eval(
            "api._activeSession = {closed: true};"
                + "(function () { try { api.setSecure(true); return 'returned'; } catch (e) { return e.message; } })()"
        );
        assertEquals("imgui.setSecure: no active session", String.valueOf(message));
    }

    @Test
    public void closeWindowWithoutSessionDoesNothing() {
        assertEquals("undefined", String.valueOf(eval("String(api.closeWindow())")));
        assertTrue(Boolean.TRUE.equals(eval("calls.length === 0")));
    }

    private String plot(String method, String options) {
        Object result = eval(
            "calls.length = 0; api." + method + "('p', [0, 1, 2, 3, 4, 5, 6, 7], " + options + ");"
                + "if (calls.length !== 1 || calls[0].name !== '" + method + "') throw new Error('not called');"
                + "calls[0].args[2] + ',' + calls[0].args[3];"
        );
        return String.valueOf(result);
    }

    /** The bridge arguments of the last call made by the expression, joined with commas. */
    private String lastCall(String expression) {
        return String.valueOf(eval("calls.length = 0; " + expression + "; calls[calls.length - 1].args.join(',')"));
    }

    /** The error name and message thrown by the expression, or "returned". */
    private String failure(String expression) {
        return String.valueOf(eval(
            "(function () { try { " + expression + "; return 'returned'; }"
                + " catch (e) { return e.name + ':' + e.message; } })()"
        ));
    }

    private Object eval(String source) {
        return context.evaluateString(scope, source, "test", 1, null);
    }

    private static String readFacade() throws IOException {
        // Unit tests run with the module directory (app/) as the working directory.
        Path facade = Paths.get("src", "main", "assets", "plugin", "index.js");
        return new String(Files.readAllBytes(facade), StandardCharsets.UTF_8);
    }
}
