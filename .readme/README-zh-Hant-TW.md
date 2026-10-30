<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>使用 Dear ImGui 建立浮動使用者介面</p>

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

### 語言 (Languages)

******

目前 README.md 支援以下語言:

- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- 繁體中文 (台灣) [zh-Hant-TW] # 目前
- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-en.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-fr.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-es.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ru.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ar.md)

******

### 簡介

******

ImGui 外掛將 [Dear ImGui](https://github.com/ocornut/imgui) 立即模式圖形函式庫帶入 AutoJs6, 在透明浮動視窗中以 OpenGL ES 渲染控制項, 適合為指令碼編寫除錯面板/參數調節器/執行狀態 HUD 等輕量浮動介面. 外掛透過一套精簡的 API 統一管理視窗建立/影格排程/觸控輸入和原生資源清理.

外掛在外掛中心啟用後, 指令碼直接使用全域物件 `imgui` (由 AutoJs6 註冊, 首次呼叫成員時載入外掛), 不需要 `plugins.load`; 需要 AutoJs6 6.8.0 或以上版本; 外掛比 AutoJs6 新時, AutoJs6 尚未登記的新成員要等外掛載入後 (首次使用 `imgui` 的任一成員時) 才會出現在 `imgui` 上, 渲染回呼的 `ui` 參數始終完整.

******

### 功能特性

******

- 自適應懸浮窗與 Activity 全螢幕工作階段, 支援自動點擊穿透、收合/展開、獨立懸浮按鈕、透明度/防擷取控制、版面持久化與生命週期事件.
- `launchPrivileged` 透過 AutoJs6 已管理的 Shizuku/root 提供明確正式 SurfaceFlinger 模式; 已驗證 Binder 將特權 Surface 交給現有完整渲染器, `/dev/input` 則提供觀察式指標輸入.
- 由 AutoJs6 直接註冊為全域 `imgui` 物件, 啟用外掛後無需載入步驟, 與 pinyin / mediainfo 等官方外掛一致.
- 透明浮動視窗: 尺寸/位置/影格率/字型可設定, 拖曳空白區域移動視窗, 雙指滑動與慣性捲動內容, 單指長按模擬右鍵. 數秒無輸入後自動降低影格率以省電, 螢幕關閉時暫停繪製.
- `inputText` 系列完整整合系統輸入法, 支援中文拼音組合輸入、自動顯示/隱藏軟鍵盤與常用編輯鍵.
- 視窗/分頁/樹狀節點/表格/彈窗/選單/工具提示與 60 餘個立即模式控制項, 含行動裝置風格 `toggle` 開關.
- 視覺與字型系統: 11 套 `Themes` 主題、批次樣式、圓角/邊框/陰影外觀、多字型堆疊、CJK 備援與 Material Icons 子集.
- 代管紋理支援檔案路徑、編碼位元組、Android `Bitmap` 與 AutoJs6 `Image`; `image` / `imageButton` 和三層 DrawList 可完成圖片顯示與浮動視窗自繪.
- 輕量 `imgui.ref(value)` / `{value: x}` 參照可用於所有具狀態控制項, 現有 Java 陣列參照輔助方法保持完全相容.
- 工作階段託管的 `logWindow`、堆疊 `toast`、Promise 對話框、閾值變色 `statsOverlay` 與可選取 CRUD `dataTable` 可直接組成偵錯介面.
- 常用 API 與常數列舉提供 PascalCase 別名 (如 `ui.Button`), 參數沿用外掛風格; 別名清單及與上游 C++ 簽章的差異見 [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md).
- 工程支援包含完整 TypeScript 宣告, 九個可執行範例, Android 渲染儀器測試, 無鎖輸入佇列, 可驗證的上游更新工具與 CI 發布自動化.
- 外掛資訊/使用說明/README 和 CHANGELOG 的十種語言本地化.

******

### 安裝與啟用

******

- 從 [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) 下載與裝置架構相符的 APK, 不確定架構時選擇 `universal` 通用套件.
- 安裝 APK 後開啟 AutoJs6, 在外掛管理頁面確認本外掛已被識別並處於啟用狀態.
- 在指令碼中直接呼叫 `imgui.createWindow(...)`; 首次使用需授予 AutoJs6 懸浮視窗權限.
- 使用 `launchPrivileged` 前請照常在 AutoJs6 內設定並授權 Root 或 Shizuku; 外掛直接重用該宿主狀態, 特權模式不需要懸浮視窗權限.

宿主版本要求: AutoJs6 版本號 (versionCode) 不低於 5935. 外掛支援 `arm64-v8a` / `armeabi-v7a` / `x86_64` / `x86` 四種架構, 最低系統版本為 Android 7.0 (API 24), 且裝置 GPU/驅動程式須支援 OpenGL ES 3.0.

******

### 快速開始

******

安裝並啟用外掛後, 建立可變參照物件並開啟浮動視窗:

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

可變控制項支援由 `imgui.ref(value)` 建立的輕量參照或一般 `{ value: ... }` 物件; 原有 `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` 輔助方法維持相容. `inputText` 聚焦後會自動顯示系統輸入法並支援中文組合輸入; 可用 `ime: false` 關閉自動 IME. 視窗的尺寸與位置使用 dp: `width`, `height`, `x`, `y` 選項, 工作階段欄位與事件資料都是如此, `fontSize` 也是 dp. 幀內座標是 px, 可用 `ui.dp()` / `ui.px()` 換算. 事件與按鈕回呼在腳本執行緒執行 (見 [THREADING.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/THREADING.md)), 與舊版本的差異見 [MIGRATION-1.12.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/MIGRATION-1.12.md). 拖曳空白區域可移動視窗 (`movable: false` 可固定); 雙指縱向滑動支援慣性捲動 (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`), 單指長按模擬右鍵 (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). 如果系統字型無法涵蓋所需字元, 可透過 `fontPath` 指定 TTF 或 OTF 字型檔案.

主題與字型: `setTheme` 接受 `Themes` 的 11 套預設, `setStyleProperties` 可批次設定 `StyleVar`; `createWindow` 也可傳入 `theme` / `appearance` / `style` / `shadow`. `fonts` 陣列可預載 assets (`asset://...`) 或檔案字型, 並以 `pushFont` / `withFont` 切換. 外掛會自動合併內建 CJK 備援與圖示子集, 可用 `Icons` / `icon(name)` 取得圖示字形.

紋理與自繪: 請在視窗工作階段就緒後呼叫 `createTexture` (通常於渲染回呼首次執行時建立). 傳回物件包含 `width` / `height`, `update(source)` (取代像素並保持控制代碼不變, 尺寸變更時 `width` / `height` 隨之更新) 與冪等的 `dispose()` / `close()`; 工作階段關閉時會自動釋放其餘紋理. `image` / `imageButton` 用於顯示紋理, `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` 提供常用繪圖原語. DrawList 座標採用 Surface 像素座標. 可直接傳入 AutoJs6 `images.read(...)` 與螢幕擷取所得的 `Image`, 也可傳入裝有 PNG 或 JPEG 資料的 `ArrayBuffer` 或型別陣列.

視窗工作階段: 懸浮窗預設採用 `TouchMode.Auto`, ImGui 根視窗保持可互動, Surface 空白區域則直接觸達下層應用程式; 也可用 `Touchable` 或 `Passthrough` 固定策略. 工作階段支援動態透明度/防擷取/觸控模式、收合為低幀率迷你懸浮球、建立獨立可拖曳 `addButtonEx`、跟隨 `AlwaysAutoResize` 內容、透過 `iniPath` 持久化版面配置, 並以 `on` / `once` / `off` 或 options 回呼訂閱事件. `imgui.launch(...)` 會在目前前景 AutoJs6 Activity 中建立全螢幕 Surface, `launchFloaty(...)` 則明確選擇懸浮窗. 每個指令碼引擎只擁有一個原生渲染工作階段, 但可在同一渲染回呼中用 `begin` / `withWindow` 建立任意多個 ImGui 根視窗; 新建工作階段會關閉舊工作階段. 渲染回呼或事件回呼擲出錯誤時以 `console.error` 輸出錯誤與呼叫堆疊 (同一錯誤連續出現只輸出一次) 並觸發 `error` 事件 (含 `error` / `phase` / `frame`); 沒有 `error` 監聽器時渲染錯誤會關閉工作階段 (`closeReason` 為 `render-error`), 有監聽器時略過本幀剩餘部分並繼續渲染. 選項 `debug: true` 以 `console.warn` 與 logcat 回報 `begin` 未配對 `end` 等用法錯誤, 並顯示 Metrics 與 Debug Log 視窗. `setTouchable` / `setGlobalAlpha` / `getComponent` 等全域方法作用於目前工作階段, 沒有作用中的工作階段時擲出 `imgui.<name>: no active session`. `imgui.launch` 工作階段中按返回鍵會關閉工作階段 (`closeReason` 為 `back`), 除非 `back` 監聽器呼叫 `event.preventDefault()`; 螢幕鍵盤顯示時返回鍵會先收起鍵盤. 懸浮視窗只在文字輸入取得焦點時收到返回鍵, 此時只收起鍵盤. `debug: true` 時, 渲染回呼耗時超過 250 ms 也會以 `console.warn` 提示改用 `threads.start` (每 10 秒最多一次).

高階元件會掛接到目前工作階段並在使用者渲染回呼後繪製: `logWindow` 提供等級著色, 清除, 匯出回呼與自動捲底; `toast` 提供定時定位提示; `alert` / `confirm` / `singleChoice` / `multiChoice` 回傳 Promise; `statsOverlay` 繪製幀耗時並顯示每個影格的工作耗時; `dataTable` 提供資料列選取與 CRUD. 九個內建範例 (`widget-overview` / `parameter-panel` / `log-hud` / `data-table-demo` / `theme-gallery` / `error-handling` / `background-task` / `large-list` / `texture-refresh`) 可透過 `listExamples` / `getExampleSource` 發現並用 `runExample` 啟動. AutoJs6 6.8 外掛中心尚未使用通用範例中繼資料, 在宿主支援前可直接執行下方呼叫:

```js
imgui.runExample("widget-overview");
```

******

### API 總覽

******

常用 API 另有 PascalCase 別名 (如 `ui.Button` 等價於 `ui.button`), 別名沿用外掛的參數風格 (例如可變值使用 `imgui.ref`), 與上游 C++ 簽章並非一一對應, 清單與差異見 [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md). 小駝峰方法對應同名 Dear ImGui 操作, 依功能分組如下:

- 工作階段執行階段: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, `density` / `dp` / `px` 單位換算, 以及工作階段級 `on` / `once` / `off` 與對應執行個體方法; 工作階段 `error` 事件回報回呼錯誤, `debug` 選項開啟偵錯模式; 省電相關的 `idleFps` / `idleDelay`, `setFps` / `setIdleFps` / `getFps` 與 `idle` / `active` 事件.
- 後端探測: `getBackendCapabilities` / `BackendStatus` 回報視窗, split-touch, 特權處理程序, direct input, Docking 與 Multi-Viewport 的可用性與正式環境就緒狀態, 不執行權限提升操作.
- 會話與視窗: `createWindow` / `closeWindow` / `withWindow` / `withChild` / `setNextWindowPos` / `setNextWindowSize` / `setNextWindowBgAlpha` 以及 `isWindowHovered` 等視窗狀態查詢.
- 文字與控制項: `text` / `textColored` / `textWrapped` / `separatorText` / `bulletText` / `labelText` / `button` / `arrowButton` / `invisibleButton` / `checkbox` / `toggle` / `radioButton` / `sliderFloat` / `sliderInt` / `vSliderFloat` / `dragFloat` / `dragInt` / `inputText` / `inputInt` / `inputFloat` / `inputTextMultiline` / `colorEdit3` / `colorEdit4` / `colorPicker4` / `colorButton` / `progressBar` / `plotLines` / `plotHistogram` 等. 多值控制項: `dragFloat2/3/4` / `dragInt2/3/4` / `sliderFloat2/3/4` / `sliderInt2/3/4` / `inputFloat2/3/4` / `inputInt2/3/4` / `dragFloatRange2` / `dragIntRange2` / `sliderAngle`.
- 容器與導覽: `withTabBar` / `withTabItem` / `withTreeNode` / `treeNodeEx` / `collapsingHeader` / `withTable` 表格族 / `withListBox` / `withCombo` / `selectable`, 以及用於長清單的 `listClipper`. 表格排序: `tableGetSortSpecs` / `SortDirection`, 以及 `dataTable` 的 `sortable: true`.
- 彈窗與選單: `openPopup` / `withPopup` / `withPopupModal` / `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` / `closeCurrentPopup` / `withMenuBar` / `withMenu` / `menuItem` / `setTooltip` / `setItemTooltip` / `withItemTooltip`.
- 樣式與版面配置: `styleColorsDark` / `styleColorsLight` / `styleColorsClassic` / `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` / `withGroup` / `withDisabled` / `withId` / `indent` / `sameLine` / `separator` / `spacing` / 游標與捲動控制族.
- 紋理與自繪: `createTexture` / `texture.update` / `destroyTexture` / `image` / `imageButton` / `colorU32`, 以及具備線段/矩形/圓形/三角形/文字/折線/貝茲曲線/影像原語的 `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList`. 路徑繪製: `pathLineTo` / `pathArcTo` / `pathArcToFast` / `pathBezierCubicCurveTo` / `pathBezierQuadraticCurveTo` / `pathRect` / `pathStroke` / `pathFillConvex` / `pathFillConcave`; 繪製清單與視窗的 `pushClipRect` / `popClipRect`; 更多圖形: `addEllipse` / `addNgon` / `addQuad` / `addBezierQuadratic` / `addRectFilledMultiColor` / `addConvexPolyFilled` / `addConcavePolyFilled` / `addImageQuad` / `addImageRounded`.
- 查詢與輸入: `isItemClicked` / `isItemHovered` / `isItemActive` / `isItemEdited` / `isMouseDown` / `getMousePos` / `calcTextSize` / `framerate` 等狀態查詢, `setKeyboardFocusHere` 主動聚焦, 以及 `addInputCharacters` / `sendKey` / `addMouseWheel` / `wantTextInput` 輸入原語. `InputTextFlags` 目前公開的所有旗標都會傳遞至 Dear ImGui; 依賴回呼的旗標未公開, `WordWrap` 僅用於多行輸入. 按鍵查詢與快速鍵: `isKeyDown` / `isKeyPressed` / `isKeyReleased` / `getKeyPressedAmount` / `getKeyName` / `isKeyChordPressed` / `shortcut` / `setNextItemShortcut`, 組合鍵寫成 `ui.Mod.Ctrl | ui.Key.S`. 剪貼簿: `getClipboardText` / `setClipboardText`. 用於介面自動化測試的指標注入: `addMousePosEvent` / `addMouseButtonEvent` (影格內像素, 與 `getMousePos` 相同).
- 拖放: `withDragDropSource` / `withDragDropTarget`, `beginDragDropSource` / `setDragDropPayload` / `endDragDropSource` / `beginDragDropTarget` / `acceptDragDropPayload` / `endDragDropTarget` / `getDragDropPayload`, 以及 `DragDropFlags`; 承載資料可以是字串, 數字或任何可 JSON 序列化的物件.
- 偵錯工具: `showMetricsWindow` / `showDebugLogWindow` / `showIdStackToolWindow` / `showStyleEditor` / `showAboutWindow` / `showUserGuide` 顯示 Dear ImGui 內建的工具視窗; 每個都可傳入一個可變布林參考, 按下關閉按鈕時它會變為 false.
- 高階元件與範例: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, 以及 `listExamples` / `getExampleSource` / `runExample`; 每個工作階段也提供同名工廠.
- 可變參照: 輕量 `imgui.ref` (或普通 `{value: x}` 物件), 以及相容的 Java 陣列輔助方法 `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.ints` / `imgui.strings`.
- 常數: `BackendStatus` / `Cond` / `WindowFlags` / `ChildFlags` / `InputTextFlags` / `SliderFlags` / `TreeNodeFlags` / `SelectableFlags` / `TabBarFlags` / `TabItemFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `SortDirection` / `Col` / `StyleVar` / `Themes` / `Appearance` / `Fonts` / `Icons` / `Dir` / `Key` / `Mod` / `InputFlags` / `DragDropFlags` / `MouseButton` / `ButtonFlags` / `TextureFlags` / `DrawListLayer` / `DrawFlags` / `LogLevel` / `ToastPosition` / `Limits`, 取值與 Dear ImGui 同名列舉或外掛常數表一一對應.

******

### 已知限制

******

- 同一指令碼引擎同一時刻僅支援一個原生渲染工作階段; 多面板情境應在該工作階段內建立多個 ImGui 根視窗. 新建懸浮窗或 Activity 工作階段會關閉舊工作階段.
- `imgui.launch` 需要目前存在處於 resumed 狀態的 AutoJs6 Activity; 指令碼需要脫離前景 Activity 持續渲染時請使用 `launchFloaty`.
- v1.9 特權模式固定全螢幕且只支援指標: 暫無 IME/按鍵、宿主層透明度/防擷取、收合、獨立 Android 按鈕或動態旋轉重建. Direct input 不使用 `EVIOCGRAB`, OEM SurfaceControl/SELinux 原則仍可能拒絕啟動; 能力探測不會執行 `su` 或要求 Shizuku 授權.

******

### 發行歷史

******

#### v1.15.0

###### 2026/10/30

* `新增` 鍵盤查詢: isKeyDown / isKeyPressed / isKeyReleased / getKeyPressedAmount / getKeyName / isKeyChordPressed, 以及快速鍵 shortcut 和 setNextItemShortcut. 組合鍵寫成 ui.Mod.Ctrl | ui.Key.S. Key 常數現在涵蓋整個鍵盤: A 到 Z, Digit0 到 Digit9, F1 到 F24, 數字鍵台等
* `新增` 剪貼簿: getClipboardText / setClipboardText 與宿主的 getClip / setClip 是同一個 Android 剪貼簿, 輸入框裡的 Ctrl+C / Ctrl+V 也一樣. 從 Android 10 起, 系統只允許擁有輸入焦點的應用程式讀取剪貼簿; docs/LIMITS.md 說明了這對懸浮視窗的影響
* `新增` 拖放: 用 beginDragDropSource / setDragDropPayload / beginDragDropTarget / acceptDragDropPayload 以及輔助函式 withDragDropSource / withDragDropTarget 把一個控制項拖到另一個控制項上 (DragDropFlags 設定選項). 承載資料可以是字串, 數字或任何可 JSON 序列化的物件, 顏色控制項的顏色也可以拖曳; 見範例 widget-overview 的新分區
* `新增` 自訂繪製: 路徑函式 (pathLineTo / pathArcTo / pathBezierCubicCurveTo / pathStroke / pathFillConvex 等), 繪製清單與視窗的 pushClipRect / popClipRect, 以及新圖形 addEllipse, addNgon, addQuad 及其填滿版本, addBezierQuadratic, addRectFilledMultiColor, addConvexPolyFilled, addConcavePolyFilled, addImageQuad, addImageRounded; 見範例 widget-overview
* `新增` 模擬觸控: addMousePosEvent(x, y) 與 addMouseButtonEvent(button, down) 讓腳本像手指一樣操作視窗, 例如自動測試介面. 座標是影格內像素, 與 getMousePos 相同, 不是 createWindow 的 dp; 不影響視窗下方的應用程式

#### v1.14.0

###### 2026/10/30

* `提示` 行為變更: 以 imgui.launch 開啟的全螢幕視窗現在按返回鍵會關閉視窗 (session.closeReason 為 "back"). 若要保留視窗, 請在 session.on("back", e) 中呼叫 e.preventDefault(). 懸浮視窗 (launchFloaty) 不變
* `新增` 偵錯工具視窗: showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow / showUserGuide (別名 ShowMetricsWindow 等) 顯示 Dear ImGui 內建的偵錯工具; 傳入 imgui.bool(true) 後可用關閉按鈕隱藏. 範例 widget-overview 新增 Debug 選單, 可開啟這些視窗
* `新增` 表格排序: 表格帶有 Sortable 旗標時輕觸欄標題即可切換排序; tableGetSortSpecs() 傳回排序欄與方向 (imgui.SortDirection), specsDirty 只在排序變化的那一幀為 true. tableSetupColumn 的第四個參數是欄的使用者 id. dataTable 設定 sortable: true 即可依欄排序, 欄的 compare 函式可自訂順序; 請參閱範例 data-table-demo
* `新增` 多值控制項: dragFloat2 / 3 / 4, dragInt2 / 3 / 4, sliderFloat2 / 3 / 4, sliderInt2 / 3 / 4, inputFloat2 / 3 / 4, inputInt2 / 3 / 4, 以及編輯最小值與最大值的 dragFloatRange2 / dragIntRange2 和編輯角度的 sliderAngle (以弧度儲存, 以度顯示). 數值以 {value: [x, y, z]}, imgui.floats(...) 或新增的 imgui.ints(...) 傳入; 請參閱範例 widget-overview 的新區段
* `優化` createWindow({debug: true}) 時, 渲染回呼耗時超過 250 毫秒會以 console.warn 提示耗時, 並建議把 sleep, 網路, 檔案等慢速操作移到 threads.start, 每 10 秒最多提示一次; docs/THREADING.md 說明做法

#### v1.13.0

###### 2026/10/30

* `提示` 行為變更: 為了省電, 視窗在 3 秒內沒有觸控或按鍵輸入後每秒只繪製 10 個影格, 螢幕關閉或鎖定時停止繪製; 再次觸控後立即恢復正常影格率. 若視窗有動畫, 或顯示不靠輸入就會變化的資料 (計時器, 圖表, 進度列), 請在 createWindow 傳入 idleFps: 0 或呼叫 session.setIdleFps(0) 保持正常影格率
* `新增` ui.listClipper(itemCount, options, callback) (別名 ListClipper) 只繪製可見的列, 10 萬列的清單也能流暢捲動; 請參閱新範例 large-list
* `新增` 影格率控制: createWindow 選項 idleFps / idleDelay, session.setFps / setIdleFps / getFps, 工作階段事件 idle / active 以及欄位 idle / paused
* `新增` texture.update(source) 取代紋理的影像並保持控制代碼不變, 顯示它的 image 呼叫無須修改; 尺寸變更時 texture.width / height 隨之更新. 請參閱新範例 texture-refresh, 每秒重新整理兩次預覽
* `新增` createTexture 與 texture.update 也接受裝有 PNG 或 JPEG 資料的 ArrayBuffer 或型別陣列 (如 Uint8Array)
* `新增` statsOverlay 顯示每個影格的工作耗時 (繪製所用時間, 不含等待螢幕更新), snapshot() 以 workTime 傳回該值
* `優化` docs/FRAME-LOOP.md 說明影格率與省電機制, docs/LIMITS.md 補充 listClipper 的限制

##### 更多發行歷史可參閱

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-zh-Hant-TW.md)

******

### 建置

******

```powershell
.\gradlew.bat :app:assembleDebug
```

產生帶 CRC32 摘要檔名的 Release 建置:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

驗證原生原始碼清單/JNI 宣告一致性/單元測試與 ABI 分包完整性:

```powershell
.\gradlew.bat :app:verifyImGuiDebugApks
```

建置參數來自 `version.properties`, 目前最低 SDK 為 24, 目標 SDK 為 37.

******

### 專案結構

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

`index.js` 是指令碼引擎側的 `imgui` 模組, `ImGuiBridge.cpp` 是 Dear ImGui 的 JNI 橋接. `strings.xml` 提供外掛描述本地化, `plugin_instruction.md` 提供宿主側展示的外掛使用說明. README 與 CHANGELOG 由 `.python/generate_markdown.py` 根據 JSON 來源檔案產生, 修改文件時請編輯 JSON 來源檔案而非產生的產物.

******

### 相關連結

******

- AutoJs6 專案: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui 官方專案: https://github.com/ocornut/imgui
- 能力擴充路線圖 (Roadmap): https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)
