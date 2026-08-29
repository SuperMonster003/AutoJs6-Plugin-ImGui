Enable automatic mounting in Plugin Center or load the plugin explicitly:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
```

Create mutable references before opening the floating window:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui controls",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("Enabled", enabled);
            ui.sliderFloat("Level", level, 0, 1, "%.2f");
            if (ui.button("Close", 120, 0)) {
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

`width`, `height`, and `fontSize` use density-independent units. Drag a blank area to move the floating window. Pass `movable: false` to disable dragging. Use `fontPath` to load a readable TTF or OTF file when the system font does not cover the required characters.
