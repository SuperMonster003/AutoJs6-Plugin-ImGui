<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Create floating user interfaces with Dear ImGui</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-ImGui?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-ImGui?color=A24232&label=Issues"/></a>
    <br>
    <a href="https://developer.android.com/studio/archive"><img alt="Android Studio" src="https://img.shields.io/badge/Android%20Studio-2023.3+-B64FC8"/></a>
    <a href="https://www.jetbrains.com/idea/download/other.html"><img alt="IntelliJ IDEA" src="https://img.shields.io/badge/IntelliJ%20IDEA-2023.3+-EE4677"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-ImGui?color=534BAE&label=License"/></a>
  </p>
</div>

******

### Languages

******

The current README.md supports the following languages:

- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
- English [en] # current
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-fr.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-es.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ru.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ar.md)

******

### Introduction

******

The ImGui Plugin exposes Dear ImGui as the global `imgui` object in script engines. It renders immediate-mode controls in a transparent floating window and keeps window creation, frame scheduling, touch input, and native resource cleanup in one compact API.

******

### Features

******

- Loads as the global `imgui` object through automatic mounting or `plugins.load(packageName)`.
- Creates transparent floating windows with configurable size, position, frame rate, font, and blank-area dragging.
- Provides windows, child regions, tabs, trees, text, buttons, mutable inputs, selectors, progress indicators, layout helpers, themes, and the Dear ImGui demo window.
- Provides mutable Boolean, integer, floating-point, string, and color references for stateful controls.
- Localizes plugin metadata, usage instructions, README, and changelog for ten languages.

******

### Usage

******

Enable automatic mounting in Plugin Center or load the plugin explicitly, then create a floating window:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");

var enabled = imgui.bool(true);
var value = imgui.float(0.5);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(overlay.width, overlay.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui controls",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("Enabled", enabled);
            ui.sliderFloat("Value", value, 0, 1, "%.2f");
            if (ui.button("Close", 120, 0)) {
                overlay.close();
            }
        }
    );
}, {
    width: 360,
    height: 240,
    fontSize: 16,
    fps: 60
});
```

Mutable controls update the reference objects created by `imgui.bool`, `imgui.int`, `imgui.float`, `imgui.string`, and `imgui.floats`. `width`, `height`, and `fontSize` use density-independent units. Drag a blank area to move the window, or pass `movable: false` to keep it fixed.

******

### API Overview

******

The lower camel case methods mirror common Dear ImGui operations, while PascalCase aliases are available for familiar widget calls:

- Window lifecycle: `createWindow`, `closeWindow`, `withWindow`, `withChild`, `withTabBar`, `withTabItem`, and `withTreeNode`.
- Widgets: `text`, `button`, `checkbox`, `radioButton`, `sliderFloat`, `sliderInt`, `dragFloat`, `dragInt`, `inputText`, `colorEdit3`, `colorEdit4`, `progressBar`, `combo`, and `selectable`.
- Layout and state: cursor methods, item width methods, `sameLine`, `separator`, `spacing`, item queries, and capture queries.
- Constants: `Cond`, `WindowFlags`, `InputTextFlags`, `SliderFlags`, `TreeNodeFlags`, `SelectableFlags`, `TabBarFlags`, `TabItemFlags`, and `MouseButton`.

******

### Release History

******

# v1.0.0

###### 2026/08/29

* `Feature` Global `imgui` object with automatic mounting and explicit `plugins.load` support
* `Feature` Transparent floating windows rendered by Dear ImGui 1.92.9 with configurable dimensions, frame rate, fonts, and blank-area dragging
* `Feature` Immediate-mode window, layout, text, input, selection, color, progress, tree, tab, theme, and demo APIs
* `Feature` Mutable Boolean, integer, floating-point, string, and color references for stateful controls
* `Feature` Localized plugin metadata, usage instructions, README, and changelog for ten languages
* `Dependency` Added the bundled Common Plugin API for plugin discovery metadata
* `Dependency` Added Kotlin standard library and Parcelize runtime version 2.2.21
* `Dependency` Added Apache Commons Compress 1.28.0 and XZ for Java 1.10 for build tooling
* `Dependency` Added JUnit version 4.13.2 for plugin contract tests

##### For more release history

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-en.md)

******

### Build

******

```powershell
.\gradlew.bat :app:assembleDebug
```

Release build with CRC32 digest filenames:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

Build parameters come from `version.properties`; the current minimum SDK is 24 and target SDK is 36.

******

### Resource Layout

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
```

`strings.xml` contains localized plugin descriptions and `plugin_instruction.md` contains usage instructions displayed by the host. README and CHANGELOG files are generated from JSON sources by `.python/generate_markdown.py`.

******

### Links

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui official project: https://github.com/ocornut/imgui
