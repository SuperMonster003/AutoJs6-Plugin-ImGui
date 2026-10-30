******

### 發行歷史

******

# v1.14.0

###### 2026/10/30

* `提示` 行為變更: 以 imgui.launch 開啟的全螢幕視窗現在按返回鍵會關閉視窗 (session.closeReason 為 "back"). 若要保留視窗, 請在 session.on("back", e) 中呼叫 e.preventDefault(). 懸浮視窗 (launchFloaty) 不變
* `新增` 偵錯工具視窗: showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow / showUserGuide (別名 ShowMetricsWindow 等) 顯示 Dear ImGui 內建的偵錯工具; 傳入 imgui.bool(true) 後可用關閉按鈕隱藏. 範例 widget-overview 新增 Debug 選單, 可開啟這些視窗
* `新增` 表格排序: 表格帶有 Sortable 旗標時輕觸欄標題即可切換排序; tableGetSortSpecs() 傳回排序欄與方向 (imgui.SortDirection), specsDirty 只在排序變化的那一幀為 true. tableSetupColumn 的第四個參數是欄的使用者 id. dataTable 設定 sortable: true 即可依欄排序, 欄的 compare 函式可自訂順序; 請參閱範例 data-table-demo
* `新增` 多值控制項: dragFloat2 / 3 / 4, dragInt2 / 3 / 4, sliderFloat2 / 3 / 4, sliderInt2 / 3 / 4, inputFloat2 / 3 / 4, inputInt2 / 3 / 4, 以及編輯最小值與最大值的 dragFloatRange2 / dragIntRange2 和編輯角度的 sliderAngle (以弧度儲存, 以度顯示). 數值以 {value: [x, y, z]}, imgui.floats(...) 或新增的 imgui.ints(...) 傳入; 請參閱範例 widget-overview 的新區段
* `優化` createWindow({debug: true}) 時, 渲染回呼耗時超過 250 毫秒會以 console.warn 提示耗時, 並建議把 sleep, 網路, 檔案等慢速操作移到 threads.start, 每 10 秒最多提示一次; docs/THREADING.md 說明做法

# v1.13.0

###### 2026/10/30

* `提示` 行為變更: 為了省電, 視窗在 3 秒內沒有觸控或按鍵輸入後每秒只繪製 10 個影格, 螢幕關閉或鎖定時停止繪製; 再次觸控後立即恢復正常影格率. 若視窗有動畫, 或顯示不靠輸入就會變化的資料 (計時器, 圖表, 進度列), 請在 createWindow 傳入 idleFps: 0 或呼叫 session.setIdleFps(0) 保持正常影格率
* `新增` ui.listClipper(itemCount, options, callback) (別名 ListClipper) 只繪製可見的列, 10 萬列的清單也能流暢捲動; 請參閱新範例 large-list
* `新增` 影格率控制: createWindow 選項 idleFps / idleDelay, session.setFps / setIdleFps / getFps, 工作階段事件 idle / active 以及欄位 idle / paused
* `新增` texture.update(source) 取代紋理的影像並保持控制代碼不變, 顯示它的 image 呼叫無須修改; 尺寸變更時 texture.width / height 隨之更新. 請參閱新範例 texture-refresh, 每秒重新整理兩次預覽
* `新增` createTexture 與 texture.update 也接受裝有 PNG 或 JPEG 資料的 ArrayBuffer 或型別陣列 (如 Uint8Array)
* `新增` statsOverlay 顯示每個影格的工作耗時 (繪製所用時間, 不含等待螢幕更新), snapshot() 以 workTime 傳回該值
* `優化` docs/FRAME-LOOP.md 說明影格率與省電機制, docs/LIMITS.md 補充 listClipper 的限制

# v1.12.0

###### 2026/10/29

* `提示` 不相容變更: 視窗的位置與尺寸統一改用 dp. createWindow 的 x / y, Session 的 x / y / width / height / displayWidth / displayHeight, setPosition / setSize, 事件資料以及懸浮按鈕的 x / y 以前是 px; 幀內座標仍是 px. 腳本的改法見 docs/MIGRATION-1.12.md
* `提示` 不相容變更: 參數有誤 (型別不對, NaN, 數字字串或超出範圍) 時改為擲出 TypeError 或 RangeError, 訊息寫明方法名稱與參數名稱, 例如 `imgui.sliderFloat: argument "max" must be a finite number`, 不再默默轉換或截斷; fps, alpha, fontSize 等視窗選項同樣檢查
* `提示` 不相容變更: Session 與懸浮按鈕的欄位改為唯讀 (嚴格模式下指派會擲出錯誤), 請改用對應的 set 方法. FloatingButton.setPosition 不再接受 source 參數; 懸浮按鈕顏色傳數字時與其他 imgui 顏色一樣按 0xAABBGGRR (即 colorU32 的回傳值) 解讀, 不再按 Android ARGB 解讀
* `提示` 不相容變更: 工作階段事件, 懸浮按鈕回呼與對話框結果改在腳本執行緒 (繪製回呼所在的執行緒) 執行, 不再在 Android UI 執行緒執行, 詳見 docs/THREADING.md
* `新增` imgui.dp() / imgui.px() (別名 Dp / Px) 在 dp 與 px 之間換算, imgui.density 提供每 dp 對應的 px 數
* `新增` 所有顏色參數都接受打包整數, [r, g, b, a], {r, g, b, a} 或 "#rrggbbaa", 包括 textColored / pushStyleColor / setStyleColor / colorButton / tableSetBgColor; 分別傳入 r, g, b, a 的寫法仍然可用
* `新增` 範例 background-task: 工作執行緒執行耗時任務, 視窗照常繪製, 附進度顯示與取消
* `新增` 文件 docs/THREADING.md 說明各回呼在哪個執行緒執行以及如何在背景執行耗時任務, docs/MIGRATION-1.12.md 列出升級到本版本時腳本需要的修改
* `修復` 事件回呼與懸浮按鈕回呼可能與繪製回呼同時執行, 且在其中呼叫 sleep 會出錯的問題
* `修復` 呼叫 imgui.setTheme 後 Session.theme 不變的問題
* `修復` 拖曳視窗時 moved 事件的 source 為 api 而不是 drag 的問題
* `優化` 範例改用 ui.dp(), 不再手動乘以 window.density
* `優化` TypeScript 宣告寫明每個尺寸, 位置與選項的單位和取值範圍, 並把 Session 與懸浮按鈕的欄位標為唯讀
* `優化` 每個 GitHub Release 附帶 SHA256SUMS 檔案, 方便驗證下載的 APK

# v1.11.0

###### 2026/10/29

* `提示` 依賴使用中視窗工作階段的全域方法 (setTouchable / setMoreTouch / setGlobalAlpha / setSecure / collapseWindow / expandWindow / addButtonEx / getComponent) 在沒有使用中工作階段時改為擲出 `imgui.<方法名稱>: no active session` 錯誤, 其中 getComponent 以前回傳 null
* `提示` 繪圖選項 offset 已棄用, 請改用 valuesOffset (舊寫法仍然有效)
* `新增` 視窗工作階段的 error 事件: 繪製回呼或事件回呼擲出錯誤時觸發, 事件含 error, phase (render 或 event) 與 frame; 有 error 監聽器時工作階段繼續繪製, 可在處理器中自行關閉工作階段, 沒有監聽器時與以前一樣以 render-error 關閉
* `新增` 視窗選項 debug: 開啟 Dear ImGui 的錯誤復原與偵錯記錄, Begin / End 不成對等用法錯誤經 console.warn 提示, 並顯示 Metrics 與 Debug Log 視窗
* `新增` 範例 error-handling, 示範 error 事件, debug 模式與常見錯誤的排查
* `新增` 別名文件 docs/ALIASES.md, 列出全部 PascalCase 別名及其與 Dear ImGui C++ 簽章的差異
* `修復` plotLines / plotHistogram 的 valuesOffset 與 stride 選項無效的問題
* `優化` 繪製回呼或事件回呼出錯時主控台輸出含呼叫堆疊的錯誤訊息, 同一錯誤連續出現時只輸出一次
* `優化` README 的別名說明改為 "常用 API 別名", 補充單一工作階段模型 (建立新工作階段會關閉上一個) 與新增成員的使用說明, 目標 SDK 更正為 37

# v1.10.0

###### 2026/10/29

* `提示` 需要 AutoJs6 6.8.0 或以上版本 (版本號 versionCode 不低於 5935)
* `修復` TypeScript 宣告中 createWindow / launchFloaty / launch / launchPrivileged 的渲染回呼參數被宣告為 (session) 的問題, 現與實際呼叫一致為 (ui, session), 並新增 RenderCallback 型別
* `優化` 外掛啟用後直接以全域物件 imgui 使用, 由 AutoJs6 註冊並在首次呼叫成員時載入外掛, 不再需要 plugins.load; 原有 plugins.load("io.github.supermonster003.autojs6.plugin.imgui") 寫法回傳同一物件
* `優化` 範例指令碼, 使用說明, README 及 TypeScript 宣告依全域物件用法更新, 宣告檔不再擴充 plugins.load 的多載

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
