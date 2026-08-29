<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Создание плавающих интерфейсов с Dear ImGui</p>

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

### Языки (Languages)

******

Текущий файл README.md доступен на следующих языках:

- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-en.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-fr.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-es.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ko.md)
- Русский [ru] # текущий
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ar.md)

******

### Введение

******

Плагин ImGui предоставляет Dear ImGui как глобальный объект `imgui` в движках сценариев. Он отображает элементы управления непосредственного режима в прозрачном плавающем окне и объединяет создание окна, планирование кадров, сенсорный ввод и освобождение нативных ресурсов в компактном API.

******

### Возможности

******

- Загрузка глобального объекта `imgui` через автоматическое подключение или `plugins.load(packageName)`.
- Прозрачные плавающие окна с настраиваемыми размером, положением, частотой кадров, шрифтом и перетаскиванием за пустую область.
- Окна, дочерние области, вкладки, деревья, текст, кнопки, изменяемые поля, селекторы, индикаторы, средства компоновки, темы и демонстрационное окно Dear ImGui.
- Изменяемые ссылки на логические, целые, дробные, строковые и цветовые значения для элементов с состоянием.
- Локализация сведений о плагине, инструкций, README и CHANGELOG на десять языков.

******

### Использование

******

Включите автоматическое подключение в центре плагинов или загрузите плагин явно, затем создайте плавающее окно:

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

Изменяемые элементы обновляют объекты, созданные через `imgui.bool`, `imgui.int`, `imgui.float`, `imgui.string` и `imgui.floats`. `width`, `height` и `fontSize` используют единицы без привязки к плотности. Перетаскивайте пустую область для перемещения окна или передайте `movable: false`, чтобы закрепить его.

******

### Обзор API

******

Методы lower camel case соответствуют распространенным операциям Dear ImGui, а для знакомых вызовов элементов доступны псевдонимы PascalCase:

- Жизненный цикл: `createWindow`, `closeWindow`, `withWindow`, `withChild`, `withTabBar`, `withTabItem` и `withTreeNode`.
- Элементы: текст, кнопки, флажки, переключатели, ползунки, редактируемые поля, цвета, прогресс, списки и выбираемые строки.
- Компоновка и состояние: методы курсора и ширины, `sameLine`, `separator`, `spacing`, запросы элементов и захвата.
- Константы: `Cond`, `WindowFlags`, `InputTextFlags`, `SliderFlags`, `TreeNodeFlags`, `SelectableFlags`, `TabBarFlags`, `TabItemFlags` и `MouseButton`.

******

### История выпусков

******

# v1.0.0

###### 2026/08/29

* `Функция` Глобальный объект `imgui` с автоматическим подключением и явной загрузкой через `plugins.load`
* `Функция` Прозрачные плавающие окна на Dear ImGui 1.92.9 с настраиваемыми размерами, частотой кадров, шрифтами и перетаскиванием за пустую область
* `Функция` API непосредственного режима для окон, компоновки, текста, ввода, выбора, цветов, прогресса, деревьев, вкладок, тем и демонстрации
* `Функция` Изменяемые ссылки на логические, целые, дробные, строковые и цветовые значения для элементов с состоянием
* `Функция` Локализация сведений о плагине, инструкций, README и CHANGELOG на десять языков
* `Зависимость` Добавлен Common Plugin API для метаданных обнаружения плагина
* `Зависимость` Добавлены стандартная библиотека Kotlin и среда выполнения Parcelize версии 2.2.21
* `Зависимость` Добавлены Apache Commons Compress 1.28.0 и XZ for Java 1.10 для инструментов сборки
* `Зависимость` Добавлен JUnit версии 4.13.2 для тестов контракта плагина

##### Дополнительная история выпусков

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-ru.md)

******

### Сборка

******

```powershell
.\gradlew.bat :app:assembleDebug
```

Сборка Release с CRC32 в именах файлов:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

Параметры берутся из `version.properties`; текущий минимальный SDK равен 24, целевой SDK равен 36.

******

### Структура ресурсов

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
```

`strings.xml` содержит локализованные описания, а `plugin_instruction.md` содержит инструкции для хоста. `.python/generate_markdown.py` создает файлы README и CHANGELOG из исходных JSON.

******

### Ссылки

******

- Проект AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Официальный проект Dear ImGui: https://github.com/ocornut/imgui
