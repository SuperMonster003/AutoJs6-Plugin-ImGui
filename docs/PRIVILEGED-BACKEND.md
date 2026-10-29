# Privileged SurfaceFlinger backend

This document defines the production P6 privileged-window architecture introduced in v1.9.0, the
security boundary it inherits from AutoJs6, the direct-input policy, and the device evidence used to
accept it. The v1.8.0 socket renderer remains in the source tree as a diagnostic harness, but it is not
the user-facing transport.

## Status

| Capability | v1.9.0 status | Production-ready |
| --- | --- | --- |
| Activity/overlay renderer | Available | Yes |
| Host-managed root launcher | Available when AutoJs6 root policy allows it | Yes |
| Host-managed Shizuku launcher | Available when AutoJs6 reports Shizuku operational | Yes |
| Authenticated Binder Surface transport v2 | Available | Yes |
| Privileged SurfaceControl layer | Available, with a per-device runtime probe | Yes |
| Complete existing JS/JNI ImGui facade | Reused in the host process without an RPC copy | Yes |
| Direct `/dev/input/event*` pointer reader | Available, non-grabbing observation policy | Yes |
| IME/key input in privileged mode | Not implemented | No |
| Docking / Multi-Viewport | Deferred; see `DOCKING-MULTI-VIEWPORT.md` | No |

`imgui.getBackendCapabilities()` exposes schema version 2. A configured device reports
`privileged.status === "available"`, `privileged.productionReady === true`, transport
`authenticated-binder-surface`, and the concrete AutoJs6 Root/Shizuku state. Capability probing itself
does not run `su`, request a Shizuku grant, or start a privileged process.

## Public API

Privileged mode is explicit. It is never selected by `createWindow`, `launchFloaty`, or `launch` unless
the script asks for it:

```js
var session = imgui.launchPrivileged(function (ui, window) {
    ui.setNextWindowPos(32, 96, ui.Cond.Always);
    ui.setNextWindowSize(window.width - 64, 360, ui.Cond.Always);
    if (ui.begin("Privileged ImGui", null, ui.WindowFlags.NoCollapse)) {
        ui.text("Backend: " + window.privilegedBackend);
        ui.textWrapped(window.getBackendInfo());
        if (ui.button("Close", -1, 48)) {
            window.close("button");
        }
    }
    ui.end();
}, {
    backend: "auto",       // "auto", "shizuku", or "root"
    startupTimeout: 10000, // 1..15000 ms
    ime: false,
    collapseButton: false,
    fps: 60
});
```

The equivalent low-level selector is `createWindow(callback, {mode: "privileged"})`.

`backend: "auto"` prefers an operational AutoJs6 Shizuku service and otherwise tries the host's allowed
root backend. Explicit `"shizuku"` and `"root"` choices fail closed when that host facility is not ready.
The resolved value is available as `session.privilegedBackend`. `session.getBackendInfo()` returns live
diagnostics such as:

```text
backend=shizuku;uid=2000;pid=8291;surface=true;inputEnabled=true;input=/dev/input/event4/type-b
```

The TypeScript declarations cover `WindowMode.Privileged`, `PrivilegedBackend`, the privileged options,
`launchPrivileged` / `LaunchPrivileged`, and the additional session/capability fields.

## Why Surface transfer replaced a complete command buffer

The v1.8.0 proof rendered Dear ImGui inside the root process and accepted a small authenticated socket
frame. Turning that proof into the public backend would have required duplicating every immediate-mode
operation across a protocol: 226 existing calls, immediate Boolean results, mutable refs, strings,
textures, draw lists, fonts, frame boundaries, errors, backpressure, and resource ownership.

v1.9.0 keeps only the operation that actually requires elevation in the privileged child: creating and
owning the SurfaceControl layer. Android `Surface` is Parcelable and can be transferred through Binder,
so the child gives its buffer producer to the ordinary AutoJs6/plugin process. The existing EGL ES 3,
Dear ImGui, JNI, Java, and JavaScript implementation then renders directly into that Surface.

This design has three useful properties:

1. The complete established facade works without a second implementation or serialization layer.
2. The privileged endpoint exposes no arbitrary command execution and does not load user scripts.
3. SurfaceControl reflection and `/dev/input` access remain confined to a short-lived UID 0/2000 child.

The renderer itself remains in the host process. The privileged child isolates layer ownership and input
access, not all rendering code; callers that require full renderer-process isolation should account for
that distinction.

## Process architecture

```text
AutoJs6 script + plugin connection (ordinary host UID)
        |
        | plugin protocol v2 binds the installed Broker service
        | prepare(random 256-bit token)
        |
        | AutoJs6 WrappedShizuku.execCommand(...) or
        | AutoJs6 RootUtils + ProcessShell.execCommand(..., root=true)
        | current Android user ID is passed explicitly
        v
ImGuiPrivilegedProcess (Shizuku shell UID 2000 or root UID 0)
        |
        | external ContentProvider rendezvous, UID + token gated
        | register one Binder endpoint
        v
ImGuiPrivilegeBrokerService (:privilege_broker process)
        |
        | endpoint.createSurface(...)
        | Parcelable Surface returned over Binder
        v
Existing host EGL / Dear ImGui renderer
        |
        `-- buffers -> privileged SurfaceControl layer -> SurfaceFlinger

Privileged child
        `-- /dev/input/event* -> Binder callback -> bounded host input FIFO -> ImGui IO
```

### Host privilege adapter

The plugin deliberately bundles neither Shizuku nor an independent root manager. It loads these AutoJs6
classes through the host Context class loader:

- `WrappedShizuku`: installed/running/permission/service/operational state and `execCommand`;
- `RootUtils`: the configured RootMode and authoritative root availability check;
- `ProcessShell`: the host's root command executor.

This reuses the user's existing AutoJs6 authorization, preferences, Shizuku UserService lifecycle, and
future host fixes. It also avoids a second permission prompt or a plugin-owned root policy. A failed host
check is surfaced to the script as a startup error.

A direct cross-package Shizuku UserService is intentionally not used: Shizuku validates that a service
component belongs to the authorized caller UID. AutoJs6 therefore starts the plugin entry point through
its own already-authorized UserService command channel.

The host's current Android user ID is included in the fixed child arguments and used for the external
provider acquisition/release calls. This prevents a host running in a secondary Android user from
accidentally rendezvousing with the plugin instance in user 0.

### Broker rendezvous

A raw `app_process` has no normal ActivityManager application record, so it cannot bind an Android
Service as an ordinary app. The child instead acquires the already-prepared broker through an exported,
call-only ContentProvider using ActivityManager's external-provider API. The provider exists solely for
this rendezvous and applies all of the following checks:

- caller UID must be 0 or Android shell UID 2000;
- the argument must be exactly 64 hexadecimal characters generated from `SecureRandom` (256 bits);
- the token is compared in constant time with the single prepared session;
- one live endpoint may register; a second registration cannot replace it;
- host-only operations are restricted to the preparing AutoJs6 UID;
- the normal Broker Service bind additionally requires `org.autojs.permission.PLUGIN`;
- Broker, endpoint, and input-callback Binder deaths trigger cleanup.

The token is a rendezvous capability, not protection from a hostile peer already running under the same
root/shell UID. Root can control the device, and separately authorized Shizuku services commonly share
UID 2000. The one-endpoint rule closes post-registration replacement; the initial same-UID race remains
inside that existing privileged trust boundary.

### Surface endpoint

The child reflectively creates `SurfaceSession`, `SurfaceControl.Builder`, and
`SurfaceControl.Transaction`, configures an RGBA buffer layer on display layer stack 0 at a high z-order,
and returns a `Surface`. Hidden-API exemption is attempted only in the child. The ordinary plugin process
does not reflect into SurfaceControl or relax its hidden-API policy.

The endpoint owns the SurfaceControl until the session closes. Closing the JavaScript session shuts down
the native renderer, releases the host Surface copy, asks the endpoint to close its input reader and
layer, clears the token, quits the child Looper, and lets `app_process` exit normally. Host/Broker/input
callback death provides the same child-side cleanup path.

## Direct Linux input policy

The privileged reader supports both kernel userspace layouts:

- 16-byte `input_event` records in a 32-bit process;
- 24-byte records in a 64-bit process.

It parses Type A frames separated by `SYN_MT_REPORT` and Type B persistent slots selected by
`ABS_MT_SLOT`. Tracking IDs preserve the primary finger across frames; raw ranges are clamped and mapped
for rotations 0/90/180/270. Binder callbacks enqueue pointer events into the same bounded 2,048-item FIFO
used by normal windows, and the render thread drains them before `NewFrame()`.

The production policy is observation, not global input grabbing. `EVIOCGRAB` is never issued, because a
crash while owning the touchscreen could deny input to the whole device. Consequently, the physical
gesture also reaches Android and the underlying application. For privileged sessions:

- `Touchable` and `Auto` feed observed pointer events to ImGui;
- `Passthrough` disables the Binder input callback;
- `session.getBackendInfo()` is the authoritative per-device input result;
- `directInput.appProcessReadable` only describes the ordinary probing process and may be false even when
  the privileged child reports an available event node;
- OEM SELinux policy may allow a root child but deny a shell/Shizuku child.

IME, text composition, hardware-key routing, Android InputDispatcher hit regions, and exclusive input are
not provided in this mode.

## Capability schema v2

Important fields returned by `getBackendCapabilities()` include:

- `privileged.transport`: `authenticated-binder-surface`;
- `privileged.rendererProcess`: `host`;
- `privileged.tokenBits`: `256`;
- `privileged.hostBridgeAvailable`, `rootBridgeAvailable`, `rootMode`, `rootCandidate`;
- `shizukuBridgeAvailable`, `shizukuInstalled`, `shizukuRunning`, `shizukuPermission`,
  `shizukuService`, and `shizukuOperational`;
- `directInput.runtimeProbeRequired`: true;
- `directInput.routingPolicy`: `observe`.

`rootCandidate` is deliberately a non-elevating hint. In AutoJs6 `AUTO_DETECT` mode the authoritative
`RootUtils.isRootAvailable()` check runs only when a privileged session is explicitly launched.

## Verified device evidence

### Root

On a Sony G8441 running Android 9 / API 28 with Magisk root and AutoJs6 6.8.0:

- AutoJs6's host root path launched the child as UID 0;
- the authenticated Broker returned a valid full-display Surface;
- the screenshot run rendered 90 frames through the ordinary JS facade;
- the final minified, resource-shrunk release APK repeated the full lifecycle with 82 frames;
- the child opened `/dev/input/event6` as Type A;
- the result log reached `ready`, `running`, and `closed: smoke-complete`;
- the child and `AutoJs6-ImGui-Privileged` layer disappeared after close;
- an on-device screenshot visibly contained the ImGui diagnostics over the host screen.

The same five-test instrumentation class passed on physical API 28, API 31, and API 35 devices (15/15
tests total). It covered the provider UID gate, capability schema v2, split-touch restoration,
authenticated shell-child Surface transfer with the real native renderer, and the PixelCopy semantic
screenshot baseline.

### Shizuku

On a Sony XQ-AT72 running Android 12 / API 31 with Shizuku 13.5 (ADB mode) and AutoJs6 6.8.0 build 5276:

- AutoJs6 reported installed/running/permission/service/operational as true;
- `WrappedShizuku.execCommand` launched the child as UID 2000;
- Binder Surface transport v2 created a 1096 × 2518 layer;
- the child opened `/dev/input/event4` as Type B;
- the screenshot run rendered 123 frames through the existing JS facade;
- the final minified, resource-shrunk release APK repeated the full lifecycle with 121 frames;
- the result log reached `ready`, `running`, and `closed: smoke-complete`;
- the child exited cleanly with no orphan after the session closed;
- a screenshot visibly showed `backend=shizuku; uid=2000; surface=true` over Shizuku's app-management UI.

## Deliberate limitations

Privileged mode is a fixed full-display layer in v1.9.0. `setPosition` and `setSize` are no-ops, display
dimension changes close the session so the script can recreate it, and companion Android floating
buttons/collapse are unavailable. Host-layer alpha and marking the privileged layer itself secure against
capture are not implemented; `alpha !== 1` and `secure: true` are rejected. The ability to draw above an
application that uses `FLAG_SECURE` is separate from protecting the ImGui layer from capture.

The mode also disables the Android IME proxy. It supports pointer interaction through direct evdev only.
SurfaceControl is a non-SDK framework interface, so startup can still fail on an OEM/API combination even
when Root/Shizuku authorization is valid. Such failure is explicit and leaves the established overlay and
Activity modes unchanged.

## Legacy socket diagnostic

`ImGuiPrivilegedProtocol` v1 and the `serve` / `client-smoke` entry points remain for the v1.8.0 isolated
renderer tests. Their fixed header, 1 MiB payload limit, 4 KiB frame-text limit, 256-bit authentication,
and malformed-frame tests continue to be verified. They are not called by `launchPrivileged`, and no
ordinary script API exposes that socket.

## Primary references

- Shizuku API [UserService overview and constraints](https://github.com/RikkaApps/Shizuku-API/blob/master/README.md)
- AOSP native [SurfaceComposerClient interface](https://android.googlesource.com/platform/frameworks/native/+/master/libs/gui/include/gui/SurfaceComposerClient.h)
- AOSP native [SurfaceComposerClient implementation](https://android.googlesource.com/platform/frameworks/native/+/refs/heads/main/libs/gui/SurfaceComposerClient.cpp)
- AOSP [native SurfaceControl input test](https://android.googlesource.com/platform/frameworks/native/+/9034ae7b04a998d3df1930d9b679564c8f7916d4/libs/gui/tests/EndToEndNativeInputTest.cpp)
- Android [`FLAG_SPLIT_TOUCH` contract](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#FLAG_SPLIT_TOUCH)
