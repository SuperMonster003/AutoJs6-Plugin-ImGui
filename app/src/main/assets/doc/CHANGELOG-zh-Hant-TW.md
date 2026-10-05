******

### 發行歷史

******

# v1.9.4

###### 2026/10/05

* `優化` 外掛程式中心圖示採用統一工作台調整後的尺寸, 位置, 明暗圖稿與圓形底色, 保留可重建原稿和參數
* `優化` Android 系統應用程式資訊圖示與圖示工作台共用圖稿及明暗底色, 保留外掛程式中心透明圖稿與現有啟動器選項

# v1.9.3

###### 2026/09/19

* `修復` AGP 9.1 建置時的 SDK XML v4 解析警告及 JVM 單元測試組裝工作誤觸發 APK 原生程式庫對齊檢查的問題 (共用建置外掛 1.8.3)
* `優化` 將 compileSdk 與 targetSdk 提升到 37 (Android 17), 外掛程式行為不受新目標版本影響

# v1.9.2

###### 2026/09/13

* `修復` 外掛中心顯示的版本與 ABI 資訊符合實際安裝的 APK
* `修復` 版本日期保持統一的英文格式
* `優化` 發行下載檔案產生前驗證 APK 版本, 簽章與完整變體集合

# v1.9.1

###### 2026/09/11

* `優化` 建置階段校驗 64 位原生函式庫的 16 KB 頁面大小對齊, 檢查 manifest 契約並輸出 JSON 報告

# v1.9.0

###### 2026/08/30

* `新增` 新增可選擇的 `launchPrivileged` / `WindowMode.Privileged` 後端, 明確支援 `auto`、`shizuku`、`root` 啟動策略與即時 `Session.getBackendInfo()` 診斷
* `新增` 新增純反射宿主介接器, 直接重用 AutoJs6 RootMode、`RootUtils` / `ProcessShell` 及已授權的 `WrappedShizuku` UserService, 不另引入第二套權限管理
* `新增` 新增已驗證 Binder Surface v2 協定: UID 0/2000 特權子行程持有 SurfaceControl 圖層, 僅將 Surface 交給現有完整宿主渲染器
* `新增` 將特權 Type A/Type B `/dev/input` 讀取器接入一般有界 ImGui 輸入佇列, 明確採用非獨占觀察策略, 並由 `Passthrough` 控制回呼
* `修復` 選用 Android 29+ 的權威 `IContentProvider.call` 多載, API 31+ 外部 Provider 會合現在可保留真正的 Broker authority
* `修復` 特權 `app_process` 子行程改用可退出 Looper, 消除正常清理時誤報的 `Main thread not allowed to quit`
* `修復` Broker 一般綁定加入 AutoJs6 外掛權限, endpoint 註冊改為單次, 並保留 UID、工作階段擁有者、常數時間 token 與 Binder death 多重檢查
* `優化` 後端能力與 TypeScript 升級至 schema v2, 涵蓋宿主 Root/Shizuku 狀態、Binder 傳輸、256-bit token 邊界、渲染行程位置與 direct-input 路由策略
* `優化` 在 API 28 Magisk root 與 API 31 Shizuku 13.5 驗證真實 AutoJs6 宿主鏈: UID 0/2000 圖層、現有 JS 門面渲染、Type A/Type B 輸入探索、截圖及無殘留關閉全部通過

# v1.8.0

###### 2026/08/30

* `新增` 新增 `moreTouch` 視窗/浮動按鈕選項及工作階段、全域 `setMoreTouch`, 統一控制 `FLAG_SPLIT_TOUCH`, 已有手指按住螢幕時仍可獨立觸發浮窗按鈕
* `新增` 新增 `BackendStatus` 與 `getBackendCapabilities`, 以型別化結構回報正式視窗後端、split-touch、特權行程、direct input、Docking 與 Multi-Viewport 狀態
* `新增` 完成實驗性獨立 `app_process` 特權渲染垂直切片: SurfaceControl 圖層 → Surface → EGL ES 3 → Dear ImGui, 並提供 256-bit token 驗證的本機 socket 畫面協定
* `新增` 實作 `/dev/input` 16/24-byte 事件解碼、Type A/Type B 多點追蹤、旋轉座標映射及有界畫面起始輸入佇列
* `修復` Activity 與懸浮窗 split-touch 旗標現可動態切換; 關閉工作階段時會確定還原宿主原始旗標, 既有獨立按鈕也會同步更新
* `修復` 特權協定會拒絕錯誤 magic/版本、過長或截斷資料及未驗證用戶端, 並於逾時、斷線或關閉後清理輸入執行緒、EGL、SurfaceControl 與行程
* `優化` 已在 API 28 root 實機驗證 UID 2000 → UID 0 socket 畫面、獨立 ImGui 圖層及 `/dev/input/event6` down/move/up, 並在 API 28/35 實機通過三項 connected 測試
* `優化` 新增特權後端與 Docking/Multi-Viewport 架構文件、協定/evdev 單元測試及建置安全清單; P6 保持明確 experimental, 暫不可由一般腳本選用

# v1.7.0

###### 2026/08/30

* `新增` 發布完整 `types/imgui.d.ts`, 涵蓋全部 214 個可呼叫 API、36 組常數、工作階段、高階元件、DrawList 及全域/外掛/模組進入點, 並由嚴格 TypeScript 冒煙契約守護
* `新增` 內建範例擴充為五個可直接執行的腳本: 控制項總覽、參數調整面板、日誌 HUD、表格 Demo 與主題藝廊
* `新增` 新增 Android 真實 Surface 儀器化渲染測試, 涵蓋初始化、建幀、關鍵控制項、渲染、PixelCopy 截圖語意基線與關閉
* `新增` 新增 GitHub Actions PR 驗證與簽署 `v*` 發布自動化, 包含簽章複驗和 APK 成品上傳
* `新增` 新增含校驗和的 Dear ImGui 上游快照及安全更新器, 支援不可變 tag/commit、封存校驗、dry-run 與白名單解包
* `修復` 觸控、IME、按鍵與滾輪事件現進入有界無鎖 FIFO 佇列並在幀首消費; 生命週期替換佇列可阻止延遲事件進入新的原生工作階段
* `修復` 幀排程改為絕對截止時間補償, 降低工作耗時與計時延遲的累積漂移, 並在遲到或收合幀後確定性重設
* `優化` 公開並強制執行 `Limits`: 文字輸入 64 KiB、選擇項目 512 個、輸入事件佇列 2,048 筆, 同時記錄可設定化結論與安全依據
* `優化` 建置驗證擴充至交叉核對執行期 API、別名、常數、TypeScript 宣告、範例、輸入佇列約束及全部 vendored 上游雜湊

# v1.6.0

###### 2026/08/30

* `新增` 為所有有狀態控制項新增輕量 `imgui.ref(value)` 與 `{ value: ... }` 參照, 同時保留舊版 Java 陣列輔助方法
* `新增` 新增工作階段託管的 `logWindow` 與堆疊定時 `toast`, 支援層級色彩、匯出及確定性清理
* `新增` 新增基於 Promise 的 `alert`、`confirm`、`singleChoice` 與 `multiChoice` 對話框, 強制回應視窗依佇列顯示
* `新增` 新增依臨界值著色的 `statsOverlay`, 以及具備穩定資料列、選取、CRUD、工具列和自訂呈現的 `dataTable`
* `新增` 內建完整 `widget-overview` 範例, 並提供 `listExamples`、`getExampleSource`、`runExample` 與主機探索中繼資料
* `修復` 未決對話框 Promise 現會解析為確定的取消值, 工作階段關閉時也會釋放全部高階元件
* `修復` 範例原始碼查詢現僅允許合約白名單, 並拒絕路徑遊走
* `修復` 將延遲 Surface 復原探測與 Android holder 回呼序列化, 避免較慢裝置重複初始化原生內容
* `優化` 新增 `LogLevel` 與 `ToastPosition`, 常數擴充至 35 組, 同時補充 PascalCase 別名與原始碼驗證涵蓋範圍
* `優化` 已在 OpenGL ES 3.2 實體裝置驗證高階呈現、公開範例執行、結果語意與資源清理

# v1.5.0

###### 2026/08/30

* `新增` 新增 `TouchMode.Touchable` / `Passthrough` / `Auto`; 自動模式依 ImGui 根視窗建立透明觸控代理, 浮窗空白區域可直接觸達下層應用程式
* `新增` 新增工作階段 `collapse` / `expand`、低幀率迷你懸浮球、獨立可拖曳 `addButtonEx`, 以及執行期透明度和 `FLAG_SECURE` 控制
* `新增` 新增 `imgui.launch` Activity 全螢幕模式與明確的 `launchFloaty` 懸浮窗模式; 單一渲染器可承載多個 `begin` / `withWindow` 根視窗
* `新增` 新增螢幕尺寸自適應、`AlwaysAutoResize` 外層視窗跟隨、可選 `iniPath` 持久化與工作階段事件回呼
* `修復` Surface 銷毀後改為分離並於恢復時重新附著, 不再丟棄 EGL/ImGui 上下文及受管紋理控制代碼
* `修復` 自動點擊穿透僅使用 Android 公開視窗/檢視 API, 並將觸控代理限制為最多 64 個互動根視窗
* `優化` JNI 繫結由 186 個擴充至 190 個, 原始碼驗證同步涵蓋 P3 工作階段介面
* `優化` 工作階段關閉時會確定性還原 Activity 旗標與系統 UI, 並清理懸浮窗、觸控代理和獨立按鈕
* `優化` 於 APK Manifest 與安裝文件中明確宣告 OpenGL ES 3.0 硬體需求

# v1.4.0

###### 2026/08/30

* `新增` 新增由工作階段代管的 `createTexture`, 支援檔案路徑、編碼 `byte[]` / `ByteBuffer`、Android `Bitmap`、輸入串流與 AutoJs6 `Image`
* `新增` 新增 `image` / `imageButton`, 支援原始尺寸與長寬比輔助、UV 範圍、著色和背景色
* `新增` 串接 AutoJs6 `images.read` 與螢幕擷取產物, 可直接建立紋理且不會回收呼叫端持有的影像
* `新增` 新增視窗/前景/背景三層 DrawList, 提供線段、矩形、圓形、三角形、文字、折線、三次貝茲曲線與影像原語
* `修復` Bitmap 上傳現在會正確處理列跨距並還原 Android 預乘 Alpha, 半透明色彩不再出現暗邊
* `修復` 紋理銷毀會延後至已排程繪圖資料完成渲染; 過期、已銷毀及跨工作階段控制代碼會被安全拒絕
* `優化` JNI 繫結由 172 個擴充至 186 個, 原始碼驗證同步涵蓋紋理與 DrawList 門面
* `優化` 新增 128 MiB 編碼資料、3,200 萬像素與 OpenGL 最大尺寸防護, 工作階段結束時自動清理全部剩餘紋理

# v1.3.0

###### 2026/08/30

* `新增` 透過 `Themes` / `setTheme(name)` 內建 11 套完整主題, 包含 Pink、Blue、ModernDark、CyanDusk、OrangeDark、CrystalClear、VibrantNight 與 PurpleDream
* `新增` 新增持久化 `setStyleColor` 與批次 `setStyleProperties`; `createWindow` 現可使用 `theme` / `appearance` / `style` 及圓角、邊框、陰影快速選項
* `新增` 啟用 `AssetManager` 字型通道並內建約 9,800 字元的 CJK 裁剪備援, 精簡系統缺少 Noto CJK 時仍可顯示常用中文
* `新增` 新增 `Fonts` / `pushFont` / `popFont` / `withFont` 與 `createWindow.fonts`, 支援 assets 或檔案字型、具名控制代碼及 Dear ImGui 1.92 動態字號
* `新增` 內建 38 個 Material Icons 子集字形, 提供 `Icons` 常數表與 `icon(name, label)` 輔助
* `修復` 切換主題會從依裝置密度縮放的基準樣式確定重設, 同時保留目前字號與全域字型縮放
* `優化` JNI 綁定由 167 個擴充至 172 個; 原始碼校驗新增主題/字型門面清單及兩份內建字型的 SHA-256 完整性檢查
* `優化` 預設與額外字型會合併 CJK 備援及圖示字形, 指令碼不必手動組合字型圖集

# v1.2.0

###### 2026/08/30

* `新增` 整合系統輸入法 (IME): `inputText` / `inputTextMultiline` 聚焦時自動顯示軟鍵盤, 支援中文拼音組合文字、提交文字及退格/Enter/方向鍵等編輯鍵
* `新增` 新增 `setKeyboardFocusHere`, 讓指令碼主動聚焦下一個輸入控制項並自動銜接 IME
* `新增` 雙指捲動加入可設定的慣性衰減, 提供 `fling` / `flingFriction` / `flingMinVelocity` / `flingMaxVelocity` 視窗選項
* `新增` 單指長按可設定為右鍵, 新增 `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` 快顯選單族
* `修復` 取消視窗拖曳、雙指捲動或長按切換手勢時會清除原活動控制項, 避免誤觸左鍵或開啟已取消的右鍵快顯選單
* `修復` 在建立 IME 代理前註冊 SurfaceHolder 回呼, 避免 Surface 已有效但渲染工作階段未初始化的時序問題
* `修復` 浮動視窗取得視窗焦點後會重試軟體鍵盤要求, 避免 Android 尚未將 IME 視圖設為 served view 時遺失首次要求
* `修復` 修正啟動文件: 預設使用 `plugins.load`, 並將宿主自動掛載明確列為 AutoJs6 的選用設定
* `優化` `verifyImGuiSource` 擴充為 JNI → Java 連接層 → JavaScript 門面的三層包裝覆蓋率檢查
* `優化` IME 組合字串以撤銷舊預編輯文字再寫入新文字的方式同步, 指令碼不必管理候選過程

# v1.1.0

###### 2026/08/30

* `新增` 表格 API 族: `withTable` / `beginTable` / `tableNextRow` / `tableNextColumn` / `tableSetupColumn` / `tableSetupScrollFreeze` / `tableHeadersRow` / `tableSetBgColor`, 支援邊框/條紋/行列凍結與背景色
* `新增` 彈窗與選單: `openPopup` / `withPopup` / `withPopupModal` / `closeCurrentPopup` / `isPopupOpen` / `withMenuBar` / `withMenu` / `menuItem`
* `新增` 工具提示: `setTooltip` / `setItemTooltip` / `withTooltip` / `withItemTooltip`
* `新增` 行動裝置風格 `toggle` 開關控制項, 提供 `toggleSwitch` 與 `ToggleSwitch` 別名
* `新增` 更多控制項與文字項: `separatorText` / `bullet` / `bulletText` / `labelText` / `textDisabled` / `arrowButton` / `invisibleButton` / `inputInt` / `inputFloat` / `inputTextMultiline` / `listBox` / `withListBox` / `colorPicker3` / `colorPicker4` / `colorButton` / `plotLines` / `plotHistogram` / `treeNodeEx` / `vSliderFloat` / `vSliderInt` / `withCombo`
* `新增` 樣式堆疊與結構 API: `pushStyleColor` / `popStyleColor` / `pushStyleVar` / `popStyleVar` / `setWindowFontScale` / `pushId` / `withId` / `withGroup` / `withDisabled` / `indent` / `unindent` / `alignTextToFramePadding`
* `新增` 捲動控制族: `getScrollX/Y` / `getScrollMaxX/Y` / `setScrollX/Y` / `setScrollHereX/Y`
* `新增` 狀態查詢: `isItemActive` / `isItemEdited` / `isItemDeactivatedAfterEdit` / `isItemFocused` / `isWindowHovered` / `isWindowFocused` / `isWindowCollapsed` / `isMouseDown` / `isMouseClicked` / `isMouseDragging` / `getMousePos` / `getMouseDragDelta` / `calcTextSize` / `getFrameHeight` / `framerate` 等
* `新增` 輸入原語: `addInputCharacters` / `addKeyEvent` / `sendKey` / `addMouseWheel` / `wantTextInput`, 為後續系統輸入法支援奠定事件通道
* `新增` 雙指縱向滑動捲動視窗內容, 與單指拖曳視窗的手勢自動區分
* `新增` 常數表擴充至 24 組: 新增 `ChildFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `Col` / `StyleVar` / `Dir` / `Key` / `ButtonFlags`
* `修復` 修復觸控執行緒與渲染執行緒並行存取原生上下文的競態問題, 互動查詢改為影格末快照快取
* `修復` 補齊 `WantCaptureMouse` 與 `StyleColorsDark` / `StyleColorsLight` / `StyleColorsClassic` 缺失的 PascalCase 別名
* `優化` 文件與範例統一為宿主常駐全域物件機制, 不再引導呼叫 `plugins.load`
* `優化` 宿主最低版本碼與 ABI 清單由 `ImGuiPluginContract` 單一資料來源提供, 建置指令碼自動解析
* `優化` 全部新增 API 均提供與 Dear ImGui 同名的 PascalCase 別名

# v1.0.0

###### 2026/08/29

* `新增` 全域 `imgui` 物件, 由宿主自動掛載至指令碼引擎
* `新增` 由 Dear ImGui 1.92.9 渲染的透明浮動視窗, 支援設定尺寸/影格率/字型和空白區域拖曳
* `新增` 立即模式視窗/版面配置/文字/輸入/選擇/顏色/進度/樹狀節點/分頁/主題和示範 API
* `新增` 布林/整數/浮點數/字串和顏色可變參照, 用於保存具狀態控制項的資料
* `新增` 外掛資訊/使用說明/README 和 CHANGELOG 的十種語言本地化
* `相依性` 附加 Common Plugin API, 用於外掛探索中繼資料
* `相依性` 附加 Kotlin 標準函式庫與 Parcelize 執行階段版本 2.2.21
* `相依性` 附加 Apache Commons Compress 1.28.0 與 XZ for Java 1.10, 用於建置工具
* `相依性` 附加 JUnit 版本 4.13.2, 用於外掛合約測試
