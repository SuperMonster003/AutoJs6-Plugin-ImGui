# Docking and Multi-Viewport evaluation

This document records the P6 evaluation against Dear ImGui v1.92.9 and the plugin architecture used by
v1.8.0. It separates two upstream features that are often discussed together but have different costs on
Android.

## Evaluated baseline

- The vendored source is the official Dear ImGui `v1.92.9` master tag. It does not expose
  `ImGuiConfigFlags_DockingEnable`, `DockSpace`, or the docking builder API.
- A plugin session currently owns one Android `Surface`, one `ANativeWindow`, one EGL window surface, one
  EGL context, and one OpenGL 3 renderer backend instance.
- Multiple Dear ImGui root windows already coexist inside that one Android surface through repeated
  `begin()` / `withWindow()` calls. They can move, overlap, resize, and persist their ordinary ImGui state
  without creating additional Android windows.
- Android touch, IME, focus, lifecycle, automatic pass-through regions, textures, and context restoration
  all currently target that single surface.

## Docking

Dear ImGui docking is maintained on the official `docking` branch and is enabled with
`ImGuiConfigFlags_DockingEnable`. A dockspace can operate inside one main viewport; operating-system
multi-viewport support is optional. The upstream maintainer also describes docking and multi-viewports as
features intended to merge toward Dear ImGui 2.0.

That makes single-surface docking technically possible for this plugin, but it is not a source-only switch.
Shipping it would require all of the following:

1. Move the immutable upstream snapshot from a stable master tag to a reviewed docking-branch commit, or
   wait for docking to reach a stable master release.
2. Add JNI and JavaScript bindings for dockspaces and the chosen docking flags without exposing unstable
   internal builder APIs by default.
3. Define mobile behavior for small screens, drag targets, tab bars, saved layout state, reset/recovery, and
   touch conflicts with ordinary window dragging.
4. Maintain a separate upgrade and regression matrix while the plugin differs from upstream master.

Decision for v1.8.0: do not ship production Docking yet. Re-evaluate when Docking is in an immutable stable
master tag (preferably the announced 2.0 line), or when a concrete tablet/desktop-mode use case justifies an
explicit experimental build. If introduced earlier, it must be opt-in and must not change the existing
single-surface API by default.

## Multi-Viewport

Dear ImGui Multi-Viewports lets ImGui windows leave the main viewport and become separate native platform
windows. A custom backend must implement `ImGuiPlatformIO` callbacks for creating, positioning, sizing,
focusing, rendering, and destroying those windows. The renderer must also manage the corresponding graphics
contexts and restore the main OpenGL context after rendering additional platform windows.

On Android, a complete backend would therefore need:

- one `SurfaceView`, overlay window, or privileged SurfaceFlinger layer per platform viewport;
- EGL surface/context creation and sharing rules for every viewport;
- per-window touch routing, split-touch behavior, focus, IME ownership, z-order, security flags, and
  pass-through regions;
- deterministic handling of rotation, activity recreation, surface loss, renderer shutdown, and process
  death across all viewports;
- a mobile UX policy for Dear ImGui assumptions that were primarily designed around desktop native windows.

The current `imgui_impl_android` integration does not provide those platform callbacks, and the current
single-surface renderer cannot render a detached viewport by calling `eglSwapBuffers()` on its one surface.
The optional privileged backend may eventually supply a lower-level Android window primitive, but it does
not remove the need for the platform and renderer contracts above.

Decision for v1.8.0: defer Multi-Viewport. It currently adds substantially more lifecycle and input risk
than user-visible value because multiple movable ImGui windows are already supported inside one overlay.

## Revisit gates

The evaluation should be reopened only when at least one of these gates is met:

- Dear ImGui publishes Docking on a stable master tag and its APIs pass the upstream snapshot review.
- A supported Android desktop/tablet workflow requires persistent dock layouts that ordinary root windows
  cannot provide.
- The privileged renderer has a proven multi-surface lifecycle, shared EGL resources, focus/IME routing,
  and cleanup after client or service death.
- A prototype passes touch, IME, rotation, surface-recreation, texture, and pass-through regression tests on
  both a current Android release and the minimum practical API level.

## Primary references

- Dear ImGui [Multi-Viewports wiki](https://github.com/ocornut/imgui/wiki/Multi-Viewports)
- Dear ImGui [Getting Started wiki](https://github.com/ocornut/imgui/wiki/Getting-Started)
- Dear ImGui [Docking issue and design discussion](https://github.com/ocornut/imgui/issues/2109)
- Dear ImGui [upcoming changes](https://github.com/ocornut/imgui/wiki/Upcoming-changes)
