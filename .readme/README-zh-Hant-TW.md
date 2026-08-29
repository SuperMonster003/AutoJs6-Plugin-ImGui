<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>使用 Dear ImGui 建立浮動使用者介面</p>

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

ImGui 外掛在指令碼引擎中提供全域 `imgui` 物件. 它在透明浮動視窗中渲染立即模式控制項, 並透過一套精簡的 API 統一管理視窗建立/影格排程/觸控輸入和原生資源清理.

******

### 功能

******

- 透過自動掛載或 `plugins.load(packageName)` 載入全域 `imgui` 物件.
- 透明浮動視窗, 可設定尺寸/位置/影格率/字型並支援拖曳空白區域.
- 視窗/子區域/分頁/樹狀節點/文字/按鈕/可變輸入/選擇器/進度指示/版面配置輔助/主題以及 Dear ImGui 示範視窗.
- 布林/整數/浮點數/字串和顏色可變參照, 用於保存具狀態控制項的資料.
- 外掛資訊/使用說明/README 和 CHANGELOG 的十種語言本地化.

******

### 使用範例

******

在外掛中心啟用自動掛載或明確載入外掛, 然後建立浮動視窗:

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

可變控制項會更新由 `imgui.bool`/`imgui.int`/`imgui.float`/`imgui.string` 和 `imgui.floats` 建立的參照物件. `width`/`height` 和 `fontSize` 使用與螢幕密度無關的單位. 拖曳空白區域可移動視窗, 也可傳入 `movable: false` 固定視窗.

******

### API 概覽

******

小駝峰方法對應常用 Dear ImGui 操作, 熟悉原始命名的使用者也可使用控制項方法的 PascalCase 別名:

- 視窗生命週期: `createWindow`/`closeWindow`/`withWindow`/`withChild`/`withTabBar`/`withTabItem` 和 `withTreeNode`.
- 控制項: `text`/`button`/`checkbox`/`radioButton`/`sliderFloat`/`sliderInt`/`dragFloat`/`dragInt`/`inputText`/`colorEdit3`/`colorEdit4`/`progressBar`/`combo` 和 `selectable`.
- 版面配置與狀態: 游標方法/控制項寬度方法/`sameLine`/`separator`/`spacing`/控制項查詢和擷取查詢.
- 常數: `Cond`/`WindowFlags`/`InputTextFlags`/`SliderFlags`/`TreeNodeFlags`/`SelectableFlags`/`TabBarFlags`/`TabItemFlags` 和 `MouseButton`.

******

### 發行記錄

******

# v1.0.0

###### 2026/08/29

* `新增` 全域 `imgui` 物件, 支援自動掛載和明確呼叫 `plugins.load`
* `新增` 由 Dear ImGui 1.92.9 渲染的透明浮動視窗, 支援設定尺寸/影格率/字型和空白區域拖曳
* `新增` 立即模式視窗/版面配置/文字/輸入/選擇/顏色/進度/樹狀節點/分頁/主題和示範 API
* `新增` 布林/整數/浮點數/字串和顏色可變參照, 用於保存具狀態控制項的資料
* `新增` 外掛資訊/使用說明/README 和 CHANGELOG 的十種語言本地化
* `相依性` 附加 Common Plugin API, 用於外掛探索中繼資料
* `相依性` 附加 Kotlin 標準函式庫與 Parcelize 執行階段版本 2.2.21
* `相依性` 附加 Apache Commons Compress 1.28.0 與 XZ for Java 1.10, 用於建置工具
* `相依性` 附加 JUnit 版本 4.13.2, 用於外掛合約測試

##### 更多發行記錄可參閱

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

建置參數來自 `version.properties`, 目前最低 SDK 為 24, 目標 SDK 為 36.

******

### 資源結構

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
```

`strings.xml` 提供外掛描述本地化, `plugin_instruction.md` 提供宿主顯示的外掛使用說明. README 與 CHANGELOG 由 `.python/generate_markdown.py` 根據 JSON 來源檔案產生.

******

### 相關連結

******

- AutoJs6 專案: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui 官方專案: https://github.com/ocornut/imgui
