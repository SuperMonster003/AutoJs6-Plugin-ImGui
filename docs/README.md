# Documentation

The repository README covers installation and the API groups. The pages here go deeper.

## Using the plugin

| Page | Content |
| --- | --- |
| [MULTI-WINDOW.md](MULTI-WINDOW.md) | Sessions, surfaces and root windows: several panels in one session, position, collapsing, focus, close buttons, touch regions |
| [THREADING.md](THREADING.md) | Which thread runs which callback, what must not block, background tasks |
| [LIMITS.md](LIMITS.md) | Runtime limits, clipboard, injected pointer events, window capture, display changes, CJK coverage, font scale, large lists, multi-select, device coverage |
| [ALIASES.md](ALIASES.md) | The PascalCase aliases and where the API differs from the C++ signatures |
| [MIGRATION-1.12.md](MIGRATION-1.12.md) | What changed for scripts in 1.12.0: dp units, read-only fields, event threads |
| [PRIVILEGED-BACKEND.md](PRIVILEGED-BACKEND.md) | `launchPrivileged`: how the layer works, Shizuku and root, what it cannot do |

The type declarations are in [imgui.d.ts](../app/src/main/assets/types/imgui.d.ts): every member has a comment with its
units and thread. The bundled examples are in [examples](../app/src/main/assets/examples) and run with
`imgui.runExample(name)`.

## How it works

| Page | Content |
| --- | --- |
| [FRAME-LOOP.md](FRAME-LOOP.md) | The frame loop, idle and paused states, and the evaluation of an independent render thread |
| [DOCKING-MULTI-VIEWPORT.md](DOCKING-MULTI-VIEWPORT.md) | Why docking and multi-viewport are deferred |
| [16kb.md](16kb.md) | 16 KB page alignment and how the build verifies it |

## Project records

| Page | Content |
| --- | --- |
| [API-REVIEW-2026-10.md](API-REVIEW-2026-10.md) | The script API review the R series of the roadmap came from |
| [API-COVERAGE-HANDOVER.md](API-COVERAGE-HANDOVER.md) | Member counts, declaration status and documentation entry points, for the API coverage work of the host |
| [prototypes/render-thread.patch](prototypes/render-thread.patch) | The render thread prototype, not merged |
