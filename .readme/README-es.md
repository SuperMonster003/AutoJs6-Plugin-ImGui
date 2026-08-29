<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Crea interfaces flotantes con Dear ImGui</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-ImGui?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-ImGui?color=A24232&label=Issues"/></a>
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

El plugin ImGui expone Dear ImGui como el objeto global `imgui` en los motores de scripts. Renderiza controles de modo inmediato en una ventana flotante transparente y reúne la creación de ventanas, la planificación de fotogramas, la entrada táctil y la limpieza de recursos nativos en una API compacta.

******

### Funciones

******

- Carga el objeto global `imgui` mediante montaje automático o `plugins.load(packageName)`.
- Crea ventanas flotantes transparentes con tamaño, posición, frecuencia de fotogramas, fuente y arrastre de áreas vacías configurables.
- Ofrece ventanas, regiones secundarias, pestañas, árboles, texto, botones, entradas mutables, selectores, indicadores de progreso, ayudas de diseño, temas y la ventana de demostración de Dear ImGui.
- Ofrece referencias mutables booleanas, enteras, decimales, de texto y de color para controles con estado.
- Localiza la información del plugin, las instrucciones, README y CHANGELOG en diez idiomas.

******

### Uso

******

Active el montaje automático en el Centro de plugins o cargue el plugin explícitamente y cree una ventana flotante:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");

var enabled = imgui.bool(true);
var value = imgui.float(0.5);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(overlay.width, overlay.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui controls",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("Enabled", enabled);
            ui.sliderFloat("Value", value, 0, 1, "%.2f");
            if (ui.button("Close", 120, 0)) {
                overlay.close();
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

Los controles mutables actualizan los objetos creados con `imgui.bool`, `imgui.int`, `imgui.float`, `imgui.string` y `imgui.floats`. `width`, `height` y `fontSize` usan unidades independientes de la densidad. Arrastre un área vacía para mover la ventana o use `movable: false` para fijarla.

******

### Resumen de la API

******

Los métodos lower camel case reflejan operaciones habituales de Dear ImGui y existen alias PascalCase para las llamadas de controles conocidas:

- Ciclo de vida: `createWindow`, `closeWindow`, `withWindow`, `withChild`, `withTabBar`, `withTabItem` y `withTreeNode`.
- Controles: `text`, `button`, `checkbox`, `radioButton`, deslizadores, campos editables, colores, progreso, combos y elementos seleccionables.
- Diseño y estado: métodos de cursor y ancho, `sameLine`, `separator`, `spacing`, consultas de elementos y consultas de captura.
- Constantes: `Cond`, `WindowFlags`, `InputTextFlags`, `SliderFlags`, `TreeNodeFlags`, `SelectableFlags`, `TabBarFlags`, `TabItemFlags` y `MouseButton`.

******

### Historial de versiones

******

# v1.0.0

###### 2026/08/29

* `Función` Objeto global `imgui` con montaje automático y carga explícita mediante `plugins.load`
* `Función` Ventanas flotantes transparentes renderizadas por Dear ImGui 1.92.9 con dimensiones, frecuencia de fotogramas, fuentes y arrastre desde áreas vacías configurables
* `Función` API de modo inmediato para ventanas, diseño, texto, entrada, selección, color, progreso, árboles, pestañas, temas y demostración
* `Función` Referencias mutables booleanas, enteras, decimales, de texto y de color para controles con estado
* `Función` Información del plugin, instrucciones, README y CHANGELOG localizados en diez idiomas
* `Dependencia` Se añadió Common Plugin API para los metadatos de descubrimiento del plugin
* `Dependencia` Se añadieron la biblioteca estándar de Kotlin y el entorno de ejecución Parcelize 2.2.21
* `Dependencia` Se añadieron Apache Commons Compress 1.28.0 y XZ for Java 1.10 para las herramientas de compilación
* `Dependencia` Se añadió JUnit 4.13.2 para las pruebas del contrato del plugin

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

Los parámetros proceden de `version.properties`; el SDK mínimo actual es 24 y el SDK de destino es 36.

******

### Estructura de recursos

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
```

`strings.xml` contiene descripciones localizadas y `plugin_instruction.md` contiene las instrucciones mostradas por el host. `.python/generate_markdown.py` genera los archivos README y CHANGELOG desde las fuentes JSON.

******

### Enlaces

******

- Proyecto AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Proyecto oficial Dear ImGui: https://github.com/ocornut/imgui
