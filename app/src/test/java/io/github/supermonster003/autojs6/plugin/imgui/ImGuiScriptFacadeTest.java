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
        "var context = {",
        "    getResources: function () { return {getDisplayMetrics: function () { return metrics; }}; },",
        "    getSystemService: function () { throw new Error('no window service'); }",
        "};",
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
        "    setOnTouchListener: function () {}",
        "};",
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
            "touchable", "touchMode", "alpha", "secure", "density", "displayWidth", "theme"};
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
