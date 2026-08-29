플러그인 센터에서 자동 마운트를 활성화하거나 플러그인을 명시적으로 불러옵니다:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
```

플로팅 창을 열기 전에 변경 가능한 참조를 만듭니다:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui 컨트롤",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("활성화", enabled);
            ui.sliderFloat("수준", level, 0, 1, "%.2f");
            if (ui.button("닫기", 120, 0)) {
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

`width`, `height`, `fontSize`는 화면 밀도와 무관한 단위를 사용합니다. 빈 영역을 드래그하면 창을 이동할 수 있습니다. `movable: false`를 전달하면 이동을 비활성화합니다. 시스템 글꼴에 필요한 문자가 없으면 `fontPath`로 TTF 또는 OTF 파일을 불러옵니다.
