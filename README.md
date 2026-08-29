<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>使用 Dear ImGui 创建浮动用户界面</p>

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

### 语言 (Languages)

******

当前 README.md 支持以下语言:

- 简体中文 [zh-Hans] # 当前
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-en.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-fr.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-es.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ru.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ar.md)

******

### 简介

******

ImGui 插件在脚本引擎中提供全局 `imgui` 对象. 它在透明浮动窗口中渲染即时模式控件, 并通过一套紧凑的 API 统一管理窗口创建/帧调度/触摸输入和原生资源清理.

******

### 功能

******

- 通过自动挂载或 `plugins.load(packageName)` 加载全局 `imgui` 对象.
- 透明浮动窗口, 可配置尺寸/位置/帧率/字体并支持拖动空白区域.
- 窗口/子区域/标签页/树形节点/文本/按钮/可变输入/选择器/进度指示/布局辅助/主题以及 Dear ImGui 演示窗口.
- 布尔/整数/浮点数/字符串和颜色可变引用, 用于保存有状态控件的数据.
- 插件信息/使用说明/README 和 CHANGELOG 的十种语言本地化.

******

### 使用示例

******

在插件中心启用自动挂载或显式加载插件, 然后创建浮动窗口:

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

可变控件会更新由 `imgui.bool`/`imgui.int`/`imgui.float`/`imgui.string` 和 `imgui.floats` 创建的引用对象. `width`/`height` 和 `fontSize` 使用与屏幕密度无关的单位. 拖动空白区域可移动窗口, 也可传入 `movable: false` 固定窗口.

******

### API 概览

******

小驼峰方法对应常用 Dear ImGui 操作, 熟悉原始命名的用户也可使用控件方法的 PascalCase 别名:

- 窗口生命周期: `createWindow`/`closeWindow`/`withWindow`/`withChild`/`withTabBar`/`withTabItem` 和 `withTreeNode`.
- 控件: `text`/`button`/`checkbox`/`radioButton`/`sliderFloat`/`sliderInt`/`dragFloat`/`dragInt`/`inputText`/`colorEdit3`/`colorEdit4`/`progressBar`/`combo` 和 `selectable`.
- 布局与状态: 光标方法/控件宽度方法/`sameLine`/`separator`/`spacing`/控件查询和捕获查询.
- 常量: `Cond`/`WindowFlags`/`InputTextFlags`/`SliderFlags`/`TreeNodeFlags`/`SelectableFlags`/`TabBarFlags`/`TabItemFlags` 和 `MouseButton`.

******

### 发行历史

******

# v1.0.0

###### 2026/08/29

* `新增` 全局 `imgui` 对象, 支持自动挂载和显式调用 `plugins.load`
* `新增` 由 Dear ImGui 1.92.9 渲染的透明浮动窗口, 支持配置尺寸/帧率/字体和空白区域拖动
* `新增` 即时模式窗口/布局/文本/输入/选择/颜色/进度/树形节点/标签页/主题和演示 API
* `新增` 布尔/整数/浮点数/字符串和颜色可变引用, 用于保存有状态控件的数据
* `新增` 插件信息/使用说明/README 和 CHANGELOG 的十种语言本地化
* `依赖` 附加 Common Plugin API, 用于插件发现元数据
* `依赖` 附加 Kotlin 标准库与 Parcelize 运行时版本 2.2.21
* `依赖` 附加 Apache Commons Compress 1.28.0 与 XZ for Java 1.10, 用于构建工具
* `依赖` 附加 JUnit 版本 4.13.2, 用于插件契约测试

##### 更多发行历史可参阅

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-zh-Hans.md)

******

### 构建

******

```powershell
.\gradlew.bat :app:assembleDebug
```

生成带 CRC32 摘要文件名的 Release 构建:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

构建参数来自 `version.properties`, 当前最低 SDK 为 24, 目标 SDK 为 36.

******

### 资源结构

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
```

`strings.xml` 提供插件描述本地化, `plugin_instruction.md` 提供宿主侧展示的插件使用说明. README 与 CHANGELOG 由 `.python/generate_markdown.py` 根据 JSON 源文件生成.

******

### 相关链接

******

- AutoJs6 项目: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui 官方项目: https://github.com/ocornut/imgui
