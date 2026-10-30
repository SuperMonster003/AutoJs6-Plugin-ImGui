<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>使用 Dear ImGui 建立浮動用戶介面</p>

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
- 繁體中文 (香港) [zh-Hant-HK] # 目前
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
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

ImGui 插件將 [Dear ImGui](https://github.com/ocornut/imgui) 即時模式圖形程式庫帶入 AutoJs6, 在透明浮動視窗中以 OpenGL ES 渲染控制項, 適合為腳本編寫除錯面板/參數調節器/運行狀態 HUD 等輕量浮動介面. 插件透過一套精簡的 API 統一管理視窗建立/影格排程/觸控輸入和原生資源清理.

插件在插件中心啟用後, 腳本直接使用全域物件 `imgui` (由 AutoJs6 註冊, 首次呼叫成員時載入插件), 不需要 `plugins.load`; 需要 AutoJs6 6.8.0 或以上版本; 插件比 AutoJs6 新時, AutoJs6 尚未登記的新成員要等插件載入後 (首次使用 `imgui` 的任一成員時) 才會出現在 `imgui` 上, 渲染回調的 `ui` 參數始終完整.

******

### 功能特性

******

- 自適應懸浮窗與 Activity 全屏會話, 支援自動點擊穿透、收起/展開、獨立懸浮按鈕、透明度/防截屏控制、佈局持久化與生命週期事件.
- `launchPrivileged` 透過 AutoJs6 已管理的 Shizuku/root 提供明確生產級 SurfaceFlinger 模式; 已鑑權 Binder 把特權 Surface 交給現有完整渲染器, `/dev/input` 則提供觀察式指標輸入.
- 由 AutoJs6 直接註冊為全域 `imgui` 物件, 啟用插件後無需載入步驟, 與 pinyin / mediainfo 等官方插件一致.
- 透明浮動視窗: 尺寸/位置/影格率/字型可設定, 拖動空白區域移動視窗, 雙指滑動與慣性捲動內容, 單指長按模擬右鍵. 數秒無輸入後自動降低影格率以省電, 熄屏時暫停繪製.
- `inputText` 系列完整整合系統輸入法, 支援中文拼音組合輸入、自動顯示/隱藏軟鍵盤與常用編輯鍵.
- 視窗/分頁/樹狀節點/表格/彈窗/選單/工具提示與 60 餘個即時模式控制項, 含流動裝置風格 `toggle` 開關.
- 視覺與字型系統: 11 套 `Themes` 主題、批量樣式、圓角/邊框/陰影外觀、多字型堆疊、CJK 後備與 Material Icons 子集.
- 託管紋理支援檔案路徑、編碼位元組、Android `Bitmap` 與 AutoJs6 `Image`; `image` / `imageButton` 和三層 DrawList 可完成圖片顯示與浮窗自繪.
- 輕量 `imgui.ref(value)` / `{value: x}` 參照可用於所有具狀態控制項, 現有 Java 陣列參照輔助方法保持完全相容.
- 會話託管的 `logWindow`、堆疊 `toast`、Promise 對話框、閾值變色 `statsOverlay` 與可選取 CRUD `dataTable` 可直接組成除錯介面.
- 常用 API 與常數列舉提供 PascalCase 別名 (如 `ui.Button`), 參數沿用插件風格; 別名清單及與上游 C++ 簽名的差異見 [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md).
- 工程支援包含完整 TypeScript 聲明, 九個可執行範例, Android 渲染儀器測試, 無鎖輸入隊列, 可驗證的上游更新工具與 CI 發佈自動化.
- 插件資訊/使用說明/README 和 CHANGELOG 的十種語言本地化.

******

### 安裝與啟用

******

- 從 [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) 下載與裝置架構相符的 APK, 不確定架構時選擇 `universal` 通用套件.
- 安裝 APK 後開啟 AutoJs6, 在插件管理頁面確認本插件已被識別並處於啟用狀態.
- 在腳本中直接呼叫 `imgui.createWindow(...)`; 首次使用需授予 AutoJs6 懸浮視窗權限.
- 使用 `launchPrivileged` 前請如常在 AutoJs6 內設定並授權 Root 或 Shizuku; 插件直接重用該宿主狀態, 特權模式毋須懸浮視窗權限.

宿主版本要求: AutoJs6 版本號 (versionCode) 不低於 5935. 插件支援 `arm64-v8a` / `armeabi-v7a` / `x86_64` / `x86` 四種架構, 最低系統版本為 Android 7.0 (API 24), 且裝置 GPU/驅動須支援 OpenGL ES 3.0.

******

### 快速開始

******

安裝並啟用插件後, 建立可變參照物件並開啟浮動視窗:

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

可變控制項支援由 `imgui.ref(value)` 建立的輕量引用或普通 `{ value: ... }` 物件; 原有 `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` 輔助方法保持相容. `inputText` 聚焦後會自動顯示系統輸入法並支援中文組合輸入; 可用 `ime: false` 停用自動 IME. 視窗的尺寸與位置使用 dp: `width`, `height`, `x`, `y` 選項, 會話欄位與事件資料都是如此, `fontSize` 也是 dp. 幀內座標是 px, 可用 `ui.dp()` / `ui.px()` 換算. 事件與按鈕回調在腳本線程執行 (見 [THREADING.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/THREADING.md)), 與舊版本的差異見 [MIGRATION-1.12.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/MIGRATION-1.12.md). 拖動空白區域可移動視窗 (`movable: false` 可固定); 雙指縱向滑動支援慣性捲動 (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`), 單指長按模擬右鍵 (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). 如果系統字型無法涵蓋所需字元, 可透過 `fontPath` 指定 TTF 或 OTF 字型檔案.

主題與字型: `setTheme` 接受 `Themes` 的 11 套預設, `setStyleProperties` 可批量設定 `StyleVar`; `createWindow` 亦可傳入 `theme` / `appearance` / `style` / `shadow`. `fonts` 陣列可預載 assets (`asset://...`) 或檔案字型, 並以 `pushFont` / `withFont` 切換. 插件會自動合併內置 CJK 後備與圖示子集, 可用 `Icons` / `icon(name)` 取得圖示字形.

紋理與自繪: 請在視窗會話就緒後呼叫 `createTexture` (通常於渲染回調首次執行時建立). 返回物件包含 `width` / `height`, `update(source)` (替換像素並保持句柄不變, 尺寸變化時 `width` / `height` 隨之更新) 與冪等的 `dispose()` / `close()`; 會話關閉時會自動釋放餘下紋理. `image` / `imageButton` 用於顯示紋理, `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` 提供常用繪圖原語. DrawList 座標採用 Surface 像素座標. 可直接傳入 AutoJs6 `images.read(...)` 與截圖所得的 `Image`, 亦可傳入載有 PNG 或 JPEG 資料的 `ArrayBuffer` 或類型化陣列.

視窗會話: 懸浮窗預設採用 `TouchMode.Auto`, ImGui 根視窗保持可互動, Surface 空白區域則直接觸達下層應用; 亦可用 `Touchable` 或 `Passthrough` 固定策略. 會話支援動態透明度/防截屏/觸控模式、收起為低幀率迷你懸浮球、建立獨立可拖動 `addButtonEx`、跟隨 `AlwaysAutoResize` 內容、透過 `iniPath` 持久化佈局, 並以 `on` / `once` / `off` 或 options 回調訂閱事件. `imgui.launch(...)` 會在目前前台 AutoJs6 Activity 中建立全屏 Surface, `launchFloaty(...)` 則明確選擇懸浮窗. 每個腳本引擎只擁有一個原生渲染會話, 但可在同一渲染回調中用 `begin` / `withWindow` 建立任意多個 ImGui 根視窗; 新建會話會關閉舊會話. 渲染回調或事件回調拋出錯誤時以 `console.error` 輸出錯誤與調用堆疊 (同一錯誤連續出現只輸出一次) 並觸發 `error` 事件 (含 `error` / `phase` / `frame`); 沒有 `error` 監聽器時渲染錯誤會關閉會話 (`closeReason` 為 `render-error`), 有監聽器時略過本幀餘下部分並繼續渲染. 選項 `debug: true` 以 `console.warn` 與 logcat 報告 `begin` 未配對 `end` 等用法錯誤, 並顯示 Metrics 與 Debug Log 視窗. `setTouchable` / `setGlobalAlpha` / `getComponent` 等全域方法作用於目前會話, 沒有活動會話時拋出 `imgui.<name>: no active session`. `imgui.launch` 會話中按返回鍵會關閉會話 (`closeReason` 為 `back`), 除非 `back` 監聽器呼叫 `event.preventDefault()`; 軟鍵盤顯示時返回鍵先收起鍵盤. 懸浮窗只在文字輸入取得焦點時收到返回鍵, 此時只收起鍵盤. `debug: true` 時, 渲染回呼耗時超過 250 ms 亦會以 `console.warn` 提示改用 `threads.start` (每 10 秒最多一次).

高階組件會掛接到目前會話並在使用者渲染回調後繪製: `logWindow` 提供等級着色, 清空, 匯出回調及自動捲底; `toast` 提供定時定位提示; `alert` / `confirm` / `singleChoice` / `multiChoice` 傳回 Promise; `statsOverlay` 繪製幀耗時並顯示每幀工作耗時; `dataTable` 提供資料列選取與 CRUD. 九個內置範例 (`widget-overview` / `parameter-panel` / `log-hud` / `data-table-demo` / `theme-gallery` / `error-handling` / `background-task` / `large-list` / `texture-refresh`) 可透過 `listExamples` / `getExampleSource` 發現並用 `runExample` 啟動. AutoJs6 6.8 插件中心尚未使用通用範例中繼資料, 在宿主支援前可直接執行下方呼叫:

```js
imgui.runExample("widget-overview");
```

******

### API 總覽

******

常用 API 另有 PascalCase 別名 (如 `ui.Button` 等價於 `ui.button`), 別名沿用插件的參數風格 (例如可變值使用 `imgui.ref`), 與上游 C++ 簽名並非一一對應, 清單與差異見 [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md). 小駝峰方法對應同名 Dear ImGui 操作, 按功能分組如下:

- 會話運行時: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, `density` / `dp` / `px` 單位換算, 以及會話級 `on` / `once` / `off` 與相應實例方法; 會話 `error` 事件報告回調錯誤, `debug` 選項開啟除錯模式; 省電相關的 `idleFps` / `idleDelay`, `setFps` / `setIdleFps` / `getFps` 與 `idle` / `active` 事件.
- 後端探測: `getBackendCapabilities` / `BackendStatus` 報告視窗, split-touch, 特權程序, direct input, Docking 與 Multi-Viewport 的可用性和正式環境就緒狀態, 不執行提權操作.
- 會話與視窗: `createWindow` / `closeWindow` / `withWindow` / `withChild` / `setNextWindowPos` / `setNextWindowSize` / `setNextWindowBgAlpha` 以及 `isWindowHovered` 等視窗狀態查詢.
- 文字與控制項: `text` / `textColored` / `textWrapped` / `separatorText` / `bulletText` / `labelText` / `button` / `arrowButton` / `invisibleButton` / `checkbox` / `toggle` / `radioButton` / `sliderFloat` / `sliderInt` / `vSliderFloat` / `dragFloat` / `dragInt` / `inputText` / `inputInt` / `inputFloat` / `inputTextMultiline` / `colorEdit3` / `colorEdit4` / `colorPicker4` / `colorButton` / `progressBar` / `plotLines` / `plotHistogram` 等. 多值控制項: `dragFloat2/3/4` / `dragInt2/3/4` / `sliderFloat2/3/4` / `sliderInt2/3/4` / `inputFloat2/3/4` / `inputInt2/3/4` / `dragFloatRange2` / `dragIntRange2` / `sliderAngle`.
- 容器與導覽: `withTabBar` / `withTabItem` / `withTreeNode` / `treeNodeEx` / `collapsingHeader` / `withTable` 表格族 / `withListBox` / `withCombo` / `selectable`, 以及用於長清單的 `listClipper`. 表格排序: `tableGetSortSpecs` / `SortDirection`, 以及 `dataTable` 的 `sortable: true`.
- 彈窗與選單: `openPopup` / `withPopup` / `withPopupModal` / `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` / `closeCurrentPopup` / `withMenuBar` / `withMenu` / `menuItem` / `setTooltip` / `setItemTooltip` / `withItemTooltip`.
- 樣式與版面配置: `styleColorsDark` / `styleColorsLight` / `styleColorsClassic` / `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` / `withGroup` / `withDisabled` / `withId` / `indent` / `sameLine` / `separator` / `spacing` / 游標與捲動控制族.
- 紋理與自繪: `createTexture` / `texture.update` / `destroyTexture` / `image` / `imageButton` / `colorU32`, 以及具備線段/矩形/圓形/三角形/文字/折線/貝茲曲線/圖像原語的 `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList`.
- 查詢與輸入: `isItemClicked` / `isItemHovered` / `isItemActive` / `isItemEdited` / `isMouseDown` / `getMousePos` / `calcTextSize` / `framerate` 等狀態查詢, `setKeyboardFocusHere` 主動聚焦, 以及 `addInputCharacters` / `sendKey` / `addMouseWheel` / `wantTextInput` 輸入原語. `InputTextFlags` 目前公開的所有旗標都會傳遞至 Dear ImGui; 依賴回呼的旗標未公開, `WordWrap` 僅用於多行輸入.
- 除錯工具: `showMetricsWindow` / `showDebugLogWindow` / `showIdStackToolWindow` / `showStyleEditor` / `showAboutWindow` / `showUserGuide` 顯示 Dear ImGui 內建的工具視窗; 每個都可傳入一個可變布林參照, 按下關閉按鈕時它變為 false.
- 高階組件與範例: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, 以及 `listExamples` / `getExampleSource` / `runExample`; 每個會話亦提供同名工廠.
- 可變參照: 輕量 `imgui.ref` (或普通 `{value: x}` 物件), 以及相容的 Java 陣列輔助方法 `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.ints` / `imgui.strings`.
- 常數: `BackendStatus` / `Cond` / `WindowFlags` / `ChildFlags` / `InputTextFlags` / `SliderFlags` / `TreeNodeFlags` / `SelectableFlags` / `TabBarFlags` / `TabItemFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `SortDirection` / `Col` / `StyleVar` / `Themes` / `Appearance` / `Fonts` / `Icons` / `Dir` / `Key` / `MouseButton` / `ButtonFlags` / `TextureFlags` / `DrawListLayer` / `DrawFlags` / `LogLevel` / `ToastPosition` / `Limits`, 取值與 Dear ImGui 同名列舉或插件常數表一一對應.

******

### 已知限制

******

- 同一腳本引擎同一時刻僅支援一個原生渲染會話; 多面板場景應在該會話內建立多個 ImGui 根視窗. 新建懸浮窗或 Activity 會話會關閉舊會話.
- `imgui.launch` 需要目前存在處於 resumed 狀態的 AutoJs6 Activity; 腳本需要脫離前台 Activity 持續渲染時請使用 `launchFloaty`.
- v1.9 特權模式固定全屏且只支援指標: 暫無 IME/按鍵、宿主層透明度/防截屏、收起、獨立 Android 按鈕或動態旋轉重建. Direct input 不使用 `EVIOCGRAB`, OEM SurfaceControl/SELinux 政策仍可能拒絕啟動; 能力探測不會執行 `su` 或要求 Shizuku 授權.

******

### 發行歷史

******

#### v1.14.0

###### 2026/10/30

* `提示` 行為變更: 以 imgui.launch 開啟的全螢幕視窗現在按返回鍵會關閉視窗 (session.closeReason 為 "back"). 如要保留視窗, 請在 session.on("back", e) 中呼叫 e.preventDefault(). 懸浮窗 (launchFloaty) 不變
* `新增` 除錯工具視窗: showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow / showUserGuide (別名 ShowMetricsWindow 等) 顯示 Dear ImGui 內建的除錯工具; 傳入 imgui.bool(true) 後可用關閉按鈕隱藏. 範例 widget-overview 新增 Debug 選單, 可開啟這些視窗
* `新增` 表格排序: 表格帶 Sortable 旗標時點按欄標題即可切換排序; tableGetSortSpecs() 傳回排序欄與方向 (imgui.SortDirection), specsDirty 只在排序變化的那一幀為 true. tableSetupColumn 的第四個參數是欄的使用者 id. dataTable 設 sortable: true 即可按欄排序, 欄的 compare 函數可自訂順序; 見範例 data-table-demo
* `新增` 多值控制項: dragFloat2 / 3 / 4, dragInt2 / 3 / 4, sliderFloat2 / 3 / 4, sliderInt2 / 3 / 4, inputFloat2 / 3 / 4, inputInt2 / 3 / 4, 以及編輯最小值與最大值的 dragFloatRange2 / dragIntRange2 和編輯角度的 sliderAngle (以弧度儲存, 以度顯示). 數值以 {value: [x, y, z]}, imgui.floats(...) 或新增的 imgui.ints(...) 傳入; 見範例 widget-overview 的新分區
* `優化` createWindow({debug: true}) 時, 渲染回呼耗時超過 250 毫秒會以 console.warn 提示耗時, 並建議把 sleep, 網絡, 檔案等慢操作移到 threads.start, 每 10 秒最多提示一次; docs/THREADING.md 說明做法

#### v1.13.0

###### 2026/10/30

* `提示` 行為變更: 為了省電, 視窗在 3 秒內沒有觸控或按鍵輸入後每秒只繪製 10 個影格, 螢幕關閉或鎖屏時停止繪製; 再次觸控後立即恢復正常影格率. 如果視窗有動畫, 或顯示不靠輸入就會變化的資料 (計時器, 圖表, 進度條), 請向 createWindow 傳入 idleFps: 0 或呼叫 session.setIdleFps(0) 保持正常影格率
* `新增` ui.listClipper(itemCount, options, callback) (別名 ListClipper) 只繪製可見的列, 10 萬列的清單也能流暢捲動; 見新範例 large-list
* `新增` 影格率控制: createWindow 選項 idleFps / idleDelay, session.setFps / setIdleFps / getFps, 工作階段事件 idle / active 以及欄位 idle / paused
* `新增` texture.update(source) 替換紋理的圖像並保持句柄不變, 顯示它的 image 呼叫無須修改; 尺寸變化時 texture.width / height 隨之更新. 見新範例 texture-refresh, 每秒更新兩次預覽
* `新增` createTexture 與 texture.update 亦接受載有 PNG 或 JPEG 資料的 ArrayBuffer 或類型化陣列 (如 Uint8Array)
* `新增` statsOverlay 顯示每個影格的工作耗時 (繪製所用時間, 不含等待螢幕更新), snapshot() 以 workTime 返回該值
* `優化` docs/FRAME-LOOP.md 說明影格率與省電機制, docs/LIMITS.md 補充 listClipper 的限制

#### v1.12.0

###### 2026/10/29

* `提示` 不兼容變更: 視窗的位置與尺寸統一改用 dp. createWindow 的 x / y, Session 的 x / y / width / height / displayWidth / displayHeight, setPosition / setSize, 事件資料以及懸浮按鈕的 x / y 以前是 px; 幀內座標仍是 px. 腳本的改法見 docs/MIGRATION-1.12.md
* `提示` 不兼容變更: 參數有誤 (類型不對, NaN, 數字字串或超出範圍) 時改為拋出 TypeError 或 RangeError, 訊息寫明方法名與參數名, 例如 `imgui.sliderFloat: argument "max" must be a finite number`, 不再靜默轉換或截斷; fps, alpha, fontSize 等視窗選項同樣檢查
* `提示` 不兼容變更: Session 與懸浮按鈕的欄位改為唯讀 (嚴格模式下賦值會拋出錯誤), 請改用對應的 set 方法. FloatingButton.setPosition 不再接受 source 參數; 懸浮按鈕顏色傳數字時與其他 imgui 顏色一樣按 0xAABBGGRR (即 colorU32 的返回值) 解讀, 不再按 Android ARGB 解讀
* `提示` 不兼容變更: 工作階段事件, 懸浮按鈕回調與對話框結果改在腳本線程 (繪製回調所在的線程) 執行, 不再在 Android UI 線程執行, 詳見 docs/THREADING.md
* `新增` imgui.dp() / imgui.px() (別名 Dp / Px) 在 dp 與 px 之間換算, imgui.density 提供每 dp 對應的 px 數
* `新增` 所有顏色參數都接受打包整數, [r, g, b, a], {r, g, b, a} 或 "#rrggbbaa", 包括 textColored / pushStyleColor / setStyleColor / colorButton / tableSetBgColor; 分別傳入 r, g, b, a 的寫法仍然可用
* `新增` 範例 background-task: 工作線程執行耗時任務, 視窗照常繪製, 附進度顯示與取消
* `新增` 文件 docs/THREADING.md 說明各回調在哪個線程執行以及如何在背景執行耗時任務, docs/MIGRATION-1.12.md 列出升級到本版本時腳本需要的修改
* `修復` 事件回調與懸浮按鈕回調可能與繪製回調同時執行, 且在其中調用 sleep 會出錯的問題
* `修復` 調用 imgui.setTheme 後 Session.theme 不變的問題
* `修復` 拖動視窗時 moved 事件的 source 為 api 而不是 drag 的問題
* `優化` 範例改用 ui.dp(), 不再手動乘以 window.density
* `優化` TypeScript 聲明寫明每個尺寸, 位置與選項的單位和取值範圍, 並把 Session 與懸浮按鈕的欄位標為唯讀
* `優化` 每個 GitHub Release 附帶 SHA256SUMS 檔案, 方便驗證下載的 APK

##### 更多發行歷史可參閱

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-zh-Hant-HK.md)

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

驗證原生源碼清單/JNI 宣告一致性/單元測試與 ABI 分包完整性:

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

`index.js` 是腳本引擎側的 `imgui` 模組, `ImGuiBridge.cpp` 是 Dear ImGui 的 JNI 橋接. `strings.xml` 提供插件描述本地化, `plugin_instruction.md` 提供宿主側展示的插件使用說明. README 與 CHANGELOG 由 `.python/generate_markdown.py` 根據 JSON 來源檔案產生, 修改文件時請編輯 JSON 來源檔案而非產生的產物.

******

### 相關連結

******

- AutoJs6 專案: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui 官方專案: https://github.com/ocornut/imgui
- 能力擴展路線圖 (Roadmap): https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)
