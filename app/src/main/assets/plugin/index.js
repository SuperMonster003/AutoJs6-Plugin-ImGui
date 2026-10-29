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

    function valueRef(value) {
        return {value: value};
    }

    function isValueRef(value) {
        return value != null &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            Object.prototype.hasOwnProperty.call(value, "value");
    }

    function withScalarRef(value, factory, converter, callback, nullable) {
        if (value == null && nullable) {
            return callback(null);
        }
        if (!isValueRef(value)) {
            return callback(value);
        }
        var nativeRef = factory(value.value);
        try {
            return callback(nativeRef);
        } finally {
            value.value = converter(nativeRef[0]);
        }
    }

    function withBoolRef(value, callback, nullable) {
        if (nullable && value === false) {
            return callback(null);
        }
        return withScalarRef(value, boolRef, Boolean, callback, nullable);
    }

    function withFloatRef(value, callback) {
        return withScalarRef(value, floatRef, Number, callback, false);
    }

    function withIntRef(value, callback) {
        return withScalarRef(value, intRef, Number, callback, false);
    }

    function withStringRef(value, callback) {
        return withScalarRef(value, stringRef, String, callback, false);
    }

    function withFloatArrayRef(value, callback) {
        if (!isValueRef(value)) {
            return callback(value);
        }
        var source = value.value == null ? [] : value.value;
        if (typeof source.length !== "number") {
            throw new TypeError("ImGui float reference value must be an array-like object");
        }
        var nativeRef = floatArray(source);
        try {
            return callback(nativeRef);
        } finally {
            for (var i = 0; i < nativeRef.length; i += 1) {
                source[i] = Number(nativeRef[i]);
            }
            value.value = source;
        }
    }

    function floatArray(values) {
        return javaArray(FloatType, values);
    }

    function byteArray(values) {
        var source = values || [];
        var bytes = [];
        for (var i = 0; i < source.length; i += 1) {
            var value = integer(source[i], 0) & 0xFF;
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
        _theme: null,
        _fontAliases: null,

        bool: boolRef,
        float: floatRef,
        int: intRef,
        string: stringRef,
        ref: valueRef,
        floats: floatArray,
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
        InputQueueCapacity: 2048
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
            return integer(capabilityString(key, "0"), 0);
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

    function inputTextCapacity(value, fallback) {
        var capacity = Math.max(2, integer(value, fallback));
        if (capacity > api.Limits.InputTextMaxBytes) {
            throw new RangeError(
                "inputText capacity exceeds " + api.Limits.InputTextMaxBytes + " bytes"
            );
        }
        return capacity;
    }

    function selectionItems(items, controlName) {
        if (items == null || typeof items.length !== "number") {
            throw new TypeError(controlName + " items must be an array-like value");
        }
        if (items.length > api.Limits.SelectionMaxItems) {
            throw new RangeError(
                controlName + " accepts at most " + api.Limits.SelectionMaxItems + " items"
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

    function requiredNumber(value, label) {
        var result = Number(value);
        if (!isFinite(result)) {
            throw new TypeError(label + " must be a finite number");
        }
        return result;
    }

    function resolveWindowMode(value) {
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
        throw new RangeError("Unknown ImGui window mode: " + value);
    }

    function resolveTouchMode(value) {
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
        throw new RangeError("Unknown ImGui touch mode: " + value);
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

    function androidColor(value, fallback, label) {
        if (typeof value === "number") {
            return integer(value, 0);
        }
        var components = color4(value, fallback, label || "Android color");
        return AndroidColor.argb(
            Math.round(components[3] * 255),
            Math.round(components[0] * 255),
            Math.round(components[1] * 255),
            Math.round(components[2] * 255)
        );
    }

    function point(value, label) {
        if (value != null && value.length >= 2) {
            return [
                requiredNumber(value[0], label + ".x"),
                requiredNumber(value[1], label + ".y")
            ];
        }
        if (value != null && value.x != null && value.y != null) {
            return [
                requiredNumber(value.x, label + ".x"),
                requiredNumber(value.y, label + ".y")
            ];
        }
        throw new TypeError(label + " expects [x, y] or {x, y}");
    }

    function colorComponent(value, label) {
        var component = requiredNumber(value, label);
        if (component > 1) {
            component /= 255;
        }
        return clamp(component, 0, 1);
    }

    function hexColor(value, label) {
        var hex = String(value).replace(/^#/, "");
        if (hex.length === 3 || hex.length === 4) {
            var expanded = "";
            for (var i = 0; i < hex.length; i += 1) {
                expanded += hex.charAt(i) + hex.charAt(i);
            }
            hex = expanded;
        }
        if (hex.length !== 6 && hex.length !== 8) {
            throw new TypeError(label + " expects #RGB, #RGBA, #RRGGBB, or #RRGGBBAA");
        }
        var parsed = parseInt(hex, 16);
        if (!isFinite(parsed)) {
            throw new TypeError(label + " contains an invalid hexadecimal color");
        }
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

    function color4(value, fallback, label) {
        label = label || "Color";
        if (value == null) {
            value = fallback || [1, 1, 1, 1];
        }
        if (typeof value === "string") {
            return hexColor(value, label);
        }
        if (typeof value === "number") {
            var packed = value >>> 0;
            return [
                (packed & 0xFF) / 255,
                ((packed >>> 8) & 0xFF) / 255,
                ((packed >>> 16) & 0xFF) / 255,
                ((packed >>> 24) & 0xFF) / 255
            ];
        }
        var red;
        var green;
        var blue;
        var alpha;
        if (value.length >= 3) {
            red = value[0];
            green = value[1];
            blue = value[2];
            alpha = value.length > 3 && value[3] != null ? value[3] : 1;
        } else if (value.r != null && value.g != null && value.b != null) {
            red = value.r;
            green = value.g;
            blue = value.b;
            alpha = value.a == null ? 1 : value.a;
        } else {
            throw new TypeError(label + " expects [r, g, b, a], {r, g, b, a}, or a hex color");
        }
        return [
            colorComponent(red, label + ".r"),
            colorComponent(green, label + ".g"),
            colorComponent(blue, label + ".b"),
            colorComponent(alpha, label + ".a")
        ];
    }

    function packColor(value, fallback, label) {
        if (typeof value === "number") {
            return value | 0;
        }
        var components = color4(value, fallback, label);
        var red = Math.round(components[0] * 255) & 0xFF;
        var green = Math.round(components[1] * 255) & 0xFF;
        var blue = Math.round(components[2] * 255) & 0xFF;
        var alpha = Math.round(components[3] * 255) & 0xFF;
        return (red | (green << 8) | (blue << 16) | (alpha << 24)) | 0;
    }

    api.colorU32 = function (red, green, blue, alpha) {
        if (arguments.length > 1) {
            return packColor([red, green, blue, alpha == null ? 1 : alpha], null, "Color");
        }
        return packColor(red, [1, 1, 1, 1], "Color");
    };

    function flattenPoints(points, label) {
        if (points == null || typeof points.length !== "number" || points.length < 2) {
            throw new TypeError(label + " expects at least two points");
        }
        if (points.length > 4096) {
            throw new RangeError(label + " accepts at most 4096 points");
        }
        var flattened = [];
        for (var i = 0; i < points.length; i += 1) {
            var resolved = point(points[i], label + "[" + i + "]");
            flattened.push(resolved[0], resolved[1]);
        }
        return floatArray(flattened);
    }

    function resolveFontIndex(font, allowCurrent) {
        if (font == null && allowCurrent) {
            return -1;
        }
        var index;
        if (font == null) {
            index = api.Fonts.Default;
        } else if (typeof font === "number") {
            index = integer(font, -1);
        } else if (typeof font === "string") {
            index = api._fontAliases[normalizedKey(font)];
        } else if (font.index != null) {
            index = integer(font.index, -1);
        }
        if (index == null || index < 0) {
            throw new RangeError("Unknown ImGui font handle: " + font);
        }
        return index;
    }

    function resolveTextureFlags(options) {
        if (typeof options === "number") {
            return integer(options, 0);
        }
        options = options || {};
        var flags = integer(options.flags, 0);
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
                "Unknown ImGui icon '" + name + "'. Use a name from imgui.Icons"
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

    function resolveThemeName(name) {
        var resolved = THEME_ALIASES[normalizedKey(name)];
        if (!resolved) {
            throw new RangeError(
                "Unknown ImGui theme '" + name + "'. Use one of the imgui.Themes values"
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
                api.setStyleColor(integer(index, 0), colors[index]);
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

    function resolveAppearanceName(name) {
        var key = normalizedKey(name);
        if (key === "flat") return "flat";
        if (key === "rounded") return "rounded";
        if (key === "card") return "card";
        throw new RangeError(
            "Unknown ImGui appearance '" + name + "'. Use one of the imgui.Appearance values"
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

    api.Key = freeze({
        None: 0,
        Tab: 512,
        LeftArrow: 513,
        RightArrow: 514,
        UpArrow: 515,
        DownArrow: 516,
        PageUp: 517,
        PageDown: 518,
        Home: 519,
        End: 520,
        Insert: 521,
        Delete: 522,
        Backspace: 523,
        Space: 524,
        Enter: 525,
        Escape: 526,
        A: 546,
        C: 548,
        V: 567,
        X: 569,
        Y: 570,
        Z: 571,
        ModCtrl: 1 << 12,
        ModShift: 1 << 13,
        ModAlt: 1 << 14,
        ModSuper: 1 << 15
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
    api.setKeyboardFocusHere = function (offset) {
        bridge.setKeyboardFocusHere(integer(offset, 0));
    };

    api.begin = function (name, open, flags) {
        return withBoolRef(open, function (nativeRef) {
            return Boolean(bridge.begin(String(name), nativeRef, integer(flags, 0)));
        }, true);
    };
    api.end = function () { bridge.end(); };
    api.beginChild = function (id, width, height, borders, flags) {
        if (typeof borders === "number") {
            return Boolean(bridge.beginChildEx(
                String(id),
                number(width, 0),
                number(height, 0),
                integer(borders, 0),
                integer(flags, 0)
            ));
        }
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
    api.checkbox = function (label, value) {
        return withBoolRef(value, function (nativeRef) {
            return Boolean(bridge.checkbox(String(label), nativeRef));
        }, false);
    };
    api.radioButton = function (label, value, buttonValue) {
        return withIntRef(value, function (nativeRef) {
            return Boolean(bridge.radioButton(String(label), nativeRef, integer(buttonValue, 0)));
        });
    };
    api.sliderFloat = function (label, value, min, max, format, flags) {
        return withFloatRef(value, function (nativeRef) {
            return Boolean(bridge.sliderFloat(
                String(label), nativeRef, number(min, 0), number(max, 1),
                String(format || "%.3f"), integer(flags, 0)
            ));
        });
    };
    api.sliderInt = function (label, value, min, max, format, flags) {
        return withIntRef(value, function (nativeRef) {
            return Boolean(bridge.sliderInt(
                String(label), nativeRef, integer(min, 0), integer(max, 100),
                String(format || "%d"), integer(flags, 0)
            ));
        });
    };
    api.dragFloat = function (label, value, speed, min, max, format, flags) {
        return withFloatRef(value, function (nativeRef) {
            return Boolean(bridge.dragFloat(
                String(label), nativeRef, number(speed, 1), number(min, 0), number(max, 0),
                String(format || "%.3f"), integer(flags, 0)
            ));
        });
    };
    api.dragInt = function (label, value, speed, min, max, format, flags) {
        return withIntRef(value, function (nativeRef) {
            return Boolean(bridge.dragInt(
                String(label), nativeRef, number(speed, 1), integer(min, 0), integer(max, 0),
                String(format || "%d"), integer(flags, 0)
            ));
        });
    };
    api.inputText = function (label, value, maxLength, flags) {
        return withStringRef(value, function (nativeRef) {
            return Boolean(bridge.inputText(
                String(label), nativeRef, inputTextCapacity(maxLength, 256), integer(flags, 0)
            ));
        });
    };
    api.colorEdit3 = function (label, value, flags) {
        return withFloatArrayRef(value, function (nativeRef) {
            return Boolean(bridge.colorEdit3(String(label), nativeRef, integer(flags, 0)));
        });
    };
    api.colorEdit4 = function (label, value, flags) {
        return withFloatArrayRef(value, function (nativeRef) {
            return Boolean(bridge.colorEdit4(String(label), nativeRef, integer(flags, 0)));
        });
    };
    api.progressBar = function (fraction, width, height, overlay) {
        bridge.progressBar(
            number(fraction, 0), number(width, -1), number(height, 0),
            overlay == null ? null : String(overlay)
        );
    };
    api.combo = function (label, currentItem, items, popupHeight) {
        return withIntRef(currentItem, function (nativeRef) {
            return Boolean(bridge.combo(
                String(label), nativeRef, selectionItems(items, "combo"), integer(popupHeight, -1)
            ));
        });
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
        return withBoolRef(open, function (nativeRef) {
            return Boolean(bridge.beginTabItem(String(label), nativeRef, integer(flags, 0)));
        }, true);
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
    api.showDemoWindow = function (open) {
        return withBoolRef(open, function (nativeRef) {
            bridge.showDemoWindow(nativeRef);
        }, true);
    };

    api.separatorText = function (label) { bridge.separatorText(String(label)); };
    api.bullet = function () { bridge.bullet(); };
    api.bulletText = function (text) { bridge.bulletText(String(text)); };
    api.labelText = function (label, text) { bridge.labelText(String(label), String(text)); };
    api.textDisabled = function (text) { bridge.textDisabled(String(text)); };
    api.arrowButton = function (id, direction) {
        return Boolean(bridge.arrowButton(String(id), integer(direction, api.Dir.Down)));
    };
    api.invisibleButton = function (id, width, height, flags) {
        return Boolean(bridge.invisibleButton(
            String(id), number(width, 1), number(height, 1), integer(flags, 0)
        ));
    };
    api.inputInt = function (label, value, step, stepFast, flags) {
        return withIntRef(value, function (nativeRef) {
            return Boolean(bridge.inputInt(
                String(label), nativeRef, integer(step, 1), integer(stepFast, 100), integer(flags, 0)
            ));
        });
    };
    api.inputFloat = function (label, value, step, stepFast, format, flags) {
        return withFloatRef(value, function (nativeRef) {
            return Boolean(bridge.inputFloat(
                String(label), nativeRef, number(step, 0), number(stepFast, 0),
                String(format || "%.3f"), integer(flags, 0)
            ));
        });
    };
    api.inputTextMultiline = function (label, value, maxLength, width, height, flags) {
        return withStringRef(value, function (nativeRef) {
            return Boolean(bridge.inputTextMultiline(
                String(label), nativeRef, inputTextCapacity(maxLength, 4096),
                number(width, 0), number(height, 0), integer(flags, 0)
            ));
        });
    };
    api.beginListBox = function (label, width, height) {
        return Boolean(bridge.beginListBox(String(label), number(width, 0), number(height, 0)));
    };
    api.endListBox = function () { bridge.endListBox(); };
    api.listBox = function (label, currentItem, items, heightInItems) {
        return withIntRef(currentItem, function (nativeRef) {
            return Boolean(bridge.listBox(
                String(label), nativeRef, selectionItems(items, "listBox"), integer(heightInItems, -1)
            ));
        });
    };
    api.colorPicker3 = function (label, value, flags) {
        return withFloatArrayRef(value, function (nativeRef) {
            return Boolean(bridge.colorPicker3(String(label), nativeRef, integer(flags, 0)));
        });
    };
    api.colorPicker4 = function (label, value, flags) {
        return withFloatArrayRef(value, function (nativeRef) {
            return Boolean(bridge.colorPicker4(String(label), nativeRef, integer(flags, 0)));
        });
    };
    api.colorButton = function (id, red, green, blue, alpha, flags, width, height) {
        return Boolean(bridge.colorButton(
            String(id), number(red, 1), number(green, 1), number(blue, 1), number(alpha, 1),
            integer(flags, 0), number(width, 0), number(height, 0)
        ));
    };
    api.plotLines = function (label, values, options) {
        options = options || {};
        bridge.plotLines(
            String(label),
            values instanceof java.lang.Object ? values : floatArray(values),
            integer(options.offset, 0),
            options.overlay == null ? null : String(options.overlay),
            number(options.scaleMin, NaN),
            number(options.scaleMax, NaN),
            number(options.width, 0),
            number(options.height, 0)
        );
    };
    api.plotHistogram = function (label, values, options) {
        options = options || {};
        bridge.plotHistogram(
            String(label),
            values instanceof java.lang.Object ? values : floatArray(values),
            integer(options.offset, 0),
            options.overlay == null ? null : String(options.overlay),
            number(options.scaleMin, NaN),
            number(options.scaleMax, NaN),
            number(options.width, 0),
            number(options.height, 0)
        );
    };
    api.treeNodeEx = function (label, flags) {
        return Boolean(bridge.treeNodeEx(String(label), integer(flags, 0)));
    };
    api.vSliderFloat = function (label, width, height, value, min, max, format, flags) {
        return withFloatRef(value, function (nativeRef) {
            return Boolean(bridge.vSliderFloat(
                String(label), number(width, 24), number(height, 120), nativeRef,
                number(min, 0), number(max, 1), String(format || "%.3f"), integer(flags, 0)
            ));
        });
    };
    api.vSliderInt = function (label, width, height, value, min, max, format, flags) {
        return withIntRef(value, function (nativeRef) {
            return Boolean(bridge.vSliderInt(
                String(label), number(width, 24), number(height, 120), nativeRef,
                integer(min, 0), integer(max, 100), String(format || "%d"), integer(flags, 0)
            ));
        });
    };
    api.toggle = function (label, value) {
        return withBoolRef(value, function (nativeRef) {
            return Boolean(bridge.toggle(String(label), nativeRef));
        }, false);
    };
    api.toggleSwitch = api.toggle;
    api.beginCombo = function (label, preview, flags) {
        return Boolean(bridge.beginCombo(
            String(label), String(preview == null ? "" : preview), integer(flags, 0)
        ));
    };
    api.endCombo = function () { bridge.endCombo(); };

    api.openPopup = function (id, flags) { bridge.openPopup(String(id), integer(flags, 0)); };
    api.beginPopup = function (id, flags) {
        return Boolean(bridge.beginPopup(String(id), integer(flags, 0)));
    };
    api.beginPopupModal = function (name, open, flags) {
        return withBoolRef(open, function (nativeRef) {
            return Boolean(bridge.beginPopupModal(String(name), nativeRef, integer(flags, 0)));
        }, true);
    };
    api.beginPopupContextItem = function (id, flags) {
        return Boolean(bridge.beginPopupContextItem(
            id == null ? null : String(id), integer(flags, 0)
        ));
    };
    api.beginPopupContextWindow = function (id, flags) {
        return Boolean(bridge.beginPopupContextWindow(
            id == null ? null : String(id), integer(flags, 0)
        ));
    };
    api.endPopup = function () { bridge.endPopup(); };
    api.closeCurrentPopup = function () { bridge.closeCurrentPopup(); };
    api.isPopupOpen = function (id, flags) {
        return Boolean(bridge.isPopupOpen(String(id), integer(flags, 0)));
    };
    api.beginMenuBar = function () { return Boolean(bridge.beginMenuBar()); };
    api.endMenuBar = function () { bridge.endMenuBar(); };
    api.beginMenu = function (label, enabled) {
        return Boolean(bridge.beginMenu(String(label), enabled !== false));
    };
    api.endMenu = function () { bridge.endMenu(); };
    api.menuItem = function (label, shortcut, selected, enabled) {
        return withBoolRef(selected, function (nativeRef) {
            return Boolean(bridge.menuItem(
                String(label),
                shortcut == null ? null : String(shortcut),
                nativeRef,
                enabled !== false
            ));
        }, true);
    };
    api.setTooltip = function (text) { bridge.setTooltip(String(text)); };
    api.setItemTooltip = function (text) { bridge.setItemTooltip(String(text)); };
    api.beginTooltip = function () { return Boolean(bridge.beginTooltip()); };
    api.beginItemTooltip = function () { return Boolean(bridge.beginItemTooltip()); };
    api.endTooltip = function () { bridge.endTooltip(); };

    api.beginTable = function (id, columns, flags, outerWidth, outerHeight) {
        return Boolean(bridge.beginTable(
            String(id), Math.max(1, integer(columns, 1)), integer(flags, 0),
            number(outerWidth, 0), number(outerHeight, 0)
        ));
    };
    api.endTable = function () { bridge.endTable(); };
    api.tableNextRow = function (rowFlags, minRowHeight) {
        bridge.tableNextRow(integer(rowFlags, 0), number(minRowHeight, 0));
    };
    api.tableNextColumn = function () { return Boolean(bridge.tableNextColumn()); };
    api.tableSetColumnIndex = function (columnIndex) {
        return Boolean(bridge.tableSetColumnIndex(integer(columnIndex, 0)));
    };
    api.tableSetupColumn = function (label, flags, initWidthOrWeight) {
        bridge.tableSetupColumn(String(label), integer(flags, 0), number(initWidthOrWeight, 0));
    };
    api.tableSetupScrollFreeze = function (columns, rows) {
        bridge.tableSetupScrollFreeze(integer(columns, 0), integer(rows, 0));
    };
    api.tableHeadersRow = function () { bridge.tableHeadersRow(); };
    api.tableSetBgColor = function (target, red, green, blue, alpha, columnIndex) {
        bridge.tableSetBgColor(
            integer(target, 0), number(red, 0), number(green, 0), number(blue, 0),
            number(alpha, 1), integer(columnIndex, -1)
        );
    };

    api.pushStyleColor = function (index, red, green, blue, alpha) {
        bridge.pushStyleColor(
            integer(index, 0), number(red, 1), number(green, 1), number(blue, 1), number(alpha, 1)
        );
    };
    api.popStyleColor = function (count) { bridge.popStyleColor(integer(count, 1)); };
    api.setStyleColor = function (index, red, green, blue, alpha) {
        var colorIndex;
        if (typeof index === "string") {
            colorIndex = COLOR_NAME_TO_INDEX[normalizedKey(index)];
        } else {
            colorIndex = integer(index, -1);
        }
        if (colorIndex == null || colorIndex < 0 || colorIndex > api.Col.ModalWindowDimBg) {
            throw new RangeError("ImGui style color index is out of range: " + index);
        }

        var values;
        if (red != null && typeof red === "object") {
            values = red;
        } else {
            values = [red, green, blue, alpha];
        }
        if (values == null || values.length < 3) {
            throw new TypeError("ImGui style color expects [red, green, blue, alpha]");
        }
        var resolvedAlpha = values.length > 3 && values[3] != null ? values[3] : 1;
        bridge.setStyleColor(
            colorIndex,
            requiredNumber(values[0], "Style color red"),
            requiredNumber(values[1], "Style color green"),
            requiredNumber(values[2], "Style color blue"),
            requiredNumber(resolvedAlpha, "Style color alpha")
        );
        return api;
    };
    api.setStyleProperties = function (properties) {
        if (properties == null || typeof properties !== "object") {
            throw new TypeError("imgui.setStyleProperties expects an object");
        }
        for (var propertyName in properties) {
            if (!properties.hasOwnProperty(propertyName)) {
                continue;
            }
            if (normalizedKey(propertyName) === "colors") {
                var colorProperties = properties[propertyName];
                if (colorProperties == null || typeof colorProperties !== "object") {
                    throw new TypeError("setStyleProperties.colors expects an object");
                }
                for (var styleColorName in colorProperties) {
                    if (colorProperties.hasOwnProperty(styleColorName)) {
                        api.setStyleColor(styleColorName, colorProperties[styleColorName]);
                    }
                }
                continue;
            }

            var info = STYLE_PROPERTY_INFO[normalizedKey(propertyName)];
            if (!info) {
                throw new RangeError(
                    "Unknown ImGui style property '" + propertyName +
                    "'. Use a name from imgui.StyleVar or the colors property"
                );
            }
            var value = properties[propertyName];
            var x;
            var y;
            if (info.vector) {
                if (typeof value === "number") {
                    x = requiredNumber(value, info.name);
                    y = x;
                } else if (value != null && value.length >= 2) {
                    x = requiredNumber(value[0], info.name + ".x");
                    y = requiredNumber(value[1], info.name + ".y");
                } else if (value != null && value.x != null && value.y != null) {
                    x = requiredNumber(value.x, info.name + ".x");
                    y = requiredNumber(value.y, info.name + ".y");
                } else {
                    throw new TypeError(
                        "ImGui style property '" + propertyName + "' expects [x, y]"
                    );
                }
            } else {
                x = requiredNumber(value, info.name);
                y = 0;
            }
            var scale = info.scaled ? clamp(number(api._density, 1), 0.5, 4) : 1;
            bridge.setStyleVar(info.index, x * scale, y * scale);
        }
        return api;
    };
    api.setTheme = function (name) {
        var resolvedName = resolveThemeName(name == null ? api.Themes.Dark : name);
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
    api.pushStyleVar = function (index, x, y) {
        if (y == null) {
            bridge.pushStyleVar(integer(index, 0), number(x, 0));
        } else {
            bridge.pushStyleVar2(integer(index, 0), number(x, 0), number(y, 0));
        }
    };
    api.popStyleVar = function (count) { bridge.popStyleVar(integer(count, 1)); };
    api.setWindowFontScale = function (scale) { bridge.setWindowFontScale(number(scale, 1)); };
    api.pushFont = function (font, fontSize) {
        var index = resolveFontIndex(font, false);
        bridge.pushFont(
            index,
            fontSize == null ? 0 : requiredNumber(fontSize, "Font size")
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

    function resolveTexture(texture) {
        if (texture == null || texture._textureToken !== TEXTURE_TOKEN ||
            typeof texture.isDisposed !== "function"
        ) {
            throw new TypeError("Expected a texture returned by imgui.createTexture");
        }
        if (texture.isDisposed()) {
            throw new Error("The ImGui texture has already been disposed");
        }
        if (texture._session !== api._activeSession || texture._session.closed) {
            throw new Error("The ImGui texture belongs to an inactive session");
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
        return source;
    }

    api.createTexture = function (source, options) {
        var owner = api._activeSession;
        if (!owner || owner.closed || !owner.ready || !bridge.isOwner()) {
            throw new Error("imgui.createTexture requires a ready createWindow session");
        }
        var result = bridge.createTexture(resolveTextureSource(source), resolveTextureFlags(options));
        if (result == null || result.length < 3) {
            throw new Error("Unable to create the ImGui texture");
        }
        var nativeHandle = result[0];
        var disposed = false;
        var texture = {
            _textureToken: TEXTURE_TOKEN,
            _nativeHandle: nativeHandle,
            _session: owner,
            handle: Number(nativeHandle),
            width: Number(result[1]),
            height: Number(result[2]),

            isDisposed: function () {
                return disposed;
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
        owner._textures.push(texture);
        return freeze(texture);
    };

    api.destroyTexture = function (texture) {
        if (texture == null || texture._textureToken !== TEXTURE_TOKEN ||
            typeof texture.dispose !== "function"
        ) {
            throw new TypeError("imgui.destroyTexture expects an ImGui texture");
        }
        return texture.dispose();
    };

    function imageParameters(texture, width, height, options) {
        if (width != null && typeof width === "object") {
            options = width;
            width = options.width;
            height = options.height;
        }
        options = options || {};
        var resolvedWidth = width == null ? texture.width : requiredNumber(width, "Image width");
        var resolvedHeight;
        if (height == null && width != null) {
            resolvedHeight = resolvedWidth * texture.height / texture.width;
        } else {
            resolvedHeight = height == null ? texture.height : requiredNumber(height, "Image height");
        }
        if (resolvedWidth <= 0 || resolvedHeight <= 0) {
            throw new RangeError("Image dimensions must be positive");
        }
        return {
            width: resolvedWidth,
            height: resolvedHeight,
            uv0: point(options.uv0 || [0, 0], "Image uv0"),
            uv1: point(options.uv1 || [1, 1], "Image uv1"),
            background: color4(
                options.background == null ? options.bg : options.background,
                [0, 0, 0, 0],
                "Image background"
            ),
            tint: color4(options.tint, [1, 1, 1, 1], "Image tint")
        };
    }

    api.image = function (texture, width, height, options) {
        var resolvedTexture = resolveTexture(texture);
        var parameters = imageParameters(resolvedTexture, width, height, options);
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
        var resolvedTexture = resolveTexture(texture);
        var parameters = imageParameters(resolvedTexture, width, height, options);
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

    function createDrawListFacade(layer) {
        var facade = {
            layer: layer,

            addLine: function (first, second, color, thickness) {
                var p1 = point(first, "addLine p1");
                var p2 = point(second, "addLine p2");
                bridge.drawLine(
                    layer, p1[0], p1[1], p2[0], p2[1],
                    packColor(color, [1, 1, 1, 1], "addLine color"),
                    requiredNumber(thickness == null ? 1 : thickness, "addLine thickness")
                );
                return facade;
            },

            addRect: function (minimum, maximum, color, rounding, thickness, flags) {
                var pMin = point(minimum, "addRect min");
                var pMax = point(maximum, "addRect max");
                bridge.drawRect(
                    layer, pMin[0], pMin[1], pMax[0], pMax[1],
                    packColor(color, [1, 1, 1, 1], "addRect color"),
                    requiredNumber(rounding == null ? 0 : rounding, "addRect rounding"),
                    requiredNumber(thickness == null ? 1 : thickness, "addRect thickness"),
                    integer(flags, 0)
                );
                return facade;
            },

            addRectFilled: function (minimum, maximum, color, rounding, flags) {
                var pMin = point(minimum, "addRectFilled min");
                var pMax = point(maximum, "addRectFilled max");
                bridge.drawRectFilled(
                    layer, pMin[0], pMin[1], pMax[0], pMax[1],
                    packColor(color, [1, 1, 1, 1], "addRectFilled color"),
                    requiredNumber(rounding == null ? 0 : rounding, "addRectFilled rounding"),
                    integer(flags, 0)
                );
                return facade;
            },

            addCircle: function (center, radius, color, segments, thickness) {
                var resolvedCenter = point(center, "addCircle center");
                bridge.drawCircle(
                    layer, resolvedCenter[0], resolvedCenter[1],
                    requiredNumber(radius, "addCircle radius"),
                    packColor(color, [1, 1, 1, 1], "addCircle color"),
                    integer(segments, 0),
                    requiredNumber(thickness == null ? 1 : thickness, "addCircle thickness")
                );
                return facade;
            },

            addCircleFilled: function (center, radius, color, segments) {
                var resolvedCenter = point(center, "addCircleFilled center");
                bridge.drawCircleFilled(
                    layer, resolvedCenter[0], resolvedCenter[1],
                    requiredNumber(radius, "addCircleFilled radius"),
                    packColor(color, [1, 1, 1, 1], "addCircleFilled color"),
                    integer(segments, 0)
                );
                return facade;
            },

            addTriangle: function (first, second, third, color, thickness) {
                var p1 = point(first, "addTriangle p1");
                var p2 = point(second, "addTriangle p2");
                var p3 = point(third, "addTriangle p3");
                bridge.drawTriangle(
                    layer, p1[0], p1[1], p2[0], p2[1], p3[0], p3[1],
                    packColor(color, [1, 1, 1, 1], "addTriangle color"),
                    requiredNumber(thickness == null ? 1 : thickness, "addTriangle thickness"),
                    false
                );
                return facade;
            },

            addTriangleFilled: function (first, second, third, color) {
                var p1 = point(first, "addTriangleFilled p1");
                var p2 = point(second, "addTriangleFilled p2");
                var p3 = point(third, "addTriangleFilled p3");
                bridge.drawTriangle(
                    layer, p1[0], p1[1], p2[0], p2[1], p3[0], p3[1],
                    packColor(color, [1, 1, 1, 1], "addTriangleFilled color"),
                    1,
                    true
                );
                return facade;
            },

            addText: function (position, color, text, options) {
                var resolvedPosition = point(position, "addText position");
                options = options || {};
                bridge.drawText(
                    layer, resolvedPosition[0], resolvedPosition[1],
                    packColor(color, [1, 1, 1, 1], "addText color"),
                    String(text),
                    resolveFontIndex(options.font, true),
                    options.size == null ? 0 : requiredNumber(options.size, "addText font size"),
                    options.wrapWidth == null
                        ? 0
                        : requiredNumber(options.wrapWidth, "addText wrap width")
                );
                return facade;
            },

            addPolyline: function (points, color, thickness, closed) {
                var options = {};
                if (thickness != null && typeof thickness === "object") {
                    options = thickness;
                    thickness = options.thickness;
                    closed = options.closed;
                }
                var flags = integer(options.flags, 0);
                if (closed === true) {
                    flags |= api.DrawFlags.Closed;
                } else if (typeof closed === "number") {
                    flags |= integer(closed, 0);
                }
                bridge.drawPolyline(
                    layer,
                    flattenPoints(points, "addPolyline points"),
                    packColor(color, [1, 1, 1, 1], "addPolyline color"),
                    requiredNumber(thickness == null ? 1 : thickness, "addPolyline thickness"),
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
                var p1 = point(first, "addBezierCubic p1");
                var p2 = point(second, "addBezierCubic p2");
                var p3 = point(third, "addBezierCubic p3");
                var p4 = point(fourth, "addBezierCubic p4");
                bridge.drawBezierCubic(
                    layer,
                    p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1],
                    packColor(color, [1, 1, 1, 1], "addBezierCubic color"),
                    requiredNumber(thickness == null ? 1 : thickness, "addBezierCubic thickness"),
                    integer(segments, 0)
                );
                return facade;
            },

            addImage: function (texture, minimum, maximum, options) {
                var resolvedTexture = resolveTexture(texture);
                var pMin = point(minimum, "addImage min");
                var pMax = point(maximum, "addImage max");
                options = options || {};
                var uv0 = point(options.uv0 || [0, 0], "addImage uv0");
                var uv1 = point(options.uv1 || [1, 1], "addImage uv1");
                bridge.drawImage(
                    layer, resolvedTexture._nativeHandle,
                    pMin[0], pMin[1], pMax[0], pMax[1],
                    uv0[0], uv0[1], uv1[0], uv1[1],
                    packColor(options.tint, [1, 1, 1, 1], "addImage tint")
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
        return freeze(facade);
    }

    var WINDOW_DRAW_LIST = createDrawListFacade(api.DrawListLayer.Window);
    var FOREGROUND_DRAW_LIST = createDrawListFacade(api.DrawListLayer.Foreground);
    var BACKGROUND_DRAW_LIST = createDrawListFacade(api.DrawListLayer.Background);
    api.getWindowDrawList = function () { return WINDOW_DRAW_LIST; };
    api.getForegroundDrawList = function () { return FOREGROUND_DRAW_LIST; };
    api.getBackgroundDrawList = function () { return BACKGROUND_DRAW_LIST; };

    api.pushId = function (id) {
        if (typeof id === "number") {
            bridge.pushIdInt(integer(id, 0));
        } else {
            bridge.pushIdString(String(id));
        }
    };
    api.popId = function () { bridge.popId(); };
    api.beginGroup = function () { bridge.beginGroup(); };
    api.endGroup = function () { bridge.endGroup(); };
    api.indent = function (width) { bridge.indent(number(width, 0)); };
    api.unindent = function (width) { bridge.unindent(number(width, 0)); };
    api.alignTextToFramePadding = function () { bridge.alignTextToFramePadding(); };
    api.beginDisabled = function (disabled) { bridge.beginDisabled(disabled !== false); };
    api.endDisabled = function () { bridge.endDisabled(); };

    api.getScrollX = function () { return Number(bridge.getScrollX()); };
    api.getScrollY = function () { return Number(bridge.getScrollY()); };
    api.getScrollMaxX = function () { return Number(bridge.getScrollMaxX()); };
    api.getScrollMaxY = function () { return Number(bridge.getScrollMaxY()); };
    api.setScrollX = function (value) { bridge.setScrollX(number(value, 0)); };
    api.setScrollY = function (value) { bridge.setScrollY(number(value, 0)); };
    api.setScrollHereX = function (centerRatio) { bridge.setScrollHereX(number(centerRatio, 0.5)); };
    api.setScrollHereY = function (centerRatio) { bridge.setScrollHereY(number(centerRatio, 0.5)); };

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
        return Boolean(bridge.isWindowHovered(integer(flags, 0)));
    };
    api.isWindowFocused = function (flags) {
        return Boolean(bridge.isWindowFocused(integer(flags, 0)));
    };
    api.isWindowCollapsed = function () { return Boolean(bridge.isWindowCollapsed()); };
    api.isWindowAppearing = function () { return Boolean(bridge.isWindowAppearing()); };
    api.getMousePos = function () { return bridge.getMousePos(); };
    api.isMouseDown = function (button) {
        return Boolean(bridge.isMouseDown(integer(button, 0)));
    };
    api.isMouseClicked = function (button, repeat) {
        return Boolean(bridge.isMouseClicked(integer(button, 0), Boolean(repeat)));
    };
    api.isMouseDoubleClicked = function (button) {
        return Boolean(bridge.isMouseDoubleClicked(integer(button, 0)));
    };
    api.isMouseReleased = function (button) {
        return Boolean(bridge.isMouseReleased(integer(button, 0)));
    };
    api.isMouseDragging = function (button, lockThreshold) {
        return Boolean(bridge.isMouseDragging(integer(button, 0), number(lockThreshold, -1)));
    };
    api.getMouseDragDelta = function (button, lockThreshold) {
        return bridge.getMouseDragDelta(integer(button, 0), number(lockThreshold, -1));
    };
    api.resetMouseDragDelta = function (button) {
        bridge.resetMouseDragDelta(integer(button, 0));
    };
    api.calcTextSize = function (text, wrapWidth) {
        return bridge.calcTextSize(String(text), number(wrapWidth, -1));
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
    api.addKeyEvent = function (key, down) { bridge.addKeyEvent(integer(key, 0), Boolean(down)); };
    api.sendKey = function (key) {
        bridge.addKeyEvent(integer(key, 0), true);
        bridge.addKeyEvent(integer(key, 0), false);
    };
    api.addMouseWheel = function (wheelX, wheelY) {
        bridge.addMouseWheelEvent(number(wheelX, 0), number(wheelY, 0));
    };
    api.wantTextInput = function () { return Boolean(bridge.wantTextInput()); };

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
            throw new Error("imgui." + apiName + " requires an active ImGui session");
        }
        return session;
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

    function renderHighLevelComponent(component, context) {
        if (component.closed || !component.visible || typeof component._render !== "function") {
            return;
        }
        try {
            component._render(context || {});
        } catch (error) {
            console.error(
                "[imgui] " + component.type + " '" + component.id + "' render failed: " + error
            );
            if (error && error.stack) {
                console.error(String(error.stack));
            }
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
            renderHighLevelComponent(component, context);
        }
        if (activeDialog) {
            renderHighLevelComponent(activeDialog, {activeDialog: true});
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

    function componentScale(session, value, fallback) {
        return number(value, fallback) * clamp(number(session.density, 1), 0.5, 4);
    }

    function setAnchoredWindowPosition(session, position, margin, condition, stackOffset) {
        var resolvedPosition = normalizedKey(position || api.ToastPosition.TopRight);
        var width = Math.max(1, number(session.width, session.displayWidth));
        var height = Math.max(1, number(session.height, session.displayHeight));
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
        var component = createHighLevelComponent(session, "logWindow", resolvedId, options);
        component.entries = [];
        component.autoScroll = options.autoScroll !== false;
        component.maxEntries = Math.max(1, integer(options.maxEntries, 1000));
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
                    componentScale(session, options.margin, 12),
                    api.Cond.FirstUseEver,
                    0
                );
            }
            api.setNextWindowSize(
                componentScale(session, options.width, 380),
                componentScale(session, options.height, 260),
                api.Cond.FirstUseEver
            );
            var title = String(options.title == null ? resolvedId : options.title) +
                "###imgui-log-window-" + resolvedId;
            api.withWindow(title, component.open, integer(options.flags, 0), function () {
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
        var component = createHighLevelComponent(session, "toast", id, options);
        component.position = options.position || api.ToastPosition.TopRight;
        component.text = String(text == null ? "" : text);
        component.level = normalizeLogLevel(options.level || options.type || api.LogLevel.Info);
        component.duration = Math.max(0, number(duration, number(options.duration, 2500)));
        component.createdAt = Date.now();
        component.expiresAt = component.duration > 0
            ? component.createdAt + component.duration
            : Number.POSITIVE_INFINITY;

        component.update = function (nextText, nextDuration, nextOptions) {
            nextOptions = nextOptions || {};
            component.text = String(nextText == null ? "" : nextText);
            component.level = normalizeLogLevel(
                nextOptions.level || nextOptions.type || component.level
            );
            component.position = nextOptions.position || component.position;
            component.duration = Math.max(
                0,
                number(nextDuration, number(nextOptions.duration, component.duration))
            );
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
            var density = clamp(number(session.density, 1), 0.5, 4);
            var margin = componentScale(session, options.margin, 12);
            var stackStep = componentScale(session, options.stackStep, 54);
            setAnchoredWindowPosition(
                session,
                component.position,
                margin,
                api.Cond.Always,
                Math.max(0, integer(context.stackIndex, 0)) * stackStep
            );
            var opacity = 1;
            var fadeDuration = Math.max(0, number(options.fadeDuration, 250));
            if (component.duration > 0 && fadeDuration > 0) {
                opacity = clamp((component.expiresAt - now) / fadeDuration, 0, 1);
            }
            api.setNextWindowBgAlpha(clamp(number(options.backgroundAlpha, 0.92) * opacity, 0, 1));
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
            flags |= integer(options.flags, 0);
            api.withWindow("###imgui-toast-" + id, null, flags, function () {
                var color = options.color || logLevelColor(component.level);
                api.pushStyleColor(
                    api.Col.Text,
                    number(color[0], 1),
                    number(color[1], 1),
                    number(color[2], 1),
                    number(color.length > 3 ? color[3] : 1, 1) * opacity
                );
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
            api.setNextWindowSize(
                componentScale(session, config.width, 320),
                0,
                api.Cond.Appearing
            );
            var visible = api.withPopupModal(
                popupName,
                component.open,
                api.WindowFlags.AlwaysAutoResize |
                    api.WindowFlags.NoSavedSettings |
                    integer(config.flags, 0),
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

    api.singleChoice = function () {
        var config = parseChoiceDialog("singleChoice", arguments);
        var component = createDialog(null, "singleChoice", config);
        component.items = config.items;
        component.selectedIndex = integer(config.selected, -1);
        return component.promise;
    };

    api.multiChoice = function () {
        var config = parseChoiceDialog("multiChoice", arguments);
        var component = createDialog(null, "multiChoice", config);
        component.items = config.items;
        component.choiceRefs = [];
        var selected = config.selected || [];
        var booleanSelection = selected.length === component.items.length &&
            (selected.length === 0 || typeof selected[0] === "boolean");
        for (var itemIndex = 0; itemIndex < component.items.length; itemIndex += 1) {
            var isSelected = booleanSelection ? Boolean(selected[itemIndex]) : false;
            if (!booleanSelection) {
                for (var selectedIndex = 0; selectedIndex < selected.length; selectedIndex += 1) {
                    if (integer(selected[selectedIndex], -1) === itemIndex) {
                        isSelected = true;
                        break;
                    }
                }
            }
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
    };

    function createStatsOverlay(session, id, options) {
        session = requireHighLevelSession("statsOverlay", session);
        options = options || {};
        var resolvedId = String(id == null ? "default" : id);
        var existing = findHighLevelComponent(session, "statsOverlay", resolvedId);
        if (existing) {
            return existing;
        }
        var component = createHighLevelComponent(session, "statsOverlay", resolvedId, options);
        component.frameTimes = [];
        component.historySize = Math.max(10, integer(options.historySize, 120));
        component.fps = 0;
        component.frameTime = 0;
        component.snapshot = function () {
            return {
                fps: component.fps,
                frameTime: component.frameTime,
                history: component.frameTimes.slice()
            };
        };
        component._render = function () {
            component.fps = Math.max(0, api.framerate());
            component.frameTime = component.fps > 0 ? 1000 / component.fps : 0;
            component.frameTimes.push(component.frameTime);
            if (component.frameTimes.length > component.historySize) {
                component.frameTimes.splice(0, component.frameTimes.length - component.historySize);
            }
            setAnchoredWindowPosition(
                session,
                options.position || api.ToastPosition.TopLeft,
                componentScale(session, options.margin, 12),
                api.Cond.Always,
                0
            );
            api.setNextWindowBgAlpha(clamp(number(options.backgroundAlpha, 0.78), 0, 1));
            var flags = api.WindowFlags.NoDecoration |
                api.WindowFlags.AlwaysAutoResize |
                api.WindowFlags.NoSavedSettings |
                api.WindowFlags.NoFocusOnAppearing |
                api.WindowFlags.NoMove |
                api.WindowFlags.NoNav;
            if (options.interactive !== true) {
                flags |= api.WindowFlags.NoInputs;
            }
            flags |= integer(options.flags, 0);
            api.withWindow("###imgui-stats-overlay-" + resolvedId, null, flags, function () {
                var warningMs = Math.max(0, number(options.warningMs, 16.7));
                var criticalMs = Math.max(warningMs, number(options.criticalMs, 33.3));
                var color = component.frameTime > criticalMs
                    ? [1, 0.28, 0.28, 1]
                    : component.frameTime > warningMs
                        ? [1, 0.72, 0.18, 1]
                        : [0.30, 0.92, 0.48, 1];
                api.textColored(
                    color[0], color[1], color[2], color[3],
                    component.fps.toFixed(1) + " FPS  /  " + component.frameTime.toFixed(2) + " ms"
                );
                if (options.showPlot !== false) {
                    api.plotLines(
                        "##imgui-frame-times-" + resolvedId,
                        floatArray(component.frameTimes),
                        {
                            overlay: String(options.overlay || "Frame time"),
                            scaleMin: 0,
                            scaleMax: Math.max(
                                criticalMs * 1.5,
                                number(options.scaleMax, criticalMs * 1.5)
                            ),
                            width: componentScale(session, options.plotWidth, 190),
                            height: componentScale(session, options.plotHeight, 48)
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
                result.push({
                    key: header.key == null ? index : header.key,
                    label: String(header.label == null ? header.key : header.label),
                    flags: integer(header.flags, 0),
                    width: number(header.width, number(header.weight, 0))
                });
            } else {
                result.push({
                    key: String(header),
                    label: String(header),
                    flags: 0,
                    width: 0
                });
            }
        }
        if (result.length === 0) {
            result.push({key: 0, label: "Value", flags: 0, width: 0});
        }
        return result;
    }

    function createDataTable(session, id, headers, rows, options) {
        session = requireHighLevelSession("dataTable", session);
        options = options || {};
        var resolvedId = String(id == null ? "default" : id);
        var existing = findHighLevelComponent(session, "dataTable", resolvedId);
        if (existing) {
            return existing;
        }
        var component = createHighLevelComponent(session, "dataTable", resolvedId, options);
        component.headers = normalizeDataTableHeaders(headers);
        component.rows = [];
        component.open = valueRef(options.open !== false);
        component.multiSelect = options.multiSelect === true;
        component._records = [];
        component._selected = {};

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
            if (typeof target === "number") {
                var numericIndex = integer(target, -1);
                if (numericIndex >= 0 && numericIndex < component._records.length) {
                    return numericIndex;
                }
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
            refreshRows();
            emitRowsChanged("set", null, -1);
            emitSelectionChanged();
            return component;
        };

        component.getRows = function () {
            return component.rows.slice();
        };

        component.addRow = function (row, index) {
            var insertIndex = index == null
                ? component._records.length
                : clamp(integer(index, component._records.length), 0, component._records.length);
            component._records.splice(insertIndex, 0, createRecord(row));
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

        function cellValue(row, header, columnIndex) {
            var value;
            if (Array.isArray(row) || row != null && typeof row.length === "number" &&
                typeof row !== "string"
            ) {
                value = row[columnIndex];
            } else if (row != null && typeof row === "object") {
                value = row[header.key];
            } else if (columnIndex === 0) {
                value = row;
            }
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

        component.renderTable = function () {
            renderToolbar();
            var flags = options.tableFlags == null
                ? api.TableFlags.Resizable |
                    api.TableFlags.RowBg |
                    api.TableFlags.Borders |
                    api.TableFlags.ScrollY
                : integer(options.tableFlags, 0);
            var tableHeight = options.tableHeight == null
                ? 0
                : componentScale(session, options.tableHeight, 0);
            api.withTable(
                "##imgui-data-table-" + resolvedId,
                component.headers.length,
                flags,
                0,
                tableHeight,
                function () {
                    for (var headerIndex = 0; headerIndex < component.headers.length; headerIndex += 1) {
                        var header = component.headers[headerIndex];
                        api.tableSetupColumn(header.label, header.flags, header.width);
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
                        api.tableNextRow(0, number(options.rowHeight, 0));
                        for (var columnIndex = 0; columnIndex < component.headers.length; columnIndex += 1) {
                            api.tableSetColumnIndex(columnIndex);
                            var header = component.headers[columnIndex];
                            var value = cellValue(row, header, columnIndex);
                            if (columnIndex === 0 && options.selectable !== false) {
                                var clicked = api.selectable(
                                    value + "###row-" + record.uid,
                                    Boolean(component._selected[record.uid]),
                                    api.SelectableFlags.SpanAllColumns |
                                        integer(options.selectableFlags, 0),
                                    0,
                                    number(options.rowHeight, 0)
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
                    componentScale(session, options.margin, 12),
                    api.Cond.FirstUseEver,
                    0
                );
            }
            api.setNextWindowSize(
                componentScale(session, options.width, 520),
                componentScale(session, options.height, 340),
                api.Cond.FirstUseEver
            );
            var title = String(options.title == null ? resolvedId : options.title) +
                "###imgui-data-table-window-" + resolvedId;
            api.withWindow(title, component.open, integer(options.flags, 0), function () {
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
            throw new TypeError("imgui.createWindow expects a render callback");
        }

        options = options || {};
        var initialTheme = options.theme == null ? null : resolveThemeName(options.theme);
        var appearanceName = options.appearance == null
            ? null
            : resolveAppearanceName(options.appearance);
        var initialStyle = {};
        var initialShadow = null;
        if (appearanceName) {
            copyOwnProperties(initialStyle, APPEARANCE_DEFINITIONS[appearanceName].style);
            initialShadow = APPEARANCE_DEFINITIONS[appearanceName].shadow;
        }
        if (options.rounding != null) {
            var commonRounding = requiredNumber(options.rounding, "createWindow rounding");
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
            var commonBorderSize = requiredNumber(options.borderSize, "createWindow borderSize");
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
            initialShadow = options.shadowColor;
        } else if (options.shadow != null) {
            if (options.shadow === false) {
                initialShadow = [0, 0, 0, 0];
            } else if (options.shadow === true) {
                initialShadow = [0, 0, 0, 0.30];
            } else if (typeof options.shadow === "number") {
                initialShadow = [0, 0, 0, clamp(options.shadow, 0, 1)];
            } else {
                initialShadow = options.shadow;
            }
        }
        if (api._activeSession) {
            api._activeSession.close("replaced");
        }

        var metrics = context.getResources().getDisplayMetrics();
        var density = number(metrics.density, 1);
        api._density = clamp(density, 0.5, 4);
        var displayWidth = metrics.widthPixels;
        var displayHeight = metrics.heightPixels;
        var mode = resolveWindowMode(options.mode);
        var activityMode = mode === api.WindowMode.Activity;
        var privilegedMode = mode === api.WindowMode.Privileged;
        var activityLikeMode = activityMode || privilegedMode;
        var privilegedBackend = String(
            options.privilegedBackend == null
                ? (options.backend == null ? "auto" : options.backend)
                : options.privilegedBackend
        );
        var privilegedTimeout = clamp(integer(options.startupTimeout, 10000), 1, 15000);
        var privilegedRotation = options.rotation == null ? 0 : integer(options.rotation, 0);
        if (options.rotation == null) {
            try {
                var displayRotation = context.getSystemService(android.content.Context.WINDOW_SERVICE)
                    .getDefaultDisplay().getRotation();
                privilegedRotation = [0, 90, 180, 270][integer(displayRotation, 0)] || 0;
            } catch (ignored) {
                privilegedRotation = 0;
            }
        }
        var requestedWidth = Math.max(
            1,
            integer(number(options.width, number(options.w, 360)) * density, 360)
        );
        var requestedHeight = Math.max(
            1,
            integer(number(options.height, number(options.h, 420)) * density, 420)
        );
        var width = activityLikeMode ? Math.max(1, displayWidth) : Math.min(requestedWidth, displayWidth);
        var height = activityLikeMode ? Math.max(1, displayHeight) : Math.min(requestedHeight, displayHeight);
        var margin = integer(12 * density, 12);
        var x = activityLikeMode
            ? 0
            : clamp(
                integer(options.x, Math.max(0, displayWidth - width - margin)),
                0,
                Math.max(0, displayWidth - width)
            );
        var y = activityLikeMode
            ? 0
            : clamp(
                integer(options.y, Math.max(0, displayHeight - height - integer(72 * density, 72))),
                0,
                Math.max(0, displayHeight - height)
            );
        var fps = clamp(integer(options.fps, 60), 15, 120);
        var frameDelay = Math.max(1, Math.round(1000 / fps));
        var collapsedFps = clamp(integer(options.collapsedFps, 5), 1, 15);
        var collapsedFrameDelay = Math.max(1, Math.round(1000 / collapsedFps));
        var movable = !activityLikeMode && options.movable !== false;
        var fontPath = options.fontPath == null ? null : String(options.fontPath);
        var fontSize = number(options.fontSize, 16);
        var configuredFonts = options.fonts == null ? [] : options.fonts;
        if (configuredFonts == null || typeof configuredFonts.length !== "number") {
            throw new TypeError("createWindow fonts expects an array of font definitions");
        }
        if (configuredFonts.length > 16) {
            throw new RangeError("createWindow accepts at most 16 additional fonts");
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
            var additionalPath;
            var additionalSize;
            var fontId;
            if (typeof fontDefinition === "string") {
                additionalPath = fontDefinition;
                additionalSize = fontSize;
                fontId = "font" + (fontIndex + 1);
            } else if (fontDefinition != null && typeof fontDefinition === "object") {
                if (fontDefinition.asset != null) {
                    additionalPath = "asset://" + String(fontDefinition.asset).replace(/^\/+/, "");
                } else {
                    additionalPath = fontDefinition.path == null ? "" : String(fontDefinition.path);
                }
                additionalSize = fontDefinition.size == null ? fontSize : fontDefinition.size;
                fontId = fontDefinition.id == null
                    ? (fontDefinition.name == null ? "font" + (fontIndex + 1) : fontDefinition.name)
                    : fontDefinition.id;
            } else {
                throw new TypeError("Each createWindow font must be a path or font definition object");
            }
            fontId = String(fontId);
            var fontAlias = normalizedKey(fontId);
            if (!fontAlias) {
                throw new TypeError("Additional font id must not be empty");
            }
            if (fontAliases.hasOwnProperty(fontAlias)) {
                throw new RangeError("Duplicate ImGui font id: " + fontId);
            }
            var resolvedFontIndex = api.Fonts.Icons + 1 + fontIndex;
            additionalFontPaths.push(String(additionalPath));
            additionalFontSizes.push(clamp(
                requiredNumber(additionalSize, "Additional font size"),
                8,
                128
            ));
            fontHandles[fontId] = resolvedFontIndex;
            fontAliases[fontAlias] = resolvedFontIndex;
        }
        fontHandles = freeze(fontHandles);
        api._fontAliases = fontAliases;
        var dragThreshold = Math.max(4, number(options.dragThreshold, 10) * density);
        var imeEnabled = !privilegedMode && options.ime !== false;
        var flingEnabled = options.fling !== false;
        var flingFriction = clamp(number(options.flingFriction, 5.5), 0.5, 30);
        var flingMinVelocity = Math.max(0, number(options.flingMinVelocity, 80) * density);
        var flingMaxVelocity = Math.max(
            flingMinVelocity, number(options.flingMaxVelocity, 8000) * density
        );
        var longPressAsRightClick = options.longPressAsRightClick !== false;
        var longPressDuration = clamp(integer(
            options.longPressDuration,
            android.view.ViewConfiguration.getLongPressTimeout()
        ), 250, 2000);
        var longPressSlop = Math.max(4, number(options.longPressSlop, 10) * density);
        var moreTouch = options.moreTouch === true;
        var touchMode = resolveTouchMode(
            options.touchMode == null ? options.touchable : options.touchMode
        );
        var globalAlpha = clamp(number(options.alpha, 1), 0, 1);
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
        var contentPadding = Math.max(0, number(options.contentPadding, 8) * density);
        var contentMinWidth = Math.max(1, number(options.contentMinWidth, 48) * density);
        var contentMinHeight = Math.max(1, number(options.contentMinHeight, 48) * density);
        var contentMaxWidth = Math.max(
            contentMinWidth,
            number(options.contentMaxWidth, displayWidth / density) * density
        );
        var contentMaxHeight = Math.max(
            contentMinHeight,
            number(options.contentMaxHeight, displayHeight / density) * density
        );
        var iniPath = resolveIniPath(options.iniPath);
        var collapseButtonOptions = options.collapseButton;
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
                width = integer(activitySize[0], width);
                height = integer(activitySize[1], height);
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
        var session = {
            window: windowObject,
            surfaceView: surfaceView,
            surface: privilegedSurface,
            imeView: imeView,
            mode: mode,
            privilegedBackend: privilegedMode ? privilegedBackend : null,
            density: density,
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
            fps: fps,
            collapsedFps: collapsedFps,
            frameScheduler: "deadline-timer",
            iniPath: iniPath,
            ready: false,
            closed: false,
            closeReason: null,
            theme: initialTheme || api.Themes.Dark,
            appearance: appearanceName,
            fonts: fontHandles,
            textures: managedTextures,
            _textures: managedTextures,
            buttons: managedButtons,
            _buttons: managedButtons,
            components: highLevelRuntime.components,
            _highLevel: highLevelRuntime,
            _closeRequested: false,
            _inFrame: false,
            _frameSerial: 0,
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

            createTexture: function (source, textureOptions) {
                return api.createTexture(source, textureOptions);
            },

            destroyTexture: function (texture) {
                return api.destroyTexture(texture);
            },

            getBackendInfo: function () {
                if (!privilegedMode || privilegedSurface == null) {
                    return "mode=" + session.mode;
                }
                return String(bridge.getPrivilegedSurfaceInfo(privilegedSurface));
            },

            on: function (eventName, listener) {
                if (typeof listener !== "function") {
                    throw new TypeError("Session event listener must be a function");
                }
                var key = String(eventName);
                if (!eventListeners[key]) {
                    eventListeners[key] = [];
                }
                eventListeners[key].push(listener);
                return session;
            },

            once: function (eventName, listener) {
                if (typeof listener !== "function") {
                    throw new TypeError("Session event listener must be a function");
                }
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
                if (session.closed || activityLikeMode) {
                    return session;
                }
                applySessionPosition(nextX, nextY, "api", true);
                return session;
            },

            setSize: function (nextWidth, nextHeight) {
                if (session.closed) {
                    return session;
                }
                if (activityMode) {
                    refreshActivitySize("api");
                } else if (privilegedMode) {
                    return session;
                } else {
                    applySessionSize(nextWidth, nextHeight, "api", true);
                }
                return session;
            },

            setTouchable: function (nextMode) {
                if (session.closed) {
                    return session;
                }
                var resolvedMode = resolveTouchMode(nextMode);
                if (session.touchMode !== resolvedMode) {
                    session.touchMode = resolvedMode;
                    applyTouchMode(true);
                }
                return session;
            },

            setMoreTouch: function (enabled) {
                if (session.closed) {
                    return session;
                }
                var resolvedMoreTouch = Boolean(enabled);
                if (session.moreTouch !== resolvedMoreTouch) {
                    session.moreTouch = resolvedMoreTouch;
                    applyHostMoreTouch(resolvedMoreTouch);
                    for (var buttonIndex = 0; buttonIndex < session._buttons.length; buttonIndex += 1) {
                        session._buttons[buttonIndex].setMoreTouch(resolvedMoreTouch);
                    }
                    emitSessionEvent("moreTouchChanged", {enabled: resolvedMoreTouch});
                }
                return session;
            },

            setAlpha: function (nextAlpha) {
                if (session.closed) {
                    return session;
                }
                var resolvedAlpha = clamp(requiredNumber(nextAlpha, "Window alpha"), 0, 1);
                if (privilegedMode && resolvedAlpha !== 1) {
                    throw new Error("Privileged windows do not yet support host-layer alpha");
                }
                if (session.alpha !== resolvedAlpha) {
                    session.alpha = resolvedAlpha;
                    if (!session.collapsed) {
                        applyHostAlpha(resolvedAlpha);
                    }
                    emitSessionEvent("alphaChanged", {alpha: resolvedAlpha});
                }
                return session;
            },

            setSecure: function (nextSecure) {
                if (session.closed) {
                    return session;
                }
                var resolvedSecure = Boolean(nextSecure);
                if (privilegedMode && resolvedSecure) {
                    throw new Error(
                        "Privileged windows do not yet support secure SurfaceControl layers"
                    );
                }
                if (session.secure !== resolvedSecure) {
                    session.secure = resolvedSecure;
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
                return session.collapsed ? session.expand() : session.collapse();
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
                var config = parseChoiceDialog("singleChoice", arguments);
                var dialog = createDialog(session, "singleChoice", config);
                dialog.items = config.items;
                dialog.selectedIndex = integer(config.selected, -1);
                return dialog.promise;
            },

            multiChoice: function () {
                var config = parseChoiceDialog("multiChoice", arguments);
                var dialog = createDialog(session, "multiChoice", config);
                dialog.items = config.items;
                dialog.choiceRefs = [];
                var selected = config.selected || [];
                var booleanSelection = selected.length === dialog.items.length &&
                    (selected.length === 0 || typeof selected[0] === "boolean");
                for (var itemIndex = 0; itemIndex < dialog.items.length; itemIndex += 1) {
                    var isSelected = booleanSelection ? Boolean(selected[itemIndex]) : false;
                    if (!booleanSelection) {
                        for (var selectedIndex = 0; selectedIndex < selected.length; selectedIndex += 1) {
                            if (integer(selected[selectedIndex], -1) === itemIndex) {
                                isSelected = true;
                                break;
                            }
                        }
                    }
                    dialog.choiceRefs.push(valueRef(isSelected));
                }
                dialog.selectedIndices = function () {
                    var result = [];
                    for (var choiceIndex = 0; choiceIndex < dialog.choiceRefs.length; choiceIndex += 1) {
                        if (dialog.choiceRefs[choiceIndex].value) {
                            result.push(choiceIndex);
                        }
                    }
                    return result;
                };
                return dialog.promise;
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

        var eventOptionNames = {
            moved: "onMoved",
            resized: "onResized",
            ready: "onReady",
            surfaceRestored: "onSurfaceRestored",
            collapsed: "onCollapsed",
            expanded: "onExpanded",
            closed: "onClosed",
            configurationChanged: "onConfigurationChanged",
            touchableChanged: "onTouchableChanged",
            moreTouchChanged: "onMoreTouchChanged",
            alphaChanged: "onAlphaChanged",
            secureChanged: "onSecureChanged"
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

        function emitSessionEvent(eventName, details) {
            var event = {
                type: String(eventName),
                session: session,
                timestamp: Date.now()
            };
            copyOwnProperties(event, details);
            var listeners = eventListeners[eventName];
            if (!listeners || listeners.length === 0) {
                return event;
            }
            listeners = listeners.slice();
            for (var listenerIndex = 0; listenerIndex < listeners.length; listenerIndex += 1) {
                try {
                    listeners[listenerIndex](event, session);
                } catch (error) {
                    console.error("[imgui] Session '" + eventName + "' listener failed: " + error);
                    if (error && error.stack) {
                        console.error(String(error.stack));
                    }
                }
            }
            return event;
        }

        function applyHostAlpha(alpha) {
            if (privilegedMode) {
                return;
            }
            try {
                bridge.setWindowAlpha(surfaceView, clamp(number(alpha, 1), 0, 1));
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
            var previousTouchable = session.touchable;
            var previousRegionCount = session.interactiveRegionCount;
            if (!privilegedMode) {
                try {
                    bridge.clearWindowTouchableRegion(surfaceView);
                } catch (ignored) {
                    // The view can already be detached while a close is in progress.
                }
            }
            session._touchRegionSignature = null;
            session.interactiveRegionCount = 0;
            if (session.collapsed || session.touchMode === api.TouchMode.Passthrough) {
                session.touchable = false;
                setHostTouchable(false);
            } else {
                session.touchable = true;
                setHostTouchable(true);
                if (!privilegedMode && session.touchMode === api.TouchMode.Auto) {
                    try {
                        bridge.setWindowTouchableRegion(surfaceView, floatArray([]));
                        session._touchRegionSignature = "";
                    } catch (error) {
                        console.warn("[imgui] Unable to initialize automatic touch region: " + error);
                    }
                }
            }
            if (emitChange && (previousTouchable !== session.touchable ||
                previousRegionCount !== session.interactiveRegionCount
            )) {
                emitSessionEvent("touchableChanged", {
                    mode: session.touchMode,
                    touchable: session.touchable,
                    interactiveRegionCount: session.interactiveRegionCount
                });
            } else if (emitChange) {
                emitSessionEvent("touchableChanged", {
                    mode: session.touchMode,
                    touchable: session.touchable,
                    interactiveRegionCount: session.interactiveRegionCount
                });
            }
        }

        function updateTouchableRegion() {
            if (privilegedMode || session.closed || session.collapsed || !session.ready || pointerDown ||
                session.touchMode !== api.TouchMode.Auto
            ) {
                return;
            }
            var rectangles = bridge.getInteractiveWindowRects();
            if (rectangles == null) {
                rectangles = floatArray([]);
            }
            var signatureParts = [];
            for (var rectangleIndex = 0; rectangleIndex < rectangles.length; rectangleIndex += 1) {
                signatureParts.push(Math.round(number(rectangles[rectangleIndex], 0) * 2));
            }
            var signature = signatureParts.join(",");
            if (session._touchRegionSignature === signature) {
                return;
            }
            var previousCount = session.interactiveRegionCount;
            if (bridge.setWindowTouchableRegion(surfaceView, rectangles)) {
                session._touchRegionSignature = signature;
                session.interactiveRegionCount = Math.floor(rectangles.length / 4);
                session.touchable = session.interactiveRegionCount > 0;
                if (previousCount !== session.interactiveRegionCount) {
                    emitSessionEvent("touchableChanged", {
                        mode: session.touchMode,
                        touchable: session.touchable,
                        interactiveRegionCount: session.interactiveRegionCount
                    });
                }
            }
        }

        function applySessionPosition(nextX, nextY, source, remember) {
            if (activityLikeMode) {
                return;
            }
            var resolvedX = clamp(
                integer(nextX, session.x),
                0,
                Math.max(0, session.displayWidth - session.width)
            );
            var resolvedY = clamp(
                integer(nextY, session.y),
                0,
                Math.max(0, session.displayHeight - session.height)
            );
            if (remember) {
                session._preferredX = integer(nextX, resolvedX);
                session._preferredY = integer(nextY, resolvedY);
            }
            if (resolvedX === session.x && resolvedY === session.y) {
                return;
            }
            var oldX = session.x;
            var oldY = session.y;
            session.x = resolvedX;
            session.y = resolvedY;
            session._touchRegionSignature = null;
            windowObject.setPosition(resolvedX, resolvedY);
            emitSessionEvent("moved", {
                x: resolvedX,
                y: resolvedY,
                oldX: oldX,
                oldY: oldY,
                source: source || "api"
            });
        }

        function applySessionSize(nextWidth, nextHeight, source, remember) {
            if (activityLikeMode) {
                return;
            }
            var requestedNextWidth = Math.max(1, integer(nextWidth, session.width));
            var requestedNextHeight = Math.max(1, integer(nextHeight, session.height));
            if (remember) {
                session._preferredWidth = requestedNextWidth;
                session._preferredHeight = requestedNextHeight;
            }
            var resolvedWidth = Math.min(requestedNextWidth, Math.max(1, session.displayWidth));
            var resolvedHeight = Math.min(requestedNextHeight, Math.max(1, session.displayHeight));
            if (resolvedWidth === session.width && resolvedHeight === session.height) {
                return;
            }
            var oldWidth = session.width;
            var oldHeight = session.height;
            session.width = resolvedWidth;
            session.height = resolvedHeight;
            session._touchRegionSignature = null;
            if (!session.collapsed) {
                windowObject.setSize(resolvedWidth, resolvedHeight);
            }
            applySessionPosition(session.x, session.y, source || "resize", false);
            emitSessionEvent("resized", {
                width: resolvedWidth,
                height: resolvedHeight,
                oldWidth: oldWidth,
                oldHeight: oldHeight,
                source: source || "api"
            });
        }

        function refreshActivitySize(source) {
            if (!activityMode || session.closed) {
                return false;
            }
            var size = bridge.getViewSize(surfaceView);
            if (size == null || size.length < 2 || size[0] <= 0 || size[1] <= 0) {
                return false;
            }
            var nextWidth = integer(size[0], session.width);
            var nextHeight = integer(size[1], session.height);
            if (nextWidth === session.width && nextHeight === session.height) {
                return false;
            }
            var oldWidth = session.width;
            var oldHeight = session.height;
            session.width = nextWidth;
            session.height = nextHeight;
            session._preferredWidth = nextWidth;
            session._preferredHeight = nextHeight;
            emitSessionEvent("resized", {
                width: nextWidth,
                height: nextHeight,
                oldWidth: oldWidth,
                oldHeight: oldHeight,
                source: source || "activity"
            });
            return true;
        }

        function updateConfiguration(force) {
            var now = Date.now();
            if (!force && now - session._lastConfigurationCheck < 250) {
                return;
            }
            session._lastConfigurationCheck = now;
            var currentMetrics = context.getResources().getDisplayMetrics();
            var nextDisplayWidth = Math.max(1, integer(currentMetrics.widthPixels, session.displayWidth));
            var nextDisplayHeight = Math.max(1, integer(currentMetrics.heightPixels, session.displayHeight));
            var changed = nextDisplayWidth !== session.displayWidth ||
                nextDisplayHeight !== session.displayHeight;
            if (!changed && !force) {
                return;
            }
            var oldDisplayWidth = session.displayWidth;
            var oldDisplayHeight = session.displayHeight;
            session.displayWidth = nextDisplayWidth;
            session.displayHeight = nextDisplayHeight;
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
            } else if (responsive) {
                applySessionSize(
                    Math.min(session._preferredWidth, nextDisplayWidth),
                    Math.min(session._preferredHeight, nextDisplayHeight),
                    "configuration",
                    false
                );
                applySessionPosition(
                    clamp(session._preferredX, 0, Math.max(0, nextDisplayWidth - session.width)),
                    clamp(session._preferredY, 0, Math.max(0, nextDisplayHeight - session.height)),
                    "configuration",
                    false
                );
            }
            for (var buttonIndex = 0; buttonIndex < session._buttons.length; buttonIndex += 1) {
                var button = session._buttons[buttonIndex];
                button.setPosition(button.x, button.y, "configuration");
            }
            emitSessionEvent("configurationChanged", {
                width: nextDisplayWidth,
                height: nextDisplayHeight,
                oldWidth: oldDisplayWidth,
                oldHeight: oldDisplayHeight,
                orientation: nextDisplayWidth >= nextDisplayHeight ? "landscape" : "portrait"
            });
        }

        function updateContentAutoSize() {
            if (activityLikeMode || session.collapsed || !contentAutoResize || !session.ready) {
                return;
            }
            var bounds = bridge.getAutoResizeBounds();
            if (bounds == null || bounds.length < 4) {
                return;
            }
            var targetWidth = clamp(
                Math.ceil(number(bounds[2], session.width) + contentPadding),
                contentMinWidth,
                Math.min(contentMaxWidth, session.displayWidth)
            );
            var targetHeight = clamp(
                Math.ceil(number(bounds[3], session.height) + contentPadding),
                contentMinHeight,
                Math.min(contentMaxHeight, session.displayHeight)
            );
            if (Math.abs(targetWidth - session.width) >= 2 ||
                Math.abs(targetHeight - session.height) >= 2
            ) {
                applySessionSize(targetWidth, targetHeight, "content", true);
            }
        }

        function createFloatingButton(label, callback, buttonOptions) {
            if (session.closed) {
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
                    throw new TypeError("addButtonEx callback must be a function");
                }
            }
            buttonOptions = buttonOptions || {};
            var buttonWidth = Math.max(
                1,
                integer(number(buttonOptions.width, number(buttonOptions.size, 56)) * density, 56)
            );
            var buttonHeight = Math.max(
                1,
                integer(number(buttonOptions.height, number(buttonOptions.size, 56)) * density, 56)
            );
            var buttonX = clamp(
                integer(buttonOptions.x, session.x + Math.max(0, session.width - buttonWidth)),
                0,
                Math.max(0, session.displayWidth - buttonWidth)
            );
            var buttonY = clamp(
                integer(buttonOptions.y, session.y),
                0,
                Math.max(0, session.displayHeight - buttonHeight)
            );
            var buttonAlpha = clamp(number(buttonOptions.alpha, 1), 0, 1);
            var buttonSecure = buttonOptions.secure == null
                ? session.secure
                : Boolean(buttonOptions.secure);
            var buttonMoreTouch = buttonOptions.moreTouch == null
                ? session.moreTouch
                : Boolean(buttonOptions.moreTouch);
            var buttonTouchable = buttonOptions.touchable !== false;
            var buttonVisible = buttonOptions.visible !== false && buttonOptions.hidden !== true;
            var buttonDraggable = buttonOptions.draggable !== false;
            var buttonWindow = floaty.rawWindow(
                '<frame bg="#00000000"><text id="imgui_button" w="*" h="*" gravity="center" /></frame>'
            );
            var buttonView = buttonWindow.imgui_button;
            var background = new GradientDrawable();
            background.setShape(GradientDrawable.RECTANGLE);
            background.setColor(androidColor(
                buttonOptions.backgroundColor,
                [0.345, 0.396, 0.949, 0.92],
                "Button backgroundColor"
            ));
            background.setCornerRadius(Math.max(
                0,
                number(buttonOptions.rounding, Math.min(buttonWidth, buttonHeight) / density / 2) * density
            ));
            var strokeWidth = Math.max(0, integer(number(buttonOptions.borderWidth, 1) * density, 1));
            if (strokeWidth > 0) {
                background.setStroke(strokeWidth, androidColor(
                    buttonOptions.borderColor,
                    [1, 1, 1, 0.32],
                    "Button borderColor"
                ));
            }
            buttonView.setBackground(background);
            buttonView.setText(String(label == null ? "" : label));
            buttonView.setTextColor(androidColor(
                buttonOptions.textColor,
                [1, 1, 1, 1],
                "Button textColor"
            ));
            buttonView.setTextSize(
                android.util.TypedValue.COMPLEX_UNIT_SP,
                number(buttonOptions.textSize, 16)
            );
            buttonView.setGravity(Gravity.CENTER);
            if (android.os.Build.VERSION.SDK_INT >= 21) {
                buttonView.setElevation(Math.max(0, number(buttonOptions.elevation, 8) * density));
            }
            buttonWindow.setSize(buttonVisible ? buttonWidth : 1, buttonVisible ? buttonHeight : 1);
            buttonWindow.setPosition(buttonX, buttonY);

            var floatingButton = {
                window: buttonWindow,
                view: buttonView,
                session: session,
                text: String(label == null ? "" : label),
                x: buttonX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                alpha: buttonAlpha,
                secure: buttonSecure,
                moreTouch: buttonMoreTouch,
                visible: buttonVisible,
                touchable: buttonTouchable,
                closed: false,

                setPosition: function (nextX, nextY, source) {
                    if (floatingButton.closed) {
                        return floatingButton;
                    }
                    var resolvedX = clamp(
                        integer(nextX, floatingButton.x),
                        0,
                        Math.max(0, session.displayWidth - floatingButton.width)
                    );
                    var resolvedY = clamp(
                        integer(nextY, floatingButton.y),
                        0,
                        Math.max(0, session.displayHeight - floatingButton.height)
                    );
                    if (resolvedX === floatingButton.x && resolvedY === floatingButton.y) {
                        return floatingButton;
                    }
                    floatingButton.x = resolvedX;
                    floatingButton.y = resolvedY;
                    buttonWindow.setPosition(resolvedX, resolvedY);
                    if (typeof buttonOptions.onMoved === "function") {
                        buttonOptions.onMoved({
                            button: floatingButton,
                            session: session,
                            x: resolvedX,
                            y: resolvedY,
                            source: source || "api"
                        });
                    }
                    return floatingButton;
                },

                setText: function (nextText) {
                    if (!floatingButton.closed) {
                        floatingButton.text = String(nextText == null ? "" : nextText);
                        buttonView.setText(floatingButton.text);
                    }
                    return floatingButton;
                },

                setAlpha: function (nextAlpha) {
                    if (!floatingButton.closed) {
                        floatingButton.alpha = clamp(requiredNumber(nextAlpha, "Button alpha"), 0, 1);
                        bridge.setWindowAlpha(
                            buttonView,
                            floatingButton.visible ? floatingButton.alpha : 0
                        );
                    }
                    return floatingButton;
                },

                setSecure: function (nextSecure) {
                    if (!floatingButton.closed) {
                        floatingButton.secure = Boolean(nextSecure);
                        bridge.setWindowSecure(buttonView, floatingButton.secure);
                    }
                    return floatingButton;
                },

                setMoreTouch: function (enabled) {
                    if (!floatingButton.closed) {
                        floatingButton.moreTouch = Boolean(enabled);
                        bridge.setWindowSplitTouch(buttonView, floatingButton.moreTouch);
                    }
                    return floatingButton;
                },

                setTouchable: function (nextTouchable) {
                    if (!floatingButton.closed) {
                        floatingButton.touchable = Boolean(nextTouchable);
                        buttonWindow.setTouchable(
                            floatingButton.visible && floatingButton.touchable
                        );
                    }
                    return floatingButton;
                },

                setVisible: function (visible) {
                    if (floatingButton.closed) {
                        return floatingButton;
                    }
                    floatingButton.visible = Boolean(visible);
                    if (floatingButton.visible) {
                        buttonWindow.setSize(floatingButton.width, floatingButton.height);
                        buttonWindow.setPosition(floatingButton.x, floatingButton.y);
                        bridge.setWindowAlpha(buttonView, floatingButton.alpha);
                        buttonWindow.setTouchable(floatingButton.touchable);
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
                    if (floatingButton.closed) {
                        return;
                    }
                    floatingButton.closed = true;
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
                }
            };

            var buttonDownRawX = 0;
            var buttonDownRawY = 0;
            var buttonOriginX = buttonX;
            var buttonOriginY = buttonY;
            var buttonDragging = false;
            buttonView.setOnTouchListener(function (view, event) {
                if (floatingButton.closed || !floatingButton.visible || !floatingButton.touchable) {
                    return false;
                }
                var action = event.getActionMasked();
                var rawX = event.getRawX();
                var rawY = event.getRawY();
                if (action === MotionEvent.ACTION_DOWN) {
                    buttonDownRawX = rawX;
                    buttonDownRawY = rawY;
                    buttonOriginX = floatingButton.x;
                    buttonOriginY = floatingButton.y;
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
                        floatingButton.setPosition(
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
                    if (clicked && typeof callback === "function") {
                        try {
                            callback(floatingButton, session);
                        } catch (error) {
                            console.error("[imgui] Floating button callback failed: " + error);
                            if (error && error.stack) {
                                console.error(String(error.stack));
                            }
                        }
                    }
                    return true;
                }
                return true;
            });

            session._buttons.push(floatingButton);
            floatingButton.setSecure(buttonSecure);
            floatingButton.setMoreTouch(buttonMoreTouch);
            floatingButton.setAlpha(buttonAlpha);
            floatingButton.setVisible(buttonVisible);
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
                if (resolvedOptions.x == null) {
                    resolvedOptions.x = session.x + Math.max(
                        0,
                        session.width - integer(number(resolvedOptions.size, 56) * density, 56)
                    );
                }
                if (resolvedOptions.y == null) {
                    resolvedOptions.y = session.y;
                }
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
            if (session.closed || session.collapsed) {
                return;
            }
            if (privilegedMode) {
                throw new Error("Collapsing a privileged SurfaceControl layer is not supported yet");
            }
            session.collapsed = true;
            session._expandedBounds = {
                x: session.x,
                y: session.y,
                width: session.width,
                height: session.height
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
            session.interactiveRegionCount = 0;
            session._touchRegionSignature = null;
            session.touchable = false;
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
            if (session.closed || !session.collapsed) {
                return;
            }
            if (session._collapseButton != null) {
                session._collapseButton.hide();
            }
            if (!activityMode) {
                windowObject.setSize(session.width, session.height);
                windowObject.setPosition(session.x, session.y);
            }
            session.collapsed = false;
            applyHostAlpha(session.alpha);
            applyTouchMode(false);
            emitSessionEvent("expanded", {
                x: session.x,
                y: session.y,
                width: session.width,
                height: session.height
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
            if (session.closed) {
                return;
            }
            session.closed = true;
            session.ready = false;
            disposeHighLevelComponents(session, session.closeReason || "session-closed");
            if (session._timer != null) {
                clearTimeout(session._timer);
                session._timer = null;
            }
            cancelLongPress();
            cancelPressedButton();
            stopFling();
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
            emitSessionEvent("closed", {reason: session.closeReason || "closed"});
            eventListeners = {};
        }

        function onExit() {
            session.close("engine-exit");
        }

        function initializeNativeSurface(nativeSurface, restored) {
            if (session.closed || api._activeSession !== session || session._surfaceInitializing) {
                return;
            }
            if (session._nativeInitialized && !session._surfaceDetached && bridge.isReady()) {
                session.ready = true;
                return;
            }
            session._surfaceInitializing = true;
            try {
                if (restored) {
                    session.ready = Boolean(bridge.attachSurface(nativeSurface));
                } else if (session._nativeInitialized && bridge.isReady()) {
                    session.ready = true;
                } else {
                    session.ready = Boolean(bridge.init(
                        nativeSurface, density, fontPath, fontSize, iniPath,
                        stringArray(additionalFontPaths), floatArray(additionalFontSizes)
                    ));
                }
                if (!session.ready) {
                    session.close(restored ? "surface-restoration-failed" : "initialization-failed");
                    return;
                }
                session._nativeInitialized = true;
                session._surfaceDetached = false;
                if (!restored) {
                    if (initialTheme) {
                        session.theme = api.setTheme(initialTheme);
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
                applyHostSecure(session.secure);
                applyHostMoreTouch(session.moreTouch);
                applyHostAlpha(session.collapsed ? 0 : session.alpha);
                applyTouchMode(false);
                updateConfiguration(true);
                emitSessionEvent(restored ? "surfaceRestored" : "ready", {
                    restored: restored,
                    mode: session.mode,
                    backend: privilegedMode ? privilegedBackend : null,
                    width: session.width,
                    height: session.height
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
                    } else if (surfaceWidth > 0 && surfaceHeight > 0 && !session.collapsed) {
                        var changedWidth = integer(surfaceWidth, session.width);
                        var changedHeight = integer(surfaceHeight, session.height);
                        if (changedWidth !== session.width || changedHeight !== session.height) {
                            var oldWidth = session.width;
                            var oldHeight = session.height;
                            session.width = changedWidth;
                            session.height = changedHeight;
                            emitSessionEvent("resized", {
                                width: changedWidth,
                                height: changedHeight,
                                oldWidth: oldWidth,
                                oldHeight: oldHeight,
                                source: "surface"
                            });
                        }
                    }
                    updateConfiguration(true);
                },
                surfaceDestroyed: function () {
                    if (session.closed) {
                        return;
                    }
                    session.ready = false;
                    setImeTargetVisible(false);
                    if (api._activeSession === session && session._nativeInitialized && bridge.isOwner()) {
                        try {
                            session._surfaceDetached = Boolean(bridge.detachSurface());
                        } catch (error) {
                            session._surfaceDetached = false;
                            console.warn("[imgui] Surface detachment failed: " + error);
                        }
                    }
                }
            });
            holder.addCallback(surfaceCallback);

            // rawWindow may finish creating its Surface before the callback reaches the holder.
            try {
                surfaceView.post(new Runnable({
                    run: function () {
                        if (session.closed || session._nativeInitialized) {
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
        applyHostSecure(session.secure);
        applyHostMoreTouch(session.moreTouch);
        applyHostAlpha(session.alpha);
        applyTouchMode(false);

        // Register the holder callback before hopping to the main thread to add the IME proxy.
        // Otherwise SurfaceView may create its surface during that hop and the initial
        // surfaceCreated notification will be missed, leaving the session permanently unready.
        if (imeEnabled) {
            try {
                imeView = bridge.createImeView(surfaceView);
                session.imeView = imeView;
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
                if (session.closed || session._imeTargetVisible !== visible) {
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
                    session.closed || session._closeRequested || api._activeSession !== session ||
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
            if (!session.ready || session.closed || api._activeSession !== session) {
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
                originX = session.x;
                originY = session.y;
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
                    wheelLastY = (event.getY(0) + event.getY(1)) / 2;
                    wheelLastTime = Number(event.getEventTime());
                    wheelVelocity = 0;
                }
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
                    session.setPosition(
                        clamp(originX + Math.round(movedX), 0, Math.max(0, displayWidth - session.width)),
                        clamp(originY + Math.round(movedY), 0, Math.max(0, displayHeight - session.height))
                    );
                } else {
                    bridge.touchEvent(2, eventX, eventY, Math.max(0, pressedMouseButton));
                }
                return true;
            }

            if (action === MotionEvent.ACTION_UP || action === MotionEvent.ACTION_CANCEL) {
                cancelLongPress();
                var completedWheelGesture = wheeling && action === MotionEvent.ACTION_UP;
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

        function scheduleNextFrame() {
            if (!session.closed && !session._closeRequested) {
                var now = Date.now();
                var nextDelay = session.collapsed ? collapsedFrameDelay : frameDelay;
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
                session.close(session.closeReason || "replaced");
                return;
            }
            updateConfiguration(false);
            if (session.ready && !bridge.isOwner()) {
                session.close("native-context-replaced");
                return;
            }
            if (session.collapsed) {
                scheduleNextFrame();
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
                dispatchFling();
                frameStarted = Boolean(bridge.newFrame());
                if (frameStarted) {
                    renderCallback(api, session);
                    if (!session._closeRequested) {
                        renderHighLevelComponents(session);
                    }
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
            if (frameRendered) {
                try {
                    updateTouchableRegion();
                    updateContentAutoSize();
                    setImeTargetVisible(Boolean(bridge.wantTextInput()));
                } catch (error) {
                    setImeTargetVisible(false);
                    console.warn("[imgui] Unable to update post-frame session state: " + error);
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
        scheduleNextFrame();
        return session;
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
        if (!api._activeSession || api._activeSession.closed) {
            throw new Error("imgui.addButtonEx requires an active ImGui session");
        }
        return api._activeSession.addButtonEx(label, callback, options);
    };
    api.setTouchable = function (touchMode) {
        if (api._activeSession) {
            api._activeSession.setTouchable(touchMode);
        }
        return api._activeSession;
    };
    api.setMoreTouch = function (enabled) {
        if (api._activeSession) {
            api._activeSession.setMoreTouch(enabled);
        }
        return api._activeSession;
    };
    api.setGlobalAlpha = function (alpha) {
        if (api._activeSession) {
            api._activeSession.setAlpha(alpha);
        }
        return api._activeSession;
    };
    api.setSecure = function (secure) {
        if (api._activeSession) {
            api._activeSession.setSecure(secure);
        }
        return api._activeSession;
    };
    api.collapseWindow = function () {
        if (api._activeSession) {
            api._activeSession.collapse();
        }
        return api._activeSession;
    };
    api.expandWindow = function () {
        if (api._activeSession) {
            api._activeSession.expand();
        }
        return api._activeSession;
    };
    api.getComponent = function (type, id) {
        if (!api._activeSession || api._activeSession.closed) {
            return null;
        }
        return findHighLevelComponent(api._activeSession, type, id);
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
        Toggle: "toggle",
        ToggleSwitch: "toggle",
        BeginCombo: "beginCombo",
        EndCombo: "endCombo",
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
        GetTextLineHeightWithSpacing: "getTextLineHeightWithSpacing"
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
