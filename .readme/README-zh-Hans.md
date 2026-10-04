<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>使用 Dear ImGui 创建浮动用户界面</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-ImGui?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-ImGui?color=A24232&label=Issues"/></a>
    <a href="https://github.com/ocornut/imgui"><img alt="Dear ImGui" src="https://img.shields.io/badge/Dear%20ImGui-1.92.9-3D6CB4"/></a>
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

ImGui 插件将 [Dear ImGui](https://github.com/ocornut/imgui) 即时模式图形库带入 AutoJs6, 在透明浮动窗口中以 OpenGL ES 渲染控件, 适合为脚本编写调试面板/参数调节器/运行状态 HUD 等轻量浮动界面. 插件通过一套紧凑的 API 统一管理窗口创建/帧调度/触摸输入和原生资源清理.

兼容性最好的入口是 `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")`. AutoJs6 6.8 及以上版本也可在插件中心设置中按需启用自动挂载, 并将对象名设为 `imgui`; 仅在启用后, 脚本才可直接使用同名全局对象.

******

### 功能特性

******

- 自适应悬浮窗与 Activity 全屏会话, 支持自动点击穿透、收起/展开、独立悬浮按钮、透明度/防截屏控制、布局持久化与生命周期事件.
- `launchPrivileged` 通过 AutoJs6 已管理的 Shizuku/root 提供显式生产级 SurfaceFlinger 模式; 鉴权 Binder 将特权 Surface 交给现有完整渲染器, `/dev/input` 则提供观察式指针输入.
- 默认通过稳定的 `plugins.load` 入口加载, 无需预先配置宿主挂载; 也可启用 AutoJs6 自动挂载, 将同一 API 暴露为全局 `imgui` 对象.
- 透明浮动窗口: 尺寸/位置/帧率/字体可配置, 拖动空白区域移动窗口, 双指滑动与惯性滚动内容, 单指长按模拟右键.
- `inputText` 系列完整接入系统输入法, 支持中文拼音组合输入、自动唤起/收起软键盘与常用编辑键.
- 窗口/标签页/树形节点/表格/弹窗/菜单/工具提示与 60 余个即时控件, 含移动端风格 `toggle` 开关.
- 视觉与字体系统: 11 套 `Themes` 主题、批量样式、圆角/边框/阴影外观、多字体栈、CJK 兜底与 Material Icons 子集.
- 托管纹理支持文件路径、编码字节、Android `Bitmap` 与 AutoJs6 `Image`; `image` / `imageButton` 和三层 DrawList 可完成图片显示与浮窗自绘.
- 轻量 `imgui.ref(value)` / `{value: x}` 引用可用于全部有状态控件, 现有 Java 数组引用辅助方法保持完全兼容.
- 会话托管的 `logWindow`、堆叠 `toast`、Promise 对话框、阈值变色 `statsOverlay` 与可选择 CRUD `dataTable` 可直接组成调试界面.
- 常量枚举与 PascalCase 方法别名同 Dear ImGui 原生命名保持一致, 迁移零成本.
- 工程支持包含完整 TypeScript 声明、五个可运行示例、Android 渲染仪器测试、无锁输入队列、可验证的上游更新工具与 CI 发布自动化.
- 插件信息/使用说明/README 和 CHANGELOG 的十种语言本地化.

******

### 安装与启用

******

- 从 [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) 下载与设备架构匹配的 APK, 不确定架构时选择 `universal` 通用包.
- 安装 APK 后打开 AutoJs6, 在插件管理页面确认本插件已被识别并处于启用状态.
- 在脚本中调用 `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")` 加载插件, 再调用 `imgui.createWindow(...)`; 首次使用需授予 AutoJs6 悬浮窗权限.
- 使用 `launchPrivileged` 前请照常在 AutoJs6 内配置并授权 Root 或 Shizuku; 插件直接复用该宿主状态, 特权模式无需悬浮窗权限.

宿主版本要求: AutoJs6 版本号 (versionCode) 不低于 3853. 插件支持 `arm64-v8a` / `armeabi-v7a` / `x86_64` / `x86` 四种架构, 最低系统版本为 Android 7.0 (API 24), 且设备 GPU/驱动须支持 OpenGL ES 3.0.

******

### 快速开始

******

安装并启用插件后, 加载 API, 创建可变引用对象并打开浮动窗口:

```js
var imgui = plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
var enabled = imgui.ref(true);
var volume = imgui.ref(0.5);
var themeColor = imgui.ref([0.25, 0.55, 0.90]);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(overlay.width, overlay.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui Panel",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("Enabled", enabled);
            ui.sliderFloat("Volume", volume, 0, 1, "%.2f");
            ui.colorEdit3("Theme", themeColor);
            if (ui.button("Close", 120, 0)) {
                overlay.close();
            }
        }
    );
}, {
    width: 360,
    height: 240,
    fontSize: 16,
    theme: imgui.Themes.ModernDark,
    appearance: imgui.Appearance.Rounded,
    fps: 60
});
```

可变控件支持由 `imgui.ref(value)` 创建的轻量引用或普通 `{ value: ... }` 对象; 原有 `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` 辅助方法保持兼容. `inputText` 聚焦后会自动唤起系统输入法并支持中文组合输入; 可用 `ime: false` 关闭自动 IME. `width` / `height` 和 `fontSize` 使用与屏幕密度无关的单位. 拖动空白区域可移动窗口 (传入 `movable: false` 可固定); 双指纵向滑动支持惯性滚动 (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`), 单指长按模拟右键 (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). 如果系统字体无法覆盖所需字符, 可通过 `fontPath` 指定 TTF 或 OTF 字体文件.

主题与字体: `setTheme` 接受 `Themes` 的 11 套预设, `setStyleProperties` 可批量设置 `StyleVar`; `createWindow` 也可传入 `theme` / `appearance` / `style` / `shadow`. `fonts` 数组可预载 assets (`asset://...`) 或文件字体并以 `pushFont` / `withFont` 切换. 插件自动合并内置 CJK 兜底和图标子集, 可用 `Icons` / `icon(name)` 取得图标字形.

纹理与自绘: 请在窗口会话就绪后调用 `createTexture` (通常在渲染回调首次执行时创建). 返回对象包含 `width` / `height` 与幂等的 `dispose()` / `close()`; 会话关闭时会自动释放剩余纹理. `image` / `imageButton` 用于显示纹理, `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` 提供常用绘制原语. DrawList 坐标采用 Surface 像素坐标. 可直接传入 AutoJs6 `images.read(...)` 与截图得到的 `Image`.

窗口会话: 悬浮窗默认采用 `TouchMode.Auto`, ImGui 根窗口保持可交互, Surface 空白区域则直接触达下层应用; 也可用 `Touchable` 或 `Passthrough` 固定策略. 会话支持动态透明度/防截屏/触摸模式、收起为低帧率迷你悬浮球、创建独立可拖动 `addButtonEx`、跟随 `AlwaysAutoResize` 内容、通过 `iniPath` 持久化布局, 并以 `on` / `once` / `off` 或 options 回调订阅事件. `imgui.launch(...)` 会在当前前台 AutoJs6 Activity 中创建全屏 Surface, `launchFloaty(...)` 则显式选择悬浮窗. 每个脚本引擎仅拥有一个原生渲染会话, 但可在同一渲染回调中用 `begin` / `withWindow` 创建任意多个 ImGui 根窗口; 新建会话会关闭旧会话.

高层组件会挂接到当前会话并在用户渲染回调后绘制: `logWindow` 提供等级着色、清空、导出回调与自动滚底; `toast` 提供定时定位提示; `alert` / `confirm` / `singleChoice` / `multiChoice` 返回 Promise; `statsOverlay` 绘制帧耗时; `dataTable` 提供行选择与 CRUD. 五个内置示例 (`widget-overview`、`parameter-panel`、`log-hud`、`data-table-demo`、`theme-gallery`) 可通过 `listExamples` / `getExampleSource` 发现并用 `runExample` 启动. AutoJs6 6.8 插件中心尚未消费通用示例元数据, 在宿主支持前可直接运行下方调用:

```js
imgui.runExample("widget-overview");
```

******

### API 总览

******

小驼峰方法对应同名 Dear ImGui 操作, 熟悉原生命名的用户也可使用 PascalCase 别名 (如 `ui.Button` 等价于 `ui.button`):

- 会话运行时: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, 以及会话级 `on` / `once` / `off` 与对应实例方法.
- 后端探测: `getBackendCapabilities` / `BackendStatus` 报告窗口、split-touch、特权进程、direct input、Docking 与 Multi-Viewport 的可用性和生产就绪状态, 不执行提权操作.
- 会话与窗口: `createWindow` / `closeWindow` / `withWindow` / `withChild` / `setNextWindowPos` / `setNextWindowSize` / `setNextWindowBgAlpha` 以及 `isWindowHovered` 等窗口状态查询.
- 文本与控件: `text` / `textColored` / `textWrapped` / `separatorText` / `bulletText` / `labelText` / `button` / `arrowButton` / `invisibleButton` / `checkbox` / `toggle` / `radioButton` / `sliderFloat` / `sliderInt` / `vSliderFloat` / `dragFloat` / `dragInt` / `inputText` / `inputInt` / `inputFloat` / `inputTextMultiline` / `colorEdit3` / `colorEdit4` / `colorPicker4` / `colorButton` / `progressBar` / `plotLines` / `plotHistogram` 等.
- 容器与导航: `withTabBar` / `withTabItem` / `withTreeNode` / `treeNodeEx` / `collapsingHeader` / `withTable` 表格族 / `withListBox` / `withCombo` / `selectable`.
- 弹窗与菜单: `openPopup` / `withPopup` / `withPopupModal` / `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` / `closeCurrentPopup` / `withMenuBar` / `withMenu` / `menuItem` / `setTooltip` / `setItemTooltip` / `withItemTooltip`.
- 样式与布局: `styleColorsDark` / `styleColorsLight` / `styleColorsClassic` / `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` / `withGroup` / `withDisabled` / `withId` / `indent` / `sameLine` / `separator` / `spacing` / 光标与滚动控制族.
- 纹理与自绘: `createTexture` / `destroyTexture` / `image` / `imageButton` / `colorU32`, 以及带线段/矩形/圆形/三角形/文本/折线/贝塞尔曲线/图像原语的 `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList`.
- 查询与输入: `isItemClicked` / `isItemHovered` / `isItemActive` / `isItemEdited` / `isMouseDown` / `getMousePos` / `calcTextSize` / `framerate` 等状态查询, `setKeyboardFocusHere` 主动聚焦, 以及 `addInputCharacters` / `sendKey` / `addMouseWheel` / `wantTextInput` 输入原语. `InputTextFlags` 当前公开的全部标志都会实际透传至 Dear ImGui; 依赖回调的标志未公开, `WordWrap` 仅用于多行输入.
- 高层组件与示例: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, 以及 `listExamples` / `getExampleSource` / `runExample`; 每个会话也提供同名工厂.
- 可变引用: 轻量 `imgui.ref` (或普通 `{value: x}` 对象), 以及兼容的 Java 数组辅助方法 `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.strings`.
- 常量: `BackendStatus` / `Cond` / `WindowFlags` / `ChildFlags` / `InputTextFlags` / `SliderFlags` / `TreeNodeFlags` / `SelectableFlags` / `TabBarFlags` / `TabItemFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `Col` / `StyleVar` / `Themes` / `Appearance` / `Fonts` / `Icons` / `Dir` / `Key` / `MouseButton` / `ButtonFlags` / `TextureFlags` / `DrawListLayer` / `DrawFlags` / `LogLevel` / `ToastPosition` / `Limits`, 取值与 Dear ImGui 同名枚举或插件常量表一一对应.

******

### 已知限制

******

- 同一脚本引擎同一时刻仅支持一个原生渲染会话; 多面板场景应在该会话内创建多个 ImGui 根窗口. 新建悬浮窗或 Activity 会话会关闭旧会话.
- `imgui.launch` 需要当前存在处于 resumed 状态的 AutoJs6 Activity; 脚本需要脱离前台 Activity 持续渲染时请使用 `launchFloaty`.
- v1.9 特权模式固定全屏且仅支持指针: 暂无 IME/按键、宿主层透明度/防截屏、收起、独立 Android 按钮或动态旋转重建. Direct input 不使用 `EVIOCGRAB`, OEM SurfaceControl/SELinux 策略仍可能拒绝启动; 能力探测不会执行 `su` 或请求 Shizuku 授权.

******

### 发行历史

******

#### v1.9.4

###### 2026/10/04

* `优化` 插件中心图标采用统一工作台调整后的尺寸, 位置, 亮暗图稿与圆形底色, 保留可重建原稿和参数

#### v1.9.3

###### 2026/09/19

* `修复` AGP 9.1 构建时的 SDK XML v4 解析警告, 以及 JVM 单元测试误触发 APK 原生库对齐检查的问题 (共享构建插件 1.8.3)
* `优化` compileSdk/targetSdk 升级至 37 (Android 17)

#### v1.9.2

###### 2026/09/13

* `修复` 插件中心显示的版本及 ABI 信息与实际安装包不一致的问题
* `修复` 版本日期受构建环境语言影响, 未统一使用英文格式的问题
* `优化` 发布前校验 APK 版本, 签名及变体完整性

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

校验原生源码清单/JNI 声明一致性/单元测试与 ABI 分包完整性:

```powershell
.\gradlew.bat :app:verifyImGuiDebugApks
```

构建参数来自 `version.properties`, 当前最低 SDK 为 24, 目标 SDK 为 36.

******

### 项目结构

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/assets/plugin/index.js
app/src/main/assets/examples/widget-overview.js
app/src/main/cpp/ImGuiBridge.cpp
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
Roadmap.md
```

`index.js` 是脚本引擎侧的 `imgui` 模块, `ImGuiBridge.cpp` 是 Dear ImGui 的 JNI 桥. `strings.xml` 提供插件描述本地化, `plugin_instruction.md` 提供宿主侧展示的插件使用说明. README 与 CHANGELOG 由 `.python/generate_markdown.py` 根据 JSON 源文件生成, 修改文档时请编辑 JSON 源文件而非生成产物.

******

### 相关链接

******

- AutoJs6 项目: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui 官方项目: https://github.com/ocornut/imgui
- 能力扩展路线图 (Roadmap): https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)
