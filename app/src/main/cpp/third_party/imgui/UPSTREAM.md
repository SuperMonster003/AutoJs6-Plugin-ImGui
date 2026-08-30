# Dear ImGui upstream source

- Project: `ocornut/imgui`
- URL: https://github.com/ocornut/imgui
- Tag: `v1.92.9`
- Commit: `01380c579715e62fb9a8d6ec0502c4ea83bfde6e`
- License: MIT, reproduced in `LICENSE.txt`

This directory contains the Dear ImGui core plus the Android and OpenGL 3 backends required by the plugin. The source files are copied without local modifications.

`UPSTREAM.sha256` records every vendored file. Run the repository updater in check mode to prove that
the directory still matches the recorded upstream snapshot:

```shell
python tools/update_imgui_upstream.py --check
```

## Upgrade procedure

1. Review the upstream release notes and resolve the immutable tag to its full commit ID. Patch releases
   on the current 1.92 line may be evaluated as they appear; move to 1.93 only after a stable tag and the
   complete regression matrix below are available.
2. Obtain the GitHub commit-archive SHA-256 through an independently reviewed download. The updater prints
   the observed digest in dry-run mode, but `--apply` requires the expected digest to be supplied explicitly.
3. Preview the exact whitelisted files that differ:

   ```shell
   python tools/update_imgui_upstream.py \
     --tag v1.92.10 \
     --commit FULL_40_CHARACTER_COMMIT \
     --archive-sha256 EXPECTED_SHA256
   ```

4. Apply the snapshot after reviewing the preview:

   ```shell
   python tools/update_imgui_upstream.py \
     --tag v1.92.10 \
     --commit FULL_40_CHARACTER_COMMIT \
     --archive-sha256 EXPECTED_SHA256 \
     --apply
   ```

   The updater verifies the current manifest, extracts only the core/Android/OpenGL files used by CMake,
   updates this metadata, refreshes `UPSTREAM.sha256`, and changes `IMGUI_VERSION` in `version.properties`.
   Use `--force` only after auditing intentional local divergence.

5. Inspect upstream API/backend changes against `ImGuiBridge.cpp`; never patch vendored files to adapt the
   bridge. Compatibility changes belong outside `third_party/imgui`.

## Required regression matrix

- `python tools/update_imgui_upstream.py --check`
- `./gradlew :app:verifyImGuiSource :app:testDebugUnitTest`
- `./gradlew :app:verifyImGuiDebugApks`
- `./gradlew :app:assembleDebugAndroidTest`
- Connected `ImGuiRenderInstrumentedTest` on the minimum practical API (24/25 emulator) and a current
  physical device or current API emulator.
- Release build for arm64-v8a, armeabi-v7a, x86_64, x86, and universal ABI inventories.
- AutoJs6 smoke run of all bundled examples, including touch, IME, surface detach/restore, texture upload,
  table rendering, and theme switching.
- Confirm the runtime `imgui.version()`, APK metadata, `version.properties`, and this document agree.
