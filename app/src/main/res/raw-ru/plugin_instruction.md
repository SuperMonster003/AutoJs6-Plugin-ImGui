Включите автоматическое подключение в центре плагинов или загрузите плагин явно:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
```

Создайте изменяемые ссылки перед открытием плавающего окна:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "Панель ImGui",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("Включено", enabled);
            ui.sliderFloat("Уровень", level, 0, 1, "%.2f");
            if (ui.button("Закрыть", 120, 0)) {
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

`width`, `height` и `fontSize` используют единицы без привязки к плотности экрана. Перетаскивайте пустую область для перемещения окна. Передайте `movable: false`, чтобы отключить перемещение. Используйте `fontPath` для загрузки файла TTF или OTF, если в системном шрифте нет нужных символов.
