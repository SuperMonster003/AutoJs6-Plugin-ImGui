<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Crea interfaces de usuario flotantes con Dear ImGui</p>

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

### Idiomas (Languages)

******

El archivo README.md actual admite los siguientes idiomas:

- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-en.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-fr.md)
- Español [es] # actual
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ru.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ar.md)

******

### Introducción

******

El plugin ImGui lleva la biblioteca de interfaz gráfica de modo inmediato [Dear ImGui](https://github.com/ocornut/imgui) a AutoJs6 y renderiza los controles con OpenGL ES dentro de una ventana flotante transparente. Encaja de forma natural en interfaces flotantes ligeras como paneles de depuración, ajustadores de parámetros y HUD de tiempo de ejecución, y reúne la creación de ventanas, la planificación de fotogramas, la entrada táctil y la limpieza de recursos nativos en una API compacta.

Una vez habilitado el plugin en el Centro de plugins, los scripts usan directamente el objeto global `imgui` (registrado por AutoJs6, que carga el plugin en la primera llamada a uno de sus miembros); no se necesita `plugins.load`. Requiere AutoJs6 6.8.0 o posterior. Cuando el plugin es más reciente que AutoJs6, los miembros que AutoJs6 aún no registra aparecen en `imgui` solo después de cargar el plugin (al usar por primera vez cualquier miembro de `imgui`); el argumento `ui` de los callbacks de renderizado siempre está completo.

******

### Funciones

******

- Sesiones adaptables superpuestas y Activity de pantalla completa con paso táctil automático, contraer/expandir, botones flotantes independientes, opacidad/seguridad, diseño persistente y eventos de ciclo de vida.
- `launchPrivileged` ofrece un modo SurfaceFlinger de producción explícito mediante Shizuku/root gestionado por AutoJs6; Binder autenticado entrega la Surface privilegiada al renderizador completo existente y `/dev/input` aporta entrada de puntero observada.
- AutoJs6 registra el plugin directamente como objeto global `imgui`, por lo que no hace falta ningún paso de carga tras habilitarlo, igual que en los plugins oficiales pinyin / mediainfo.
- Ventanas flotantes transparentes con tamaño, posición, frecuencia de fotogramas y fuente configurables; arrastre un área vacía para mover la ventana, use desplazamiento inercial con dos dedos y mantenga pulsado con uno para hacer clic derecho.
- La familia `inputText` está completamente conectada al IME del sistema, incluido el texto en composición, la visibilidad automática del teclado virtual y las teclas de edición habituales.
- Ventanas, pestañas, nodos de árbol, tablas, ventanas emergentes, menús, tooltips y más de 60 controles de modo inmediato, incluido un interruptor `toggle` de estilo móvil.
- Sistema visual y tipográfico con 11 `Themes`, estilos por lotes, apariencias redondeadas/con borde/sombra, pila multifuente, respaldo CJK y subconjunto Material Icons.
- Las texturas administradas aceptan rutas de archivo, bytes codificados, `Bitmap` de Android y objetos `Image` de AutoJs6; `image` / `imageButton` y tres capas DrawList cubren la visualización de imágenes y el dibujo personalizado.
- Las referencias ligeras `imgui.ref(value)` / `{value: x}` funcionan con todos los controles con estado y los helpers de arrays Java existentes siguen siendo totalmente compatibles.
- Los componentes de sesión `logWindow`, `toast` apilados, diálogos Promise, `statsOverlay` con umbrales y `dataTable` CRUD seleccionable ofrecen interfaces de depuración listas para usar.
- Las API comunes y las enumeraciones de constantes tienen alias en PascalCase (p. ej., `ui.Button`) que conservan el estilo de argumentos del plugin; la lista de alias y las diferencias con las firmas C++ originales están en [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md).
- El soporte de ingeniería incluye declaraciones TypeScript completas, siete ejemplos ejecutables, pruebas Android de renderizado, cola de entrada sin bloqueo, actualización upstream verificable y automatización CI de versiones.
- Metadatos del plugin, instrucciones de uso, README y CHANGELOG localizados en diez idiomas.

******

### Instalación

******

- Descargue desde [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) el APK que corresponda a la arquitectura de su dispositivo; si tiene dudas, elija el paquete `universal`.
- Instale el APK, abra AutoJs6 y confirme en la página de gestión de plugins que este plugin está reconocido y habilitado.
- Llame directamente a `imgui.createWindow(...)` en el script; conceda a AutoJs6 el permiso de superposición (ventana flotante) en el primer uso.
- Antes de `launchPrivileged`, configure y autorice Root o Shizuku normalmente en AutoJs6. El plugin reutiliza ese estado del host y el modo privilegiado no necesita permiso de superposición.

Requisito del host: AutoJs6 con versionCode 5935 o posterior. El plugin incluye binarios `arm64-v8a` / `armeabi-v7a` / `x86_64` / `x86` y requiere Android 7.0 (API 24) o posterior además de una GPU/controlador compatible con OpenGL ES 3.0.

******

### Inicio rápido

******

Con el plugin instalado y habilitado, cree referencias mutables y abra una ventana flotante:

```js
var enabled = imgui.ref(true);
var volume = imgui.ref(0.5);
var themeColor = imgui.ref([0.25, 0.55, 0.90]);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(ui.dp(overlay.width), ui.dp(overlay.height), ui.Cond.Always);
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

Los controles mutables aceptan referencias ligeras creadas con `imgui.ref(value)` u objetos `{ value: ... }`; los ayudantes anteriores `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` siguen siendo compatibles. Al enfocar `inputText` se abre automáticamente el IME del sistema con composición; pase `ime: false` para desactivarlo. Los tamaños y posiciones de la ventana están en dp: las opciones `width`, `height`, `x` e `y`, los campos de la sesión y los datos de los eventos; `fontSize` también está en dp. Las coordenadas dentro de un fotograma están en px; conviértalas con `ui.dp()` / `ui.px()`. Las devoluciones de llamada de eventos y botones se ejecutan en el hilo del script (consulte [THREADING.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/THREADING.md)), y [MIGRATION-1.12.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/MIGRATION-1.12.md) enumera los cambios respecto a versiones anteriores. Arrastre un área vacía para mover la ventana (`movable: false` la fija); el deslizamiento vertical con dos dedos tiene inercia configurable (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`) y una pulsación larga con un dedo emite un clic derecho (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). Cuando la fuente del sistema no cubra los caracteres necesarios, apunte `fontPath` a un archivo de fuente TTF u OTF.

Temas y fuentes: `setTheme` acepta los 11 valores de `Themes` y `setStyleProperties` actualiza varios `StyleVar`; `createWindow` también admite `theme`, `appearance`, `style` y `shadow`. El arreglo `fonts` precarga fuentes de assets (`asset://...`) o archivos para `pushFont` / `withFont`. El respaldo CJK y los iconos se fusionan automáticamente; use `Icons` / `icon(name)` para obtener glifos de iconos.

Texturas y dibujo personalizado: llame a `createTexture` solo cuando la sesión de ventana esté lista (normalmente la primera vez dentro de su callback de renderizado). El objeto devuelto expone `width`, `height` y `dispose()` / `close()` idempotentes; las texturas restantes se liberan automáticamente al cerrar la sesión. `image` / `imageButton` muestran texturas, mientras que `getWindowDrawList`, `getForegroundDrawList` y `getBackgroundDrawList` ofrecen primitivas habituales. Las coordenadas DrawList son píxeles del Surface. Se pueden pasar directamente valores `Image` de AutoJs6 obtenidos mediante `images.read(...)` o capturas de pantalla.

Sesiones de ventana: las superposiciones usan `TouchMode.Auto` por defecto, manteniendo interactivas las raíces ImGui y pasando las zonas vacías del Surface a la aplicación inferior; elija `Touchable` o `Passthrough` para una política fija. Una sesión puede cambiar opacidad/seguridad/modo táctil, reducirse a una miniburbuja de pocos FPS, crear `addButtonEx` arrastrables, seguir contenido `AlwaysAutoResize`, guardar el diseño con `iniPath` y emitir eventos mediante `on` / `once` / `off` o callbacks de opciones. `imgui.launch(...)` crea un Surface de pantalla completa en la Activity AutoJs6 actualmente reanudada y `launchFloaty(...)` selecciona explícitamente una superposición. Cada motor de scripts tiene una sesión de renderizado nativa, pero su callback puede crear todas las raíces ImGui `begin` / `withWindow` necesarias; una sesión nueva cierra la anterior. Una excepción del callback de renderizado o de un callback de evento se imprime con su pila mediante `console.error` (una sola vez para una racha del mismo error) y se emite como evento `error` (`error` / `phase` / `frame`); sin un listener de `error`, un error de renderizado cierra la sesión (`closeReason` es `render-error`), y con uno se omite el resto del fotograma y el renderizado continúa. La opción `debug: true` informa con `console.warn` y logcat de errores de uso como un `begin` sin `end`, y muestra las ventanas Metrics y Debug Log. Los métodos globales como `setTouchable` / `setGlobalAlpha` / `getComponent` actúan sobre la sesión actual y lanzan `imgui.<name>: no active session` si no hay ninguna activa.

Los componentes de alto nivel se adjuntan a la sesión activa y se dibujan después del callback del usuario: `logWindow` ofrece niveles con color, limpieza, exportación y desplazamiento automático; `toast` muestra avisos temporizados; `alert` / `confirm` / `singleChoice` / `multiChoice` resuelven Promises; `statsOverlay` grafica el tiempo de cuadro; y `dataTable` ofrece selección y CRUD. Los siete ejemplos (`widget-overview`, `parameter-panel`, `log-hud`, `data-table-demo`, `theme-gallery`, `error-handling` y `background-task`) se descubren con `listExamples` / `getExampleSource` y se ejecutan con `runExample`. AutoJs6 6.8 aún no consume los metadatos genéricos de ejemplos en su centro de plugins; hasta que el host lo admita, ejecute directamente la llamada siguiente:

```js
imgui.runExample("widget-overview");
```

******

### Resumen de la API

******

Las API comunes también tienen alias en PascalCase (p. ej., `ui.Button` equivale a `ui.button`). Los alias mantienen el estilo de argumentos del plugin (valores mutables con `imgui.ref`, etc.) y no corresponden uno a uno con las firmas C++ originales; la lista y las diferencias están en [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md). Los métodos en lower camel case reflejan las operaciones de Dear ImGui del mismo nombre y se agrupan así:

- Ejecución de sesión: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, conversión de unidades `density` / `dp` / `px`, `on` / `once` / `off` junto con sus formas por sesión, el evento de sesión `error` que informa de los errores de los callbacks y la opción `debug` que activa el modo de depuración.
- Detección del backend: `getBackendCapabilities` / `BackendStatus` informa de la disponibilidad y preparación para producción de las ventanas, el toque dividido, el proceso privilegiado, la entrada directa, Docking y Multi-Viewport, sin elevar privilegios.
- Sesión y ventanas: `createWindow` / `closeWindow` / `withWindow` / `withChild` / `setNextWindowPos` / `setNextWindowSize` / `setNextWindowBgAlpha`, además de consultas de estado de ventana como `isWindowHovered`.
- Texto y controles: `text` / `textColored` / `textWrapped` / `separatorText` / `bulletText` / `labelText` / `button` / `arrowButton` / `invisibleButton` / `checkbox` / `toggle` / `radioButton` / `sliderFloat` / `sliderInt` / `vSliderFloat` / `dragFloat` / `dragInt` / `inputText` / `inputInt` / `inputFloat` / `inputTextMultiline` / `colorEdit3` / `colorEdit4` / `colorPicker4` / `colorButton` / `progressBar` / `plotLines` / `plotHistogram`, entre otros.
- Contenedores y navegación: `withTabBar` / `withTabItem` / `withTreeNode` / `treeNodeEx` / `collapsingHeader` / la familia de tablas `withTable` / `withListBox` / `withCombo` / `selectable`.
- Ventanas emergentes y menús: `openPopup` / `withPopup` / `withPopupModal` / `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` / `closeCurrentPopup` / `withMenuBar` / `withMenu` / `menuItem` / `setTooltip` / `setItemTooltip` / `withItemTooltip`.
- Estilo y diseño: `styleColorsDark` / `styleColorsLight` / `styleColorsClassic` / `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` / `withGroup` / `withDisabled` / `withId` / `indent` / `sameLine` / `separator` / `spacing`, además de las familias de cursor y desplazamiento.
- Texturas y dibujo: `createTexture` / `destroyTexture` / `image` / `imageButton` / `colorU32`, además de `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` con primitivas de línea, rectángulo, círculo, triángulo, texto, polilínea, Bézier e imagen.
- Consultas y entrada: consultas de estado como `isItemClicked` / `isItemHovered` / `isItemActive` / `isItemEdited` / `isMouseDown` / `getMousePos` / `calcTextSize` / `framerate`, enfoque activo con `setKeyboardFocusHere` y primitivas `addInputCharacters` / `sendKey` / `addMouseWheel` / `wantTextInput`. Todos los valores de `InputTextFlags` expuestos se pasan a Dear ImGui; se omiten los que dependen de callbacks y `WordWrap` solo se aplica a la entrada multilínea.
- Componentes de alto nivel y ejemplos: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, además de `listExamples` / `getExampleSource` / `runExample`; cada sesión ofrece las mismas fábricas.
- Referencias mutables: `imgui.ref` ligero (o un objeto `{value: x}`), además de los helpers compatibles de arrays Java `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.strings`.
- Constantes: `BackendStatus` / `Cond` / `WindowFlags` / `ChildFlags` / `InputTextFlags` / `SliderFlags` / `TreeNodeFlags` / `SelectableFlags` / `TabBarFlags` / `TabItemFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `Col` / `StyleVar` / `Themes` / `Appearance` / `Fonts` / `Icons` / `Dir` / `Key` / `MouseButton` / `ButtonFlags` / `TextureFlags` / `DrawListLayer` / `DrawFlags` / `LogLevel` / `ToastPosition` / `Limits`, que coinciden con las enumeraciones de Dear ImGui o tablas del plugin del mismo nombre.

******

### Limitaciones conocidas

******

- Cada motor de scripts admite una sola sesión de renderizado nativa; cree varias ventanas raíz ImGui en esa sesión si necesita varios paneles. Una nueva sesión superpuesta o Activity cierra la anterior.
- `imgui.launch` requiere una Activity AutoJs6 actualmente en estado resumed; use `launchFloaty` si el script debe seguir renderizando sin una Activity anfitriona en primer plano.
- En v1.9 el modo privilegiado es fijo a pantalla completa y solo admite puntero: no incluye IME/teclas, alfa/seguridad de capa, reducción, botones Android auxiliares ni reconstrucción dinámica al rotar. La entrada directa no usa `EVIOCGRAB` y las políticas OEM SurfaceControl/SELinux aún pueden impedir el inicio; el sondeo no ejecuta `su` ni solicita Shizuku.

******

### Historial de versiones

******

#### v1.12.0

###### 2026/10/29

* `Aviso` Cambio incompatible: las posiciones y tamaños de la ventana están ahora en dp en todas partes. Antes estaban en px los x / y de createWindow, los x / y / width / height / displayWidth / displayHeight de Session, setPosition / setSize, los datos de los eventos y los x / y de los botones flotantes; las coordenadas dentro de un fotograma siguen en px. Cómo actualizar los scripts se explica en docs/MIGRATION-1.12.md
* `Aviso` Cambio incompatible: un argumento incorrecto (tipo erróneo, NaN, número como cadena o valor fuera de rango) ahora lanza TypeError o RangeError con el nombre del método y del argumento, por ejemplo `imgui.sliderFloat: argument "max" must be a finite number`, en lugar de convertirse o limitarse en silencio; las opciones de ventana como fps, alpha y fontSize se comprueban igual
* `Aviso` Cambio incompatible: los campos de Session y de los botones flotantes son de solo lectura (asignar uno lanza una excepción en modo estricto); use los métodos set. FloatingButton.setPosition ya no acepta el argumento source, y un número como color de un botón flotante se interpreta como cualquier otro color de imgui (0xAABBGGRR, como devuelve colorU32) y no como un color ARGB de Android
* `Aviso` Cambio incompatible: los eventos de sesión, las devoluciones de llamada de los botones flotantes y los resultados de los diálogos se ejecutan en el hilo del script, donde se ejecuta la función de renderizado, y no en el hilo de interfaz de Android; consulte docs/THREADING.md
* `Función` imgui.dp() / imgui.px() (alias Dp / Px) convierten entre dp y px, e imgui.density da el número de px por dp
* `Función` Los colores aceptan en todas partes un número empaquetado, [r, g, b, a], {r, g, b, a} o "#rrggbbaa", incluidos textColored / pushStyleColor / setStyleColor / colorButton / tableSetBgColor; los argumentos r, g, b, a por separado siguen funcionando
* `Función` Ejemplo background-task: un hilo de trabajo realiza una tarea lenta mientras la ventana sigue dibujándose, con progreso y cancelación
* `Función` docs/THREADING.md explica en qué hilo se ejecuta cada devolución de llamada y cómo hacer trabajo lento en segundo plano, y docs/MIGRATION-1.12.md enumera los cambios en los scripts necesarios para esta versión
* `Corrección` Las devoluciones de llamada de eventos y de botones flotantes podían ejecutarse a la vez que la función de renderizado, y llamar a sleep en ellas producía un error
* `Corrección` Session.theme no cambiaba después de imgui.setTheme
* `Corrección` Al arrastrar la ventana, el evento moved informaba la fuente api en lugar de drag
* `Mejora` Los ejemplos usan ui.dp() en lugar de multiplicar por window.density
* `Mejora` Las declaraciones TypeScript indican la unidad y el rango permitido de cada tamaño, posición y opción, y marcan como readonly los campos de Session y de los botones flotantes
* `Mejora` Cada versión de GitHub incluye un archivo SHA256SUMS para comprobar los APK descargados

#### v1.11.0

###### 2026/10/29

* `Aviso` Los métodos globales que actúan sobre la sesión de ventana activa (setTouchable / setMoreTouch / setGlobalAlpha / setSecure / collapseWindow / expandWindow / addButtonEx / getComponent) ahora lanzan `imgui.<name>: no active session` cuando no hay una sesión activa; antes getComponent devolvía null
* `Aviso` La opción de gráfico offset queda obsoleta; use valuesOffset en su lugar (offset sigue funcionando)
* `Función` Evento error de las sesiones de ventana: se emite cuando la función de renderizado o una devolución de llamada de evento lanza una excepción, con error, phase (render o event) y frame; con un oyente de error la sesión sigue renderizando y el manejador puede cerrarla, sin oyente se cierra con render-error como antes
* `Función` Opción de ventana debug: activa la recuperación de errores y el registro de depuración de Dear ImGui, avisa por console.warn de errores de uso como un Begin / End sin pareja y muestra las ventanas Metrics y Debug Log
* `Función` Ejemplo error-handling que muestra el evento error, el modo debug y cómo localizar errores comunes
* `Función` docs/ALIASES.md enumera todos los alias PascalCase y sus diferencias con las firmas C++ de Dear ImGui
* `Corrección` Las opciones valuesOffset y stride de plotLines / plotHistogram no tenían efecto
* `Mejora` Los errores de la función de renderizado o de una devolución de llamada de evento se muestran en la consola con su pila de llamadas, y un mismo error repetido se muestra una sola vez
* `Mejora` El README describe los alias como "alias de las API comunes", explica el modelo de sesión única (una sesión nueva cierra la anterior) y el uso de los miembros nuevos, e indica el SDK de destino 37

#### v1.10.0

###### 2026/10/29

* `Aviso` Requiere AutoJs6 6.8.0 o posterior (versionCode 5935 o superior)
* `Corrección` Los parámetros del callback de renderizado de createWindow / launchFloaty / launch / launchPrivileged se declaraban como (session) en las declaraciones TypeScript; ahora coinciden con la llamada real (ui, session) y se añade el tipo RenderCallback
* `Mejora` Una vez habilitado, el plugin se usa directamente como objeto global imgui, que AutoJs6 registra y que carga el plugin en la primera llamada a un miembro, por lo que ya no se necesita plugins.load; la forma anterior plugins.load("io.github.supermonster003.autojs6.plugin.imgui") devuelve el mismo objeto
* `Mejora` Scripts de ejemplo, instrucciones de uso, README y declaraciones TypeScript actualizados al uso del objeto global; el archivo de declaraciones ya no amplía plugins.load con sobrecargas

##### Para consultar más versiones

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-es.md)

******

### Compilación

******

```powershell
.\gradlew.bat :app:assembleDebug
```

Compilación Release con nombres que incluyen el resumen CRC32:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

Verificación del inventario del código fuente nativo, de la paridad de las declaraciones JNI, de las pruebas unitarias y de la integridad de la división por ABI:

```powershell
.\gradlew.bat :app:verifyImGuiDebugApks
```

Los parámetros de compilación proceden de `version.properties`; el SDK mínimo actual es 24 y el SDK de destino es 37.

******

### Estructura del proyecto

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

`index.js` es el módulo `imgui` del lado del motor de scripts e `ImGuiBridge.cpp` es el puente JNI hacia Dear ImGui. `strings.xml` contiene las descripciones localizadas del plugin y `plugin_instruction.md` contiene las instrucciones de uso que muestra el host. Los archivos README y CHANGELOG se generan a partir de las fuentes JSON con `.python/generate_markdown.py`; edite las fuentes JSON en lugar de los archivos generados.

******

### Enlaces

******

- Proyecto AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Proyecto oficial Dear ImGui: https://github.com/ocornut/imgui
- Hoja de ruta de funciones: https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)
