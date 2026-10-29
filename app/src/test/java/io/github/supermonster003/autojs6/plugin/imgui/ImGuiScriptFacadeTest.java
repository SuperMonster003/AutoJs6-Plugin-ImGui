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
 * needs no native library or Android window.
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
        "var bridge = {plotLines: record('plotLines'), plotHistogram: record('plotHistogram')};"
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
        assertEquals("0,1", plot("plotHistogram", "{stride: 0}"));
        assertEquals("0,1", plot("plotLines", "{stride: -4}"));
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

    private Object eval(String source) {
        return context.evaluateString(scope, source, "test", 1, null);
    }

    private static String readFacade() throws IOException {
        // Unit tests run with the module directory (app/) as the working directory.
        Path facade = Paths.get("src", "main", "assets", "plugin", "index.js");
        return new String(Files.readAllBytes(facade), StandardCharsets.UTF_8);
    }
}
