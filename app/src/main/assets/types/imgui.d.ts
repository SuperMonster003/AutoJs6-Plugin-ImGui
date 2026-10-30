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
    /** A mutable number array: imgui.floats([...]) / imgui.ints([...]) or {value: [...]}. */
    type NumberArrayValue = ValueRef<number[]> | NativeArray<number>;
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
    /**
     * A file path (relative paths resolve with files.path), encoded image bytes (number[], Java byte[], ArrayBuffer or
     * a typed array, ByteBuffer, InputStream), an android.graphics.Bitmap or an AutoJs6 Image (images.read,
     * images.captureScreen, ...).
     */
    type TextureSource = string | readonly number[] | ArrayBuffer | ArrayBufferView | object;

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

    interface ListClipperOptions {
        /** Row height in px (frame coordinates). Omitted: measured from the first row. Must be > 0 when given. */
        itemHeight?: number;
        /** Row indices that are always submitted (for example a selected or focused row); indices outside 0..itemCount - 1 are ignored. */
        includeItems?: readonly number[];
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

    /** Texture coordinates of the four corners, in the order of the corner arguments of addImageQuad. */
    interface DrawImageQuadOptions {
        uv1?: Point;
        uv2?: Point;
        uv3?: Point;
        uv4?: Point;
        tint?: Color;
    }

    interface DrawImageRoundedOptions extends DrawImageOptions {
        /** Which corners are rounded: DrawFlags.RoundCorners*; all by default. */
        flags?: number;
    }

    /** What acceptDragDropPayload and getDragDropPayload return. */
    interface DragDropPayload<Data = unknown> {
        /** The type given to setDragDropPayload, or a Dear ImGui type such as "_COL4F". */
        readonly type: string;
        /** A copy of the data, as JSON.parse(JSON.stringify(data)). A color from a color widget is [r, g, b] or [r, g, b, a]; null for other Dear ImGui types. */
        readonly data: Data;
        /** The target is hovered (only seen with DragDropFlags.AcceptBeforeDelivery). */
        readonly preview: boolean;
        /** The pointer was released over the target. */
        readonly delivery: boolean;
    }

    interface Texture {
        readonly handle: number;
        /** Width in px; changes when update() loads an image of another size. */
        readonly width: number;
        /** Height in px; changes when update() loads an image of another size. */
        readonly height: number;
        /**
         * Replaces the pixels with a new image from the same kinds of source as createTexture. The same size reuses
         * the GL storage (glTexSubImage2D); another size reallocates it. The handle stays the same either way.
         */
        update(source: TextureSource): this;
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
        addBezierQuadratic(
            first: Point,
            second: Point,
            third: Point,
            color: Color,
            thickness?: number,
            segments?: number,
        ): DrawList;
        addQuad(first: Point, second: Point, third: Point, fourth: Point, color: Color, thickness?: number): DrawList;
        addQuadFilled(first: Point, second: Point, third: Point, fourth: Point, color: Color): DrawList;
        /** @param segments The number of sides, 3 to 512. */
        addNgon(center: Point, radius: number, color: Color, segments: number, thickness?: number): DrawList;
        /** @param segments The number of sides, 3 to 512. */
        addNgonFilled(center: Point, radius: number, color: Color, segments: number): DrawList;
        /**
         * @param radius The radii along the two axes, in px.
         * @param rotation Radians.
         * @param segments 0 to 512; 0 picks a count from the radius.
         */
        addEllipse(
            center: Point,
            radius: Point,
            color: Color,
            rotation?: number,
            segments?: number,
            thickness?: number,
        ): DrawList;
        addEllipseFilled(center: Point, radius: Point, color: Color, rotation?: number, segments?: number): DrawList;
        addRectFilledMultiColor(
            minimum: Point,
            maximum: Point,
            colorUpperLeft: Color,
            colorUpperRight: Color,
            colorBottomRight: Color,
            colorBottomLeft: Color,
        ): DrawList;
        /** @param points 3 to 4096 points of a convex polygon, in clockwise order for anti-aliasing. */
        addConvexPolyFilled(points: readonly Point[], color: Color): DrawList;
        /** @param points 3 to 4096 points of a simple polygon; slower than addConvexPolyFilled. */
        addConcavePolyFilled(points: readonly Point[], color: Color): DrawList;
        addImageQuad(
            texture: Texture,
            first: Point,
            second: Point,
            third: Point,
            fourth: Point,
            options?: DrawImageQuadOptions,
        ): DrawList;
        addImageRounded(
            texture: Texture,
            minimum: Point,
            maximum: Point,
            rounding: number,
            options?: DrawImageRoundedOptions,
        ): DrawList;

        // Path: add points, then finish with pathStroke, pathFillConvex or pathFillConcave, which clear the path.
        pathClear(): DrawList;
        pathLineTo(position: Point): DrawList;
        /**
         * @param angleMin Radians; 0 points right, angles grow clockwise.
         * @param angleMax Radians, at most 16 turns away from angleMin.
         * @param segments 0 to 512; 0 picks a count from the radius.
         */
        pathArcTo(center: Point, radius: number, angleMin: number, angleMax: number, segments?: number): DrawList;
        /**
         * An arc on the 12 steps of a clock, faster than pathArcTo: 0 points right, 3 down, 6 left, 9 up.
         * @param maxOf12 From minOf12 to minOf12 + 192.
         */
        pathArcToFast(center: Point, radius: number, minOf12: number, maxOf12: number): DrawList;
        pathBezierCubicCurveTo(second: Point, third: Point, fourth: Point, segments?: number): DrawList;
        pathBezierQuadraticCurveTo(second: Point, third: Point, segments?: number): DrawList;
        pathRect(minimum: Point, maximum: Point, rounding?: number, flags?: number): DrawList;
        /** @param flags DrawFlags.Closed joins the last point to the first. */
        pathStroke(color: Color, thickness?: number, flags?: number): DrawList;
        pathFillConvex(color: Color): DrawList;
        pathFillConcave(color: Color): DrawList;

        /**
         * Clips what this draw list draws until popClipRect, in the same frame. It does not affect widgets and their
         * hit testing: use ui.pushClipRect for that.
         * @param intersectWithCurrent Also apply the current clip rectangle; false by default.
         */
        pushClipRect(minimum: Point, maximum: Point, intersectWithCurrent?: boolean): DrawList;
        /** Throws an Error without a matching pushClipRect in this frame. */
        popClipRect(): DrawList;

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
        readonly AddBezierQuadratic: DrawList["addBezierQuadratic"];
        readonly AddQuad: DrawList["addQuad"];
        readonly AddQuadFilled: DrawList["addQuadFilled"];
        readonly AddNgon: DrawList["addNgon"];
        readonly AddNgonFilled: DrawList["addNgonFilled"];
        readonly AddEllipse: DrawList["addEllipse"];
        readonly AddEllipseFilled: DrawList["addEllipseFilled"];
        readonly AddRectFilledMultiColor: DrawList["addRectFilledMultiColor"];
        readonly AddConvexPolyFilled: DrawList["addConvexPolyFilled"];
        readonly AddConcavePolyFilled: DrawList["addConcavePolyFilled"];
        readonly AddImageQuad: DrawList["addImageQuad"];
        readonly AddImageRounded: DrawList["addImageRounded"];
        readonly PathClear: DrawList["pathClear"];
        readonly PathLineTo: DrawList["pathLineTo"];
        readonly PathArcTo: DrawList["pathArcTo"];
        readonly PathArcToFast: DrawList["pathArcToFast"];
        readonly PathBezierCubicCurveTo: DrawList["pathBezierCubicCurveTo"];
        readonly PathBezierQuadraticCurveTo: DrawList["pathBezierQuadraticCurveTo"];
        readonly PathRect: DrawList["pathRect"];
        readonly PathStroke: DrawList["pathStroke"];
        readonly PathFillConvex: DrawList["pathFillConvex"];
        readonly PathFillConcave: DrawList["pathFillConcave"];
        readonly PushClipRect: DrawList["pushClipRect"];
        readonly PopClipRect: DrawList["popClipRect"];
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
        /**
         * Frame rate after idleDelay ms without touch, IME or wheel input, 0..120, default 10; 0 keeps the full rate.
         * Any input returns to fps at once. Frame-driven animations need 0 (or Session.setIdleFps(0) while they run).
         */
        idleFps?: number;
        /** Milliseconds without input before the idle frame rate applies, 100..3600000, default 3000. */
        idleDelay?: number;
        movable?: boolean;
        fontPath?: string;
        /** Default font size in dp, 8..64, default 16. */
        fontSize?: number;
        /** Additional fonts, at most 16; FontDefinition.size is dp, 8..128. */
        fonts?: readonly (string | FontDefinition)[];
        /**
         * Lets Android draw the CJK characters that fontPath and each entry of fonts lack, from the system fonts, for
         * characters outside the bundled subset (docs/LIMITS.md lists its coverage), default false. Each glyph is drawn
         * when first used and no font file stays in memory. A device without CJK system fonts keeps the bundled subset.
         */
        systemCjkFont?: boolean;
        /**
         * Lets two fingers change the font scale of the session, default false: a change of 24 dp in their distance
         * turns the two-finger scroll into a pinch until they lift. Read the result from Session.fontScale or the
         * "fontScaleChanged" event. Not available in privileged windows, whose direct input tracks one finger.
         */
        pinchZoom?: boolean;
        iniPath?: string | false | null;
        /**
         * Text input, default true. Overlay and Activity windows connect inputText to the system IME. A privileged window
         * has no view for the IME: an active text field opens a temporary floaty text box instead (needs the overlay
         * permission of AutoJs6), and the layer is hidden until the box closes, because it covers the box and the
         * keyboard. The done key, the OK button or a touch outside the box insert the text at the cursor of the field.
         * false disables both.
         */
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
         * large enough for them. A render callback that runs longer than 250 ms also prints a console.warn, at most
         * once every 10 seconds (docs/THREADING.md).
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
        onIdle?: SessionEventListener;
        onActive?: SessionEventListener;
        /** Listener of the "back" event (Activity mode), see {@link SessionBackEvent}. */
        onBack?: (event: SessionBackEvent) => void;
        onFontScaleChanged?: SessionEventListener;
        [name: string]: unknown;
    }

    /** Session.capture. */
    interface CaptureOptions {
        /**
         * The part of the window to capture, in dp from its top left corner, cut off at the edges of the window; the
         * whole window by default. x and y default to 0, width and height to the rest of the window.
         */
        region?: {x?: number; y?: number; width?: number; height?: number};
    }

    /** An Image of the AutoJs6 images module. Recycle it when done; the end of the script releases the rest. */
    interface CapturedImage {
        getWidth(): number;
        getHeight(): number;
        recycle(): void;
        [member: string]: any;
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
        | "idle"
        | "active"
        | "back"
        | "fontScaleChanged"
        | "error";

    /**
     * A session event. Listeners run on the script thread, the thread of the render callback, one after another, so
     * they may change the render state without locks; do not block in them (see docs/THREADING.md). Positions and
     * sizes in the payload are dp:
     * - moved: x, y, oldX, oldY, source ("drag", "api", "configuration", ...);
     * - resized: width, height, oldWidth, oldHeight, source;
     * - ready / surfaceRestored: restored, mode, backend, width, height;
     * - configurationChanged: width, height, oldWidth, oldHeight (the display), orientation, density, oldDensity,
     *   fontScale, oldFontScale (the system font scale). After a density change the window keeps its size and position
     *   in dp, and fonts and style sizes follow; a change of the system font scale scales the fonts only. A window of
     *   imgui.launch closes with reason "configuration-changed" instead, because Android recreates its Activity;
     * - fontScaleChanged: scale, oldScale, source ("pinch" or "api");
     * - collapsed: button, fps; expanded: x, y, width, height;
     * - closed: reason; touchableChanged: mode, touchable, interactiveRegionCount;
     * - moreTouchChanged: enabled; alphaChanged: alpha; secureChanged: secure;
     * - idle: fps (the idle frame rate), idleDelay (ms); active: fps, reason ("input", "screen" or "api");
     * - back: see {@link SessionBackEvent}.
     */
    interface SessionEvent {
        readonly type: string;
        readonly session: Session;
        readonly timestamp: number;
        readonly [name: string]: unknown;
    }

    /**
     * The back key of an Activity-mode session (imgui.launch). Unless a listener calls preventDefault(), the session
     * closes with closeReason "back" after the listeners ran. A shown soft keyboard takes the back key first and hides.
     * Overlay windows (imgui.launchFloaty) get no back event: Android sends the key to an overlay only while its text
     * input has focus, and then it hides the keyboard as before.
     */
    interface SessionBackEvent extends SessionEvent {
        readonly type: "back";
        readonly defaultPrevented: boolean;
        /** Keeps the session open. */
        preventDefault(): void;
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
        /** Interval between the last two frames in ms. */
        readonly frameTime: number;
        /** Time the previous frame spent in the render callback and components in ms, without presentation. */
        readonly workTime: number;
        snapshot(): {
            readonly fps: number;
            readonly frameTime: number;
            readonly workTime: number;
            readonly history: number[];
        };
    }

    interface TableColumnSortSpecs {
        /** Index of the column. */
        readonly columnIndex: number;
        /** The userId given to tableSetupColumn, 0 by default. */
        readonly columnUserId: number;
        /** SortDirection.Ascending or SortDirection.Descending. */
        readonly sortDirection: number;
        /** Position of this spec when sorting on several columns (TableFlags.SortMulti), 0 for the first. */
        readonly sortOrder: number;
    }

    interface TableSortSpecs {
        /** Whether the specs changed since the last read; sort the rows when true. */
        readonly specsDirty: boolean;
        /** Usually one spec; more with TableFlags.SortMulti, none with TableFlags.SortTristate. */
        readonly specs: readonly TableColumnSortSpecs[];
    }

    interface DataTableHeader<Row = any> {
        id?: string;
        label?: string;
        key?: keyof Row | string;
        width?: number;
        flags?: number;
        render?: (value: unknown, row: Row, rowIndex: number, table: DataTable<Row>) => void;
        /**
         * Order of two cell values of this column in a sortable table, negative, 0 or positive as for Array.sort; by
         * default numbers compare by value, other values as strings, and empty cells come last in either direction.
         */
        compare?: (a: unknown, b: unknown, rowA: Row, rowB: Row) => number;
    }

    type DataTableHeaderLike<Row = any> = string | DataTableHeader<Row>;

    interface DataTableOptions<Row = any> extends Record<string, any> {
        title?: string;
        open?: boolean;
        visible?: boolean;
        multiSelect?: boolean;
        tableFlags?: number;
        /**
         * Adds TableFlags.Sortable: a click on a header sorts the rows by that column (TableFlags.SortMulti and
         * SortTristate in tableFlags, TableColumnFlags.DefaultSort / NoSort / PreferSortDescending in a header's flags
         * apply). The sort is stable; rows added or changed are sorted again in the next frame, and onRowsChanged
         * gets the action "sort".
         */
        sortable?: boolean;
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
        readonly sortable: boolean;
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
        /**
         * The hidden text field that receives IME input, or null when ime is false. In a privileged window, the EditText
         * of the temporary text box while it is open, otherwise null.
         */
        readonly imeView: unknown;
        /** Display density, px per dp; changes with the display (configurationChanged). */
        readonly density: number;
        /**
         * Font scale of the session, 0.5..3, default 1, from setFontScale or a pinch (WindowOptions.pinchZoom). It
         * multiplies the size of every font and leaves the style sizes alone; ui.getFontSize() returns the result.
         */
        readonly fontScale: number;
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
        /** Whether the session renders at idleFps because no input arrived for idleDelay ms. */
        readonly idle: boolean;
        /** Whether the frame loop is paused because the screen is off or locked. */
        readonly paused: boolean;
        /** Frame rate while expanded and active; see setFps. */
        readonly fps: number;
        readonly collapsedFps: number;
        /** Idle frame rate, 0 when power saving is off; see setIdleFps. */
        readonly idleFps: number;
        /** Milliseconds without input before idleFps applies. */
        readonly idleDelay: number;
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
        on(eventName: "back", listener: (event: SessionBackEvent) => void): this;
        on(eventName: SessionEventName | string, listener: SessionEventListener): this;
        once(eventName: "error", listener: (event: SessionErrorEvent) => void): this;
        once(eventName: "back", listener: (event: SessionBackEvent) => void): this;
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
        /** Sets the frame rate while expanded and active, 15..120. */
        setFps(fps: number): this;
        /**
         * Sets the idle frame rate, 0..120 (0 turns power saving off), and optionally the delay in ms before it
         * applies, 100..3600000.
         */
        setIdleFps(idleFps: number, idleDelay?: number): this;
        /** Current target frame rate: 0 while paused, collapsedFps while collapsed, the idle or the full rate. */
        getFps(): number;
        /** Sets fontScale, 0.5..3; it takes effect in the next frame. */
        setFontScale(scale: number): this;
        /**
         * Returns the last presented frame of the window as an Image of the images module, in px (window size x density,
         * or the region), and transparent where nothing is drawn. Overlay and Activity windows read it with PixelCopy,
         * also from a render callback. A privileged window reads it with glReadPixels and only between two frames, so
         * call it from an event or a timer there. Throws Error while the window is collapsed, closed or has no frame yet.
         */
        capture(options?: CaptureOptions): CapturedImage;
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
        /** A Java int array, for dragInt2 .. 4, sliderInt2 .. 4 and inputInt2 .. 4; values are rounded. */
        ints(values?: readonly number[]): NativeArray<number>;
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
            DragDropPayloadMaxBytes: 65536;
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
        /** sortDirection of a {@link TableColumnSortSpecs}. */
        readonly SortDirection: NumericConstants<"None" | "Ascending" | "Descending">;
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
        /** Keyboard keys; the keys 0 to 9 are Digit0 to Digit9. ModCtrl and so on equal Mod.Ctrl and so on. */
        readonly Key: NumericConstants<"None" | "Tab" | "LeftArrow" | "RightArrow" | "UpArrow" | "DownArrow" | "PageUp" | "PageDown" | "Home" | "End" | "Insert" | "Delete" | "Backspace" | "Space" | "Enter" | "Escape" | "LeftCtrl" | "LeftShift" | "LeftAlt" | "LeftSuper" | "RightCtrl" | "RightShift" | "RightAlt" | "RightSuper" | "Menu" | "Digit0" | "Digit1" | "Digit2" | "Digit3" | "Digit4" | "Digit5" | "Digit6" | "Digit7" | "Digit8" | "Digit9" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z" | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10" | "F11" | "F12" | "F13" | "F14" | "F15" | "F16" | "F17" | "F18" | "F19" | "F20" | "F21" | "F22" | "F23" | "F24" | "Apostrophe" | "Comma" | "Minus" | "Period" | "Slash" | "Semicolon" | "Equal" | "LeftBracket" | "Backslash" | "RightBracket" | "GraveAccent" | "CapsLock" | "ScrollLock" | "NumLock" | "PrintScreen" | "Pause" | "Keypad0" | "Keypad1" | "Keypad2" | "Keypad3" | "Keypad4" | "Keypad5" | "Keypad6" | "Keypad7" | "Keypad8" | "Keypad9" | "KeypadDecimal" | "KeypadDivide" | "KeypadMultiply" | "KeypadSubtract" | "KeypadAdd" | "KeypadEnter" | "KeypadEqual" | "AppBack" | "AppForward" | "Oem102" | "ModCtrl" | "ModShift" | "ModAlt" | "ModSuper">;
        /** Modifier bits, combined with a key by | in a key chord: ui.Mod.Ctrl | ui.Key.S. */
        readonly Mod: NumericConstants<"None" | "Ctrl" | "Shift" | "Alt" | "Super">;
        readonly InputFlags: NumericConstants<"None" | "Repeat" | "RouteActive" | "RouteFocused" | "RouteGlobal" | "RouteAlways" | "RouteOverFocused" | "RouteOverActive" | "RouteUnlessBgFocused" | "RouteFromRootWindow" | "Tooltip">;
        readonly DragDropFlags: NumericConstants<"None" | "SourceNoPreviewTooltip" | "SourceNoDisableHover" | "SourceNoHoldToOpenOthers" | "SourceAllowNullID" | "SourceExtern" | "PayloadAutoExpire" | "PayloadNoCrossContext" | "PayloadNoCrossProcess" | "AcceptBeforeDelivery" | "AcceptNoDrawDefaultRect" | "AcceptNoPreviewTooltip" | "AcceptDrawAsHovered" | "AcceptPeekOnly">;

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
        /**
         * The debug and information windows of Dear ImGui. Each call draws the window, as showDemoWindow does; with an
         * open reference the window gets a close button that sets it to false, so call it while the reference is true.
         * showStyleEditor and showUserGuide put the upstream block in a window of its own ("Dear ImGui Style Editor",
         * "Dear ImGui User Guide"). createWindow({debug: true}) shows the Metrics and Debug Log windows itself.
         */
        showMetricsWindow(open?: MutableValue<boolean> | null): void;
        showDebugLogWindow(open?: MutableValue<boolean> | null): void;
        showIdStackToolWindow(open?: MutableValue<boolean> | null): void;
        showStyleEditor(open?: MutableValue<boolean> | null): void;
        showAboutWindow(open?: MutableValue<boolean> | null): void;
        showUserGuide(open?: MutableValue<boolean> | null): void;
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
        /**
         * Multi-component widgets: value is imgui.floats([...]) / imgui.ints([...]) or {value: [...]} with at least as
         * many numbers as the widget has components (2, 3 or 4), written back when the user edits them. The other
         * arguments are those of the one-component form; inputFloat2 .. 4 and inputInt2 .. 4 have no steps, as in
         * Dear ImGui. For the drags, min equal to max (the default) means no limit.
         */
        dragFloat2(label: string, value: NumberArrayValue, speed?: number, min?: number, max?: number, format?: string, flags?: number): boolean;
        dragFloat3(label: string, value: NumberArrayValue, speed?: number, min?: number, max?: number, format?: string, flags?: number): boolean;
        dragFloat4(label: string, value: NumberArrayValue, speed?: number, min?: number, max?: number, format?: string, flags?: number): boolean;
        dragInt2(label: string, value: NumberArrayValue, speed?: number, min?: number, max?: number, format?: string, flags?: number): boolean;
        dragInt3(label: string, value: NumberArrayValue, speed?: number, min?: number, max?: number, format?: string, flags?: number): boolean;
        dragInt4(label: string, value: NumberArrayValue, speed?: number, min?: number, max?: number, format?: string, flags?: number): boolean;
        sliderFloat2(label: string, value: NumberArrayValue, min?: number, max?: number, format?: string, flags?: number): boolean;
        sliderFloat3(label: string, value: NumberArrayValue, min?: number, max?: number, format?: string, flags?: number): boolean;
        sliderFloat4(label: string, value: NumberArrayValue, min?: number, max?: number, format?: string, flags?: number): boolean;
        sliderInt2(label: string, value: NumberArrayValue, min?: number, max?: number, format?: string, flags?: number): boolean;
        sliderInt3(label: string, value: NumberArrayValue, min?: number, max?: number, format?: string, flags?: number): boolean;
        sliderInt4(label: string, value: NumberArrayValue, min?: number, max?: number, format?: string, flags?: number): boolean;
        inputFloat2(label: string, value: NumberArrayValue, format?: string, flags?: number): boolean;
        inputFloat3(label: string, value: NumberArrayValue, format?: string, flags?: number): boolean;
        inputFloat4(label: string, value: NumberArrayValue, format?: string, flags?: number): boolean;
        inputInt2(label: string, value: NumberArrayValue, flags?: number): boolean;
        inputInt3(label: string, value: NumberArrayValue, flags?: number): boolean;
        inputInt4(label: string, value: NumberArrayValue, flags?: number): boolean;
        /** Two mutable values, the lower and the upper end; formatMax (for the upper end) defaults to format. */
        dragFloatRange2(label: string, currentMin: MutableValue<number>, currentMax: MutableValue<number>, speed?: number, min?: number, max?: number, format?: string, formatMax?: string | null, flags?: number): boolean;
        dragIntRange2(label: string, currentMin: MutableValue<number>, currentMax: MutableValue<number>, speed?: number, min?: number, max?: number, format?: string, formatMax?: string | null, flags?: number): boolean;
        /** value is in radians; degreesMin (-360), degreesMax (360) and the shown value ("%.0f deg") are in degrees. */
        sliderAngle(label: string, value: MutableValue<number>, degreesMin?: number, degreesMax?: number, format?: string, flags?: number): boolean;
        vSliderFloat(label: string, width: number, height: number, value: MutableValue<number>, min: number, max: number, format?: string, flags?: number): boolean;
        vSliderInt(label: string, width: number, height: number, value: MutableValue<number>, min: number, max: number, format?: string, flags?: number): boolean;
        toggle(label: string, value: MutableValue<boolean>): boolean;
        toggleSwitch(label: string, value: MutableValue<boolean>): boolean;
        beginCombo(label: string, preview?: unknown, flags?: number): boolean;
        endCombo(): void;
        /**
         * Submits only the visible rows of a long list (Dear ImGui ListClipper). The callback runs once per visible
         * range and draws rows start <= i < end; the clipper ends even when the callback throws. Use it inside
         * beginCombo / beginListBox / beginChild for lists longer than Limits.SelectionMaxItems.
         */
        listClipper(itemCount: number, callback: (start: number, end: number) => void): void;
        listClipper(itemCount: number, options: ListClipperOptions | null | undefined, callback: (start: number, end: number) => void): void;
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
        /** userId (0 by default) comes back as columnUserId in {@link tableGetSortSpecs}. */
        tableSetupColumn(label: string, flags?: number, initWidthOrWeight?: number, userId?: number): void;
        /**
         * Sort specs of the current table, null when it was begun without TableFlags.Sortable. Call it after the
         * tableSetupColumn calls; when specsDirty is true, sort the rows. Reading the specs clears specsDirty, so it is
         * true in the frame the user clicked a header (and in the first frame).
         */
        tableGetSortSpecs(): TableSortSpecs | null;
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
        /**
         * Clips the current window's drawing, hit testing and widget culling until popClipRect, in the same frame.
         * Coordinates are frame px, like the draw lists.
         * @param intersectWithCurrent Also apply the current clip rectangle; true by default (the DrawList form: false).
         */
        pushClipRect(minimum: Point, maximum: Point, intersectWithCurrent?: boolean): void;
        /** Throws an Error without a matching pushClipRect on the current window in this frame. */
        popClipRect(): void;
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
        /**
         * Injects a pointer position, in frame px like getMousePos (not dp), for the next frame. It counts as touch
         * input. A position and a button change apart take effect in separate frames, in the order of the calls.
         */
        addMousePosEvent(x: number, y: number): void;
        /**
         * Injects a pointer button change for the next frame; see addMousePosEvent.
         * @param button MouseButton: 0 left, 1 right, 2 middle, up to 4.
         */
        addMouseButtonEvent(button: number, down: boolean): void;
        wantTextInput(): boolean;

        // Key queries: key is a Key or Mod value, keyChord a Key value combined with Mod values, such as Mod.Ctrl | Key.S.
        // A value that is neither throws a RangeError.
        isKeyDown(key: number): boolean;
        /** @param repeat Also true on the repeats while the key stays down (io.KeyRepeatDelay, io.KeyRepeatRate); true by default. */
        isKeyPressed(key: number, repeat?: boolean): boolean;
        isKeyReleased(key: number): boolean;
        /** How many times a key held down would have repeated in this frame, for the given delay and rate in seconds. */
        getKeyPressedAmount(key: number, repeatDelay: number, rate: number): number;
        /** English name of a key, "None" for Key.None. For display and debugging: do not save it. */
        getKeyName(key: number): string;
        /** Whether the chord was pressed, without any focus check; prefer shortcut. */
        isKeyChordPressed(keyChord: number): boolean;
        /**
         * Whether the chord was pressed and this code may act on it: by default the key goes to the focused window.
         * @param flags InputFlags: Repeat, and one route such as RouteGlobal.
         */
        shortcut(keyChord: number, flags?: number): boolean;
        /** Makes the next item react to a chord as if it were activated. @param flags InputFlags, also Tooltip. */
        setNextItemShortcut(keyChord: number, flags?: number): void;

        /**
         * The text of the Android clipboard, the one the host's getClip reads, also outside a window session. Empty when
         * there is no text. From Android 10 the system gives an empty or old value unless the host or a plugin window
         * has the input focus; see docs/LIMITS.md.
         */
        getClipboardText(): string;
        /** Sets the Android clipboard, the one the host's setClip writes. */
        setClipboardText(text: unknown): void;

        /**
         * Call after an item: true while it is dragged. Then call setDragDropPayload and endDragDropSource (or use
         * withDragDropSource); what you draw in between shows in the preview tooltip.
         * @param flags DragDropFlags; items without an id, such as text, need SourceAllowNullID.
         */
        beginDragDropSource(flags?: number): boolean;
        /**
         * @param type Identifies the kind of data for the target: 1 to 32 UTF-8 bytes, not starting with "_".
         * @param data A string, a number or anything JSON.stringify accepts: at most Limits.DragDropPayloadMaxBytes as JSON.
         * @param condition Cond.Always (default, updates the data each frame) or Cond.Once.
         * @returns Whether a target accepted the payload in the previous frame.
         */
        setDragDropPayload(type: string, data: unknown, condition?: number): boolean;
        endDragDropSource(): void;
        /** Call after an item: true while a payload hovers it. Then call acceptDragDropPayload and endDragDropTarget. */
        beginDragDropTarget(): boolean;
        /**
         * The payload when one of this type was dropped here, otherwise null. "_COL3F" and "_COL4F" accept colors dragged
         * from color widgets.
         * @param flags DragDropFlags; AcceptBeforeDelivery also returns it before the release (see `delivery`).
         */
        acceptDragDropPayload<Data = unknown>(type: string, flags?: number): DragDropPayload<Data> | null;
        endDragDropTarget(): void;
        /** The payload of the drag in progress, or null. */
        getDragDropPayload<Data = unknown>(): DragDropPayload<Data> | null;
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
        /** Calls body while the last item is dragged, inside beginDragDropSource / endDragDropSource. */
        withDragDropSource(flags: number | undefined, body: FrameBody): boolean;
        withDragDropSource(body: FrameBody): boolean;
        /** Calls body while a payload hovers the last item, inside beginDragDropTarget / endDragDropTarget. */
        withDragDropTarget(body: FrameBody): boolean;
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
        readonly ShowMetricsWindow: ApiCore["showMetricsWindow"];
        readonly ShowDebugLogWindow: ApiCore["showDebugLogWindow"];
        readonly ShowIDStackToolWindow: ApiCore["showIdStackToolWindow"];
        readonly ShowStyleEditor: ApiCore["showStyleEditor"];
        readonly ShowAboutWindow: ApiCore["showAboutWindow"];
        readonly ShowUserGuide: ApiCore["showUserGuide"];
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
        readonly DragFloat2: ApiCore["dragFloat2"];
        readonly DragFloat3: ApiCore["dragFloat3"];
        readonly DragFloat4: ApiCore["dragFloat4"];
        readonly DragInt2: ApiCore["dragInt2"];
        readonly DragInt3: ApiCore["dragInt3"];
        readonly DragInt4: ApiCore["dragInt4"];
        readonly SliderFloat2: ApiCore["sliderFloat2"];
        readonly SliderFloat3: ApiCore["sliderFloat3"];
        readonly SliderFloat4: ApiCore["sliderFloat4"];
        readonly SliderInt2: ApiCore["sliderInt2"];
        readonly SliderInt3: ApiCore["sliderInt3"];
        readonly SliderInt4: ApiCore["sliderInt4"];
        readonly InputFloat2: ApiCore["inputFloat2"];
        readonly InputFloat3: ApiCore["inputFloat3"];
        readonly InputFloat4: ApiCore["inputFloat4"];
        readonly InputInt2: ApiCore["inputInt2"];
        readonly InputInt3: ApiCore["inputInt3"];
        readonly InputInt4: ApiCore["inputInt4"];
        readonly DragFloatRange2: ApiCore["dragFloatRange2"];
        readonly DragIntRange2: ApiCore["dragIntRange2"];
        readonly SliderAngle: ApiCore["sliderAngle"];
        readonly Toggle: ApiCore["toggle"];
        readonly ToggleSwitch: ApiCore["toggle"];
        readonly BeginCombo: ApiCore["beginCombo"];
        readonly EndCombo: ApiCore["endCombo"];
        readonly ListClipper: ApiCore["listClipper"];
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
        readonly TableGetSortSpecs: ApiCore["tableGetSortSpecs"];
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
        readonly IsKeyDown: ApiCore["isKeyDown"];
        readonly IsKeyPressed: ApiCore["isKeyPressed"];
        readonly IsKeyReleased: ApiCore["isKeyReleased"];
        readonly GetKeyPressedAmount: ApiCore["getKeyPressedAmount"];
        readonly GetKeyName: ApiCore["getKeyName"];
        readonly IsKeyChordPressed: ApiCore["isKeyChordPressed"];
        readonly Shortcut: ApiCore["shortcut"];
        readonly SetNextItemShortcut: ApiCore["setNextItemShortcut"];
        readonly GetClipboardText: ApiCore["getClipboardText"];
        readonly SetClipboardText: ApiCore["setClipboardText"];
        readonly BeginDragDropSource: ApiCore["beginDragDropSource"];
        readonly SetDragDropPayload: ApiCore["setDragDropPayload"];
        readonly EndDragDropSource: ApiCore["endDragDropSource"];
        readonly BeginDragDropTarget: ApiCore["beginDragDropTarget"];
        readonly AcceptDragDropPayload: ApiCore["acceptDragDropPayload"];
        readonly EndDragDropTarget: ApiCore["endDragDropTarget"];
        readonly GetDragDropPayload: ApiCore["getDragDropPayload"];
        readonly WithDragDropSource: ApiCore["withDragDropSource"];
        readonly WithDragDropTarget: ApiCore["withDragDropTarget"];
        readonly PushClipRect: ApiCore["pushClipRect"];
        readonly PopClipRect: ApiCore["popClipRect"];
        readonly AddMousePosEvent: ApiCore["addMousePosEvent"];
        readonly AddMouseButtonEvent: ApiCore["addMouseButtonEvent"];
    }

    type Api = ApiCore & ApiAliases;
}

declare const imgui: ImGui.Api;
