Загружайте плагин явно, чтобы сценарий работал при любой конфигурации хоста. В AutoJs6 6.8 и новее его также можно автоматически подключить как глобальный объект `imgui` в настройках Центра плагинов.

Создайте изменяемые ссылки перед открытием плавающего окна:

```js
var imgui = plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
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
            ui.toggle("Включено", enabled);
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
    theme: imgui.Themes.ModernDark,
    appearance: imgui.Appearance.Rounded,
    fps: 60
});
```

`width`, `height` и `fontSize` используют единицы без привязки к плотности экрана. Фокус на `inputText` автоматически открывает системный IME с поддержкой составления. Перетаскивайте пустую область для перемещения окна; вертикальный жест двумя пальцами прокручивает с инерцией, а долгое нажатие одним пальцем создаёт правый клик. Передайте `movable: false`, чтобы отключить перетаскивание. Используйте `fontPath`, чтобы загрузить подходящий файл TTF или OTF, если системный шрифт не покрывает нужные символы.

Для оформления используйте `Themes` / `setTheme`, `setStyleProperties` и `Appearance`. `createWindow.fonts` загружает шрифты из assets или файлов для `pushFont` / `withFont`; CJK-резерв и Material Icons объединяются автоматически и доступны через `Icons` / `icon(name)`.

`createTexture` принимает путь, закодированные байты, Android `Bitmap` или AutoJs6 `Image` из `images.read` либо снимка экрана. Показывайте текстуру через `image` / `imageButton` и вызывайте `dispose()`, когда она больше не нужна; оставшиеся текстуры сессия освобождает автоматически. `getWindowDrawList`, `getForegroundDrawList` и `getBackgroundDrawList` предоставляют примитивы линий, фигур, текста и изображений в пиксельных координатах Surface.

Оверлей по умолчанию использует `TouchMode.Auto`: окна ImGui остаются интерактивными, а пустые области пропускают касания. Сессия позволяет менять касания, прозрачность и защиту, сворачиваться в мини-пузырь с низким FPS, создавать отдельные `addButtonEx`, сохранять расположение через `iniPath` и публиковать события. `imgui.launch(...)` использует полноэкранный Surface в текущей resumed Activity AutoJs6. Одна нативная сессия может содержать несколько корней `begin` / `withWindow`; новая сессия закрывает предыдущую.

`setMoreTouch(true)` включает Android split-touch для главного окна и отдельных кнопок. `launchPrivileged(callback, {backend: "auto"})` явно выбирает production-режим SurfaceFlinger, повторно использует авторизацию Shizuku/root из AutoJs6 и не требует разрешения оверлея; `/dev/input` только наблюдает и не захватывает сенсорный экран. `getBackendCapabilities()` сообщает состояние хоста без повышения привилегий.

Доступны таблицы, контекстные окна, меню, всплывающие подсказки, стеки стилей и более 60 элементов управления; `withTable`, `withPopupModal`, `withContextItem` и `withMenuBar` безопасно связывают парные вызовы begin/end. Полный обзор API см. в README и Roadmap проекта.

Элементы управления с состоянием также принимают лёгкие ссылки из `imgui.ref(value)` и обычные объекты `{ value: ... }`; прежние помощники `bool`, `float`, `int`, `string` и массивов цветов остаются совместимыми. Управляемые сессией компоненты `logWindow`, `toast`, диалоги Promise, `statsOverlay` и `dataTable` отрисовываются после пользовательского callback и автоматически закрываются вместе с сессией.

Запускайте любой из пяти примеров через `imgui.runExample("widget-overview")`, `"parameter-panel"`, `"log-hud"`, `"data-table-demo"` или `"theme-gallery"`; получите список через `listExamples`, а исходный код — через `getExampleSource`. Центр плагинов AutoJs6 6.8 пока не предоставляет универсального запуска примера одним нажатием.

Версия 1.7 также публикует полные декларации редактора в `types/imgui.d.ts`. Пределы доступны через `imgui.Limits` (64 КиБ текста, 512 элементов выбора и 2 048 входных событий); превышающие вводы отклоняются без скрытого усечения.
