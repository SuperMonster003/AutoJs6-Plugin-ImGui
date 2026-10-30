在插件中心启用插件后直接使用全局对象 `imgui` (需要 AutoJs6 6.8.0 及以上版本), 不需要调用 `plugins.load`.

在打开浮动窗口前创建可变引用对象:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(ui.dp(window.width), ui.dp(window.height), ui.Cond.Always);
    ui.withWindow(
        "ImGui 控制面板",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("启用", enabled);
            ui.sliderFloat("数值", level, 0, 1, "%.2f");
            if (ui.button("关闭", 120, 0)) {
                window.close();
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

窗口尺寸与位置 (`width`, `height`, `x`, `y`, 会话字段与事件) 以及 `fontSize` 使用 dp; 帧内坐标是 px, 用 `ui.dp()` / `ui.px()` 换算. 事件与按钮回调在脚本线程执行. 聚焦 `inputText` 会自动唤起支持组合文本的系统输入法. 拖动空白区域可以移动浮动窗口; 双指纵向滑动带惯性滚动, 单指长按模拟右键. 传入 `movable: false` 可禁用拖动. 如果系统字体无法显示所需字符, 可通过 `fontPath` 加载 TTF 或 OTF 字体文件.

可用 `Themes` / `setTheme`、`setStyleProperties` 与 `Appearance` 快速配置视觉效果. `createWindow.fonts` 可预载 assets 或文件字体供 `pushFont` / `withFont` 切换; 内置 CJK 兜底和 Material 图标子集会自动合并, 图标可由 `Icons` / `icon(name)` 取得.

`createTexture` 支持路径、编码字节、Android `Bitmap`, 以及来自 `images.read` 或截图的 AutoJs6 `Image`. 用 `image` / `imageButton` 显示纹理, 不再使用时调用 `dispose()`; 会话会自动释放剩余纹理. `getWindowDrawList`、`getForegroundDrawList` 与 `getBackgroundDrawList` 提供线条、图形、文字和图像原语, 坐标采用 Surface 像素.

悬浮窗会话默认使用 `TouchMode.Auto`, 保持 ImGui 窗口可交互并让空白区域点击穿透. 会话可动态切换触摸/透明度/防截屏, 收起为低帧率迷你悬浮球, 创建独立 `addButtonEx`, 通过 `iniPath` 保存布局并发布生命周期事件. `imgui.launch(...)` 可在当前前台 AutoJs6 Activity 中使用全屏 Surface. 一个原生会话可包含多个 `begin` / `withWindow` 根窗口; 新建会话会关闭旧会话.

`setMoreTouch(true)` 可为主窗口和独立按钮启用 Android split-touch. `launchPrivileged(callback, {backend: "auto"})` 显式选择生产级 SurfaceFlinger 模式, 复用 AutoJs6 现有 Shizuku/root 授权且无需悬浮窗权限; `/dev/input` 仅作观察且不会独占触摸屏. `getBackendCapabilities()` 可在不提权的情况下报告宿主状态.

`session.capture({region})` 把窗口返回为 `Image`, 可交给 `images.save`; region 的单位是 dp, 特权模式的窗口只能在两帧之间截取. `createWindow({systemCjkFont: true})` 让系统绘制内置字体之外的 CJK 字符, `pinchZoom: true` 让双指捏合调整字体缩放 (`session.fontScale`, `session.setFontScale`). 特权模式下文本框会打开 AutoJs6 的临时输入框, 需要悬浮窗权限.

插件提供表格/上下文弹窗/菜单/工具提示/样式栈与 60 余个控件, `withTable`, `withPopupModal`, `withContextItem`, `withMenuBar` 等辅助方法可安全配对 begin/end 调用. 完整 API 概览可参阅项目 README 与 Roadmap.

有状态控件还支持 `imgui.ref(value)` 轻量引用或普通 `{ value: ... }` 对象; 原有 `bool`、`float`、`int`、`string` 与颜色数组辅助方法保持兼容. 会话托管的 `logWindow`、`toast`、Promise 对话框、`statsOverlay` 和 `dataTable` 会在用户回调之后渲染, 并随会话自动关闭.

可用 `imgui.runExample("widget-overview")`, `"parameter-panel"`, `"log-hud"`, `"data-table-demo"`, `"theme-gallery"`, `"error-handling"` 或 `"background-task"` 运行七个内置示例, 通过 `listExamples` 发现示例, 通过 `getExampleSource` 查看源码. AutoJs6 6.8 插件中心目前尚未提供通用的一键运行示例操作.

v1.7 还在 `types/imgui.d.ts` 发布了完整编辑器声明. 运行期安全上限可通过 `imgui.Limits` 查询 (文本输入 64 KiB、选择项 512 个、输入事件队列 2,048 条); API 会明确拒绝超限输入, 不再静默截断.
