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

После включения плагина в Центре плагинов скрипты используют глобальный объект `imgui` напрямую (его регистрирует AutoJs6, а плагин загружается при первом обращении к любому его члену); `plugins.load` не требуется. Требуется AutoJs6 6.8.0 или новее. Если плагин новее AutoJs6, члены, которых AutoJs6 ещё не знает, появляются в `imgui` только после загрузки плагина (при первом обращении к любому члену `imgui`); аргумент `ui` колбэков рендеринга всегда полон.

******

### Возможности

******

- Адаптивные сессии оверлея и полноэкранной Activity с автоматическим пропуском касаний, сворачиванием, отдельными плавающими кнопками, прозрачностью/защитой, сохранением расположения и событиями жизненного цикла.
- `launchPrivileged` предоставляет явный production-режим SurfaceFlinger через управляемый AutoJs6 Shizuku/root; аутентифицированный Binder передаёт привилегированный Surface полному существующему рендереру, а `/dev/input` обеспечивает наблюдаемый ввод указателя.
- AutoJs6 регистрирует плагин напрямую как глобальный объект `imgui`, поэтому после включения плагина отдельный шаг загрузки не нужен, как и у официальных плагинов pinyin / mediainfo.
- Прозрачные плавающие окна с настраиваемыми размером, положением, частотой кадров и шрифтом; перетаскивайте пустую область, используйте инерционную прокрутку двумя пальцами и долгое нажатие одним пальцем для правого клика. Через несколько секунд без ввода частота кадров снижается ради экономии батареи, а при выключенном экране отрисовка приостанавливается.
- Семейство `inputText` полностью подключено к системному IME: поддерживаются составляемый текст, автоматическое отображение клавиатуры и основные клавиши редактирования.
- Окна, вкладки, узлы дерева, таблицы, всплывающие окна, меню, всплывающие подсказки и более 60 элементов непосредственного режима, включая переключатель `toggle` в мобильном стиле.
- Визуальная и шрифтовая система с 11 `Themes`, пакетными стилями, скруглёнными/обрамлёнными/затенёнными оформлениями, стеком нескольких шрифтов, CJK-резервом и подмножеством Material Icons.
- Управляемые текстуры принимают пути к файлам, закодированные байты, Android `Bitmap` и объекты AutoJs6 `Image`; `image` / `imageButton` и три слоя DrawList обеспечивают показ изображений и пользовательское рисование.
- `session.capture()` возвращает содержимое окна как `Image` AutoJs6; с `systemCjkFont: true` система рисует символы CJK, которых нет во встроенном шрифте, с `pinchZoom: true` два пальца меняют масштаб шрифта, а окна следуют за изменением плотности экрана и системного размера шрифта.
- Лёгкие ссылки `imgui.ref(value)` / `{value: x}` работают со всеми элементами с состоянием, а прежние помощники ссылок на Java-массивы остаются полностью совместимыми.
- Управляемые сессией `logWindow`, стековые `toast`, диалоги Promise, цветной по порогам `statsOverlay` и выбираемая CRUD-таблица `dataTable` дают готовый интерфейс отладки.
- Для часто используемых API и перечислений констант есть псевдонимы PascalCase (например, `ui.Button`), сохраняющие стиль аргументов плагина; список псевдонимов и отличия от исходных сигнатур C++ приведены в [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md).
- Инженерная поддержка включает полные декларации TypeScript, девять запускаемых примеров, Android-тесты рендеринга, неблокирующую входную очередь, проверяемое обновление upstream и автоматизацию CI-релизов.
- Локализация сведений о плагине, инструкций, README и CHANGELOG на десять языков.

******

### Установка

******

- Скачайте из [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) APK, соответствующий архитектуре вашего устройства; если не уверены, выберите пакет `universal`.
- Установите APK, откройте AutoJs6 и убедитесь на странице управления плагинами, что этот плагин распознан и включен.
- Вызовите `imgui.createWindow(...)` прямо в скрипте; при первом использовании предоставьте AutoJs6 разрешение на отображение поверх других приложений (плавающее окно).
- Перед `launchPrivileged` обычным образом настройте и авторизуйте Root или Shizuku в AutoJs6. Плагин повторно использует это состояние хоста, и привилегированному режиму не требуется разрешение оверлея.

Требование к хосту: AutoJs6 с versionCode не ниже 5935. Плагин поставляется с двоичными файлами `arm64-v8a` / `armeabi-v7a` / `x86_64` / `x86` и требует Android 7.0 (API 24) или новее, а также GPU/драйвер с поддержкой OpenGL ES 3.0.

******

### Быстрый старт

******

После установки и включения плагина создайте изменяемые ссылки и откройте плавающее окно:

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

Изменяемые элементы принимают лёгкие ссылки из `imgui.ref(value)` и обычные объекты `{ value: ... }`; прежние помощники `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` остаются совместимыми. Фокус на `inputText` автоматически открывает системный IME с поддержкой составления; `ime: false` отключает автоматику. Размеры и положение окна задаются в dp: параметры `width`, `height`, `x` и `y`, поля сессии и данные событий; `fontSize` тоже в dp. Координаты внутри кадра задаются в px, переводите их через `ui.dp()` / `ui.px()`. Обработчики событий и кнопок выполняются в потоке скрипта (см. [THREADING.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/THREADING.md)), а отличия от прежних версий перечислены в [MIGRATION-1.12.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/MIGRATION-1.12.md). Перетаскивайте пустую область (`movable: false` закрепляет окно); вертикальный жест двумя пальцами имеет настраиваемую инерцию (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`), а долгое нажатие одним пальцем создаёт правый клик (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). Если системный шрифт не покрывает нужные символы, укажите в `fontPath` файл TTF или OTF.

Темы и шрифты: `setTheme` принимает все 11 значений `Themes`, а `setStyleProperties` пакетно обновляет `StyleVar`; `createWindow` также принимает `theme`, `appearance`, `style` и `shadow`. Массив `fonts` загружает шрифты из assets (`asset://...`) или файлов для `pushFont` / `withFont`. CJK-резерв и иконки объединяются автоматически; `Icons` / `icon(name)` возвращает глифы иконок.

Текстуры и пользовательское рисование: вызывайте `createTexture` только после готовности оконной сессии (обычно один раз внутри callback отрисовки). Возвращаемый объект содержит `width`, `height`, `update(source)` (заменяет пиксели и сохраняет дескриптор; `width` / `height` следуют за новым размером) и идемпотентные `dispose()` / `close()`; оставшиеся текстуры автоматически освобождаются при закрытии сессии. `image` / `imageButton` отображают текстуры, а `getWindowDrawList`, `getForegroundDrawList` и `getBackgroundDrawList` предоставляют основные примитивы. Координаты DrawList задаются в пикселях Surface. Значения AutoJs6 `Image` из `images.read(...)` или снимков экрана можно передавать напрямую, как и `ArrayBuffer` или типизированный массив с данными PNG или JPEG.

Оконные сессии: оверлей по умолчанию использует `TouchMode.Auto`, оставляя корневые окна ImGui интерактивными и передавая касания пустых областей Surface приложению под ним; для фиксированной политики выберите `Touchable` или `Passthrough`. Сессия позволяет менять прозрачность/защиту/режим касаний, сворачиваться в мини-пузырь с низким FPS, создавать отдельные `addButtonEx`, следовать содержимому `AlwaysAutoResize`, сохранять расположение через `iniPath` и публиковать события через `on` / `once` / `off` или callbacks параметров. `imgui.launch(...)` создаёт полноэкранный Surface в текущей resumed Activity AutoJs6, а `launchFloaty(...)` явно выбирает оверлей. На движок сценариев приходится одна нативная сессия рендеринга, но её callback может создать любое число корней ImGui через `begin` / `withWindow`; новая сессия закрывает предыдущую. Исключение в колбэке рендеринга или в колбэке события выводится со стеком через `console.error` (серия одинаковых ошибок выводится один раз) и порождает событие `error` (`error` / `phase` / `frame`); без слушателя `error` ошибка рендеринга закрывает сессию (`closeReason` равен `render-error`), а при наличии слушателя остаток кадра пропускается и рендеринг продолжается. Опция `debug: true` сообщает через `console.warn` и logcat об ошибках использования, например `begin` без `end`, и показывает окна Metrics и Debug Log. Глобальные методы `setTouchable` / `setGlobalAlpha` / `getComponent` и подобные действуют на текущую сессию и без активной сессии выбрасывают `imgui.<name>: no active session`. В сессии `imgui.launch` клавиша "Назад" закрывает сессию (`closeReason` равен `back`), если слушатель `back` не вызвал `event.preventDefault()`; показанная экранная клавиатура сначала забирает эту клавишу и скрывается. Окна-оверлеи получают клавишу "Назад" только при фокусе на текстовом вводе и тогда лишь скрывают клавиатуру. При `debug: true` обратный вызов отрисовки дольше 250 мс также выводит `console.warn` с советом использовать `threads.start` (не чаще раза в 10 секунд).

Компоненты высокого уровня подключаются к активной сессии и рисуются после пользовательского callback: `logWindow` предоставляет уровни с цветами, очистку, экспорт и автопрокрутку; `toast` - позиционированные временные уведомления; `alert` / `confirm` / `singleChoice` / `multiChoice` возвращают Promise; `statsOverlay` строит график времени кадра и показывает рабочее время каждого кадра; `dataTable` предоставляет выбор и CRUD. Девять встроенных примеров (`widget-overview`, `parameter-panel`, `log-hud`, `data-table-demo`, `theme-gallery`, `error-handling`, `background-task`, `large-list`, `texture-refresh`) доступны через `listExamples` / `getExampleSource` и запускаются `runExample`. Центр плагинов AutoJs6 6.8 пока не использует общие метаданные примеров, поэтому до поддержки хостом запускайте приведённый ниже вызов напрямую:

```js
imgui.runExample("widget-overview");
```

******

### Обзор API

******

Для часто используемых API есть и псевдонимы PascalCase (например, `ui.Button` эквивалентен `ui.button`). Псевдонимы сохраняют стиль аргументов плагина (изменяемые значения через `imgui.ref` и т. п.) и не соответствуют исходным сигнатурам C++ один к одному; список и отличия приведены в [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md). Методы lower camel case повторяют одноименные операции Dear ImGui и делятся на следующие группы:

- Среда сессии: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, перевод единиц `density` / `dp` / `px`, а также `on` / `once` / `off` и их формы для сессии, событие сессии `error`, сообщающее об ошибках колбэков, опция `debug`, включающая режим отладки, и энергосбережение через `idleFps` / `idleDelay`, `setFps` / `setIdleFps` / `getFps` и события `idle` / `active`.
- Обнаружение бэкенда: `getBackendCapabilities` / `BackendStatus` сообщает о доступности и готовности к эксплуатации окон, разделенной обработки касаний, привилегированного процесса, прямого ввода, Docking и Multi-Viewport, не повышая привилегии.
- Сессия и окна: `createWindow` / `closeWindow` / `withWindow` / `withChild` / `setNextWindowPos` / `setNextWindowSize` / `setNextWindowBgAlpha`, а также запросы состояния окна, такие как `isWindowHovered`.
- Текст и элементы управления: `text` / `textColored` / `textWrapped` / `separatorText` / `bulletText` / `labelText` / `button` / `arrowButton` / `invisibleButton` / `checkbox` / `toggle` / `radioButton` / `sliderFloat` / `sliderInt` / `vSliderFloat` / `dragFloat` / `dragInt` / `inputText` / `inputInt` / `inputFloat` / `inputTextMultiline` / `colorEdit3` / `colorEdit4` / `colorPicker4` / `colorButton` / `progressBar` / `plotLines` / `plotHistogram` и другие. Элементы с 2-4 значениями: `dragFloat2/3/4` / `dragInt2/3/4` / `sliderFloat2/3/4` / `sliderInt2/3/4` / `inputFloat2/3/4` / `inputInt2/3/4` / `dragFloatRange2` / `dragIntRange2` / `sliderAngle`.
- Контейнеры и навигация: `withTabBar` / `withTabItem` / `withTreeNode` / `treeNodeEx` / `collapsingHeader` / семейство таблиц `withTable` / `withListBox` / `withCombo` / `selectable`, а также `listClipper` для длинных списков. Сортировка таблиц: `tableGetSortSpecs` / `SortDirection` и `dataTable` с `sortable: true`.
- Всплывающие окна и меню: `openPopup` / `withPopup` / `withPopupModal` / `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` / `closeCurrentPopup` / `withMenuBar` / `withMenu` / `menuItem` / `setTooltip` / `setItemTooltip` / `withItemTooltip`.
- Стиль и компоновка: `styleColorsDark` / `styleColorsLight` / `styleColorsClassic` / `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` / `withGroup` / `withDisabled` / `withId` / `indent` / `sameLine` / `separator` / `spacing`, а также семейства курсора и прокрутки.
- Текстуры и рисование: `createTexture` / `texture.update` / `destroyTexture` / `image` / `imageButton` / `colorU32`, а также `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` с примитивами линии, прямоугольника, круга, треугольника, текста, ломаной, кривой Безье и изображения. Рисование контуров: `pathLineTo` / `pathArcTo` / `pathArcToFast` / `pathBezierCubicCurveTo` / `pathBezierQuadraticCurveTo` / `pathRect` / `pathStroke` / `pathFillConvex` / `pathFillConcave`; `pushClipRect` / `popClipRect` для списков рисования и окон; другие фигуры: `addEllipse` / `addNgon` / `addQuad` / `addBezierQuadratic` / `addRectFilledMultiColor` / `addConvexPolyFilled` / `addConcavePolyFilled` / `addImageQuad` / `addImageRounded`.
- Запросы и ввод: запросы состояния, такие как `isItemClicked` / `isItemHovered` / `isItemActive` / `isItemEdited` / `isMouseDown` / `getMousePos` / `calcTextSize` / `framerate`, активный фокус через `setKeyboardFocusHere` и примитивы `addInputCharacters` / `sendKey` / `addMouseWheel` / `wantTextInput`. Все открытые значения `InputTextFlags` передаются в Dear ImGui; флаги, зависящие от callback, не открыты, а `WordWrap` действует только для многострочного ввода. Запросы клавиш и сочетания: `isKeyDown` / `isKeyPressed` / `isKeyReleased` / `getKeyPressedAmount` / `getKeyName` / `isKeyChordPressed` / `shortcut` / `setNextItemShortcut`, сочетания записываются как `ui.Mod.Ctrl | ui.Key.S`. Буфер обмена: `getClipboardText` / `setClipboardText`. Внедрение указателя для автоматических тестов интерфейса: `addMousePosEvent` / `addMouseButtonEvent` (пиксели кадра, как в `getMousePos`).
- Перетаскивание: `withDragDropSource` / `withDragDropTarget`, `beginDragDropSource` / `setDragDropPayload` / `endDragDropSource` / `beginDragDropTarget` / `acceptDragDropPayload` / `endDragDropTarget` / `getDragDropPayload`, а также `DragDropFlags`; полезная нагрузка - строка, число или любой объект, сериализуемый в JSON.
- Отладочные инструменты: `showMetricsWindow` / `showDebugLogWindow` / `showIdStackToolWindow` / `showStyleEditor` / `showAboutWindow` / `showUserGuide` показывают встроенные окна инструментов Dear ImGui; каждая функция принимает необязательную изменяемую логическую ссылку, которую кнопка закрытия сбрасывает в false.
- Компоненты высокого уровня и примеры: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, а также `listExamples` / `getExampleSource` / `runExample`; те же фабрики есть у каждой сессии.
- Изменяемые ссылки: лёгкая `imgui.ref` (или обычный объект `{value: x}`) и совместимые помощники Java-массивов `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.ints` / `imgui.strings`.
- Константы: `BackendStatus` / `Cond` / `WindowFlags` / `ChildFlags` / `InputTextFlags` / `SliderFlags` / `TreeNodeFlags` / `SelectableFlags` / `TabBarFlags` / `TabItemFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `SortDirection` / `Col` / `StyleVar` / `Themes` / `Appearance` / `Fonts` / `Icons` / `Dir` / `Key` / `Mod` / `InputFlags` / `DragDropFlags` / `MouseButton` / `ButtonFlags` / `TextureFlags` / `DrawListLayer` / `DrawFlags` / `LogLevel` / `ToastPosition` / `Limits`, соответствующие одноименным перечислениям Dear ImGui или таблицам плагина.

******

### Известные ограничения

******

- Каждый движок сценариев поддерживает одну нативную сессию рендеринга; для нескольких панелей создавайте несколько корневых окон ImGui внутри неё. Новая сессия оверлея или Activity закрывает предыдущую.
- `imgui.launch` требует текущую Activity AutoJs6 в состоянии resumed; используйте `launchFloaty`, если сценарию нужно продолжать отрисовку без Activity хоста на переднем плане.
- Привилегированный режим фиксирован на весь экран и поддерживает только указатель: текстовые поля используют временное поле ввода AutoJs6, которому нужно разрешение оверлея и которое только добавляет текст у курсора; нет клавиш, альфа/защиты слоя хоста, сворачивания, вспомогательных Android-кнопок и динамического пересоздания при повороте. Прямой ввод не использует `EVIOCGRAB`, а OEM-политики SurfaceControl/SELinux могут отказать в запуске; проверка не запускает `su` и не запрашивает Shizuku.

******

### История выпусков

******

#### v1.16.0

###### 2026/10/31

* `Функция` session.capture(options) делает снимок окна и возвращает изображение для модуля images, например images.save(session.capture(), path). options.region задает часть окна в dp. Окно в привилегированном режиме можно снять только между двумя кадрами, например из setTimeout(fn, 0)
* `Функция` createWindow({systemCjkFont: true}) показывает все символы CJK, которые есть на устройстве, включая редкие вроде 龘, которых нет во встроенном шрифте. Android рисует каждый символ при первом использовании, поэтому дополнительной памяти почти не требуется; покрытие встроенного шрифта описано в docs/LIMITS.md
* `Функция` createWindow({pinchZoom: true}) позволяет двумя пальцами менять размер текста от 0.5 до 3 раз; движение двух пальцев в одну сторону по-прежнему прокручивает. Масштаб читается из session.fontScale, задается через session.setFontScale(scale), а изменения приходят в новом событии fontScaleChanged. Все это показано в примере widget-overview
* `Функция` Ввод текста в привилегированном режиме: нажатие на inputText открывает небольшое поле ввода AutoJs6 с клавиатурой (нужно разрешение оверлея для AutoJs6). Кнопка OK, клавиша готово или нажатие в другом месте вводят текст у курсора поля; уже имеющийся в поле текст в этом окне не редактируется
* `Улучшение` Окна теперь следуют за изменением размера экрана (плотности) и системного размера шрифта во время работы: текст и элементы получают новый размер, а размер окна в dp сохраняется. В configurationChanged появились поля density, oldDensity, fontScale и oldFontScale. Полноэкранное окно imgui.launch вместо этого закрывается (session.closeReason равен "configuration-changed"), потому что Android пересоздает его Activity

#### v1.15.0

###### 2026/10/30

* `Функция` Запросы клавиатуры: isKeyDown / isKeyPressed / isKeyReleased / getKeyPressedAmount / getKeyName / isKeyChordPressed, а также сочетания клавиш через shortcut и setNextItemShortcut. Сочетания записываются как ui.Mod.Ctrl | ui.Key.S. Константы Key теперь охватывают всю клавиатуру: A - Z, Digit0 - Digit9, F1 - F24, цифровой блок и другие клавиши
* `Функция` Буфер обмена: getClipboardText / setClipboardText используют тот же буфер обмена Android, что и getClip / setClip хоста, как и Ctrl+C / Ctrl+V в текстовых полях. Начиная с Android 10 система разрешает читать буфер обмена только приложению с фокусом ввода; о влиянии на плавающие окна см. docs/LIMITS.md
* `Функция` Перетаскивание: перетаскивайте один элемент на другой с помощью beginDragDropSource / setDragDropPayload / beginDragDropTarget / acceptDragDropPayload и вспомогательных функций withDragDropSource / withDragDropTarget (параметры задаёт DragDropFlags). Полезная нагрузка - строка, число или любой объект, сериализуемый в JSON; можно перетаскивать и цвета из виджетов цвета. См. новый раздел примера widget-overview
* `Функция` Пользовательское рисование: функции контуров (pathLineTo / pathArcTo / pathBezierCubicCurveTo / pathStroke / pathFillConvex и другие), pushClipRect / popClipRect для списков рисования и окон и новые фигуры: addEllipse, addNgon, addQuad и их залитые варианты, addBezierQuadratic, addRectFilledMultiColor, addConvexPolyFilled, addConcavePolyFilled, addImageQuad, addImageRounded. См. пример widget-overview
* `Функция` Имитация касаний: addMousePosEvent(x, y) и addMouseButtonEvent(button, down) позволяют скрипту действовать как палец на окне, например для автоматического тестирования интерфейса. Координаты - пиксели кадра, как в getMousePos, а не dp из createWindow; приложения под окном это не затрагивает

#### v1.14.0

###### 2026/10/30

* `Подсказка` Изменение поведения: полноэкранное окно, открытое через imgui.launch, теперь закрывается клавишей "Назад" (session.closeReason равен "back"). Чтобы окно осталось открытым, вызовите e.preventDefault() в session.on("back", e). Плавающие окна (launchFloaty) работают как прежде
* `Функция` Отладочные окна: showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow / showUserGuide (псевдонимы ShowMetricsWindow и т. д.) показывают встроенные инструменты Dear ImGui; с imgui.bool(true) окно можно скрыть кнопкой закрытия. В примере widget-overview появилось меню Debug, которое их открывает
* `Функция` Сортировка таблиц: в таблице с флагом Sortable нажатие на заголовок столбца меняет сортировку; tableGetSortSpecs() возвращает столбцы и направления сортировки (imgui.SortDirection), а specsDirty равен true только в том кадре, где сортировка изменилась. Четвёртый аргумент tableSetupColumn - пользовательский id столбца. dataTable сортирует строки при sortable: true, а функция compare столбца задаёт свой порядок; см. пример data-table-demo
* `Функция` Элементы с 2-4 значениями: dragFloat2 / 3 / 4, dragInt2 / 3 / 4, sliderFloat2 / 3 / 4, sliderInt2 / 3 / 4, inputFloat2 / 3 / 4, inputInt2 / 3 / 4, а также dragFloatRange2 / dragIntRange2 для диапазона от минимума до максимума и sliderAngle для угла (хранится в радианах, показывается в градусах). Значения передаются как {value: [x, y, z]}, imgui.floats(...) или новый imgui.ints(...); см. новый раздел примера widget-overview
* `Улучшение` При createWindow({debug: true}) обратный вызов отрисовки дольше 250 мс выводит console.warn с временем и советом перенести медленную работу (sleep, сеть, файлы) в threads.start, не чаще раза в 10 секунд; как это сделать, описано в docs/THREADING.md

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

Параметры сборки берутся из `version.properties`; текущий минимальный SDK равен 24, целевой SDK равен 37.

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
