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

兼容性最佳的入口是 `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")`. AutoJs6 6.8 或以上版本亦可在插件中心設定中按需啟用自動掛載, 並將物件名稱設為 `imgui`; 只有啟用後, 腳本才可直接使用同名全域物件.

******

### 功能特性

******

- 自適應懸浮窗與 Activity 全屏會話, 支援自動點擊穿透、收起/展開、獨立懸浮按鈕、透明度/防截屏控制、佈局持久化與生命週期事件.
- `launchPrivileged` 透過 AutoJs6 已管理的 Shizuku/root 提供明確生產級 SurfaceFlinger 模式; 已鑑權 Binder 把特權 Surface 交給現有完整渲染器, `/dev/input` 則提供觀察式指標輸入.
- 預設透過穩定的 `plugins.load` 入口載入, 無需預先設定宿主掛載; 亦可啟用 AutoJs6 自動掛載, 將相同 API 公開為全域 `imgui` 物件.
- 透明浮動視窗: 尺寸/位置/影格率/字型可設定, 拖動空白區域移動視窗, 雙指滑動與慣性捲動內容, 單指長按模擬右鍵.
- `inputText` 系列完整整合系統輸入法, 支援中文拼音組合輸入、自動顯示/隱藏軟鍵盤與常用編輯鍵.
- 視窗/分頁/樹狀節點/表格/彈窗/選單/工具提示與 60 餘個即時模式控制項, 含流動裝置風格 `toggle` 開關.
- 視覺與字型系統: 11 套 `Themes` 主題、批量樣式、圓角/邊框/陰影外觀、多字型堆疊、CJK 後備與 Material Icons 子集.
- 託管紋理支援檔案路徑、編碼位元組、Android `Bitmap` 與 AutoJs6 `Image`; `image` / `imageButton` 和三層 DrawList 可完成圖片顯示與浮窗自繪.
- 輕量 `imgui.ref(value)` / `{value: x}` 參照可用於所有具狀態控制項, 現有 Java 陣列參照輔助方法保持完全相容.
- 會話託管的 `logWindow`、堆疊 `toast`、Promise 對話框、閾值變色 `statsOverlay` 與可選取 CRUD `dataTable` 可直接組成除錯介面.
- 常數列舉與 PascalCase 方法別名和 Dear ImGui 原始命名保持一致, 遷移零成本.
- 工程支援包含完整 TypeScript 聲明、五個可執行範例、Android 渲染儀器測試、無鎖輸入隊列、可驗證的上游更新工具與 CI 發佈自動化.
- 插件資訊/使用說明/README 和 CHANGELOG 的十種語言本地化.

******

### 安裝與啟用

******

- 從 [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) 下載與裝置架構相符的 APK, 不確定架構時選擇 `universal` 通用套件.
- 安裝 APK 後開啟 AutoJs6, 在插件管理頁面確認本插件已被識別並處於啟用狀態.
- 在腳本中呼叫 `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")` 載入插件, 再呼叫 `imgui.createWindow(...)`; 首次使用需授予 AutoJs6 懸浮視窗權限.
- 使用 `launchPrivileged` 前請如常在 AutoJs6 內設定並授權 Root 或 Shizuku; 插件直接重用該宿主狀態, 特權模式毋須懸浮視窗權限.

宿主版本要求: AutoJs6 版本號 (versionCode) 不低於 3853. 插件支援 `arm64-v8a` / `armeabi-v7a` / `x86_64` / `x86` 四種架構, 最低系統版本為 Android 7.0 (API 24), 且裝置 GPU/驅動須支援 OpenGL ES 3.0.

******

### 快速開始

******

安裝並啟用插件後, 載入 API, 建立可變參照物件並開啟浮動視窗:

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

可變控制項支援由 `imgui.ref(value)` 建立的輕量引用或普通 `{ value: ... }` 物件; 原有 `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` 輔助方法保持相容. `inputText` 聚焦後會自動顯示系統輸入法並支援中文組合輸入; 可用 `ime: false` 停用自動 IME. `width` / `height` 和 `fontSize` 使用與螢幕密度無關的單位. 拖動空白區域可移動視窗 (`movable: false` 可固定); 雙指縱向滑動支援慣性捲動 (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`), 單指長按模擬右鍵 (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). 如果系統字型無法涵蓋所需字元, 可透過 `fontPath` 指定 TTF 或 OTF 字型檔案.

主題與字型: `setTheme` 接受 `Themes` 的 11 套預設, `setStyleProperties` 可批量設定 `StyleVar`; `createWindow` 亦可傳入 `theme` / `appearance` / `style` / `shadow`. `fonts` 陣列可預載 assets (`asset://...`) 或檔案字型, 並以 `pushFont` / `withFont` 切換. 插件會自動合併內置 CJK 後備與圖示子集, 可用 `Icons` / `icon(name)` 取得圖示字形.

紋理與自繪: 請在視窗會話就緒後呼叫 `createTexture` (通常於渲染回調首次執行時建立). 返回物件包含 `width` / `height` 與冪等的 `dispose()` / `close()`; 會話關閉時會自動釋放餘下紋理. `image` / `imageButton` 用於顯示紋理, `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` 提供常用繪圖原語. DrawList 座標採用 Surface 像素座標. 可直接傳入 AutoJs6 `images.read(...)` 與截圖所得的 `Image`.

視窗會話: 懸浮窗預設採用 `TouchMode.Auto`, ImGui 根視窗保持可互動, Surface 空白區域則直接觸達下層應用; 亦可用 `Touchable` 或 `Passthrough` 固定策略. 會話支援動態透明度/防截屏/觸控模式、收起為低幀率迷你懸浮球、建立獨立可拖動 `addButtonEx`、跟隨 `AlwaysAutoResize` 內容、透過 `iniPath` 持久化佈局, 並以 `on` / `once` / `off` 或 options 回調訂閱事件. `imgui.launch(...)` 會在目前前台 AutoJs6 Activity 中建立全屏 Surface, `launchFloaty(...)` 則明確選擇懸浮窗. 每個腳本引擎只擁有一個原生渲染會話, 但可在同一渲染回調中用 `begin` / `withWindow` 建立任意多個 ImGui 根視窗; 新建會話會關閉舊會話.

高階組件會掛接到目前會話並在使用者渲染回調後繪製: `logWindow` 提供等級着色、清空、匯出回調及自動捲底; `toast` 提供定時定位提示; `alert` / `confirm` / `singleChoice` / `multiChoice` 傳回 Promise; `statsOverlay` 繪製幀耗時; `dataTable` 提供資料列選取與 CRUD. 五個內置範例 (`widget-overview`、`parameter-panel`、`log-hud`、`data-table-demo`、`theme-gallery`) 可透過 `listExamples` / `getExampleSource` 發現並用 `runExample` 啟動. AutoJs6 6.8 插件中心尚未使用通用範例中繼資料, 在宿主支援前可直接執行下方呼叫:

```js
imgui.runExample("widget-overview");
```

******

### API 總覽

******

小駝峰方法對應同名 Dear ImGui 操作, 熟悉原始命名的用戶亦可使用 PascalCase 別名 (如 `ui.Button` 等價於 `ui.button`):

- 會話運行時: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, 以及會話級 `on` / `once` / `off` 與相應實例方法.
- 會話與視窗: `createWindow` / `closeWindow` / `withWindow` / `withChild` / `setNextWindowPos` / `setNextWindowSize` / `setNextWindowBgAlpha` 以及 `isWindowHovered` 等視窗狀態查詢.
- 文字與控制項: `text` / `textColored` / `textWrapped` / `separatorText` / `bulletText` / `labelText` / `button` / `arrowButton` / `invisibleButton` / `checkbox` / `toggle` / `radioButton` / `sliderFloat` / `sliderInt` / `vSliderFloat` / `dragFloat` / `dragInt` / `inputText` / `inputInt` / `inputFloat` / `inputTextMultiline` / `colorEdit3` / `colorEdit4` / `colorPicker4` / `colorButton` / `progressBar` / `plotLines` / `plotHistogram` 等.
- 容器與導覽: `withTabBar` / `withTabItem` / `withTreeNode` / `treeNodeEx` / `collapsingHeader` / `withTable` 表格族 / `withListBox` / `withCombo` / `selectable`.
- 彈窗與選單: `openPopup` / `withPopup` / `withPopupModal` / `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` / `closeCurrentPopup` / `withMenuBar` / `withMenu` / `menuItem` / `setTooltip` / `setItemTooltip` / `withItemTooltip`.
- 樣式與版面配置: `styleColorsDark` / `styleColorsLight` / `styleColorsClassic` / `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` / `withGroup` / `withDisabled` / `withId` / `indent` / `sameLine` / `separator` / `spacing` / 游標與捲動控制族.
- 紋理與自繪: `createTexture` / `destroyTexture` / `image` / `imageButton` / `colorU32`, 以及具備線段/矩形/圓形/三角形/文字/折線/貝茲曲線/圖像原語的 `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList`.
- 查詢與輸入: `isItemClicked` / `isItemHovered` / `isItemActive` / `isItemEdited` / `isMouseDown` / `getMousePos` / `calcTextSize` / `framerate` 等狀態查詢, `setKeyboardFocusHere` 主動聚焦, 以及 `addInputCharacters` / `sendKey` / `addMouseWheel` / `wantTextInput` 輸入原語. `InputTextFlags` 目前公開的所有旗標都會傳遞至 Dear ImGui; 依賴回呼的旗標未公開, `WordWrap` 僅用於多行輸入.
- 高階組件與範例: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, 以及 `listExamples` / `getExampleSource` / `runExample`; 每個會話亦提供同名工廠.
- 可變參照: 輕量 `imgui.ref` (或普通 `{value: x}` 物件), 以及相容的 Java 陣列輔助方法 `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.strings`.
- 常數: `Cond` / `WindowFlags` / `ChildFlags` / `InputTextFlags` / `SliderFlags` / `TreeNodeFlags` / `SelectableFlags` / `TabBarFlags` / `TabItemFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `Col` / `StyleVar` / `Themes` / `Appearance` / `Fonts` / `Icons` / `Dir` / `Key` / `MouseButton` / `ButtonFlags` / `TextureFlags` / `DrawListLayer` / `DrawFlags` / `LogLevel` / `ToastPosition` / `Limits`, 取值與 Dear ImGui 同名列舉或插件常數表一一對應.

******

### 已知限制

******

- 同一腳本引擎同一時刻僅支援一個原生渲染會話; 多面板場景應在該會話內建立多個 ImGui 根視窗. 新建懸浮窗或 Activity 會話會關閉舊會話.
- `imgui.launch` 需要目前存在處於 resumed 狀態的 AutoJs6 Activity; 腳本需要脫離前台 Activity 持續渲染時請使用 `launchFloaty`.
- v1.9 特權模式固定全屏且只支援指標: 暫無 IME/按鍵、宿主層透明度/防截屏、收起、獨立 Android 按鈕或動態旋轉重建. Direct input 不使用 `EVIOCGRAB`, OEM SurfaceControl/SELinux 政策仍可能拒絕啟動; 能力探測不會執行 `su` 或要求 Shizuku 授權.

******

### 發行歷史

******

#### v1.9.3

###### 2026/09/19

* `修復` AGP 9.1 構建時的 SDK XML v4 解析警告及 JVM 單元測試組裝任務誤觸發 APK 原生程式庫對齊檢查的問題 (共用構建外掛 1.8.3)
* `優化` 將 compileSdk 與 targetSdk 提升到 37 (Android 17), 插件行為不受新目標版本影響

#### v1.9.2

###### 2026/09/13

* `修復` 外掛中心顯示的版本與 ABI 資訊符合實際安裝的 APK
* `修復` 版本日期保持統一的英文格式
* `優化` 發佈下載檔案產生前校驗 APK 版本, 簽署與完整變體集合

#### v1.9.1

###### 2026/09/11

* `優化` 建置階段校驗 64 位原生程式庫的 16 KB 頁面大小對齊, 檢查 manifest 契約並輸出 JSON 報告

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

建置參數來自 `version.properties`, 目前最低 SDK 為 24, 目標 SDK 為 36.

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
