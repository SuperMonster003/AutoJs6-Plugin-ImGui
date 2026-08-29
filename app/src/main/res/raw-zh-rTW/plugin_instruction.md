在外掛中心啟用自動掛載, 或明確載入外掛:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
```

在開啟浮動視窗前建立可變參照物件:

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
            ui.checkbox("啟用", enabled);
            ui.sliderFloat("數值", level, 0, 1, "%.2f");
            if (ui.button("關閉", 120, 0)) {
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

`width`, `height` 和 `fontSize` 使用與螢幕密度無關的單位. 拖曳空白區域即可移動浮動視窗. 傳入 `movable: false` 可停用拖曳. 如果系統字型無法顯示所需字元, 可透過 `fontPath` 載入 TTF 或 OTF 字型檔案.
