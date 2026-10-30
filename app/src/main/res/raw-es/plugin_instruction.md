Una vez habilitado el plugin en el Centro de plugins, use directamente el objeto global `imgui` (requiere AutoJs6 6.8.0 o posterior); no es necesario llamar a `plugins.load`.

Cree referencias mutables antes de abrir la ventana flotante:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(ui.dp(window.width), ui.dp(window.height), ui.Cond.Always);
    ui.withWindow(
        "Controles ImGui",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("Activado", enabled);
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
    theme: imgui.Themes.ModernDark,
    appearance: imgui.Appearance.Rounded,
    fps: 60
});
```

Los tamaños y posiciones de la ventana (`width`, `height`, `x`, `y`, campos y eventos de la sesión) y `fontSize` están en dp; las coordenadas dentro de un fotograma están en px, conviértalas con `ui.dp()` / `ui.px()`. Las devoluciones de llamada de eventos y botones se ejecutan en el hilo del script. Al enfocar `inputText` se abre automáticamente el IME del sistema con composición. Arrastre un área vacía para mover la ventana; el deslizamiento vertical con dos dedos tiene inercia y una pulsación larga con uno emite un clic derecho. Pase `movable: false` para desactivar el arrastre. Use `fontPath` para cargar un archivo TTF u OTF legible cuando la fuente del sistema no cubra los caracteres necesarios.

Use `Themes` / `setTheme`, `setStyleProperties` y `Appearance` como ajustes visuales. `createWindow.fonts` precarga fuentes de assets o archivos para `pushFont` / `withFont`; el respaldo CJK y los iconos Material se fusionan automáticamente y están disponibles mediante `Icons` / `icon(name)`.

`createTexture` acepta una ruta, bytes codificados, un `Bitmap` de Android o una `Image` de AutoJs6 obtenida con `images.read` o una captura de pantalla. Use `image` / `imageButton` para mostrarla y llame a `dispose()` cuando ya no la necesite; la sesión libera automáticamente las texturas restantes. `getWindowDrawList`, `getForegroundDrawList` y `getBackgroundDrawList` ofrecen primitivas de líneas, formas, texto e imagen en coordenadas de píxeles del Surface.

Las superposiciones usan `TouchMode.Auto` por defecto: las ventanas ImGui siguen siendo interactivas y las zonas vacías dejan pasar los toques. La sesión puede cambiar tacto, opacidad y seguridad, reducirse a una miniburbuja de pocos FPS, crear `addButtonEx`, guardar el diseño con `iniPath` y publicar eventos. `imgui.launch(...)` usa un Surface de pantalla completa en la Activity AutoJs6 actualmente reanudada. Una sesión nativa puede contener varias raíces `begin` / `withWindow`; una sesión nueva cierra la anterior.

`setMoreTouch(true)` activa split-touch de Android para la ventana principal y los botones independientes. `launchPrivileged(callback, {backend: "auto"})` selecciona explícitamente el modo SurfaceFlinger de producción, reutiliza la autorización Shizuku/root de AutoJs6 y no requiere permiso de superposición; `/dev/input` solo observa y nunca captura en exclusiva la pantalla táctil. `getBackendCapabilities()` informa el estado del host sin elevar privilegios.

`session.capture({region})` devuelve la ventana como `Image` para `images.save`; la región está en dp, y una ventana privilegiada solo se puede capturar entre dos fotogramas. `createWindow({systemCjkFont: true})` deja que el sistema dibuje los caracteres CJK que faltan en la fuente integrada, y `pinchZoom: true` permite cambiar la escala de la fuente con dos dedos (`session.fontScale`, `session.setFontScale`). En modo privilegiado, un campo de texto abre un cuadro de entrada temporal de AutoJs6, que requiere el permiso de superposición.

Hay disponibles tablas, ventanas contextuales, menús, tooltips, pilas de estilo y más de 60 controles; `withTable`, `withPopupModal`, `withContextItem` y `withMenuBar` emparejan de forma segura las llamadas begin/end. Consulte el README y el Roadmap del proyecto para ver el resumen completo de la API.

Los controles con estado también aceptan referencias ligeras de `imgui.ref(value)` u objetos `{ value: ... }`; los ayudantes anteriores `bool`, `float`, `int`, `string` y de matrices de color siguen siendo compatibles. Los componentes `logWindow`, `toast`, diálogos Promise, `statsOverlay` y `dataTable` administrados por la sesión se dibujan después del callback del usuario y se cierran automáticamente con ella.

Ejecute cualquiera de los siete ejemplos con `imgui.runExample("widget-overview")`, `"parameter-panel"`, `"log-hud"`, `"data-table-demo"`, `"theme-gallery"`, `"error-handling"` o `"background-task"`; descúbralos mediante `listExamples` y consulte su código con `getExampleSource`. El Centro de plugins de AutoJs6 6.8 todavía no muestra una acción genérica para ejecutar un ejemplo con un clic.

La versión 1.7 también publica declaraciones completas para el editor en `types/imgui.d.ts`. Los límites están en `imgui.Limits` (64 KiB de texto, 512 elementos de selección y 2.048 eventos en cola); la API rechaza la entrada fuera del límite sin truncarla silenciosamente.
