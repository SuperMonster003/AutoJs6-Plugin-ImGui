Active el montaje automático en el Centro de plugins o cargue el plugin de forma explícita:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
```

Cree referencias mutables antes de abrir la ventana flotante:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "Controles ImGui",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("Activado", enabled);
            ui.sliderFloat("Nivel", level, 0, 1, "%.2f");
            if (ui.button("Cerrar", 120, 0)) {
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

`width`, `height` y `fontSize` usan unidades independientes de la densidad. Arrastre un área vacía para mover la ventana. Use `movable: false` para desactivar el movimiento. Use `fontPath` para cargar un archivo TTF u OTF cuando la fuente del sistema no incluya los caracteres necesarios.
