在插件中心启用自动挂载, 或显式加载插件:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
```

在打开浮动窗口前创建可变引用对象:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui 控制面板",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("启用", enabled);
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
    fps: 60
});
```

`width`, `height` 和 `fontSize` 使用与屏幕密度无关的单位. 拖动空白区域可以移动浮动窗口. 传入 `movable: false` 可禁用拖动. 如果系统字体无法显示所需字符, 可通过 `fontPath` 加载 TTF 或 OTF 字体文件.
