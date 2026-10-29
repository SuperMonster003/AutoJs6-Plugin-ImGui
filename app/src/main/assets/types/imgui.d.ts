// Type definitions for AutoJs6 Plugin ImGui
// Project: https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui
// Definitions: bundled with the plugin APK at assets/types/imgui.d.ts
// TypeScript Version: 5.1

/**
 * Dear ImGui facade exposed by AutoJs6 Plugin ImGui.
 *
 * @example
 * const enabled = imgui.bool(true);
 * imgui.createWindow(() => {
 *     imgui.begin("Typed window");
 *     imgui.checkbox("Enabled", enabled);
 *     imgui.end();
 * });
 */
declare namespace ImGui {
    type MutableValue<T> = ValueRef<T> | IndexedRef<T>;
    type Point = readonly [number, number] | { x: number; y: number };
    /**
     * A color in one of four forms:
     * - a packed 32-bit integer in Dear ImGui order 0xAABBGGRR, as returned by imgui.colorU32;
     * - an array [r, g, b] or [r, g, b, a];
     * - an object {r, g, b, a?};
     * - a string "#rgb", "#rgba", "#rrggbb" or "#rrggbbaa".
     *
     * Array and object components are 0..1; a component above 1 is read as 0..255. Alpha defaults to 1. Functions that
     * take a color also accept the components positionally (r, g, b, a). An invalid color throws TypeError or
     * RangeError naming the function and the argument.
     */
    type Color =
        | number
        | string
        | readonly [number, number, number]
        | readonly [number, number, number, number]
        | { r: number; g: number; b: number; a?: number };
    type ThemeName =
        | "dark"
        | "light"
        | "classic"
        | "pink"
        | "blue"
        | "modern-dark"
        | "cyan-dusk"
        | "orange-dark"
        | "crystal-clear"
        | "vibrant-night"
        | "purple-dream";
    type AppearanceName = "flat" | "rounded" | "card";
    type TouchMode = "touchable" | "passthrough" | "auto";
    type WindowMode = "overlay" | "activity" | "privileged";
    type PrivilegedBackend = "auto" | "shizuku" | "root";
    type ActivePrivilegedBackend = Exclude<PrivilegedBackend, "auto">;
    type BackendStatus = "available" | "experimental" | "unavailable" | "deferred";
    type LogLevel = "log" | "debug" | "info" | "warn" | "error";
    type ToastPosition =
        | "top-left"
        | "top-center"
        | "top-right"
        | "center"
        | "bottom-left"
        | "bottom-center"
        | "bottom-right";
    type NumericConstants<K extends string> = Readonly<Record<K, number>>;
    type StringConstants<K extends string> = Readonly<Record<K, string>>;
    type FrameBody = () => void;
    type RenderCallback = (ui: Api, session: Session) => void;
    type TextureSource = string | readonly number[] | object;

    interface ValueRef<T> {
        value: T;
    }

    /** A one-element Java array returned by bool/int/float/string. */
    interface IndexedRef<T> {
        0: T;
        readonly length: 1;
    }

    interface BackendCapabilities {
        readonly schemaVersion: number;
        readonly sdk: number;
        readonly window: Readonly<{
            status: BackendStatus;
            productionReady: boolean;
            requiresOverlayPermission: boolean;
        }>;
        readonly splitTouch: Readonly<{
            status: BackendStatus;
            productionReady: boolean;
        }>;
        readonly privileged: Readonly<{
            status: BackendStatus;
            productionReady: boolean;
            protocolVersion: number;
            legacySocketProtocolVersion: number;
            transport: string;
            rendererProcess: string;
            tokenBits: number;
            processEntrypoint: boolean;
            surfaceControlApi: boolean;
            launcherCandidate: boolean;
            hostBridgeAvailable: boolean;
            rootBridgeAvailable: boolean;
            rootMode: string;
            rootBinaryPresent: boolean;
            rootCandidate: boolean;
            rootError: string;
            shizukuBridgeAvailable: boolean;
            shizukuInstalled: boolean;
            shizukuRunning: boolean;
            shizukuPermission: boolean;
            shizukuService: boolean;
            shizukuOperational: boolean;
            shizukuError: string;
            reason: string;
        }>;
        readonly directInput: Readonly<{
            status: BackendStatus;
            productionReady: boolean;
            readerImplemented: boolean;
            appProcessReadable: boolean;
            runtimeProbeRequired: boolean;
            routingPolicy: string;
            reason: string;
        }>;
        readonly docking: Readonly<{
            status: BackendStatus;
            productionReady: boolean;
        }>;
        readonly multiViewport: Readonly<{
            status: BackendStatus;
            productionReady: boolean;
        }>;
    }

    /** A Java primitive/object array returned by floats/bytes/strings. */
    interface NativeArray<T> {
        [index: number]: T;
        readonly length: number;
    }

    interface Vec2 extends NativeArray<number> {
        0: number;
        1: number;
        readonly length: 2;
    }

    interface PlotOptions {
        /** Index of the plotted sample the plot starts at (it wraps around), 0 by default. */
        valuesOffset?: number;
        /** @deprecated Name read by 1.10.0 and earlier, used when valuesOffset is absent. */
        offset?: number;
        overlay?: string;
        scaleMin?: number;
        scaleMax?: number;
        width?: number;
        height?: number;
        /** Plots every stride-th value (values[0], values[stride], ...), 1 by default. Counts values, not bytes. */
        stride?: number;
    }

    interface TextureOptions {
        flags?: number;
        nearest?: boolean;
        repeat?: boolean;
        mipmaps?: boolean;
    }

    interface ImageOptions {
        width?: number;
        height?: number;
        uv0?: Point;
        uv1?: Point;
        background?: Color;
        bg?: Color;
        tint?: Color;
    }

    interface DrawTextOptions {
        font?: number | string;
        size?: number;
        wrapWidth?: number;
    }

    interface DrawPolylineOptions {
        thickness?: number;
        closed?: boolean | number;
        flags?: number;
    }

    interface DrawImageOptions {
        uv0?: Point;
        uv1?: Point;
        tint?: Color;
    }

    interface Texture {
        readonly handle: number;
        readonly width: number;
        readonly height: number;
        isDisposed(): boolean;
        dispose(): boolean;
        close(): boolean;
        toString(): string;
    }

    interface DrawList {
        readonly layer: number;
        addLine(first: Point, second: Point, color: Color, thickness?: number): DrawList;
        addRect(
            minimum: Point,
            maximum: Point,
            color: Color,
            rounding?: number,
            thickness?: number,
            flags?: number,
        ): DrawList;
        addRectFilled(
            minimum: Point,
            maximum: Point,
            color: Color,
            rounding?: number,
            flags?: number,
        ): DrawList;
        addCircle(
            center: Point,
            radius: number,
            color: Color,
            segments?: number,
            thickness?: number,
        ): DrawList;
        addCircleFilled(center: Point, radius: number, color: Color, segments?: number): DrawList;
        addTriangle(
            first: Point,
            second: Point,
            third: Point,
            color: Color,
            thickness?: number,
        ): DrawList;
        addTriangleFilled(first: Point, second: Point, third: Point, color: Color): DrawList;
        addText(position: Point, color: Color, text: unknown, options?: DrawTextOptions): DrawList;
        addPolyline(
            points: readonly Point[],
            color: Color,
            thickness?: number | DrawPolylineOptions,
            closed?: boolean | number,
        ): DrawList;
        addBezierCubic(
            first: Point,
            second: Point,
            third: Point,
            fourth: Point,
            color: Color,
            thickness?: number,
            segments?: number,
        ): DrawList;
        addImage(texture: Texture, minimum: Point, maximum: Point, options?: DrawImageOptions): DrawList;

        readonly AddLine: DrawList["addLine"];
        readonly AddRect: DrawList["addRect"];
        readonly AddRectFilled: DrawList["addRectFilled"];
        readonly AddCircle: DrawList["addCircle"];
        readonly AddCircleFilled: DrawList["addCircleFilled"];
        readonly AddTriangle: DrawList["addTriangle"];
        readonly AddTriangleFilled: DrawList["addTriangleFilled"];
        readonly AddText: DrawList["addText"];
        readonly AddPolyline: DrawList["addPolyline"];
        readonly AddBezierCubic: DrawList["addBezierCubic"];
        readonly AddImage: DrawList["addImage"];
    }

    interface FontDefinition {
        id?: string;
        name?: string;
        path?: string;
        asset?: string;
        size?: number;
    }

    /**
     * Options of a floating Android button. Sizes and positions are dp; values out of range throw RangeError.
     */
    interface FloatingButtonOptions {
        /** Width and height in dp when width or height is omitted, default 56. */
        size?: number;
        /** Width in dp. */
        width?: number;
        /** Height in dp. */
        height?: number;
        /** Left edge in dp, clamped to the display. */
        x?: number;
        /** Top edge in dp, clamped to the display. */
        y?: number;
        /** Opacity 0..1. */
        alpha?: number;
        backgroundColor?: Color;
        borderColor?: Color;
        /** Border width in dp. */
        borderWidth?: number;
        /** Corner radius in dp, half the smaller side by default. */
        rounding?: number;
        textColor?: Color;
        /** Label size in sp, default 16. */
        textSize?: number;
        /** Shadow elevation in dp, default 8. */
        elevation?: number;
        draggable?: boolean;
        touchable?: boolean;
        moreTouch?: boolean;
        visible?: boolean;
        hidden?: boolean;
        secure?: boolean;
        /** Runs on the script thread. */
        onClick?: (button: FloatingButton) => void;
        /** Runs on the script thread after the button moved. */
        onMoved?: (event: {
            readonly button: FloatingButton;
            readonly session: Session;
            /** New left edge in dp. */
            readonly x: number;
            /** New top edge in dp. */
            readonly y: number;
            /** "drag" when the user dragged the button, "api" for setPosition, "configuration" after a display change. */
            readonly source: string;
        }) => void;
    }

    /** A floating Android button. Fields are read-only; change them with the setters. */
    interface FloatingButton {
        readonly window: unknown;
        readonly view: unknown;
        readonly session: Session;
        readonly text: string;
        /** Left edge in dp. */
        readonly x: number;
        /** Top edge in dp. */
        readonly y: number;
        /** Width in dp. */
        readonly width: number;
        /** Height in dp. */
        readonly height: number;
        readonly alpha: number;
        readonly secure: boolean;
        readonly moreTouch: boolean;
        readonly visible: boolean;
        readonly touchable: boolean;
        readonly closed: boolean;
        setText(text: unknown): FloatingButton;
        /** Moves the button to (x, y) in dp, clamped to the display; null keeps that coordinate. */
        setPosition(x: number | null, y: number | null): FloatingButton;
        /** Opacity 0..1. */
        setAlpha(alpha: number): FloatingButton;
        setSecure(secure: boolean): FloatingButton;
        setMoreTouch(enabled: boolean): FloatingButton;
        setTouchable(touchable: boolean): FloatingButton;
        setVisible(visible: boolean): FloatingButton;
        show(): FloatingButton;
        hide(): FloatingButton;
        close(): void;
    }

    /**
     * Options of imgui.createWindow. Sizes and positions of the Android window are dp (1 dp = imgui.density px);
     * coordinates inside a frame (setNextWindowPos, drawing, ...) stay px. A value of the wrong type, NaN or out of
     * range throws TypeError or RangeError naming the option.
     */
    interface WindowOptions {
        mode?: WindowMode;
        /** Privileged launcher selection. Auto prefers an operational host Shizuku service. */
        backend?: PrivilegedBackend;
        /** Alias of backend, used only when mode is privileged. */
        privilegedBackend?: PrivilegedBackend;
        /** Privileged child startup deadline in milliseconds, 1..15000, default 10000. */
        startupTimeout?: number;
        /** Touch-coordinate rotation in degrees; inferred from the display when omitted. */
        rotation?: 0 | 90 | 180 | 270;
        /** Overlay width in dp, at least 1, default 360; limited to the display. */
        width?: number;
        /** Alias of width. */
        w?: number;
        /** Overlay height in dp, at least 1, default 420; limited to the display. */
        height?: number;
        /** Alias of height. */
        h?: number;
        /** Left edge in dp, clamped to the display; 12 dp from the right edge by default. */
        x?: number;
        /** Top edge in dp, clamped to the display; 72 dp above the bottom edge by default. */
        y?: number;
        /** Frame rate while expanded, 15..120, default 60. */
        fps?: number;
        /** Frame rate while collapsed, 1..15, default 5. */
        collapsedFps?: number;
        movable?: boolean;
        fontPath?: string;
        /** Default font size in dp, 8..64, default 16. */
        fontSize?: number;
        /** Additional fonts, at most 16; FontDefinition.size is dp, 8..128. */
        fonts?: readonly (string | FontDefinition)[];
        iniPath?: string | false | null;
        ime?: boolean;
        fling?: boolean;
        /** Fling deceleration, 0.5..30, default 5.5. */
        flingFriction?: number;
        /** Slowest fling in dp per second, default 80. */
        flingMinVelocity?: number;
        /** Fastest fling in dp per second, default 8000. */
        flingMaxVelocity?: number;
        /** Distance in dp a touch must move before it drags, default 10. */
        dragThreshold?: number;
        longPressAsRightClick?: boolean;
        /** Long-press delay in milliseconds, 250..2000; the system long-press timeout by default. */
        longPressDuration?: number;
        /** Distance in dp a long press may move, default 10. */
        longPressSlop?: number;
        moreTouch?: boolean;
        touchMode?: TouchMode | boolean;
        touchable?: TouchMode | boolean;
        /** Window opacity 0..1, default 1. */
        alpha?: number;
        secure?: boolean;
        immersive?: boolean;
        responsive?: boolean;
        contentAutoResize?: boolean;
        autoResize?: boolean;
        /** Padding in dp added around the content when contentAutoResize is on, default 8. */
        contentPadding?: number;
        /** Smallest auto-resized width in dp, default 48. */
        contentMinWidth?: number;
        /** Smallest auto-resized height in dp, default 48. */
        contentMinHeight?: number;
        /** Largest auto-resized width in dp; the display width by default. */
        contentMaxWidth?: number;
        /** Largest auto-resized height in dp; the display height by default. */
        contentMaxHeight?: number;
        theme?: ThemeName;
        appearance?: AppearanceName;
        /** Rounding of windows, frames, popups, ... in dp. */
        rounding?: number;
        /** Border size of windows, frames and popups in dp. */
        borderSize?: number;
        style?: StyleProperties;
        styleProperties?: StyleProperties;
        shadow?: boolean | number | Color;
        shadowColor?: Color;
        collapseButton?: boolean | FloatingButtonOptions;
        collapseLabel?: string;
        /**
         * Debug mode: usage errors Dear ImGui recovers from (for example begin without end) and failed assertions are
         * printed with console.warn and logged to logcat, and the Metrics and Debug Log windows are shown. Use a window
         * large enough for them.
         */
        debug?: boolean;
        /** Session event listeners; like Session.on, they run on the script thread. */
        events?: Partial<Record<SessionEventName, SessionEventListener>>;
        /** Listener of the "error" event, see {@link SessionErrorEvent}. */
        onError?: (event: SessionErrorEvent) => void;
        onMoved?: SessionEventListener;
        onResized?: SessionEventListener;
        onReady?: SessionEventListener;
        onSurfaceRestored?: SessionEventListener;
        onCollapsed?: SessionEventListener;
        onExpanded?: SessionEventListener;
        onClosed?: SessionEventListener;
        onConfigurationChanged?: SessionEventListener;
        onTouchableChanged?: SessionEventListener;
        onMoreTouchChanged?: SessionEventListener;
        onAlphaChanged?: SessionEventListener;
        onSecureChanged?: SessionEventListener;
        [name: string]: unknown;
    }

    interface StyleProperties {
        [name: string]: number | Point | readonly number[] | undefined;
    }

    type SessionEventName =
        | "moved"
        | "resized"
        | "ready"
        | "surfaceRestored"
        | "collapsed"
        | "expanded"
        | "closed"
        | "configurationChanged"
        | "touchableChanged"
        | "moreTouchChanged"
        | "alphaChanged"
        | "secureChanged"
        | "error";

    /**
     * A session event. Listeners run on the script thread, the thread of the render callback, one after another, so
     * they may change the render state without locks; do not block in them (see docs/THREADING.md). Positions and
     * sizes in the payload are dp:
     * - moved: x, y, oldX, oldY, source ("drag", "api", "configuration", ...);
     * - resized: width, height, oldWidth, oldHeight, source;
     * - ready / surfaceRestored: restored, mode, backend, width, height;
     * - configurationChanged: width, height, oldWidth, oldHeight (the display), orientation;
     * - collapsed: button, fps; expanded: x, y, width, height;
     * - closed: reason; touchableChanged: mode, touchable, interactiveRegionCount;
     * - moreTouchChanged: enabled; alphaChanged: alpha; secureChanged: secure.
     */
    interface SessionEvent {
        readonly type: string;
        readonly session: Session;
        readonly timestamp: number;
        readonly [name: string]: unknown;
    }

    type SessionEventListener = (event: SessionEvent) => void;

    /**
     * An exception thrown by the render callback (phase "render") or by an event callback (phase "event"). The error is
     * also printed with console.error, a run of the same error only once. Without an "error" listener a render error
     * closes the session (closeReason "render-error"); with one the rest of the frame is skipped and the session goes
     * on (call session.close() in the listener to stop it). A failed high-level component render closes only that
     * component. An exception thrown by an "error" listener is printed only.
     */
    interface SessionErrorEvent extends SessionEvent {
        readonly type: "error";
        readonly error: unknown;
        readonly phase: "render" | "event";
        /** Number of frames presented before the error. */
        readonly frame: number;
        /** error.message, or the error converted to a string. */
        readonly message: string;
        /** Event whose listener threw (phase "event"), "buttonClick" for a floating button callback. */
        readonly event?: string;
        /** High-level component whose render threw (phase "render"). */
        readonly component?: Component;
        /** Floating button whose callback threw (event "buttonClick"). */
        readonly button?: FloatingButton;
    }

    interface Component {
        readonly type: string;
        readonly id: string;
        readonly session: Session;
        options: Record<string, any>;
        visible: boolean;
        closed: boolean;
        closeReason: string | null;
        show(): this;
        hide(): this;
        toggle(): this;
        close(reason?: string): this;
    }

    interface LogEntry {
        readonly timestamp: number;
        readonly level: LogLevel;
        readonly text: string;
    }

    interface LogWindowOptions extends Record<string, any> {
        title?: string;
        open?: boolean;
        visible?: boolean;
        autoScroll?: boolean;
        maxEntries?: number;
        onAppend?: (entry: LogEntry, component: LogWindow) => void;
        onClear?: (component: LogWindow) => void;
        onExport?: (text: string, component: LogWindow) => void;
    }

    interface LogWindow extends Component {
        entries: LogEntry[];
        autoScroll: boolean;
        maxEntries: number;
        open: ValueRef<boolean>;
        append(level: LogLevel | string, text: unknown): this;
        appendLog(text: unknown, level?: LogLevel | string): this;
        appendLog(level: LogLevel | string, text: unknown): this;
        log(text: unknown): this;
        debug(text: unknown): this;
        info(text: unknown): this;
        warn(text: unknown): this;
        error(text: unknown): this;
        clear(): this;
        exportText(): string;
    }

    interface ToastOptions extends Record<string, any> {
        id?: string;
        level?: LogLevel | string;
        position?: ToastPosition;
        title?: string;
        color?: Color;
        background?: Color;
        fadeDuration?: number;
    }

    interface Toast extends Component {
        readonly text: string;
        readonly level: LogLevel;
        readonly position: ToastPosition;
        readonly createdAt: number;
        readonly duration: number;
    }

    interface StatsOverlayOptions extends Record<string, any> {
        id?: string;
        position?: ToastPosition;
        margin?: number;
        backgroundAlpha?: number;
        interactive?: boolean;
        flags?: number;
        warningMs?: number;
        criticalMs?: number;
        historySize?: number;
        showPlot?: boolean;
        overlay?: string;
        scaleMax?: number;
        plotWidth?: number;
        plotHeight?: number;
        onClose?: (reason: string, overlay: StatsOverlay) => void;
    }

    interface StatsOverlay extends Component {
        readonly frameTimes: number[];
        readonly historySize: number;
        readonly fps: number;
        readonly frameTime: number;
        snapshot(): {
            readonly fps: number;
            readonly frameTime: number;
            readonly history: number[];
        };
    }

    interface DataTableHeader<Row = any> {
        id?: string;
        label?: string;
        key?: keyof Row | string;
        width?: number;
        flags?: number;
        render?: (value: unknown, row: Row, rowIndex: number, table: DataTable<Row>) => void;
    }

    type DataTableHeaderLike<Row = any> = string | DataTableHeader<Row>;

    interface DataTableOptions<Row = any> extends Record<string, any> {
        title?: string;
        open?: boolean;
        visible?: boolean;
        multiSelect?: boolean;
        tableFlags?: number;
        rowKey?: (row: Row, index: number) => unknown;
        onRowClick?: (row: Row, index: number, table: DataTable<Row>) => void;
        onRowsChanged?: (event: unknown, table: DataTable<Row>) => void;
        onSelectionChanged?: (rows: Row[], indices: number[], table: DataTable<Row>) => void;
    }

    interface DataTable<Row = any> extends Component {
        headers: DataTableHeader<Row>[];
        rows: Row[];
        open: ValueRef<boolean>;
        multiSelect: boolean;
        setRows(rows: readonly Row[]): this;
        getRows(): Row[];
        addRow(row: Row, index?: number): number;
        updateRow(target: number | Row, update: Row | ((row: Row, index: number) => Row)): Row | null;
        removeRow(target: number | Row): Row | null;
        deleteRow(target: number | Row): Row | null;
        clearRows(): this;
        clear(): this;
        isSelected(target: number | Row): boolean;
        selectRow(target: number | Row, selected?: boolean): this;
        clearSelection(): this;
        selectedIndices(): number[];
        selectedRows(): Row[];
        removeSelected(): Row[];
        renderTable(): this;
    }

    /**
     * A running ImGui window. Fields are read-only (writing one throws TypeError in strict mode); change them with the
     * setters. Positions and sizes are dp; multiply by density for px.
     */
    interface Session {
        readonly mode: WindowMode;
        /** Root/Shizuku backend selected for a privileged session, otherwise null. */
        readonly privilegedBackend: ActivePrivilegedBackend | null;
        /** Binder-transferred Android Surface for privileged mode, otherwise null. */
        readonly surface: object | null;
        /** The floaty or Activity window that holds the surface. */
        readonly window: unknown;
        readonly surfaceView: unknown;
        /** The hidden text field that receives IME input, or null when ime is false. */
        readonly imeView: unknown;
        /** Display density, px per dp. */
        readonly density: number;
        /** Display width in dp. */
        readonly displayWidth: number;
        /** Display height in dp. */
        readonly displayHeight: number;
        /** Window width in dp. */
        readonly width: number;
        /** Window height in dp. */
        readonly height: number;
        /** Left edge of the window in dp. */
        readonly x: number;
        /** Top edge of the window in dp. */
        readonly y: number;
        readonly alpha: number;
        readonly secure: boolean;
        readonly moreTouch: boolean;
        readonly touchMode: TouchMode;
        readonly touchable: boolean;
        readonly interactiveRegionCount: number;
        readonly collapsed: boolean;
        readonly fps: number;
        readonly collapsedFps: number;
        readonly frameScheduler: "deadline-timer";
        readonly iniPath: string | null;
        /** Whether the session runs in debug mode (WindowOptions.debug). */
        readonly debug: boolean;
        readonly ready: boolean;
        readonly closed: boolean;
        readonly closeReason: string | null;
        /** Current theme, including a change made with imgui.setTheme. */
        readonly theme: ThemeName;
        readonly appearance: AppearanceName | null;
        readonly fonts: Readonly<Record<string, number>>;
        readonly textures: Texture[];
        readonly buttons: FloatingButton[];
        readonly components: Component[];
        createTexture(source: TextureSource, options?: TextureOptions | number): Texture;
        destroyTexture(texture: Texture): boolean;
        /** Live backend/UID/PID/Surface/direct-input diagnostics. */
        getBackendInfo(): string;
        /** Adds a listener; it runs on the script thread. */
        on(eventName: "error", listener: (event: SessionErrorEvent) => void): this;
        on(eventName: SessionEventName | string, listener: SessionEventListener): this;
        once(eventName: "error", listener: (event: SessionErrorEvent) => void): this;
        once(eventName: SessionEventName | string, listener: SessionEventListener): this;
        off(eventName: SessionEventName | string, listener?: SessionEventListener | null): this;
        /** Moves the window to (x, y) in dp, clamped to the display; null keeps that coordinate. */
        setPosition(x: number | null, y: number | null): this;
        /** Resizes the window to width x height in dp, limited to the display; null keeps that side. */
        setSize(width: number | null, height: number | null): this;
        setTouchable(mode: TouchMode | boolean): this;
        setMoreTouch(enabled: boolean): this;
        /** Window opacity 0..1. */
        setAlpha(alpha: number): this;
        setSecure(secure: boolean): this;
        collapse(): this;
        expand(): this;
        toggleCollapsed(): this;
        addButtonEx(label: unknown, callback: () => void, options?: FloatingButtonOptions): FloatingButton;
        logWindow(id?: string, options?: LogWindowOptions): LogWindow;
        toast(text: unknown, duration?: number, options?: ToastOptions): Toast;
        alert(...args: any[]): Promise<void>;
        confirm(...args: any[]): Promise<boolean>;
        singleChoice(...args: any[]): Promise<number>;
        multiChoice(...args: any[]): Promise<number[]>;
        statsOverlay(id?: string | StatsOverlayOptions, options?: StatsOverlayOptions): StatsOverlay;
        dataTable<Row = any>(
            id: string,
            headers: readonly DataTableHeaderLike<Row>[],
            rows: readonly Row[],
            options?: DataTableOptions<Row>,
        ): DataTable<Row>;
        getComponent(type: string, id: string): Component | null;
        close(reason?: string): void;
    }

    interface ApiCore {
        readonly __pluginId: "io.github.supermonster003.autojs6.plugin.imgui";

        bool(value?: boolean): IndexedRef<boolean>;
        float(value?: number): IndexedRef<number>;
        int(value?: number): IndexedRef<number>;
        string(value?: unknown): IndexedRef<string>;
        ref<T>(value: T): ValueRef<T>;
        floats(values?: readonly number[]): NativeArray<number>;
        bytes(values?: readonly number[]): NativeArray<number>;
        strings(values?: readonly unknown[]): NativeArray<string>;
        version(): string;

        /**
         * Display density, px per dp: the active session's density, otherwise the display's. Window options, Session
         * geometry and event payloads are dp; coordinates inside a frame are px.
         */
        readonly density: number;
        /**
         * Converts dp to px, for example ui.setNextWindowSize(ui.dp(320), ui.dp(240)).
         * @param value length in dp
         * @returns length in px
         */
        dp(value: number): number;
        /**
         * Converts px to dp.
         * @param value length in px
         * @returns length in dp
         */
        px(value: number): number;

        readonly Limits: Readonly<{
            InputTextMaxBytes: 65536;
            SelectionMaxItems: 512;
            InputQueueCapacity: 2048;
        }>;
        readonly BackendStatus: Readonly<{
            Available: "available";
            Experimental: "experimental";
            Unavailable: "unavailable";
            Deferred: "deferred";
        }>;
        readonly Cond: NumericConstants<"None" | "Always" | "Once" | "FirstUseEver" | "Appearing">;
        readonly WindowFlags: NumericConstants<"None" | "NoTitleBar" | "NoResize" | "NoMove" | "NoScrollbar" | "NoScrollWithMouse" | "NoCollapse" | "AlwaysAutoResize" | "NoBackground" | "NoSavedSettings" | "NoMouseInputs" | "MenuBar" | "HorizontalScrollbar" | "NoFocusOnAppearing" | "NoBringToFrontOnFocus" | "AlwaysVerticalScrollbar" | "AlwaysHorizontalScrollbar" | "NoNavInputs" | "NoNavFocus" | "UnsavedDocument" | "NoNav" | "NoDecoration" | "NoInputs">;
        readonly InputTextFlags: NumericConstants<"None" | "CharsDecimal" | "CharsHexadecimal" | "CharsScientific" | "CharsUppercase" | "CharsNoBlank" | "AllowTabInput" | "EnterReturnsTrue" | "EscapeClearsAll" | "CtrlEnterForNewLine" | "ReadOnly" | "Password" | "AlwaysOverwrite" | "AutoSelectAll" | "NoHorizontalScroll" | "NoUndoRedo" | "ElideLeft" | "WordWrap">;
        readonly SliderFlags: NumericConstants<"None" | "Logarithmic" | "NoRoundToFormat" | "NoInput" | "WrapAround" | "ClampOnInput" | "ClampZeroRange" | "NoSpeedTweaks" | "ColorMarkers" | "AlwaysClamp">;
        readonly TreeNodeFlags: NumericConstants<"None" | "Selected" | "Framed" | "AllowOverlap" | "NoTreePushOnOpen" | "NoAutoOpenOnLog" | "DefaultOpen" | "OpenOnDoubleClick" | "OpenOnArrow" | "Leaf" | "Bullet" | "FramePadding" | "SpanAvailWidth" | "SpanFullWidth" | "SpanLabelWidth" | "SpanAllColumns" | "LabelSpanAllColumns" | "NavLeftJumpsToParent" | "CollapsingHeader">;
        readonly SelectableFlags: NumericConstants<"None" | "NoAutoClosePopups" | "SpanAllColumns" | "AllowDoubleClick" | "Disabled" | "AllowOverlap" | "Highlight" | "SelectOnNav">;
        readonly TabBarFlags: NumericConstants<"None" | "Reorderable" | "AutoSelectNewTabs" | "TabListPopupButton" | "NoCloseWithMiddleMouseButton" | "NoTabListScrollingButtons" | "NoTooltip" | "DrawSelectedOverline" | "FittingPolicyMixed" | "FittingPolicyShrink" | "FittingPolicyScroll">;
        readonly TabItemFlags: NumericConstants<"None" | "UnsavedDocument" | "SetSelected" | "NoCloseWithMiddleMouseButton" | "NoPushId" | "NoTooltip" | "NoReorder" | "Leading" | "Trailing" | "NoAssumedClosure">;
        readonly MouseButton: NumericConstants<"Left" | "Right" | "Middle">;
        readonly ChildFlags: NumericConstants<"None" | "Borders" | "AlwaysUseWindowPadding" | "ResizeX" | "ResizeY" | "AutoResizeX" | "AutoResizeY" | "AlwaysAutoResize" | "FrameStyle" | "NavFlattened">;
        readonly ComboFlags: NumericConstants<"None" | "PopupAlignLeft" | "HeightSmall" | "HeightRegular" | "HeightLarge" | "HeightLargest" | "NoArrowButton" | "NoPreview" | "WidthFitPreview">;
        readonly PopupFlags: NumericConstants<"None" | "MouseButtonLeft" | "MouseButtonRight" | "MouseButtonMiddle" | "NoReopen" | "NoOpenOverExistingPopup" | "NoOpenOverItems" | "AnyPopupId" | "AnyPopupLevel" | "AnyPopup">;
        readonly HoveredFlags: NumericConstants<"None" | "ChildWindows" | "RootWindow" | "AnyWindow" | "NoPopupHierarchy" | "AllowWhenBlockedByPopup" | "AllowWhenBlockedByActiveItem" | "AllowWhenOverlappedByItem" | "AllowWhenOverlappedByWindow" | "AllowWhenDisabled" | "NoNavOverride" | "AllowWhenOverlapped" | "RectOnly" | "RootAndChildWindows" | "ForTooltip" | "Stationary" | "DelayNone" | "DelayShort" | "DelayNormal" | "NoSharedDelay">;
        readonly FocusedFlags: NumericConstants<"None" | "ChildWindows" | "RootWindow" | "AnyWindow" | "NoPopupHierarchy" | "RootAndChildWindows">;
        readonly ColorEditFlags: NumericConstants<"None" | "NoAlpha" | "NoPicker" | "NoOptions" | "NoSmallPreview" | "NoInputs" | "NoTooltip" | "NoLabel" | "NoSidePreview" | "NoDragDrop" | "NoBorder" | "NoColorMarkers" | "AlphaOpaque" | "AlphaNoBg" | "AlphaPreviewHalf" | "AlphaBar" | "HDR" | "DisplayRGB" | "DisplayHSV" | "DisplayHex" | "Uint8" | "Float" | "PickerHueBar" | "PickerHueWheel" | "PickerNoRotate" | "InputRGB" | "InputHSV">;
        readonly TableFlags: NumericConstants<"None" | "Resizable" | "Reorderable" | "Hideable" | "Sortable" | "NoSavedSettings" | "ContextMenuInBody" | "RowBg" | "BordersInnerH" | "BordersOuterH" | "BordersInnerV" | "BordersOuterV" | "BordersH" | "BordersV" | "BordersInner" | "BordersOuter" | "Borders" | "NoBordersInBody" | "NoBordersInBodyUntilResize" | "SizingFixedFit" | "SizingFixedSame" | "SizingStretchProp" | "SizingStretchSame" | "NoHostExtendX" | "NoHostExtendY" | "NoKeepColumnsVisible" | "PreciseWidths" | "NoClip" | "PadOuterX" | "NoPadOuterX" | "NoPadInnerX" | "ScrollX" | "ScrollY" | "SortMulti" | "SortTristate" | "HighlightHoveredColumn">;
        readonly TableColumnFlags: NumericConstants<"None" | "Disabled" | "DefaultHide" | "DefaultSort" | "WidthStretch" | "WidthFixed" | "NoResize" | "NoReorder" | "NoHide" | "NoClip" | "NoSort" | "NoSortAscending" | "NoSortDescending" | "NoHeaderLabel" | "NoHeaderWidth" | "PreferSortAscending" | "PreferSortDescending" | "IndentEnable" | "IndentDisable" | "AngledHeader" | "IsEnabled" | "IsVisible" | "IsSorted" | "IsHovered">;
        readonly TableRowFlags: NumericConstants<"None" | "Headers">;
        readonly TableBgTarget: NumericConstants<"None" | "RowBg0" | "RowBg1" | "CellBg">;
        readonly Col: NumericConstants<"Text" | "TextDisabled" | "WindowBg" | "ChildBg" | "PopupBg" | "Border" | "BorderShadow" | "FrameBg" | "FrameBgHovered" | "FrameBgActive" | "TitleBg" | "TitleBgActive" | "TitleBgCollapsed" | "MenuBarBg" | "ScrollbarBg" | "ScrollbarGrab" | "ScrollbarGrabHovered" | "ScrollbarGrabActive" | "CheckMark" | "CheckboxSelectedBg" | "SliderGrab" | "SliderGrabActive" | "Button" | "ButtonHovered" | "ButtonActive" | "Header" | "HeaderHovered" | "HeaderActive" | "Separator" | "SeparatorHovered" | "SeparatorActive" | "ResizeGrip" | "ResizeGripHovered" | "ResizeGripActive" | "InputTextCursor" | "TabHovered" | "Tab" | "TabSelected" | "TabSelectedOverline" | "TabDimmed" | "TabDimmedSelected" | "TabDimmedSelectedOverline" | "PlotLines" | "PlotLinesHovered" | "PlotHistogram" | "PlotHistogramHovered" | "TableHeaderBg" | "TableBorderStrong" | "TableBorderLight" | "TableRowBg" | "TableRowBgAlt" | "TextLink" | "TextSelectedBg" | "TreeLines" | "DragDropTarget" | "DragDropTargetBg" | "UnsavedMarker" | "NavCursor" | "NavWindowingHighlight" | "NavWindowingDimBg" | "ModalWindowDimBg">;
        readonly StyleVar: NumericConstants<"Alpha" | "DisabledAlpha" | "WindowPadding" | "WindowRounding" | "WindowBorderSize" | "WindowMinSize" | "WindowTitleAlign" | "ChildRounding" | "ChildBorderSize" | "PopupRounding" | "PopupBorderSize" | "FramePadding" | "FrameRounding" | "FrameBorderSize" | "ItemSpacing" | "ItemInnerSpacing" | "IndentSpacing" | "CellPadding" | "ScrollbarSize" | "ScrollbarRounding" | "ScrollbarPadding" | "GrabMinSize" | "GrabRounding" | "ImageRounding" | "ImageBorderSize" | "TabRounding" | "TabBorderSize" | "TabMinWidthBase" | "TabMinWidthShrink" | "TabBarBorderSize" | "TabBarOverlineSize" | "TableAngledHeadersAngle" | "TableAngledHeadersTextAlign" | "TreeLinesSize" | "TreeLinesRounding" | "MenuItemRounding" | "SelectableRounding" | "DragDropTargetRounding" | "ButtonTextAlign" | "SelectableTextAlign" | "SeparatorSize" | "SeparatorTextBorderSize" | "SeparatorTextAlign" | "SeparatorTextPadding">;
        readonly Themes: Readonly<{ Dark: "dark"; Light: "light"; Classic: "classic"; Pink: "pink"; Blue: "blue"; ModernDark: "modern-dark"; CyanDusk: "cyan-dusk"; OrangeDark: "orange-dark"; CrystalClear: "crystal-clear"; VibrantNight: "vibrant-night"; PurpleDream: "purple-dream" }>;
        readonly Appearance: Readonly<{ Flat: "flat"; Rounded: "rounded"; Card: "card" }>;
        readonly Fonts: NumericConstants<"Default" | "CjkFallback" | "Icons">;
        readonly TextureFlags: NumericConstants<"None" | "Nearest" | "Repeat" | "Mipmaps">;
        readonly DrawListLayer: NumericConstants<"Window" | "Foreground" | "Background">;
        readonly DrawFlags: NumericConstants<"None" | "RoundCornersTopLeft" | "RoundCornersTopRight" | "RoundCornersBottomLeft" | "RoundCornersBottomRight" | "RoundCornersNone" | "RoundCornersAll" | "RoundCornersTop" | "RoundCornersBottom" | "RoundCornersLeft" | "RoundCornersRight" | "Closed">;
        readonly TouchMode: Readonly<{ Touchable: "touchable"; Passthrough: "passthrough"; Auto: "auto" }>;
        readonly WindowMode: Readonly<{ Overlay: "overlay"; Activity: "activity"; Privileged: "privileged" }>;
        readonly LogLevel: Readonly<{ Log: "log"; Debug: "debug"; Info: "info"; Warn: "warn"; Error: "error" }>;
        readonly ToastPosition: Readonly<{ TopLeft: "top-left"; TopCenter: "top-center"; TopRight: "top-right"; Center: "center"; BottomLeft: "bottom-left"; BottomCenter: "bottom-center"; BottomRight: "bottom-right" }>;
        readonly Icons: StringConstants<"Error" | "Warning" | "Pause" | "Play" | "Stop" | "Add" | "Copy" | "Save" | "Download" | "Upload" | "Edit" | "ArrowBack" | "ArrowForward" | "Check" | "ChevronLeft" | "ChevronRight" | "Close" | "ExpandLess" | "ExpandMore" | "Menu" | "MoreHoriz" | "MoreVert" | "Refresh" | "Person" | "Star" | "BugReport" | "Code" | "Delete" | "DoneAll" | "Favorite" | "Home" | "Info" | "Lock" | "LockOpen" | "Search" | "Settings" | "Visibility" | "VisibilityOff">;
        readonly Dir: NumericConstants<"None" | "Left" | "Right" | "Up" | "Down">;
        readonly ButtonFlags: NumericConstants<"None" | "MouseButtonLeft" | "MouseButtonRight" | "MouseButtonMiddle" | "EnableNav">;
        readonly Key: NumericConstants<"None" | "Tab" | "LeftArrow" | "RightArrow" | "UpArrow" | "DownArrow" | "PageUp" | "PageDown" | "Home" | "End" | "Insert" | "Delete" | "Backspace" | "Space" | "Enter" | "Escape" | "A" | "C" | "V" | "X" | "Y" | "Z" | "ModCtrl" | "ModShift" | "ModAlt" | "ModSuper">;

        getBackendCapabilities(): BackendCapabilities;
        listExamples(): string[];
        getExampleSource(name: string): string;
        runExample(name: string, options?: Record<string, any>): unknown;
        colorU32(red: number | Color, green?: number, blue?: number, alpha?: number): number;
        icon(name: string, label?: unknown): string;
        setNextWindowPos(x: number, y: number, condition?: number, pivotX?: number, pivotY?: number): void;
        setNextWindowSize(width: number, height: number, condition?: number): void;
        setNextWindowSizeConstraints(minWidth: number, minHeight: number, maxWidth: number, maxHeight: number): void;
        setNextWindowBgAlpha(alpha: number): void;
        setKeyboardFocusHere(offset?: number): void;
        begin(name: string, open?: MutableValue<boolean> | null, flags?: number): boolean;
        end(): void;
        beginChild(id: string, width?: number, height?: number, borders?: boolean | number, flags?: number): boolean;
        endChild(): void;
        getWindowPos(): Vec2;
        getWindowSize(): Vec2;
        getContentRegionAvail(): Vec2;
        getCursorPos(): Vec2;
        setCursorPos(x: number, y: number): void;
        text(value: unknown): void;
        textWrapped(value: unknown): void;
        textColored(color: Color, value: unknown): void;
        textColored(red: number, green: number, blue: number, alpha: number, value: unknown): void;
        button(label: string, width?: number, height?: number): boolean;
        smallButton(label: string): boolean;
        checkbox(label: string, value: MutableValue<boolean>): boolean;
        radioButton(label: string, value: MutableValue<number>, buttonValue: number): boolean;
        sliderFloat(label: string, value: MutableValue<number>, min: number, max: number, format?: string, flags?: number): boolean;
        sliderInt(label: string, value: MutableValue<number>, min: number, max: number, format?: string, flags?: number): boolean;
        dragFloat(label: string, value: MutableValue<number>, speed?: number, min?: number, max?: number, format?: string, flags?: number): boolean;
        dragInt(label: string, value: MutableValue<number>, speed?: number, min?: number, max?: number, format?: string, flags?: number): boolean;
        inputText(label: string, value: MutableValue<string>, maxLength?: number, flags?: number): boolean;
        colorEdit3(label: string, value: MutableValue<readonly number[]> | NativeArray<number>, flags?: number): boolean;
        colorEdit4(label: string, value: MutableValue<readonly number[]> | NativeArray<number>, flags?: number): boolean;
        progressBar(fraction: number, width?: number, height?: number, overlay?: string): void;
        combo(label: string, currentItem: MutableValue<number>, items: readonly unknown[], popupHeight?: number): boolean;
        selectable(label: string, selected?: boolean, flags?: number, width?: number, height?: number): boolean;
        collapsingHeader(label: string, flags?: number): boolean;
        treeNode(label: string): boolean;
        treePop(): void;
        beginTabBar(id: string, flags?: number): boolean;
        endTabBar(): void;
        beginTabItem(label: string, open?: MutableValue<boolean> | null, flags?: number): boolean;
        endTabItem(): void;
        sameLine(offsetFromStartX?: number, spacing?: number): void;
        separator(): void;
        spacing(): void;
        newLine(): void;
        dummy(width: number, height: number): void;
        setNextItemWidth(width: number): void;
        pushItemWidth(width: number): void;
        popItemWidth(): void;
        isItemClicked(mouseButton?: number): boolean;
        isItemHovered(flags?: number): boolean;
        wantCaptureMouse(): boolean;
        isAnyItemHovered(): boolean;
        isAnyItemActive(): boolean;
        styleColorsDark(): void;
        styleColorsLight(): void;
        styleColorsClassic(): void;
        showDemoWindow(open?: MutableValue<boolean> | null): void;
        separatorText(label: string): void;
        bullet(): void;
        bulletText(text: unknown): void;
        labelText(label: string, text: unknown): void;
        textDisabled(text: unknown): void;
        arrowButton(id: string, direction: number): boolean;
        invisibleButton(id: string, width: number, height: number, flags?: number): boolean;
        inputInt(label: string, value: MutableValue<number>, step?: number, stepFast?: number, flags?: number): boolean;
        inputFloat(label: string, value: MutableValue<number>, step?: number, stepFast?: number, format?: string, flags?: number): boolean;
        inputTextMultiline(label: string, value: MutableValue<string>, maxLength?: number, width?: number, height?: number, flags?: number): boolean;
        beginListBox(label: string, width?: number, height?: number): boolean;
        endListBox(): void;
        listBox(label: string, currentItem: MutableValue<number>, items: readonly unknown[], heightInItems?: number): boolean;
        colorPicker3(label: string, value: MutableValue<readonly number[]> | NativeArray<number>, flags?: number): boolean;
        colorPicker4(label: string, value: MutableValue<readonly number[]> | NativeArray<number>, flags?: number): boolean;
        colorButton(id: string, color: Color, flags?: number, width?: number, height?: number): boolean;
        colorButton(id: string, color: Color, options: { flags?: number; width?: number; height?: number }): boolean;
        colorButton(id: string, red: number, green: number, blue: number, alpha?: number, flags?: number, width?: number, height?: number): boolean;
        plotLines(label: string, values: readonly number[] | NativeArray<number>, options?: PlotOptions): void;
        plotHistogram(label: string, values: readonly number[] | NativeArray<number>, options?: PlotOptions): void;
        treeNodeEx(label: string, flags?: number): boolean;
        vSliderFloat(label: string, width: number, height: number, value: MutableValue<number>, min: number, max: number, format?: string, flags?: number): boolean;
        vSliderInt(label: string, width: number, height: number, value: MutableValue<number>, min: number, max: number, format?: string, flags?: number): boolean;
        toggle(label: string, value: MutableValue<boolean>): boolean;
        toggleSwitch(label: string, value: MutableValue<boolean>): boolean;
        beginCombo(label: string, preview?: unknown, flags?: number): boolean;
        endCombo(): void;
        openPopup(id: string, flags?: number): void;
        beginPopup(id: string, flags?: number): boolean;
        beginPopupModal(name: string, open?: MutableValue<boolean> | null, flags?: number): boolean;
        beginPopupContextItem(id?: string | null, flags?: number): boolean;
        beginPopupContextWindow(id?: string | null, flags?: number): boolean;
        endPopup(): void;
        closeCurrentPopup(): void;
        isPopupOpen(id: string, flags?: number): boolean;
        beginMenuBar(): boolean;
        endMenuBar(): void;
        beginMenu(label: string, enabled?: boolean): boolean;
        endMenu(): void;
        menuItem(label: string, shortcut?: string, selected?: MutableValue<boolean> | boolean, enabled?: boolean): boolean;
        setTooltip(text: unknown): void;
        setItemTooltip(text: unknown): void;
        beginTooltip(): boolean;
        beginItemTooltip(): boolean;
        endTooltip(): void;
        beginTable(id: string, columns: number, flags?: number, outerWidth?: number, outerHeight?: number): boolean;
        endTable(): void;
        tableNextRow(rowFlags?: number, minRowHeight?: number): void;
        tableNextColumn(): boolean;
        tableSetColumnIndex(columnIndex: number): boolean;
        tableSetupColumn(label: string, flags?: number, initWidthOrWeight?: number): void;
        tableSetupScrollFreeze(columns: number, rows: number): void;
        tableHeadersRow(): void;
        tableSetBgColor(target: number, color: Color, columnIndex?: number): void;
        tableSetBgColor(target: number, red: number, green: number, blue: number, alpha?: number, columnIndex?: number): void;
        /** index is an imgui.Col value or name. */
        pushStyleColor(index: number | string, color: Color): void;
        pushStyleColor(index: number | string, red: number, green: number, blue: number, alpha?: number): void;
        popStyleColor(count?: number): void;
        /** index is an imgui.Col value or name. */
        setStyleColor(index: number | string, color: Color): Api;
        setStyleColor(index: number | string, red: number, green: number, blue: number, alpha?: number): Api;
        setStyleProperties(properties: StyleProperties): void;
        setTheme(name: ThemeName | string): ThemeName;
        pushStyleVar(index: number, x: number | Point, y?: number): void;
        popStyleVar(count?: number): void;
        setWindowFontScale(scale: number): void;
        pushFont(font: number | string, fontSize?: number): number;
        popFont(): void;
        withFont<T>(font: number | string, fontSize: number | null | undefined, body: () => T): T | undefined;
        withFont<T>(font: number | string, body: () => T): T | undefined;
        createTexture(source: TextureSource, options?: TextureOptions | number): Texture;
        destroyTexture(texture: Texture): boolean;
        image(texture: Texture, width?: number | ImageOptions, height?: number, options?: ImageOptions): void;
        imageButton(id: string, texture: Texture, width?: number | ImageOptions, height?: number, options?: ImageOptions): boolean;
        getWindowDrawList(): DrawList;
        getForegroundDrawList(): DrawList;
        getBackgroundDrawList(): DrawList;
        pushId(id: string | number): void;
        popId(): void;
        beginGroup(): void;
        endGroup(): void;
        indent(width?: number): void;
        unindent(width?: number): void;
        alignTextToFramePadding(): void;
        beginDisabled(disabled?: boolean): void;
        endDisabled(): void;
        getScrollX(): number;
        getScrollY(): number;
        getScrollMaxX(): number;
        getScrollMaxY(): number;
        setScrollX(value: number): void;
        setScrollY(value: number): void;
        setScrollHereX(centerRatio?: number): void;
        setScrollHereY(centerRatio?: number): void;
        isItemActive(): boolean;
        isItemEdited(): boolean;
        isItemActivated(): boolean;
        isItemDeactivated(): boolean;
        isItemDeactivatedAfterEdit(): boolean;
        isItemFocused(): boolean;
        isItemVisible(): boolean;
        isWindowHovered(flags?: number): boolean;
        isWindowFocused(flags?: number): boolean;
        isWindowCollapsed(): boolean;
        isWindowAppearing(): boolean;
        getMousePos(): Vec2;
        isMouseDown(button?: number): boolean;
        isMouseClicked(button?: number, repeat?: boolean): boolean;
        isMouseDoubleClicked(button?: number): boolean;
        isMouseReleased(button?: number): boolean;
        isMouseDragging(button?: number, lockThreshold?: number): boolean;
        getMouseDragDelta(button?: number, lockThreshold?: number): Vec2;
        resetMouseDragDelta(button?: number): void;
        calcTextSize(text: unknown, wrapWidth?: number): Vec2;
        getFrameHeight(): number;
        getFrameHeightWithSpacing(): number;
        getTextLineHeight(): number;
        getTextLineHeightWithSpacing(): number;
        framerate(): number;
        addInputCharacters(text: unknown): void;
        addKeyEvent(key: number, down: boolean): void;
        sendKey(key: number): void;
        addMouseWheel(wheelX?: number, wheelY?: number): void;
        wantTextInput(): boolean;
        withWindow(name: string, open: MutableValue<boolean> | null | undefined, flags: number | undefined, body: FrameBody): boolean;
        withChild(id: string, width: number | undefined, height: number | undefined, borders: boolean | number | undefined, flags: number | undefined, body: FrameBody): boolean;
        withTreeNode(label: string, body: FrameBody): boolean;
        withTabBar(id: string, flags: number | undefined, body: FrameBody): boolean;
        withTabItem(label: string, open: MutableValue<boolean> | null | undefined, flags: number | undefined, body: FrameBody): boolean;
        withTable(id: string, columns: number, flags: number | undefined, outerWidth: number | undefined, outerHeight: number | undefined, body: FrameBody): boolean;
        withPopup(id: string, flags: number | undefined, body: FrameBody): boolean;
        withPopupModal(name: string, open: MutableValue<boolean> | null | undefined, flags: number | undefined, body: FrameBody): boolean;
        withContextItem(id: string | null | FrameBody, flags?: number | FrameBody, body?: FrameBody): boolean;
        withContextWindow(id: string | null | FrameBody, flags?: number | FrameBody, body?: FrameBody): boolean;
        withTooltip(body: FrameBody): boolean;
        withItemTooltip(body: FrameBody): boolean;
        withMenuBar(body: FrameBody): boolean;
        withMenu(label: string, enabled: boolean | undefined, body: FrameBody): boolean;
        withListBox(label: string, width: number | undefined, height: number | undefined, body: FrameBody): boolean;
        withCombo(label: string, preview: unknown, flags: number | undefined, body: FrameBody): boolean;
        withGroup(body: FrameBody): void;
        withDisabled(disabled: boolean, body: FrameBody): void;
        withId(id: string | number, body: FrameBody): void;
        logWindow(id?: string, options?: LogWindowOptions): LogWindow;
        toast(text: unknown, duration?: number, options?: ToastOptions): Toast;
        alert(...args: any[]): Promise<void>;
        confirm(...args: any[]): Promise<boolean>;
        singleChoice(...args: any[]): Promise<number>;
        multiChoice(...args: any[]): Promise<number[]>;
        statsOverlay(id?: string | StatsOverlayOptions, options?: StatsOverlayOptions): StatsOverlay;
        dataTable<Row = any>(id: string, headers: readonly DataTableHeaderLike<Row>[], rows: readonly Row[], options?: DataTableOptions<Row>): DataTable<Row>;
        /** Opens a window session. One session per script engine: a new session closes the previous one. */
        createWindow(renderCallback: RenderCallback, options?: WindowOptions): Session;
        /** Closes the active session; does nothing without one. */
        closeWindow(): void;
        launchFloaty(renderCallback: RenderCallback, options?: WindowOptions): Session;
        launch(renderCallback: RenderCallback, options?: WindowOptions): Session;
        launchPrivileged(renderCallback: RenderCallback, options?: WindowOptions): Session;
        /** Acts on the active session. @throws Error "imgui.addButtonEx: no active session" without one. */
        addButtonEx(label: unknown, callback: () => void, options?: FloatingButtonOptions): FloatingButton;
        /** Acts on the active session. @throws Error "imgui.setTouchable: no active session" without one. */
        setTouchable(touchMode: TouchMode | boolean): Session;
        /** Acts on the active session. @throws Error "imgui.setMoreTouch: no active session" without one. */
        setMoreTouch(enabled: boolean): Session;
        /** Acts on the active session. @throws Error "imgui.setGlobalAlpha: no active session" without one. */
        setGlobalAlpha(alpha: number): Session;
        /** Acts on the active session. @throws Error "imgui.setSecure: no active session" without one. */
        setSecure(secure: boolean): Session;
        /** Acts on the active session. @throws Error "imgui.collapseWindow: no active session" without one. */
        collapseWindow(): Session;
        /** Acts on the active session. @throws Error "imgui.expandWindow: no active session" without one. */
        expandWindow(): Session;
        /**
         * Component of the active session, null when it has none of that type and id.
         * @throws Error "imgui.getComponent: no active session" without an active session.
         */
        getComponent(type: string, id: string): Component | null;
    }

    interface ApiAliases {
        readonly Ref: ApiCore["ref"];
        readonly Dp: ApiCore["dp"];
        readonly Px: ApiCore["px"];
        readonly GetBackendCapabilities: ApiCore["getBackendCapabilities"];
        readonly ListExamples: ApiCore["listExamples"];
        readonly GetExampleSource: ApiCore["getExampleSource"];
        readonly RunExample: ApiCore["runExample"];
        readonly LogWindow: ApiCore["logWindow"];
        readonly Toast: ApiCore["toast"];
        readonly Alert: ApiCore["alert"];
        readonly Confirm: ApiCore["confirm"];
        readonly SingleChoice: ApiCore["singleChoice"];
        readonly MultiChoice: ApiCore["multiChoice"];
        readonly StatsOverlay: ApiCore["statsOverlay"];
        readonly DataTable: ApiCore["dataTable"];
        readonly GetComponent: ApiCore["getComponent"];
        readonly CreateWindow: ApiCore["createWindow"];
        readonly CloseWindow: ApiCore["closeWindow"];
        readonly LaunchFloaty: ApiCore["launchFloaty"];
        readonly Launch: ApiCore["launch"];
        readonly LaunchPrivileged: ApiCore["launchPrivileged"];
        readonly AddButtonEx: ApiCore["addButtonEx"];
        readonly SetTouchable: ApiCore["setTouchable"];
        readonly SetMoreTouch: ApiCore["setMoreTouch"];
        readonly SetGlobalAlpha: ApiCore["setGlobalAlpha"];
        readonly SetSecure: ApiCore["setSecure"];
        readonly CollapseWindow: ApiCore["collapseWindow"];
        readonly ExpandWindow: ApiCore["expandWindow"];
        readonly SetNextWindowPos: ApiCore["setNextWindowPos"];
        readonly SetNextWindowSize: ApiCore["setNextWindowSize"];
        readonly SetNextWindowSizeConstraints: ApiCore["setNextWindowSizeConstraints"];
        readonly SetNextWindowBgAlpha: ApiCore["setNextWindowBgAlpha"];
        readonly SetKeyboardFocusHere: ApiCore["setKeyboardFocusHere"];
        readonly Begin: ApiCore["begin"];
        readonly End: ApiCore["end"];
        readonly BeginChild: ApiCore["beginChild"];
        readonly EndChild: ApiCore["endChild"];
        readonly GetWindowPos: ApiCore["getWindowPos"];
        readonly GetWindowSize: ApiCore["getWindowSize"];
        readonly GetContentRegionAvail: ApiCore["getContentRegionAvail"];
        readonly GetCursorPos: ApiCore["getCursorPos"];
        readonly SetCursorPos: ApiCore["setCursorPos"];
        readonly Text: ApiCore["text"];
        readonly TextWrapped: ApiCore["textWrapped"];
        readonly TextColored: ApiCore["textColored"];
        readonly Button: ApiCore["button"];
        readonly SmallButton: ApiCore["smallButton"];
        readonly Checkbox: ApiCore["checkbox"];
        readonly RadioButton: ApiCore["radioButton"];
        readonly SliderFloat: ApiCore["sliderFloat"];
        readonly SliderInt: ApiCore["sliderInt"];
        readonly DragFloat: ApiCore["dragFloat"];
        readonly DragInt: ApiCore["dragInt"];
        readonly InputText: ApiCore["inputText"];
        readonly ColorEdit3: ApiCore["colorEdit3"];
        readonly ColorEdit4: ApiCore["colorEdit4"];
        readonly ProgressBar: ApiCore["progressBar"];
        readonly Combo: ApiCore["combo"];
        readonly Selectable: ApiCore["selectable"];
        readonly CollapsingHeader: ApiCore["collapsingHeader"];
        readonly TreeNode: ApiCore["treeNode"];
        readonly TreePop: ApiCore["treePop"];
        readonly BeginTabBar: ApiCore["beginTabBar"];
        readonly EndTabBar: ApiCore["endTabBar"];
        readonly BeginTabItem: ApiCore["beginTabItem"];
        readonly EndTabItem: ApiCore["endTabItem"];
        readonly SameLine: ApiCore["sameLine"];
        readonly Separator: ApiCore["separator"];
        readonly Spacing: ApiCore["spacing"];
        readonly NewLine: ApiCore["newLine"];
        readonly Dummy: ApiCore["dummy"];
        readonly SetNextItemWidth: ApiCore["setNextItemWidth"];
        readonly PushItemWidth: ApiCore["pushItemWidth"];
        readonly PopItemWidth: ApiCore["popItemWidth"];
        readonly IsItemClicked: ApiCore["isItemClicked"];
        readonly IsItemHovered: ApiCore["isItemHovered"];
        readonly IsAnyItemHovered: ApiCore["isAnyItemHovered"];
        readonly IsAnyItemActive: ApiCore["isAnyItemActive"];
        readonly ShowDemoWindow: ApiCore["showDemoWindow"];
        readonly StyleColorsDark: ApiCore["styleColorsDark"];
        readonly StyleColorsLight: ApiCore["styleColorsLight"];
        readonly StyleColorsClassic: ApiCore["styleColorsClassic"];
        readonly WantCaptureMouse: ApiCore["wantCaptureMouse"];
        readonly SeparatorText: ApiCore["separatorText"];
        readonly Bullet: ApiCore["bullet"];
        readonly BulletText: ApiCore["bulletText"];
        readonly LabelText: ApiCore["labelText"];
        readonly TextDisabled: ApiCore["textDisabled"];
        readonly ArrowButton: ApiCore["arrowButton"];
        readonly InvisibleButton: ApiCore["invisibleButton"];
        readonly InputInt: ApiCore["inputInt"];
        readonly InputFloat: ApiCore["inputFloat"];
        readonly InputTextMultiline: ApiCore["inputTextMultiline"];
        readonly BeginListBox: ApiCore["beginListBox"];
        readonly EndListBox: ApiCore["endListBox"];
        readonly ListBox: ApiCore["listBox"];
        readonly ColorPicker3: ApiCore["colorPicker3"];
        readonly ColorPicker4: ApiCore["colorPicker4"];
        readonly ColorButton: ApiCore["colorButton"];
        readonly PlotLines: ApiCore["plotLines"];
        readonly PlotHistogram: ApiCore["plotHistogram"];
        readonly TreeNodeEx: ApiCore["treeNodeEx"];
        readonly VSliderFloat: ApiCore["vSliderFloat"];
        readonly VSliderInt: ApiCore["vSliderInt"];
        readonly Toggle: ApiCore["toggle"];
        readonly ToggleSwitch: ApiCore["toggle"];
        readonly BeginCombo: ApiCore["beginCombo"];
        readonly EndCombo: ApiCore["endCombo"];
        readonly OpenPopup: ApiCore["openPopup"];
        readonly BeginPopup: ApiCore["beginPopup"];
        readonly BeginPopupModal: ApiCore["beginPopupModal"];
        readonly BeginPopupContextItem: ApiCore["beginPopupContextItem"];
        readonly BeginPopupContextWindow: ApiCore["beginPopupContextWindow"];
        readonly EndPopup: ApiCore["endPopup"];
        readonly CloseCurrentPopup: ApiCore["closeCurrentPopup"];
        readonly IsPopupOpen: ApiCore["isPopupOpen"];
        readonly BeginMenuBar: ApiCore["beginMenuBar"];
        readonly EndMenuBar: ApiCore["endMenuBar"];
        readonly BeginMenu: ApiCore["beginMenu"];
        readonly EndMenu: ApiCore["endMenu"];
        readonly MenuItem: ApiCore["menuItem"];
        readonly SetTooltip: ApiCore["setTooltip"];
        readonly SetItemTooltip: ApiCore["setItemTooltip"];
        readonly BeginTooltip: ApiCore["beginTooltip"];
        readonly BeginItemTooltip: ApiCore["beginItemTooltip"];
        readonly EndTooltip: ApiCore["endTooltip"];
        readonly BeginTable: ApiCore["beginTable"];
        readonly EndTable: ApiCore["endTable"];
        readonly TableNextRow: ApiCore["tableNextRow"];
        readonly TableNextColumn: ApiCore["tableNextColumn"];
        readonly TableSetColumnIndex: ApiCore["tableSetColumnIndex"];
        readonly TableSetupColumn: ApiCore["tableSetupColumn"];
        readonly TableSetupScrollFreeze: ApiCore["tableSetupScrollFreeze"];
        readonly TableHeadersRow: ApiCore["tableHeadersRow"];
        readonly TableSetBgColor: ApiCore["tableSetBgColor"];
        readonly PushStyleColor: ApiCore["pushStyleColor"];
        readonly PopStyleColor: ApiCore["popStyleColor"];
        readonly SetStyleColor: ApiCore["setStyleColor"];
        readonly SetStyleProperties: ApiCore["setStyleProperties"];
        readonly SetTheme: ApiCore["setTheme"];
        readonly PushStyleVar: ApiCore["pushStyleVar"];
        readonly PopStyleVar: ApiCore["popStyleVar"];
        readonly SetWindowFontScale: ApiCore["setWindowFontScale"];
        readonly PushFont: ApiCore["pushFont"];
        readonly PopFont: ApiCore["popFont"];
        readonly WithFont: ApiCore["withFont"];
        readonly Icon: ApiCore["icon"];
        readonly ColorU32: ApiCore["colorU32"];
        readonly CreateTexture: ApiCore["createTexture"];
        readonly DestroyTexture: ApiCore["destroyTexture"];
        readonly Image: ApiCore["image"];
        readonly ImageButton: ApiCore["imageButton"];
        readonly GetWindowDrawList: ApiCore["getWindowDrawList"];
        readonly GetForegroundDrawList: ApiCore["getForegroundDrawList"];
        readonly GetBackgroundDrawList: ApiCore["getBackgroundDrawList"];
        readonly PushID: ApiCore["pushId"];
        readonly PopID: ApiCore["popId"];
        readonly BeginGroup: ApiCore["beginGroup"];
        readonly EndGroup: ApiCore["endGroup"];
        readonly Indent: ApiCore["indent"];
        readonly Unindent: ApiCore["unindent"];
        readonly AlignTextToFramePadding: ApiCore["alignTextToFramePadding"];
        readonly BeginDisabled: ApiCore["beginDisabled"];
        readonly EndDisabled: ApiCore["endDisabled"];
        readonly GetScrollX: ApiCore["getScrollX"];
        readonly GetScrollY: ApiCore["getScrollY"];
        readonly GetScrollMaxX: ApiCore["getScrollMaxX"];
        readonly GetScrollMaxY: ApiCore["getScrollMaxY"];
        readonly SetScrollX: ApiCore["setScrollX"];
        readonly SetScrollY: ApiCore["setScrollY"];
        readonly SetScrollHereX: ApiCore["setScrollHereX"];
        readonly SetScrollHereY: ApiCore["setScrollHereY"];
        readonly IsItemActive: ApiCore["isItemActive"];
        readonly IsItemEdited: ApiCore["isItemEdited"];
        readonly IsItemActivated: ApiCore["isItemActivated"];
        readonly IsItemDeactivated: ApiCore["isItemDeactivated"];
        readonly IsItemDeactivatedAfterEdit: ApiCore["isItemDeactivatedAfterEdit"];
        readonly IsItemFocused: ApiCore["isItemFocused"];
        readonly IsItemVisible: ApiCore["isItemVisible"];
        readonly IsWindowHovered: ApiCore["isWindowHovered"];
        readonly IsWindowFocused: ApiCore["isWindowFocused"];
        readonly IsWindowCollapsed: ApiCore["isWindowCollapsed"];
        readonly IsWindowAppearing: ApiCore["isWindowAppearing"];
        readonly GetMousePos: ApiCore["getMousePos"];
        readonly IsMouseDown: ApiCore["isMouseDown"];
        readonly IsMouseClicked: ApiCore["isMouseClicked"];
        readonly IsMouseDoubleClicked: ApiCore["isMouseDoubleClicked"];
        readonly IsMouseReleased: ApiCore["isMouseReleased"];
        readonly IsMouseDragging: ApiCore["isMouseDragging"];
        readonly GetMouseDragDelta: ApiCore["getMouseDragDelta"];
        readonly ResetMouseDragDelta: ApiCore["resetMouseDragDelta"];
        readonly CalcTextSize: ApiCore["calcTextSize"];
        readonly GetFrameHeight: ApiCore["getFrameHeight"];
        readonly GetFrameHeightWithSpacing: ApiCore["getFrameHeightWithSpacing"];
        readonly GetTextLineHeight: ApiCore["getTextLineHeight"];
        readonly GetTextLineHeightWithSpacing: ApiCore["getTextLineHeightWithSpacing"];
    }

    type Api = ApiCore & ApiAliases;
}

declare const imgui: ImGui.Api;
