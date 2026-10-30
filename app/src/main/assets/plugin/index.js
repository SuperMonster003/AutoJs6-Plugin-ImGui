/*
 * Dear ImGui runtime for AutoJs6 script engines.
 *
 * AutoJs6 6.8.0+ registers the host module `imgui`, which invokes the exported
 * function below the first time a script uses any of its members. Legacy
 * plugins.load() calls receive the same object. The function installs the API as
 * the global `imgui` object and is idempotent within a script engine.
 */

module.exports = function (bridge) {
    var globalObject = this;
    var PLUGIN_ID = "io.github.supermonster003.autojs6.plugin.imgui";

    if (globalObject.imgui && globalObject.imgui.__pluginId === PLUGIN_ID) {
        return globalObject.imgui;
    }

    var BooleanType = java.lang.Boolean.TYPE;
    var ByteType = java.lang.Byte.TYPE;
    var FloatType = java.lang.Float.TYPE;
    var IntegerType = java.lang.Integer.TYPE;
    var StringClass = java.lang.String;
    var MotionEvent = android.view.MotionEvent;
    var PixelFormat = android.graphics.PixelFormat;
    var AndroidColor = android.graphics.Color;
    var GradientDrawable = android.graphics.drawable.GradientDrawable;
    var Gravity = android.view.Gravity;
    var Runnable = java.lang.Runnable;
    var SurfaceHolderCallback = android.view.SurfaceHolder.Callback;
    var arrayFactory = java.lang.reflect.Array;

    var INT32_MIN = -2147483648;
    var INT32_MAX = 2147483647;
    var BOOLEAN_ARRAY_CLASS = java.lang.Class.forName("[Z");
    var FLOAT_ARRAY_CLASS = java.lang.Class.forName("[F");
    var INT_ARRAY_CLASS = java.lang.Class.forName("[I");
    var STRING_ARRAY_CLASS = java.lang.Class.forName("[Ljava.lang.String;");

    // Argument validation (R1.2): every message names the API and the argument, as in
    // `imgui.sliderFloat: argument "max" must be a finite number`. A wrong type or a non-finite
    // number throws TypeError, a finite value out of range RangeError.
    function argumentLabel(fn, name) {
        return "imgui." + fn + ": argument \"" + name + "\"";
    }

    function isNumberLike(value) {
        return typeof value === "number" || value instanceof java.lang.Number;
    }

    function isStringLike(value) {
        return typeof value === "string" || value instanceof java.lang.String;
    }

    function isBooleanLike(value) {
        return typeof value === "boolean" || value instanceof java.lang.Boolean;
    }

    function checkRange(fn, name, value, min, max) {
        if ((min != null && value < min) || (max != null && value > max)) {
            var expected = min != null && max != null
                ? "between " + min + " and " + max
                : (min != null ? ">= " + min : "<= " + max);
            throw new RangeError(argumentLabel(fn, name) + " must be " + expected + ", got " + value);
        }
        return value;
    }

    // null and undefined take the fallback; without a fallback (undefined) the argument is required.
    function argNumber(fn, name, value, fallback, min, max) {
        if (value == null && fallback !== undefined) {
            return fallback;
        }
        var result = isNumberLike(value) ? Number(value) : NaN;
        if (!isFinite(result)) {
            throw new TypeError(argumentLabel(fn, name) + " must be a finite number");
        }
        return checkRange(fn, name, result, min, max);
    }

    // A finite number rounded to the nearest integer, within the 32-bit range unless narrowed.
    function argInt(fn, name, value, fallback, min, max) {
        if (value == null && fallback !== undefined) {
            return fallback;
        }
        return checkRange(
            fn,
            name,
            Math.round(argNumber(fn, name, value)),
            min == null ? INT32_MIN : min,
            max == null ? INT32_MAX : max
        );
    }

    function argFunction(fn, name, value) {
        if (typeof value !== "function") {
            throw new TypeError(argumentLabel(fn, name) + " must be a function");
        }
        return value;
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
        return javaArray(FloatType, [argNumber("float", "value", value, 0)]);
    }

    function intRef(value) {
        return javaArray(IntegerType, [argInt("int", "value", value, 0)]);
    }

    function stringRef(value) {
        return javaArray(StringClass, [String(value == null ? "" : value)]);
    }

    function valueRef(value) {
        return {value: value};
    }

    function isValueRef(value) {
        return value != null &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            Object.prototype.hasOwnProperty.call(value, "value");
    }

    // A mutable argument is a one-element Java array from imgui.bool() / float() / int() / string()
    // or a {value} object whose value is checked like a plain argument and written back afterwards.
    var BOOL_REF = {
        nativeClass: BOOLEAN_ARRAY_CLASS,
        expectation: "imgui.bool() or {value: boolean}",
        check: function (fn, name, value) {
            if (value == null) {
                return false;
            }
            if (!isBooleanLike(value)) {
                throw new TypeError(argumentLabel(fn, name) + " must be a boolean");
            }
            return Boolean(value);
        },
        create: boolRef,
        read: Boolean
    };
    var FLOAT_REF = {
        nativeClass: FLOAT_ARRAY_CLASS,
        expectation: "imgui.float() or {value: number}",
        check: function (fn, name, value) {
            return argNumber(fn, name, value);
        },
        create: floatRef,
        read: Number
    };
    var INT_REF = {
        nativeClass: INT_ARRAY_CLASS,
        expectation: "imgui.int() or {value: number}",
        check: function (fn, name, value) {
            return argInt(fn, name, value);
        },
        create: intRef,
        read: Number
    };
    var STRING_REF = {
        nativeClass: STRING_ARRAY_CLASS,
        expectation: "imgui.string() or {value: string}",
        check: function (fn, name, value) {
            if (value == null) {
                return "";
            }
            if (!isStringLike(value)) {
                throw new TypeError(argumentLabel(fn, name) + " must be a string");
            }
            return String(value);
        },
        create: stringRef,
        read: String
    };

    function withScalarRef(fn, name, value, kind, callback) {
        if (isValueRef(value)) {
            var nativeRef = kind.create(kind.check(fn, name + ".value", value.value));
            try {
                return callback(nativeRef);
            } finally {
                value.value = kind.read(nativeRef[0]);
            }
        }
        if (value != null && kind.nativeClass.isInstance(value) && value.length >= 1) {
            return callback(value);
        }
        throw new TypeError(argumentLabel(fn, name) + " must be " + kind.expectation);
    }

    // The optional p_open / p_selected of Dear ImGui: null, undefined and false pass no reference.
    function withOptionalBoolRef(fn, name, value, callback) {
        if (value == null || value === false) {
            return callback(null);
        }
        if (value === true) {
            throw new TypeError(
                argumentLabel(fn, name) + " must be imgui.bool(), {value: boolean}, false, or null"
            );
        }
        return withScalarRef(fn, name, value, BOOL_REF, callback);
    }

    function withBoolRef(fn, name, value, callback) {
        return withScalarRef(fn, name, value, BOOL_REF, callback);
    }

    function withFloatRef(fn, name, value, callback) {
        return withScalarRef(fn, name, value, FLOAT_REF, callback);
    }

    function withIntRef(fn, name, value, callback) {
        return withScalarRef(fn, name, value, INT_REF, callback);
    }

    function withStringRef(fn, name, value, callback) {
        return withScalarRef(fn, name, value, STRING_REF, callback);
    }

    // A mutable number array (colors, multi-component widgets): a Java array from imgui.floats() / imgui.ints() or a
    // {value: [...]} object whose numbers are checked like plain arguments and written back afterwards.
    var FLOAT_ARRAY_REF = {nativeClass: FLOAT_ARRAY_CLASS, factory: "imgui.floats", check: argNumber, create: floatArray};
    var INT_ARRAY_REF = {nativeClass: INT_ARRAY_CLASS, factory: "imgui.ints", check: argInt, create: intArray};

    function withArrayRef(fn, name, value, minimumLength, kind, callback) {
        if (isValueRef(value)) {
            var source = value.value;
            if (source == null || isStringLike(source) || typeof source.length !== "number" ||
                source.length < minimumLength
            ) {
                throw new TypeError(
                    argumentLabel(fn, name + ".value") + " must be an array of at least " +
                    minimumLength + " numbers"
                );
            }
            var values = [];
            for (var index = 0; index < source.length; index += 1) {
                values.push(kind.check(fn, name + ".value[" + index + "]", source[index]));
            }
            var nativeRef = kind.create(values);
            try {
                return callback(nativeRef);
            } finally {
                for (var i = 0; i < nativeRef.length; i += 1) {
                    source[i] = Number(nativeRef[i]);
                }
                value.value = source;
            }
        }
        if (value != null && kind.nativeClass.isInstance(value) && value.length >= minimumLength) {
            return callback(value);
        }
        throw new TypeError(
            argumentLabel(fn, name) + " must be " + kind.factory + "([...]) or {value: [...]} with at least " +
            minimumLength + " numbers"
        );
    }

    function withFloatArrayRef(fn, name, value, minimumLength, callback) {
        return withArrayRef(fn, name, value, minimumLength, FLOAT_ARRAY_REF, callback);
    }

    function withIntArrayRef(fn, name, value, minimumLength, callback) {
        return withArrayRef(fn, name, value, minimumLength, INT_ARRAY_REF, callback);
    }

    function floatArray(values) {
        return javaArray(FloatType, values);
    }

    function intArray(values) {
        return javaArray(IntegerType, values);
    }

    function numberList(fn, name, values, check) {
        if (values == null || isStringLike(values) || typeof values.length !== "number") {
            throw new TypeError(argumentLabel(fn, name) + " must be an array of numbers");
        }
        var result = [];
        for (var index = 0; index < values.length; index += 1) {
            result.push((check || argNumber)(fn, name + "[" + index + "]", values[index]));
        }
        return result;
    }

    function byteArray(values) {
        var source = values || [];
        var bytes = [];
        for (var i = 0; i < source.length; i += 1) {
            var value = argInt("bytes", "values[" + i + "]", source[i]) & 0xFF;
            bytes.push(value > 127 ? value - 256 : value);
        }
        return javaArray(ByteType, bytes);
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
        _density: 1,
        _displayDensity: null,
        _theme: null,
        _fontAliases: null,

        bool: boolRef,
        float: floatRef,
        int: intRef,
        string: stringRef,
        ref: valueRef,
        floats: function (values) {
            return floatArray(numberList("floats", "values", values));
        },
        ints: function (values) {
            return intArray(numberList("ints", "values", values, argInt));
        },
        bytes: byteArray,
        strings: stringArray,

        version: function () {
            return String(bridge.version());
        }
    };

    api.listExamples = function () {
        var nativeNames = bridge.listExamples();
        var names = [];
        for (var index = 0; index < nativeNames.length; index += 1) {
            names.push(String(nativeNames[index]));
        }
        return names;
    };

    api.getExampleSource = function (name) {
        return String(bridge.getExampleSource(String(name)));
    };

    api.runExample = function (name, options) {
        var source = api.getExampleSource(name);
        var exampleModule = {exports: {}};
        var compileOptions = {};
        copyOwnProperties(compileOptions, options);
        compileOptions.__imguiExampleLoader = true;
        var compile = new Function(
            "module",
            "exports",
            "imgui",
            "options",
            source + "\n; return module.exports;"
        );
        var exported = compile(
            exampleModule,
            exampleModule.exports,
            api,
            compileOptions
        );
        var runner = typeof exported === "function" ? exported : exampleModule.exports;
        if (typeof runner !== "function") {
            throw new TypeError("ImGui example '" + name + "' does not export a runner function");
        }
        return runner(api, options || {});
    };

    api.Limits = freeze({
        InputTextMaxBytes: 64 * 1024,
        SelectionMaxItems: 512,
        InputQueueCapacity: 2048,
        DragDropPayloadMaxBytes: 64 * 1024
    });

    api.BackendStatus = freeze({
        Available: "available",
        Experimental: "experimental",
        Unavailable: "unavailable",
        Deferred: "deferred"
    });

    api.getBackendCapabilities = function () {
        var nativeValues = bridge.getBackendCapabilities();
        var values = {};
        if (nativeValues == null || nativeValues.length % 2 !== 0) {
            throw new Error("Invalid ImGui backend capability payload");
        }
        for (var capabilityIndex = 0; capabilityIndex < nativeValues.length; capabilityIndex += 2) {
            values[String(nativeValues[capabilityIndex])] = String(nativeValues[capabilityIndex + 1]);
        }

        function capabilityString(key, fallback) {
            return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback;
        }

        function capabilityBoolean(key) {
            return capabilityString(key, "false") === "true";
        }

        function capabilityInteger(key) {
            var value = parseInt(capabilityString(key, "0"), 10);
            return isFinite(value) ? value : 0;
        }

        return freeze({
            schemaVersion: capabilityInteger("schemaVersion"),
            sdk: capabilityInteger("sdk"),
            window: freeze({
                status: capabilityString("window.status", api.BackendStatus.Unavailable),
                productionReady: capabilityBoolean("window.productionReady"),
                requiresOverlayPermission: capabilityBoolean("window.requiresOverlayPermission")
            }),
            splitTouch: freeze({
                status: capabilityString("splitTouch.status", api.BackendStatus.Unavailable),
                productionReady: capabilityBoolean("splitTouch.productionReady")
            }),
            privileged: freeze({
                status: capabilityString("privileged.status", api.BackendStatus.Unavailable),
                productionReady: capabilityBoolean("privileged.productionReady"),
                protocolVersion: capabilityInteger("privileged.protocolVersion"),
                legacySocketProtocolVersion: capabilityInteger(
                    "privileged.legacySocketProtocolVersion"
                ),
                transport: capabilityString("privileged.transport", ""),
                rendererProcess: capabilityString("privileged.rendererProcess", ""),
                tokenBits: capabilityInteger("privileged.tokenBits"),
                processEntrypoint: capabilityBoolean("privileged.processEntrypoint"),
                surfaceControlApi: capabilityBoolean("privileged.surfaceControlApi"),
                launcherCandidate: capabilityBoolean("privileged.launcherCandidate"),
                hostBridgeAvailable: capabilityBoolean("privileged.hostBridgeAvailable"),
                rootBridgeAvailable: capabilityBoolean("privileged.rootBridgeAvailable"),
                rootMode: capabilityString("privileged.rootMode", "UNKNOWN"),
                rootBinaryPresent: capabilityBoolean("privileged.rootBinaryPresent"),
                rootCandidate: capabilityBoolean("privileged.rootCandidate"),
                rootError: capabilityString("privileged.rootError", ""),
                shizukuBridgeAvailable: capabilityBoolean(
                    "privileged.shizukuBridgeAvailable"
                ),
                shizukuInstalled: capabilityBoolean("privileged.shizukuInstalled"),
                shizukuRunning: capabilityBoolean("privileged.shizukuRunning"),
                shizukuPermission: capabilityBoolean("privileged.shizukuPermission"),
                shizukuService: capabilityBoolean("privileged.shizukuService"),
                shizukuOperational: capabilityBoolean("privileged.shizukuOperational"),
                shizukuError: capabilityString("privileged.shizukuError", ""),
                reason: capabilityString("privileged.reason", "")
            }),
            directInput: freeze({
                status: capabilityString("directInput.status", api.BackendStatus.Unavailable),
                productionReady: capabilityBoolean("directInput.productionReady"),
                readerImplemented: capabilityBoolean("directInput.readerImplemented"),
                appProcessReadable: capabilityBoolean("directInput.appProcessReadable"),
                runtimeProbeRequired: capabilityBoolean("directInput.runtimeProbeRequired"),
                routingPolicy: capabilityString("directInput.routingPolicy", ""),
                reason: capabilityString("directInput.reason", "")
            }),
            docking: freeze({
                status: capabilityString("docking.status", api.BackendStatus.Deferred),
                productionReady: capabilityBoolean("docking.productionReady")
            }),
            multiViewport: freeze({
                status: capabilityString("multiViewport.status", api.BackendStatus.Deferred),
                productionReady: capabilityBoolean("multiViewport.productionReady")
            })
        });
    };

    function inputTextCapacity(fn, value, fallback) {
        return Math.max(
            2,
            argInt(fn, "maxLength", value, fallback, 0, api.Limits.InputTextMaxBytes)
        );
    }

    function selectionItems(items, fn) {
        if (items == null || isStringLike(items) || typeof items.length !== "number") {
            throw new TypeError(argumentLabel(fn, "items") + " must be an array");
        }
        if (items.length > api.Limits.SelectionMaxItems) {
            throw new RangeError(
                argumentLabel(fn, "items") + " accepts at most " +
                api.Limits.SelectionMaxItems + " items, got " + items.length
            );
        }
        return stringArray(items);
    }

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

    api.ChildFlags = freeze({
        None: 0,
        Borders: 1 << 0,
        AlwaysUseWindowPadding: 1 << 1,
        ResizeX: 1 << 2,
        ResizeY: 1 << 3,
        AutoResizeX: 1 << 4,
        AutoResizeY: 1 << 5,
        AlwaysAutoResize: 1 << 6,
        FrameStyle: 1 << 7,
        NavFlattened: 1 << 8
    });

    api.ComboFlags = freeze({
        None: 0,
        PopupAlignLeft: 1 << 0,
        HeightSmall: 1 << 1,
        HeightRegular: 1 << 2,
        HeightLarge: 1 << 3,
        HeightLargest: 1 << 4,
        NoArrowButton: 1 << 5,
        NoPreview: 1 << 6,
        WidthFitPreview: 1 << 7
    });

    api.PopupFlags = freeze({
        None: 0,
        MouseButtonLeft: 1 << 2,
        MouseButtonRight: 2 << 2,
        MouseButtonMiddle: 3 << 2,
        NoReopen: 1 << 5,
        NoOpenOverExistingPopup: 1 << 7,
        NoOpenOverItems: 1 << 8,
        AnyPopupId: 1 << 10,
        AnyPopupLevel: 1 << 11,
        AnyPopup: (1 << 10) | (1 << 11)
    });

    api.HoveredFlags = freeze({
        None: 0,
        ChildWindows: 1 << 0,
        RootWindow: 1 << 1,
        AnyWindow: 1 << 2,
        NoPopupHierarchy: 1 << 3,
        AllowWhenBlockedByPopup: 1 << 5,
        AllowWhenBlockedByActiveItem: 1 << 7,
        AllowWhenOverlappedByItem: 1 << 8,
        AllowWhenOverlappedByWindow: 1 << 9,
        AllowWhenDisabled: 1 << 10,
        NoNavOverride: 1 << 11,
        AllowWhenOverlapped: (1 << 8) | (1 << 9),
        RectOnly: (1 << 5) | (1 << 7) | (1 << 8) | (1 << 9),
        RootAndChildWindows: (1 << 0) | (1 << 1),
        ForTooltip: 1 << 12,
        Stationary: 1 << 13,
        DelayNone: 1 << 14,
        DelayShort: 1 << 15,
        DelayNormal: 1 << 16,
        NoSharedDelay: 1 << 17
    });

    api.FocusedFlags = freeze({
        None: 0,
        ChildWindows: 1 << 0,
        RootWindow: 1 << 1,
        AnyWindow: 1 << 2,
        NoPopupHierarchy: 1 << 3,
        RootAndChildWindows: (1 << 0) | (1 << 1)
    });

    api.ColorEditFlags = freeze({
        None: 0,
        NoAlpha: 1 << 1,
        NoPicker: 1 << 2,
        NoOptions: 1 << 3,
        NoSmallPreview: 1 << 4,
        NoInputs: 1 << 5,
        NoTooltip: 1 << 6,
        NoLabel: 1 << 7,
        NoSidePreview: 1 << 8,
        NoDragDrop: 1 << 9,
        NoBorder: 1 << 10,
        NoColorMarkers: 1 << 11,
        AlphaOpaque: 1 << 12,
        AlphaNoBg: 1 << 13,
        AlphaPreviewHalf: 1 << 14,
        AlphaBar: 1 << 18,
        HDR: 1 << 19,
        DisplayRGB: 1 << 20,
        DisplayHSV: 1 << 21,
        DisplayHex: 1 << 22,
        Uint8: 1 << 23,
        Float: 1 << 24,
        PickerHueBar: 1 << 25,
        PickerHueWheel: 1 << 26,
        PickerNoRotate: 1 << 27,
        InputRGB: 1 << 28,
        InputHSV: 1 << 29
    });

    api.TableFlags = freeze({
        None: 0,
        Resizable: 1 << 0,
        Reorderable: 1 << 1,
        Hideable: 1 << 2,
        Sortable: 1 << 3,
        NoSavedSettings: 1 << 4,
        ContextMenuInBody: 1 << 5,
        RowBg: 1 << 6,
        BordersInnerH: 1 << 7,
        BordersOuterH: 1 << 8,
        BordersInnerV: 1 << 9,
        BordersOuterV: 1 << 10,
        BordersH: (1 << 7) | (1 << 8),
        BordersV: (1 << 9) | (1 << 10),
        BordersInner: (1 << 9) | (1 << 7),
        BordersOuter: (1 << 10) | (1 << 8),
        Borders: (1 << 7) | (1 << 8) | (1 << 9) | (1 << 10),
        NoBordersInBody: 1 << 11,
        NoBordersInBodyUntilResize: 1 << 12,
        SizingFixedFit: 1 << 13,
        SizingFixedSame: 2 << 13,
        SizingStretchProp: 3 << 13,
        SizingStretchSame: 4 << 13,
        NoHostExtendX: 1 << 16,
        NoHostExtendY: 1 << 17,
        NoKeepColumnsVisible: 1 << 18,
        PreciseWidths: 1 << 19,
        NoClip: 1 << 20,
        PadOuterX: 1 << 21,
        NoPadOuterX: 1 << 22,
        NoPadInnerX: 1 << 23,
        ScrollX: 1 << 24,
        ScrollY: 1 << 25,
        SortMulti: 1 << 26,
        SortTristate: 1 << 27,
        HighlightHoveredColumn: 1 << 28
    });

    api.TableColumnFlags = freeze({
        None: 0,
        Disabled: 1 << 0,
        DefaultHide: 1 << 1,
        DefaultSort: 1 << 2,
        WidthStretch: 1 << 3,
        WidthFixed: 1 << 4,
        NoResize: 1 << 5,
        NoReorder: 1 << 6,
        NoHide: 1 << 7,
        NoClip: 1 << 8,
        NoSort: 1 << 9,
        NoSortAscending: 1 << 10,
        NoSortDescending: 1 << 11,
        NoHeaderLabel: 1 << 12,
        NoHeaderWidth: 1 << 13,
        PreferSortAscending: 1 << 14,
        PreferSortDescending: 1 << 15,
        IndentEnable: 1 << 16,
        IndentDisable: 1 << 17,
        AngledHeader: 1 << 18,
        IsEnabled: 1 << 24,
        IsVisible: 1 << 25,
        IsSorted: 1 << 26,
        IsHovered: 1 << 27
    });

    api.TableRowFlags = freeze({
        None: 0,
        Headers: 1 << 0
    });

    api.TableBgTarget = freeze({
        None: 0,
        RowBg0: 1,
        RowBg1: 2,
        CellBg: 3
    });

    api.SortDirection = freeze({
        None: 0,
        Ascending: 1,
        Descending: 2
    });

    api.Col = freeze({
        Text: 0,
        TextDisabled: 1,
        WindowBg: 2,
        ChildBg: 3,
        PopupBg: 4,
        Border: 5,
        BorderShadow: 6,
        FrameBg: 7,
        FrameBgHovered: 8,
        FrameBgActive: 9,
        TitleBg: 10,
        TitleBgActive: 11,
        TitleBgCollapsed: 12,
        MenuBarBg: 13,
        ScrollbarBg: 14,
        ScrollbarGrab: 15,
        ScrollbarGrabHovered: 16,
        ScrollbarGrabActive: 17,
        CheckMark: 18,
        CheckboxSelectedBg: 19,
        SliderGrab: 20,
        SliderGrabActive: 21,
        Button: 22,
        ButtonHovered: 23,
        ButtonActive: 24,
        Header: 25,
        HeaderHovered: 26,
        HeaderActive: 27,
        Separator: 28,
        SeparatorHovered: 29,
        SeparatorActive: 30,
        ResizeGrip: 31,
        ResizeGripHovered: 32,
        ResizeGripActive: 33,
        InputTextCursor: 34,
        TabHovered: 35,
        Tab: 36,
        TabSelected: 37,
        TabSelectedOverline: 38,
        TabDimmed: 39,
        TabDimmedSelected: 40,
        TabDimmedSelectedOverline: 41,
        PlotLines: 42,
        PlotLinesHovered: 43,
        PlotHistogram: 44,
        PlotHistogramHovered: 45,
        TableHeaderBg: 46,
        TableBorderStrong: 47,
        TableBorderLight: 48,
        TableRowBg: 49,
        TableRowBgAlt: 50,
        TextLink: 51,
        TextSelectedBg: 52,
        TreeLines: 53,
        DragDropTarget: 54,
        DragDropTargetBg: 55,
        UnsavedMarker: 56,
        NavCursor: 57,
        NavWindowingHighlight: 58,
        NavWindowingDimBg: 59,
        ModalWindowDimBg: 60
    });

    api.StyleVar = freeze({
        Alpha: 0,
        DisabledAlpha: 1,
        WindowPadding: 2,
        WindowRounding: 3,
        WindowBorderSize: 4,
        WindowMinSize: 5,
        WindowTitleAlign: 6,
        ChildRounding: 7,
        ChildBorderSize: 8,
        PopupRounding: 9,
        PopupBorderSize: 10,
        FramePadding: 11,
        FrameRounding: 12,
        FrameBorderSize: 13,
        ItemSpacing: 14,
        ItemInnerSpacing: 15,
        IndentSpacing: 16,
        CellPadding: 17,
        ScrollbarSize: 18,
        ScrollbarRounding: 19,
        ScrollbarPadding: 20,
        GrabMinSize: 21,
        GrabRounding: 22,
        ImageRounding: 23,
        ImageBorderSize: 24,
        TabRounding: 25,
        TabBorderSize: 26,
        TabMinWidthBase: 27,
        TabMinWidthShrink: 28,
        TabBarBorderSize: 29,
        TabBarOverlineSize: 30,
        TableAngledHeadersAngle: 31,
        TableAngledHeadersTextAlign: 32,
        TreeLinesSize: 33,
        TreeLinesRounding: 34,
        MenuItemRounding: 35,
        SelectableRounding: 36,
        DragDropTargetRounding: 37,
        ButtonTextAlign: 38,
        SelectableTextAlign: 39,
        SeparatorSize: 40,
        SeparatorTextBorderSize: 41,
        SeparatorTextAlign: 42,
        SeparatorTextPadding: 43
    });

    api.Themes = freeze({
        Dark: "dark",
        Light: "light",
        Classic: "classic",
        Pink: "pink",
        Blue: "blue",
        ModernDark: "modern-dark",
        CyanDusk: "cyan-dusk",
        OrangeDark: "orange-dark",
        CrystalClear: "crystal-clear",
        VibrantNight: "vibrant-night",
        PurpleDream: "purple-dream"
    });

    api.Appearance = freeze({
        Flat: "flat",
        Rounded: "rounded",
        Card: "card"
    });

    api.Fonts = freeze({
        Default: 0,
        CjkFallback: 1,
        Icons: 2
    });

    api.TextureFlags = freeze({
        None: 0,
        Nearest: 1 << 0,
        Repeat: 1 << 1,
        Mipmaps: 1 << 2
    });

    api.DrawListLayer = freeze({
        Window: 0,
        Foreground: 1,
        Background: 2
    });

    api.DrawFlags = freeze({
        None: 0,
        RoundCornersTopLeft: 1 << 4,
        RoundCornersTopRight: 1 << 5,
        RoundCornersBottomLeft: 1 << 6,
        RoundCornersBottomRight: 1 << 7,
        RoundCornersNone: 1 << 8,
        RoundCornersAll: (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7),
        RoundCornersTop: (1 << 4) | (1 << 5),
        RoundCornersBottom: (1 << 6) | (1 << 7),
        RoundCornersLeft: (1 << 4) | (1 << 6),
        RoundCornersRight: (1 << 5) | (1 << 7),
        Closed: 1 << 9
    });

    api.TouchMode = freeze({
        Touchable: "touchable",
        Passthrough: "passthrough",
        Auto: "auto"
    });

    api.WindowMode = freeze({
        Overlay: "overlay",
        Activity: "activity",
        Privileged: "privileged"
    });

    api.LogLevel = freeze({
        Log: "log",
        Debug: "debug",
        Info: "info",
        Warn: "warn",
        Error: "error"
    });

    api.ToastPosition = freeze({
        TopLeft: "top-left",
        TopCenter: "top-center",
        TopRight: "top-right",
        Center: "center",
        BottomLeft: "bottom-left",
        BottomCenter: "bottom-center",
        BottomRight: "bottom-right"
    });

    api.Icons = freeze({
        Error: "\ue000",
        Warning: "\ue002",
        Pause: "\ue034",
        Play: "\ue037",
        Stop: "\ue047",
        Add: "\ue145",
        Copy: "\ue14d",
        Save: "\ue161",
        Download: "\ue2c4",
        Upload: "\ue2c6",
        Edit: "\ue3c9",
        ArrowBack: "\ue5c4",
        ArrowForward: "\ue5c8",
        Check: "\ue5ca",
        ChevronLeft: "\ue5cb",
        ChevronRight: "\ue5cc",
        Close: "\ue5cd",
        ExpandLess: "\ue5ce",
        ExpandMore: "\ue5cf",
        Menu: "\ue5d2",
        MoreHoriz: "\ue5d3",
        MoreVert: "\ue5d4",
        Refresh: "\ue5d5",
        Person: "\ue7fd",
        Star: "\ue838",
        BugReport: "\ue868",
        Code: "\ue86f",
        Delete: "\ue872",
        DoneAll: "\ue877",
        Favorite: "\ue87d",
        Home: "\ue88a",
        Info: "\ue88e",
        Lock: "\ue897",
        LockOpen: "\ue898",
        Search: "\ue8b6",
        Settings: "\ue8b8",
        Visibility: "\ue8f4",
        VisibilityOff: "\ue8f5"
    });

    function normalizedKey(value) {
        return String(value == null ? "" : value).replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    }

    function resolveWindowMode(value, fn, name) {
        var key = normalizedKey(value == null ? api.WindowMode.Overlay : value);
        if (key === "overlay" || key === "floaty" || key === "floating") {
            return api.WindowMode.Overlay;
        }
        if (key === "activity" || key === "fullscreen" || key === "full") {
            return api.WindowMode.Activity;
        }
        if (key === "privileged" || key === "shizuku" || key === "root") {
            return api.WindowMode.Privileged;
        }
        throw new RangeError(
            argumentLabel(fn, name) + " must be 'overlay', 'activity', or 'privileged', got " + value
        );
    }

    function resolveTouchMode(value, fn, name) {
        if (value == null || value === true) {
            return api.TouchMode.Touchable;
        }
        if (value === false) {
            return api.TouchMode.Passthrough;
        }
        var key = normalizedKey(value);
        if (key === "touchable" || key === "enabled" || key === "on") {
            return api.TouchMode.Touchable;
        }
        if (key === "passthrough" || key === "passthru" || key === "disabled" || key === "off") {
            return api.TouchMode.Passthrough;
        }
        if (key === "auto" || key === "automatic") {
            return api.TouchMode.Auto;
        }
        throw new RangeError(
            argumentLabel(fn, name) + " must be a boolean, 'touchable', 'passthrough', or 'auto', got " + value
        );
    }

    function resolveIniPath(value) {
        if (value == null || value === false || String(value).length === 0) {
            return null;
        }
        var requested = value === true ? "./imgui.ini" : String(value);
        var resolved = new java.io.File(String(files.path(requested))).getAbsoluteFile();
        var parent = resolved.getParentFile();
        if (parent != null && !parent.isDirectory() && !parent.mkdirs() && !parent.isDirectory()) {
            throw new Error("Unable to create ImGui ini directory: " + parent);
        }
        return String(resolved.getAbsolutePath());
    }

    // Android view colors (floating buttons) take the same Color values as ImGui; a number is a packed
    // imgui.colorU32() value, converted to Android's ARGB layout.
    function androidColor(value, fallback, fn, name) {
        var components = color4(value, fallback, fn, name);
        return AndroidColor.argb(
            Math.round(components[3] * 255),
            Math.round(components[0] * 255),
            Math.round(components[1] * 255),
            Math.round(components[2] * 255)
        );
    }

    function point(value, fn, name) {
        if (value != null && !isStringLike(value) && typeof value.length === "number" && value.length >= 2) {
            return [
                argNumber(fn, name + "[0]", value[0]),
                argNumber(fn, name + "[1]", value[1])
            ];
        }
        if (value != null && typeof value === "object" && value.x != null && value.y != null) {
            return [
                argNumber(fn, name + ".x", value.x),
                argNumber(fn, name + ".y", value.y)
            ];
        }
        throw new TypeError(argumentLabel(fn, name) + " must be [x, y] or {x, y}");
    }

    // A component in 0..1, or in 0..255 when greater than 1.
    function colorComponent(fn, name, value) {
        var component = argNumber(fn, name, value, undefined, 0, 255);
        return component > 1 ? component / 255 : component;
    }

    function hexColor(value, fn, name) {
        var hex = String(value).replace(/^#/, "");
        if (hex.length === 3 || hex.length === 4) {
            var expanded = "";
            for (var i = 0; i < hex.length; i += 1) {
                expanded += hex.charAt(i) + hex.charAt(i);
            }
            hex = expanded;
        }
        if ((hex.length !== 6 && hex.length !== 8) || !/^[0-9A-Fa-f]+$/.test(hex)) {
            throw new TypeError(
                argumentLabel(fn, name) + " must be #RGB, #RGBA, #RRGGBB, or #RRGGBBAA, got '" +
                value + "'"
            );
        }
        var parsed = parseInt(hex, 16);
        if (hex.length === 6) {
            return [
                ((parsed >>> 16) & 0xFF) / 255,
                ((parsed >>> 8) & 0xFF) / 255,
                (parsed & 0xFF) / 255,
                1
            ];
        }
        return [
            ((parsed >>> 24) & 0xFF) / 255,
            ((parsed >>> 16) & 0xFF) / 255,
            ((parsed >>> 8) & 0xFF) / 255,
            (parsed & 0xFF) / 255
        ];
    }

    // Color: a packed imgui.colorU32() integer, [r, g, b, a], {r, g, b, a}, or "#rrggbbaa". A null
    // value takes the fallback; without a fallback the color is required.
    function color4(value, fallback, fn, name) {
        if (value == null) {
            if (fallback == null) {
                throw new TypeError(argumentLabel(fn, name) + " must be a color");
            }
            return fallback.slice();
        }
        if (isStringLike(value)) {
            return hexColor(value, fn, name);
        }
        if (isNumberLike(value)) {
            var packed = argNumber(fn, name, value, undefined, INT32_MIN, 0xFFFFFFFF) >>> 0;
            return [
                (packed & 0xFF) / 255,
                ((packed >>> 8) & 0xFF) / 255,
                ((packed >>> 16) & 0xFF) / 255,
                ((packed >>> 24) & 0xFF) / 255
            ];
        }
        if (typeof value === "object" && typeof value.length === "number" && value.length >= 3) {
            return [
                colorComponent(fn, name + "[0]", value[0]),
                colorComponent(fn, name + "[1]", value[1]),
                colorComponent(fn, name + "[2]", value[2]),
                value.length > 3 && value[3] != null ? colorComponent(fn, name + "[3]", value[3]) : 1
            ];
        }
        if (typeof value === "object" && value.r != null && value.g != null && value.b != null) {
            return [
                colorComponent(fn, name + ".r", value.r),
                colorComponent(fn, name + ".g", value.g),
                colorComponent(fn, name + ".b", value.b),
                value.a == null ? 1 : colorComponent(fn, name + ".a", value.a)
            ];
        }
        throw new TypeError(
            argumentLabel(fn, name) + " must be a packed color, [r, g, b, a], {r, g, b, a}, or a hex color"
        );
    }

    // The r, g, b[, a] overload kept beside one Color argument: chosen when the first three are numbers.
    function isComponentColor(red, green, blue) {
        return isNumberLike(red) && isNumberLike(green) && isNumberLike(blue);
    }

    function componentColor(fn, red, green, blue, alpha) {
        return [
            colorComponent(fn, "red", red),
            colorComponent(fn, "green", green),
            colorComponent(fn, "blue", blue),
            alpha == null ? 1 : colorComponent(fn, "alpha", alpha)
        ];
    }

    function packComponents(components) {
        var red = Math.round(components[0] * 255) & 0xFF;
        var green = Math.round(components[1] * 255) & 0xFF;
        var blue = Math.round(components[2] * 255) & 0xFF;
        var alpha = Math.round(components[3] * 255) & 0xFF;
        return (red | (green << 8) | (blue << 16) | (alpha << 24)) | 0;
    }

    function packColor(value, fallback, fn, name) {
        if (isNumberLike(value)) {
            return argNumber(fn, name, value, undefined, INT32_MIN, 0xFFFFFFFF) | 0;
        }
        return packComponents(color4(value, fallback, fn, name));
    }

    api.colorU32 = function (red, green, blue, alpha) {
        if (arguments.length > 1) {
            return packComponents(componentColor("colorU32", red, green, blue, alpha));
        }
        return packColor(red, null, "colorU32", "color");
    };

    function flattenPoints(points, fn, name) {
        if (points == null || isStringLike(points) || typeof points.length !== "number" || points.length < 2) {
            throw new TypeError(argumentLabel(fn, name) + " must be an array of at least two points");
        }
        if (points.length > 4096) {
            throw new RangeError(
                argumentLabel(fn, name) + " accepts at most 4096 points, got " + points.length
            );
        }
        var flattened = [];
        for (var i = 0; i < points.length; i += 1) {
            var resolved = point(points[i], fn, name + "[" + i + "]");
            flattened.push(resolved[0], resolved[1]);
        }
        return floatArray(flattened);
    }

    function resolveFontIndex(font, allowCurrent, fn, name) {
        if (font == null && allowCurrent) {
            return -1;
        }
        var index;
        if (font == null) {
            index = api.Fonts.Default;
        } else if (isNumberLike(font)) {
            index = argInt(fn, name, font);
        } else if (isStringLike(font)) {
            index = api._fontAliases[normalizedKey(font)];
        } else if (typeof font === "object" && font.index != null) {
            index = argInt(fn, name + ".index", font.index);
        } else {
            throw new TypeError(argumentLabel(fn, name) + " must be a font handle, index, or id");
        }
        if (index == null || index < 0) {
            throw new RangeError(argumentLabel(fn, name) + " is an unknown font: " + font);
        }
        return index;
    }

    function resolveTextureFlags(options, fn) {
        if (isNumberLike(options)) {
            return argInt(fn, "options", options);
        }
        options = options || {};
        var flags = argInt(fn, "options.flags", options.flags, 0);
        if (options.nearest === true || normalizedKey(options.filter) === "nearest") {
            flags |= api.TextureFlags.Nearest;
        }
        if (options.repeat === true || normalizedKey(options.wrap) === "repeat") {
            flags |= api.TextureFlags.Repeat;
        }
        if (options.mipmaps === true || options.mipmap === true) {
            flags |= api.TextureFlags.Mipmaps;
        }
        return flags;
    }

    var ICON_NAME_TO_GLYPH = {};
    for (var iconConstant in api.Icons) {
        if (api.Icons.hasOwnProperty(iconConstant)) {
            ICON_NAME_TO_GLYPH[normalizedKey(iconConstant)] = api.Icons[iconConstant];
        }
    }
    api.icon = function (name, label) {
        var glyph = ICON_NAME_TO_GLYPH[normalizedKey(name)];
        if (!glyph) {
            throw new RangeError(
                argumentLabel("icon", "name") + " is an unknown icon: " + name + ". Use a name from imgui.Icons"
            );
        }
        return label == null ? glyph : glyph + " " + String(label);
    };

    api._fontAliases = {
        default: api.Fonts.Default,
        cjk: api.Fonts.CjkFallback,
        cjkfallback: api.Fonts.CjkFallback,
        icon: api.Fonts.Icons,
        icons: api.Fonts.Icons
    };

    function mixColor(first, second, amount) {
        return [
            first[0] + (second[0] - first[0]) * amount,
            first[1] + (second[1] - first[1]) * amount,
            first[2] + (second[2] - first[2]) * amount
        ];
    }

    function copyOwnProperties(target, source) {
        if (!source) {
            return target;
        }
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    }

    var STYLE_VECTOR_NAMES = {
        WindowPadding: true,
        WindowMinSize: true,
        WindowTitleAlign: true,
        FramePadding: true,
        ItemSpacing: true,
        ItemInnerSpacing: true,
        CellPadding: true,
        TableAngledHeadersTextAlign: true,
        ButtonTextAlign: true,
        SelectableTextAlign: true,
        SeparatorTextAlign: true,
        SeparatorTextPadding: true
    };
    var STYLE_UNSCALED_NAMES = {
        Alpha: true,
        DisabledAlpha: true,
        WindowTitleAlign: true,
        TableAngledHeadersAngle: true,
        TableAngledHeadersTextAlign: true,
        ButtonTextAlign: true,
        SelectableTextAlign: true,
        SeparatorTextAlign: true
    };
    var STYLE_PROPERTY_INFO = {};
    for (var styleName in api.StyleVar) {
        if (api.StyleVar.hasOwnProperty(styleName)) {
            STYLE_PROPERTY_INFO[normalizedKey(styleName)] = {
                name: styleName,
                index: api.StyleVar[styleName],
                vector: Boolean(STYLE_VECTOR_NAMES[styleName]),
                scaled: !STYLE_UNSCALED_NAMES[styleName]
            };
        }
    }

    var COLOR_NAME_TO_INDEX = {};
    for (var colorName in api.Col) {
        if (api.Col.hasOwnProperty(colorName)) {
            COLOR_NAME_TO_INDEX[normalizedKey(colorName)] = api.Col[colorName];
        }
    }

    function themeStyle(rounding, borderSize) {
        return {
            windowPadding: [12, 10],
            windowRounding: rounding + 4,
            windowBorderSize: borderSize,
            childRounding: rounding + 2,
            childBorderSize: borderSize,
            popupRounding: rounding + 2,
            popupBorderSize: borderSize,
            framePadding: [9, 6],
            frameRounding: rounding,
            frameBorderSize: 0,
            itemSpacing: [9, 7],
            itemInnerSpacing: [7, 5],
            cellPadding: [8, 5],
            scrollbarSize: 15,
            scrollbarRounding: rounding,
            scrollbarPadding: 2,
            grabMinSize: 12,
            grabRounding: rounding,
            tabRounding: rounding,
            tabBorderSize: 0,
            tabBarBorderSize: borderSize,
            menuItemRounding: rounding,
            selectableRounding: rounding,
            separatorTextPadding: [18, 4]
        };
    }

    var THEME_DEFINITIONS = {};
    THEME_DEFINITIONS[api.Themes.Dark] = {preset: 0};
    THEME_DEFINITIONS[api.Themes.Light] = {preset: 1};
    THEME_DEFINITIONS[api.Themes.Classic] = {preset: 2};
    THEME_DEFINITIONS[api.Themes.Pink] = {
        preset: 0,
        accent: [0.93, 0.25, 0.55],
        background: [0.075, 0.045, 0.07],
        light: false,
        style: themeStyle(7, 1)
    };
    THEME_DEFINITIONS[api.Themes.Blue] = {
        preset: 0,
        accent: [0.20, 0.50, 0.96],
        background: [0.035, 0.065, 0.12],
        light: false,
        style: themeStyle(6, 1)
    };
    THEME_DEFINITIONS[api.Themes.ModernDark] = {
        preset: 0,
        accent: [0.35, 0.55, 0.95],
        background: [0.055, 0.06, 0.075],
        light: false,
        style: themeStyle(5, 0)
    };
    THEME_DEFINITIONS[api.Themes.CyanDusk] = {
        preset: 0,
        accent: [0.08, 0.78, 0.82],
        background: [0.025, 0.085, 0.10],
        light: false,
        style: themeStyle(8, 1)
    };
    THEME_DEFINITIONS[api.Themes.OrangeDark] = {
        preset: 0,
        accent: [0.98, 0.45, 0.12],
        background: [0.085, 0.05, 0.025],
        light: false,
        style: themeStyle(5, 1)
    };
    THEME_DEFINITIONS[api.Themes.CrystalClear] = {
        preset: 1,
        accent: [0.02, 0.55, 0.85],
        background: [0.94, 0.97, 0.985],
        light: true,
        style: themeStyle(9, 1)
    };
    THEME_DEFINITIONS[api.Themes.VibrantNight] = {
        preset: 0,
        accent: [0.98, 0.18, 0.43],
        secondary: [0.50, 0.25, 0.98],
        background: [0.035, 0.025, 0.09],
        light: false,
        style: themeStyle(8, 1)
    };
    THEME_DEFINITIONS[api.Themes.PurpleDream] = {
        preset: 0,
        accent: [0.65, 0.28, 0.94],
        secondary: [0.93, 0.35, 0.78],
        background: [0.065, 0.035, 0.105],
        light: false,
        style: themeStyle(10, 1)
    };

    var THEME_ALIASES = {};
    for (var themeConstant in api.Themes) {
        if (api.Themes.hasOwnProperty(themeConstant)) {
            THEME_ALIASES[normalizedKey(themeConstant)] = api.Themes[themeConstant];
            THEME_ALIASES[normalizedKey(api.Themes[themeConstant])] = api.Themes[themeConstant];
        }
    }

    function resolveThemeName(name, fn, argumentName) {
        var resolved = THEME_ALIASES[normalizedKey(name)];
        if (!resolved) {
            throw new RangeError(
                argumentLabel(fn, argumentName) + " is an unknown theme: " + name +
                ". Use one of the imgui.Themes values"
            );
        }
        return resolved;
    }

    function applyThemePalette(definition) {
        var light = definition.light === true;
        var accent = definition.accent;
        var secondary = definition.secondary || accent;
        var background = definition.background;
        var white = [1, 1, 1];
        var black = [0, 0, 0];
        var surface = mixColor(background, light ? white : white, light ? 0.50 : 0.075);
        var raised = mixColor(background, light ? white : white, light ? 0.72 : 0.13);
        var text = light ? [0.08, 0.105, 0.14] : [0.93, 0.95, 0.98];
        var muted = mixColor(text, background, light ? 0.52 : 0.48);
        var border = mixColor(background, light ? black : white, light ? 0.18 : 0.23);
        var transparent = [0, 0, 0, 0];
        var colors = {};

        function put(index, rgb, alpha) {
            colors[index] = [rgb[0], rgb[1], rgb[2], alpha == null ? 1 : alpha];
        }

        put(api.Col.Text, text);
        put(api.Col.TextDisabled, muted);
        put(api.Col.WindowBg, background, light ? 0.97 : 0.98);
        put(api.Col.ChildBg, background, light ? 0.72 : 0.35);
        put(api.Col.PopupBg, raised, 0.98);
        put(api.Col.Border, border, light ? 0.50 : 0.65);
        put(api.Col.BorderShadow, black, light ? 0.13 : 0.30);
        put(api.Col.FrameBg, surface, light ? 0.72 : 0.82);
        put(api.Col.FrameBgHovered, mixColor(surface, accent, 0.32), 0.92);
        put(api.Col.FrameBgActive, mixColor(surface, accent, 0.48), 0.97);
        put(api.Col.TitleBg, mixColor(background, black, light ? 0.03 : 0.18), 0.98);
        put(api.Col.TitleBgActive, mixColor(background, accent, light ? 0.20 : 0.36), 1);
        put(api.Col.TitleBgCollapsed, background, 0.78);
        put(api.Col.MenuBarBg, surface, 0.94);
        put(api.Col.ScrollbarBg, background, light ? 0.42 : 0.58);
        put(api.Col.ScrollbarGrab, mixColor(surface, accent, 0.30), 0.78);
        put(api.Col.ScrollbarGrabHovered, mixColor(surface, accent, 0.52), 0.92);
        put(api.Col.ScrollbarGrabActive, accent, 0.95);
        put(api.Col.CheckMark, light ? mixColor(accent, black, 0.10) : mixColor(accent, white, 0.12));
        put(api.Col.CheckboxSelectedBg, accent, 0.95);
        put(api.Col.SliderGrab, accent, 0.75);
        put(api.Col.SliderGrabActive, mixColor(accent, white, light ? 0.02 : 0.18));
        put(api.Col.Button, accent, light ? 0.20 : 0.36);
        put(api.Col.ButtonHovered, accent, light ? 0.38 : 0.62);
        put(api.Col.ButtonActive, accent, light ? 0.58 : 0.85);
        put(api.Col.Header, secondary, light ? 0.18 : 0.30);
        put(api.Col.HeaderHovered, secondary, light ? 0.34 : 0.56);
        put(api.Col.HeaderActive, secondary, light ? 0.52 : 0.78);
        put(api.Col.Separator, border, 0.72);
        put(api.Col.SeparatorHovered, accent, 0.76);
        put(api.Col.SeparatorActive, accent, 1);
        put(api.Col.ResizeGrip, accent, 0.22);
        put(api.Col.ResizeGripHovered, accent, 0.62);
        put(api.Col.ResizeGripActive, accent, 0.90);
        put(api.Col.InputTextCursor, accent);
        put(api.Col.Tab, mixColor(surface, accent, 0.16), 0.95);
        put(api.Col.TabHovered, accent, light ? 0.40 : 0.70);
        put(api.Col.TabSelected, mixColor(surface, accent, light ? 0.28 : 0.46), 1);
        put(api.Col.TabSelectedOverline, accent, 1);
        put(api.Col.TabDimmed, surface, 0.80);
        put(api.Col.TabDimmedSelected, mixColor(surface, accent, 0.20), 0.92);
        put(api.Col.TabDimmedSelectedOverline, accent, 0.55);
        put(api.Col.PlotLines, secondary, 0.90);
        put(api.Col.PlotLinesHovered, accent, 1);
        put(api.Col.PlotHistogram, accent, 0.85);
        put(api.Col.PlotHistogramHovered, mixColor(accent, white, light ? 0 : 0.18), 1);
        put(api.Col.TableHeaderBg, mixColor(surface, accent, 0.14), 0.96);
        put(api.Col.TableBorderStrong, border, 0.72);
        put(api.Col.TableBorderLight, border, 0.38);
        put(api.Col.TableRowBg, transparent, 0);
        put(api.Col.TableRowBgAlt, light ? black : white, light ? 0.035 : 0.028);
        put(api.Col.TextLink, accent);
        put(api.Col.TextSelectedBg, accent, light ? 0.25 : 0.38);
        put(api.Col.TreeLines, border, 0.75);
        put(api.Col.DragDropTarget, accent, 0.98);
        put(api.Col.DragDropTargetBg, accent, 0.18);
        put(api.Col.UnsavedMarker, secondary, 0.95);
        put(api.Col.NavCursor, accent, 1);
        put(api.Col.NavWindowingHighlight, white, light ? 0.55 : 0.72);
        put(api.Col.NavWindowingDimBg, black, light ? 0.12 : 0.35);
        put(api.Col.ModalWindowDimBg, black, light ? 0.20 : 0.48);

        for (var index in colors) {
            if (colors.hasOwnProperty(index)) {
                api.setStyleColor(Number(index), colors[index]);
            }
        }
    }

    var APPEARANCE_DEFINITIONS = {
        flat: {
            style: {
                windowRounding: 0,
                childRounding: 0,
                popupRounding: 0,
                frameRounding: 0,
                scrollbarRounding: 0,
                grabRounding: 0,
                tabRounding: 0,
                menuItemRounding: 0,
                selectableRounding: 0,
                windowBorderSize: 0,
                childBorderSize: 0,
                popupBorderSize: 0,
                frameBorderSize: 0
            },
            shadow: [0, 0, 0, 0]
        },
        rounded: {
            style: themeStyle(7, 1),
            shadow: [0, 0, 0, 0.18]
        },
        card: {
            style: themeStyle(10, 1),
            shadow: [0, 0, 0, 0.38]
        }
    };

    function resolveAppearanceName(name, fn, argumentName) {
        var key = normalizedKey(name);
        if (key === "flat") return "flat";
        if (key === "rounded") return "rounded";
        if (key === "card") return "card";
        throw new RangeError(
            argumentLabel(fn, argumentName) + " is an unknown appearance: " + name +
            ". Use one of the imgui.Appearance values"
        );
    }

    api.Dir = freeze({
        None: -1,
        Left: 0,
        Right: 1,
        Up: 2,
        Down: 3
    });

    api.ButtonFlags = freeze({
        None: 0,
        MouseButtonLeft: 1 << 0,
        MouseButtonRight: 1 << 1,
        MouseButtonMiddle: 1 << 2,
        EnableNav: 1 << 3
    });

    // The keyboard keys of the ImGuiKey enum in order, from ImGuiKey_NamedKey_BEGIN; 0 to 9 are Digit0 to Digit9.
    var KEY_NAMES = [
        "Tab", "LeftArrow", "RightArrow", "UpArrow", "DownArrow", "PageUp", "PageDown", "Home", "End", "Insert", "Delete",
        "Backspace", "Space", "Enter", "Escape", "LeftCtrl", "LeftShift", "LeftAlt", "LeftSuper", "RightCtrl",
        "RightShift", "RightAlt", "RightSuper", "Menu", "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
        "Digit6", "Digit7", "Digit8", "Digit9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O",
        "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10",
        "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F21", "F22", "F23", "F24", "Apostrophe",
        "Comma", "Minus", "Period", "Slash", "Semicolon", "Equal", "LeftBracket", "Backslash", "RightBracket",
        "GraveAccent", "CapsLock", "ScrollLock", "NumLock", "PrintScreen", "Pause", "Keypad0", "Keypad1", "Keypad2",
        "Keypad3", "Keypad4", "Keypad5", "Keypad6", "Keypad7", "Keypad8", "Keypad9", "KeypadDecimal", "KeypadDivide",
        "KeypadMultiply", "KeypadSubtract", "KeypadAdd", "KeypadEnter", "KeypadEqual", "AppBack", "AppForward", "Oem102"
    ];
    var KEY_NAMED_BEGIN = 512;
    // ImGuiKey_NamedKey_END; the gamepad and mouse keys after Oem102 are valid but have no constant here.
    var KEY_NAMED_END = 667;

    api.Key = (function () {
        var keys = {None: 0};
        KEY_NAMES.forEach(function (name, index) {
            keys[name] = KEY_NAMED_BEGIN + index;
        });
        keys.ModCtrl = 1 << 12;
        keys.ModShift = 1 << 13;
        keys.ModAlt = 1 << 14;
        keys.ModSuper = 1 << 15;
        return freeze(keys);
    })();

    api.Mod = freeze({
        None: 0,
        Ctrl: 1 << 12,
        Shift: 1 << 13,
        Alt: 1 << 14,
        Super: 1 << 15
    });

    api.InputFlags = freeze({
        None: 0,
        Repeat: 1 << 0,
        RouteActive: 1 << 10,
        RouteFocused: 1 << 11,
        RouteGlobal: 1 << 12,
        RouteAlways: 1 << 13,
        RouteOverFocused: 1 << 14,
        RouteOverActive: 1 << 15,
        RouteUnlessBgFocused: 1 << 16,
        RouteFromRootWindow: 1 << 17,
        Tooltip: 1 << 18
    });

    api.DragDropFlags = freeze({
        None: 0,
        SourceNoPreviewTooltip: 1 << 0,
        SourceNoDisableHover: 1 << 1,
        SourceNoHoldToOpenOthers: 1 << 2,
        SourceAllowNullID: 1 << 3,
        SourceExtern: 1 << 4,
        PayloadAutoExpire: 1 << 5,
        PayloadNoCrossContext: 1 << 6,
        PayloadNoCrossProcess: 1 << 7,
        AcceptBeforeDelivery: 1 << 10,
        AcceptNoDrawDefaultRect: 1 << 11,
        AcceptNoPreviewTooltip: 1 << 12,
        AcceptDrawAsHovered: 1 << 13,
        AcceptPeekOnly: (1 << 10) | (1 << 11)
    });

    var MOUSE_BUTTON_MAX = 4;
    var TABLE_MAX_COLUMNS = 512;
    // Debug mode (R3.5, Q7): a render callback slower than this gets a console.warn, at most one per interval.
    var SLOW_RENDER_CALLBACK_MS = 250;
    var SLOW_RENDER_WARNING_INTERVAL_MS = 10000;
    var PINCH_THRESHOLD_DP = 24;
    var STYLE_VAR_MAX_INDEX = api.StyleVar.SeparatorTextPadding;

    // The host has no script API for this. The image belongs to the runtime of the script, which recycles it at the end.
    function wrapCapturedBitmap(bitmap) {
        return org.autojs.autojs.core.image.ImageWrapper.ofBitmap(runtime, bitmap);
    }

    function mouseButton(fn, value) {
        return argInt(fn, "button", value, 0, 0, MOUSE_BUTTON_MAX);
    }

    function argFlags(fn, value) {
        return argInt(fn, "flags", value, 0);
    }

    function isNamedKey(value) {
        return value >= KEY_NAMED_BEGIN && value < KEY_NAMED_END;
    }

    function isSingleMod(value) {
        return value === api.Mod.Ctrl || value === api.Mod.Shift || value === api.Mod.Alt || value === api.Mod.Super;
    }

    // Dear ImGui indexes its key table with these values unchecked; ImGuiBridge.cpp repeats the checks.
    function argKey(fn, value) {
        var key = argInt(fn, "key", value);
        if (!isNamedKey(key) && !isSingleMod(key)) {
            throw new RangeError(argumentLabel(fn, "key") + " must be a value of imgui.Key or imgui.Mod, got " + key);
        }
        return key;
    }

    function argKeyChord(fn, value) {
        var chord = argInt(fn, "keyChord", value);
        var modifiers = chord & 0xF000;
        var key = chord & ~0xF000;
        if (!isNamedKey(key) && !(key === 0 && isSingleMod(modifiers))) {
            throw new RangeError(
                argumentLabel(fn, "keyChord") + " must be a key of imgui.Key, optionally combined with imgui.Mod " +
                "values, or one imgui.Mod value, got " + chord
            );
        }
        return chord;
    }

    function resolveColorIndex(fn, value) {
        var colorIndex;
        if (isStringLike(value)) {
            colorIndex = COLOR_NAME_TO_INDEX[normalizedKey(value)];
            if (colorIndex == null) {
                throw new RangeError(
                    argumentLabel(fn, "index") + " is an unknown style color: " + value +
                    ". Use a name from imgui.Col"
                );
            }
            return colorIndex;
        }
        return argInt(fn, "index", value, undefined, 0, api.Col.ModalWindowDimBg);
    }

    function resolveStyleVarIndex(fn, value) {
        if (isStringLike(value)) {
            var info = STYLE_PROPERTY_INFO[normalizedKey(value)];
            if (!info) {
                throw new RangeError(
                    argumentLabel(fn, "index") + " is an unknown style variable: " + value +
                    ". Use a name from imgui.StyleVar"
                );
            }
            return info.index;
        }
        return argInt(fn, "index", value, undefined, 0, STYLE_VAR_MAX_INDEX);
    }

    api.setNextWindowPos = function (x, y, condition, pivotX, pivotY) {
        bridge.setNextWindowPos(
            argNumber("setNextWindowPos", "x", x),
            argNumber("setNextWindowPos", "y", y),
            argInt("setNextWindowPos", "condition", condition, 0),
            argNumber("setNextWindowPos", "pivotX", pivotX, 0),
            argNumber("setNextWindowPos", "pivotY", pivotY, 0)
        );
    };

    api.setNextWindowSize = function (width, height, condition) {
        bridge.setNextWindowSize(
            argNumber("setNextWindowSize", "width", width),
            argNumber("setNextWindowSize", "height", height),
            argInt("setNextWindowSize", "condition", condition, 0)
        );
    };

    api.setNextWindowSizeConstraints = function (minWidth, minHeight, maxWidth, maxHeight) {
        bridge.setNextWindowSizeConstraints(
            argNumber("setNextWindowSizeConstraints", "minWidth", minWidth),
            argNumber("setNextWindowSizeConstraints", "minHeight", minHeight),
            argNumber("setNextWindowSizeConstraints", "maxWidth", maxWidth),
            argNumber("setNextWindowSizeConstraints", "maxHeight", maxHeight)
        );
    };

    api.setNextWindowBgAlpha = function (alpha) {
        bridge.setNextWindowBgAlpha(argNumber("setNextWindowBgAlpha", "alpha", alpha, undefined, 0, 1));
    };
    api.setKeyboardFocusHere = function (offset) {
        bridge.setKeyboardFocusHere(argInt("setKeyboardFocusHere", "offset", offset, 0));
    };

    api.begin = function (name, open, flags) {
        return withOptionalBoolRef("begin", "open", open, function (nativeRef) {
            return Boolean(bridge.begin(String(name), nativeRef, argFlags("begin", flags)));
        });
    };
    api.end = function () { bridge.end(); };
    api.beginChild = function (id, width, height, borders, flags) {
        if (isNumberLike(borders)) {
            return Boolean(bridge.beginChildEx(
                String(id),
                argNumber("beginChild", "width", width, 0),
                argNumber("beginChild", "height", height, 0),
                argInt("beginChild", "childFlags", borders),
                argFlags("beginChild", flags)
            ));
        }
        return Boolean(bridge.beginChild(
            String(id),
            argNumber("beginChild", "width", width, 0),
            argNumber("beginChild", "height", height, 0),
            Boolean(borders),
            argFlags("beginChild", flags)
        ));
    };
    api.endChild = function () { bridge.endChild(); };

    api.getWindowPos = function () { return bridge.getWindowPos(); };
    api.getWindowSize = function () { return bridge.getWindowSize(); };
    api.getContentRegionAvail = function () { return bridge.getContentRegionAvail(); };
    api.getCursorPos = function () { return bridge.getCursorPos(); };
    api.setCursorPos = function (x, y) {
        bridge.setCursorPos(argNumber("setCursorPos", "x", x), argNumber("setCursorPos", "y", y));
    };

    api.text = function (value) { bridge.text(String(value)); };
    api.textWrapped = function (value) { bridge.textWrapped(String(value)); };
    // textColored(color, text) or textColored(red, green, blue, alpha, text).
    api.textColored = function (red, green, blue, alpha, value) {
        var color;
        var text;
        if (isComponentColor(red, green, blue)) {
            color = componentColor("textColored", red, green, blue, alpha);
            text = value;
        } else {
            color = color4(red, null, "textColored", "color");
            text = green;
        }
        bridge.textColored(color[0], color[1], color[2], color[3], String(text));
    };

    api.button = function (label, width, height) {
        return Boolean(bridge.button(
            String(label),
            argNumber("button", "width", width, 0),
            argNumber("button", "height", height, 0)
        ));
    };
    api.smallButton = function (label) { return Boolean(bridge.smallButton(String(label))); };
    api.checkbox = function (label, value) {
        return withBoolRef("checkbox", "value", value, function (nativeRef) {
            return Boolean(bridge.checkbox(String(label), nativeRef));
        });
    };
    api.radioButton = function (label, value, buttonValue) {
        var resolvedButtonValue = argInt("radioButton", "buttonValue", buttonValue);
        return withIntRef("radioButton", "value", value, function (nativeRef) {
            return Boolean(bridge.radioButton(String(label), nativeRef, resolvedButtonValue));
        });
    };
    api.sliderFloat = function (label, value, min, max, format, flags) {
        var resolvedMin = argNumber("sliderFloat", "min", min, 0);
        var resolvedMax = argNumber("sliderFloat", "max", max, 1);
        var resolvedFlags = argFlags("sliderFloat", flags);
        return withFloatRef("sliderFloat", "value", value, function (nativeRef) {
            return Boolean(bridge.sliderFloat(
                String(label), nativeRef, resolvedMin, resolvedMax,
                String(format || "%.3f"), resolvedFlags
            ));
        });
    };
    api.sliderInt = function (label, value, min, max, format, flags) {
        var resolvedMin = argInt("sliderInt", "min", min, 0);
        var resolvedMax = argInt("sliderInt", "max", max, 100);
        var resolvedFlags = argFlags("sliderInt", flags);
        return withIntRef("sliderInt", "value", value, function (nativeRef) {
            return Boolean(bridge.sliderInt(
                String(label), nativeRef, resolvedMin, resolvedMax,
                String(format || "%d"), resolvedFlags
            ));
        });
    };
    api.dragFloat = function (label, value, speed, min, max, format, flags) {
        var resolvedSpeed = argNumber("dragFloat", "speed", speed, 1);
        var resolvedMin = argNumber("dragFloat", "min", min, 0);
        var resolvedMax = argNumber("dragFloat", "max", max, 0);
        var resolvedFlags = argFlags("dragFloat", flags);
        return withFloatRef("dragFloat", "value", value, function (nativeRef) {
            return Boolean(bridge.dragFloat(
                String(label), nativeRef, resolvedSpeed, resolvedMin, resolvedMax,
                String(format || "%.3f"), resolvedFlags
            ));
        });
    };
    api.dragInt = function (label, value, speed, min, max, format, flags) {
        var resolvedSpeed = argNumber("dragInt", "speed", speed, 1);
        var resolvedMin = argInt("dragInt", "min", min, 0);
        var resolvedMax = argInt("dragInt", "max", max, 0);
        var resolvedFlags = argFlags("dragInt", flags);
        return withIntRef("dragInt", "value", value, function (nativeRef) {
            return Boolean(bridge.dragInt(
                String(label), nativeRef, resolvedSpeed, resolvedMin, resolvedMax,
                String(format || "%d"), resolvedFlags
            ));
        });
    };
    api.inputText = function (label, value, maxLength, flags) {
        var capacity = inputTextCapacity("inputText", maxLength, 256);
        var resolvedFlags = argFlags("inputText", flags);
        return withStringRef("inputText", "value", value, function (nativeRef) {
            return Boolean(bridge.inputText(String(label), nativeRef, capacity, resolvedFlags));
        });
    };
    api.colorEdit3 = function (label, value, flags) {
        var resolvedFlags = argFlags("colorEdit3", flags);
        return withFloatArrayRef("colorEdit3", "value", value, 3, function (nativeRef) {
            return Boolean(bridge.colorEdit3(String(label), nativeRef, resolvedFlags));
        });
    };
    api.colorEdit4 = function (label, value, flags) {
        var resolvedFlags = argFlags("colorEdit4", flags);
        return withFloatArrayRef("colorEdit4", "value", value, 4, function (nativeRef) {
            return Boolean(bridge.colorEdit4(String(label), nativeRef, resolvedFlags));
        });
    };
    api.progressBar = function (fraction, width, height, overlay) {
        bridge.progressBar(
            argNumber("progressBar", "fraction", fraction),
            argNumber("progressBar", "width", width, -1),
            argNumber("progressBar", "height", height, 0),
            overlay == null ? null : String(overlay)
        );
    };
    api.combo = function (label, currentItem, items, popupHeight) {
        var nativeItems = selectionItems(items, "combo");
        var resolvedPopupHeight = argInt("combo", "popupHeight", popupHeight, -1);
        return withIntRef("combo", "currentItem", currentItem, function (nativeRef) {
            return Boolean(bridge.combo(String(label), nativeRef, nativeItems, resolvedPopupHeight));
        });
    };
    api.selectable = function (label, selected, flags, width, height) {
        return Boolean(bridge.selectable(
            String(label), Boolean(selected), argFlags("selectable", flags),
            argNumber("selectable", "width", width, 0),
            argNumber("selectable", "height", height, 0)
        ));
    };
    api.collapsingHeader = function (label, flags) {
        return Boolean(bridge.collapsingHeader(String(label), argFlags("collapsingHeader", flags)));
    };
    api.treeNode = function (label) { return Boolean(bridge.treeNode(String(label))); };
    api.treePop = function () { bridge.treePop(); };
    api.beginTabBar = function (id, flags) {
        return Boolean(bridge.beginTabBar(String(id), argFlags("beginTabBar", flags)));
    };
    api.endTabBar = function () { bridge.endTabBar(); };
    api.beginTabItem = function (label, open, flags) {
        var resolvedFlags = argFlags("beginTabItem", flags);
        return withOptionalBoolRef("beginTabItem", "open", open, function (nativeRef) {
            return Boolean(bridge.beginTabItem(String(label), nativeRef, resolvedFlags));
        });
    };
    api.endTabItem = function () { bridge.endTabItem(); };

    api.sameLine = function (offsetFromStartX, spacing) {
        bridge.sameLine(
            argNumber("sameLine", "offsetFromStartX", offsetFromStartX, 0),
            argNumber("sameLine", "spacing", spacing, -1)
        );
    };
    api.separator = function () { bridge.separator(); };
    api.spacing = function () { bridge.spacing(); };
    api.newLine = function () { bridge.newLine(); };
    api.dummy = function (width, height) {
        bridge.dummy(argNumber("dummy", "width", width), argNumber("dummy", "height", height));
    };
    api.setNextItemWidth = function (width) {
        bridge.setNextItemWidth(argNumber("setNextItemWidth", "width", width));
    };
    api.pushItemWidth = function (width) {
        bridge.pushItemWidth(argNumber("pushItemWidth", "width", width));
    };
    api.popItemWidth = function () { bridge.popItemWidth(); };
    api.isItemClicked = function (mouseButtonValue) {
        return Boolean(bridge.isItemClicked(mouseButton("isItemClicked", mouseButtonValue)));
    };
    api.isItemHovered = function (flags) {
        return Boolean(bridge.isItemHovered(argFlags("isItemHovered", flags)));
    };
    api.wantCaptureMouse = function () { return Boolean(bridge.wantCaptureMouse()); };
    api.isAnyItemHovered = function () { return Boolean(bridge.isAnyItemHovered()); };
    api.isAnyItemActive = function () { return Boolean(bridge.isAnyItemActive()); };
    api.styleColorsDark = function () { bridge.styleColorsDark(); };
    api.styleColorsLight = function () { bridge.styleColorsLight(); };
    api.styleColorsClassic = function () { bridge.styleColorsClassic(); };
    api.showDemoWindow = function (open) {
        return withOptionalBoolRef("showDemoWindow", "open", open, function (nativeRef) {
            bridge.showDemoWindow(nativeRef);
        });
    };
    // The debug and information windows of Dear ImGui (R3.1). As with showDemoWindow, each call draws the window; an
    // open reference adds a close button that sets it to false, so call them while it is true.
    function showToolWindow(fn, tool, open) {
        withOptionalBoolRef(fn, "open", open, function (nativeRef) {
            bridge.showToolWindow(tool, nativeRef);
        });
    }
    api.showMetricsWindow = function (open) { showToolWindow("showMetricsWindow", 0, open); };
    api.showDebugLogWindow = function (open) { showToolWindow("showDebugLogWindow", 1, open); };
    api.showIdStackToolWindow = function (open) { showToolWindow("showIdStackToolWindow", 2, open); };
    api.showStyleEditor = function (open) { showToolWindow("showStyleEditor", 3, open); };
    api.showAboutWindow = function (open) { showToolWindow("showAboutWindow", 4, open); };
    api.showUserGuide = function (open) { showToolWindow("showUserGuide", 5, open); };

    api.separatorText = function (label) { bridge.separatorText(String(label)); };
    api.bullet = function () { bridge.bullet(); };
    api.bulletText = function (text) { bridge.bulletText(String(text)); };
    api.labelText = function (label, text) { bridge.labelText(String(label), String(text)); };
    api.textDisabled = function (text) { bridge.textDisabled(String(text)); };
    api.arrowButton = function (id, direction) {
        return Boolean(bridge.arrowButton(
            String(id),
            argInt("arrowButton", "direction", direction, api.Dir.Down, api.Dir.Left, api.Dir.Down)
        ));
    };
    api.invisibleButton = function (id, width, height, flags) {
        return Boolean(bridge.invisibleButton(
            String(id),
            argNumber("invisibleButton", "width", width, undefined, 1),
            argNumber("invisibleButton", "height", height, undefined, 1),
            argFlags("invisibleButton", flags)
        ));
    };
    api.inputInt = function (label, value, step, stepFast, flags) {
        var resolvedStep = argInt("inputInt", "step", step, 1);
        var resolvedStepFast = argInt("inputInt", "stepFast", stepFast, 100);
        var resolvedFlags = argFlags("inputInt", flags);
        return withIntRef("inputInt", "value", value, function (nativeRef) {
            return Boolean(bridge.inputInt(
                String(label), nativeRef, resolvedStep, resolvedStepFast, resolvedFlags
            ));
        });
    };
    api.inputFloat = function (label, value, step, stepFast, format, flags) {
        var resolvedStep = argNumber("inputFloat", "step", step, 0);
        var resolvedStepFast = argNumber("inputFloat", "stepFast", stepFast, 0);
        var resolvedFlags = argFlags("inputFloat", flags);
        return withFloatRef("inputFloat", "value", value, function (nativeRef) {
            return Boolean(bridge.inputFloat(
                String(label), nativeRef, resolvedStep, resolvedStepFast,
                String(format || "%.3f"), resolvedFlags
            ));
        });
    };
    api.inputTextMultiline = function (label, value, maxLength, width, height, flags) {
        var capacity = inputTextCapacity("inputTextMultiline", maxLength, 4096);
        var resolvedWidth = argNumber("inputTextMultiline", "width", width, 0);
        var resolvedHeight = argNumber("inputTextMultiline", "height", height, 0);
        var resolvedFlags = argFlags("inputTextMultiline", flags);
        return withStringRef("inputTextMultiline", "value", value, function (nativeRef) {
            return Boolean(bridge.inputTextMultiline(
                String(label), nativeRef, capacity, resolvedWidth, resolvedHeight, resolvedFlags
            ));
        });
    };
    api.beginListBox = function (label, width, height) {
        return Boolean(bridge.beginListBox(
            String(label),
            argNumber("beginListBox", "width", width, 0),
            argNumber("beginListBox", "height", height, 0)
        ));
    };
    api.endListBox = function () { bridge.endListBox(); };
    api.listBox = function (label, currentItem, items, heightInItems) {
        var nativeItems = selectionItems(items, "listBox");
        var resolvedHeight = argInt("listBox", "heightInItems", heightInItems, -1);
        return withIntRef("listBox", "currentItem", currentItem, function (nativeRef) {
            return Boolean(bridge.listBox(String(label), nativeRef, nativeItems, resolvedHeight));
        });
    };
    api.colorPicker3 = function (label, value, flags) {
        var resolvedFlags = argFlags("colorPicker3", flags);
        return withFloatArrayRef("colorPicker3", "value", value, 3, function (nativeRef) {
            return Boolean(bridge.colorPicker3(String(label), nativeRef, resolvedFlags));
        });
    };
    api.colorPicker4 = function (label, value, flags) {
        var resolvedFlags = argFlags("colorPicker4", flags);
        return withFloatArrayRef("colorPicker4", "value", value, 4, function (nativeRef) {
            return Boolean(bridge.colorPicker4(String(label), nativeRef, resolvedFlags));
        });
    };
    // colorButton(id, color, flags | {flags, width, height}, width, height) or
    // colorButton(id, red, green, blue, alpha, flags, width, height).
    api.colorButton = function (id, red, green, blue, alpha, flags, width, height) {
        var color;
        var options;
        if (isComponentColor(red, green, blue)) {
            color = componentColor("colorButton", red, green, blue, alpha);
            options = {flags: flags, width: width, height: height};
        } else {
            color = color4(red, null, "colorButton", "color");
            options = green != null && typeof green === "object"
                ? green
                : {flags: green, width: blue, height: alpha};
        }
        return Boolean(bridge.colorButton(
            String(id), color[0], color[1], color[2], color[3],
            argFlags("colorButton", options.flags),
            argNumber("colorButton", "width", options.width, 0),
            argNumber("colorButton", "height", options.height, 0)
        ));
    };
    // valuesOffset is the documented name, offset the name 1.10.0 and earlier read; stride counts values (2 = every other value).
    function plotValuesOffset(fn, options) {
        return options.valuesOffset != null
            ? argInt(fn, "options.valuesOffset", options.valuesOffset, undefined, 0)
            : argInt(fn, "options.offset", options.offset, 0, 0);
    }

    function plotStride(fn, options) {
        return argInt(fn, "options.stride", options.stride, 1, 1);
    }

    function plotValues(fn, values) {
        return FLOAT_ARRAY_CLASS.isInstance(values) ? values : floatArray(numberList(fn, "values", values));
    }

    // The bridge calls stay literal so that verifyImGuiSource sees every wrapped connection method.
    function plotArguments(fn, label, values, options) {
        options = options || {};
        return [
            String(label),
            plotValues(fn, values),
            plotValuesOffset(fn, options),
            plotStride(fn, options),
            options.overlay == null ? null : String(options.overlay),
            argNumber(fn, "options.scaleMin", options.scaleMin, NaN),
            argNumber(fn, "options.scaleMax", options.scaleMax, NaN),
            argNumber(fn, "options.width", options.width, 0),
            argNumber(fn, "options.height", options.height, 0)
        ];
    }

    api.plotLines = function (label, values, options) {
        var a = plotArguments("plotLines", label, values, options);
        bridge.plotLines(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
    };
    api.plotHistogram = function (label, values, options) {
        var a = plotArguments("plotHistogram", label, values, options);
        bridge.plotHistogram(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
    };
    api.treeNodeEx = function (label, flags) {
        return Boolean(bridge.treeNodeEx(String(label), argFlags("treeNodeEx", flags)));
    };
    api.vSliderFloat = function (label, width, height, value, min, max, format, flags) {
        var resolvedWidth = argNumber("vSliderFloat", "width", width, 24);
        var resolvedHeight = argNumber("vSliderFloat", "height", height, 120);
        var resolvedMin = argNumber("vSliderFloat", "min", min, 0);
        var resolvedMax = argNumber("vSliderFloat", "max", max, 1);
        var resolvedFlags = argFlags("vSliderFloat", flags);
        return withFloatRef("vSliderFloat", "value", value, function (nativeRef) {
            return Boolean(bridge.vSliderFloat(
                String(label), resolvedWidth, resolvedHeight, nativeRef,
                resolvedMin, resolvedMax, String(format || "%.3f"), resolvedFlags
            ));
        });
    };
    api.vSliderInt = function (label, width, height, value, min, max, format, flags) {
        var resolvedWidth = argNumber("vSliderInt", "width", width, 24);
        var resolvedHeight = argNumber("vSliderInt", "height", height, 120);
        var resolvedMin = argInt("vSliderInt", "min", min, 0);
        var resolvedMax = argInt("vSliderInt", "max", max, 100);
        var resolvedFlags = argFlags("vSliderInt", flags);
        return withIntRef("vSliderInt", "value", value, function (nativeRef) {
            return Boolean(bridge.vSliderInt(
                String(label), resolvedWidth, resolvedHeight, nativeRef,
                resolvedMin, resolvedMax, String(format || "%d"), resolvedFlags
            ));
        });
    };

    // Multi-component widgets (R3.4): value is imgui.floats([...]) / imgui.ints([...]) or {value: [...]} with at least
    // as many numbers as the widget has components; the other arguments are those of the one-component form, without
    // the steps for inputFloat2 .. 4 / inputInt2 .. 4, as in Dear ImGui. min equal to max means no limit for the drags.
    function dragFloatN(fn, components, label, value, speed, min, max, format, flags) {
        var resolvedSpeed = argNumber(fn, "speed", speed, 1);
        var resolvedMin = argNumber(fn, "min", min, 0);
        var resolvedMax = argNumber(fn, "max", max, 0);
        var resolvedFlags = argFlags(fn, flags);
        return withFloatArrayRef(fn, "value", value, components, function (nativeRef) {
            return Boolean(bridge.dragFloatN(
                String(label), nativeRef, components, resolvedSpeed, resolvedMin, resolvedMax,
                String(format || "%.3f"), resolvedFlags
            ));
        });
    }

    function dragIntN(fn, components, label, value, speed, min, max, format, flags) {
        var resolvedSpeed = argNumber(fn, "speed", speed, 1);
        var resolvedMin = argInt(fn, "min", min, 0);
        var resolvedMax = argInt(fn, "max", max, 0);
        var resolvedFlags = argFlags(fn, flags);
        return withIntArrayRef(fn, "value", value, components, function (nativeRef) {
            return Boolean(bridge.dragIntN(
                String(label), nativeRef, components, resolvedSpeed, resolvedMin, resolvedMax,
                String(format || "%d"), resolvedFlags
            ));
        });
    }

    function sliderFloatN(fn, components, label, value, min, max, format, flags) {
        var resolvedMin = argNumber(fn, "min", min, 0);
        var resolvedMax = argNumber(fn, "max", max, 1);
        var resolvedFlags = argFlags(fn, flags);
        return withFloatArrayRef(fn, "value", value, components, function (nativeRef) {
            return Boolean(bridge.sliderFloatN(
                String(label), nativeRef, components, resolvedMin, resolvedMax,
                String(format || "%.3f"), resolvedFlags
            ));
        });
    }

    function sliderIntN(fn, components, label, value, min, max, format, flags) {
        var resolvedMin = argInt(fn, "min", min, 0);
        var resolvedMax = argInt(fn, "max", max, 100);
        var resolvedFlags = argFlags(fn, flags);
        return withIntArrayRef(fn, "value", value, components, function (nativeRef) {
            return Boolean(bridge.sliderIntN(
                String(label), nativeRef, components, resolvedMin, resolvedMax,
                String(format || "%d"), resolvedFlags
            ));
        });
    }

    function inputFloatN(fn, components, label, value, format, flags) {
        var resolvedFlags = argFlags(fn, flags);
        return withFloatArrayRef(fn, "value", value, components, function (nativeRef) {
            return Boolean(bridge.inputFloatN(
                String(label), nativeRef, components, String(format || "%.3f"), resolvedFlags
            ));
        });
    }

    function inputIntN(fn, components, label, value, flags) {
        var resolvedFlags = argFlags(fn, flags);
        return withIntArrayRef(fn, "value", value, components, function (nativeRef) {
            return Boolean(bridge.inputIntN(String(label), nativeRef, components, resolvedFlags));
        });
    }

    api.dragFloat2 = function (label, value, speed, min, max, format, flags) {
        return dragFloatN("dragFloat2", 2, label, value, speed, min, max, format, flags);
    };
    api.dragFloat3 = function (label, value, speed, min, max, format, flags) {
        return dragFloatN("dragFloat3", 3, label, value, speed, min, max, format, flags);
    };
    api.dragFloat4 = function (label, value, speed, min, max, format, flags) {
        return dragFloatN("dragFloat4", 4, label, value, speed, min, max, format, flags);
    };
    api.dragInt2 = function (label, value, speed, min, max, format, flags) {
        return dragIntN("dragInt2", 2, label, value, speed, min, max, format, flags);
    };
    api.dragInt3 = function (label, value, speed, min, max, format, flags) {
        return dragIntN("dragInt3", 3, label, value, speed, min, max, format, flags);
    };
    api.dragInt4 = function (label, value, speed, min, max, format, flags) {
        return dragIntN("dragInt4", 4, label, value, speed, min, max, format, flags);
    };
    api.sliderFloat2 = function (label, value, min, max, format, flags) {
        return sliderFloatN("sliderFloat2", 2, label, value, min, max, format, flags);
    };
    api.sliderFloat3 = function (label, value, min, max, format, flags) {
        return sliderFloatN("sliderFloat3", 3, label, value, min, max, format, flags);
    };
    api.sliderFloat4 = function (label, value, min, max, format, flags) {
        return sliderFloatN("sliderFloat4", 4, label, value, min, max, format, flags);
    };
    api.sliderInt2 = function (label, value, min, max, format, flags) {
        return sliderIntN("sliderInt2", 2, label, value, min, max, format, flags);
    };
    api.sliderInt3 = function (label, value, min, max, format, flags) {
        return sliderIntN("sliderInt3", 3, label, value, min, max, format, flags);
    };
    api.sliderInt4 = function (label, value, min, max, format, flags) {
        return sliderIntN("sliderInt4", 4, label, value, min, max, format, flags);
    };
    api.inputFloat2 = function (label, value, format, flags) {
        return inputFloatN("inputFloat2", 2, label, value, format, flags);
    };
    api.inputFloat3 = function (label, value, format, flags) {
        return inputFloatN("inputFloat3", 3, label, value, format, flags);
    };
    api.inputFloat4 = function (label, value, format, flags) {
        return inputFloatN("inputFloat4", 4, label, value, format, flags);
    };
    api.inputInt2 = function (label, value, flags) {
        return inputIntN("inputInt2", 2, label, value, flags);
    };
    api.inputInt3 = function (label, value, flags) {
        return inputIntN("inputInt3", 3, label, value, flags);
    };
    api.inputInt4 = function (label, value, flags) {
        return inputIntN("inputInt4", 4, label, value, flags);
    };
    // dragFloatRange2 / dragIntRange2: two mutable values, the lower and the upper end, as in Dear ImGui; formatMax
    // (the upper end's format) defaults to format.
    api.dragFloatRange2 = function (label, currentMin, currentMax, speed, min, max, format, formatMax, flags) {
        var resolvedSpeed = argNumber("dragFloatRange2", "speed", speed, 1);
        var resolvedMin = argNumber("dragFloatRange2", "min", min, 0);
        var resolvedMax = argNumber("dragFloatRange2", "max", max, 0);
        var resolvedFlags = argFlags("dragFloatRange2", flags);
        return withFloatRef("dragFloatRange2", "currentMin", currentMin, function (minRef) {
            return withFloatRef("dragFloatRange2", "currentMax", currentMax, function (maxRef) {
                return Boolean(bridge.dragFloatRange2(
                    String(label), minRef, maxRef, resolvedSpeed, resolvedMin, resolvedMax,
                    String(format || "%.3f"), formatMax == null ? null : String(formatMax), resolvedFlags
                ));
            });
        });
    };
    api.dragIntRange2 = function (label, currentMin, currentMax, speed, min, max, format, formatMax, flags) {
        var resolvedSpeed = argNumber("dragIntRange2", "speed", speed, 1);
        var resolvedMin = argInt("dragIntRange2", "min", min, 0);
        var resolvedMax = argInt("dragIntRange2", "max", max, 0);
        var resolvedFlags = argFlags("dragIntRange2", flags);
        return withIntRef("dragIntRange2", "currentMin", currentMin, function (minRef) {
            return withIntRef("dragIntRange2", "currentMax", currentMax, function (maxRef) {
                return Boolean(bridge.dragIntRange2(
                    String(label), minRef, maxRef, resolvedSpeed, resolvedMin, resolvedMax,
                    String(format || "%d"), formatMax == null ? null : String(formatMax), resolvedFlags
                ));
            });
        });
    };
    // sliderAngle: value in radians, the range and the shown value in degrees.
    api.sliderAngle = function (label, value, degreesMin, degreesMax, format, flags) {
        var resolvedDegreesMin = argNumber("sliderAngle", "degreesMin", degreesMin, -360);
        var resolvedDegreesMax = argNumber("sliderAngle", "degreesMax", degreesMax, 360);
        var resolvedFlags = argFlags("sliderAngle", flags);
        return withFloatRef("sliderAngle", "value", value, function (nativeRef) {
            return Boolean(bridge.sliderAngle(
                String(label), nativeRef, resolvedDegreesMin, resolvedDegreesMax,
                String(format || "%.0f deg"), resolvedFlags
            ));
        });
    };

    api.toggle = function (label, value) {
        return withBoolRef("toggle", "value", value, function (nativeRef) {
            return Boolean(bridge.toggle(String(label), nativeRef));
        });
    };
    api.toggleSwitch = api.toggle;
    api.beginCombo = function (label, preview, flags) {
        return Boolean(bridge.beginCombo(
            String(label), String(preview == null ? "" : preview), argFlags("beginCombo", flags)
        ));
    };
    api.endCombo = function () { bridge.endCombo(); };

    // listClipper(itemCount, [options], callback) (R2.1): submits only the visible rows of a long list.
    // callback(start, end) runs once per range to draw rows start <= i < end; options.itemHeight (px) skips
    // measuring the first row, options.includeItems keeps those rows submitted (indices outside the list are
    // ignored). The clipper always ends, even when the callback throws.
    api.listClipper = function (itemCount, options, callback) {
        if (callback === undefined && typeof options === "function") {
            callback = options;
            options = null;
        }
        var count = argInt("listClipper", "itemCount", itemCount, undefined, 0);
        argFunction("listClipper", "callback", callback);
        if (options != null && typeof options !== "object") {
            throw new TypeError(argumentLabel("listClipper", "options") + " must be an object");
        }
        options = options || {};
        var itemHeight = -1;
        if (options.itemHeight != null) {
            itemHeight = argNumber("listClipper", "options.itemHeight", options.itemHeight);
            if (!(itemHeight > 0)) {
                throw new RangeError(
                    argumentLabel("listClipper", "options.itemHeight") + " must be > 0, got " + itemHeight
                );
            }
        }
        var includeItems = null;
        if (options.includeItems != null) {
            var indices = options.includeItems;
            if (isStringLike(indices) || typeof indices.length !== "number") {
                throw new TypeError(argumentLabel("listClipper", "options.includeItems") + " must be an array");
            }
            var kept = [];
            for (var i = 0; i < indices.length; i += 1) {
                var index = argInt("listClipper", "options.includeItems[" + i + "]", indices[i]);
                if (index >= 0 && index < count) {
                    kept.push(index);
                }
            }
            includeItems = javaArray(IntegerType, kept);
        }
        bridge.listClipperBegin(count, itemHeight, includeItems);
        try {
            var range;
            while ((range = bridge.listClipperStep()) != null) {
                callback(Number(range[0]), Number(range[1]));
            }
        } finally {
            bridge.listClipperEnd();
        }
    };

    api.openPopup = function (id, flags) { bridge.openPopup(String(id), argFlags("openPopup", flags)); };
    api.beginPopup = function (id, flags) {
        return Boolean(bridge.beginPopup(String(id), argFlags("beginPopup", flags)));
    };
    api.beginPopupModal = function (name, open, flags) {
        var resolvedFlags = argFlags("beginPopupModal", flags);
        return withOptionalBoolRef("beginPopupModal", "open", open, function (nativeRef) {
            return Boolean(bridge.beginPopupModal(String(name), nativeRef, resolvedFlags));
        });
    };
    api.beginPopupContextItem = function (id, flags) {
        return Boolean(bridge.beginPopupContextItem(
            id == null ? null : String(id), argFlags("beginPopupContextItem", flags)
        ));
    };
    api.beginPopupContextWindow = function (id, flags) {
        return Boolean(bridge.beginPopupContextWindow(
            id == null ? null : String(id), argFlags("beginPopupContextWindow", flags)
        ));
    };
    api.endPopup = function () { bridge.endPopup(); };
    api.closeCurrentPopup = function () { bridge.closeCurrentPopup(); };
    api.isPopupOpen = function (id, flags) {
        return Boolean(bridge.isPopupOpen(String(id), argFlags("isPopupOpen", flags)));
    };
    api.beginMenuBar = function () { return Boolean(bridge.beginMenuBar()); };
    api.endMenuBar = function () { bridge.endMenuBar(); };
    api.beginMenu = function (label, enabled) {
        return Boolean(bridge.beginMenu(String(label), enabled !== false));
    };
    api.endMenu = function () { bridge.endMenu(); };
    // selected: a reference toggled by the item, or a plain boolean that only draws the check mark.
    api.menuItem = function (label, shortcut, selected, enabled) {
        if (isBooleanLike(selected)) {
            selected = boolRef(selected);
        }
        return withOptionalBoolRef("menuItem", "selected", selected, function (nativeRef) {
            return Boolean(bridge.menuItem(
                String(label),
                shortcut == null ? null : String(shortcut),
                nativeRef,
                enabled !== false
            ));
        });
    };
    api.setTooltip = function (text) { bridge.setTooltip(String(text)); };
    api.setItemTooltip = function (text) { bridge.setItemTooltip(String(text)); };
    api.beginTooltip = function () { return Boolean(bridge.beginTooltip()); };
    api.beginItemTooltip = function () { return Boolean(bridge.beginItemTooltip()); };
    api.endTooltip = function () { bridge.endTooltip(); };

    api.beginTable = function (id, columns, flags, outerWidth, outerHeight) {
        return Boolean(bridge.beginTable(
            String(id),
            argInt("beginTable", "columns", columns, undefined, 1, TABLE_MAX_COLUMNS),
            argFlags("beginTable", flags),
            argNumber("beginTable", "outerWidth", outerWidth, 0),
            argNumber("beginTable", "outerHeight", outerHeight, 0)
        ));
    };
    api.endTable = function () { bridge.endTable(); };
    api.tableNextRow = function (rowFlags, minRowHeight) {
        bridge.tableNextRow(
            argInt("tableNextRow", "rowFlags", rowFlags, 0),
            argNumber("tableNextRow", "minRowHeight", minRowHeight, 0)
        );
    };
    api.tableNextColumn = function () { return Boolean(bridge.tableNextColumn()); };
    api.tableSetColumnIndex = function (columnIndex) {
        return Boolean(bridge.tableSetColumnIndex(
            argInt("tableSetColumnIndex", "columnIndex", columnIndex, undefined, 0, TABLE_MAX_COLUMNS - 1)
        ));
    };
    api.tableSetupColumn = function (label, flags, initWidthOrWeight, userId) {
        bridge.tableSetupColumn(
            String(label),
            argFlags("tableSetupColumn", flags),
            argNumber("tableSetupColumn", "initWidthOrWeight", initWidthOrWeight, 0),
            argInt("tableSetupColumn", "userId", userId, 0, 0)
        );
    };
    // tableGetSortSpecs() (R3.3): null when the current table is not sortable, otherwise {specsDirty, specs}. Sort the
    // rows when specsDirty is true; reading the specs clears it, so it is true once per change.
    api.tableGetSortSpecs = function () {
        var raw = bridge.tableGetSortSpecs();
        if (raw == null) {
            return null;
        }
        var specs = [];
        for (var index = 0; index < Number(raw[1]); index += 1) {
            var base = 2 + index * 4;
            specs.push({
                columnIndex: Number(raw[base]),
                columnUserId: Number(raw[base + 1]),
                sortDirection: Number(raw[base + 2]),
                sortOrder: Number(raw[base + 3])
            });
        }
        return {specsDirty: Number(raw[0]) !== 0, specs: specs};
    };
    api.tableSetupScrollFreeze = function (columns, rows) {
        bridge.tableSetupScrollFreeze(
            argInt("tableSetupScrollFreeze", "columns", columns, 0, 0, TABLE_MAX_COLUMNS),
            argInt("tableSetupScrollFreeze", "rows", rows, 0, 0, 128)
        );
    };
    api.tableHeadersRow = function () { bridge.tableHeadersRow(); };
    // tableSetBgColor(target, color, columnIndex) or tableSetBgColor(target, red, green, blue, alpha, columnIndex).
    api.tableSetBgColor = function (target, red, green, blue, alpha, columnIndex) {
        var resolvedTarget = argInt(
            "tableSetBgColor", "target", target, undefined,
            api.TableBgTarget.RowBg0, api.TableBgTarget.CellBg
        );
        var color;
        if (isComponentColor(red, green, blue)) {
            color = componentColor("tableSetBgColor", red, green, blue, alpha);
        } else {
            color = color4(red, null, "tableSetBgColor", "color");
            columnIndex = green;
        }
        bridge.tableSetBgColor(
            resolvedTarget, color[0], color[1], color[2], color[3],
            argInt("tableSetBgColor", "columnIndex", columnIndex, -1, -1, TABLE_MAX_COLUMNS - 1)
        );
    };

    // pushStyleColor(index, color) or pushStyleColor(index, red, green, blue, alpha); index is an
    // imgui.Col value or name.
    api.pushStyleColor = function (index, red, green, blue, alpha) {
        var colorIndex = resolveColorIndex("pushStyleColor", index);
        var color = isComponentColor(red, green, blue)
            ? componentColor("pushStyleColor", red, green, blue, alpha)
            : color4(red, null, "pushStyleColor", "color");
        bridge.pushStyleColor(colorIndex, color[0], color[1], color[2], color[3]);
    };
    api.popStyleColor = function (count) {
        bridge.popStyleColor(argInt("popStyleColor", "count", count, 1, 0));
    };
    // setStyleColor(index, color) or setStyleColor(index, red, green, blue, alpha).
    api.setStyleColor = function (index, red, green, blue, alpha) {
        var colorIndex = resolveColorIndex("setStyleColor", index);
        var color = isComponentColor(red, green, blue)
            ? componentColor("setStyleColor", red, green, blue, alpha)
            : color4(red, null, "setStyleColor", "color");
        bridge.setStyleColor(colorIndex, color[0], color[1], color[2], color[3]);
        return api;
    };
    api.setStyleProperties = function (properties) {
        if (properties == null || typeof properties !== "object") {
            throw new TypeError(argumentLabel("setStyleProperties", "properties") + " must be an object");
        }
        for (var propertyName in properties) {
            if (!properties.hasOwnProperty(propertyName)) {
                continue;
            }
            if (normalizedKey(propertyName) === "colors") {
                var colorProperties = properties[propertyName];
                if (colorProperties == null || typeof colorProperties !== "object") {
                    throw new TypeError(
                        argumentLabel("setStyleProperties", propertyName) + " must be an object"
                    );
                }
                for (var styleColorName in colorProperties) {
                    if (colorProperties.hasOwnProperty(styleColorName)) {
                        var styleColorIndex = COLOR_NAME_TO_INDEX[normalizedKey(styleColorName)];
                        if (styleColorIndex == null) {
                            throw new RangeError(
                                argumentLabel("setStyleProperties", propertyName + "." + styleColorName) +
                                " is an unknown style color. Use a name from imgui.Col"
                            );
                        }
                        var styleColor = color4(
                            colorProperties[styleColorName], null,
                            "setStyleProperties", propertyName + "." + styleColorName
                        );
                        bridge.setStyleColor(
                            styleColorIndex, styleColor[0], styleColor[1], styleColor[2], styleColor[3]
                        );
                    }
                }
                continue;
            }

            var info = STYLE_PROPERTY_INFO[normalizedKey(propertyName)];
            if (!info) {
                throw new RangeError(
                    argumentLabel("setStyleProperties", propertyName) +
                    " is an unknown style property. Use a name from imgui.StyleVar or the colors property"
                );
            }
            var value = properties[propertyName];
            var x;
            var y;
            if (info.vector) {
                if (isNumberLike(value)) {
                    x = argNumber("setStyleProperties", propertyName, value);
                    y = x;
                } else {
                    var vector = point(value, "setStyleProperties", propertyName);
                    x = vector[0];
                    y = vector[1];
                }
            } else {
                x = argNumber("setStyleProperties", propertyName, value);
                y = 0;
            }
            var scale = info.scaled ? clamp(api._density, 0.5, 4) : 1;
            bridge.setStyleVar(info.index, x * scale, y * scale);
        }
        return api;
    };
    api.setTheme = function (name) {
        var resolvedName = resolveThemeName(name == null ? api.Themes.Dark : name, "setTheme", "name");
        var definition = THEME_DEFINITIONS[resolvedName];
        bridge.resetStyle(definition.preset);
        if (definition.accent) {
            applyThemePalette(definition);
        }
        if (definition.style) {
            api.setStyleProperties(definition.style);
        }
        api._theme = resolvedName;
        return resolvedName;
    };
    // index is an imgui.StyleVar value or name; two-component variables take y or a Point as x.
    api.pushStyleVar = function (index, x, y) {
        var styleIndex = resolveStyleVarIndex("pushStyleVar", index);
        if (x != null && !isNumberLike(x)) {
            var vector = point(x, "pushStyleVar", "x");
            bridge.pushStyleVar2(styleIndex, vector[0], vector[1]);
        } else if (y == null) {
            bridge.pushStyleVar(styleIndex, argNumber("pushStyleVar", "x", x));
        } else {
            bridge.pushStyleVar2(
                styleIndex, argNumber("pushStyleVar", "x", x), argNumber("pushStyleVar", "y", y)
            );
        }
    };
    api.popStyleVar = function (count) {
        bridge.popStyleVar(argInt("popStyleVar", "count", count, 1, 0));
    };
    api.setWindowFontScale = function (scale) {
        bridge.setWindowFontScale(argNumber("setWindowFontScale", "scale", scale, undefined, 0.25, 4));
    };
    api.pushFont = function (font, fontSize) {
        var index = resolveFontIndex(font, false, "pushFont", "font");
        bridge.pushFont(
            index,
            argNumber("pushFont", "fontSize", fontSize, 0, 0)
        );
        return index;
    };
    api.popFont = function () { bridge.popFont(); };
    api.withFont = function (font, fontSize, body) {
        if (typeof fontSize === "function") {
            body = fontSize;
            fontSize = null;
        }
        api.pushFont(font, fontSize);
        try {
            if (body) {
                return body();
            }
        } finally {
            api.popFont();
        }
    };

    var TEXTURE_TOKEN = {};

    function resolveTexture(fn, texture) {
        if (texture == null || texture._textureToken !== TEXTURE_TOKEN ||
            typeof texture.isDisposed !== "function"
        ) {
            throw new TypeError(argumentLabel(fn, "texture") + " must be a texture returned by imgui.createTexture");
        }
        if (texture.isDisposed()) {
            throw new Error("imgui." + fn + ": the texture has already been disposed");
        }
        if (texture._session !== api._activeSession || texture._session.closed) {
            throw new Error("imgui." + fn + ": the texture belongs to an inactive session");
        }
        return texture;
    }

    function resolveTextureSource(source) {
        if (typeof source === "string") {
            var path = String(source);
            var absolute = /^file:/i.test(path) || /^\//.test(path) || /^[A-Za-z]:[\\/]/.test(path);
            if (!absolute && globalObject.files && typeof globalObject.files.path === "function") {
                path = String(globalObject.files.path(path));
            }
            return path;
        }
        if (Array.isArray && Array.isArray(source)) {
            return byteArray(source);
        }
        var typedBytes = typedArrayBytes(source);
        return typedBytes != null ? typedBytes : source;
    }

    // Encoded image bytes in an ArrayBuffer or a typed array view, as a Java byte[]; null for other values.
    function typedArrayBytes(source) {
        if (source == null || typeof source !== "object" || typeof ArrayBuffer === "undefined") {
            return null;
        }
        var view;
        if (source instanceof ArrayBuffer) {
            view = new Uint8Array(source);
        } else if (typeof ArrayBuffer.isView === "function" && ArrayBuffer.isView(source)) {
            view = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
        } else {
            return null;
        }
        var bytes = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, view.length);
        for (var i = 0; i < view.length; i += 1) {
            bytes[i] = view[i] > 127 ? view[i] - 256 : view[i];
        }
        return bytes;
    }

    api.createTexture = function (source, options) {
        var owner = api._activeSession;
        if (!owner || owner.closed || !owner.ready || !bridge.isOwner()) {
            throw new Error("imgui.createTexture requires a ready createWindow session");
        }
        var result = bridge.createTexture(resolveTextureSource(source), resolveTextureFlags(options, "createTexture"));
        if (result == null || result.length < 3) {
            throw new Error("Unable to create the ImGui texture");
        }
        var nativeHandle = result[0];
        var disposed = false;
        var width = Number(result[1]);
        var height = Number(result[2]);
        var texture = {
            _textureToken: TEXTURE_TOKEN,
            _nativeHandle: nativeHandle,
            _session: owner,
            handle: Number(nativeHandle),

            isDisposed: function () {
                return disposed;
            },

            // Same sources as createTexture. The same size reuses the GL storage; another size reallocates it, and
            // the handle stays the same either way, so code holding the texture keeps working.
            update: function (source) {
                resolveTexture("Texture.update", texture);
                if (!owner.ready || !bridge.isOwner()) {
                    throw new Error("imgui.Texture.update requires a ready createWindow session");
                }
                if (source == null) {
                    throw new TypeError(argumentLabel("Texture.update", "source") +
                        " must be a path, encoded bytes, a Bitmap or an AutoJs6 Image");
                }
                var updated = bridge.updateTexture(nativeHandle, resolveTextureSource(source));
                if (updated == null || updated.length < 3) {
                    throw new Error("Unable to update the ImGui texture");
                }
                width = Number(updated[1]);
                height = Number(updated[2]);
                return texture;
            },

            dispose: function () {
                if (disposed) {
                    return false;
                }
                if (api._activeSession !== owner || owner.closed || !owner.ready || !bridge.isOwner()) {
                    disposed = true;
                    return false;
                }
                var destroyed = Boolean(bridge.destroyTexture(nativeHandle));
                disposed = true;
                return destroyed;
            },

            close: function () {
                return texture.dispose();
            },

            _markDisposed: function () {
                disposed = true;
            },

            toString: function () {
                return "ImGuiTexture(" + texture.handle + ", " +
                    texture.width + "x" + texture.height +
                    (disposed ? ", disposed" : "") + ")";
            }
        };
        Object.defineProperty(texture, "width", {get: function () { return width; }, enumerable: true});
        Object.defineProperty(texture, "height", {get: function () { return height; }, enumerable: true});
        owner._textures.push(texture);
        return freeze(texture);
    };

    api.destroyTexture = function (texture) {
        if (texture == null || texture._textureToken !== TEXTURE_TOKEN ||
            typeof texture.dispose !== "function"
        ) {
            throw new TypeError(
                argumentLabel("destroyTexture", "texture") + " must be a texture returned by imgui.createTexture"
            );
        }
        return texture.dispose();
    };

    function imageParameters(fn, texture, width, height, options) {
        var widthName = "width";
        var heightName = "height";
        if (width != null && typeof width === "object") {
            options = width;
            width = options.width;
            height = options.height;
            widthName = "options.width";
            heightName = "options.height";
        }
        options = options || {};
        var resolvedWidth = width == null ? texture.width : argNumber(fn, widthName, width);
        var resolvedHeight;
        if (height == null && width != null) {
            resolvedHeight = resolvedWidth * texture.height / texture.width;
        } else {
            resolvedHeight = height == null ? texture.height : argNumber(fn, heightName, height);
        }
        if (resolvedWidth <= 0) {
            throw new RangeError(argumentLabel(fn, widthName) + " must be > 0, got " + resolvedWidth);
        }
        if (resolvedHeight <= 0) {
            throw new RangeError(argumentLabel(fn, heightName) + " must be > 0, got " + resolvedHeight);
        }
        return {
            width: resolvedWidth,
            height: resolvedHeight,
            uv0: point(options.uv0 || [0, 0], fn, "options.uv0"),
            uv1: point(options.uv1 || [1, 1], fn, "options.uv1"),
            background: color4(
                options.background == null ? options.bg : options.background,
                [0, 0, 0, 0],
                fn,
                "options.background"
            ),
            tint: color4(options.tint, [1, 1, 1, 1], fn, "options.tint")
        };
    }

    api.image = function (texture, width, height, options) {
        var resolvedTexture = resolveTexture("image", texture);
        var parameters = imageParameters("image", resolvedTexture, width, height, options);
        bridge.image(
            resolvedTexture._nativeHandle,
            parameters.width,
            parameters.height,
            parameters.uv0[0],
            parameters.uv0[1],
            parameters.uv1[0],
            parameters.uv1[1],
            parameters.background[0],
            parameters.background[1],
            parameters.background[2],
            parameters.background[3],
            parameters.tint[0],
            parameters.tint[1],
            parameters.tint[2],
            parameters.tint[3]
        );
    };

    api.imageButton = function (id, texture, width, height, options) {
        var resolvedTexture = resolveTexture("imageButton", texture);
        var parameters = imageParameters("imageButton", resolvedTexture, width, height, options);
        return Boolean(bridge.imageButton(
            String(id),
            resolvedTexture._nativeHandle,
            parameters.width,
            parameters.height,
            parameters.uv0[0],
            parameters.uv0[1],
            parameters.uv1[0],
            parameters.uv1[1],
            parameters.background[0],
            parameters.background[1],
            parameters.background[2],
            parameters.background[3],
            parameters.tint[0],
            parameters.tint[1],
            parameters.tint[2],
            parameters.tint[3]
        ));
    };

    var WHITE = [1, 1, 1, 1];
    // Native drawing clamps segment counts to 0..512.
    var DRAW_MAX_SEGMENTS = 512;
    // Arcs are built point by point: the sweep is bounded (16 turns) so a stray angle cannot exhaust the memory.
    var DRAW_MAX_ARC = 32 * Math.PI;
    var DRAW_MAX_ARC_STEPS = 16 * 12;

    function polygonPoints(points, fn) {
        var flattened = flattenPoints(points, fn, "points");
        if (flattened.length < 6) {
            throw new RangeError(argumentLabel(fn, "points") + " must have at least three points");
        }
        return flattened;
    }

    function createDrawListFacade(layer) {
        var facade = {
            layer: layer,

            addLine: function (first, second, color, thickness) {
                var fn = "DrawList.addLine";
                var p1 = point(first, fn, "first");
                var p2 = point(second, fn, "second");
                bridge.drawLine(
                    layer, p1[0], p1[1], p2[0], p2[1],
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "thickness", thickness, 1, 0)
                );
                return facade;
            },

            addRect: function (minimum, maximum, color, rounding, thickness, flags) {
                var fn = "DrawList.addRect";
                var pMin = point(minimum, fn, "minimum");
                var pMax = point(maximum, fn, "maximum");
                bridge.drawRect(
                    layer, pMin[0], pMin[1], pMax[0], pMax[1],
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "rounding", rounding, 0, 0),
                    argNumber(fn, "thickness", thickness, 1, 0),
                    argFlags(fn, flags)
                );
                return facade;
            },

            addRectFilled: function (minimum, maximum, color, rounding, flags) {
                var fn = "DrawList.addRectFilled";
                var pMin = point(minimum, fn, "minimum");
                var pMax = point(maximum, fn, "maximum");
                bridge.drawRectFilled(
                    layer, pMin[0], pMin[1], pMax[0], pMax[1],
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "rounding", rounding, 0, 0),
                    argFlags(fn, flags)
                );
                return facade;
            },

            addCircle: function (center, radius, color, segments, thickness) {
                var fn = "DrawList.addCircle";
                var resolvedCenter = point(center, fn, "center");
                bridge.drawCircle(
                    layer, resolvedCenter[0], resolvedCenter[1],
                    argNumber(fn, "radius", radius, undefined, 0),
                    packColor(color, WHITE, fn, "color"),
                    argInt(fn, "segments", segments, 0, 0, DRAW_MAX_SEGMENTS),
                    argNumber(fn, "thickness", thickness, 1, 0)
                );
                return facade;
            },

            addCircleFilled: function (center, radius, color, segments) {
                var fn = "DrawList.addCircleFilled";
                var resolvedCenter = point(center, fn, "center");
                bridge.drawCircleFilled(
                    layer, resolvedCenter[0], resolvedCenter[1],
                    argNumber(fn, "radius", radius, undefined, 0),
                    packColor(color, WHITE, fn, "color"),
                    argInt(fn, "segments", segments, 0, 0, DRAW_MAX_SEGMENTS)
                );
                return facade;
            },

            addTriangle: function (first, second, third, color, thickness) {
                var fn = "DrawList.addTriangle";
                var p1 = point(first, fn, "first");
                var p2 = point(second, fn, "second");
                var p3 = point(third, fn, "third");
                bridge.drawTriangle(
                    layer, p1[0], p1[1], p2[0], p2[1], p3[0], p3[1],
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "thickness", thickness, 1, 0),
                    false
                );
                return facade;
            },

            addTriangleFilled: function (first, second, third, color) {
                var fn = "DrawList.addTriangleFilled";
                var p1 = point(first, fn, "first");
                var p2 = point(second, fn, "second");
                var p3 = point(third, fn, "third");
                bridge.drawTriangle(
                    layer, p1[0], p1[1], p2[0], p2[1], p3[0], p3[1],
                    packColor(color, WHITE, fn, "color"),
                    1,
                    true
                );
                return facade;
            },

            addText: function (position, color, text, options) {
                var fn = "DrawList.addText";
                var resolvedPosition = point(position, fn, "position");
                options = options || {};
                bridge.drawText(
                    layer, resolvedPosition[0], resolvedPosition[1],
                    packColor(color, WHITE, fn, "color"),
                    String(text),
                    resolveFontIndex(options.font, true, fn, "options.font"),
                    argNumber(fn, "options.size", options.size, 0, 0),
                    argNumber(fn, "options.wrapWidth", options.wrapWidth, 0, 0)
                );
                return facade;
            },

            addPolyline: function (points, color, thickness, closed) {
                var fn = "DrawList.addPolyline";
                var options = {};
                if (thickness != null && typeof thickness === "object") {
                    options = thickness;
                    thickness = options.thickness;
                    closed = options.closed;
                }
                var flags = argInt(fn, "options.flags", options.flags, 0);
                if (closed === true) {
                    flags |= api.DrawFlags.Closed;
                } else if (isNumberLike(closed)) {
                    flags |= argInt(fn, "closed", closed);
                }
                bridge.drawPolyline(
                    layer,
                    flattenPoints(points, fn, "points"),
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "thickness", thickness, 1, 0),
                    flags
                );
                return facade;
            },

            addBezierCubic: function (
                first,
                second,
                third,
                fourth,
                color,
                thickness,
                segments
            ) {
                var fn = "DrawList.addBezierCubic";
                var p1 = point(first, fn, "first");
                var p2 = point(second, fn, "second");
                var p3 = point(third, fn, "third");
                var p4 = point(fourth, fn, "fourth");
                bridge.drawBezierCubic(
                    layer,
                    p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1],
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "thickness", thickness, 1, 0),
                    argInt(fn, "segments", segments, 0, 0, DRAW_MAX_SEGMENTS)
                );
                return facade;
            },

            addBezierQuadratic: function (first, second, third, color, thickness, segments) {
                var fn = "DrawList.addBezierQuadratic";
                var p1 = point(first, fn, "first");
                var p2 = point(second, fn, "second");
                var p3 = point(third, fn, "third");
                bridge.drawBezierQuadratic(
                    layer,
                    p1[0], p1[1], p2[0], p2[1], p3[0], p3[1],
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "thickness", thickness, 1, 0),
                    argInt(fn, "segments", segments, 0, 0, DRAW_MAX_SEGMENTS)
                );
                return facade;
            },

            addQuad: function (first, second, third, fourth, color, thickness) {
                var fn = "DrawList.addQuad";
                var p1 = point(first, fn, "first");
                var p2 = point(second, fn, "second");
                var p3 = point(third, fn, "third");
                var p4 = point(fourth, fn, "fourth");
                bridge.drawQuad(
                    layer, p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1],
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "thickness", thickness, 1, 0),
                    false
                );
                return facade;
            },

            addQuadFilled: function (first, second, third, fourth, color) {
                var fn = "DrawList.addQuadFilled";
                var p1 = point(first, fn, "first");
                var p2 = point(second, fn, "second");
                var p3 = point(third, fn, "third");
                var p4 = point(fourth, fn, "fourth");
                bridge.drawQuad(
                    layer, p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1],
                    packColor(color, WHITE, fn, "color"),
                    1,
                    true
                );
                return facade;
            },

            addNgon: function (center, radius, color, segments, thickness) {
                var fn = "DrawList.addNgon";
                var resolvedCenter = point(center, fn, "center");
                bridge.drawNgon(
                    layer, resolvedCenter[0], resolvedCenter[1],
                    argNumber(fn, "radius", radius, undefined, 0),
                    packColor(color, WHITE, fn, "color"),
                    argInt(fn, "segments", segments, undefined, 3, DRAW_MAX_SEGMENTS),
                    argNumber(fn, "thickness", thickness, 1, 0),
                    false
                );
                return facade;
            },

            addNgonFilled: function (center, radius, color, segments) {
                var fn = "DrawList.addNgonFilled";
                var resolvedCenter = point(center, fn, "center");
                bridge.drawNgon(
                    layer, resolvedCenter[0], resolvedCenter[1],
                    argNumber(fn, "radius", radius, undefined, 0),
                    packColor(color, WHITE, fn, "color"),
                    argInt(fn, "segments", segments, undefined, 3, DRAW_MAX_SEGMENTS),
                    1,
                    true
                );
                return facade;
            },

            addEllipse: function (center, radius, color, rotation, segments, thickness) {
                var fn = "DrawList.addEllipse";
                var resolvedCenter = point(center, fn, "center");
                var resolvedRadius = point(radius, fn, "radius");
                bridge.drawEllipse(
                    layer, resolvedCenter[0], resolvedCenter[1], resolvedRadius[0], resolvedRadius[1],
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "rotation", rotation, 0),
                    argInt(fn, "segments", segments, 0, 0, DRAW_MAX_SEGMENTS),
                    argNumber(fn, "thickness", thickness, 1, 0),
                    false
                );
                return facade;
            },

            addEllipseFilled: function (center, radius, color, rotation, segments) {
                var fn = "DrawList.addEllipseFilled";
                var resolvedCenter = point(center, fn, "center");
                var resolvedRadius = point(radius, fn, "radius");
                bridge.drawEllipse(
                    layer, resolvedCenter[0], resolvedCenter[1], resolvedRadius[0], resolvedRadius[1],
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "rotation", rotation, 0),
                    argInt(fn, "segments", segments, 0, 0, DRAW_MAX_SEGMENTS),
                    1,
                    true
                );
                return facade;
            },

            addRectFilledMultiColor: function (
                minimum,
                maximum,
                colorUpperLeft,
                colorUpperRight,
                colorBottomRight,
                colorBottomLeft
            ) {
                var fn = "DrawList.addRectFilledMultiColor";
                var pMin = point(minimum, fn, "minimum");
                var pMax = point(maximum, fn, "maximum");
                bridge.drawRectFilledMultiColor(
                    layer, pMin[0], pMin[1], pMax[0], pMax[1],
                    packColor(colorUpperLeft, null, fn, "colorUpperLeft"),
                    packColor(colorUpperRight, null, fn, "colorUpperRight"),
                    packColor(colorBottomRight, null, fn, "colorBottomRight"),
                    packColor(colorBottomLeft, null, fn, "colorBottomLeft")
                );
                return facade;
            },

            addConvexPolyFilled: function (points, color) {
                var fn = "DrawList.addConvexPolyFilled";
                bridge.drawPolyFilled(layer, polygonPoints(points, fn), packColor(color, WHITE, fn, "color"), false);
                return facade;
            },

            addConcavePolyFilled: function (points, color) {
                var fn = "DrawList.addConcavePolyFilled";
                bridge.drawPolyFilled(layer, polygonPoints(points, fn), packColor(color, WHITE, fn, "color"), true);
                return facade;
            },

            addImageQuad: function (texture, first, second, third, fourth, options) {
                var fn = "DrawList.addImageQuad";
                var resolvedTexture = resolveTexture(fn, texture);
                var p1 = point(first, fn, "first");
                var p2 = point(second, fn, "second");
                var p3 = point(third, fn, "third");
                var p4 = point(fourth, fn, "fourth");
                options = options || {};
                var uv1 = point(options.uv1 || [0, 0], fn, "options.uv1");
                var uv2 = point(options.uv2 || [1, 0], fn, "options.uv2");
                var uv3 = point(options.uv3 || [1, 1], fn, "options.uv3");
                var uv4 = point(options.uv4 || [0, 1], fn, "options.uv4");
                bridge.drawImageQuad(
                    layer, resolvedTexture._nativeHandle,
                    floatArray([p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1]]),
                    floatArray([uv1[0], uv1[1], uv2[0], uv2[1], uv3[0], uv3[1], uv4[0], uv4[1]]),
                    packColor(options.tint, WHITE, fn, "options.tint")
                );
                return facade;
            },

            addImageRounded: function (texture, minimum, maximum, rounding, options) {
                var fn = "DrawList.addImageRounded";
                var resolvedTexture = resolveTexture(fn, texture);
                var pMin = point(minimum, fn, "minimum");
                var pMax = point(maximum, fn, "maximum");
                options = options || {};
                var uv0 = point(options.uv0 || [0, 0], fn, "options.uv0");
                var uv1 = point(options.uv1 || [1, 1], fn, "options.uv1");
                bridge.drawImageRounded(
                    layer, resolvedTexture._nativeHandle,
                    pMin[0], pMin[1], pMax[0], pMax[1],
                    uv0[0], uv0[1], uv1[0], uv1[1],
                    packColor(options.tint, WHITE, fn, "options.tint"),
                    argNumber(fn, "rounding", rounding, undefined, 0),
                    argInt(fn, "options.flags", options.flags, 0)
                );
                return facade;
            },

            pathClear: function () {
                bridge.drawPathClear(layer);
                return facade;
            },

            pathLineTo: function (position) {
                var resolved = point(position, "DrawList.pathLineTo", "position");
                bridge.drawPathLineTo(layer, resolved[0], resolved[1]);
                return facade;
            },

            pathArcTo: function (center, radius, angleMin, angleMax, segments) {
                var fn = "DrawList.pathArcTo";
                var resolvedCenter = point(center, fn, "center");
                var start = argNumber(fn, "angleMin", angleMin);
                bridge.drawPathArcTo(
                    layer, resolvedCenter[0], resolvedCenter[1],
                    argNumber(fn, "radius", radius, undefined, 0),
                    start,
                    argNumber(fn, "angleMax", angleMax, undefined, start - DRAW_MAX_ARC, start + DRAW_MAX_ARC),
                    argInt(fn, "segments", segments, 0, 0, DRAW_MAX_SEGMENTS)
                );
                return facade;
            },

            pathArcToFast: function (center, radius, minOf12, maxOf12) {
                var fn = "DrawList.pathArcToFast";
                var resolvedCenter = point(center, fn, "center");
                var start = argInt(fn, "minOf12", minOf12);
                bridge.drawPathArcToFast(
                    layer, resolvedCenter[0], resolvedCenter[1],
                    argNumber(fn, "radius", radius, undefined, 0),
                    start,
                    argInt(fn, "maxOf12", maxOf12, undefined, start, start + DRAW_MAX_ARC_STEPS)
                );
                return facade;
            },

            pathBezierCubicCurveTo: function (second, third, fourth, segments) {
                var fn = "DrawList.pathBezierCubicCurveTo";
                var p2 = point(second, fn, "second");
                var p3 = point(third, fn, "third");
                var p4 = point(fourth, fn, "fourth");
                bridge.drawPathBezierCubicCurveTo(
                    layer, p2[0], p2[1], p3[0], p3[1], p4[0], p4[1],
                    argInt(fn, "segments", segments, 0, 0, DRAW_MAX_SEGMENTS)
                );
                return facade;
            },

            pathBezierQuadraticCurveTo: function (second, third, segments) {
                var fn = "DrawList.pathBezierQuadraticCurveTo";
                var p2 = point(second, fn, "second");
                var p3 = point(third, fn, "third");
                bridge.drawPathBezierQuadraticCurveTo(
                    layer, p2[0], p2[1], p3[0], p3[1],
                    argInt(fn, "segments", segments, 0, 0, DRAW_MAX_SEGMENTS)
                );
                return facade;
            },

            pathRect: function (minimum, maximum, rounding, flags) {
                var fn = "DrawList.pathRect";
                var pMin = point(minimum, fn, "minimum");
                var pMax = point(maximum, fn, "maximum");
                bridge.drawPathRect(
                    layer, pMin[0], pMin[1], pMax[0], pMax[1],
                    argNumber(fn, "rounding", rounding, 0, 0),
                    argFlags(fn, flags)
                );
                return facade;
            },

            pathStroke: function (color, thickness, flags) {
                var fn = "DrawList.pathStroke";
                bridge.drawPathStroke(
                    layer,
                    packColor(color, WHITE, fn, "color"),
                    argNumber(fn, "thickness", thickness, 1, 0),
                    argFlags(fn, flags)
                );
                return facade;
            },

            pathFillConvex: function (color) {
                bridge.drawPathFill(layer, packColor(color, WHITE, "DrawList.pathFillConvex", "color"), false);
                return facade;
            },

            pathFillConcave: function (color) {
                bridge.drawPathFill(layer, packColor(color, WHITE, "DrawList.pathFillConcave", "color"), true);
                return facade;
            },

            pushClipRect: function (minimum, maximum, intersectWithCurrent) {
                var fn = "DrawList.pushClipRect";
                var pMin = point(minimum, fn, "minimum");
                var pMax = point(maximum, fn, "maximum");
                bridge.drawPushClipRect(layer, pMin[0], pMin[1], pMax[0], pMax[1], Boolean(intersectWithCurrent));
                return facade;
            },

            popClipRect: function () {
                bridge.drawPopClipRect(layer);
                return facade;
            },

            addImage: function (texture, minimum, maximum, options) {
                var fn = "DrawList.addImage";
                var resolvedTexture = resolveTexture(fn, texture);
                var pMin = point(minimum, fn, "minimum");
                var pMax = point(maximum, fn, "maximum");
                options = options || {};
                var uv0 = point(options.uv0 || [0, 0], fn, "options.uv0");
                var uv1 = point(options.uv1 || [1, 1], fn, "options.uv1");
                bridge.drawImage(
                    layer, resolvedTexture._nativeHandle,
                    pMin[0], pMin[1], pMax[0], pMax[1],
                    uv0[0], uv0[1], uv1[0], uv1[1],
                    packColor(options.tint, WHITE, fn, "options.tint")
                );
                return facade;
            }
        };
        facade.AddLine = facade.addLine;
        facade.AddRect = facade.addRect;
        facade.AddRectFilled = facade.addRectFilled;
        facade.AddCircle = facade.addCircle;
        facade.AddCircleFilled = facade.addCircleFilled;
        facade.AddTriangle = facade.addTriangle;
        facade.AddTriangleFilled = facade.addTriangleFilled;
        facade.AddText = facade.addText;
        facade.AddPolyline = facade.addPolyline;
        facade.AddBezierCubic = facade.addBezierCubic;
        facade.AddImage = facade.addImage;
        facade.AddBezierQuadratic = facade.addBezierQuadratic;
        facade.AddQuad = facade.addQuad;
        facade.AddQuadFilled = facade.addQuadFilled;
        facade.AddNgon = facade.addNgon;
        facade.AddNgonFilled = facade.addNgonFilled;
        facade.AddEllipse = facade.addEllipse;
        facade.AddEllipseFilled = facade.addEllipseFilled;
        facade.AddRectFilledMultiColor = facade.addRectFilledMultiColor;
        facade.AddConvexPolyFilled = facade.addConvexPolyFilled;
        facade.AddConcavePolyFilled = facade.addConcavePolyFilled;
        facade.AddImageQuad = facade.addImageQuad;
        facade.AddImageRounded = facade.addImageRounded;
        facade.PathClear = facade.pathClear;
        facade.PathLineTo = facade.pathLineTo;
        facade.PathArcTo = facade.pathArcTo;
        facade.PathArcToFast = facade.pathArcToFast;
        facade.PathBezierCubicCurveTo = facade.pathBezierCubicCurveTo;
        facade.PathBezierQuadraticCurveTo = facade.pathBezierQuadraticCurveTo;
        facade.PathRect = facade.pathRect;
        facade.PathStroke = facade.pathStroke;
        facade.PathFillConvex = facade.pathFillConvex;
        facade.PathFillConcave = facade.pathFillConcave;
        facade.PushClipRect = facade.pushClipRect;
        facade.PopClipRect = facade.popClipRect;
        return freeze(facade);
    }

    var WINDOW_DRAW_LIST = createDrawListFacade(api.DrawListLayer.Window);
    var FOREGROUND_DRAW_LIST = createDrawListFacade(api.DrawListLayer.Foreground);
    var BACKGROUND_DRAW_LIST = createDrawListFacade(api.DrawListLayer.Background);
    api.getWindowDrawList = function () { return WINDOW_DRAW_LIST; };
    api.getForegroundDrawList = function () { return FOREGROUND_DRAW_LIST; };
    api.getBackgroundDrawList = function () { return BACKGROUND_DRAW_LIST; };

    // The window-level form also clips hit testing and widget culling; unlike the DrawList form it intersects by default.
    api.pushClipRect = function (minimum, maximum, intersectWithCurrent) {
        var pMin = point(minimum, "pushClipRect", "minimum");
        var pMax = point(maximum, "pushClipRect", "maximum");
        bridge.pushClipRect(pMin[0], pMin[1], pMax[0], pMax[1], intersectWithCurrent !== false);
    };
    api.popClipRect = function () { bridge.popClipRect(); };

    api.pushId = function (id) {
        if (isNumberLike(id)) {
            bridge.pushIdInt(argInt("pushId", "id", id));
        } else {
            bridge.pushIdString(String(id));
        }
    };
    api.popId = function () { bridge.popId(); };
    api.beginGroup = function () { bridge.beginGroup(); };
    api.endGroup = function () { bridge.endGroup(); };
    api.indent = function (width) { bridge.indent(argNumber("indent", "width", width, 0)); };
    api.unindent = function (width) { bridge.unindent(argNumber("unindent", "width", width, 0)); };
    api.alignTextToFramePadding = function () { bridge.alignTextToFramePadding(); };
    api.beginDisabled = function (disabled) { bridge.beginDisabled(disabled !== false); };
    api.endDisabled = function () { bridge.endDisabled(); };

    api.getScrollX = function () { return Number(bridge.getScrollX()); };
    api.getScrollY = function () { return Number(bridge.getScrollY()); };
    api.getScrollMaxX = function () { return Number(bridge.getScrollMaxX()); };
    api.getScrollMaxY = function () { return Number(bridge.getScrollMaxY()); };
    api.setScrollX = function (value) { bridge.setScrollX(argNumber("setScrollX", "value", value)); };
    api.setScrollY = function (value) { bridge.setScrollY(argNumber("setScrollY", "value", value)); };
    api.setScrollHereX = function (centerRatio) {
        bridge.setScrollHereX(argNumber("setScrollHereX", "centerRatio", centerRatio, 0.5, 0, 1));
    };
    api.setScrollHereY = function (centerRatio) {
        bridge.setScrollHereY(argNumber("setScrollHereY", "centerRatio", centerRatio, 0.5, 0, 1));
    };

    api.isItemActive = function () { return Boolean(bridge.isItemActive()); };
    api.isItemEdited = function () { return Boolean(bridge.isItemEdited()); };
    api.isItemActivated = function () { return Boolean(bridge.isItemActivated()); };
    api.isItemDeactivated = function () { return Boolean(bridge.isItemDeactivated()); };
    api.isItemDeactivatedAfterEdit = function () {
        return Boolean(bridge.isItemDeactivatedAfterEdit());
    };
    api.isItemFocused = function () { return Boolean(bridge.isItemFocused()); };
    api.isItemVisible = function () { return Boolean(bridge.isItemVisible()); };
    api.isWindowHovered = function (flags) {
        return Boolean(bridge.isWindowHovered(argFlags("isWindowHovered", flags)));
    };
    api.isWindowFocused = function (flags) {
        return Boolean(bridge.isWindowFocused(argFlags("isWindowFocused", flags)));
    };
    api.isWindowCollapsed = function () { return Boolean(bridge.isWindowCollapsed()); };
    api.isWindowAppearing = function () { return Boolean(bridge.isWindowAppearing()); };
    api.getMousePos = function () { return bridge.getMousePos(); };
    api.isMouseDown = function (button) {
        return Boolean(bridge.isMouseDown(mouseButton("isMouseDown", button)));
    };
    api.isMouseClicked = function (button, repeat) {
        return Boolean(bridge.isMouseClicked(mouseButton("isMouseClicked", button), Boolean(repeat)));
    };
    api.isMouseDoubleClicked = function (button) {
        return Boolean(bridge.isMouseDoubleClicked(mouseButton("isMouseDoubleClicked", button)));
    };
    api.isMouseReleased = function (button) {
        return Boolean(bridge.isMouseReleased(mouseButton("isMouseReleased", button)));
    };
    api.isMouseDragging = function (button, lockThreshold) {
        return Boolean(bridge.isMouseDragging(
            mouseButton("isMouseDragging", button),
            argNumber("isMouseDragging", "lockThreshold", lockThreshold, -1)
        ));
    };
    api.getMouseDragDelta = function (button, lockThreshold) {
        return bridge.getMouseDragDelta(
            mouseButton("getMouseDragDelta", button),
            argNumber("getMouseDragDelta", "lockThreshold", lockThreshold, -1)
        );
    };
    api.resetMouseDragDelta = function (button) {
        bridge.resetMouseDragDelta(mouseButton("resetMouseDragDelta", button));
    };
    api.calcTextSize = function (text, wrapWidth) {
        return bridge.calcTextSize(String(text), argNumber("calcTextSize", "wrapWidth", wrapWidth, -1));
    };
    api.getFrameHeight = function () { return Number(bridge.getFrameHeight()); };
    api.getFrameHeightWithSpacing = function () {
        return Number(bridge.getFrameHeightWithSpacing());
    };
    api.getTextLineHeight = function () { return Number(bridge.getTextLineHeight()); };
    api.getTextLineHeightWithSpacing = function () {
        return Number(bridge.getTextLineHeightWithSpacing());
    };
    api.framerate = function () { return Number(bridge.getFramerate()); };

    api.addInputCharacters = function (text) { bridge.addInputCharacters(String(text)); };
    api.addKeyEvent = function (key, down) {
        bridge.addKeyEvent(argInt("addKeyEvent", "key", key, undefined, 0), Boolean(down));
    };
    api.sendKey = function (key) {
        var resolvedKey = argInt("sendKey", "key", key, undefined, 0);
        bridge.addKeyEvent(resolvedKey, true);
        bridge.addKeyEvent(resolvedKey, false);
    };
    api.addMouseWheel = function (wheelX, wheelY) {
        bridge.addMouseWheelEvent(
            argNumber("addMouseWheel", "wheelX", wheelX, 0),
            argNumber("addMouseWheel", "wheelY", wheelY, 0)
        );
    };
    api.addMousePosEvent = function (x, y) {
        bridge.addMousePosEvent(argNumber("addMousePosEvent", "x", x), argNumber("addMousePosEvent", "y", y));
    };
    api.addMouseButtonEvent = function (button, down) {
        bridge.addMouseButtonEvent(mouseButton("addMouseButtonEvent", button), Boolean(down));
    };
    api.wantTextInput = function () { return Boolean(bridge.wantTextInput()); };

    api.isKeyDown = function (key) { return Boolean(bridge.isKeyDown(argKey("isKeyDown", key))); };
    api.isKeyPressed = function (key, repeat) {
        return Boolean(bridge.isKeyPressed(argKey("isKeyPressed", key), repeat !== false));
    };
    api.isKeyReleased = function (key) { return Boolean(bridge.isKeyReleased(argKey("isKeyReleased", key))); };
    api.getKeyPressedAmount = function (key, repeatDelay, rate) {
        return Number(bridge.getKeyPressedAmount(
            argKey("getKeyPressedAmount", key),
            argNumber("getKeyPressedAmount", "repeatDelay", repeatDelay),
            argNumber("getKeyPressedAmount", "rate", rate)
        ));
    };
    api.getKeyName = function (key) {
        var resolved = argInt("getKeyName", "key", key);
        return String(bridge.getKeyName(resolved === api.Key.None ? resolved : argKey("getKeyName", resolved)));
    };
    api.isKeyChordPressed = function (keyChord) {
        return Boolean(bridge.isKeyChordPressed(argKeyChord("isKeyChordPressed", keyChord)));
    };
    api.shortcut = function (keyChord, flags) {
        return Boolean(bridge.shortcut(argKeyChord("shortcut", keyChord), argFlags("shortcut", flags)));
    };
    api.setNextItemShortcut = function (keyChord, flags) {
        bridge.setNextItemShortcut(
            argKeyChord("setNextItemShortcut", keyChord),
            argFlags("setNextItemShortcut", flags)
        );
    };

    api.getClipboardText = function () { return String(bridge.getClipboardText()); };
    api.setClipboardText = function (text) { bridge.setClipboardText(String(text)); };

    var DRAG_DROP_TYPE_MAX_BYTES = 32;

    function utf8Length(text) {
        return new java.lang.String(text).getBytes("UTF-8").length;
    }

    function dragDropType(fn, value) {
        if (!isStringLike(value)) {
            throw new TypeError(argumentLabel(fn, "type") + " must be a string, got " + typeof value);
        }
        var type = String(value);
        var bytes = utf8Length(type);
        if (bytes < 1 || bytes > DRAG_DROP_TYPE_MAX_BYTES) {
            throw new RangeError(
                argumentLabel(fn, "type") + " must have 1 to " + DRAG_DROP_TYPE_MAX_BYTES + " UTF-8 bytes, got " + bytes
            );
        }
        return type;
    }

    function dragDropJson(fn, data) {
        var json;
        try {
            json = JSON.stringify(isStringLike(data) ? String(data) : data);
        } catch (error) {
            throw new TypeError(argumentLabel(fn, "data") + " must be JSON serializable: " + error.message);
        }
        if (json === undefined) {
            throw new TypeError(argumentLabel(fn, "data") + " must be JSON serializable, got " + typeof data);
        }
        var bytes = utf8Length(json);
        if (bytes > api.Limits.DragDropPayloadMaxBytes) {
            throw new RangeError(
                argumentLabel(fn, "data") + " must have at most " + api.Limits.DragDropPayloadMaxBytes +
                " UTF-8 bytes as JSON, got " + bytes
            );
        }
        return json;
    }

    // raw: {type, JSON data or null, "1" while previewed, "1" when delivered}, or null.
    function dragDropPayload(raw) {
        if (raw == null) {
            return null;
        }
        return {
            type: String(raw[0]),
            data: raw[1] == null ? null : JSON.parse(String(raw[1])),
            preview: String(raw[2]) === "1",
            delivery: String(raw[3]) === "1"
        };
    }

    api.beginDragDropSource = function (flags) {
        return Boolean(bridge.beginDragDropSource(argFlags("beginDragDropSource", flags)));
    };
    api.setDragDropPayload = function (type, data, condition) {
        var resolvedType = dragDropType("setDragDropPayload", type);
        if (resolvedType.charAt(0) === "_") {
            throw new RangeError(
                argumentLabel("setDragDropPayload", "type") + " must not start with '_': those types are Dear ImGui's"
            );
        }
        return Boolean(bridge.setDragDropPayload(
            resolvedType,
            dragDropJson("setDragDropPayload", data),
            argInt("setDragDropPayload", "condition", condition, api.Cond.Always, api.Cond.Always, api.Cond.Once)
        ));
    };
    api.endDragDropSource = function () { bridge.endDragDropSource(); };
    api.beginDragDropTarget = function () { return Boolean(bridge.beginDragDropTarget()); };
    api.acceptDragDropPayload = function (type, flags) {
        return dragDropPayload(bridge.acceptDragDropPayload(
            dragDropType("acceptDragDropPayload", type),
            argFlags("acceptDragDropPayload", flags)
        ));
    };
    api.endDragDropTarget = function () { bridge.endDragDropTarget(); };
    api.getDragDropPayload = function () { return dragDropPayload(bridge.getDragDropPayload()); };

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

    api.withTable = function (id, columns, flags, outerWidth, outerHeight, body) {
        var open = api.beginTable(id, columns, flags, outerWidth, outerHeight);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endTable();
            }
        }
    };

    api.withPopup = function (id, flags, body) {
        var open = api.beginPopup(id, flags);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endPopup();
            }
        }
    };

    api.withPopupModal = function (name, openRef, flags, body) {
        var open = api.beginPopupModal(name, openRef, flags);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endPopup();
            }
        }
    };

    api.withContextItem = function (id, flags, body) {
        if (typeof id === "function") {
            body = id;
            id = null;
            flags = 0;
        } else if (typeof flags === "function") {
            body = flags;
            flags = 0;
        }
        var open = api.beginPopupContextItem(id, flags);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endPopup();
            }
        }
    };

    api.withContextWindow = function (id, flags, body) {
        if (typeof id === "function") {
            body = id;
            id = null;
            flags = 0;
        } else if (typeof flags === "function") {
            body = flags;
            flags = 0;
        }
        var open = api.beginPopupContextWindow(id, flags);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endPopup();
            }
        }
    };

    api.withTooltip = function (body) {
        var open = api.beginTooltip();
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endTooltip();
            }
        }
    };

    api.withItemTooltip = function (body) {
        var open = api.beginItemTooltip();
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endTooltip();
            }
        }
    };

    api.withMenuBar = function (body) {
        var open = api.beginMenuBar();
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endMenuBar();
            }
        }
    };

    api.withMenu = function (label, enabled, body) {
        var open = api.beginMenu(label, enabled);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endMenu();
            }
        }
    };

    api.withListBox = function (label, width, height, body) {
        var open = api.beginListBox(label, width, height);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endListBox();
            }
        }
    };

    api.withCombo = function (label, preview, flags, body) {
        var open = api.beginCombo(label, preview, flags);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endCombo();
            }
        }
    };

    api.withDragDropSource = function (flags, body) {
        if (typeof flags === "function") {
            body = flags;
            flags = undefined;
        }
        var open = api.beginDragDropSource(flags);
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endDragDropSource();
            }
        }
    };

    api.withDragDropTarget = function (body) {
        var open = api.beginDragDropTarget();
        try {
            if (open && body) {
                body();
            }
            return open;
        } finally {
            if (open) {
                api.endDragDropTarget();
            }
        }
    };

    api.withGroup = function (body) {
        api.beginGroup();
        try {
            if (body) {
                body();
            }
        } finally {
            api.endGroup();
        }
    };

    api.withDisabled = function (disabled, body) {
        api.beginDisabled(disabled);
        try {
            if (body) {
                body();
            }
        } finally {
            api.endDisabled();
        }
    };

    api.withId = function (id, body) {
        api.pushId(id);
        try {
            if (body) {
                body();
            }
        } finally {
            api.popId();
        }
    };

    function createHighLevelRuntime() {
        return {
            components: [],
            componentMap: {},
            nextId: 1,
            nextRowId: 1
        };
    }

    function requireHighLevelSession(apiName, explicitSession) {
        var session = explicitSession || api._activeSession;
        if (!session || session.closed || !session._highLevel) {
            throw noActiveSession(apiName);
        }
        return session;
    }

    // One window session per script engine: createWindow closes the previous session, the global helpers act on the current one.
    function requireActiveSession(apiName) {
        var session = api._activeSession;
        if (!session || session.closed) {
            throw noActiveSession(apiName);
        }
        return session;
    }

    function noActiveSession(apiName) {
        return new Error("imgui." + apiName + ": no active session");
    }

    function componentKey(type, id) {
        return String(type) + ":" + String(id);
    }

    function findHighLevelComponent(session, type, id) {
        return session._highLevel.componentMap[componentKey(type, id)] || null;
    }

    function createHighLevelComponent(session, type, id, options) {
        var runtime = session._highLevel;
        var key = componentKey(type, id);
        var component = {
            type: String(type),
            id: String(id),
            session: session,
            options: options || {},
            visible: !options || options.visible !== false,
            closed: false,
            closeReason: null,

            show: function () {
                if (!component.closed) {
                    component.visible = true;
                }
                return component;
            },

            hide: function () {
                component.visible = false;
                return component;
            },

            toggle: function () {
                if (!component.closed) {
                    component.visible = !component.visible;
                }
                return component;
            },

            close: function (reason) {
                if (component.closed) {
                    return component;
                }
                component.closed = true;
                component.visible = false;
                component.closeReason = reason || "closed";
                if (runtime.componentMap[key] === component) {
                    delete runtime.componentMap[key];
                }
                if (typeof component._onClose === "function") {
                    try {
                        component._onClose(component.closeReason);
                    } catch (error) {
                        console.error("[imgui] " + type + " close callback failed: " + error);
                    }
                }
                return component;
            }
        };
        runtime.componentMap[key] = component;
        runtime.components.push(component);
        return component;
    }

    function compactHighLevelComponents(session) {
        var components = session._highLevel.components;
        var writeIndex = 0;
        for (var readIndex = 0; readIndex < components.length; readIndex += 1) {
            if (!components[readIndex].closed) {
                components[writeIndex] = components[readIndex];
                writeIndex += 1;
            }
        }
        components.length = writeIndex;
    }

    function renderHighLevelComponent(session, component, context) {
        if (component.closed || !component.visible || typeof component._render !== "function") {
            return;
        }
        try {
            component._render(context || {});
        } catch (error) {
            // Only the component closes; the error is still reported (and emitted as "error") by the session.
            session._reportError("render", component.type + " '" + component.id + "' render", error, {
                component: component
            });
            component.close("render-error");
        }
    }

    function renderHighLevelComponents(session) {
        var snapshot = session._highLevel.components.slice();
        var toastIndexes = {};
        var activeDialog = null;
        for (var index = 0; index < snapshot.length; index += 1) {
            var component = snapshot[index];
            if (component._isDialog) {
                if (!activeDialog && !component.closed && component.visible) {
                    activeDialog = component;
                }
                continue;
            }
            var context = {};
            if (component.type === "toast") {
                var position = String(component.position || api.ToastPosition.TopRight);
                context.stackIndex = toastIndexes[position] || 0;
                toastIndexes[position] = context.stackIndex + 1;
            }
            renderHighLevelComponent(session, component, context);
        }
        if (activeDialog) {
            renderHighLevelComponent(session, activeDialog, {activeDialog: true});
        }
        compactHighLevelComponents(session);
    }

    function disposeHighLevelComponents(session, reason) {
        if (!session._highLevel) {
            return;
        }
        var snapshot = session._highLevel.components.slice();
        for (var index = 0; index < snapshot.length; index += 1) {
            snapshot[index].close(reason || "session-closed");
        }
        session._highLevel.components.length = 0;
        session._highLevel.componentMap = {};
    }

    // Component sizes and margins are options in dp, converted once to the session's px.
    function componentScale(session, fn, options, name, fallback) {
        return argNumber(fn, "options." + name, options[name], fallback, 0) * clamp(session.density, 0.5, 4);
    }

    // Anchors use ImGui coordinates, which are the window's px.
    function setAnchoredWindowPosition(session, position, margin, condition, stackOffset) {
        var resolvedPosition = normalizedKey(position || api.ToastPosition.TopRight);
        var width = Math.max(1, session.width * session.density);
        var height = Math.max(1, session.height * session.density);
        var x = width - margin;
        var y = margin + stackOffset;
        var pivotX = 1;
        var pivotY = 0;
        if (resolvedPosition === "topleft") {
            x = margin;
            pivotX = 0;
        } else if (resolvedPosition === "topcenter") {
            x = width / 2;
            pivotX = 0.5;
        } else if (resolvedPosition === "center") {
            x = width / 2;
            y = height / 2 + stackOffset;
            pivotX = 0.5;
            pivotY = 0.5;
        } else if (resolvedPosition === "bottomleft") {
            x = margin;
            y = height - margin - stackOffset;
            pivotX = 0;
            pivotY = 1;
        } else if (resolvedPosition === "bottomcenter") {
            x = width / 2;
            y = height - margin - stackOffset;
            pivotX = 0.5;
            pivotY = 1;
        } else if (resolvedPosition === "bottomright") {
            y = height - margin - stackOffset;
            pivotY = 1;
        }
        api.setNextWindowPos(x, y, condition, pivotX, pivotY);
    }

    function normalizeLogLevel(level) {
        var key = normalizedKey(level == null ? api.LogLevel.Log : level);
        if (key === "warning") key = "warn";
        if (key === "information") key = "info";
        if (key !== "log" && key !== "debug" && key !== "info" &&
            key !== "warn" && key !== "error"
        ) {
            key = "log";
        }
        return key;
    }

    function logLevelColor(level) {
        if (level === "debug") return [0.62, 0.67, 0.76, 1];
        if (level === "info") return [0.35, 0.75, 1, 1];
        if (level === "warn") return [1, 0.72, 0.20, 1];
        if (level === "error") return [1, 0.34, 0.34, 1];
        return [0.90, 0.92, 0.95, 1];
    }

    function formatLogTimestamp(timestamp) {
        var date = new Date(timestamp);
        try {
            return date.toISOString();
        } catch (ignored) {
            return String(date);
        }
    }

    function createLogWindow(session, id, options) {
        session = requireHighLevelSession("logWindow", session);
        options = options || {};
        var resolvedId = String(id == null ? "default" : id);
        var existing = findHighLevelComponent(session, "logWindow", resolvedId);
        if (existing) {
            return existing;
        }
        var maxEntries = argInt("logWindow", "options.maxEntries", options.maxEntries, 1000, 1);
        var margin = componentScale(session, "logWindow", options, "margin", 12);
        var windowWidth = componentScale(session, "logWindow", options, "width", 380);
        var windowHeight = componentScale(session, "logWindow", options, "height", 260);
        var windowFlags = argInt("logWindow", "options.flags", options.flags, 0);
        var component = createHighLevelComponent(session, "logWindow", resolvedId, options);
        component.entries = [];
        component.autoScroll = options.autoScroll !== false;
        component.maxEntries = maxEntries;
        component.open = valueRef(options.open !== false);
        component._scrollPending = false;

        component.append = function (level, text) {
            var entry = {
                timestamp: Date.now(),
                level: normalizeLogLevel(level),
                text: String(text == null ? "" : text)
            };
            component.entries.push(entry);
            if (component.entries.length > component.maxEntries) {
                component.entries.splice(0, component.entries.length - component.maxEntries);
            }
            component._scrollPending = true;
            if (typeof options.onAppend === "function") {
                options.onAppend(entry, component);
            }
            return component;
        };

        component.appendLog = function (first, second) {
            var firstLevel = normalizeLogLevel(first);
            var firstIsLevel = normalizedKey(first) === firstLevel ||
                normalizedKey(first) === "warning" || normalizedKey(first) === "information";
            if (second != null && firstIsLevel) {
                return component.append(firstLevel, second);
            }
            return component.append(second == null ? api.LogLevel.Log : second, first);
        };
        component.log = function (text) { return component.append(api.LogLevel.Log, text); };
        component.debug = function (text) { return component.append(api.LogLevel.Debug, text); };
        component.info = function (text) { return component.append(api.LogLevel.Info, text); };
        component.warn = function (text) { return component.append(api.LogLevel.Warn, text); };
        component.error = function (text) { return component.append(api.LogLevel.Error, text); };
        component.clear = function () {
            component.entries.length = 0;
            component._scrollPending = false;
            if (typeof options.onClear === "function") {
                options.onClear(component);
            }
            return component;
        };
        component.exportText = function () {
            var lines = [];
            for (var entryIndex = 0; entryIndex < component.entries.length; entryIndex += 1) {
                var entry = component.entries[entryIndex];
                lines.push(
                    "[" + formatLogTimestamp(entry.timestamp) + "] [" +
                    entry.level.toUpperCase() + "] " + entry.text
                );
            }
            return lines.join("\n");
        };
        component.export = function () {
            var text = component.exportText();
            if (typeof options.onExport === "function") {
                options.onExport(text, component.entries.slice(), component);
            }
            return text;
        };
        component.render = function () {
            component._render({});
            return component;
        };

        if (options.entries && typeof options.entries.length === "number") {
            for (var initialIndex = 0; initialIndex < options.entries.length; initialIndex += 1) {
                var initial = options.entries[initialIndex];
                if (initial != null && typeof initial === "object" && initial.text != null) {
                    component.append(initial.level, initial.text);
                } else {
                    component.append(api.LogLevel.Log, initial);
                }
            }
        }

        component._render = function () {
            if (!component.open.value) {
                component.close("window-closed");
                return;
            }
            if (options.position != null) {
                setAnchoredWindowPosition(
                    session,
                    options.position,
                    margin,
                    api.Cond.FirstUseEver,
                    0
                );
            }
            api.setNextWindowSize(windowWidth, windowHeight, api.Cond.FirstUseEver);
            var title = String(options.title == null ? resolvedId : options.title) +
                "###imgui-log-window-" + resolvedId;
            api.withWindow(title, component.open, windowFlags, function () {
                if (api.smallButton(String(options.clearLabel || "Clear") + "###clear")) {
                    component.clear();
                }
                api.sameLine();
                if (api.smallButton(String(options.exportLabel || "Export") + "###export")) {
                    component.export();
                }
                api.sameLine();
                api.textDisabled(String(component.entries.length) + " / " + component.maxEntries);
                api.separator();
                api.withChild("##imgui-log-scroll-" + resolvedId, 0, 0, true, 0, function () {
                    for (var entryIndex = 0; entryIndex < component.entries.length; entryIndex += 1) {
                        var entry = component.entries[entryIndex];
                        var color = logLevelColor(entry.level);
                        api.textColored(
                            color[0], color[1], color[2], color[3],
                            "[" + entry.level.toUpperCase() + "] " + entry.text
                        );
                    }
                    if (component.autoScroll && component._scrollPending) {
                        api.setScrollHereY(1);
                        component._scrollPending = false;
                    }
                });
            });
            if (!component.open.value) {
                component.close("window-closed");
            }
        };
        component._onClose = function (reason) {
            if (typeof options.onClose === "function") {
                options.onClose(reason, component);
            }
        };
        return component;
    }

    api.logWindow = function (id, options) {
        return createLogWindow(null, id, options);
    };

    function createToast(session, text, duration, options) {
        session = requireHighLevelSession("toast", session);
        if (duration != null && typeof duration === "object") {
            options = duration;
            duration = options.duration;
        }
        options = options || {};
        var runtime = session._highLevel;
        var id = String(options.id == null ? runtime.nextId++ : options.id);
        var existing = findHighLevelComponent(session, "toast", id);
        if (existing) {
            existing.update(text, duration, options);
            return existing;
        }
        var resolvedDuration = argNumber(
            "toast", "duration", duration,
            argNumber("toast", "options.duration", options.duration, 2500, 0),
            0
        );
        var margin = componentScale(session, "toast", options, "margin", 12);
        var stackStep = componentScale(session, "toast", options, "stackStep", 54);
        var fadeDuration = argNumber("toast", "options.fadeDuration", options.fadeDuration, 250, 0);
        var backgroundAlpha = argNumber(
            "toast", "options.backgroundAlpha", options.backgroundAlpha, 0.92, 0, 1
        );
        var extraFlags = argInt("toast", "options.flags", options.flags, 0);
        var textColor = options.color == null ? null : color4(options.color, null, "toast", "options.color");
        var component = createHighLevelComponent(session, "toast", id, options);
        component.position = options.position || api.ToastPosition.TopRight;
        component.text = String(text == null ? "" : text);
        component.level = normalizeLogLevel(options.level || options.type || api.LogLevel.Info);
        component.duration = resolvedDuration;
        component.createdAt = Date.now();
        component.expiresAt = component.duration > 0
            ? component.createdAt + component.duration
            : Number.POSITIVE_INFINITY;

        component.update = function (nextText, nextDuration, nextOptions) {
            nextOptions = nextOptions || {};
            var nextResolvedDuration = argNumber(
                "toast", "duration", nextDuration,
                argNumber("toast", "options.duration", nextOptions.duration, component.duration, 0),
                0
            );
            component.text = String(nextText == null ? "" : nextText);
            component.level = normalizeLogLevel(
                nextOptions.level || nextOptions.type || component.level
            );
            component.position = nextOptions.position || component.position;
            component.duration = nextResolvedDuration;
            component.createdAt = Date.now();
            component.expiresAt = component.duration > 0
                ? component.createdAt + component.duration
                : Number.POSITIVE_INFINITY;
            component.visible = true;
            return component;
        };

        component._render = function (context) {
            var now = Date.now();
            if (now >= component.expiresAt) {
                component.close("expired");
                return;
            }
            setAnchoredWindowPosition(
                session,
                component.position,
                margin,
                api.Cond.Always,
                Math.max(0, context.stackIndex || 0) * stackStep
            );
            var opacity = 1;
            if (component.duration > 0 && fadeDuration > 0) {
                opacity = clamp((component.expiresAt - now) / fadeDuration, 0, 1);
            }
            api.setNextWindowBgAlpha(clamp(backgroundAlpha * opacity, 0, 1));
            var flags = api.WindowFlags.NoDecoration |
                api.WindowFlags.AlwaysAutoResize |
                api.WindowFlags.NoSavedSettings |
                api.WindowFlags.NoFocusOnAppearing |
                api.WindowFlags.NoBringToFrontOnFocus |
                api.WindowFlags.NoMove |
                api.WindowFlags.NoNav;
            if (options.interactive !== true) {
                flags |= api.WindowFlags.NoInputs;
            }
            flags |= extraFlags;
            api.withWindow("###imgui-toast-" + id, null, flags, function () {
                var color = (textColor || logLevelColor(component.level)).slice();
                color[3] *= opacity;
                api.pushStyleColor(api.Col.Text, color);
                try {
                    if (options.showLevel === true) {
                        api.textWrapped("[" + component.level.toUpperCase() + "] " + component.text);
                    } else {
                        api.textWrapped(component.text);
                    }
                } finally {
                    api.popStyleColor();
                }
            });
        };
        component._onClose = function (reason) {
            if (typeof options.onClose === "function") {
                options.onClose(reason, component);
            }
        };
        return component;
    }

    api.toast = function (text, duration, options) {
        return createToast(null, text, duration, options);
    };

    function createDialog(session, type, config) {
        session = requireHighLevelSession(type, session);
        if (typeof Promise !== "function") {
            throw new Error("imgui." + type + " requires Promise support in the script engine");
        }
        config = config || {};
        var runtime = session._highLevel;
        var id = String(config.id == null ? runtime.nextId++ : config.id);
        var dialogWidth = componentScale(session, type, config, "width", 320);
        var dialogFlags = argInt(type, "options.flags", config.flags, 0);
        var component = createHighLevelComponent(session, "dialog", type + "-" + id, config);
        var resolvePromise;
        var promise = new Promise(function (resolve) {
            resolvePromise = resolve;
        });
        component._isDialog = true;
        component.dialogType = type;
        component.title = String(config.title || (type === "confirm" ? "Confirm" : "Alert"));
        component.message = config.message == null ? "" : String(config.message);
        component.open = valueRef(true);
        component._opened = false;
        component._insideModal = false;
        component._resolved = false;
        component._pendingFinish = null;
        component.promise = promise;
        component.cancelValue = config.cancelValue;

        component._finish = function (value, reason) {
            if (component._resolved) {
                return component;
            }
            component._resolved = true;
            component.open.value = false;
            if (typeof config.onResult === "function") {
                try {
                    config.onResult(value, reason, component);
                } catch (error) {
                    console.error("[imgui] Dialog result callback failed: " + error);
                }
            }
            resolvePromise(value);
            component.close(reason || "resolved");
            return component;
        };

        component._requestFinish = function (value, reason) {
            if (component.closed || component._resolved) {
                return component;
            }
            if (component._insideModal) {
                api.closeCurrentPopup();
                return component._finish(value, reason);
            }
            component._pendingFinish = {value: value, reason: reason};
            return component;
        };

        component.cancel = function () {
            return component._requestFinish(component.cancelValue, "cancelled");
        };

        component.accept = function () {
            var value = true;
            if (type === "singleChoice") {
                value = component.selectedIndex;
            } else if (type === "multiChoice") {
                value = component.selectedIndices();
            }
            return component._requestFinish(value, "accepted");
        };

        component._onClose = function (reason) {
            if (!component._resolved) {
                component._resolved = true;
                resolvePromise(component.cancelValue);
            }
            if (typeof config.onClose === "function") {
                config.onClose(reason, component);
            }
        };

        component._render = function () {
            var popupName = component.title + "###imgui-dialog-" + type + "-" + id;
            if (!component._opened) {
                api.openPopup(popupName);
                component._opened = true;
            }
            api.setNextWindowSize(dialogWidth, 0, api.Cond.Appearing);
            var visible = api.withPopupModal(
                popupName,
                component.open,
                api.WindowFlags.AlwaysAutoResize |
                    api.WindowFlags.NoSavedSettings |
                    dialogFlags,
                function () {
                    component._insideModal = true;
                    try {
                        if (component._pendingFinish) {
                            var pending = component._pendingFinish;
                            component._pendingFinish = null;
                            api.closeCurrentPopup();
                            component._finish(pending.value, pending.reason);
                            return;
                        }
                        if (component.message) {
                            api.textWrapped(component.message);
                            api.spacing();
                        }
                        if (type === "singleChoice") {
                            for (var itemIndex = 0; itemIndex < component.items.length; itemIndex += 1) {
                                var item = component.items[itemIndex];
                                var label = item != null && typeof item === "object" && item.label != null
                                    ? item.label
                                    : item;
                                if (api.selectable(
                                    String(label) + "###choice-" + itemIndex,
                                    component.selectedIndex === itemIndex,
                                    0,
                                    0,
                                    0
                                )) {
                                    component.selectedIndex = itemIndex;
                                    if (typeof config.onChoice === "function") {
                                        config.onChoice(itemIndex, item, component);
                                    }
                                    if (config.autoAccept === true) {
                                        component.accept();
                                        return;
                                    }
                                }
                            }
                            api.spacing();
                        } else if (type === "multiChoice") {
                            for (var multiIndex = 0; multiIndex < component.items.length; multiIndex += 1) {
                                var multiItem = component.items[multiIndex];
                                var multiLabel = multiItem != null && typeof multiItem === "object" &&
                                    multiItem.label != null ? multiItem.label : multiItem;
                                if (api.checkbox(
                                    String(multiLabel) + "###multi-choice-" + multiIndex,
                                    component.choiceRefs[multiIndex]
                                ) && typeof config.onChoice === "function") {
                                    config.onChoice(
                                        multiIndex,
                                        component.choiceRefs[multiIndex].value,
                                        multiItem,
                                        component
                                    );
                                }
                            }
                            api.spacing();
                        }
                        if (type !== "alert") {
                            if (api.button(String(config.cancelLabel || "Cancel") + "###cancel")) {
                                component.cancel();
                                return;
                            }
                            api.sameLine();
                        }
                        if (api.button(String(config.okLabel || "OK") + "###ok")) {
                            component.accept();
                        }
                    } finally {
                        component._insideModal = false;
                    }
                }
            );
            if (!component.open.value && !component._resolved) {
                component._finish(component.cancelValue, "dismissed");
            } else if (!visible && component._opened && component._pendingFinish && !component._resolved) {
                var pending = component._pendingFinish;
                component._pendingFinish = null;
                component._finish(pending.value, pending.reason);
            }
        };

        promise.controller = component;
        promise.cancel = function () { component.cancel(); return promise; };
        promise.accept = function () { component.accept(); return promise; };
        return component;
    }

    function parseMessageDialog(type, args) {
        var config = {};
        if (typeof args[1] === "string") {
            config.title = String(args[0]);
            config.message = String(args[1]);
            copyOwnProperties(config, args[2]);
        } else {
            config.message = String(args[0] == null ? "" : args[0]);
            copyOwnProperties(config, args[1]);
        }
        if (!config.title) {
            config.title = type === "confirm" ? "Confirm" : "Alert";
        }
        config.cancelValue = false;
        return config;
    }

    api.alert = function () {
        var component = createDialog(null, "alert", parseMessageDialog("alert", arguments));
        return component.promise;
    };

    api.confirm = function () {
        var component = createDialog(null, "confirm", parseMessageDialog("confirm", arguments));
        return component.promise;
    };

    function parseChoiceDialog(type, args) {
        var config = {};
        var selected;
        if (typeof args[0] === "string" && args[1] != null &&
            typeof args[1].length === "number"
        ) {
            config.title = String(args[0]);
            config.items = args[1];
            selected = args[2];
            copyOwnProperties(config, args[3]);
        } else {
            config.items = args[0];
            selected = args[1];
            if (selected != null && typeof selected === "object" &&
                !Array.isArray(selected) && typeof selected.length !== "number"
            ) {
                copyOwnProperties(config, selected);
                selected = config.selected;
            } else {
                copyOwnProperties(config, args[2]);
            }
        }
        config.title = String(config.title || (type === "multiChoice" ? "Choose" : "Choose one"));
        config.items = config.items == null ? [] : Array.prototype.slice.call(config.items);
        config.selected = selected == null ? config.selected : selected;
        config.cancelValue = type === "multiChoice" ? null : -1;
        return config;
    }

    function openSingleChoice(session, args) {
        var config = parseChoiceDialog("singleChoice", args);
        var selectedIndex = argInt(
            "singleChoice", "selected", config.selected, -1, -1, config.items.length - 1
        );
        var component = createDialog(session, "singleChoice", config);
        component.items = config.items;
        component.selectedIndex = selectedIndex;
        return component.promise;
    }

    function openMultiChoice(session, args) {
        var config = parseChoiceDialog("multiChoice", args);
        var selected = config.selected || [];
        var booleanSelection = selected.length === config.items.length &&
            (selected.length === 0 || isBooleanLike(selected[0]));
        var selectedIndices = {};
        if (!booleanSelection) {
            for (var selectedIndex = 0; selectedIndex < selected.length; selectedIndex += 1) {
                selectedIndices[argInt(
                    "multiChoice", "selected[" + selectedIndex + "]", selected[selectedIndex],
                    undefined, 0, config.items.length - 1
                )] = true;
            }
        }
        var component = createDialog(session, "multiChoice", config);
        component.items = config.items;
        component.choiceRefs = [];
        for (var itemIndex = 0; itemIndex < component.items.length; itemIndex += 1) {
            var isSelected = booleanSelection
                ? Boolean(selected[itemIndex])
                : selectedIndices[itemIndex] === true;
            component.choiceRefs.push(valueRef(isSelected));
        }
        component.selectedIndices = function () {
            var result = [];
            for (var choiceIndex = 0; choiceIndex < component.choiceRefs.length; choiceIndex += 1) {
                if (component.choiceRefs[choiceIndex].value) {
                    result.push(choiceIndex);
                }
            }
            return result;
        };
        return component.promise;
    }

    api.singleChoice = function () {
        return openSingleChoice(null, arguments);
    };

    api.multiChoice = function () {
        return openMultiChoice(null, arguments);
    };

    function createStatsOverlay(session, id, options) {
        session = requireHighLevelSession("statsOverlay", session);
        options = options || {};
        var resolvedId = String(id == null ? "default" : id);
        var existing = findHighLevelComponent(session, "statsOverlay", resolvedId);
        if (existing) {
            return existing;
        }
        var historySize = argInt("statsOverlay", "options.historySize", options.historySize, 120, 10);
        var margin = componentScale(session, "statsOverlay", options, "margin", 12);
        var backgroundAlpha = argNumber(
            "statsOverlay", "options.backgroundAlpha", options.backgroundAlpha, 0.78, 0, 1
        );
        var extraFlags = argInt("statsOverlay", "options.flags", options.flags, 0);
        var warningMs = argNumber("statsOverlay", "options.warningMs", options.warningMs, 16.7, 0);
        var criticalMs = Math.max(
            warningMs,
            argNumber("statsOverlay", "options.criticalMs", options.criticalMs, 33.3, 0)
        );
        var scaleMax = Math.max(
            criticalMs * 1.5,
            argNumber("statsOverlay", "options.scaleMax", options.scaleMax, criticalMs * 1.5, 0)
        );
        var plotWidth = componentScale(session, "statsOverlay", options, "plotWidth", 190);
        var plotHeight = componentScale(session, "statsOverlay", options, "plotHeight", 48);
        var component = createHighLevelComponent(session, "statsOverlay", resolvedId, options);
        component.frameTimes = [];
        component.historySize = historySize;
        component.fps = 0;
        component.frameTime = 0;
        component.workTime = 0;
        component.snapshot = function () {
            return {
                fps: component.fps,
                frameTime: component.frameTime,
                workTime: component.workTime,
                history: component.frameTimes.slice()
            };
        };
        component._render = function () {
            component.fps = Math.max(0, api.framerate());
            // frameTime is the interval between frames (1000 / fps); workTime is what the previous frame spent in
            // the render callback and the components, the part a slow script makes longer.
            component.frameTime = component.fps > 0 ? 1000 / component.fps : 0;
            component.workTime = session._workTime;
            component.frameTimes.push(component.frameTime);
            if (component.frameTimes.length > component.historySize) {
                component.frameTimes.splice(0, component.frameTimes.length - component.historySize);
            }
            setAnchoredWindowPosition(
                session,
                options.position || api.ToastPosition.TopLeft,
                margin,
                api.Cond.Always,
                0
            );
            api.setNextWindowBgAlpha(backgroundAlpha);
            var flags = api.WindowFlags.NoDecoration |
                api.WindowFlags.AlwaysAutoResize |
                api.WindowFlags.NoSavedSettings |
                api.WindowFlags.NoFocusOnAppearing |
                api.WindowFlags.NoMove |
                api.WindowFlags.NoNav;
            if (options.interactive !== true) {
                flags |= api.WindowFlags.NoInputs;
            }
            flags |= extraFlags;
            api.withWindow("###imgui-stats-overlay-" + resolvedId, null, flags, function () {
                var color = component.frameTime > criticalMs
                    ? [1, 0.28, 0.28, 1]
                    : component.frameTime > warningMs
                        ? [1, 0.72, 0.18, 1]
                        : [0.30, 0.92, 0.48, 1];
                api.textColored(
                    color[0], color[1], color[2], color[3],
                    component.fps.toFixed(1) + " FPS  /  " + component.frameTime.toFixed(2) + " ms"
                );
                api.textDisabled("Work " + component.workTime.toFixed(2) + " ms");
                if (options.showPlot !== false) {
                    api.plotLines(
                        "##imgui-frame-times-" + resolvedId,
                        floatArray(component.frameTimes),
                        {
                            overlay: String(options.overlay || "Frame time"),
                            scaleMin: 0,
                            scaleMax: scaleMax,
                            width: plotWidth,
                            height: plotHeight
                        }
                    );
                }
            });
        };
        component._onClose = function (reason) {
            if (typeof options.onClose === "function") {
                options.onClose(reason, component);
            }
        };
        return component;
    }

    api.statsOverlay = function (id, options) {
        if (id != null && typeof id === "object") {
            options = id;
            id = options.id;
        }
        return createStatsOverlay(null, id, options);
    };

    function normalizeDataTableHeaders(headers) {
        var source = headers == null ? [] : headers;
        var result = [];
        for (var index = 0; index < source.length; index += 1) {
            var header = source[index];
            if (header != null && typeof header === "object") {
                var name = "headers[" + index + "]";
                result.push({
                    key: header.key == null ? index : header.key,
                    label: String(header.label == null ? header.key : header.label),
                    flags: argInt("dataTable", name + ".flags", header.flags, 0),
                    width: argNumber(
                        "dataTable", name + ".width", header.width,
                        argNumber("dataTable", name + ".weight", header.weight, 0, 0),
                        0
                    ),
                    compare: header.compare == null ? null : argFunction("dataTable", name + ".compare", header.compare)
                });
            } else {
                result.push({
                    key: String(header),
                    label: String(header),
                    flags: 0,
                    width: 0,
                    compare: null
                });
            }
        }
        if (result.length === 0) {
            result.push({key: 0, label: "Value", flags: 0, width: 0, compare: null});
        }
        return result;
    }

    // Default order of two non-empty cells of a sortable dataTable column: numbers by value, other values as strings.
    function compareDataTableValues(left, right) {
        var numeric = isNumberLike(left) && isNumberLike(right);
        var a = numeric ? Number(left) : String(left);
        var b = numeric ? Number(right) : String(right);
        return a < b ? -1 : a > b ? 1 : 0;
    }

    function createDataTable(session, id, headers, rows, options) {
        session = requireHighLevelSession("dataTable", session);
        options = options || {};
        var resolvedId = String(id == null ? "default" : id);
        var existing = findHighLevelComponent(session, "dataTable", resolvedId);
        if (existing) {
            return existing;
        }
        var normalizedHeaders = normalizeDataTableHeaders(headers);
        var tableFlags = options.tableFlags == null
            ? api.TableFlags.Resizable |
                api.TableFlags.RowBg |
                api.TableFlags.Borders |
                api.TableFlags.ScrollY
            : argInt("dataTable", "options.tableFlags", options.tableFlags);
        var sortable = options.sortable === true;
        if (sortable) {
            tableFlags |= api.TableFlags.Sortable;
        }
        var tableHeight = componentScale(session, "dataTable", options, "tableHeight", 0);
        var rowHeight = argNumber("dataTable", "options.rowHeight", options.rowHeight, 0, 0);
        var selectableFlags = argInt("dataTable", "options.selectableFlags", options.selectableFlags, 0);
        var margin = componentScale(session, "dataTable", options, "margin", 12);
        var windowWidth = componentScale(session, "dataTable", options, "width", 520);
        var windowHeight = componentScale(session, "dataTable", options, "height", 340);
        var windowFlags = argInt("dataTable", "options.flags", options.flags, 0);
        var component = createHighLevelComponent(session, "dataTable", resolvedId, options);
        component.headers = normalizedHeaders;
        component.rows = [];
        component.open = valueRef(options.open !== false);
        component.multiSelect = options.multiSelect === true;
        component.sortable = sortable;
        component._records = [];
        component._selected = {};
        // Set when rows change, so a sortable table sorts them again with the current specs.
        component._sortPending = false;

        function rowKey(row, index) {
            if (typeof options.rowKey === "function") {
                return options.rowKey(row, index);
            }
            if (typeof options.rowKey === "string" && row != null && typeof row === "object") {
                return row[options.rowKey];
            }
            if (row != null && typeof row === "object" && row.id != null) {
                return row.id;
            }
            return index;
        }

        function refreshRows() {
            component.rows.length = 0;
            for (var recordIndex = 0; recordIndex < component._records.length; recordIndex += 1) {
                component.rows.push(component._records[recordIndex].row);
            }
        }

        function createRecord(row) {
            return {
                uid: String(session._highLevel.nextRowId++),
                row: row
            };
        }

        function recordIndexFor(target) {
            if (isNumberLike(target) && target % 1 === 0 &&
                target >= 0 && target < component._records.length
            ) {
                return Number(target);
            }
            for (var index = 0; index < component._records.length; index += 1) {
                var row = component._records[index].row;
                if (row === target || rowKey(row, index) === target) {
                    return index;
                }
            }
            return -1;
        }

        function emitRowsChanged(action, row, index) {
            if (typeof options.onRowsChanged === "function") {
                options.onRowsChanged(component.rows.slice(), action, row, index, component);
            }
        }

        function emitSelectionChanged() {
            if (typeof options.onSelectionChanged === "function") {
                options.onSelectionChanged(
                    component.selectedRows(),
                    component.selectedIndices(),
                    component
                );
            }
        }

        component.setRows = function (nextRows) {
            component._records.length = 0;
            component._selected = {};
            var source = nextRows == null ? [] : nextRows;
            for (var index = 0; index < source.length; index += 1) {
                component._records.push(createRecord(source[index]));
            }
            component._sortPending = true;
            refreshRows();
            emitRowsChanged("set", null, -1);
            emitSelectionChanged();
            return component;
        };

        component.getRows = function () {
            return component.rows.slice();
        };

        component.addRow = function (row, index) {
            var insertIndex = argInt(
                "DataTable.addRow", "index", index,
                component._records.length, 0, component._records.length
            );
            component._records.splice(insertIndex, 0, createRecord(row));
            component._sortPending = true;
            refreshRows();
            emitRowsChanged("add", row, insertIndex);
            return insertIndex;
        };

        component.updateRow = function (target, update) {
            var index = recordIndexFor(target);
            if (index < 0) {
                return null;
            }
            var current = component._records[index].row;
            var next = typeof update === "function" ? update(current, index, component) : update;
            if (next == null) {
                next = current;
            } else if (current != null && next !== current &&
                typeof current === "object" && typeof next === "object" &&
                !Array.isArray(current) && !Array.isArray(next)
            ) {
                copyOwnProperties(current, next);
                next = current;
            }
            component._records[index].row = next;
            component._sortPending = true;
            refreshRows();
            emitRowsChanged("update", next, index);
            return next;
        };

        component.removeRow = function (target) {
            var index = recordIndexFor(target);
            if (index < 0) {
                return null;
            }
            var record = component._records.splice(index, 1)[0];
            delete component._selected[record.uid];
            refreshRows();
            emitRowsChanged("remove", record.row, index);
            emitSelectionChanged();
            return record.row;
        };
        component.deleteRow = component.removeRow;

        component.clearRows = function () {
            component._records.length = 0;
            component._selected = {};
            refreshRows();
            emitRowsChanged("clear", null, -1);
            emitSelectionChanged();
            return component;
        };
        component.clear = component.clearRows;

        component.isSelected = function (target) {
            var index = recordIndexFor(target);
            return index >= 0 && Boolean(component._selected[component._records[index].uid]);
        };

        component.selectRow = function (target, selected) {
            var index = recordIndexFor(target);
            if (index < 0) {
                return component;
            }
            var uid = component._records[index].uid;
            var nextSelected = selected == null ? !component._selected[uid] : Boolean(selected);
            if (!component.multiSelect) {
                component._selected = {};
            }
            if (nextSelected) {
                component._selected[uid] = true;
            } else {
                delete component._selected[uid];
            }
            emitSelectionChanged();
            return component;
        };

        component.clearSelection = function () {
            component._selected = {};
            emitSelectionChanged();
            return component;
        };

        component.selectedIndices = function () {
            var result = [];
            for (var index = 0; index < component._records.length; index += 1) {
                if (component._selected[component._records[index].uid]) {
                    result.push(index);
                }
            }
            return result;
        };

        component.selectedRows = function () {
            var result = [];
            for (var index = 0; index < component._records.length; index += 1) {
                if (component._selected[component._records[index].uid]) {
                    result.push(component._records[index].row);
                }
            }
            return result;
        };

        component.removeSelected = function () {
            var removed = [];
            for (var index = component._records.length - 1; index >= 0; index -= 1) {
                var record = component._records[index];
                if (component._selected[record.uid]) {
                    removed.unshift(record.row);
                    component._records.splice(index, 1);
                }
            }
            component._selected = {};
            refreshRows();
            if (removed.length > 0) {
                emitRowsChanged("removeSelected", removed, -1);
            }
            emitSelectionChanged();
            return removed;
        };

        function emptyRow() {
            var useArray = component.rows.length > 0 && Array.isArray(component.rows[0]);
            if (useArray) {
                var arrayRow = [];
                for (var arrayIndex = 0; arrayIndex < component.headers.length; arrayIndex += 1) {
                    arrayRow.push("");
                }
                return arrayRow;
            }
            var objectRow = {};
            for (var objectIndex = 0; objectIndex < component.headers.length; objectIndex += 1) {
                objectRow[component.headers[objectIndex].key] = "";
            }
            return objectRow;
        }

        function rawCellValue(row, header, columnIndex) {
            if (Array.isArray(row) || row != null && typeof row.length === "number" &&
                typeof row !== "string"
            ) {
                return row[columnIndex];
            }
            if (row != null && typeof row === "object") {
                return row[header.key];
            }
            return columnIndex === 0 ? row : undefined;
        }

        function cellValue(row, header, columnIndex) {
            var value = rawCellValue(row, header, columnIndex);
            if (typeof options.formatCell === "function") {
                value = options.formatCell(value, row, header, columnIndex, component);
            }
            return value == null ? "" : String(value);
        }

        function renderToolbar() {
            if (options.toolbar === false) {
                return;
            }
            var labels = options.labels || {};
            if (api.smallButton(String(labels.add || "Add") + "###add-row")) {
                var nextRow = typeof options.onAdd === "function"
                    ? options.onAdd(component)
                    : typeof options.createRow === "function"
                        ? options.createRow(component)
                        : emptyRow();
                if (nextRow !== false && nextRow !== undefined) {
                    component.addRow(nextRow);
                }
            }
            api.sameLine();
            var selectedRows = component.selectedRows();
            api.withDisabled(selectedRows.length === 0, function () {
                if (api.smallButton(String(labels.remove || "Remove") + "###remove-row")) {
                    component.removeSelected();
                }
            });
            if (typeof options.onEdit === "function") {
                api.sameLine();
                api.withDisabled(selectedRows.length !== 1, function () {
                    if (api.smallButton(String(labels.edit || "Edit") + "###edit-row")) {
                        var selectedIndices = component.selectedIndices();
                        var edited = options.onEdit(
                            selectedRows[0], selectedIndices[0], component
                        );
                        if (edited !== undefined && edited !== false) {
                            component.updateRow(selectedIndices[0], edited);
                        }
                    }
                });
            }
            api.sameLine();
            api.withDisabled(component.rows.length === 0, function () {
                if (api.smallButton(String(labels.clear || "Clear") + "###clear-rows")) {
                    component.clearRows();
                }
            });
            api.separator();
        }

        // Stable sort of the rows by the specs (R3.3); with no spec (TableFlags.SortTristate) the rows go back to the
        // order they were created in.
        function sortRecords(specs) {
            var decorated = [];
            for (var index = 0; index < component._records.length; index += 1) {
                decorated.push({record: component._records[index], index: index});
            }
            decorated.sort(function (left, right) {
                for (var specIndex = 0; specIndex < specs.length; specIndex += 1) {
                    var spec = specs[specIndex];
                    var header = component.headers[spec.columnIndex];
                    if (header == null) {
                        continue;
                    }
                    var a = rawCellValue(left.record.row, header, spec.columnIndex);
                    var b = rawCellValue(right.record.row, header, spec.columnIndex);
                    if (!header.compare && (a == null) !== (b == null)) {
                        // Without a compare function empty cells come last in either direction.
                        return a == null ? 1 : -1;
                    }
                    var result = header.compare
                        ? Number(header.compare(a, b, left.record.row, right.record.row)) || 0
                        : (a == null ? 0 : compareDataTableValues(a, b));
                    if (result !== 0) {
                        return spec.sortDirection === api.SortDirection.Descending ? -result : result;
                    }
                }
                return specs.length === 0
                    ? Number(left.record.uid) - Number(right.record.uid)
                    : left.index - right.index;
            });
            for (var position = 0; position < decorated.length; position += 1) {
                component._records[position] = decorated[position].record;
            }
            refreshRows();
            emitRowsChanged("sort", null, -1);
        }

        component.renderTable = function () {
            renderToolbar();
            api.withTable(
                "##imgui-data-table-" + resolvedId,
                component.headers.length,
                tableFlags,
                0,
                tableHeight,
                function () {
                    for (var headerIndex = 0; headerIndex < component.headers.length; headerIndex += 1) {
                        var header = component.headers[headerIndex];
                        api.tableSetupColumn(header.label, header.flags, header.width, headerIndex);
                    }
                    if (sortable) {
                        var sortSpecs = api.tableGetSortSpecs();
                        if (sortSpecs != null && (sortSpecs.specsDirty || component._sortPending)) {
                            component._sortPending = false;
                            sortRecords(sortSpecs.specs);
                        }
                    }
                    if (options.freezeHeader !== false) {
                        api.tableSetupScrollFreeze(0, 1);
                    }
                    if (options.showHeaders !== false) {
                        api.tableHeadersRow();
                    }
                    for (var rowIndex = 0; rowIndex < component._records.length; rowIndex += 1) {
                        var record = component._records[rowIndex];
                        var row = record.row;
                        api.tableNextRow(0, rowHeight);
                        for (var columnIndex = 0; columnIndex < component.headers.length; columnIndex += 1) {
                            api.tableSetColumnIndex(columnIndex);
                            var header = component.headers[columnIndex];
                            var value = cellValue(row, header, columnIndex);
                            if (columnIndex === 0 && options.selectable !== false) {
                                var clicked = api.selectable(
                                    value + "###row-" + record.uid,
                                    Boolean(component._selected[record.uid]),
                                    api.SelectableFlags.SpanAllColumns | selectableFlags,
                                    0,
                                    rowHeight
                                );
                                if (clicked) {
                                    component.selectRow(rowIndex);
                                    if (typeof options.onRowClick === "function") {
                                        options.onRowClick(row, rowIndex, component);
                                    }
                                }
                                if (typeof options.onRowDoubleClick === "function" &&
                                    api.isItemHovered(0) && api.isMouseDoubleClicked(0)
                                ) {
                                    options.onRowDoubleClick(row, rowIndex, component);
                                }
                            } else {
                                var rendered = false;
                                if (typeof options.renderCell === "function") {
                                    rendered = options.renderCell(
                                        value, row, header, rowIndex, columnIndex, component
                                    ) === true;
                                }
                                if (!rendered) {
                                    api.text(value);
                                }
                            }
                        }
                    }
                    if (component._records.length === 0) {
                        api.tableNextRow();
                        api.tableSetColumnIndex(0);
                        api.textDisabled(String(options.emptyText || "No rows"));
                    }
                }
            );
            return component;
        };

        component._render = function () {
            if (!component.open.value) {
                component.close("window-closed");
                return;
            }
            if (options.position != null) {
                setAnchoredWindowPosition(
                    session,
                    options.position,
                    margin,
                    api.Cond.FirstUseEver,
                    0
                );
            }
            api.setNextWindowSize(windowWidth, windowHeight, api.Cond.FirstUseEver);
            var title = String(options.title == null ? resolvedId : options.title) +
                "###imgui-data-table-window-" + resolvedId;
            api.withWindow(title, component.open, windowFlags, function () {
                component.renderTable();
            });
            if (!component.open.value) {
                component.close("window-closed");
            }
        };
        component._onClose = function (reason) {
            if (typeof options.onClose === "function") {
                options.onClose(reason, component);
            }
        };
        component.setRows(rows || []);
        return component;
    }

    api.dataTable = function (id, headers, rows, options) {
        return createDataTable(null, id, headers, rows, options);
    };

    api.createWindow = function (renderCallback, options) {
        if (typeof renderCallback !== "function") {
            throw new TypeError(argumentLabel("createWindow", "renderCallback") + " must be a function");
        }

        options = options || {};
        var initialTheme = options.theme == null ? null : resolveThemeName(options.theme, "createWindow", "options.theme");
        var appearanceName = options.appearance == null
            ? null
            : resolveAppearanceName(options.appearance, "createWindow", "options.appearance");
        var initialStyle = {};
        var initialShadow = null;
        if (appearanceName) {
            copyOwnProperties(initialStyle, APPEARANCE_DEFINITIONS[appearanceName].style);
            initialShadow = APPEARANCE_DEFINITIONS[appearanceName].shadow;
        }
        if (options.rounding != null) {
            var commonRounding = argNumber("createWindow", "options.rounding", options.rounding, undefined, 0);
            initialStyle.windowRounding = commonRounding;
            initialStyle.childRounding = commonRounding;
            initialStyle.popupRounding = commonRounding;
            initialStyle.frameRounding = commonRounding;
            initialStyle.scrollbarRounding = commonRounding;
            initialStyle.grabRounding = commonRounding;
            initialStyle.tabRounding = commonRounding;
            initialStyle.menuItemRounding = commonRounding;
        }
        if (options.borderSize != null) {
            var commonBorderSize = argNumber(
                "createWindow", "options.borderSize", options.borderSize, undefined, 0
            );
            initialStyle.windowBorderSize = commonBorderSize;
            initialStyle.childBorderSize = commonBorderSize;
            initialStyle.popupBorderSize = commonBorderSize;
            initialStyle.frameBorderSize = commonBorderSize;
        }
        for (var directStyleName in api.StyleVar) {
            if (!api.StyleVar.hasOwnProperty(directStyleName)) {
                continue;
            }
            var directOptionName = directStyleName.charAt(0).toLowerCase() + directStyleName.slice(1);
            if (options.hasOwnProperty(directOptionName)) {
                initialStyle[directOptionName] = options[directOptionName];
            }
        }
        copyOwnProperties(initialStyle, options.style);
        copyOwnProperties(initialStyle, options.styleProperties);
        if (options.shadowColor != null) {
            initialShadow = color4(options.shadowColor, null, "createWindow", "options.shadowColor");
        } else if (options.shadow != null) {
            if (options.shadow === false) {
                initialShadow = [0, 0, 0, 0];
            } else if (options.shadow === true) {
                initialShadow = [0, 0, 0, 0.30];
            } else if (isNumberLike(options.shadow)) {
                initialShadow = [
                    0, 0, 0, argNumber("createWindow", "options.shadow", options.shadow, undefined, 0, 1)
                ];
            } else {
                initialShadow = color4(options.shadow, null, "createWindow", "options.shadow");
            }
        }
        if (api._activeSession) {
            api._activeSession.close("replaced");
        }

        // Window geometry options are dp, as session fields and events are; the window manager and the
        // native surface work in px.
        function windowOption(name, fallback, min, max) {
            return argNumber("createWindow", "options." + name, options[name], fallback, min, max);
        }

        function windowPixels(name, fallback, min) {
            return Math.round(windowOption(name, fallback, min) * density);
        }

        // Sizes reported by Android (display metrics, views, surfaces) are px.
        function hostPixels(value, fallback) {
            var pixels = Math.round(Number(value));
            return isFinite(pixels) && pixels > 0 ? pixels : fallback;
        }

        function systemLongPressTimeout() {
            try {
                return clamp(Number(android.view.ViewConfiguration.getLongPressTimeout()), 250, 2000);
            } catch (ignored) {
                return 500;
            }
        }

        function readSystemFontScale() {
            var scale = Number(context.getResources().getConfiguration().fontScale);
            return scale > 0 && isFinite(scale) ? scale : 1;
        }

        var metrics = context.getResources().getDisplayMetrics();
        var density = Number(metrics.density);
        if (!(density > 0) || !isFinite(density)) {
            density = 1;
        }
        api._density = clamp(density, 0.5, 4);
        api._displayDensity = density;
        // fontSize is dp, so the system font scale at the start has no effect; a later change scales the fonts by the
        // ratio to it (R5.2).
        var initialSystemFontScale = readSystemFontScale();
        var systemFontScale = initialSystemFontScale;
        var displayWidth = hostPixels(metrics.widthPixels, 1);
        var displayHeight = hostPixels(metrics.heightPixels, 1);
        var mode = resolveWindowMode(options.mode, "createWindow", "options.mode");
        var activityMode = mode === api.WindowMode.Activity;
        var privilegedMode = mode === api.WindowMode.Privileged;
        var activityLikeMode = activityMode || privilegedMode;
        var privilegedBackend = String(
            options.privilegedBackend == null
                ? (options.backend == null ? "auto" : options.backend)
                : options.privilegedBackend
        );
        var privilegedTimeout = argInt(
            "createWindow", "options.startupTimeout", options.startupTimeout, 10000, 1, 15000
        );
        var privilegedRotation = 0;
        if (options.rotation != null) {
            privilegedRotation = argInt("createWindow", "options.rotation", options.rotation);
            if (privilegedRotation !== 0 && privilegedRotation !== 90 &&
                privilegedRotation !== 180 && privilegedRotation !== 270
            ) {
                throw new RangeError(
                    argumentLabel("createWindow", "options.rotation") +
                    " must be 0, 90, 180, or 270, got " + options.rotation
                );
            }
        } else {
            try {
                var displayRotation = context.getSystemService(android.content.Context.WINDOW_SERVICE)
                    .getDefaultDisplay().getRotation();
                privilegedRotation = [0, 90, 180, 270][Number(displayRotation)] || 0;
            } catch (ignored) {
                privilegedRotation = 0;
            }
        }
        var requestedWidth = Math.max(
            1,
            options.width != null ? windowPixels("width", undefined, 1) : windowPixels("w", 360, 1)
        );
        var requestedHeight = Math.max(
            1,
            options.height != null ? windowPixels("height", undefined, 1) : windowPixels("h", 420, 1)
        );
        var width = activityLikeMode ? displayWidth : Math.min(requestedWidth, displayWidth);
        var height = activityLikeMode ? displayHeight : Math.min(requestedHeight, displayHeight);
        var margin = Math.round(12 * density);
        var x = 0;
        var y = 0;
        if (!activityLikeMode) {
            x = clamp(
                options.x == null ? displayWidth - width - margin : windowPixels("x"),
                0,
                Math.max(0, displayWidth - width)
            );
            y = clamp(
                options.y == null ? displayHeight - height - Math.round(72 * density) : windowPixels("y"),
                0,
                Math.max(0, displayHeight - height)
            );
        }
        var debug = options.debug === true;
        var fps = argInt("createWindow", "options.fps", options.fps, 60, 15, 120);
        var frameDelay = Math.max(1, Math.round(1000 / fps));
        var collapsedFps = argInt("createWindow", "options.collapsedFps", options.collapsedFps, 5, 1, 15);
        var collapsedFrameDelay = Math.max(1, Math.round(1000 / collapsedFps));
        // Power saving (R2.2): idleDelay ms after the last input the loop renders at idleFps (0 keeps the full
        // rate); while the screen is off or locked it only ticks once a second to notice the screen coming back.
        var idleFps = argInt("createWindow", "options.idleFps", options.idleFps, 10, 0, 120);
        var idleDelay = argInt("createWindow", "options.idleDelay", options.idleDelay, 3000, 100, 3600000);
        var pausedTickDelay = 1000;
        var movable = !activityLikeMode && options.movable !== false;
        var fontPath = options.fontPath == null ? null : String(options.fontPath);
        var fontSize = windowOption("fontSize", 16, 8, 64);
        var systemCjkFont = options.systemCjkFont === true;
        var configuredFonts = options.fonts == null ? [] : options.fonts;
        if (isStringLike(configuredFonts) || typeof configuredFonts.length !== "number") {
            throw new TypeError(
                argumentLabel("createWindow", "options.fonts") + " must be an array of font definitions"
            );
        }
        if (configuredFonts.length > 16) {
            throw new RangeError(
                argumentLabel("createWindow", "options.fonts") + " accepts at most 16 fonts, got " +
                configuredFonts.length
            );
        }
        var additionalFontPaths = [];
        var additionalFontSizes = [];
        var fontHandles = {
            Default: api.Fonts.Default,
            CjkFallback: api.Fonts.CjkFallback,
            Icons: api.Fonts.Icons
        };
        var fontAliases = {
            default: api.Fonts.Default,
            cjk: api.Fonts.CjkFallback,
            cjkfallback: api.Fonts.CjkFallback,
            icon: api.Fonts.Icons,
            icons: api.Fonts.Icons
        };
        for (var fontIndex = 0; fontIndex < configuredFonts.length; fontIndex += 1) {
            var fontDefinition = configuredFonts[fontIndex];
            var fontName = "options.fonts[" + fontIndex + "]";
            var additionalPath;
            var additionalSize;
            var fontId;
            if (isStringLike(fontDefinition)) {
                additionalPath = String(fontDefinition);
                additionalSize = fontSize;
                fontId = "font" + (fontIndex + 1);
            } else if (fontDefinition != null && typeof fontDefinition === "object") {
                if (fontDefinition.asset != null) {
                    additionalPath = "asset://" + String(fontDefinition.asset).replace(/^\/+/, "");
                } else {
                    additionalPath = fontDefinition.path == null ? "" : String(fontDefinition.path);
                }
                additionalSize = argNumber(
                    "createWindow", fontName + ".size", fontDefinition.size, fontSize, 8, 128
                );
                fontId = fontDefinition.id == null
                    ? (fontDefinition.name == null ? "font" + (fontIndex + 1) : fontDefinition.name)
                    : fontDefinition.id;
            } else {
                throw new TypeError(
                    argumentLabel("createWindow", fontName) + " must be a path or a font definition object"
                );
            }
            fontId = String(fontId);
            var fontAlias = normalizedKey(fontId);
            if (!fontAlias) {
                throw new TypeError(argumentLabel("createWindow", fontName + ".id") + " must not be empty");
            }
            if (fontAliases.hasOwnProperty(fontAlias)) {
                throw new RangeError(
                    argumentLabel("createWindow", fontName + ".id") + " repeats the font id '" + fontId + "'"
                );
            }
            var resolvedFontIndex = api.Fonts.Icons + 1 + fontIndex;
            additionalFontPaths.push(additionalPath);
            additionalFontSizes.push(additionalSize);
            fontHandles[fontId] = resolvedFontIndex;
            fontAliases[fontAlias] = resolvedFontIndex;
        }
        fontHandles = freeze(fontHandles);
        api._fontAliases = fontAliases;
        var dragThreshold = Math.max(4, windowOption("dragThreshold", 10, 0) * density);
        var imeEnabled = !privilegedMode && options.ime !== false;
        var inputBoxEnabled = privilegedMode && options.ime !== false;
        var pinchZoom = options.pinchZoom === true;
        var flingEnabled = options.fling !== false;
        var flingFriction = windowOption("flingFriction", 5.5, 0.5, 30);
        var flingMinVelocity = windowOption("flingMinVelocity", 80, 0) * density;
        var flingMaxVelocity = Math.max(
            flingMinVelocity, windowOption("flingMaxVelocity", 8000, 0) * density
        );
        var longPressAsRightClick = options.longPressAsRightClick !== false;
        var longPressDuration = options.longPressDuration == null
            ? systemLongPressTimeout()
            : argInt(
                "createWindow", "options.longPressDuration", options.longPressDuration, undefined, 250, 2000
            );
        var longPressSlop = Math.max(4, windowOption("longPressSlop", 10, 0) * density);
        var moreTouch = options.moreTouch === true;
        var touchMode = options.touchMode == null
            ? resolveTouchMode(options.touchable, "createWindow", "options.touchable")
            : resolveTouchMode(options.touchMode, "createWindow", "options.touchMode");
        var globalAlpha = windowOption("alpha", 1, 0, 1);
        var secure = options.secure === true;
        if (privilegedMode && secure) {
            throw new Error("Privileged windows do not yet support secure SurfaceControl layers");
        }
        if (privilegedMode && globalAlpha !== 1) {
            throw new Error("Privileged windows do not yet support host-layer alpha");
        }
        var immersive = options.immersive !== false;
        var responsive = options.responsive !== false;
        var contentAutoResize = options.contentAutoResize !== false && options.autoResize !== false;
        var contentPadding = windowOption("contentPadding", 8, 0) * density;
        var contentMinWidth = windowOption("contentMinWidth", 48, 1) * density;
        var contentMinHeight = windowOption("contentMinHeight", 48, 1) * density;
        var contentMaxWidth = Math.max(
            contentMinWidth,
            options.contentMaxWidth == null
                ? displayWidth
                : windowOption("contentMaxWidth", undefined, 1) * density
        );
        var contentMaxHeight = Math.max(
            contentMinHeight,
            options.contentMaxHeight == null
                ? displayHeight
                : windowOption("contentMaxHeight", undefined, 1) * density
        );
        var iniPath = resolveIniPath(options.iniPath);
        var collapseButtonOptions = options.collapseButton;
        if (collapseButtonOptions != null && !isBooleanLike(collapseButtonOptions) &&
            typeof collapseButtonOptions !== "object"
        ) {
            throw new TypeError(
                argumentLabel("createWindow", "options.collapseButton") + " must be a boolean or an options object"
            );
        }
        var collapseButtonEnabled = !privilegedMode && collapseButtonOptions !== false;
        if (collapseButtonOptions == null || collapseButtonOptions === true) {
            collapseButtonOptions = {};
        }

        var windowObject = null;
        var surfaceView;
        var privilegedSurface = null;
        if (privilegedMode) {
            privilegedSurface = bridge.createPrivilegedSurface(
                privilegedBackend,
                width,
                height,
                privilegedRotation,
                privilegedTimeout
            );
            privilegedBackend = String(bridge.getPrivilegedSurfaceBackend(privilegedSurface));
            surfaceView = new android.view.View(context);
        } else if (activityMode) {
            surfaceView = bridge.createActivitySurface(secure, immersive);
            var activitySize = bridge.getViewSize(surfaceView);
            if (activitySize != null && activitySize.length >= 2 && activitySize[0] > 0 && activitySize[1] > 0) {
                width = hostPixels(activitySize[0], width);
                height = hostPixels(activitySize[1], height);
            }
        } else {
            windowObject = floaty.rawWindow(
                '<frame bg="#00000000"><android.view.SurfaceView id="imgui_surface" w="*" h="*" /></frame>'
            );
            windowObject.setSize(width, height);
            windowObject.setPosition(x, y);
            surfaceView = windowObject.imgui_surface;
        }
        var holder = null;
        if (!privilegedMode) {
            surfaceView.setZOrderOnTop(true);
            holder = surfaceView.getHolder();
            holder.setFormat(PixelFormat.TRANSLUCENT);
        }
        var imeView = null;

        var managedTextures = [];
        var managedButtons = [];
        var highLevelRuntime = createHighLevelRuntime();
        var eventListeners = {};
        // Session events and companion button callbacks run on the thread that created the window, the
        // Looper of the frame callback; one raised on the UI thread (surface, touch) is posted there.
        var scriptThread = java.lang.Thread.currentThread();
        var scriptDispatcher = null;
        try {
            scriptDispatcher = events.emitter(scriptThread);
            scriptDispatcher.on("dispatch", function (action) {
                action();
            });
        } catch (ignored) {
            // Without a thread-bound emitter the callbacks run on the thread that raised them.
            scriptDispatcher = null;
        }

        function runOnScriptThread(action) {
            if (scriptDispatcher == null || java.lang.Thread.currentThread().equals(scriptThread)) {
                action();
            } else {
                scriptDispatcher.emit("dispatch", action);
            }
        }

        function toDp(pixels) {
            return pixels / density;
        }

        function defineReadOnlyFields(target, getters) {
            for (var fieldName in getters) {
                if (getters.hasOwnProperty(fieldName)) {
                    Object.defineProperty(target, fieldName, {
                        get: getters[fieldName],
                        enumerable: true,
                        configurable: false
                    });
                }
            }
        }

        // The mutable session state, positions and sizes in px. The session exposes it as read-only fields
        // with positions and sizes in dp; the setters change it.
        var state = {
            imeView: null,
            displayWidth: displayWidth,
            displayHeight: displayHeight,
            width: width,
            height: height,
            x: x,
            y: y,
            alpha: globalAlpha,
            secure: secure,
            moreTouch: moreTouch,
            touchMode: touchMode,
            touchable: touchMode !== api.TouchMode.Passthrough,
            interactiveRegionCount: 0,
            collapsed: false,
            idle: false,
            paused: false,
            ready: false,
            closed: false,
            closeReason: null,
            theme: initialTheme || api.Themes.Dark
        };
        var session = {
            _textures: managedTextures,
            _buttons: managedButtons,
            _highLevel: highLevelRuntime,
            _closeRequested: false,
            _inFrame: false,
            _frameSerial: 0,
            _workTime: 0,
            _timer: null,
            _nextFrameAt: 0,
            _scheduledFrameDelay: 0,
            _imeTargetVisible: false,
            _imeVisible: false,
            _nativeInitialized: false,
            _surfaceDetached: false,
            _surfaceInitializing: false,
            _preferredWidth: requestedWidth,
            _preferredHeight: requestedHeight,
            _preferredX: x,
            _preferredY: y,
            _expandedBounds: null,
            _collapseButton: null,
            _lastConfigurationCheck: 0,
            _lastDisplayScaleCheck: 0,

            createTexture: function (source, textureOptions) {
                return api.createTexture(source, textureOptions);
            },

            destroyTexture: function (texture) {
                return api.destroyTexture(texture);
            },

            getBackendInfo: function () {
                if (!privilegedMode || privilegedSurface == null) {
                    return "mode=" + mode;
                }
                return String(bridge.getPrivilegedSurfaceInfo(privilegedSurface));
            },

            on: function (eventName, listener) {
                argFunction("Session.on", "listener", listener);
                var key = String(eventName);
                if (!eventListeners[key]) {
                    eventListeners[key] = [];
                }
                eventListeners[key].push(listener);
                return session;
            },

            once: function (eventName, listener) {
                argFunction("Session.once", "listener", listener);
                function onceListener(event) {
                    session.off(eventName, onceListener);
                    listener(event);
                }
                onceListener._originalListener = listener;
                return session.on(eventName, onceListener);
            },

            off: function (eventName, listener) {
                var key = String(eventName);
                var listeners = eventListeners[key];
                if (!listeners) {
                    return session;
                }
                if (listener == null) {
                    delete eventListeners[key];
                    return session;
                }
                for (var listenerIndex = listeners.length - 1; listenerIndex >= 0; listenerIndex -= 1) {
                    if (listeners[listenerIndex] === listener ||
                        listeners[listenerIndex]._originalListener === listener
                    ) {
                        listeners.splice(listenerIndex, 1);
                    }
                }
                if (listeners.length === 0) {
                    delete eventListeners[key];
                }
                return session;
            },

            setPosition: function (nextX, nextY) {
                var resolvedX = nextX == null ? null : argNumber("Session.setPosition", "x", nextX) * density;
                var resolvedY = nextY == null ? null : argNumber("Session.setPosition", "y", nextY) * density;
                if (state.closed || activityLikeMode) {
                    return session;
                }
                applySessionPosition(resolvedX, resolvedY, "api", true);
                return session;
            },

            setSize: function (nextWidth, nextHeight) {
                var resolvedWidth = nextWidth == null
                    ? null
                    : argNumber("Session.setSize", "width", nextWidth, undefined, 1) * density;
                var resolvedHeight = nextHeight == null
                    ? null
                    : argNumber("Session.setSize", "height", nextHeight, undefined, 1) * density;
                if (state.closed) {
                    return session;
                }
                if (activityMode) {
                    refreshActivitySize("api");
                } else if (!privilegedMode) {
                    applySessionSize(resolvedWidth, resolvedHeight, "api", true);
                }
                return session;
            },

            setTouchable: function (nextMode) {
                var resolvedMode = resolveTouchMode(nextMode, "Session.setTouchable", "touchMode");
                if (state.closed) {
                    return session;
                }
                if (state.touchMode !== resolvedMode) {
                    state.touchMode = resolvedMode;
                    applyTouchMode(true);
                }
                return session;
            },

            setMoreTouch: function (enabled) {
                if (state.closed) {
                    return session;
                }
                var resolvedMoreTouch = Boolean(enabled);
                if (state.moreTouch !== resolvedMoreTouch) {
                    state.moreTouch = resolvedMoreTouch;
                    applyHostMoreTouch(resolvedMoreTouch);
                    for (var buttonIndex = 0; buttonIndex < session._buttons.length; buttonIndex += 1) {
                        session._buttons[buttonIndex].setMoreTouch(resolvedMoreTouch);
                    }
                    emitSessionEvent("moreTouchChanged", {enabled: resolvedMoreTouch});
                }
                return session;
            },

            setAlpha: function (nextAlpha) {
                var resolvedAlpha = argNumber("Session.setAlpha", "alpha", nextAlpha, undefined, 0, 1);
                if (state.closed) {
                    return session;
                }
                if (privilegedMode && resolvedAlpha !== 1) {
                    throw new Error("Privileged windows do not yet support host-layer alpha");
                }
                if (state.alpha !== resolvedAlpha) {
                    state.alpha = resolvedAlpha;
                    if (!state.collapsed) {
                        applyHostAlpha(resolvedAlpha);
                    }
                    emitSessionEvent("alphaChanged", {alpha: resolvedAlpha});
                }
                return session;
            },

            setSecure: function (nextSecure) {
                if (state.closed) {
                    return session;
                }
                var resolvedSecure = Boolean(nextSecure);
                if (privilegedMode && resolvedSecure) {
                    throw new Error(
                        "Privileged windows do not yet support secure SurfaceControl layers"
                    );
                }
                if (state.secure !== resolvedSecure) {
                    state.secure = resolvedSecure;
                    bridge.setWindowSecure(surfaceView, resolvedSecure);
                    session._touchRegionSignature = null;
                    for (var buttonIndex = 0; buttonIndex < session._buttons.length; buttonIndex += 1) {
                        session._buttons[buttonIndex].setSecure(resolvedSecure);
                    }
                    emitSessionEvent("secureChanged", {secure: resolvedSecure});
                }
                return session;
            },

            collapse: function () {
                collapseSession();
                return session;
            },

            expand: function () {
                expandSession();
                return session;
            },

            toggleCollapsed: function () {
                return state.collapsed ? session.expand() : session.collapse();
            },

            setFps: function (nextFps) {
                var resolvedFps = argInt("Session.setFps", "fps", nextFps, undefined, 15, 120);
                if (state.closed) {
                    return session;
                }
                fps = resolvedFps;
                frameDelay = Math.max(1, Math.round(1000 / fps));
                rescheduleFrame();
                return session;
            },

            setIdleFps: function (nextIdleFps, nextIdleDelay) {
                var resolvedIdleFps = argInt("Session.setIdleFps", "idleFps", nextIdleFps, undefined, 0, 120);
                var resolvedIdleDelay = argInt(
                    "Session.setIdleFps", "idleDelay", nextIdleDelay, idleDelay, 100, 3600000
                );
                if (state.closed) {
                    return session;
                }
                idleFps = resolvedIdleFps;
                idleDelay = resolvedIdleDelay;
                if (state.idle) {
                    if (idleFps === 0 || inputIdleMillis() < idleDelay) {
                        leaveIdle("api");
                    }
                    rescheduleFrame();
                }
                return session;
            },

            getFps: function () {
                if (state.paused) {
                    return 0;
                }
                if (state.collapsed) {
                    return collapsedFps;
                }
                return state.idle ? Math.min(idleFps, fps) : fps;
            },

            setFontScale: function (scale) {
                var resolvedScale = argNumber("Session.setFontScale", "scale", scale, undefined, 0.5, 3);
                if (!state.closed) {
                    requestFontScale(resolvedScale, "api");
                }
                return session;
            },

            capture: function (captureOptions) {
                var fn = "Session.capture";
                if (captureOptions != null && typeof captureOptions !== "object") {
                    throw new TypeError(argumentLabel(fn, "options") + " must be an object");
                }
                var region = captureOptions == null ? null : captureOptions.region;
                if (region != null && typeof region !== "object") {
                    throw new TypeError(argumentLabel(fn, "options.region") + " must be an object");
                }
                var left = 0;
                var top = 0;
                var right = state.width;
                var bottom = state.height;
                if (region != null) {
                    left = Math.round(argNumber(fn, "options.region.x", region.x, 0, 0) * density);
                    top = Math.round(argNumber(fn, "options.region.y", region.y, 0, 0) * density);
                    if (region.width != null) {
                        right = Math.min(
                            right,
                            left + Math.round(argNumber(fn, "options.region.width", region.width, undefined, 1) * density)
                        );
                    }
                    if (region.height != null) {
                        bottom = Math.min(
                            bottom,
                            top + Math.round(argNumber(fn, "options.region.height", region.height, undefined, 1) * density)
                        );
                    }
                    if (left >= right || top >= bottom) {
                        throw new RangeError(argumentLabel(fn, "options.region") + " is outside the window");
                    }
                }
                if (state.closed || state.collapsed || !state.ready || session._frameSerial === 0) {
                    throw new Error(
                        "imgui.Session.capture: the window is " + (state.closed
                            ? "closed"
                            : (state.collapsed ? "collapsed" : "not showing a frame yet"))
                    );
                }
                if (!privilegedMode) {
                    return wrapCapturedBitmap(
                        bridge.captureSurface(surfaceView, left, top, right - left, bottom - top)
                    );
                }
                if (session._inFrame) {
                    throw new Error(
                        "imgui.Session.capture: a privileged window can only be captured between two frames, " +
                        "for example from setTimeout(fn, 0)"
                    );
                }
                return wrapCapturedBitmap(bridge.captureFrame(left, top, right - left, bottom - top));
            },

            addButtonEx: function (label, callback, buttonOptions) {
                return createFloatingButton(label, callback, buttonOptions);
            },

            logWindow: function (id, componentOptions) {
                return createLogWindow(session, id, componentOptions);
            },

            toast: function (text, duration, componentOptions) {
                return createToast(session, text, duration, componentOptions);
            },

            alert: function () {
                return createDialog(
                    session,
                    "alert",
                    parseMessageDialog("alert", arguments)
                ).promise;
            },

            confirm: function () {
                return createDialog(
                    session,
                    "confirm",
                    parseMessageDialog("confirm", arguments)
                ).promise;
            },

            singleChoice: function () {
                return openSingleChoice(session, arguments);
            },

            multiChoice: function () {
                return openMultiChoice(session, arguments);
            },

            statsOverlay: function (id, componentOptions) {
                if (id != null && typeof id === "object") {
                    componentOptions = id;
                    id = componentOptions.id;
                }
                return createStatsOverlay(session, id, componentOptions);
            },

            dataTable: function (id, headers, rows, componentOptions) {
                return createDataTable(session, id, headers, rows, componentOptions);
            },

            getComponent: function (type, id) {
                return findHighLevelComponent(session, type, id);
            },

            close: function (reason) {
                if (state.closed) {
                    return;
                }
                state.closeReason = reason || "closed";
                session._closeRequested = true;
                if (!session._inFrame) {
                    finalizeClose();
                }
            }
        };

        // Read-only session fields (R1.3): positions and sizes in dp, as the createWindow options are.
        defineReadOnlyFields(session, {
            window: function () { return windowObject; },
            surfaceView: function () { return surfaceView; },
            surface: function () { return privilegedSurface; },
            imeView: function () { return state.imeView; },
            mode: function () { return mode; },
            privilegedBackend: function () { return privilegedMode ? privilegedBackend : null; },
            density: function () { return density; },
            fontScale: function () { return fontScale; },
            displayWidth: function () { return toDp(state.displayWidth); },
            displayHeight: function () { return toDp(state.displayHeight); },
            width: function () { return toDp(state.width); },
            height: function () { return toDp(state.height); },
            x: function () { return toDp(state.x); },
            y: function () { return toDp(state.y); },
            alpha: function () { return state.alpha; },
            secure: function () { return state.secure; },
            moreTouch: function () { return state.moreTouch; },
            touchMode: function () { return state.touchMode; },
            touchable: function () { return state.touchable; },
            interactiveRegionCount: function () { return state.interactiveRegionCount; },
            collapsed: function () { return state.collapsed; },
            idle: function () { return state.idle; },
            paused: function () { return state.paused; },
            fps: function () { return fps; },
            collapsedFps: function () { return collapsedFps; },
            idleFps: function () { return idleFps; },
            idleDelay: function () { return idleDelay; },
            frameScheduler: function () { return "deadline-timer"; },
            iniPath: function () { return iniPath; },
            debug: function () { return debug; },
            ready: function () { return state.ready; },
            closed: function () { return state.closed; },
            closeReason: function () { return state.closeReason; },
            theme: function () {
                return api._activeSession === session && api._theme != null ? api._theme : state.theme;
            },
            appearance: function () { return appearanceName; },
            fonts: function () { return fontHandles; },
            textures: function () { return managedTextures; },
            buttons: function () { return managedButtons; },
            components: function () { return highLevelRuntime.components; }
        });

        var eventOptionNames = {
            moved: "onMoved",
            resized: "onResized",
            ready: "onReady",
            surfaceRestored: "onSurfaceRestored",
            error: "onError",
            collapsed: "onCollapsed",
            expanded: "onExpanded",
            closed: "onClosed",
            configurationChanged: "onConfigurationChanged",
            touchableChanged: "onTouchableChanged",
            moreTouchChanged: "onMoreTouchChanged",
            alphaChanged: "onAlphaChanged",
            secureChanged: "onSecureChanged",
            idle: "onIdle",
            active: "onActive",
            back: "onBack",
            fontScaleChanged: "onFontScaleChanged"
        };
        for (var eventOption in eventOptionNames) {
            if (eventOptionNames.hasOwnProperty(eventOption) &&
                typeof options[eventOptionNames[eventOption]] === "function"
            ) {
                session.on(eventOption, options[eventOptionNames[eventOption]]);
            }
        }
        if (options.events != null && typeof options.events === "object") {
            for (var configuredEvent in options.events) {
                if (options.events.hasOwnProperty(configuredEvent) &&
                    typeof options.events[configuredEvent] === "function"
                ) {
                    session.on(configuredEvent, options.events[configuredEvent]);
                }
            }
        }

        api._activeSession = session;

        // The back key (R3.2) reaches only Activity-mode sessions: an overlay window gets it only while the IME proxy
        // has focus, and then a shown soft keyboard takes it first, as before.
        if (activityMode) {
            bridge.setActivityBackListener(surfaceView, new Runnable({run: handleBackPressed}));
        }

        // Listeners run on the script thread with the listeners registered when the event was raised.
        function emitSessionEvent(eventName, details) {
            var event = {
                type: String(eventName),
                session: session,
                timestamp: Date.now()
            };
            copyOwnProperties(event, details);
            var listeners = eventListeners[eventName];
            if (!listeners || listeners.length === 0) {
                return;
            }
            listeners = listeners.slice();
            runOnScriptThread(function () {
                for (var listenerIndex = 0; listenerIndex < listeners.length; listenerIndex += 1) {
                    try {
                        listeners[listenerIndex](event, session);
                    } catch (error) {
                        if (eventName === "error") {
                            printError("Session 'error' listener", error);
                        } else {
                            reportSessionError("event", "Session '" + eventName + "' listener", error, {
                                event: String(eventName)
                            });
                        }
                    }
                }
            });
        }

        // Raised on the UI thread. The "back" listeners run on the script thread; unless one of them calls
        // event.preventDefault(), the session then closes with the reason "back".
        function handleBackPressed() {
            runOnScriptThread(function () {
                if (state.closed || session._closeRequested) {
                    return;
                }
                var event = {
                    type: "back",
                    session: session,
                    timestamp: Date.now(),
                    defaultPrevented: false,
                    preventDefault: function () {
                        event.defaultPrevented = true;
                    }
                };
                var listeners = (eventListeners.back || []).slice();
                for (var listenerIndex = 0; listenerIndex < listeners.length; listenerIndex += 1) {
                    try {
                        listeners[listenerIndex](event, session);
                    } catch (error) {
                        reportSessionError("event", "Session 'back' listener", error, {event: "back"});
                    }
                }
                if (!event.defaultPrevented && !state.closed) {
                    session.close("back");
                }
            });
        }

        // The next warning counts the slow callbacks left out since the previous one.
        var slowCallbackWarnedAt = 0;
        var slowCallbacksSuppressed = 0;

        function warnSlowRenderCallback(elapsedMs) {
            if (elapsedMs <= SLOW_RENDER_CALLBACK_MS) {
                return;
            }
            var now = Date.now();
            if (slowCallbackWarnedAt !== 0 && now - slowCallbackWarnedAt < SLOW_RENDER_WARNING_INTERVAL_MS) {
                slowCallbacksSuppressed += 1;
                return;
            }
            var suppressed = slowCallbacksSuppressed;
            slowCallbackWarnedAt = now;
            slowCallbacksSuppressed = 0;
            console.warn(
                "[imgui] The render callback blocked the frame for " + Math.round(elapsedMs) + " ms (over " +
                SLOW_RENDER_CALLBACK_MS + " ms); move slow work such as sleep, network or file access to " +
                "threads.start and hand the results to the render callback (docs/THREADING.md)" +
                (suppressed > 0 ? "; " + suppressed + " more slow callbacks since the previous warning" : "")
            );
        }

        var lastReportedError = null;

        function printError(source, error) {
            console.error("[imgui] " + source + " failed: " + error);
            if (error && error.stack) {
                console.error(String(error.stack));
            }
        }

        // An exception of the render callback (phase "render") or of an event callback (phase "event") is printed with
        // its stack, a run of the same error only once (a frame without a render error ends the run), and emitted as
        // "error" every time it happens. Returns whether an "error" listener received it.
        function reportSessionError(phase, source, error, details) {
            var key = phase + "|" + source + "|" + error + "|" + (error && error.stack ? error.stack : "");
            if (lastReportedError === null || lastReportedError.key !== key) {
                printError(source, error);
            }
            lastReportedError = {phase: phase, key: key};
            if (!eventListeners.error || eventListeners.error.length === 0) {
                return false;
            }
            var event = {
                error: error,
                phase: phase,
                frame: session._frameSerial,
                message: String(error && error.message != null ? error.message : error)
            };
            copyOwnProperties(event, details);
            emitSessionEvent("error", event);
            return true;
        }

        session._reportError = reportSessionError;

        // Debug mode: the usage errors Dear ImGui recovered from and the failed assertions of the frame; the native
        // queue drops a message already seen in the previous frame, so a run of the same message prints once.
        function printDebugMessages() {
            var messages = bridge.takeDebugMessages();
            if (messages == null) {
                return;
            }
            for (var messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
                console.warn("[imgui] " + messages[messageIndex]);
            }
        }

        function applyHostAlpha(alpha) {
            if (privilegedMode) {
                return;
            }
            try {
                bridge.setWindowAlpha(surfaceView, alpha);
            } catch (error) {
                console.warn("[imgui] Unable to update host alpha: " + error);
            }
        }

        function applyHostSecure(nextSecure) {
            if (privilegedMode) {
                return;
            }
            try {
                bridge.setWindowSecure(surfaceView, Boolean(nextSecure));
            } catch (error) {
                console.warn("[imgui] Unable to update FLAG_SECURE: " + error);
            }
        }

        function applyHostMoreTouch(enabled) {
            if (privilegedMode) {
                return;
            }
            try {
                bridge.setWindowSplitTouch(surfaceView, Boolean(enabled));
            } catch (error) {
                console.warn("[imgui] Unable to update FLAG_SPLIT_TOUCH: " + error);
            }
        }

        function setHostTouchable(enabled) {
            try {
                if (privilegedMode) {
                    return Boolean(
                        bridge.setPrivilegedInputEnabled(privilegedSurface, Boolean(enabled))
                    );
                }
                if (activityMode) {
                    bridge.setActivityTouchable(surfaceView, Boolean(enabled));
                } else {
                    windowObject.setTouchable(Boolean(enabled));
                }
                return true;
            } catch (error) {
                console.warn("[imgui] Unable to update host touchability: " + error);
                return false;
            }
        }

        function applyTouchMode(emitChange) {
            var previousTouchable = state.touchable;
            var previousRegionCount = state.interactiveRegionCount;
            if (!privilegedMode) {
                try {
                    bridge.clearWindowTouchableRegion(surfaceView);
                } catch (ignored) {
                    // The view can already be detached while a close is in progress.
                }
            }
            session._touchRegionSignature = null;
            state.interactiveRegionCount = 0;
            if (state.collapsed || state.touchMode === api.TouchMode.Passthrough) {
                state.touchable = false;
                setHostTouchable(false);
            } else {
                state.touchable = true;
                setHostTouchable(true);
                if (!privilegedMode && state.touchMode === api.TouchMode.Auto) {
                    try {
                        bridge.setWindowTouchableRegion(surfaceView, floatArray([]));
                        session._touchRegionSignature = "";
                    } catch (error) {
                        console.warn("[imgui] Unable to initialize automatic touch region: " + error);
                    }
                }
            }
            if (emitChange && (previousTouchable !== state.touchable ||
                previousRegionCount !== state.interactiveRegionCount
            )) {
                emitSessionEvent("touchableChanged", {
                    mode: state.touchMode,
                    touchable: state.touchable,
                    interactiveRegionCount: state.interactiveRegionCount
                });
            } else if (emitChange) {
                emitSessionEvent("touchableChanged", {
                    mode: state.touchMode,
                    touchable: state.touchable,
                    interactiveRegionCount: state.interactiveRegionCount
                });
            }
        }

        function updateTouchableRegion() {
            if (privilegedMode || state.closed || state.collapsed || !state.ready || pointerDown ||
                state.touchMode !== api.TouchMode.Auto
            ) {
                return;
            }
            var rectangles = bridge.getInteractiveWindowRects();
            if (rectangles == null) {
                rectangles = floatArray([]);
            }
            var signatureParts = [];
            for (var rectangleIndex = 0; rectangleIndex < rectangles.length; rectangleIndex += 1) {
                signatureParts.push(Math.round((Number(rectangles[rectangleIndex]) || 0) * 2));
            }
            var signature = signatureParts.join(",");
            if (session._touchRegionSignature === signature) {
                return;
            }
            var previousCount = state.interactiveRegionCount;
            if (bridge.setWindowTouchableRegion(surfaceView, rectangles)) {
                session._touchRegionSignature = signature;
                state.interactiveRegionCount = Math.floor(rectangles.length / 4);
                state.touchable = state.interactiveRegionCount > 0;
                if (previousCount !== state.interactiveRegionCount) {
                    emitSessionEvent("touchableChanged", {
                        mode: state.touchMode,
                        touchable: state.touchable,
                        interactiveRegionCount: state.interactiveRegionCount
                    });
                }
            }
        }

        function applySessionPosition(nextX, nextY, source, remember) {
            if (activityLikeMode) {
                return;
            }
            var requestedX = nextX == null ? state.x : Math.round(nextX);
            var requestedY = nextY == null ? state.y : Math.round(nextY);
            var resolvedX = clamp(requestedX, 0, Math.max(0, state.displayWidth - state.width));
            var resolvedY = clamp(requestedY, 0, Math.max(0, state.displayHeight - state.height));
            if (remember) {
                session._preferredX = requestedX;
                session._preferredY = requestedY;
            }
            if (resolvedX === state.x && resolvedY === state.y) {
                return;
            }
            var oldX = state.x;
            var oldY = state.y;
            state.x = resolvedX;
            state.y = resolvedY;
            session._touchRegionSignature = null;
            windowObject.setPosition(resolvedX, resolvedY);
            emitSessionEvent("moved", {
                x: toDp(resolvedX),
                y: toDp(resolvedY),
                oldX: toDp(oldX),
                oldY: toDp(oldY),
                source: source || "api"
            });
        }

        function emitResized(oldWidth, oldHeight, source) {
            emitSessionEvent("resized", {
                width: toDp(state.width),
                height: toDp(state.height),
                oldWidth: toDp(oldWidth),
                oldHeight: toDp(oldHeight),
                source: source
            });
        }

        function applySessionSize(nextWidth, nextHeight, source, remember) {
            if (activityLikeMode) {
                return;
            }
            var requestedNextWidth = Math.max(1, nextWidth == null ? state.width : Math.round(nextWidth));
            var requestedNextHeight = Math.max(1, nextHeight == null ? state.height : Math.round(nextHeight));
            if (remember) {
                session._preferredWidth = requestedNextWidth;
                session._preferredHeight = requestedNextHeight;
            }
            var resolvedWidth = Math.min(requestedNextWidth, Math.max(1, state.displayWidth));
            var resolvedHeight = Math.min(requestedNextHeight, Math.max(1, state.displayHeight));
            if (resolvedWidth === state.width && resolvedHeight === state.height) {
                return;
            }
            var oldWidth = state.width;
            var oldHeight = state.height;
            state.width = resolvedWidth;
            state.height = resolvedHeight;
            session._touchRegionSignature = null;
            if (!state.collapsed) {
                windowObject.setSize(resolvedWidth, resolvedHeight);
            }
            applySessionPosition(state.x, state.y, source || "resize", false);
            emitResized(oldWidth, oldHeight, source || "api");
        }

        // The activity view and the overlay's SurfaceView report their own size.
        function updateSurfaceSize(nextWidth, nextHeight, source) {
            nextWidth = hostPixels(nextWidth, state.width);
            nextHeight = hostPixels(nextHeight, state.height);
            if (nextWidth === state.width && nextHeight === state.height) {
                return false;
            }
            var oldWidth = state.width;
            var oldHeight = state.height;
            state.width = nextWidth;
            state.height = nextHeight;
            emitResized(oldWidth, oldHeight, source);
            return true;
        }

        function refreshActivitySize(source) {
            if (!activityMode || state.closed) {
                return false;
            }
            var size = bridge.getViewSize(surfaceView);
            if (size == null || size.length < 2 || size[0] <= 0 || size[1] <= 0) {
                return false;
            }
            if (!updateSurfaceSize(size[0], size[1], source || "activity")) {
                return false;
            }
            session._preferredWidth = state.width;
            session._preferredHeight = state.height;
            return true;
        }

        // scaleChange: the density and system font scale before a change, from updateDisplayScale.
        function updateConfiguration(force, scaleChange) {
            var now = Date.now();
            if (!force && now - session._lastConfigurationCheck < 250) {
                return;
            }
            session._lastConfigurationCheck = now;
            var currentMetrics = context.getResources().getDisplayMetrics();
            var nextDisplayWidth = hostPixels(currentMetrics.widthPixels, state.displayWidth);
            var nextDisplayHeight = hostPixels(currentMetrics.heightPixels, state.displayHeight);
            var changed = nextDisplayWidth !== state.displayWidth ||
                nextDisplayHeight !== state.displayHeight;
            if (!changed && !force) {
                return;
            }
            var oldDisplayWidth = state.displayWidth;
            var oldDisplayHeight = state.displayHeight;
            state.displayWidth = nextDisplayWidth;
            state.displayHeight = nextDisplayHeight;
            displayWidth = nextDisplayWidth;
            displayHeight = nextDisplayHeight;
            if (options.contentMaxWidth == null) {
                contentMaxWidth = nextDisplayWidth;
            }
            if (options.contentMaxHeight == null) {
                contentMaxHeight = nextDisplayHeight;
            }
            if (activityMode) {
                refreshActivitySize("configuration");
            } else if (privilegedMode) {
                if (changed) {
                    session.close("configuration-changed");
                }
            } else if (responsive || scaleChange != null) {
                applySessionSize(
                    Math.min(session._preferredWidth, nextDisplayWidth),
                    Math.min(session._preferredHeight, nextDisplayHeight),
                    "configuration",
                    false
                );
                applySessionPosition(
                    clamp(session._preferredX, 0, Math.max(0, nextDisplayWidth - state.width)),
                    clamp(session._preferredY, 0, Math.max(0, nextDisplayHeight - state.height)),
                    "configuration",
                    false
                );
            }
            for (var buttonIndex = 0; buttonIndex < session._buttons.length; buttonIndex += 1) {
                session._buttons[buttonIndex]._relayout();
            }
            var oldDensity = scaleChange != null ? scaleChange.density : density;
            emitSessionEvent("configurationChanged", {
                width: toDp(nextDisplayWidth),
                height: toDp(nextDisplayHeight),
                oldWidth: oldDisplayWidth / oldDensity,
                oldHeight: oldDisplayHeight / oldDensity,
                orientation: nextDisplayWidth >= nextDisplayHeight ? "landscape" : "portrait",
                density: density,
                oldDensity: oldDensity,
                fontScale: systemFontScale,
                oldFontScale: scaleChange != null ? scaleChange.fontScale : systemFontScale
            });
        }

        // Density and system font scale (R5.2). Runs on the script thread between two frames, because it changes the
        // native style; the surface callbacks on the UI thread only report display sizes. Windows and buttons keep
        // their size and position in dp.
        function updateDisplayScale() {
            var now = Date.now();
            if (now - session._lastDisplayScaleCheck < 250 || !state.ready || !bridge.isReady()) {
                return;
            }
            session._lastDisplayScaleCheck = now;
            var nextDensity = Number(context.getResources().getDisplayMetrics().density);
            if (!(nextDensity > 0) || !isFinite(nextDensity)) {
                nextDensity = density;
            }
            var nextSystemFontScale = readSystemFontScale();
            if (nextDensity === density && nextSystemFontScale === systemFontScale) {
                return;
            }
            var scaleChange = {density: density, fontScale: systemFontScale};
            var ratio = nextDensity / density;
            density = nextDensity;
            systemFontScale = nextSystemFontScale;
            api._density = clamp(density, 0.5, 4);
            api._displayDensity = density;
            bridge.setDisplayScale(density, systemFontScale / initialSystemFontScale);
            if (ratio !== 1) {
                session._preferredWidth = Math.round(session._preferredWidth * ratio);
                session._preferredHeight = Math.round(session._preferredHeight * ratio);
                session._preferredX = Math.round(session._preferredX * ratio);
                session._preferredY = Math.round(session._preferredY * ratio);
                dragThreshold = Math.max(4, dragThreshold * ratio);
                longPressSlop = Math.max(4, longPressSlop * ratio);
                flingMinVelocity *= ratio;
                flingMaxVelocity *= ratio;
                contentPadding *= ratio;
                contentMinWidth *= ratio;
                contentMinHeight *= ratio;
                if (options.contentMaxWidth != null) {
                    contentMaxWidth *= ratio;
                }
                if (options.contentMaxHeight != null) {
                    contentMaxHeight *= ratio;
                }
                wheelUnit = Math.max(8, fontSize * density * 3);
                pinchThreshold = PINCH_THRESHOLD_DP * density;
                for (var buttonIndex = 0; buttonIndex < session._buttons.length; buttonIndex += 1) {
                    session._buttons[buttonIndex]._rescale(ratio);
                }
            }
            updateConfiguration(true, scaleChange);
        }

        function updateContentAutoSize() {
            if (activityLikeMode || state.collapsed || !contentAutoResize || !state.ready) {
                return;
            }
            var bounds = bridge.getAutoResizeBounds();
            if (bounds == null || bounds.length < 4) {
                return;
            }
            var contentWidth = Number(bounds[2]);
            var contentHeight = Number(bounds[3]);
            if (!isFinite(contentWidth) || !isFinite(contentHeight)) {
                return;
            }
            var targetWidth = clamp(
                Math.ceil(contentWidth + contentPadding),
                contentMinWidth,
                Math.min(contentMaxWidth, state.displayWidth)
            );
            var targetHeight = clamp(
                Math.ceil(contentHeight + contentPadding),
                contentMinHeight,
                Math.min(contentMaxHeight, state.displayHeight)
            );
            if (Math.abs(targetWidth - state.width) >= 2 ||
                Math.abs(targetHeight - state.height) >= 2
            ) {
                applySessionSize(targetWidth, targetHeight, "content", true);
            }
        }

        // Companion buttons take dp options and expose read-only dp fields, as the session does.
        function createFloatingButton(label, callback, buttonOptions) {
            if (state.closed) {
                throw new Error("Cannot add a button to a closed ImGui session");
            }
            if (privilegedMode) {
                throw new Error(
                    "Floating Android companion buttons are unavailable in privileged mode"
                );
            }
            if (callback != null && typeof callback !== "function") {
                if (buttonOptions == null && typeof callback === "object") {
                    buttonOptions = callback;
                    callback = null;
                } else {
                    throw new TypeError(argumentLabel("addButtonEx", "callback") + " must be a function");
                }
            }
            buttonOptions = buttonOptions || {};
            if (buttonOptions.onMoved != null && typeof buttonOptions.onMoved !== "function") {
                throw new TypeError(argumentLabel("addButtonEx", "options.onMoved") + " must be a function");
            }

            function buttonOption(name, fallback, min, max) {
                return argNumber("addButtonEx", "options." + name, buttonOptions[name], fallback, min, max);
            }

            var buttonSize = buttonOption("size", 56, 1);
            var buttonWidth = Math.max(1, Math.round(buttonOption("width", buttonSize, 1) * density));
            var buttonHeight = Math.max(1, Math.round(buttonOption("height", buttonSize, 1) * density));
            var buttonX = clamp(
                buttonOptions.x == null
                    ? state.x + Math.max(0, state.width - buttonWidth)
                    : Math.round(buttonOption("x") * density),
                0,
                Math.max(0, state.displayWidth - buttonWidth)
            );
            var buttonY = clamp(
                buttonOptions.y == null ? state.y : Math.round(buttonOption("y") * density),
                0,
                Math.max(0, state.displayHeight - buttonHeight)
            );
            var buttonAlpha = buttonOption("alpha", 1, 0, 1);
            var backgroundColor = androidColor(
                buttonOptions.backgroundColor,
                [0.345, 0.396, 0.949, 0.92],
                "addButtonEx",
                "options.backgroundColor"
            );
            var borderColor = androidColor(
                buttonOptions.borderColor,
                [1, 1, 1, 0.32],
                "addButtonEx",
                "options.borderColor"
            );
            var textColor = androidColor(buttonOptions.textColor, [1, 1, 1, 1], "addButtonEx", "options.textColor");
            var cornerRadius = buttonOption("rounding", Math.min(buttonWidth, buttonHeight) / density / 2, 0) * density;
            var strokeWidth = Math.round(buttonOption("borderWidth", 1, 0) * density);
            var textSize = buttonOption("textSize", 16, 1);
            var elevation = buttonOption("elevation", 8, 0) * density;
            var buttonDraggable = buttonOptions.draggable !== false;
            // Internal state, positions and sizes in px.
            var button = {
                text: String(label == null ? "" : label),
                x: buttonX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                alpha: buttonAlpha,
                secure: buttonOptions.secure == null ? state.secure : Boolean(buttonOptions.secure),
                moreTouch: buttonOptions.moreTouch == null ? state.moreTouch : Boolean(buttonOptions.moreTouch),
                visible: buttonOptions.visible !== false && buttonOptions.hidden !== true,
                touchable: buttonOptions.touchable !== false,
                closed: false
            };
            var buttonWindow = floaty.rawWindow(
                '<frame bg="#00000000"><text id="imgui_button" w="*" h="*" gravity="center" /></frame>'
            );
            var buttonView = buttonWindow.imgui_button;
            var background = new GradientDrawable();
            background.setShape(GradientDrawable.RECTANGLE);
            background.setColor(backgroundColor);
            background.setCornerRadius(cornerRadius);
            if (strokeWidth > 0) {
                background.setStroke(strokeWidth, borderColor);
            }
            buttonView.setBackground(background);
            buttonView.setText(button.text);
            buttonView.setTextColor(textColor);
            buttonView.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, textSize);
            buttonView.setGravity(Gravity.CENTER);
            if (android.os.Build.VERSION.SDK_INT >= 21) {
                buttonView.setElevation(elevation);
            }
            buttonWindow.setSize(button.visible ? buttonWidth : 1, button.visible ? buttonHeight : 1);
            buttonWindow.setPosition(buttonX, buttonY);

            function moveButton(nextX, nextY, source) {
                if (button.closed) {
                    return;
                }
                var resolvedX = clamp(
                    nextX == null ? button.x : Math.round(nextX),
                    0,
                    Math.max(0, state.displayWidth - button.width)
                );
                var resolvedY = clamp(
                    nextY == null ? button.y : Math.round(nextY),
                    0,
                    Math.max(0, state.displayHeight - button.height)
                );
                if (resolvedX === button.x && resolvedY === button.y) {
                    return;
                }
                button.x = resolvedX;
                button.y = resolvedY;
                buttonWindow.setPosition(resolvedX, resolvedY);
                if (typeof buttonOptions.onMoved === "function") {
                    var movedEvent = {
                        button: floatingButton,
                        session: session,
                        x: toDp(resolvedX),
                        y: toDp(resolvedY),
                        source: source
                    };
                    runOnScriptThread(function () {
                        try {
                            buttonOptions.onMoved(movedEvent);
                        } catch (error) {
                            reportSessionError("event", "Floating button onMoved", error, {
                                event: "buttonMoved",
                                button: floatingButton
                            });
                        }
                    });
                }
            }

            var floatingButton = {
                setPosition: function (nextX, nextY) {
                    var resolvedX = nextX == null ? null : argNumber("Button.setPosition", "x", nextX) * density;
                    var resolvedY = nextY == null ? null : argNumber("Button.setPosition", "y", nextY) * density;
                    moveButton(resolvedX, resolvedY, "api");
                    return floatingButton;
                },

                setText: function (nextText) {
                    if (!button.closed) {
                        button.text = String(nextText == null ? "" : nextText);
                        buttonView.setText(button.text);
                    }
                    return floatingButton;
                },

                setAlpha: function (nextAlpha) {
                    var resolvedAlpha = argNumber("Button.setAlpha", "alpha", nextAlpha, undefined, 0, 1);
                    if (!button.closed) {
                        button.alpha = resolvedAlpha;
                        bridge.setWindowAlpha(buttonView, button.visible ? button.alpha : 0);
                    }
                    return floatingButton;
                },

                setSecure: function (nextSecure) {
                    if (!button.closed) {
                        button.secure = Boolean(nextSecure);
                        bridge.setWindowSecure(buttonView, button.secure);
                    }
                    return floatingButton;
                },

                setMoreTouch: function (enabled) {
                    if (!button.closed) {
                        button.moreTouch = Boolean(enabled);
                        bridge.setWindowSplitTouch(buttonView, button.moreTouch);
                    }
                    return floatingButton;
                },

                setTouchable: function (nextTouchable) {
                    if (!button.closed) {
                        button.touchable = Boolean(nextTouchable);
                        buttonWindow.setTouchable(button.visible && button.touchable);
                    }
                    return floatingButton;
                },

                setVisible: function (visible) {
                    if (button.closed) {
                        return floatingButton;
                    }
                    button.visible = Boolean(visible);
                    if (button.visible) {
                        buttonWindow.setSize(button.width, button.height);
                        buttonWindow.setPosition(button.x, button.y);
                        bridge.setWindowAlpha(buttonView, button.alpha);
                        buttonWindow.setTouchable(button.touchable);
                    } else {
                        buttonWindow.setTouchable(false);
                        bridge.setWindowAlpha(buttonView, 0);
                        buttonWindow.setSize(1, 1);
                    }
                    return floatingButton;
                },

                show: function () {
                    return floatingButton.setVisible(true);
                },

                hide: function () {
                    return floatingButton.setVisible(false);
                },

                close: function () {
                    if (button.closed) {
                        return;
                    }
                    button.closed = true;
                    try {
                        buttonWindow.close();
                    } catch (ignored) {
                        // The host may already have removed the auxiliary window.
                    }
                    var buttonIndex = session._buttons.indexOf(floatingButton);
                    if (buttonIndex >= 0) {
                        session._buttons.splice(buttonIndex, 1);
                    }
                    if (session._collapseButton === floatingButton) {
                        session._collapseButton = null;
                    }
                },

                // Keeps the button on screen after a display change.
                _relayout: function () {
                    moveButton(button.x, button.y, "configuration");
                },

                // Keeps the geometry of the button in dp after a density change.
                _rescale: function (ratio) {
                    if (button.closed) {
                        return;
                    }
                    button.width = Math.max(1, Math.round(button.width * ratio));
                    button.height = Math.max(1, Math.round(button.height * ratio));
                    cornerRadius *= ratio;
                    strokeWidth = Math.round(strokeWidth * ratio);
                    elevation *= ratio;
                    buttonView.post(new Runnable({
                        run: function () {
                            background.setCornerRadius(cornerRadius);
                            if (strokeWidth > 0) {
                                background.setStroke(strokeWidth, borderColor);
                            }
                            buttonView.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, textSize);
                            buttonView.setElevation(elevation);
                        }
                    }));
                    if (button.visible) {
                        buttonWindow.setSize(button.width, button.height);
                    }
                    moveButton(button.x * ratio, button.y * ratio, "configuration");
                }
            };
            defineReadOnlyFields(floatingButton, {
                window: function () { return buttonWindow; },
                view: function () { return buttonView; },
                session: function () { return session; },
                text: function () { return button.text; },
                x: function () { return toDp(button.x); },
                y: function () { return toDp(button.y); },
                width: function () { return toDp(button.width); },
                height: function () { return toDp(button.height); },
                alpha: function () { return button.alpha; },
                secure: function () { return button.secure; },
                moreTouch: function () { return button.moreTouch; },
                visible: function () { return button.visible; },
                touchable: function () { return button.touchable; },
                closed: function () { return button.closed; }
            });

            var buttonDownRawX = 0;
            var buttonDownRawY = 0;
            var buttonOriginX = buttonX;
            var buttonOriginY = buttonY;
            var buttonDragging = false;
            buttonView.setOnTouchListener(function (view, event) {
                if (button.closed || !button.visible || !button.touchable) {
                    return false;
                }
                var action = event.getActionMasked();
                var rawX = event.getRawX();
                var rawY = event.getRawY();
                if (action === MotionEvent.ACTION_DOWN) {
                    buttonDownRawX = rawX;
                    buttonDownRawY = rawY;
                    buttonOriginX = button.x;
                    buttonOriginY = button.y;
                    buttonDragging = false;
                    return true;
                }
                if (action === MotionEvent.ACTION_MOVE) {
                    var deltaX = rawX - buttonDownRawX;
                    var deltaY = rawY - buttonDownRawY;
                    if (buttonDraggable && Math.sqrt(deltaX * deltaX + deltaY * deltaY) >= dragThreshold) {
                        buttonDragging = true;
                    }
                    if (buttonDragging) {
                        moveButton(
                            buttonOriginX + Math.round(deltaX),
                            buttonOriginY + Math.round(deltaY),
                            "drag"
                        );
                    }
                    return true;
                }
                if (action === MotionEvent.ACTION_UP || action === MotionEvent.ACTION_CANCEL) {
                    var clicked = action === MotionEvent.ACTION_UP && !buttonDragging;
                    buttonDragging = false;
                    if (clicked) {
                        noteSessionActivity();
                    }
                    if (clicked && typeof callback === "function") {
                        runOnScriptThread(function () {
                            try {
                                callback(floatingButton, session);
                            } catch (error) {
                                reportSessionError("event", "Floating button callback", error, {
                                    event: "buttonClick",
                                    button: floatingButton
                                });
                            }
                        });
                    }
                    return true;
                }
                return true;
            });

            session._buttons.push(floatingButton);
            floatingButton.setSecure(button.secure);
            floatingButton.setMoreTouch(button.moreTouch);
            floatingButton.setAlpha(button.alpha);
            floatingButton.setVisible(button.visible);
            return floatingButton;
        }

        function showCollapseButton() {
            if (!collapseButtonEnabled) {
                return;
            }
            if (session._collapseButton == null || session._collapseButton.closed) {
                var resolvedOptions = {};
                copyOwnProperties(resolvedOptions, collapseButtonOptions);
                resolvedOptions.visible = false;
                session._collapseButton = createFloatingButton(
                    collapseButtonOptions.label == null
                        ? (options.collapseLabel == null ? "IM" : options.collapseLabel)
                        : collapseButtonOptions.label,
                    function (button) {
                        var shouldExpand = true;
                        if (typeof collapseButtonOptions.onClick === "function") {
                            shouldExpand = collapseButtonOptions.onClick(button, session) !== false;
                        }
                        if (shouldExpand) {
                            session.expand();
                        }
                    },
                    resolvedOptions
                );
            }
            session._collapseButton.show();
        }

        function collapseSession() {
            if (state.closed || state.collapsed) {
                return;
            }
            if (privilegedMode) {
                throw new Error("Collapsing a privileged SurfaceControl layer is not supported yet");
            }
            state.collapsed = true;
            session._expandedBounds = {
                x: state.x,
                y: state.y,
                width: state.width,
                height: state.height
            };
            cancelLongPress();
            cancelPressedButton();
            stopFling();
            setImeTargetVisible(false);
            try {
                bridge.clearWindowTouchableRegion(surfaceView);
            } catch (ignored) {
                // The host region will be discarded during final close if needed.
            }
            state.interactiveRegionCount = 0;
            session._touchRegionSignature = null;
            state.touchable = false;
            setHostTouchable(false);
            applyHostAlpha(0);
            if (!activityMode) {
                windowObject.setSize(1, 1);
            }
            showCollapseButton();
            emitSessionEvent("collapsed", {
                button: session._collapseButton,
                fps: collapsedFps
            });
        }

        function expandSession() {
            if (state.closed || !state.collapsed) {
                return;
            }
            if (session._collapseButton != null) {
                session._collapseButton.hide();
            }
            if (!activityMode) {
                windowObject.setSize(state.width, state.height);
                windowObject.setPosition(state.x, state.y);
            }
            state.collapsed = false;
            applyHostAlpha(state.alpha);
            applyTouchMode(false);
            noteSessionActivity();
            requestFrame();
            emitSessionEvent("expanded", {
                x: toDp(state.x),
                y: toDp(state.y),
                width: toDp(state.width),
                height: toDp(state.height)
            });
        }

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
            if (state.closed) {
                return;
            }
            state.closed = true;
            state.ready = false;
            disposeHighLevelComponents(session, state.closeReason || "session-closed");
            if (session._timer != null) {
                clearTimeout(session._timer);
                session._timer = null;
            }
            stopActivityMonitor();
            cancelLongPress();
            cancelPressedButton();
            stopFling();
            closeInputBox();
            if (imeView != null) {
                try {
                    bridge.hideIme(imeView);
                } catch (error) {
                    console.warn("[imgui] IME shutdown failed: " + error);
                }
            }
            for (var textureIndex = 0; textureIndex < session._textures.length; textureIndex += 1) {
                var texture = session._textures[textureIndex];
                if (texture && typeof texture._markDisposed === "function") {
                    texture._markDisposed();
                }
            }
            session._textures.length = 0;
            try {
                bridge.clearWindowTouchableRegion(surfaceView);
            } catch (ignored) {
                // The host view can already be detached.
            }
            while (session._buttons.length > 0) {
                session._buttons[session._buttons.length - 1].close();
            }
            if (api._activeSession === session) {
                try {
                    bridge.shutdown();
                } catch (error) {
                    console.warn("[imgui] Shutdown failed: " + error);
                }
                api._activeSession = null;
            }
            session._nativeInitialized = false;
            session._surfaceDetached = false;
            removeExitListener();
            try {
                if (privilegedMode) {
                    bridge.closePrivilegedSurface(privilegedSurface);
                } else if (activityMode) {
                    bridge.closeActivitySurface(surfaceView);
                } else {
                    windowObject.close();
                }
            } catch (ignored) {
                // The host may have already disposed the view.
            }
            emitSessionEvent("closed", {reason: state.closeReason || "closed"});
            eventListeners = {};
        }

        function onExit() {
            session.close("engine-exit");
        }

        function initializeNativeSurface(nativeSurface, restored) {
            if (state.closed || api._activeSession !== session || session._surfaceInitializing) {
                return;
            }
            if (session._nativeInitialized && !session._surfaceDetached && bridge.isReady()) {
                state.ready = true;
                return;
            }
            session._surfaceInitializing = true;
            try {
                if (restored) {
                    state.ready = Boolean(bridge.attachSurface(nativeSurface));
                } else if (session._nativeInitialized && bridge.isReady()) {
                    state.ready = true;
                } else {
                    state.ready = Boolean(bridge.init(
                        nativeSurface, density, fontPath, fontSize, iniPath,
                        stringArray(additionalFontPaths), floatArray(additionalFontSizes), systemCjkFont
                    ));
                }
                if (!state.ready) {
                    session.close(restored ? "surface-restoration-failed" : "initialization-failed");
                    return;
                }
                session._nativeInitialized = true;
                session._surfaceDetached = false;
                if (!restored) {
                    if (debug) {
                        bridge.setDebugMode(true);
                    }
                    if (initialTheme) {
                        state.theme = api.setTheme(initialTheme);
                    } else {
                        api._theme = api.Themes.Dark;
                    }
                    var hasInitialStyle = false;
                    for (var initialStyleName in initialStyle) {
                        if (initialStyle.hasOwnProperty(initialStyleName)) {
                            hasInitialStyle = true;
                            break;
                        }
                    }
                    if (hasInitialStyle) {
                        api.setStyleProperties(initialStyle);
                    }
                    if (initialShadow != null) {
                        api.setStyleColor(api.Col.BorderShadow, initialShadow);
                    }
                }
                applyHostSecure(state.secure);
                applyHostMoreTouch(state.moreTouch);
                applyHostAlpha(state.collapsed ? 0 : state.alpha);
                applyTouchMode(false);
                updateConfiguration(true);
                emitSessionEvent(restored ? "surfaceRestored" : "ready", {
                    restored: restored,
                    mode: mode,
                    backend: privilegedMode ? privilegedBackend : null,
                    width: toDp(state.width),
                    height: toDp(state.height)
                });
            } catch (error) {
                console.error("[imgui] Initialization failed: " + error);
                session.close("initialization-error");
            } finally {
                session._surfaceInitializing = false;
            }
        }

        if (privilegedMode) {
            initializeNativeSurface(privilegedSurface, false);
        } else {
            var surfaceCallback = new SurfaceHolderCallback({
                surfaceCreated: function (surfaceHolder) {
                    initializeNativeSurface(
                        surfaceHolder.getSurface(),
                        session._nativeInitialized && session._surfaceDetached
                    );
                },
                surfaceChanged: function (surfaceHolder, format, surfaceWidth, surfaceHeight) {
                    if (activityMode) {
                        refreshActivitySize("surface");
                    } else if (surfaceWidth > 0 && surfaceHeight > 0 && !state.collapsed) {
                        updateSurfaceSize(surfaceWidth, surfaceHeight, "surface");
                    }
                    updateConfiguration(true);
                },
                surfaceDestroyed: function () {
                    if (state.closed) {
                        return;
                    }
                    state.ready = false;
                    setImeTargetVisible(false);
                    if (api._activeSession === session && session._nativeInitialized && bridge.isOwner()) {
                        try {
                            session._surfaceDetached = Boolean(bridge.detachSurface());
                        } catch (error) {
                            session._surfaceDetached = false;
                            console.warn("[imgui] Surface detachment failed: " + error);
                        }
                    }
                    // A change of density or font size recreates the host Activity, and the surface does not come back.
                    if (activityMode && bridge.isActivityChangingConfigurations(surfaceView)) {
                        runOnScriptThread(function () {
                            session.close("configuration-changed");
                        });
                    }
                }
            });
            holder.addCallback(surfaceCallback);

            // rawWindow may finish creating its Surface before the callback reaches the holder.
            try {
                surfaceView.post(new Runnable({
                    run: function () {
                        if (state.closed || session._nativeInitialized) {
                            return;
                        }
                        try {
                            if (holder.getSurface().isValid()) {
                                surfaceCallback.surfaceCreated(holder);
                            }
                        } catch (error) {
                            console.warn("[imgui] Unable to probe the initial Surface: " + error);
                        }
                    }
                }));
            } catch (error) {
                console.warn("[imgui] Unable to schedule the initial Surface probe: " + error);
            }
        }

        // Keep every main-thread host mutation after callback registration. A main-thread hop can
        // create the Surface immediately; registering later would miss the first surfaceCreated.
        applyHostSecure(state.secure);
        applyHostMoreTouch(state.moreTouch);
        applyHostAlpha(state.alpha);
        applyTouchMode(false);

        // Register the holder callback before hopping to the main thread to add the IME proxy.
        // Otherwise SurfaceView may create its surface during that hop and the initial
        // surfaceCreated notification will be missed, leaving the session permanently unready.
        if (imeEnabled) {
            try {
                imeView = bridge.createImeView(surfaceView);
                state.imeView = imeView;
            } catch (error) {
                console.warn("[imgui] IME proxy creation failed; text input will remain programmatic: " + error);
            }
        }

        var downRawX = 0;
        var downRawY = 0;
        var lastRawX = 0;
        var lastRawY = 0;
        var lastTouchX = 0;
        var lastTouchY = 0;
        var originX = x;
        var originY = y;
        var downFrameSerial = 0;
        var pointerDown = false;
        var pressedMouseButton = -1;
        var dragging = false;
        var wheeling = false;
        var longPressTriggered = false;
        var longPressTimer = null;
        var wheelLastY = 0;
        var wheelLastTime = 0;
        var wheelVelocity = 0;
        var wheelUnit = Math.max(8, fontSize * density * 3);
        var flingVelocity = 0;
        var flingLastTime = 0;
        // With options.pinchZoom a change of the distance between two fingers by pinchThreshold turns their scroll
        // gesture into a pinch, until they lift. A pinch applies the ratio of the distances to the font scale.
        var pinchThreshold = PINCH_THRESHOLD_DP * density;
        var pinching = false;
        var pinchStartDistance = 0;
        var pinchStartScale = 1;
        var fontScale = 1;
        var requestedFontScale = 1;
        var requestedFontScaleSource = "api";
        // The privileged text box, see openInputBox. inputBoxDone: the box handed over its text or could not open, and
        // the text field has yet to lose the keyboard focus.
        var inputBox = null;
        var inputBoxDone = false;

        function requestFontScale(scale, source) {
            requestedFontScale = scale;
            requestedFontScaleSource = source;
            noteSessionActivity();
        }

        // Before a new frame: the native style only changes between two frames.
        function applyFontScale() {
            if (requestedFontScale === fontScale) {
                return;
            }
            var oldScale = fontScale;
            fontScale = requestedFontScale;
            bridge.setFontScale(fontScale);
            emitSessionEvent("fontScaleChanged", {
                scale: fontScale,
                oldScale: oldScale,
                source: requestedFontScaleSource
            });
        }

        function pointerDistance(event) {
            var deltaX = event.getX(0) - event.getX(1);
            var deltaY = event.getY(0) - event.getY(1);
            return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        }

        // Privileged windows have no view for the system IME to attach to (R5.4). While a text field is active, a host
        // floaty takes the text. The privileged layer is above every window, so it is presented empty meanwhile: the
        // floaty and the keyboard would be hidden behind any ImGui window. Its direct input is off as well, because a
        // touch on the floaty would also reach ImGui and end the edit.
        function updateInputBox() {
            if (!bridge.wantTextInput()) {
                inputBoxDone = false;
                closeInputBox();
            } else if (inputBox == null && !inputBoxDone && !bridge.isPrivilegedPointerDown()) {
                openInputBox(Number(bridge.getTextInputFlags()));
            }
        }

        function openInputBox(flags) {
            var multiline = (flags & 1) !== 0;
            var boxWindow;
            try {
                boxWindow = floaty.rawWindow(
                    '<horizontal bg="#f0202124" padding="8" gravity="center_vertical">' +
                    '<input id="imgui_input" w="0" layout_weight="1" h="*" gravity="top" textColor="#ffffff" />' +
                    '<button id="imgui_input_done" w="auto" text="OK" />' +
                    '</horizontal>'
                );
            } catch (error) {
                inputBoxDone = true;
                console.warn("[imgui] The privileged text box needs the overlay permission of AutoJs6: " + error);
                return;
            }
            var box = {
                window: boxWindow,
                field: boxWindow.imgui_input,
                multiline: multiline,
                enterEndsEdit: !multiline || (flags & 4) !== 0
            };
            var boxMargin = Math.round(12 * density);
            boxWindow.setSize(state.displayWidth - 2 * boxMargin, Math.round((multiline ? 160 : 72) * density));
            boxWindow.setPosition(boxMargin, Math.round(48 * density));
            boxWindow.requestFocus();
            inputBox = box;
            state.imeView = box.field;
            bridge.setFrameHidden(true);
            setHostTouchable(false);
            box.field.post(new Runnable({
                run: function () {
                    if (inputBox === box) {
                        prepareInputBox(box, (flags & 2) !== 0);
                    }
                }
            }));
        }

        // Runs on the UI thread. The done button, the done key of the keyboard, a touch outside the box and the loss of
        // the window focus all hand over the text.
        function prepareInputBox(box, password) {
            var InputType = android.text.InputType;
            var EditorInfo = android.view.inputmethod.EditorInfo;
            var field = box.field;

            function submit() {
                var text = String(field.getText());
                runOnScriptThread(function () {
                    finishInputBox(box, text);
                });
            }

            field.setInputType(
                InputType.TYPE_CLASS_TEXT |
                (box.multiline ? InputType.TYPE_TEXT_FLAG_MULTI_LINE : 0) |
                (password ? InputType.TYPE_TEXT_VARIATION_PASSWORD : 0)
            );
            field.setImeOptions(EditorInfo.IME_ACTION_DONE | EditorInfo.IME_FLAG_NO_EXTRACT_UI);
            field.setOnEditorActionListener(new android.widget.TextView.OnEditorActionListener({
                onEditorAction: function () {
                    submit();
                    return true;
                }
            }));
            box.window.imgui_input_done.setOnClickListener(new android.view.View.OnClickListener({
                onClick: submit
            }));
            bridge.setWindowOutsideTouchListener(field, new Runnable({run: submit}));
            var hadWindowFocus = false;
            field.getViewTreeObserver().addOnWindowFocusChangeListener(
                new android.view.ViewTreeObserver.OnWindowFocusChangeListener({
                    onWindowFocusChanged: function (hasFocus) {
                        if (hadWindowFocus && !hasFocus) {
                            submit();
                        }
                        hadWindowFocus = hasFocus;
                    }
                })
            );
            bridge.showSoftKeyboard(field);
        }

        // The characters are followed by the Enter of the field, so an inputText with EnterReturnsTrue reports the
        // edit as usual; a multi-line field adds a line for a plain Enter and ends the edit with Ctrl+Enter.
        function finishInputBox(box, text) {
            if (box !== inputBox) {
                return;
            }
            closeInputBox();
            inputBoxDone = true;
            if (text.length > 0) {
                bridge.addInputCharacters(text);
            }
            if (!box.enterEndsEdit) {
                bridge.addKeyEvent(api.Mod.Ctrl, true);
            }
            bridge.addKeyEvent(api.Key.Enter, true);
            bridge.addKeyEvent(api.Key.Enter, false);
            if (!box.enterEndsEdit) {
                bridge.addKeyEvent(api.Mod.Ctrl, false);
            }
        }

        function closeInputBox() {
            var box = inputBox;
            if (box == null) {
                return;
            }
            inputBox = null;
            state.imeView = null;
            try {
                bridge.hideSoftKeyboard(box.field);
                box.window.close();
            } catch (ignored) {
                // The host may have already disposed the window.
            }
            try {
                bridge.setFrameHidden(false);
                setHostTouchable(state.touchable);
            } catch (ignored) {
                // While the session closes, the native layer may already belong to no one.
            }
        }

        function postToUi(action) {
            surfaceView.post(new Runnable({run: action}));
        }

        function setImeTargetVisible(visible) {
            visible = Boolean(visible && imeView != null);
            if (session._imeTargetVisible === visible) {
                return;
            }
            session._imeTargetVisible = visible;
            postToUi(function () {
                if (state.closed || session._imeTargetVisible !== visible) {
                    return;
                }
                try {
                    if (visible) {
                        if (activityMode) {
                            surfaceView.requestFocus();
                        } else {
                            windowObject.requestFocus();
                        }
                        bridge.showIme(imeView);
                    } else {
                        bridge.hideIme(imeView);
                        if (activityMode) {
                            surfaceView.clearFocus();
                        } else {
                            windowObject.disableFocus();
                        }
                    }
                    session._imeVisible = visible;
                } catch (error) {
                    session._imeVisible = false;
                    session._imeTargetVisible = false;
                    console.warn("[imgui] Unable to " + (visible ? "show" : "hide") + " IME: " + error);
                }
            });
        }

        function cancelLongPress() {
            if (longPressTimer != null) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }

        function cancelPressedButton() {
            if (pressedMouseButton >= 0) {
                bridge.touchEvent(3, lastTouchX, lastTouchY, pressedMouseButton);
                pressedMouseButton = -1;
            }
        }

        function scheduleLongPress() {
            cancelLongPress();
            if (!longPressAsRightClick) {
                return;
            }
            longPressTimer = setTimeout(function () {
                longPressTimer = null;
                var movedX = lastRawX - downRawX;
                var movedY = lastRawY - downRawY;
                if (!pointerDown || dragging || wheeling || pressedMouseButton !== api.MouseButton.Left ||
                    state.closed || session._closeRequested || api._activeSession !== session ||
                    Math.sqrt(movedX * movedX + movedY * movedY) > longPressSlop
                ) {
                    return;
                }
                cancelPressedButton();
                longPressTriggered = true;
                pressedMouseButton = api.MouseButton.Right;
                bridge.touchEvent(0, lastTouchX, lastTouchY, pressedMouseButton);
            }, longPressDuration);
        }

        function stopFling() {
            flingVelocity = 0;
            flingLastTime = 0;
        }

        function startFling(releaseTime) {
            if (wheelLastTime <= 0 || releaseTime - wheelLastTime > 120) {
                stopFling();
                return;
            }
            var velocityPerSecond = wheelVelocity * 1000;
            if (!flingEnabled || Math.abs(velocityPerSecond) < flingMinVelocity) {
                stopFling();
                return;
            }
            flingVelocity = clamp(velocityPerSecond, -flingMaxVelocity, flingMaxVelocity);
            flingLastTime = Date.now();
        }

        function dispatchFling() {
            if (flingVelocity === 0 || pointerDown) {
                return;
            }
            var now = Date.now();
            var elapsed = Math.max(0, now - flingLastTime);
            flingLastTime = now;
            if (elapsed <= 0) {
                return;
            }
            var movementTime = Math.min(elapsed, 64);
            bridge.addMouseWheelEvent(0, flingVelocity * movementTime / 1000 / wheelUnit);
            flingVelocity *= Math.exp(-flingFriction * elapsed / 1000);
            if (Math.abs(flingVelocity) < flingMinVelocity) {
                stopFling();
            }
        }

        surfaceView.setOnTouchListener(function (view, event) {
            if (!state.ready || state.closed || api._activeSession !== session) {
                return false;
            }

            var action = event.getActionMasked();
            var eventX = event.getX();
            var eventY = event.getY();
            lastTouchX = eventX;
            lastTouchY = eventY;
            lastRawX = event.getRawX();
            lastRawY = event.getRawY();

            if (action === MotionEvent.ACTION_DOWN) {
                cancelLongPress();
                stopFling();
                pointerDown = true;
                downRawX = lastRawX;
                downRawY = lastRawY;
                originX = state.x;
                originY = state.y;
                downFrameSerial = session._frameSerial;
                dragging = false;
                wheeling = false;
                longPressTriggered = false;
                wheelVelocity = 0;
                pressedMouseButton = api.MouseButton.Left;
                bridge.touchEvent(0, eventX, eventY, pressedMouseButton);
                scheduleLongPress();
                return true;
            }

            if (action === MotionEvent.ACTION_POINTER_DOWN) {
                cancelLongPress();
                if (!dragging && !wheeling && event.getPointerCount() === 2) {
                    cancelPressedButton();
                    longPressTriggered = false;
                    wheeling = true;
                    pinching = false;
                    pinchStartDistance = pointerDistance(event);
                    wheelLastY = (event.getY(0) + event.getY(1)) / 2;
                    wheelLastTime = Number(event.getEventTime());
                    wheelVelocity = 0;
                } else if (pinching) {
                    pinchStartDistance = 0;
                }
                return true;
            }

            if (action === MotionEvent.ACTION_POINTER_UP) {
                // The next move measures from the fingers that remain.
                pinchStartDistance = 0;
                return true;
            }

            if (action === MotionEvent.ACTION_MOVE) {
                var movedX = lastRawX - downRawX;
                var movedY = lastRawY - downRawY;
                var movedDistance = Math.sqrt(movedX * movedX + movedY * movedY);
                if (movedDistance > longPressSlop) {
                    cancelLongPress();
                }
                if (wheeling) {
                    if (event.getPointerCount() >= 2) {
                        if (pinchZoom) {
                            var distance = pointerDistance(event);
                            if (pinchStartDistance <= 0) {
                                pinchStartDistance = distance;
                                pinchStartScale = requestedFontScale;
                            } else if (!pinching && Math.abs(distance - pinchStartDistance) > pinchThreshold) {
                                pinching = true;
                                pinchStartDistance = distance;
                                pinchStartScale = requestedFontScale;
                            }
                            if (pinching) {
                                requestFontScale(clamp(pinchStartScale * distance / pinchStartDistance, 0.5, 3), "pinch");
                                return true;
                            }
                        }
                        var wheelY = (event.getY(0) + event.getY(1)) / 2;
                        var wheelDelta = wheelY - wheelLastY;
                        var wheelTime = Number(event.getEventTime());
                        var wheelElapsed = Math.max(1, wheelTime - wheelLastTime);
                        wheelLastY = wheelY;
                        wheelLastTime = wheelTime;
                        if (wheelDelta !== 0) {
                            var instantVelocity = wheelDelta / wheelElapsed;
                            wheelVelocity = wheelVelocity === 0 || wheelElapsed > 100
                                ? instantVelocity
                                : wheelVelocity * 0.65 + instantVelocity * 0.35;
                            bridge.addMouseWheelEvent(0, wheelDelta / wheelUnit);
                        }
                    }
                    return true;
                }
                if (!dragging && !longPressTriggered && movable &&
                    session._frameSerial > downFrameSerial && movedDistance >= dragThreshold
                ) {
                    var captured = false;
                    try {
                        captured = Boolean(bridge.isAnyItemHovered() || bridge.isAnyItemActive());
                    } catch (ignored) {
                        captured = true;
                    }
                    if (!captured) {
                        dragging = true;
                        cancelPressedButton();
                    }
                }
                if (dragging) {
                    applySessionPosition(
                        clamp(originX + Math.round(movedX), 0, Math.max(0, state.displayWidth - state.width)),
                        clamp(originY + Math.round(movedY), 0, Math.max(0, state.displayHeight - state.height)),
                        "drag",
                        true
                    );
                } else {
                    bridge.touchEvent(2, eventX, eventY, Math.max(0, pressedMouseButton));
                }
                return true;
            }

            if (action === MotionEvent.ACTION_UP || action === MotionEvent.ACTION_CANCEL) {
                cancelLongPress();
                var completedWheelGesture = wheeling && !pinching && action === MotionEvent.ACTION_UP;
                if (pressedMouseButton >= 0) {
                    bridge.touchEvent(
                        action === MotionEvent.ACTION_UP ? 1 : 3,
                        eventX,
                        eventY,
                        pressedMouseButton
                    );
                    pressedMouseButton = -1;
                }
                pointerDown = false;
                dragging = false;
                wheeling = false;
                pinching = false;
                longPressTriggered = false;
                if (completedWheelGesture) {
                    startFling(Number(event.getEventTime()));
                } else if (action === MotionEvent.ACTION_CANCEL) {
                    stopFling();
                }
                return true;
            }

            return true;
        });

        // Frame interval by priority: screen off or locked > collapsed > idle > normal.
        function currentFrameDelay() {
            if (state.paused) {
                return pausedTickDelay;
            }
            if (state.collapsed) {
                return collapsedFrameDelay;
            }
            if (state.idle) {
                return Math.max(frameDelay, Math.round(1000 / idleFps));
            }
            return frameDelay;
        }

        // Replaces a pending frame timer with one at the current rate; a running frame schedules its successor itself.
        function rescheduleFrame() {
            if (state.closed || session._closeRequested || session._timer == null) {
                return;
            }
            clearTimeout(session._timer);
            session._timer = null;
            session._nextFrameAt = 0;
            scheduleNextFrame();
        }

        // Renders the next frame as soon as the script thread is free.
        function requestFrame() {
            if (state.closed || session._closeRequested || session._timer == null) {
                return;
            }
            clearTimeout(session._timer);
            session._nextFrameAt = 0;
            session._timer = setTimeout(renderFrame, 0);
        }

        var activityMonitorToken = null;

        function startActivityMonitor() {
            try {
                activityMonitorToken = bridge.startActivityMonitor(new java.lang.Runnable({
                    run: function () {
                        runOnScriptThread(onActivityWake);
                    }
                }));
                state.paused = !Boolean(bridge.isScreenActive());
            } catch (error) {
                activityMonitorToken = null;
                state.paused = false;
                console.warn("[imgui] Power saving is unavailable: " + error);
            }
        }

        function stopActivityMonitor() {
            if (activityMonitorToken == null) {
                return;
            }
            try {
                bridge.stopActivityMonitor(activityMonitorToken);
            } catch (ignored) {
                // The connection is already gone.
            }
            activityMonitorToken = null;
        }

        function noteSessionActivity() {
            if (activityMonitorToken == null) {
                return;
            }
            try {
                bridge.noteActivity();
            } catch (ignored) {
                // The idle rate then ends with the next input.
            }
        }

        function inputIdleMillis() {
            return activityMonitorToken == null ? 0 : Number(bridge.getInputIdleMillis());
        }

        function enterIdle() {
            state.idle = true;
            bridge.armInputWake(true);
            if (inputIdleMillis() < idleDelay) {
                // An input arrived before the wake was armed.
                bridge.armInputWake(false);
                state.idle = false;
                return;
            }
            emitSessionEvent("idle", {fps: Math.min(idleFps, fps), idleDelay: idleDelay});
        }

        function leaveIdle(reason) {
            if (!state.idle) {
                return;
            }
            state.idle = false;
            if (activityMonitorToken != null) {
                bridge.armInputWake(false);
            }
            emitSessionEvent("active", {fps: fps, reason: reason});
        }

        // After a rendered frame: drops to idleFps once no input arrived for idleDelay ms, and returns to the full
        // rate when an input slipped past the armed wake.
        function updateIdleState() {
            if (activityMonitorToken == null) {
                return;
            }
            var idleMillis = inputIdleMillis();
            if (state.idle) {
                if (idleFps === 0 || idleMillis < idleDelay) {
                    leaveIdle("input");
                }
            } else if (idleFps > 0 && !pointerDown && idleMillis >= idleDelay) {
                enterIdle();
            }
        }

        // Runs on the script thread after an input at the idle rate, and when the screen turns off, on or unlocks.
        function onActivityWake() {
            if (state.closed || session._closeRequested || activityMonitorToken == null) {
                return;
            }
            if (!Boolean(bridge.isScreenActive())) {
                state.paused = true;
                return;
            }
            var resumed = state.paused;
            state.paused = false;
            if (state.idle && inputIdleMillis() < idleDelay) {
                leaveIdle(resumed ? "screen" : "input");
            }
            if (resumed || !state.idle) {
                requestFrame();
            }
        }

        function scheduleNextFrame() {
            if (!state.closed && !session._closeRequested) {
                var now = Date.now();
                var nextDelay = currentFrameDelay();
                if (session._scheduledFrameDelay !== nextDelay ||
                    session._nextFrameAt <= 0 || session._nextFrameAt < now - nextDelay
                ) {
                    session._nextFrameAt = now + nextDelay;
                } else {
                    session._nextFrameAt += nextDelay;
                }
                session._scheduledFrameDelay = nextDelay;
                session._timer = setTimeout(
                    renderFrame,
                    Math.max(0, session._nextFrameAt - now)
                );
            }
        }

        function renderFrame() {
            session._timer = null;
            if (session._closeRequested || api._activeSession !== session) {
                session.close(state.closeReason || "replaced");
                return;
            }
            updateDisplayScale();
            updateConfiguration(false);
            if (state.ready && !bridge.isOwner()) {
                session.close("native-context-replaced");
                return;
            }
            if (state.paused) {
                // Polls once a second as well, for a screen broadcast that never arrived.
                try {
                    state.paused = !Boolean(bridge.isScreenActive());
                } catch (ignored) {
                    state.paused = false;
                }
                if (state.paused) {
                    scheduleNextFrame();
                    return;
                }
                if (state.idle && inputIdleMillis() < idleDelay) {
                    leaveIdle("screen");
                }
            }
            if (state.collapsed) {
                scheduleNextFrame();
                return;
            }
            if (!state.ready || !bridge.isReady()) {
                scheduleNextFrame();
                return;
            }

            var frameStarted = false;
            var frameRendered = false;
            var frameFailed = false;
            applyFontScale();
            var workStartedAt = java.lang.System.nanoTime();
            session._inFrame = true;
            try {
                dispatchFling();
                frameStarted = Boolean(bridge.newFrame());
                if (frameStarted) {
                    var callbackStartedAt = debug ? java.lang.System.nanoTime() : 0;
                    renderCallback(api, session);
                    if (debug) {
                        warnSlowRenderCallback((java.lang.System.nanoTime() - callbackStartedAt) / 1e6);
                    }
                    if (!session._closeRequested) {
                        renderHighLevelComponents(session);
                    }
                    session._workTime = (java.lang.System.nanoTime() - workStartedAt) / 1e6;
                }
            } catch (error) {
                frameFailed = true;
                if (frameStarted) {
                    try {
                        bridge.recoverFrame();
                    } catch (ignored) {
                        // The frame is still presented below; a presentation failure closes the session.
                    }
                }
                // With an "error" listener the rest of the frame is skipped and the session goes on (D4).
                if (!reportSessionError("render", "Render callback", error, null)) {
                    state.closeReason = "render-error";
                    session._closeRequested = true;
                }
            } finally {
                if (frameStarted) {
                    try {
                        if (debug) {
                            bridge.showDebugWindows();
                        }
                        frameRendered = Boolean(bridge.render());
                        if (frameRendered) {
                            session._frameSerial += 1;
                        }
                        if (debug) {
                            printDebugMessages();
                        }
                    } catch (error) {
                        console.error("[imgui] Frame presentation failed: " + error);
                    }
                }
                session._inFrame = false;
            }
            if (frameRendered && !frameFailed && lastReportedError !== null && lastReportedError.phase === "render") {
                lastReportedError = null;
            }

            if (!frameRendered && frameStarted) {
                state.closeReason = "presentation-failed";
                session._closeRequested = true;
            }
            if (frameRendered) {
                try {
                    updateTouchableRegion();
                    updateContentAutoSize();
                    if (inputBoxEnabled) {
                        updateInputBox();
                    } else {
                        setImeTargetVisible(Boolean(bridge.wantTextInput()));
                    }
                } catch (error) {
                    setImeTargetVisible(false);
                    console.warn("[imgui] Unable to update post-frame session state: " + error);
                }
                try {
                    updateIdleState();
                } catch (error) {
                    console.warn("[imgui] Unable to update the idle state: " + error);
                }
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
        startActivityMonitor();
        scheduleNextFrame();
        return session;
    };

    // ui.dp() and ui.px() convert between dp (createWindow options, session and button geometry) and the
    // px of ImGui coordinates inside a frame, with the active session's density or the display's.
    function currentDensity() {
        if (api._activeSession != null) {
            return api._activeSession.density;
        }
        if (api._displayDensity == null) {
            var displayDensity = Number(context.getResources().getDisplayMetrics().density);
            api._displayDensity = displayDensity > 0 && isFinite(displayDensity) ? displayDensity : 1;
        }
        return api._displayDensity;
    }

    Object.defineProperty(api, "density", {
        get: currentDensity,
        enumerable: true,
        configurable: false
    });
    api.dp = function (value) {
        return argNumber("dp", "value", value) * currentDensity();
    };
    api.px = function (value) {
        return argNumber("px", "value", value) / currentDensity();
    };

    api.closeWindow = function () {
        if (api._activeSession) {
            api._activeSession.close();
        }
    };
    api.launchFloaty = function (renderCallback, options) {
        var resolvedOptions = {};
        copyOwnProperties(resolvedOptions, options);
        resolvedOptions.mode = api.WindowMode.Overlay;
        return api.createWindow(renderCallback, resolvedOptions);
    };
    api.launch = function (renderCallback, options) {
        var resolvedOptions = {};
        copyOwnProperties(resolvedOptions, options);
        resolvedOptions.mode = api.WindowMode.Activity;
        return api.createWindow(renderCallback, resolvedOptions);
    };
    api.launchPrivileged = function (renderCallback, options) {
        var resolvedOptions = {};
        copyOwnProperties(resolvedOptions, options);
        resolvedOptions.mode = api.WindowMode.Privileged;
        return api.createWindow(renderCallback, resolvedOptions);
    };
    api.addButtonEx = function (label, callback, options) {
        return requireActiveSession("addButtonEx").addButtonEx(label, callback, options);
    };
    api.setTouchable = function (touchMode) {
        return requireActiveSession("setTouchable").setTouchable(touchMode);
    };
    api.setMoreTouch = function (enabled) {
        return requireActiveSession("setMoreTouch").setMoreTouch(enabled);
    };
    api.setGlobalAlpha = function (alpha) {
        return requireActiveSession("setGlobalAlpha").setAlpha(alpha);
    };
    api.setSecure = function (secure) {
        return requireActiveSession("setSecure").setSecure(secure);
    };
    api.collapseWindow = function () {
        return requireActiveSession("collapseWindow").collapse();
    };
    api.expandWindow = function () {
        return requireActiveSession("expandWindow").expand();
    };
    api.getComponent = function (type, id) {
        return findHighLevelComponent(requireActiveSession("getComponent"), type, id);
    };

    var aliases = {
        Ref: "ref",
        GetBackendCapabilities: "getBackendCapabilities",
        ListExamples: "listExamples",
        GetExampleSource: "getExampleSource",
        RunExample: "runExample",
        LogWindow: "logWindow",
        Toast: "toast",
        Alert: "alert",
        Confirm: "confirm",
        SingleChoice: "singleChoice",
        MultiChoice: "multiChoice",
        StatsOverlay: "statsOverlay",
        DataTable: "dataTable",
        GetComponent: "getComponent",
        CreateWindow: "createWindow",
        CloseWindow: "closeWindow",
        LaunchFloaty: "launchFloaty",
        Launch: "launch",
        LaunchPrivileged: "launchPrivileged",
        AddButtonEx: "addButtonEx",
        SetTouchable: "setTouchable",
        SetMoreTouch: "setMoreTouch",
        SetGlobalAlpha: "setGlobalAlpha",
        SetSecure: "setSecure",
        CollapseWindow: "collapseWindow",
        ExpandWindow: "expandWindow",
        Dp: "dp",
        Px: "px",
        SetNextWindowPos: "setNextWindowPos",
        SetNextWindowSize: "setNextWindowSize",
        SetNextWindowSizeConstraints: "setNextWindowSizeConstraints",
        SetNextWindowBgAlpha: "setNextWindowBgAlpha",
        SetKeyboardFocusHere: "setKeyboardFocusHere",
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
        ShowDemoWindow: "showDemoWindow",
        ShowMetricsWindow: "showMetricsWindow",
        ShowDebugLogWindow: "showDebugLogWindow",
        ShowIDStackToolWindow: "showIdStackToolWindow",
        ShowStyleEditor: "showStyleEditor",
        ShowAboutWindow: "showAboutWindow",
        ShowUserGuide: "showUserGuide",
        StyleColorsDark: "styleColorsDark",
        StyleColorsLight: "styleColorsLight",
        StyleColorsClassic: "styleColorsClassic",
        WantCaptureMouse: "wantCaptureMouse",
        SeparatorText: "separatorText",
        Bullet: "bullet",
        BulletText: "bulletText",
        LabelText: "labelText",
        TextDisabled: "textDisabled",
        ArrowButton: "arrowButton",
        InvisibleButton: "invisibleButton",
        InputInt: "inputInt",
        InputFloat: "inputFloat",
        InputTextMultiline: "inputTextMultiline",
        BeginListBox: "beginListBox",
        EndListBox: "endListBox",
        ListBox: "listBox",
        ColorPicker3: "colorPicker3",
        ColorPicker4: "colorPicker4",
        ColorButton: "colorButton",
        PlotLines: "plotLines",
        PlotHistogram: "plotHistogram",
        TreeNodeEx: "treeNodeEx",
        VSliderFloat: "vSliderFloat",
        VSliderInt: "vSliderInt",
        DragFloat2: "dragFloat2",
        DragFloat3: "dragFloat3",
        DragFloat4: "dragFloat4",
        DragInt2: "dragInt2",
        DragInt3: "dragInt3",
        DragInt4: "dragInt4",
        SliderFloat2: "sliderFloat2",
        SliderFloat3: "sliderFloat3",
        SliderFloat4: "sliderFloat4",
        SliderInt2: "sliderInt2",
        SliderInt3: "sliderInt3",
        SliderInt4: "sliderInt4",
        InputFloat2: "inputFloat2",
        InputFloat3: "inputFloat3",
        InputFloat4: "inputFloat4",
        InputInt2: "inputInt2",
        InputInt3: "inputInt3",
        InputInt4: "inputInt4",
        DragFloatRange2: "dragFloatRange2",
        DragIntRange2: "dragIntRange2",
        SliderAngle: "sliderAngle",
        Toggle: "toggle",
        ToggleSwitch: "toggle",
        BeginCombo: "beginCombo",
        EndCombo: "endCombo",
        ListClipper: "listClipper",
        OpenPopup: "openPopup",
        BeginPopup: "beginPopup",
        BeginPopupModal: "beginPopupModal",
        BeginPopupContextItem: "beginPopupContextItem",
        BeginPopupContextWindow: "beginPopupContextWindow",
        EndPopup: "endPopup",
        CloseCurrentPopup: "closeCurrentPopup",
        IsPopupOpen: "isPopupOpen",
        BeginMenuBar: "beginMenuBar",
        EndMenuBar: "endMenuBar",
        BeginMenu: "beginMenu",
        EndMenu: "endMenu",
        MenuItem: "menuItem",
        SetTooltip: "setTooltip",
        SetItemTooltip: "setItemTooltip",
        BeginTooltip: "beginTooltip",
        BeginItemTooltip: "beginItemTooltip",
        EndTooltip: "endTooltip",
        BeginTable: "beginTable",
        EndTable: "endTable",
        TableNextRow: "tableNextRow",
        TableNextColumn: "tableNextColumn",
        TableSetColumnIndex: "tableSetColumnIndex",
        TableSetupColumn: "tableSetupColumn",
        TableGetSortSpecs: "tableGetSortSpecs",
        TableSetupScrollFreeze: "tableSetupScrollFreeze",
        TableHeadersRow: "tableHeadersRow",
        TableSetBgColor: "tableSetBgColor",
        PushStyleColor: "pushStyleColor",
        PopStyleColor: "popStyleColor",
        SetStyleColor: "setStyleColor",
        SetStyleProperties: "setStyleProperties",
        SetTheme: "setTheme",
        PushStyleVar: "pushStyleVar",
        PopStyleVar: "popStyleVar",
        SetWindowFontScale: "setWindowFontScale",
        PushFont: "pushFont",
        PopFont: "popFont",
        WithFont: "withFont",
        Icon: "icon",
        ColorU32: "colorU32",
        CreateTexture: "createTexture",
        DestroyTexture: "destroyTexture",
        Image: "image",
        ImageButton: "imageButton",
        GetWindowDrawList: "getWindowDrawList",
        GetForegroundDrawList: "getForegroundDrawList",
        GetBackgroundDrawList: "getBackgroundDrawList",
        PushID: "pushId",
        PopID: "popId",
        BeginGroup: "beginGroup",
        EndGroup: "endGroup",
        Indent: "indent",
        Unindent: "unindent",
        AlignTextToFramePadding: "alignTextToFramePadding",
        BeginDisabled: "beginDisabled",
        EndDisabled: "endDisabled",
        GetScrollX: "getScrollX",
        GetScrollY: "getScrollY",
        GetScrollMaxX: "getScrollMaxX",
        GetScrollMaxY: "getScrollMaxY",
        SetScrollX: "setScrollX",
        SetScrollY: "setScrollY",
        SetScrollHereX: "setScrollHereX",
        SetScrollHereY: "setScrollHereY",
        IsItemActive: "isItemActive",
        IsItemEdited: "isItemEdited",
        IsItemActivated: "isItemActivated",
        IsItemDeactivated: "isItemDeactivated",
        IsItemDeactivatedAfterEdit: "isItemDeactivatedAfterEdit",
        IsItemFocused: "isItemFocused",
        IsItemVisible: "isItemVisible",
        IsWindowHovered: "isWindowHovered",
        IsWindowFocused: "isWindowFocused",
        IsWindowCollapsed: "isWindowCollapsed",
        IsWindowAppearing: "isWindowAppearing",
        GetMousePos: "getMousePos",
        IsMouseDown: "isMouseDown",
        IsMouseClicked: "isMouseClicked",
        IsMouseDoubleClicked: "isMouseDoubleClicked",
        IsMouseReleased: "isMouseReleased",
        IsMouseDragging: "isMouseDragging",
        GetMouseDragDelta: "getMouseDragDelta",
        ResetMouseDragDelta: "resetMouseDragDelta",
        CalcTextSize: "calcTextSize",
        GetFrameHeight: "getFrameHeight",
        GetFrameHeightWithSpacing: "getFrameHeightWithSpacing",
        GetTextLineHeight: "getTextLineHeight",
        GetTextLineHeightWithSpacing: "getTextLineHeightWithSpacing",
        IsKeyDown: "isKeyDown",
        IsKeyPressed: "isKeyPressed",
        IsKeyReleased: "isKeyReleased",
        GetKeyPressedAmount: "getKeyPressedAmount",
        GetKeyName: "getKeyName",
        IsKeyChordPressed: "isKeyChordPressed",
        Shortcut: "shortcut",
        SetNextItemShortcut: "setNextItemShortcut",
        GetClipboardText: "getClipboardText",
        SetClipboardText: "setClipboardText",
        BeginDragDropSource: "beginDragDropSource",
        SetDragDropPayload: "setDragDropPayload",
        EndDragDropSource: "endDragDropSource",
        BeginDragDropTarget: "beginDragDropTarget",
        AcceptDragDropPayload: "acceptDragDropPayload",
        EndDragDropTarget: "endDragDropTarget",
        GetDragDropPayload: "getDragDropPayload",
        WithDragDropSource: "withDragDropSource",
        WithDragDropTarget: "withDragDropTarget",
        PushClipRect: "pushClipRect",
        PopClipRect: "popClipRect",
        AddMousePosEvent: "addMousePosEvent",
        AddMouseButtonEvent: "addMouseButtonEvent"
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
