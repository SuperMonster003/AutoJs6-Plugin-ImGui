在插件中心啟用插件後直接使用全域物件 `imgui` (需要 AutoJs6 6.8.0 或以上版本), 不需要呼叫 `plugins.load`.

在開啟浮動視窗前建立可變參照物件:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui 控制面板",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("啟用", enabled);
            ui.sliderFloat("數值", level, 0, 1, "%.2f");
            if (ui.button("關閉", 120, 0)) {
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

`width`, `height` 和 `fontSize` 使用與螢幕密度無關的單位. 聚焦 `inputText` 會自動顯示支援組合文字的系統輸入法. 拖動空白區域可以移動浮動視窗; 雙指縱向滑動帶慣性捲動, 單指長按模擬右鍵. 傳入 `movable: false` 可停用拖動. 如果系統字型無法顯示所需字元, 可透過 `fontPath` 載入 TTF 或 OTF 字型檔案.

可用 `Themes` / `setTheme`、`setStyleProperties` 與 `Appearance` 快速設定視覺效果. `createWindow.fonts` 可預載 assets 或檔案字型供 `pushFont` / `withFont` 切換; 內置 CJK 後備和 Material 圖示子集會自動合併, 圖示可由 `Icons` / `icon(name)` 取得.

`createTexture` 支援路徑、編碼位元組、Android `Bitmap`, 以及來自 `images.read` 或截圖的 AutoJs6 `Image`. 用 `image` / `imageButton` 顯示紋理, 不再使用時呼叫 `dispose()`; 會話會自動釋放餘下紋理. `getWindowDrawList`、`getForegroundDrawList` 與 `getBackgroundDrawList` 提供線條、圖形、文字和圖像原語, 座標採用 Surface 像素.

懸浮窗會話預設使用 `TouchMode.Auto`, 保持 ImGui 視窗可互動並讓空白區域點擊穿透. 會話可動態切換觸控/透明度/防截屏, 收起為低幀率迷你懸浮球, 建立獨立 `addButtonEx`, 透過 `iniPath` 保存佈局並發佈生命週期事件. `imgui.launch(...)` 可在目前前台 AutoJs6 Activity 中使用全屏 Surface. 一個原生會話可包含多個 `begin` / `withWindow` 根視窗; 新建會話會關閉舊會話.

`setMoreTouch(true)` 可為主視窗和獨立按鈕啟用 Android split-touch. `launchPrivileged(callback, {backend: "auto"})` 明確選擇生產級 SurfaceFlinger 模式, 重用 AutoJs6 現有 Shizuku/root 授權且毋須懸浮視窗權限; `/dev/input` 只作觀察且不會獨佔觸控螢幕. `getBackendCapabilities()` 可在不提權的情況下報告宿主狀態.

插件提供表格/快顯選單/選單/工具提示/樣式堆疊與 60 餘個控制項, `withTable`, `withPopupModal`, `withContextItem`, `withMenuBar` 等輔助方法可安全配對 begin/end 呼叫. 完整 API 概覽可參閱專案 README 與 Roadmap.

有狀態控制項亦支援 `imgui.ref(value)` 輕量引用或普通 `{ value: ... }` 物件; 原有 `bool`、`float`、`int`、`string` 與顏色陣列輔助方法保持相容. 會話託管的 `logWindow`、`toast`、Promise 對話框、`statsOverlay` 和 `dataTable` 會在用戶回調之後渲染, 並隨會話自動關閉.

可用 `imgui.runExample("widget-overview")`、`"parameter-panel"`、`"log-hud"`、`"data-table-demo"` 或 `"theme-gallery"` 運行五個內置範例, 透過 `listExamples` 探索範例, 透過 `getExampleSource` 查看原始碼. AutoJs6 6.8 插件中心目前尚未提供通用的一鍵運行範例操作.

v1.7 亦在 `types/imgui.d.ts` 發佈完整編輯器聲明. 執行期安全上限可透過 `imgui.Limits` 查詢 (文字輸入 64 KiB、選擇項 512 個、輸入事件隊列 2,048 條); API 會明確拒絕超限輸入, 不再靜默截斷.
