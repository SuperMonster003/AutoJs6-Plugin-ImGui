プラグインセンターで自動マウントを有効にするか, プラグインを明示的に読み込みます:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
```

フローティングウィンドウを開く前に可変参照を作成します:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui コントロール",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("有効", enabled);
            ui.sliderFloat("レベル", level, 0, 1, "%.2f");
            if (ui.button("閉じる", 120, 0)) {
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

`width`, `height`, `fontSize` は画面密度に依存しない単位です. 空白領域をドラッグするとウィンドウを移動できます. `movable: false` で移動を無効にできます. システムフォントに必要な文字がない場合は `fontPath` で TTF または OTF ファイルを読み込みます.
