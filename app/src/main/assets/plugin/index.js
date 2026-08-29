/*
 * Auto-mounted Dear ImGui runtime for Auto.js-compatible script engines.
 *
 * The exported function is invoked by plugins.load(packageName). It also installs
 * the returned API as globalThis.imgui so explicit and automatic loading behave
 * the same way.
 */

module.exports = function (bridge) {
    var globalObject = this;
    var PLUGIN_ID = "io.github.supermonster003.autojs6.plugin.imgui";

    if (globalObject.imgui && globalObject.imgui.__pluginId === PLUGIN_ID) {
        return globalObject.imgui;
    }

    var BooleanType = java.lang.Boolean.TYPE;
    var FloatType = java.lang.Float.TYPE;
    var IntegerType = java.lang.Integer.TYPE;
    var StringClass = java.lang.String;
    var MotionEvent = android.view.MotionEvent;
    var PixelFormat = android.graphics.PixelFormat;
    var SurfaceHolderCallback = android.view.SurfaceHolder.Callback;
    var arrayFactory = java.lang.reflect.Array;

    function number(value, fallback) {
        var result = Number(value);
        return isFinite(result) ? result : fallback;
    }

    function integer(value, fallback) {
        return Math.round(number(value, fallback));
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function javaArray(type, values) {
        values = values || [];
        var result = arrayFactory.newInstance(type, values.length);
        for (var i = 0; i < values.length; i += 1) {
            result[i] = values[i];
        }
        return result;
    }

    function boolRef(value) {
        return javaArray(BooleanType, [Boolean(value)]);
    }

    function floatRef(value) {
        return javaArray(FloatType, [number(value, 0)]);
    }

    function intRef(value) {
        return javaArray(IntegerType, [integer(value, 0)]);
    }

    function stringRef(value) {
        return javaArray(StringClass, [String(value == null ? "" : value)]);
    }

    function floatArray(values) {
        return javaArray(FloatType, values);
    }

    function stringArray(values) {
        var source = values || [];
        var strings = [];
        for (var i = 0; i < source.length; i += 1) {
            strings.push(String(source[i]));
        }
        return javaArray(StringClass, strings);
    }

    function freeze(value) {
        if (Object.freeze) {
            return Object.freeze(value);
        }
        return value;
    }

    var api = {
        __pluginId: PLUGIN_ID,
        _activeSession: null,

        bool: boolRef,
        float: floatRef,
        int: intRef,
        string: stringRef,
        floats: floatArray,
        strings: stringArray,

        version: function () {
            return String(bridge.version());
        }
    };

    api.Cond = freeze({
        None: 0,
        Always: 1,
        Once: 2,
        FirstUseEver: 4,
        Appearing: 8
    });

    api.WindowFlags = freeze({
        None: 0,
        NoTitleBar: 1 << 0,
        NoResize: 1 << 1,
        NoMove: 1 << 2,
        NoScrollbar: 1 << 3,
        NoScrollWithMouse: 1 << 4,
        NoCollapse: 1 << 5,
        AlwaysAutoResize: 1 << 6,
        NoBackground: 1 << 7,
        NoSavedSettings: 1 << 8,
        NoMouseInputs: 1 << 9,
        MenuBar: 1 << 10,
        HorizontalScrollbar: 1 << 11,
        NoFocusOnAppearing: 1 << 12,
        NoBringToFrontOnFocus: 1 << 13,
        AlwaysVerticalScrollbar: 1 << 14,
        AlwaysHorizontalScrollbar: 1 << 15,
        NoNavInputs: 1 << 16,
        NoNavFocus: 1 << 17,
        UnsavedDocument: 1 << 18,
        NoNav: (1 << 16) | (1 << 17),
        NoDecoration: (1 << 0) | (1 << 1) | (1 << 3) | (1 << 5),
        NoInputs: (1 << 9) | (1 << 16) | (1 << 17)
    });

    api.InputTextFlags = freeze({
        None: 0,
        CharsDecimal: 1 << 0,
        CharsHexadecimal: 1 << 1,
        CharsScientific: 1 << 2,
        CharsUppercase: 1 << 3,
        CharsNoBlank: 1 << 4,
        AllowTabInput: 1 << 5,
        EnterReturnsTrue: 1 << 6,
        EscapeClearsAll: 1 << 7,
        CtrlEnterForNewLine: 1 << 8,
        ReadOnly: 1 << 9,
        Password: 1 << 10,
        AlwaysOverwrite: 1 << 11,
        AutoSelectAll: 1 << 12,
        NoHorizontalScroll: 1 << 15,
        NoUndoRedo: 1 << 16,
        ElideLeft: 1 << 17,
        WordWrap: 1 << 24
    });

    api.SliderFlags = freeze({
        None: 0,
        Logarithmic: 1 << 5,
        NoRoundToFormat: 1 << 6,
        NoInput: 1 << 7,
        WrapAround: 1 << 8,
        ClampOnInput: 1 << 9,
        ClampZeroRange: 1 << 10,
        NoSpeedTweaks: 1 << 11,
        ColorMarkers: 1 << 12,
        AlwaysClamp: (1 << 9) | (1 << 10)
    });

    api.TreeNodeFlags = freeze({
        None: 0,
        Selected: 1 << 0,
        Framed: 1 << 1,
        AllowOverlap: 1 << 2,
        NoTreePushOnOpen: 1 << 3,
        NoAutoOpenOnLog: 1 << 4,
        DefaultOpen: 1 << 5,
        OpenOnDoubleClick: 1 << 6,
        OpenOnArrow: 1 << 7,
        Leaf: 1 << 8,
        Bullet: 1 << 9,
        FramePadding: 1 << 10,
        SpanAvailWidth: 1 << 11,
        SpanFullWidth: 1 << 12,
        SpanLabelWidth: 1 << 13,
        SpanAllColumns: 1 << 14,
        LabelSpanAllColumns: 1 << 15,
        NavLeftJumpsToParent: 1 << 17,
        CollapsingHeader: (1 << 1) | (1 << 3) | (1 << 4)
    });

    api.SelectableFlags = freeze({
        None: 0,
        NoAutoClosePopups: 1 << 0,
        SpanAllColumns: 1 << 1,
        AllowDoubleClick: 1 << 2,
        Disabled: 1 << 3,
        AllowOverlap: 1 << 4,
        Highlight: 1 << 5,
        SelectOnNav: 1 << 6
    });

    api.TabBarFlags = freeze({
        None: 0,
        Reorderable: 1 << 0,
        AutoSelectNewTabs: 1 << 1,
        TabListPopupButton: 1 << 2,
        NoCloseWithMiddleMouseButton: 1 << 3,
        NoTabListScrollingButtons: 1 << 4,
        NoTooltip: 1 << 5,
        DrawSelectedOverline: 1 << 6,
        FittingPolicyMixed: 1 << 7,
        FittingPolicyShrink: 1 << 8,
        FittingPolicyScroll: 1 << 9
    });

    api.TabItemFlags = freeze({
        None: 0,
        UnsavedDocument: 1 << 0,
        SetSelected: 1 << 1,
        NoCloseWithMiddleMouseButton: 1 << 2,
        NoPushId: 1 << 3,
        NoTooltip: 1 << 4,
        NoReorder: 1 << 5,
        Leading: 1 << 6,
        Trailing: 1 << 7,
        NoAssumedClosure: 1 << 8
    });

    api.MouseButton = freeze({
        Left: 0,
        Right: 1,
        Middle: 2
    });

    api.setNextWindowPos = function (x, y, condition, pivotX, pivotY) {
        bridge.setNextWindowPos(
            number(x, 0),
            number(y, 0),
            integer(condition, 0),
            number(pivotX, 0),
            number(pivotY, 0)
        );
    };

    api.setNextWindowSize = function (width, height, condition) {
        bridge.setNextWindowSize(number(width, 0), number(height, 0), integer(condition, 0));
    };

    api.setNextWindowSizeConstraints = function (minWidth, minHeight, maxWidth, maxHeight) {
        bridge.setNextWindowSizeConstraints(
            number(minWidth, 0),
            number(minHeight, 0),
            number(maxWidth, 0),
            number(maxHeight, 0)
        );
    };

    api.setNextWindowBgAlpha = function (alpha) {
        bridge.setNextWindowBgAlpha(number(alpha, 1));
    };

    api.begin = function (name, open, flags) {
        return Boolean(bridge.begin(String(name), open || null, integer(flags, 0)));
    };
    api.end = function () { bridge.end(); };
    api.beginChild = function (id, width, height, borders, flags) {
        return Boolean(bridge.beginChild(
            String(id),
            number(width, 0),
            number(height, 0),
            Boolean(borders),
            integer(flags, 0)
        ));
    };
    api.endChild = function () { bridge.endChild(); };

    api.getWindowPos = function () { return bridge.getWindowPos(); };
    api.getWindowSize = function () { return bridge.getWindowSize(); };
    api.getContentRegionAvail = function () { return bridge.getContentRegionAvail(); };
    api.getCursorPos = function () { return bridge.getCursorPos(); };
    api.setCursorPos = function (x, y) { bridge.setCursorPos(number(x, 0), number(y, 0)); };

    api.text = function (value) { bridge.text(String(value)); };
    api.textWrapped = function (value) { bridge.textWrapped(String(value)); };
    api.textColored = function (red, green, blue, alpha, value) {
        bridge.textColored(
            number(red, 1),
            number(green, 1),
            number(blue, 1),
            number(alpha, 1),
            String(value)
        );
    };

    api.button = function (label, width, height) {
        return Boolean(bridge.button(String(label), number(width, 0), number(height, 0)));
    };
    api.smallButton = function (label) { return Boolean(bridge.smallButton(String(label))); };
    api.checkbox = function (label, value) { return Boolean(bridge.checkbox(String(label), value)); };
    api.radioButton = function (label, value, buttonValue) {
        return Boolean(bridge.radioButton(String(label), value, integer(buttonValue, 0)));
    };
    api.sliderFloat = function (label, value, min, max, format, flags) {
        return Boolean(bridge.sliderFloat(
            String(label), value, number(min, 0), number(max, 1),
            String(format || "%.3f"), integer(flags, 0)
        ));
    };
    api.sliderInt = function (label, value, min, max, format, flags) {
        return Boolean(bridge.sliderInt(
            String(label), value, integer(min, 0), integer(max, 100),
            String(format || "%d"), integer(flags, 0)
        ));
    };
    api.dragFloat = function (label, value, speed, min, max, format, flags) {
        return Boolean(bridge.dragFloat(
            String(label), value, number(speed, 1), number(min, 0), number(max, 0),
            String(format || "%.3f"), integer(flags, 0)
        ));
    };
    api.dragInt = function (label, value, speed, min, max, format, flags) {
        return Boolean(bridge.dragInt(
            String(label), value, number(speed, 1), integer(min, 0), integer(max, 0),
            String(format || "%d"), integer(flags, 0)
        ));
    };
    api.inputText = function (label, value, maxLength, flags) {
        return Boolean(bridge.inputText(
            String(label), value, Math.max(1, integer(maxLength, 256)), integer(flags, 0)
        ));
    };
    api.colorEdit3 = function (label, value, flags) {
        return Boolean(bridge.colorEdit3(String(label), value, integer(flags, 0)));
    };
    api.colorEdit4 = function (label, value, flags) {
        return Boolean(bridge.colorEdit4(String(label), value, integer(flags, 0)));
    };
    api.progressBar = function (fraction, width, height, overlay) {
        bridge.progressBar(
            number(fraction, 0), number(width, -1), number(height, 0),
            overlay == null ? null : String(overlay)
        );
    };
    api.combo = function (label, currentItem, items, popupHeight) {
        return Boolean(bridge.combo(
            String(label), currentItem, stringArray(items), integer(popupHeight, -1)
        ));
    };
    api.selectable = function (label, selected, flags, width, height) {
        return Boolean(bridge.selectable(
            String(label), Boolean(selected), integer(flags, 0),
            number(width, 0), number(height, 0)
        ));
    };
    api.collapsingHeader = function (label, flags) {
        return Boolean(bridge.collapsingHeader(String(label), integer(flags, 0)));
    };
    api.treeNode = function (label) { return Boolean(bridge.treeNode(String(label))); };
    api.treePop = function () { bridge.treePop(); };
    api.beginTabBar = function (id, flags) {
        return Boolean(bridge.beginTabBar(String(id), integer(flags, 0)));
    };
    api.endTabBar = function () { bridge.endTabBar(); };
    api.beginTabItem = function (label, open, flags) {
        return Boolean(bridge.beginTabItem(String(label), open || null, integer(flags, 0)));
    };
    api.endTabItem = function () { bridge.endTabItem(); };

    api.sameLine = function (offsetFromStartX, spacing) {
        bridge.sameLine(number(offsetFromStartX, 0), number(spacing, -1));
    };
    api.separator = function () { bridge.separator(); };
    api.spacing = function () { bridge.spacing(); };
    api.newLine = function () { bridge.newLine(); };
    api.dummy = function (width, height) { bridge.dummy(number(width, 0), number(height, 0)); };
    api.setNextItemWidth = function (width) { bridge.setNextItemWidth(number(width, 0)); };
    api.pushItemWidth = function (width) { bridge.pushItemWidth(number(width, 0)); };
    api.popItemWidth = function () { bridge.popItemWidth(); };
    api.isItemClicked = function (mouseButton) {
        return Boolean(bridge.isItemClicked(integer(mouseButton, 0)));
    };
    api.isItemHovered = function (flags) { return Boolean(bridge.isItemHovered(integer(flags, 0))); };
    api.wantCaptureMouse = function () { return Boolean(bridge.wantCaptureMouse()); };
    api.isAnyItemHovered = function () { return Boolean(bridge.isAnyItemHovered()); };
    api.isAnyItemActive = function () { return Boolean(bridge.isAnyItemActive()); };
    api.styleColorsDark = function () { bridge.styleColorsDark(); };
    api.styleColorsLight = function () { bridge.styleColorsLight(); };
    api.styleColorsClassic = function () { bridge.styleColorsClassic(); };
    api.showDemoWindow = function (open) { bridge.showDemoWindow(open || null); };

    api.withWindow = function (name, open, flags, body) {
        var visible = api.begin(name, open, flags);
        try {
            if (visible && body) {
                body();
            }
            return visible;
        } finally {
            api.end();
        }
    };

    api.withChild = function (id, width, height, borders, flags, body) {
        var visible = api.beginChild(id, width, height, borders, flags);
        try {
            if (visible && body) {
                body();
            }
            return visible;
        } finally {
            api.endChild();
        }
    };

    api.withTreeNode = function (label, body) {
        var open = api.treeNode(label);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.treePop();
            }
        }
    };

    api.withTabBar = function (id, flags, body) {
        var open = api.beginTabBar(id, flags);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endTabBar();
            }
        }
    };

    api.withTabItem = function (label, openRef, flags, body) {
        var open = api.beginTabItem(label, openRef, flags);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endTabItem();
            }
        }
    };

    api.createWindow = function (renderCallback, options) {
        if (typeof renderCallback !== "function") {
            throw new TypeError("imgui.createWindow expects a render callback");
        }

        options = options || {};
        if (api._activeSession) {
            api._activeSession.close("replaced");
        }

        var metrics = context.getResources().getDisplayMetrics();
        var density = number(metrics.density, 1);
        var displayWidth = metrics.widthPixels;
        var displayHeight = metrics.heightPixels;
        var width = Math.max(1, integer(number(options.width, number(options.w, 360)) * density, 360));
        var height = Math.max(1, integer(number(options.height, number(options.h, 420)) * density, 420));
        var margin = integer(12 * density, 12);
        var x = integer(options.x, Math.max(0, displayWidth - width - margin));
        var y = integer(options.y, Math.max(0, displayHeight - height - integer(72 * density, 72)));
        var fps = clamp(integer(options.fps, 60), 15, 120);
        var frameDelay = Math.max(1, Math.round(1000 / fps));
        var movable = options.movable !== false;
        var fontPath = options.fontPath == null ? null : String(options.fontPath);
        var fontSize = number(options.fontSize, 16);
        var dragThreshold = Math.max(4, number(options.dragThreshold, 10) * density);

        var windowObject = floaty.rawWindow(
            '<frame bg="#00000000"><android.view.SurfaceView id="imgui_surface" w="*" h="*" /></frame>'
        );
        windowObject.setSize(width, height);
        windowObject.setPosition(x, y);

        var surfaceView = windowObject.imgui_surface;
        surfaceView.setZOrderOnTop(true);
        var holder = surfaceView.getHolder();
        holder.setFormat(PixelFormat.TRANSLUCENT);

        var session = {
            window: windowObject,
            surfaceView: surfaceView,
            width: width,
            height: height,
            x: x,
            y: y,
            ready: false,
            closed: false,
            closeReason: null,
            _closeRequested: false,
            _inFrame: false,
            _frameSerial: 0,
            _timer: null,

            setPosition: function (nextX, nextY) {
                if (session.closed) {
                    return session;
                }
                session.x = integer(nextX, session.x);
                session.y = integer(nextY, session.y);
                windowObject.setPosition(session.x, session.y);
                return session;
            },

            setSize: function (nextWidth, nextHeight) {
                if (session.closed) {
                    return session;
                }
                session.width = Math.max(1, integer(nextWidth, session.width));
                session.height = Math.max(1, integer(nextHeight, session.height));
                windowObject.setSize(session.width, session.height);
                return session;
            },

            close: function (reason) {
                if (session.closed) {
                    return;
                }
                session.closeReason = reason || "closed";
                session._closeRequested = true;
                if (!session._inFrame) {
                    finalizeClose();
                }
            }
        };

        api._activeSession = session;

        function removeExitListener() {
            try {
                if (events.removeListener) {
                    events.removeListener("exit", onExit);
                }
            } catch (ignored) {
                // Some engines expose events.on without removeListener.
            }
        }

        function finalizeClose() {
            if (session.closed) {
                return;
            }
            session.closed = true;
            session.ready = false;
            if (session._timer != null) {
                clearTimeout(session._timer);
                session._timer = null;
            }
            if (api._activeSession === session) {
                try {
                    bridge.shutdown();
                } catch (error) {
                    console.warn("[imgui] Shutdown failed: " + error);
                }
                api._activeSession = null;
            }
            removeExitListener();
            try {
                windowObject.close();
            } catch (ignored) {
                // The host may have already disposed the floating window.
            }
        }

        function onExit() {
            session.close("engine-exit");
        }

        holder.addCallback(new SurfaceHolderCallback({
            surfaceCreated: function (surfaceHolder) {
                if (session.closed || api._activeSession !== session) {
                    return;
                }
                try {
                    session.ready = Boolean(bridge.init(
                        surfaceHolder.getSurface(), density, fontPath, fontSize
                    ));
                    if (!session.ready) {
                        session.close("initialization-failed");
                    }
                } catch (error) {
                    console.error("[imgui] Initialization failed: " + error);
                    session.close("initialization-error");
                }
            },
            surfaceChanged: function () {
                // EGL reads the current native window dimensions every frame.
            },
            surfaceDestroyed: function () {
                session.ready = false;
                if (api._activeSession === session) {
                    try {
                        bridge.shutdown();
                    } catch (error) {
                        console.warn("[imgui] Surface shutdown failed: " + error);
                    }
                }
            }
        }));

        var downRawX = 0;
        var downRawY = 0;
        var originX = x;
        var originY = y;
        var downFrameSerial = 0;
        var dragging = false;

        surfaceView.setOnTouchListener(function (view, event) {
            if (!session.ready || session.closed || api._activeSession !== session) {
                return false;
            }

            var action = event.getActionMasked();
            var eventX = event.getX();
            var eventY = event.getY();

            if (action === MotionEvent.ACTION_DOWN) {
                downRawX = event.getRawX();
                downRawY = event.getRawY();
                originX = session.x;
                originY = session.y;
                downFrameSerial = session._frameSerial;
                dragging = false;
                bridge.touchEvent(0, eventX, eventY);
                return true;
            }

            if (action === MotionEvent.ACTION_MOVE) {
                var deltaX = event.getRawX() - downRawX;
                var deltaY = event.getRawY() - downRawY;
                if (!dragging && movable && session._frameSerial > downFrameSerial &&
                    Math.sqrt(deltaX * deltaX + deltaY * deltaY) >= dragThreshold
                ) {
                    var captured = false;
                    try {
                        captured = Boolean(bridge.isAnyItemHovered() || bridge.isAnyItemActive());
                    } catch (ignored) {
                        captured = true;
                    }
                    if (!captured) {
                        dragging = true;
                        bridge.touchEvent(3, eventX, eventY);
                    }
                }
                if (dragging) {
                    session.setPosition(
                        clamp(originX + Math.round(deltaX), 0, Math.max(0, displayWidth - session.width)),
                        clamp(originY + Math.round(deltaY), 0, Math.max(0, displayHeight - session.height))
                    );
                } else {
                    bridge.touchEvent(2, eventX, eventY);
                }
                return true;
            }

            if (action === MotionEvent.ACTION_UP || action === MotionEvent.ACTION_CANCEL) {
                if (!dragging) {
                    bridge.touchEvent(action === MotionEvent.ACTION_UP ? 1 : 3, eventX, eventY);
                }
                dragging = false;
                return true;
            }

            return true;
        });

        function scheduleNextFrame() {
            if (!session.closed && !session._closeRequested) {
                session._timer = setTimeout(renderFrame, frameDelay);
            }
        }

        function renderFrame() {
            session._timer = null;
            if (session._closeRequested || api._activeSession !== session) {
                session.close(session.closeReason || "replaced");
                return;
            }
            if (session.ready && !bridge.isOwner()) {
                session.close("native-context-replaced");
                return;
            }
            if (!session.ready || !bridge.isReady()) {
                scheduleNextFrame();
                return;
            }

            var frameStarted = false;
            var frameRendered = false;
            session._inFrame = true;
            try {
                frameStarted = Boolean(bridge.newFrame());
                if (frameStarted) {
                    renderCallback(api, session);
                }
            } catch (error) {
                console.error("[imgui] Render callback failed: " + error);
                if (error && error.stack) {
                    console.error(String(error.stack));
                }
                session.closeReason = "render-error";
                session._closeRequested = true;
            } finally {
                if (frameStarted) {
                    try {
                        frameRendered = Boolean(bridge.render());
                        if (frameRendered) {
                            session._frameSerial += 1;
                        }
                    } catch (error) {
                        console.error("[imgui] Frame presentation failed: " + error);
                    }
                }
                session._inFrame = false;
            }

            if (!frameRendered && frameStarted) {
                session.closeReason = "presentation-failed";
                session._closeRequested = true;
            }
            if (session._closeRequested) {
                finalizeClose();
            } else {
                scheduleNextFrame();
            }
        }

        try {
            events.on("exit", onExit);
        } catch (ignored) {
            // A short-lived host may not provide the events module.
        }
        scheduleNextFrame();
        return session;
    };

    api.closeWindow = function () {
        if (api._activeSession) {
            api._activeSession.close();
        }
    };
    api.launchFloaty = api.createWindow;

    var aliases = {
        SetNextWindowPos: "setNextWindowPos",
        SetNextWindowSize: "setNextWindowSize",
        SetNextWindowSizeConstraints: "setNextWindowSizeConstraints",
        SetNextWindowBgAlpha: "setNextWindowBgAlpha",
        Begin: "begin",
        End: "end",
        BeginChild: "beginChild",
        EndChild: "endChild",
        GetWindowPos: "getWindowPos",
        GetWindowSize: "getWindowSize",
        GetContentRegionAvail: "getContentRegionAvail",
        GetCursorPos: "getCursorPos",
        SetCursorPos: "setCursorPos",
        Text: "text",
        TextWrapped: "textWrapped",
        TextColored: "textColored",
        Button: "button",
        SmallButton: "smallButton",
        Checkbox: "checkbox",
        RadioButton: "radioButton",
        SliderFloat: "sliderFloat",
        SliderInt: "sliderInt",
        DragFloat: "dragFloat",
        DragInt: "dragInt",
        InputText: "inputText",
        ColorEdit3: "colorEdit3",
        ColorEdit4: "colorEdit4",
        ProgressBar: "progressBar",
        Combo: "combo",
        Selectable: "selectable",
        CollapsingHeader: "collapsingHeader",
        TreeNode: "treeNode",
        TreePop: "treePop",
        BeginTabBar: "beginTabBar",
        EndTabBar: "endTabBar",
        BeginTabItem: "beginTabItem",
        EndTabItem: "endTabItem",
        SameLine: "sameLine",
        Separator: "separator",
        Spacing: "spacing",
        NewLine: "newLine",
        Dummy: "dummy",
        SetNextItemWidth: "setNextItemWidth",
        PushItemWidth: "pushItemWidth",
        PopItemWidth: "popItemWidth",
        IsItemClicked: "isItemClicked",
        IsItemHovered: "isItemHovered",
        IsAnyItemHovered: "isAnyItemHovered",
        IsAnyItemActive: "isAnyItemActive",
        ShowDemoWindow: "showDemoWindow"
    };
    for (var alias in aliases) {
        if (aliases.hasOwnProperty(alias)) {
            api[alias] = api[aliases[alias]];
        }
    }

    try {
        Object.defineProperty(globalObject, "imgui", {
            value: api,
            writable: false,
            configurable: true,
            enumerable: true
        });
    } catch (ignored) {
        globalObject.imgui = api;
    }

    return api;
};
