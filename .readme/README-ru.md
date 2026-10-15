<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Создание плавающих пользовательских интерфейсов с Dear ImGui</p>

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

Плагин ImGui приносит библиотеку графического интерфейса непосредственного режима [Dear ImGui](https://github.com/ocornut/imgui) в AutoJs6 и отображает элементы управления средствами OpenGL ES в прозрачном плавающем окне. Он естественно подходит для легковесных плавающих интерфейсов, таких как панели отладки, инструменты настройки параметров и HUD времени выполнения, и объединяет создание окна, планирование кадров, сенсорный ввод и освобождение нативных ресурсов в компактном API.

Наиболее совместимая точка входа — `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")`. В AutoJs6 6.8 и новее можно также включить автоматическое подключение в настройках Центра плагинов с именем объекта `imgui`; напрямую использовать глобальный объект можно только после включения этой настройки.

******

### Возможности

******

- Адаптивные сессии оверлея и полноэкранной Activity с автоматическим пропуском касаний, сворачиванием, отдельными плавающими кнопками, прозрачностью/защитой, сохранением расположения и событиями жизненного цикла.
- `launchPrivileged` предоставляет явный production-режим SurfaceFlinger через управляемый AutoJs6 Shizuku/root; аутентифицированный Binder передаёт привилегированный Surface полному существующему рендереру, а `/dev/input` обеспечивает наблюдаемый ввод указателя.
- Стабильная точка входа `plugins.load` работает без настройки подключения на стороне хоста; необязательное автоматическое подключение AutoJs6 предоставляет тот же API как глобальный объект `imgui`.
- Прозрачные плавающие окна с настраиваемыми размером, положением, частотой кадров и шрифтом; перетаскивайте пустую область, используйте инерционную прокрутку двумя пальцами и долгое нажатие одним пальцем для правого клика.
- Семейство `inputText` полностью подключено к системному IME: поддерживаются составляемый текст, автоматическое отображение клавиатуры и основные клавиши редактирования.
- Окна, вкладки, узлы дерева, таблицы, всплывающие окна, меню, всплывающие подсказки и более 60 элементов непосредственного режима, включая переключатель `toggle` в мобильном стиле.
- Визуальная и шрифтовая система с 11 `Themes`, пакетными стилями, скруглёнными/обрамлёнными/затенёнными оформлениями, стеком нескольких шрифтов, CJK-резервом и подмножеством Material Icons.
- Управляемые текстуры принимают пути к файлам, закодированные байты, Android `Bitmap` и объекты AutoJs6 `Image`; `image` / `imageButton` и три слоя DrawList обеспечивают показ изображений и пользовательское рисование.
- Лёгкие ссылки `imgui.ref(value)` / `{value: x}` работают со всеми элементами с состоянием, а прежние помощники ссылок на Java-массивы остаются полностью совместимыми.
- Управляемые сессией `logWindow`, стековые `toast`, диалоги Promise, цветной по порогам `statsOverlay` и выбираемая CRUD-таблица `dataTable` дают готовый интерфейс отладки.
- Перечисления констант и псевдонимы методов PascalCase следуют нативному именованию Dear ImGui, поэтому перенос имеющихся знаний ничего не стоит.
- Инженерная поддержка включает полные декларации TypeScript, пять запускаемых примеров, Android-тесты рендеринга, неблокирующую входную очередь, проверяемое обновление upstream и автоматизацию CI-релизов.
- Локализация сведений о плагине, инструкций, README и CHANGELOG на десять языков.

******

### Установка

******

- Скачайте из [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) APK, соответствующий архитектуре вашего устройства; если не уверены, выберите пакет `universal`.
- Установите APK, откройте AutoJs6 и убедитесь на странице управления плагинами, что этот плагин распознан и включен.
- Загрузите плагин через `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")`, затем вызовите `imgui.createWindow(...)`; при первом использовании предоставьте AutoJs6 разрешение на отображение поверх других приложений (плавающее окно).
- Перед `launchPrivileged` обычным образом настройте и авторизуйте Root или Shizuku в AutoJs6. Плагин повторно использует это состояние хоста, и привилегированному режиму не требуется разрешение оверлея.

Требование к хосту: AutoJs6 с versionCode не ниже 3853. Плагин поставляется с двоичными файлами `arm64-v8a` / `armeabi-v7a` / `x86_64` / `x86` и требует Android 7.0 (API 24) или новее, а также GPU/драйвер с поддержкой OpenGL ES 3.0.

******

### Быстрый старт

******

После установки и включения плагина загрузите его API, создайте изменяемые ссылки и откройте плавающее окно:

```js
var imgui = plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
var enabled = imgui.ref(true);
var volume = imgui.ref(0.5);
var themeColor = imgui.ref([0.25, 0.55, 0.90]);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(overlay.width, overlay.height, ui.Cond.Always);
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

Изменяемые элементы принимают лёгкие ссылки из `imgui.ref(value)` и обычные объекты `{ value: ... }`; прежние помощники `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` остаются совместимыми. Фокус на `inputText` автоматически открывает системный IME с поддержкой составления; `ime: false` отключает автоматику. `width`, `height` и `fontSize` используют единицы без привязки к плотности. Перетаскивайте пустую область (`movable: false` закрепляет окно); вертикальный жест двумя пальцами имеет настраиваемую инерцию (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`), а долгое нажатие одним пальцем создаёт правый клик (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). Если системный шрифт не покрывает нужные символы, укажите в `fontPath` файл TTF или OTF.

Темы и шрифты: `setTheme` принимает все 11 значений `Themes`, а `setStyleProperties` пакетно обновляет `StyleVar`; `createWindow` также принимает `theme`, `appearance`, `style` и `shadow`. Массив `fonts` загружает шрифты из assets (`asset://...`) или файлов для `pushFont` / `withFont`. CJK-резерв и иконки объединяются автоматически; `Icons` / `icon(name)` возвращает глифы иконок.

Текстуры и пользовательское рисование: вызывайте `createTexture` только после готовности оконной сессии (обычно один раз внутри callback отрисовки). Возвращаемый объект содержит `width`, `height` и идемпотентные `dispose()` / `close()`; оставшиеся текстуры автоматически освобождаются при закрытии сессии. `image` / `imageButton` отображают текстуры, а `getWindowDrawList`, `getForegroundDrawList` и `getBackgroundDrawList` предоставляют основные примитивы. Координаты DrawList задаются в пикселях Surface. Значения AutoJs6 `Image` из `images.read(...)` или снимков экрана можно передавать напрямую.

Оконные сессии: оверлей по умолчанию использует `TouchMode.Auto`, оставляя корневые окна ImGui интерактивными и передавая касания пустых областей Surface приложению под ним; для фиксированной политики выберите `Touchable` или `Passthrough`. Сессия позволяет менять прозрачность/защиту/режим касаний, сворачиваться в мини-пузырь с низким FPS, создавать отдельные `addButtonEx`, следовать содержимому `AlwaysAutoResize`, сохранять расположение через `iniPath` и публиковать события через `on` / `once` / `off` или callbacks параметров. `imgui.launch(...)` создаёт полноэкранный Surface в текущей resumed Activity AutoJs6, а `launchFloaty(...)` явно выбирает оверлей. На движок сценариев приходится одна нативная сессия рендеринга, но её callback может создать любое число корней ImGui через `begin` / `withWindow`; новая сессия закрывает предыдущую.

Компоненты высокого уровня подключаются к активной сессии и рисуются после пользовательского callback: `logWindow` предоставляет уровни с цветами, очистку, экспорт и автопрокрутку; `toast` — позиционированные временные уведомления; `alert` / `confirm` / `singleChoice` / `multiChoice` возвращают Promise; `statsOverlay` строит график времени кадра; `dataTable` предоставляет выбор и CRUD. Пять встроенных примеров (`widget-overview`, `parameter-panel`, `log-hud`, `data-table-demo`, `theme-gallery`) доступны через `listExamples` / `getExampleSource` и запускаются `runExample`. Центр плагинов AutoJs6 6.8 пока не использует общие метаданные примеров, поэтому до поддержки хостом запускайте приведённый ниже вызов напрямую:

```js
imgui.runExample("widget-overview");
```

******

### Обзор API

******

Методы lower camel case повторяют одноименные операции Dear ImGui, а для пользователей, знакомых с нативным именованием, доступны псевдонимы PascalCase (например, `ui.Button` эквивалентен `ui.button`):

- Среда сессии: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, а также `on` / `once` / `off` и их формы для сессии.
- Обнаружение бэкенда: `getBackendCapabilities` / `BackendStatus` сообщает о доступности и готовности к эксплуатации окон, разделенной обработки касаний, привилегированного процесса, прямого ввода, Docking и Multi-Viewport, не повышая привилегии.
- Сессия и окна: `createWindow` / `closeWindow` / `withWindow` / `withChild` / `setNextWindowPos` / `setNextWindowSize` / `setNextWindowBgAlpha`, а также запросы состояния окна, такие как `isWindowHovered`.
- Текст и элементы управления: `text` / `textColored` / `textWrapped` / `separatorText` / `bulletText` / `labelText` / `button` / `arrowButton` / `invisibleButton` / `checkbox` / `toggle` / `radioButton` / `sliderFloat` / `sliderInt` / `vSliderFloat` / `dragFloat` / `dragInt` / `inputText` / `inputInt` / `inputFloat` / `inputTextMultiline` / `colorEdit3` / `colorEdit4` / `colorPicker4` / `colorButton` / `progressBar` / `plotLines` / `plotHistogram` и другие.
- Контейнеры и навигация: `withTabBar` / `withTabItem` / `withTreeNode` / `treeNodeEx` / `collapsingHeader` / семейство таблиц `withTable` / `withListBox` / `withCombo` / `selectable`.
- Всплывающие окна и меню: `openPopup` / `withPopup` / `withPopupModal` / `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` / `closeCurrentPopup` / `withMenuBar` / `withMenu` / `menuItem` / `setTooltip` / `setItemTooltip` / `withItemTooltip`.
- Стиль и компоновка: `styleColorsDark` / `styleColorsLight` / `styleColorsClassic` / `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` / `withGroup` / `withDisabled` / `withId` / `indent` / `sameLine` / `separator` / `spacing`, а также семейства курсора и прокрутки.
- Текстуры и рисование: `createTexture` / `destroyTexture` / `image` / `imageButton` / `colorU32`, а также `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` с примитивами линии, прямоугольника, круга, треугольника, текста, ломаной, кривой Безье и изображения.
- Запросы и ввод: запросы состояния, такие как `isItemClicked` / `isItemHovered` / `isItemActive` / `isItemEdited` / `isMouseDown` / `getMousePos` / `calcTextSize` / `framerate`, активный фокус через `setKeyboardFocusHere` и примитивы `addInputCharacters` / `sendKey` / `addMouseWheel` / `wantTextInput`. Все открытые значения `InputTextFlags` передаются в Dear ImGui; флаги, зависящие от callback, не открыты, а `WordWrap` действует только для многострочного ввода.
- Компоненты высокого уровня и примеры: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, а также `listExamples` / `getExampleSource` / `runExample`; те же фабрики есть у каждой сессии.
- Изменяемые ссылки: лёгкая `imgui.ref` (или обычный объект `{value: x}`) и совместимые помощники Java-массивов `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.strings`.
- Константы: `BackendStatus` / `Cond` / `WindowFlags` / `ChildFlags` / `InputTextFlags` / `SliderFlags` / `TreeNodeFlags` / `SelectableFlags` / `TabBarFlags` / `TabItemFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `Col` / `StyleVar` / `Themes` / `Appearance` / `Fonts` / `Icons` / `Dir` / `Key` / `MouseButton` / `ButtonFlags` / `TextureFlags` / `DrawListLayer` / `DrawFlags` / `LogLevel` / `ToastPosition` / `Limits`, соответствующие одноименным перечислениям Dear ImGui или таблицам плагина.

******

### Известные ограничения

******

- Каждый движок сценариев поддерживает одну нативную сессию рендеринга; для нескольких панелей создавайте несколько корневых окон ImGui внутри неё. Новая сессия оверлея или Activity закрывает предыдущую.
- `imgui.launch` требует текущую Activity AutoJs6 в состоянии resumed; используйте `launchFloaty`, если сценарию нужно продолжать отрисовку без Activity хоста на переднем плане.
- В v1.9 привилегированный режим фиксирован на весь экран и поддерживает только указатель: нет IME/клавиш, альфа/защиты слоя хоста, сворачивания, вспомогательных Android-кнопок и динамического пересоздания при повороте. Прямой ввод не использует `EVIOCGRAB`, а OEM-политики SurfaceControl/SELinux могут отказать в запуске; проверка не запускает `su` и не запрашивает Shizuku.

******

### История выпусков

******

#### v1.9.4

###### 2026/10/05

* `Улучшение` Значки центра плагинов используют размеры, положение, светлые и тёмные изображения и круглые фоны, настроенные в Icon Studio, сохраняя исходники и параметры для воспроизведения
* `Улучшение` Значки в сведениях о приложении Android используют изображения и светлый и тёмный фон Icon Studio, сохраняя прозрачные изображения центра плагинов и существующие варианты значков лаунчера

#### v1.9.3

###### 2026/09/19

* `Исправление` Предупреждения чтения SDK XML v4 с AGP 9.1 и ошибочный запуск проверки выравнивания нативных библиотек APK при сборке модульных тестов JVM, устраненные общими плагинами сборки 1.8.3
* `Улучшение` Подняты compileSdk и targetSdk до 37 (Android 17); поведение плагина не зависит от нового целевого уровня

#### v1.9.2

###### 2026/09/13

* `Исправление` Информация о версии и ABI в центре плагинов соответствует установленному APK
* `Исправление` Даты версий используют единый английский формат
* `Улучшение` Проверка версий, подписей и полного набора вариантов APK перед подготовкой файлов для загрузки

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

Проверка перечня нативных исходников, соответствия объявлений JNI, модульных тестов и целостности разбиения по ABI:

```powershell
.\gradlew.bat :app:verifyImGuiDebugApks
```

Параметры сборки берутся из `version.properties`; текущий минимальный SDK равен 24, целевой SDK равен 36.

******

### Структура проекта

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

`index.js` — это модуль `imgui` на стороне движка сценариев, а `ImGuiBridge.cpp` — JNI-мост к Dear ImGui. `strings.xml` содержит локализованные описания плагина, а `plugin_instruction.md` — инструкции по использованию, отображаемые хостом. Файлы README и CHANGELOG генерируются из исходных JSON скриптом `.python/generate_markdown.py`; редактируйте исходные JSON, а не сгенерированные файлы.

******

### Ссылки

******

- Проект AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Официальный проект Dear ImGui: https://github.com/ocornut/imgui
- Дорожная карта возможностей: https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)
