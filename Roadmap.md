# AutoJs6-Plugin-ImGui Roadmap

本路线图基于三方面输入制定: 对当前代码库的逐层盘点 (JS 门面 / Java 桥 / JNI / Dear ImGui 1.92.9), 对 AutoJs 系两代 ImGui 实现 (SurfaceFlinger 特权路线与 floaty 悬浮窗路线) 的能力勘察, 以及 imguiPlus 接口文档所代表的商业化功能集. 所有条目均可逐项 Check, 完成后请勾选并在条目末尾标注落地版本号.

优先级定义:

- **P0**: 直接影响可用性的硬缺口, 优先排期.
- **P1 - P2**: 显著扩展能力边界的近中期目标.
- **P3 - P4**: 会话能力与高层组件, 按需求热度排期.
- **P5**: 工程化与生态建设, 与功能开发并行推进.
- **P6**: 远期探索项, 涉及架构级决策.

******

### 现状基线 (v1.9.0)

******

- 渲染路线: 默认 `floaty.rawWindow` 悬浮窗、前台 Activity 全屏 Surface, 以及显式 `launchPrivileged` SurfaceFlinger 图层三种模式; 三者共用同一 EGL/OpenGL ES 3 + Dear ImGui 渲染门面, 四 ABI 分包.
- API 规模: 190 个 JNI 绑定, 227 个可调用 JS API, 60 余个即时控件, 37 组常量表, PascalCase 全量别名; 另含 5 类会话托管高层组件与 4 类 Promise 对话框糖.
- 已覆盖: 窗口/子区域/标签页/树形/表格/弹窗/菜单/工具提示/主题与批量样式/多字体与图标/托管纹理/图像控件/三层 DrawList 自绘/会话事件/自动点击穿透/收起气泡/独立悬浮按钮/Activity 全屏模式/分组与禁用态/滚动控制/状态查询/输入原语.
- 交互: 空白区域拖动窗口, 双指惯性滚动, 单指长按右键, 系统 IME 中文组合输入; 触摸-渲染线程竞态已消除 (帧末快照).
- 机制: AutoJs6 6.8.0 及以上版本直接注册全局 `imgui` 对象, 首次调用成员时加载插件; 不再依赖 `plugins.load` 或插件中心自动挂载.
- P6 生产基线: 复用 AutoJs6 现有 Root/Shizuku 授权与命令执行策略, 由 UID 0/2000 子进程创建并持有 SurfaceControl 图层, 经 256-bit token 鉴权 Binder 将 Surface 交给宿主现有完整 JS/JNI 渲染器; `/dev/input` 以非独占观察策略回传触摸. API 28 root 与 API 31 Shizuku 实机均已贯通.
- 主要短板: 暂不支持同一脚本引擎并行运行多个独立原生渲染会话; 特权模式当前固定全屏, 不支持 IME/按键、宿主层透明度/防录屏、动态旋转重建、收起或独立 Android 悬浮按钮, 且非 SDK SurfaceControl 与 evdev 可读性仍受 OEM/SELinux 影响.

******

### P0 — 输入体验补全

******

- [x] 键盘与字符事件通道: `addInputCharacters` / `addKeyEvent` / `sendKey` / `addMouseWheel` / `wantTextInput` (v1.1.0)
- [x] 双指纵向滑动滚动窗口内容, 与拖动窗口手势自动区分 (v1.1.0)
- [x] 系统输入法 (IME) 集成: 帧循环轮询 `wantTextInput`, 聚焦输入框时自动唤起软键盘, 失焦自动收起; 通过隐形 `EditText` 或 `InputConnection` 将提交文本与组合文本转发至 `addInputCharacters`, 退格/回车/方向键映射至 `addKeyEvent`. 验收标准: `inputText` 可用系统输入法完整输入中文 (含拼音组合过程). (v1.2.0)
- [x] `setKeyboardFocusHere` 绑定: 支持脚本主动将焦点置于下一个输入控件. (v1.2.0)
- [x] IME 就绪后移除 README "已知限制" 中的输入法条目, 并在 `InputTextFlags` 文档标注实际生效项. (v1.2.0)
- [x] 惯性滚动 (fling): 双指滚动抬手后按初速度衰减继续派发滚轮事件, 手感对齐原生列表. (v1.2.0)
- [x] 长按转右键: 单指长按 (阈值可配) 派发 `MouseButton.Right`, 打通上下文菜单交互. (v1.2.0)
- [x] 上下文弹窗绑定: `beginPopupContextItem` / `beginPopupContextWindow` 及 `withContextItem` / `withContextWindow` 辅助. (v1.2.0)

******

### P1 — 视觉与主题

******

- [x] 细粒度样式栈: `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` (v1.1.0)
- [x] 内置主题库与 `setTheme(name)`: 除现有 Dark / Light / Classic 外, 对标 imguiPlus 提供约 8 - 11 套预设 (如 Pink / Blue / ModernDark / CyanDusk / OrangeDark / CrystalClear / VibrantNight / PurpleDream), 并暴露 `Themes` 常量表. (v1.3.0)
- [x] 批量样式配置: `setStyleProperties({framePadding, itemSpacing, windowRounding, scrollbarSize, grabMinSize, ...})`, 一次调用完成常用样式定制 (imguiPlus `setStyleProperties` 对标). (v1.3.0)
- [x] 运行期字体能力: 利用 `nativeInit` 中现成但闲置的 `AssetManager` 通道加载 assets 内置字体; 提供裁剪版 CJK 字体兜底, 覆盖无 Noto CJK 字体的精简系统. (v1.3.0)
- [x] 多字体栈: `PushFont` / `PopFont` 与多字号预载, 支持标题/正文/等宽混排. (v1.3.0)
- [x] 图标字体: 内置图标字体子集 (如 Material Symbols) 与 `icon(name)` 辅助方法. (v1.3.0)
- [x] 窗口圆角/边框/阴影预设选项: `createWindow` options 直通常用 StyleVar. (v1.3.0)

******

### P2 — 图像与自绘

******

- [x] 纹理系统: `imgui.createTexture(source)` 支持文件路径 / 字节数组 / Android `Bitmap`, 返回纹理句柄并托管 GL 生命周期 (会话关闭自动释放). (v1.4.0)
- [x] 图像控件: `image(texture, w, h, ...)` 与 `imageButton(id, texture, w, h, ...)`. (v1.4.0)
- [x] 与 AutoJs6 `images` 模块打通: `images.read` / 截图产物 (`Image`/`Bitmap`) 可直接转纹理显示, 构成"截屏取样 → 浮窗预览"闭环. (v1.4.0)
- [x] DrawList 绘制 API: `getWindowDrawList` 与 addLine / addRect / addRectFilled / addCircle / addCircleFilled / addTriangle / addText / addPolyline / addBezierCubic / addImage. (v1.4.0)
- [x] 前景/背景绘制层: `getForegroundDrawList` / `getBackgroundDrawList`, 支持在整个浮窗范围内自绘标记 (框选/准星/轨迹线). (v1.4.0)

******

### P3 — 窗口与会话能力

******

- [x] 点击穿透: `session.setTouchable(false)` 动态切换悬浮窗 `FLAG_NOT_TOUCHABLE`; `TouchMode.Auto` 按帧仅为可交互 ImGui 根窗口建立透明触摸代理, 其余区域直接交还下层应用. (v1.5.0)
- [x] 窗口收起/展开: `session.collapse()` / `session.expand()` 与收起态迷你悬浮球; 收起时按 `collapsedFps` 降帧省电. (v1.5.0)
- [x] 独立悬浮按钮: `session.addButtonEx` / `imgui.addButtonEx` 提供脱离主窗口的可拖动小按钮, 可用于收起后快速呼出. (v1.5.0)
- [x] 全局透明度: `session.setAlpha(0 - 1)`. (v1.5.0)
- [x] 防截屏/防录屏: `createWindow` 支持 `secure: true`, 并可由 `session.setSecure` 动态切换 `FLAG_SECURE`. (v1.5.0)
- [x] 屏幕旋转与尺寸变化自适应: 轮询宿主可用区域并触发 `configurationChanged` 事件; Surface 销毁/重建时保留 EGL Context、ImGui 上下文、纹理与会话状态. (v1.5.0)
- [x] 悬浮窗尺寸跟随内容: `AlwaysAutoResize` 根窗口下由 `contentAutoResize` 让外层悬浮窗跟随内容边界收缩, 并提供 padding/min/max 约束. (v1.5.0)
- [x] 配置持久化: `createWindow` 支持 `iniPath`, 启用 Dear ImGui INI 记忆窗口位置/尺寸/折叠状态. (v1.5.0)
- [x] 多窗口会话: 明确采用“单个原生渲染会话 + 多个 `begin` / `withWindow` ImGui 根窗口”模型; 同一脚本引擎创建新会话会关闭旧会话, 暂不并行维护多个独立 Android overlay. (v1.5.0)
- [x] Activity 全屏模式: `imgui.launch(cb)` 复用宿主当前 Activity 的全屏 Surface 承载渲染, `imgui.launchFloaty(cb)` 显式选择悬浮窗模式. (v1.5.0)
- [x] 会话事件回调: 支持 `on` / `once` / `off` 及 `onMoved` / `onResized` / `onReady` / `onSurfaceRestored` / `onCollapsed` / `onExpanded` / `onClosed` / `onConfigurationChanged` / `onTouchableChanged` / `onAlphaChanged` / `onSecureChanged`. (v1.5.0)

******

### P4 — 高层组件糖 (JS 层封装)

******

- [x] 日志窗口: `imgui.logWindow(id, opts)` 组件, 支持 `appendLog` (log/warn/info/debug/error 等级着色) / 清空 / 导出回调 / 自动滚底 (imguiPlus `addLogWindow` 对标). (v1.6.0)
- [x] Toast: `imgui.toast(text, duration, opts)` 浮层提示, 支持等级颜色、位置、堆叠与淡出 (imguiPlus `showToast` 对标). (v1.6.0)
- [x] 对话框糖: `imgui.alert` / `imgui.confirm` / `imgui.singleChoice` / `imgui.multiChoice`, 基于 `withPopupModal` 封装并返回 Promise; 会话关闭时确定性返回取消值 (imguiPlus `addPopup` / `addAlertChoicePopup` 对标). (v1.6.0)
- [x] 性能面板: `imgui.statsOverlay()` 一键组件, 集成 `framerate` 数值 + `plotLines` 帧耗时曲线 + 阈值变色 (imguiPlus `addFps` 对标). (v1.6.0)
- [x] 数据表格封装: `imgui.dataTable(id, headers, rows, opts)`, 内置行选中/增删/改行/清空/行点击回调与工具栏 (imguiPlus 表格 CRUD 族对标). (v1.6.0)
- [x] 轻量引用语法糖: `{value: x}` / `imgui.ref(x)` 可直接用于全部有状态控件, 并保持现有 `imgui.bool` / `int` / `float` / `string` / `floats` Java 数组 API 完全兼容. (v1.6.0)
- [x] 示例脚本随插件分发: 内置 `examples/widget-overview.js` 与清单, 提供 `listExamples` / `getExampleSource` / `runExample` 及插件能力元数据; 当前 AutoJs6 6.8 插件页尚未消费通用示例协议, 宿主接入后即可直接提供一键运行按钮. (v1.6.0)

******

### P5 — 工程化与生态

******

- [x] 宿主最低版本码与 ABI 列表单一数据源 (`ImGuiPluginContract` → 构建脚本解析) (v1.1.0)
- [x] TypeScript 声明文件: 发布 `types/imgui.d.ts` 覆盖全部 API、常量、会话、组件与模块入口, 并以严格模式 smoke test 和构建期反向覆盖校验守护. (v1.7.0)
- [x] 示例库: `examples/` 目录提供可直接运行的脚本 —— 控件总览 / 参数调节面板 / 日志 HUD / 表格 Demo / 主题画廊. (v1.7.0)
- [x] 三层一致性校验扩展: 在 `verifyImGuiSource` 基础上校验 `ImGuiPluginConnection` 与 `index.js` 对全部 native 方法的包装覆盖率. (v1.2.0)
- [x] 仪器化测试 (androidTest): 真实 Surface 上执行 init → newFrame → 控件绘制 → render → PixelCopy 截图语义基线 → shutdown. (v1.7.0)
- [x] CI 工作流 (GitHub Actions): PR 触发 `verifyImGuiDebugApks`、TypeScript/上游快照校验与 androidTest 编译, `v*` tag 触发签名 release 构建、签名验证与产物上传. (v1.7.0)
- [x] 帧循环演进评估: 改用绝对截止时间补偿的定时调度以降低漂移; 已在 `docs/FRAME-LOOP.md` 记录 `Choreographer` 受 Rhino 线程约束的结论, 以及渲染线程/命令缓冲拆分的收益与复杂度. (v1.7.0)
- [x] 触摸链路进一步免锁化: 触摸、IME、按键与滚轮事件进入有界无锁队列, 由渲染帧按 FIFO 统一消费, UI 线程不再等待原生帧锁. (v1.7.0)
- [x] Dear ImGui 上游升级机制: `UPSTREAM.sha256` 固化 vendored 快照, `tools/update_imgui_upstream.py` 支持不可变 tag/commit、归档校验、dry-run 与安全白名单更新, `UPSTREAM.md` 固化步骤与回归清单. (v1.7.0)
- [x] `inputText` 缓冲区与 `combo`/`listBox` 条目上限 (64 KB / 512 项) 已作为只读 `Limits` 契约公开并在 JS/C++ 双层拒绝超限输入; 可配置化评估结论与安全边界见 `docs/LIMITS.md`. (v1.7.0)

******

### P6 — 远期探索 (特权后端)

******

- [x] SurfaceFlinger 图层后端: 显式 `launchPrivileged` / `WindowMode.Privileged` 复用 AutoJs6 宿主 Root/Shizuku 管理; 特权 `app_process` 只创建/持有系统图层并通过鉴权 Binder 转交 Surface, 宿主现有 227 API 门面直接渲染, 无需维护完整命令缓冲. Broker 以插件权限、调用 UID、单次 256-bit token、会话所有者与 Binder death 多层约束, 支持失败闭合和确定性清理; API 28 root 与 API 31 Shizuku 真实宿主实机已验证, 同一五项仪器测试在 API 28/31/35 三台实体机上 15/15 通过, Debug 与 R8/资源裁剪 Release 均完成端到端回归. (v1.9.0)
- [x] `/dev/input` 触摸直读: 特权模式不依赖 SurfaceView 事件通道, 支持 16/24-byte `input_event`、Type A/Type B 多点跟踪、0/90/180/270 度映射与有界队列; 生产策略明确为不使用 `EVIOCGRAB` 的观察模式, `Touchable`/`Auto` 向 ImGui 回传, `Passthrough` 停止回传, 具体节点/协议/错误由 `session.getBackendInfo()` 报告. (v1.9.0)
- [x] 多指触控透传开关: 已有手指在屏时仍可触发浮窗按钮; `setMoreTouch` 同步控制主窗口及独立悬浮按钮的 `FLAG_SPLIT_TOUCH`, Activity 会话关闭时恢复原标志 (imguiPlus `setMoreTouch` 对标). (v1.8.0)
- [x] Docking / Multi-Viewport 评估: 明确 Docking 可独立于多视口在单 Surface 工作, 但当前稳定 master 无相关 API; Multi-Viewport 需多 Android 窗口/EGL 上下文/输入与生命周期平台后端, 两者暂缓条件见 `docs/DOCKING-MULTI-VIEWPORT.md`. (v1.8.0)

******

### 维护约定

******

- 完成条目请将 `- [ ]` 改为 `- [x]` 并在末尾追加版本号标注, 如 `(v1.2.0)`.
- 新需求先归入对应优先级分组, 涉及架构决策的条目须在描述中注明验收标准.
- 每次发版前核对本文件与 CHANGELOG 的一致性: 当版本新勾选的条目应能在该版本 CHANGELOG 中找到对应记录.

******

### 2026-10 API 精进 (R 系列) 总览

******

来源: 2026-10-29 的脚本 API 设计评审 `docs/API-REVIEW-2026-10.md` (A1-A9 设计问题, Dear ImGui 分组缺口, Android 场景, 开发者体验 D1-D4). 评审的全部条目按其第 5 节的优先顺序分成 R0 - R8 九个阶段, R0 - R7 每个阶段对应一个 minor 版本 (v1.11.0 - v1.18.0), R8 只产出文档与原型补丁不发版. 决策记录见文末附录 A, 待决事项见附录 B; 调度看板为 `D:/idea-projects/.claude/boards/imgui.md`.

依赖与并行: R0 -> R1 -> R2 -> R3 -> R4 -> R5 -> R6 -> R7 顺序执行 (都改 `index.js` / `ImGuiBridge.cpp` / `imgui.d.ts`, 同时只允许一个写代码的会话); R8 从 R1 起可与主线并行 (原型只在本地克隆里做, 入库文件仅 docs). 已完成的 A1 (createWindow 回调签名) 随 v1.10.0 落地, 不再列入.

阶段通用验收 (每个阶段都要满足, 条目里不再重复):

1. 构建与测试: 按 AGENTS.md 的 Gradle 命令跑 `:app:assembleDebug :app:testDebugUnitTest` 通过, `python .python/generate_markdown.py --check` 通过; 涉及 native 的阶段再跑 `:app:assembleDebugAndroidTest :app:lintDebug`.
2. 声明与文档: `types/imgui.d.ts` 覆盖本阶段全部新增 / 变更成员 (现有的 d.ts 校验通过); README 源 (`.readme` 10 语言 JSON) 与 `docs/*.md` 同步; `.changelog` 10 语言 JSON 按 hint / feature / fix / improvement 记录, 破坏性变化必须有 hint 条目; 重新生成 README / CHANGELOG. 宿主文档站, TypeScript-Declarations 与 Ace 补全不在本路线图内 (附录 A D10), 由 api-coverage P5.2f 统一接入.
3. 宿主同步: 新增或改名的脚本成员写入宿主 `AutoJs6/app/src/main/java/org/autojs/autojs/runtime/api/modules/imgui/ImguiNames.kt` (FUNCTIONS / ALIASES / CONSTANTS), 更新 `ScriptModuleInstallsTest` 的成员总数 (v1.10.0 时为 459), 重新生成 KSP (`:app:kspAppDebugKotlin`), 宿主只本地提交不推送 (共享工作区: 只提交自己的文件, 不切分支, 不碰其他会话在改的文件); 装上新宿主后 `py -3.12 AutoJs6/tools/imgui/device_global_check.py -s <serial>` 通过 (成员总数与示例数随阶段更新).
4. 真机: 每个阶段的设备验证写成仓库内可复用脚本 (`tools/` 目录, 每项只打印 PASS / FAIL 与关键数值), 主力设备 968e9f18 (Xiaomi 23046RP50C, debug 宿主) 全部通过, 另一台 (ColorOS 63751f63 或 16 KB 模拟器, 见 `D:/idea-projects/COMMON_AGENTS.md` 可用测试设备) 抽查; 需要维护者在手机上点确认的安装或授权停下来等, 不代为点击. 特权模式条目需要 root / Shizuku 设备.
5. 发布 (附录 A D8 / D9): `VERSION_NAME` 改为本阶段版本, `VERSION_BUILD` = `git rev-list --count HEAD` + 1, 真机通过后推送 master, 打 `v<版本>` tag 触发签名 Release, 核对 Release 产物 (四 ABI + universal) 后登记官方插件索引 (流程与 3-Macaw 等插件相同); 本 Roadmap 勾选条目并标版本号.

******

### R0 - 正确性与排错 (v1.11.0)

******

- [x] R0.1 宿主模块与插件新增成员: 核实宿主 `ImguiModule` 对 `ImguiNames` 之外的成员是否透传 (首次加载后能否访问插件新增的函数). 不透传时在本阶段给出方案 (例如加载后把插件对象的全部成员补挂到模块对象, 或文档写明新成员需要配套宿主版本并可用 `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")` 取完整对象), 写进 README 与附录 B 登记. 验收: 968e9f18 上 v1.11.0 新增成员经全局 `imgui` 可调用, 或文档已写明限制.
  完成: 1.10.0 宿主只转发 `ImguiNames` 列出的名称 (名单外为 undefined). 按 Q1 推荐先行, 宿主 `ImguiModule.forwardUnlisted` 在插件首次加载后把名单外的公开成员补挂到模块对象 (宿主本地提交); README 写明新成员在首次使用 `imgui` 任一成员后出现. 968e9f18 / 63751f63 上 `device_global_check.py` 的 forwarded 项 (ui 的 458 个公开成员经 `imgui` 都可访问) 通过; 另用临时加了两个名单外成员的插件包在 968e9f18 验证: 加载前 undefined, 加载后函数可调用且 this 为 API 对象, 非函数值可读.
- [x] R0.2 PlotOptions 的 `valuesOffset` 与 `stride` 生效 (A2): `plotLines` / `plotHistogram` 以 `valuesOffset` 为准并兼容旧的 `offset`, `stride` 传到 JNI. 验收: 单测覆盖 offset / valuesOffset / stride 三种输入到 JNI 参数的映射; 设备脚本用 8 个采样点 offset 2 stride 2 绘制并以 `getItemRect` + 截图核对曲线起点.
  完成: stride 按值的个数 (Q2). 单测 `ImGuiScriptFacadeTest` 覆盖三种输入的映射. 插件目前没有 `getItemRect` (R3 才加), 像素核对改为插桩测试 `ImGuiRenderInstrumentedTest.plotValuesOffsetAndStrideSelectTheSamples`: 8 个采样点 offset 2 stride 2 的截图与预先取出的 4 个值 (stride 1) 的截图逐像素一致, 且与不取样的截图不同; `tools/device_r0_check.py` 的 plot 项确认脚本层两种写法 (valuesOffset 与旧 offset) 不报错.
- [x] R0.3 错误事件 (A5, D4): 渲染回调或事件回调抛错时 `console.error` 输出带栈信息 (同一消息连续出现只打印一次, 事件照发), 触发 `session.on("error", e)` (`e.error`, `e.phase` 为 render / event, `e.frame`); 没有 error 监听时沿用现状关闭会话 (`closeReason` 为 render-error), 有监听时跳过本帧继续渲染, 处理器内可自行 `session.close()`. 验收: 设备脚本两种情况各一组: 无监听 closed = true 且 closeReason = render-error; 有监听时 frames 继续增长, 事件计数与抛错帧数一致.
  完成: 有监听时抛错帧已提交的控件照常绘制, 未闭合的 begin / push 由 ErrorRecovery 收尾 (Q4). `device_r0_check.py`: 无监听 closeReason = render-error; 有监听 41 帧中抛错 6 帧, 事件 6 个 (phase render, frame 递增), 连续 5 帧的同一错误 console 只打印 1 次; 事件回调抛错发出 phase event 的 error 事件且会话不关; 处理器内 close 生效.
- [x] R0.4 `createWindow({debug: true})` (D3): 打开 Dear ImGui 的 ErrorRecovery 断言与 DebugLog 输出 (Begin / End 不配对等错误经 `console.warn` 与 logcat 可见), 并自动显示 Metrics 与 DebugLog 窗口 (R3.1 落地前先用现有 native 调用, R3.1 后改为复用). 验收: 设备脚本构造一次 `begin` 不 `end`, debug 模式 console 出现对应警告, 非 debug 模式没有.
  完成: 插件的 `IM_ASSERT` (ImGuiUserConfig.h) 在 debug 会话中报告为警告而不中止进程, 其他时候不求值; 用法错误经 ErrorCallback 收集, 同一消息连续出现只报一次. 插桩测试 `debugModeReportsAWindowLeftOpen` 与 `device_r0_check.py` 的 debug-warning 项 (debug 1 条 "Missing End()", 非 debug 0 条) 通过. R3.1 落地后 Metrics / DebugLog 窗口改为复用其调用.
- [x] R0.5 全局 setter 与单会话 (A7): `imgui.setAlpha` 等依赖活动会话的全局方法在没有活动会话时抛 `Error("imgui.<name>: no active session")` 而非空指针或静默; d.ts 标注; README 写明单会话模型 (新会话关闭旧会话). 验收: 单测 + 设备脚本无会话时调用抛出预期错误.
  完成: 覆盖 setTouchable / setMoreTouch / setGlobalAlpha / setSecure / collapseWindow / expandWindow / addButtonEx / getComponent (getComponent 以前返回 null, 按 Q3 推荐改为抛出, changelog hint 已写); 单测 `ImGuiScriptFacadeTest` 与 `device_r0_check.py` 的 no-session 项通过.
- [x] R0.6 别名说明 (A9): README 由 "PascalCase 全量别名, 迁移零成本" 改为 "常用 API 别名", 新增 `docs/ALIASES.md`: 194 个别名清单 (脚本从 `index.js` 生成, 入库脚本放 `tools/`) 与上游 C++ 签名的差异表 (ValueRef 风格, 多分量控件与键盘查询缺失等, 随 R3 / R4 补齐后更新). 完成: `tools/generate_aliases_doc.py` (`--check` 校验) 生成清单并按 vendored `imgui.h` 标出上游同名函数 (156 个有, `SetWindowFontScale` 为 obsolete, 37 个为插件功能或改名), 差异表在 ALIASES.md 手写部分.
- [x] R0.7 README 的目标 SDK 与 changelog 一致 (D4): 全部 10 语言 README 源写 37.
- [x] R0.8 示例 `examples/error-handling.js` (error 事件, debug 模式, 常见错误排查) 登记到 `examples/index.json` (6 个), `runExample` 可运行.
  完成: `listExamples()` 返回 6 个; `device_r0_check.py` 的 example 项 (`runExample("error-handling", {autoCloseMs: 3000})` 以 example-timeout 关闭, debug 默认开) 通过.
- [x] R0.9 发布 v1.11.0 (连同未发布的 v1.10.0 改动一起推送, v1.10.0 不单独打 tag, changelog 保留 1.10.0 条目).
  完成 (v1.11.0): master 与 tag v1.11.0 (8a02109, versionCode 38) 已推送. tag 触发的 Release 工作流在 "Build and verify release APKs" 失败: 构建与签名成功, 但工作流仍在 `app/releases` 找 APK, 而 `gradle/release-archive.gradle` 输出到 `releases/v<版本>` (v1.9.3 的 tag 运行同样失败, 当时由维护者手动发布). 按 v1.9.3 先例在干净工作区本地构建 (release-manifest.json 记录 8a02109, sourceDirty false), apksigner 核对 5 个包签名者为 31a681f..., 各 ABI 包只含对应原生库, 手动创建 Release 并上传 5 个 APK 与 SHA256SUMS. 索引登记 38.json, 提交 1c871a2 已推送 (requiresHostVersion 3853 -> 5935). 工作流路径是否修正登记为附录 B Q5.

******

### R1 - 单位, 参数校验与线程模型 (v1.12.0, 破坏性)

******

- [x] R1.1 坐标单位统一 (A3, D11): `createWindow` 的 x / y / width / height, `session.setPosition` / `setSize`, `session.x` / `y` / `width` / `height`, moved / resized 事件参数全部为 dp (x / y 由 px 改为 dp 属破坏性变化); 帧内 ImGui 坐标保持 px; 新增 `ui.dp(n)` (dp -> px), `ui.px(n)` (px -> dp) 与 `ui.density`; 示例去掉手动乘 `density`; d.ts 每个尺寸参数注明单位. 验收: 设备脚本 `createWindow({x: 100, y: 100, width: 200, height: 100})` 的实际 px 尺寸与位置 = 值 * density (误差 1 px).
  完成: 内部状态仍按 px 保存, getter / 事件 / 选项按 dp 换算 (density 取会话所在屏幕); 新增 `dp` / `px` / `density` 与别名 `Dp` / `Px`; 悬浮按钮几何一并改为 dp (Q8); 6 个示例改用 `ui.dp()`; d.ts 注明每个尺寸与选项的单位, 范围与默认值. 单测 `windowGeometryIsDp`, `densityConvertsBetweenDpAndPx`. 设备 (2026-10-29, `tools/device_r1_check.py`, 968e9f18 小米全部通过, 63751f63 OnePlus 抽测通过): `createWindow({x: 100, y: 100, width: 200, height: 100})` 的窗口 px 为 250 / 250 / 500 / 250 (density 2.5) 与 263 / 263 / 525 / 263 (density 2.625), surface 同宽高, 误差 <= 0.5 px; setPosition(50, 60) / setSize(220, 120) 后为 125 / 150 / 550 / 300 与 131 / 158 / 578 / 315, moved / resized 事件为 dp. 宿主 25eac064a (仅本地) 把 dp / px / Dp / Px / density 列入 ImguiNames, 加载插件前即可用; 两台设备装的是更早的宿主 (前者在首次加载后由 forwardUnlisted 补挂, 后者没有该功能, 全局 `imgui.dp` 不可用, 单位项记为 SKIP).
- [x] R1.2 参数校验统一 (A4, D2): 统一校验层, 非法类型 / NaN / 越界抛 `TypeError` 或 `RangeError`, 消息含 API 名与参数名 (如 `imgui.sliderFloat: argument "max" must be a finite number`); 移除旧的 `number()` 静默强转; 颜色参数统一接受 Color (打包整数, `[r, g, b, a]`, `{r, g, b, a}`, `"#rrggbbaa"`), 位置参数 r, g, b, a 作重载保留. 验收: 单测覆盖至少 20 个代表 API 的非法输入与颜色四种写法; 设备脚本抽查 5 个.
  完成: 校验层 argNumber / argInt / argFunction / argFlags 等, 数字字符串也抛 TypeError; 窗口选项由截断改为抛 RangeError (清单在 MIGRATION-1.12.md 第 2 节); 颜色四种写法在 textColored / pushStyleColor / setStyleColor / colorButton / tableSetBgColor / colorU32 等处统一, 位置参数重载保留; 悬浮按钮颜色数字改按 0xAABBGGRR (Q9). 单测 `invalidArgumentsNameTheApiAndTheArgument` (48 个用例, 约 40 个 API), `colorArgumentsAcceptEveryColorForm` (8 种写法 x 3 个 API 加位置重载). 设备 (2026-10-29, `tools/device_r1_check.py`, 968e9f18 小米全部通过, 63751f63 OnePlus 抽测通过): 经全局 imgui 抽查 11 个 (帧外 dp / createWindow / colorU32 / setTheme, 帧内 sliderFloat / setNextWindowBgAlpha / checkbox / textColored / beginTable, Session.setSize / setPosition), 错误类型与消息前缀全部符合; 四种颜色写法与位置重载的 colorU32 相同 (-3381709), textColored 均可绘制.
- [x] R1.3 Session 状态字段只读 (A8, D2): x, y, width, height, ready, closed, closeReason, mode, collapsed 等改为只有 getter (严格模式写入抛 `TypeError`), d.ts 标 `readonly`, 写入只走 `setPosition` / `setSize` 等方法. 验收: 单测.
  完成: Session 与 FloatingButton 字段只有 getter (含 window / surfaceView / imeView), 严格模式写入抛 TypeError; `session.theme` 改为反映 `imgui.setTheme`. 单测 `sessionFieldsAreReadOnly`; 设备上严格模式写 8 个字段均抛 TypeError, 非严格写入不生效.
- [x] R1.4 事件统一到脚本线程 (A6, D3): ready / resized / moved / configurationChanged / surfaceRestored / collapsed / expanded / closed 以及 error / back 等全部会话事件派发到脚本线程 (与帧回调同一 Looper); 新增 `docs/THREADING.md` 线程表 (帧回调, 会话事件, Promise 对话框 resolve, 触摸与 IME 处理各在哪个线程, 回调里禁止阻塞) 与后台任务模式; 示例 `examples/background-task.js` (`threads.start` 做 http 或耗时计算, 脚本主线程 `setInterval` 取结果渲染). 验收: 设备脚本在 ready / resized / configurationChanged / error 回调里记录 `threads.currentThread()` 与帧回调相同; 回调里 `sleep(300)` 不抛 "wrong thread" 类错误.
  完成: 会话事件, 悬浮按钮 / 折叠按钮回调, 对话框结果经 `events.emitter(脚本线程)` 投递, 在两帧之间执行 (已在脚本线程时直接执行); 窗口拖动的 moved 事件 source 改为 drag. 新增 `docs/THREADING.md`, 示例 `background-task` (examples/index.json 共 7 个). 单测 `eventsRaisedOnAnotherThreadRunOnTheScriptThread`, `eventsRaisedOnTheScriptThreadRunAtOnce`. 设备 (2026-10-29, `tools/device_r1_check.py`, 968e9f18 小米全部通过, 63751f63 OnePlus 抽测通过): ready / configurationChanged (由 UI 线程的 surface 回调触发) / resized (surface, configuration, api 三种来源) / moved / error 回调里 `threads.currentThread()` 与帧回调相同, 帧回调线程即脚本主线程, 回调里 `sleep(300)` 正常 (300 - 302 ms); 7 个示例 (background-task 带后台任务) 均按定时关闭, 无回调错误.
- [x] R1.5 迁移说明 `docs/MIGRATION-1.12.md` (单位, 校验, 只读字段三处变化与改法), changelog hint 条目指向它.
  完成: `docs/MIGRATION-1.12.md` (单位, 校验, 只读字段, 线程四节, 含前后对照代码与截断改抛错清单); 10 语言 changelog v1.12.0 的 4 条 hint 均为 "不兼容变更" 并指向迁移说明 / THREADING.md; README 与 11 份 plugin_instruction.md 的单位说明, 示例数 (7) 与 `ui.dp()` 示例同步.
- [x] R1.6 发布 v1.12.0.
  完成 (v1.12.0): 功能提交 1eb1a5c 推送后 Android CI 的 verify 作业在 verifyImGuiSource 失败 (Plot 共用函数改成了 `bridge[fn](...)`, 门禁要求 index.js 逐个出现 `bridge.<方法>(`), 修复提交 fd72aeb 恢复字面调用 (VERSION_BUILD 38), 本地与 CI 的 verify 作业均通过. tag v1.12.0 指向 fd72aeb (versionCode 42), tag 工作流 (Q5 = A 的修正) 一次通过: 由 `releases/v1.12.0` 取 5 个 APK, apksigner 校验, 生成 SHA256SUMS, 正文由英文 changelog 生成 (`.python/release_notes.py`), 自动创建 Release 并上传. 下载核对: SHA256SUMS 全部匹配, 5 个包签名者 31a681f..., aapt2 显示 versionCode 42 / native-code 四个 ABI. 索引登记 42.json (产物信息取自 CI 发布的 Release), 重新生成 plugins.official.generated.json 只有 ImGui 条目变化 (requiresHostVersion 仍为 5935), 提交 0ab5515 已推送, 索引 CI (Plugin Index, Markdown integrity) 通过. 同次推送带上了 R8 的 9d7b7dc.

******

### R2 - 大列表, 省电与纹理更新 (v1.13.0)

******

- [x] R2.1 ListClipper (D6): `ui.listClipper(itemCount, options, callback)` 回调式 (`options` 可省略: `{itemHeight, includeItems: number[]}`; `callback(begin, end)` 每个可见区间调用一次, 内部 `seekCursorForItem` 收尾), PascalCase 别名 `ListClipper`; combo / listBox 的 512 上限不变, `docs/LIMITS.md` 补 "大数据用 beginCombo + listClipper + selectable" 并给示例 `examples/large-list.js` (100000 行). 验收: 968e9f18 上 100000 行列表的帧耗时 (statsOverlay 读数) 不超过 5 ms, 滚动到任意位置内容正确, 单测覆盖 includeItems.
  完成: `ui.listClipper(itemCount, [options], callback)` 与别名 `ListClipper`, 回调收到每个可见区间 [start, end), `itemHeight` 省去量行高的一步, `includeItems` 的行在视野外也提交, 超出 [0, itemCount) 的下标忽略 (Q10); statsOverlay 新增 workTime (叠加层 "Work x.xx ms", `snapshot().workTime`, Q11); `docs/LIMITS.md` 补大数据写法, 示例 `large-list` (100000 行). 单测 `ImGuiScriptFacadeTest` 覆盖 includeItems (越界忽略, 小数取整, 非数字抛 TypeError), itemHeight 校验, 省略 options 的写法与回调抛错时仍收尾. 设备 (2026-10-30, `tools/device_r2_check.py`, 968e9f18 小米全部通过, 63751f63 OnePlus 抽测通过): 可见 18 行只提交 17 + 2 个 includeItems 行, 滚到 50000 行与末尾 (scrollMaxY 4999174) 的区间正确, 量行高模式先给 0-1 再给其余; 帧耗时按 Q12 = A 先行: 两台设备都是 debug 宿主 (6.8.0, 5935), 968e9f18 上空子窗口本身 6.1 - 6.2 ms, 100000 行 (clip) 中位数 12.7 - 14.6 ms, 不比只给可见行的 clipper (14.3 ms) 慢 (list-work 通过); 63751f63 上 100000 行 4.88 ms, 满足 5 ms; 968e9f18 的绝对 5 ms (list-work-5ms) 在 6.8.0 发布候选 (非 debug) 宿主上复核.
- [x] R2.2 省电 (D5): `createWindow` 选项 `idleFps` (默认 10, 0 关闭) 与 `idleDelay` (默认 3000 ms): 无触摸 / 无 IME 输入超过 idleDelay 后按 idleFps 渲染, 任何输入立即恢复; 熄屏 (SCREEN_OFF) 或锁屏暂停帧循环, 亮屏恢复; `session.setFps` / `setIdleFps` / `getFps`; 优先级 熄屏 > 收起 (collapsedFps) > 空闲 > 正常; 事件 `idle` / `active`. 验收: 设备脚本 3 s 无输入后实际帧率 10 (误差 2), 注入触摸后 1 帧内恢复; `adb shell input keyevent 26` 熄屏后 2 s 内帧计数停止, 亮屏解锁后恢复; 文档写明帧内动画脚本需 `setIdleFps(0)`.
  完成: createWindow 选项 `idleFps` (默认 10, 0 关闭) / `idleDelay` (默认 3000 ms), 触摸, 滚轮, 按键与 IME 输入经 `ImGuiActivityMonitor` 计时并立即唤醒帧循环; 熄屏或锁屏暂停帧循环, 解锁后恢复; `session.setFps` / `setIdleFps` / `getFps`, 字段 idle / paused / idleFps / idleDelay, 事件 idle / active (reason input / screen / api), 优先级 熄屏 > 收起 > 空闲 > 正常; `docs/FRAME-LOOP.md` 与 THREADING.md 写明帧内动画需 `setIdleFps(0)`. 单测 `ImGuiActivityMonitorTest`. 设备 (968e9f18 全部通过, 63751f63 抽测通过): 3.2 s 无输入进入空闲, 之后 3 s 30 帧 (10 fps), 注入点按后 0 - 3 ms 出帧, 点按所在帧不是空闲帧, 随后 1 s 59 帧; 968e9f18 熄屏 (keyevent 26) 后 1019 ms 出最后一帧, 2 s 内 0 帧, 锁屏期间 0 帧, 维护者手动解锁后 494 ms 出帧, 1 s 59 帧; 63751f63 有安全锁屏, 熄屏项未做. 小米屏幕变暗时第一次触摸只用来点亮, 设备脚本点按前先发 Shift 键.
- [x] R2.3 `texture.update(source)`: 同尺寸同格式复用 GL 纹理 (`glTexSubImage2D`), 尺寸变化时重建但句柄 id 不变; `source` 与 `createTexture` 相同 (文件路径 / 字节数组 / Bitmap / `images` 模块的 Image, 核对 P2 已有能力并补齐缺的类型); 示例 `examples/texture-refresh.js` (每 500 ms 截图 -> update -> `image` 控件预览). 验收: 设备脚本连续 update 100 次, `glGetError` 为 0, 纹理数量与堆内存不增长, 帧耗时稳定.
  完成: `texture.update(source)` 接受 createTexture 的全部来源, 同尺寸用 glTexSubImage2D 复用存储, 换尺寸在同一句柄与 GL id 下重新分配, 失败时记录 glGetError; 示例 `texture-refresh` (examples/index.json 共 9 个). 设备 (968e9f18 / 63751f63): 连续 update 100 次 glGetError 为 0, 纹理数 1 -> 1, native 堆 +10 KB / +222 KB, 图形内存 +0.5 MB (首帧后不再增长); 每次 update 7.2 - 8.8 ms (968e9f18), 前后 20 次按同帧位图绘制时间归一后的中位数稳定 (63751f63 的 CPU 每几秒在两档频率间切换, 原始毫秒数会整体翻倍, 故按比值判定); 缩小到 128 x 64 再恢复 256 x 256 时句柄不变.
- [x] R2.4 发布 v1.13.0.
  完成 (v1.13.0): 功能提交 6083c3f (VERSION_BUILD 40, versionCode 44) 推送后 Android CI 通过, tag v1.13.0 的工作流自动创建 Release (5 个 APK 与 SHA256SUMS). 下载核对: SHA256SUMS 全部匹配, 签名者 31a681f..., aapt2 显示 versionCode 44. 索引登记 44.json, 提交 249ec14 已推送, 索引 CI 通过.

******

### R3 - 调试窗口, 返回键, 表格排序与多分量控件 (v1.14.0)

******

- [x] R3.1 调试窗口: `showMetricsWindow` / `showDebugLogWindow` / `showIdStackToolWindow` / `showStyleEditor` / `showAboutWindow` / `showUserGuide` (各带可选 open 引用) 与 PascalCase 别名; R0.4 的 debug 模式改为复用这些. 验收: 设备脚本逐个调用一帧不报错, 示例 widget-overview 加 "Debug" 菜单.
  完成: native `ShowToolWindow` 按编号画 6 个窗口 (上游 ShowStyleEditor / ShowUserGuide 只画内容块, 这里各包一个窗口), open 引用接受 `imgui.bool` 与 `{value}`, 关闭按钮把它写回 false; R0.4 的 debug 模式改为调用同一函数; widget-overview 加 "Debug" 菜单, 宿主 `ImguiNames` 列入新名称 (宿主本地 3ef7d668c, 未推送). 单测 `toolWindowsPassTheToolAndTheOpenFlag`; 设备 (`tools/device_r3_check.py`) tools 项 18 次调用 (无引用 / 引用 / 别名各 6) 无报错.
- [x] R3.2 返回键 (D7): `session.on("back", e)` 可用 `e.preventDefault()` 拦截; 未拦截时 Activity 全屏模式关闭会话 (`closeReason` 为 back), 悬浮窗模式 IME 有焦点时先收键盘 (现状), 无焦点时系统不派发 (README 写明). 验收: 设备脚本 Activity 模式 `adb shell input keyevent 4`: 无监听关闭且 closeReason = back; 监听并 preventDefault 时会话仍在且事件计数 1.
  完成: Activity 模式的返回键先派发 `back` 事件 (软键盘显示时先收键盘, 不派发), 未拦截时关闭会话 (`closeReason` 为 back, Activity 保留); 悬浮窗限制写进 README 与 changelog hint (行为变化). 设备 back-close (closeReason=back, Activity 仍在) 与 back-prevent (会话仍在, 事件 1 次) 通过. Android 16 的预测性返回未覆盖 (两台测试机为 SDK 35).
- [x] R3.3 表格排序: `tableGetSortSpecs()` 返回 `{specsDirty, specs: [{columnIndex, columnUserId, sortDirection, sortOrder}]}` (只暴露上游 1.92.9 的公开 API), `TableFlags.Sortable` / `SortMulti` / `SortTristate` 与 `TableColumnFlags.DefaultSort` / `PreferSortAscending` / `PreferSortDescending` 落地; `dataTable` 组件 `opts.sortable` 自动排序 rows. 验收: data-table-demo 示例加排序, 点击表头排序正确, specsDirty 只在变化的那一帧为 true.
  完成: `tableGetSortSpecs()` 与 `imgui.SortDirection`, `tableSetupColumn` 第 4 个参数为 column user id; `dataTable` 的 `sortable: true` 按排序规格稳定排序 rows, 列可给 `compare`, `setRows` 后保持当前排序; data-table-demo 加排序. 单测 `tableSortSpecsAreCopiedFromTheBridge` / `sortableDataTableSortsItsRowsWhenTheSpecsChange`; 设备点表头 (含 Shift 多列与三态) 6 组规格全对, specsDirty 603 帧中只有 6 帧为 true (每次点击一帧), dataTable 排序与 setRows 后重排通过.
- [x] R3.4 多分量控件: `dragFloat2/3/4`, `dragInt2/3/4`, `sliderFloat2/3/4`, `sliderInt2/3/4`, `inputFloat2/3/4`, `inputInt2/3/4`, `dragFloatRange2`, `dragIntRange2`, `vSliderFloat`, `vSliderInt`, `sliderAngle` (已有的跳过); 引用用 `imgui.floats` / `ints` 数组或 `{value: [...]}`; d.ts, 别名, widget-overview 示例段, `docs/ALIASES.md` 差异表更新. 验收: 单测 + 设备脚本抽查 4 个控件的值回写 (经 `addMousePosEvent` 注入拖动).
  完成: 新增 18 个多分量控件, `dragFloatRange2` / `dragIntRange2`, `sliderAngle` (存弧度, 显示角度) 与 `imgui.ints`; `vSliderFloat` / `vSliderInt` 已有, 跳过. 单测 `multiComponentWidgetsMapTheirArgumentsAndWriteBack`; 设备抽查 dragFloat3 (imgui.floats), sliderInt2 ({value}), dragFloatRange2, sliderAngle 4 个控件的值回写 (968e9f18: 146.5 / 86 / 59-90 / 2.41 rad; 63751f63: 152 / 89 / 62-90 / 2.53 rad). 插件没有公开的脚本鼠标注入, 拖动改用 `adb shell input swipe` 真实触摸 (Q13).
- [x] R3.5 慢帧警告 (Q7): `createWindow({debug: true})` 时单次渲染回调超过 250 ms 经 `console.warn` 提示阻塞时长, 并建议把耗时工作移到 `threads.start` (见 THREADING.md), 同一会话限频. 验收: 设备脚本在 debug 模式回调里 `sleep(300)` 触发一次 warn, 非 debug 模式不触发.
  完成: 超过 250 ms 时 `console.warn` 报告时长与 `threads.start` 建议, 同一会话每 10 秒最多一次; THREADING.md 补写法. 设备在第 5 / 12 帧各 `sleep(300)`: debug 模式 1 条 (303 ms, 限频生效), 非 debug 模式 0 条, 两台设备一致.
- [x] R3.6 发布 v1.14.0.
  完成: tag v1.14.0 (23604b8, VERSION_BUILD 42, versionCode 46) 由 tag 工作流发布 (5 个 APK, SHA256SUMS, 英文 changelog 正文); 下载核对哈希, 签名者 31a681f... 与 versionCode 46 通过; 官方索引 5cd537d (46.json, 只有 ImGui 条目变化, requiresHostVersion 仍 5935), 索引 CI 通过. 宿主 3ef7d668c (ImguiNames 等 R3 名称) 仅本地.

******

### R4 - 键盘查询, 剪贴板, 拖放与 DrawList 补全 (v1.15.0)

******

- [x] R4.1 键盘查询: `isKeyDown` / `isKeyPressed(key, repeat)` / `isKeyReleased` / `getKeyPressedAmount` / `getKeyName` / `isKeyChordPressed` / `shortcut(keyChord, flags)` / `setNextItemShortcut`, `Mod` 修饰常量 (Ctrl / Shift / Alt / Super) 与 `InputFlags`. 验收: 设备脚本 `sendKey` 后下一帧 `isKeyPressed` 为 true, 再下一帧为 false.
  完成: 8 个函数与 PascalCase 别名, `Mod`, `InputFlags`; `Key` 补全到整个键盘 (0 - 9 为 `Digit0` - `Digit9`), 无效 key / 和弦 JS 抛 RangeError, 原生层复检 (Dear ImGui 按值索引键表). `isKeyPressed` 的 `repeat` 默认 true (同 C++). 设备 `tools/device_r4_check.py`: addKeyEvent 与 sendKey 都是下一帧 true, 再下一帧 false; Ctrl+S 的 isKeyChordPressed / shortcut, RouteGlobal, setNextItemShortcut 各触发 1 次.
- [x] R4.2 剪贴板: `getClipboardText` / `setClipboardText` 对接 Android ClipboardManager (与宿主 `setClip` / `getClip` 互通), ImGui 内部 Ctrl+C / Ctrl+V 走同一通道. 验收: 设备脚本 set 后 get 一致, 宿主 `getClip()` 可见.
  完成: `ImGuiClipboard` 走宿主 Context 的 ClipboardManager, `nativeUsePlatformClipboard` 把 Platform_Get / SetClipboardTextFn 接到同一通道 (特权进程保持 Dear ImGui 本地剪贴板); get / set 不需要会话. Android 10+ 无焦点读取受限写进 LIMITS.md. 设备 (Activity 模式有焦点): set 后 get 一致, 宿主 getClip 可见, 宿主 setClip 后 get 一致, inputText 里注入 Ctrl+C / Ctrl+V 互通.
- [x] R4.3 拖放: `beginDragDropSource(flags)` / `setDragDropPayload(type, data)` (字符串, 数字或可 JSON 化对象) / `endDragDropSource` / `beginDragDropTarget` / `acceptDragDropPayload(type, flags)` (返回 payload 或 null) / `endDragDropTarget` / `getDragDropPayload`, 糖 `withDragDropSource` / `withDragDropTarget`, `DragDropFlags` 常量. 验收: 设备脚本用 `addMousePosEvent` / `addMouseButtonEvent` 序列模拟拖动, payload 到达目标; widget-overview 加拖放段.
  完成: payload 为 `{type, data, preview, delivery}`, data 经 JSON 复制, 上限 `Limits.DragDropPayloadMaxBytes` (64 KiB), `_` 开头的类型不可设, `_COL3F` / `_COL4F` 可接收颜色; 未配对的 end / 区外调用 / 嵌套抛 IllegalStateException 而不破坏栈. 设备: 字符串, 数字, 对象三种 payload 经注入序列到达目标, AcceptBeforeDelivery 预览, SourceAllowNullID 文本项, colorButton 颜色; widget-overview 新增 "Drag and drop" 段 (四格互换).
- [x] R4.4 DrawList 补全: Path 系列 (`pathClear` / `pathLineTo` / `pathArcTo` / `pathArcToFast` / `pathBezierCubicCurveTo` / `pathBezierQuadraticCurveTo` / `pathRect` / `pathStroke` / `pathFillConvex` / `pathFillConcave`), `pushClipRect` / `popClipRect` (DrawList 级与窗口级), 以及缺少的图元 (`addEllipse` / `addEllipseFilled` / `addNgon` / `addNgonFilled` / `addBezierQuadratic` / `addQuad` / `addQuadFilled` / `addTriangleFilled` / `addRectFilledMultiColor` / `addImageQuad` / `addImageRounded` / `addConvexPolyFilled` / `addConcavePolyFilled`, 已有的跳过). 验收: androidTest 像素基线或设备脚本截图比对, 示例段.
  完成: 全部图元与 Path 系列 (addTriangleFilled 已有, 跳过), `pathStroke(color, thickness, flags)` 沿用 1.92.8 起的新参数顺序; `drawList.pushClipRect` 默认不与当前相交 (同 C++), 窗口级 `ui.pushClipRect` 默认相交; 无配对的 pop 抛错 (按绘制列表与帧计数), 弧的跨度限 16 圈 (`LIMITS.md`). 设备脚本 21 格截图取样 54 点比对 (截图 PNG 用标准库解码; 广色域屏把纯绿映射为约 (117, 251, 76), 按色类比较); widget-overview 新增 "Custom drawing" 段, 示例总数仍 9.
- [x] R4.5 鼠标注入 (Q13): 新增公开 `addMousePosEvent(x, y)` 与 `addMouseButtonEvent(button, down)` (对应 `ImGuiIO::AddMousePosEvent` / `AddMouseButtonEvent`), PascalCase 别名, d.ts, 单测, ALIASES.md 差异表, 10 语言 changelog 一条; 坐标为帧内 px (D11), 按钮常量与 `MouseButton` 一致, d.ts 与 LIMITS.md 写明. 验收: 设备脚本 (a) 用注入序列复验 R3.4 的 4 个多分量控件回写, 精确断言; (b) R4.3 拖放的注入序列.
  完成: 事件走输入 FIFO, 算作触摸来源 (与手指一致, 不依赖屏幕变暗或 adb swipe). 复验精确值 dragFloat3 150 / sliderInt2 100 / dragFloatRange2 40 / sliderAngle pi; 拖放注入见 R4.3.
- [x] R4.6 发布 v1.15.0.
  完成: 8b74988 (VERSION_BUILD 44, versionCode 48) 推 master, Android CI 绿; tag v1.15.0 由工作流创建 Release (5 APK + SHA256SUMS), 下载核对哈希, 签名者 31a681f... 与 versionCode 48 通过; 索引 48.json 提交 0cdfee2 (只有 ImGui 条目变化, requiresHostVersion 仍 5935), 索引 CI 绿. 宿主 5102dbe42 仅本地 (ImguiNames 573, 含 api-coverage 登记, Q14). 设备: 968e9f18 与 63751f63 的 tools/device_r4_check.py 全部 PASS, 968e9f18 的宿主 device_global_check.py (旧宿主 5935, 经 forwardUnlisted) 全部 PASS.

******

### R5 - Android 场景补全 (v1.16.0)

******

- [x] R5.1 `session.capture(options)` 返回 `images` 模块的 Image (悬浮窗与 Activity 模式经 PixelCopy, 特权模式经 `glReadPixels`), `options.region` 可选. 验收: 返回尺寸 = 窗口 px 尺寸, `images.save` 可写出, 连续 20 次无泄漏.
  完成: `session.capture(options)` 返回宿主 ImageWrapper (`ImageWrapper.ofBitmap(runtime, bitmap)`, 随脚本运行时回收; 宿主 `images` 模块没有 `fromBitmap`). 悬浮窗与 Activity 经 PixelCopy (独立 HandlerThread, 5 s 超时, 帧内可用), 特权模式重绘上一帧后 `glReadPixels`, 帧内抛错 (Q20). `options.region` 单位 dp, 在窗口处截断. 设备: 尺寸, 像素, region, `images.save` 全过; 连续 20 次 PSS 与 native 无增长 (968e9f18 悬浮窗 165548 -> 165352 KB, native 23748 -> 23746 KB).
- [x] R5.2 DPI 与旋转重算: `configurationChanged` 时 density 或 fontScale 变化则重建字体图集并按新旧比例 `ScaleAllSizes`; 旋转时 dp 位置换算保持. 验收: 模拟器 `adb shell wm density` 改密度后字体与控件尺寸随之变化且不崩溃 (真机不改 density).
  完成: 每 250 ms 在帧间检查 density 与系统 fontScale (`updateDisplayScale`), `nativeSetDisplayScale` 做 `ScaleAllSizes(ratio)` 与 `FontScaleDpi`, 动态图集按需重新烘焙并 `CompactCache`; 窗口与悬浮按钮保持 dp, `responsive: false` 也生效. 系统 fontScale 只缩放字体 (Q22). `configurationChanged` 增加 density / oldDensity / fontScale / oldFontScale. Activity 窗口所在 Activity 被系统重建, 会话以 `configuration-changed` 关闭 (Q21). 验证: emulator-5630 (AVD_API_36.1_16K) `wm density 630` 文字 42 -> 63 px, 控件 1.48 倍, 窗口 dp 不变, capture 正常; `font_scale 1.3` 文字 63 -> 82 px, padding 不变; reset 后恢复; 968e9f18 / BH900ASK9E 旋转 dp 不变.
- [x] R5.3 CJK 字体回退: 核对 P1 内置裁剪版 CJK 的覆盖范围, 新增 `createWindow({systemCjkFont: true})` (或 `fonts: ["system-cjk"]`) 从 `/system/fonts` 的 Noto Sans CJK 加载完整字形 (生僻字), 缺失时回退内置. 验收: 设备截图里 "龘" 等内置子集缺字在系统字体下不是方块.
  完成: 选 `createWindow({systemCjkFont: true})`. 内置子集实测 8,284 码位, 汉字 6,763 (恰为 GB 2312), 写进 LIMITS.md. 实测 Android 15 / 16 的 `NotoSansCJK-Regular.ttc` 是 CFF2 可变字体, stb_truetype 读不了, 所以改为自定义 ImFontLoader: 缺字由 Android Paint 逐字绘制进图集 (ImGuiSystemGlyphs, Q18), 限 BMP 的 CJK 与韩文区块, 不读字体文件; 系统没有 CJK 字形时回退内置. 验收: 968e9f18 截图 '龘' 墨迹 5261 对内置 970, 宽度 110 对 111 (内置 53 为 '?'); 内存差 native 0.8 MB.
- [x] R5.4 特权模式 IME 回退: `WindowMode.Privileged` 下 `wantTextInput` 为 true 时弹出宿主 floaty 临时输入框 (单行 / 多行, 提交后 `addInputCharacters`, 失焦收起), README 已知限制更新. 需要 root 或 Shizuku 设备. 验收: 特权模式 `inputText` 可经临时输入框输入中文.
  完成: 特权模式 `wantTextInput` 时弹出宿主 floaty 输入框 (单行 72 dp, 多行 160 dp, 密码类型), OK / 完成键 / 框外触摸 / 失去窗口焦点都提交: `addInputCharacters` 后补 Enter (多行 Ctrl+Enter, CtrlEnterForNewLine 时 Enter). 打开期间特权层呈现空帧, 直连输入关闭 (Q19). 只能在光标处追加. README 10 语言与 PRIVILEGED-BACKEND.md 已更新. 验收: BH900ASK9E (Android 9, Shizuku) 与 968e9f18 (Android 15, Shizuku) 中文单行, 多行, 框外滑动收起全过, 层隐藏 28800 -> 0 -> 28800 / 45000 -> 0 -> 45000 像素.
- [x] R5.5 捏合缩放手势: `createWindow({pinchZoom: true})` (默认 false) 时双指捏合调整字体缩放 (0.5 - 3 倍, `io.FontGlobalScale` 或 `setWindowFontScale`), 与已有双指滚动的判别: 两指距离变化超过阈值即捏合. 验收: 真机手动验证加日志, 设备脚本注入双指 MotionEvent 序列核对缩放值.
  完成: 选 `style.FontScaleMain` (0.5 - 3 倍, 只改文字与由文字决定的尺寸, 不动 padding). 两指仍是滚动, 距离变化超过 24 dp 后转为捏合直到抬指, 倍数跟随两指距离之比. 脚本读 `session.fontScale`, 监听 `fontScaleChanged` (scale, oldScale, source 为 pinch 或 api), 用 `session.setFontScale()` 设回. 特权窗口的直连输入只跟一个手指, 没有捏合 (写进 LIMITS.md). 验收: `tools/device_r5_check.py` 的 pinch 组注入双指序列核对缩放值与滚动判别, 968e9f18 / BH900ASK9E / 63751f63 / emulator-5630 通过; 手动 `pinch-manual` 在 968e9f18 上 986 次变化, 升到上限 3 后回到 1.024.
- [ ] R5.6 发布 v1.16.0.

******

### R6 - 多选与多窗口 (v1.17.0)

******

- [ ] R6.1 多选: `beginMultiSelect(flags, selectionSize, itemsCount)` / `endMultiSelect` / `setNextItemSelectionUserData` / `isItemToggledSelection`, `MultiSelectFlags` 常量, 返回的 requests (`{type, selected, rangeFirstItem, rangeLastItem, rangeDirection}`) 由 JS 层 `imgui.selectionStorage()` 应用到 Set; 与 R2.1 listClipper 配合; `examples/large-list.js` 加多选. 验收: 100000 行 Shift / Ctrl 范围选择正确 (修饰键经 `addKeyEvent` 注入).
- [ ] R6.2 多窗口文档与示例: `docs/MULTI-WINDOW.md` 说明单 Surface 多 ImGui 根窗口模式 (多次 `withWindow`, 各自位置 / 折叠 / 关闭按钮 / 焦点), 示例 `examples/multi-window.js`, README 写明单会话限制. 验收: 示例在 968e9f18 跑通.
- [ ] R6.3 发布 v1.17.0.

******

### R7 - 开发者体验收尾 (v1.18.0)

******

- [ ] R7.1 d.ts 精度 (D1): 39 处 `unknown` 清零, `alert` / `confirm` / `singleChoice` / `multiChoice` 等 `...args: any[]` 改为具体重载, Options 不再继承 `Record<string, any>` (拼写错误可被 TS 捕获), `rowKey` 接受键名字符串或函数, 每个公开成员至少一行 JSDoc (含单位与线程说明). 验收: d.ts 中 `unknown` 计数 0, 全部示例以 `tsc --strict` 对照 d.ts 通过, 现有 d.ts 校验通过.
- [ ] R7.2 示例清单核对 (D2): `examples/index.json` 含 error-handling / background-task / large-list / texture-refresh / multi-window 等各阶段新增示例 (共 10 个), 每个经 `runExample` 在 968e9f18 跑通.
- [ ] R7.3 文档总校 (D4): 10 语言 README 与 changelog 的能力清单, SDK, 别名说明一致; `docs/` 目录索引; `docs/LIMITS.md` 更新; 写一份给 api-coverage P5.2f 的移交清单 (成员总数, d.ts 路径, 文档入口).
- [ ] R7.4 发布 v1.18.0.

******

### R8 - 独立渲染线程评估 (不发版, 可与 R1 起并行)

******

- [x] R8.1 原型 (D12): 在本地克隆 (`E:/.cache/imgui-render-thread`, 不是工作区仓库) 实现最小命令缓冲: 脚本线程录制 ImGui 调用或 ImDrawData 快照, 独立渲染线程回放并交换缓冲; 不改 master.
  完成: 克隆基线 9c1b366, 7 个提交: probe (帧统计与 MotionEvent 时间) + `createWindow({renderThread})` 的 snapshot (脚本线程照常构建, 渲染线程只提交与 swap) / replay (脚本线程录制 10 个函数, 渲染线程运行 Dear ImGui 并回传控件结果) 两种模式 + 测量脚本 `tools/device_r8_render_thread.py`; native 改动 856 行. master 未改.
- [x] R8.2 实测 (968e9f18): 帧耗时 p50 / p95, 触摸到渲染延迟, 回调里 `sleep(500)` 时界面是否冻结, 线程数与内存, 与现状逐项对比表.
  完成: 968e9f18 上现状与 off / snapshot / replay 各测 3 轮, 功能检查全部 PASS (3 轮中位数): 脚本构建 light 6.2-7.0 / heavy 11.3-12.1 ms, 各模式基本相同; 提交 + swap 1.9 / 0.8 ms -> snapshot 0.2 / 0.1, replay 约 0; 出帧 58.2-58.7 fps (p95 间隔 20-22 ms), replay 60.0 fps (p95 17.7); 触摸到出帧 17-18 ms 各模式相同; 触摸到脚本 replay 41.7 / 65.4 ms, 其他 33.0-40.3 / 44.0-53.9 (约晚一帧); 回调 `sleep(500)` 时现状 / off / snapshot 最大出帧间隔约 519 ms (冻结), replay 18.8 ms 且触摸 25 ms 内画出; ImGuiRender 线程开窗 1 关窗 0, 内存中位数差 < 1 MB. 原始数据在共享笔记 side-session-notes/local_bb1ba6fe-68da-4d44-8260-309685fddd1a/r8-data/.
- [x] R8.3 结论写入 `docs/FRAME-LOOP.md` 新节 "独立渲染线程评估 (2026-11)", 原型以 `docs/prototypes/render-thread.patch` 入库 (不合并代码), 给出是否作为 2.0 候选的建议; 只提交 docs, 不改版本号.
  完成: 提交 9d7b7dc (随 R1 推送, VERSION_BUILD 36): FRAME-LOOP.md 新节 "Independent render thread evaluation" 与补丁 (`.gitignore` 含 `*.patch`, 用 `git add -f` 入库; 在 9c1b366 上 `git am --empty=drop` 可应用, 结果树与原型一致). 结论: 不作为 2.0 候选, 保持同线程即时模式 (Q6 = A); debug 模式慢帧警告由 R3.5 实施 (Q7 = A). Roadmap 勾选由 R2 子会话补做.

******

### 附录 A - R 系列决策记录 (2026-10-29, 维护者选择题拍板)

******

- D1 范围 (非推荐项): 评审全部条目纳入 (含中低价值项与 Android 场景), 不纳入 Docking / 多视口 (沿用 P6 暂缓结论).
- D2 兼容 (非推荐项): 破坏性修正直接进 1.11.0 起的版本 (非法参数抛 TypeError / RangeError, Session 字段只读), 不设 strict 开关, 以 changelog hint 与迁移说明告知.
- D3 线程 (非推荐项): 会话事件统一派发到脚本线程; 另评估独立渲染线程 (R8).
- D4 错误: 回调抛错触发 error 事件并 console.error; 无监听才关闭会话, 有监听跳过本帧继续; `options.debug` 打开断言日志与调试窗口.
- D5 省电: 默认开启空闲降帧 (idleFps 10, idleDelay 3000 ms) 与熄屏暂停; `session.setFps` / `setIdleFps` 运行时可改.
- D6 大列表: 回调式 `ui.listClipper`; combo / listBox 512 上限不变.
- D7 返回键: `on("back")` 可拦截; 默认按模式处理 (Activity 关闭会话, 悬浮窗仅 IME 焦点时收键盘).
- D8 发布: 子会话在真机测试通过后可推送 master, 打 tag 发 Release, 登记官方插件索引.
- D9 节奏: 每阶段一个 minor 版本 (R0 = 1.11.0 ... R7 = 1.18.0); 未发布的 1.10.0 随 R0 一起推送, 不单独发.
- D10 文档: 本路线图只维护插件内 README / docs / d.ts / changelog; 宿主文档站, TypeScript-Declarations, Ace 由 api-coverage P5.2f 接入.
- D11 单位: 窗口级参数 (createWindow, setPosition / setSize, 会话字段与事件) 全部 dp, 帧内 ImGui 坐标 px, 提供 `ui.dp` / `ui.px` 换算.
- D12 渲染线程评估: 产出结论文档与不合并的原型补丁.

******

### 附录 B - R 系列待决事项

******

格式: `- [状态] 编号 问题 | 选项: A (推荐) / B | 影响: 条目 | 改选返工: ... | 来源`. 状态: 需拍板 / 已按推荐先行待确认 / 已决 / 暂缓. 编号从 Q1 起.

- [已决 (2026-10-29 21:50, 维护者选: A 保持现状)] Q1 宿主 `ImguiModule` 不透传 `ImguiNames` 之外的成员 (核实结果: 1.10.0 宿主上插件新增的函数经全局 `imgui` 为 undefined), 怎么补 | 选项: A (推荐, 已先行) 宿主在插件首次加载后把名单外的公开成员补挂到模块对象 (函数转发, 其他值 getter; 宿主本地提交), README 写明新成员在首次使用 `imgui` 任一成员后才出现, 渲染回调的 `ui` 始终完整 / B 只写文档: 新成员要等配套宿主, 之前用 `plugins.load(...)` 取完整对象 / C 宿主改为 Proxy 式按名查找 (每次访问都查插件对象, 加载前也能看到名称需先加载插件) | 影响: R0.1 及以后每个阶段的新增成员 | 改选返工: B 撤销宿主 forwardUnlisted (约 40 行) 并改 README 一句; C 需改宿主模块层的安装模型, 约 1 天 | 来源: imgui-r0
- [已决 (2026-10-29 21:50, 维护者选: A 保持现状)] Q2 PlotOptions `stride` 的单位 | 选项: A (推荐, 已先行) 按值的个数 (stride 2 即每隔一个取值, JNI 内乘以 sizeof(float)) / B 按字节, 与 C++ 的 `stride` 一致 (脚本需写 8 表示每隔一个 float) | 影响: R0.2, d.ts 与 ALIASES.md 差异表 | 改选返工: B 改一行换算与单测, 文档两处, 约 0.5 小时 | 来源: imgui-r0
- [已决 (2026-10-29 21:50, 维护者选: A 保持现状)] Q3 `getComponent` 没有活动会话时的行为 (1.10.0 返回 null) | 选项: A (推荐, 已先行) 与其他依赖会话的全局方法一致, 抛 `imgui.getComponent: no active session` (破坏性, changelog hint 已写) / B 保持返回 null, 只有 setter 类方法抛出 | 影响: R0.5 | 改选返工: 一行代码, 单测与 d.ts 注释各一处, 约 0.5 小时 | 来源: imgui-r0
- [已决 (2026-10-29 21:50, 维护者选: A 保持现状)] Q4 有 `error` 监听时, 渲染回调抛错那一帧怎么呈现 | 选项: A (推荐, 已先行) 抛错前已提交的控件照常绘制, 未闭合的 begin / push 由 ErrorRecovery 静默收尾 (等同 Dear ImGui 的 "recoverable error" 行为), 下一帧重新调用回调 / B 丢弃这一帧 (不绘制, 保留上一帧画面) | 影响: R0.3 | 改选返工: B 需在 native 加 "结束帧但不提交绘制" 路径与插桩测试, 约 2 小时 | 来源: imgui-r0
- [已决 (2026-10-29 21:50, 维护者选: A)] Q5 tag 触发的 Release 工作流在 `find app/releases` 失败 (v1.9.3 与 v1.11.0 两次; `release-archive.gradle` 输出到 `releases/v<版本>`, AGENTS.md 也写明 `app/releases` 不是发布输入), 后续 R1 - R7 的发布怎么走 | 选项: A (推荐) 修正工作流: 产物路径改为 `releases/<tag>`, 正文由英文 changelog 生成 (索引的 changelogText 取自 Release 正文, `--generate-notes` 的自动正文不适合), 附 SHA256SUMS; tag 推送即由 CI 发布, 不再本地上传 / B 改为只手动发布: 去掉工作流的 release 作业, 每次本地 `appendDigestToReleasedFiles` 后 `gh release create` (v1.9.3 / v1.11.0 的做法) / C 不改, 每次 CI 失败后手动补发 | 影响: R1 - R7 的发布步骤 | 改选返工: A 约 1 小时, 在 v1.12.0 的 tag 上验证; B 约 0.5 小时; C 无 | 来源: imgui-r0 | 实施: R1 (1eb1a5c), v1.12.0 的 tag 运行一次通过, Release 由 CI 创建
  完成 (代码): 工作流 release 作业改为在 `releases/<tag>` 找 5 个 APK, 生成 SHA256SUMS, 正文由 `.python/release_notes.py` 从 `.changelog/lang_en.json` 的该版本条目生成 (格式沿用 v1.11.0 手动发布的正文, 单测 `test_release_notes.py`), Release 已存在时只更新正文并覆盖上传; 实际效果在 v1.12.0 的 tag 上验证.
- [已决 (2026-10-30 00:50, 维护者选: A 保持现状)] Q6 独立渲染线程是否作为 2.0 候选 | 选项: A (推荐, 已先行: FRAME-LOOP.md 结论按此写) 不作为候选, 保持同线程即时模式, 回调内阻塞靠 R1.4 的 THREADING.md 与 background-task 示例解决, 补丁仅作参考 / B 2.0 加 replay 可选模式 (renderThread: "replay": sleep 时仍 60 fps 出帧, 触摸 25 ms 内画出, 但只支持声明的控件子集, 脚本拿到结果晚约一帧; 原型两种模式 856 行 native 只录制 10 个函数, 估计新增 2-3 个阶段, 之后每个 API 阶段要实现并测试两遍) / C 2.0 加 snapshot 可选模式 (全部 API 不变, 每帧省 1-2 ms 脚本时间, 不解决冻结; 约 1 个阶段, 需在模拟器 / ColorOS / 16 KB 上验证共享 EGL 上下文) | 影响: R8.3 结论段; B / C 要在 Roadmap 新增阶段 | 改选返工: 改 FRAME-LOOP.md "Recommendation" 段约 10 行, 由调度会话立项, 原型补丁 docs/prototypes/render-thread.patch 可作起点 | 来源: imgui-r8
- [已决 (2026-10-30 00:50, 维护者选: A, 由 R3 实施)] Q7 回调阻塞的提示: debug 模式下是否加慢帧警告 | 选项: A (推荐) 在 R3 (调试窗口阶段) 加一条: `createWindow({debug: true})` 时单次渲染回调超过 250 ms 经 console.warn 提示阻塞时长并建议把耗时工作移到 threads.start, 同一会话限频, 约 20 行 + 设备脚本 1 项 / B 不加, 只靠 R1.4 的 THREADING.md 说明 | 影响: R3 (新增 R3.5, 发布顺延为 R3.6) | 改选返工: 无 (未实施) | 来源: imgui-r8
- [已决 (2026-10-30 00:50, 维护者选: A 保持现状)] Q8 悬浮按钮 (`addButtonEx` / `FloatingButton`) 是否随 R1 一起改为 dp 与只读字段 | 选项: A (推荐, 已先行) 一起改: 选项 x / y / width / height / size / borderWidth / rounding / elevation 为 dp (textSize 为 sp), 字段只读, `setPosition(x, y)` 去掉 source 参数, onMoved 的 x / y 为 dp (source 为 drag / api / configuration) / B 只改窗口会话, 悬浮按钮保持 px 与可写字段 (同一脚本里两套单位) | 影响: R1.1, R1.3, d.ts, MIGRATION-1.12.md 第 1 / 3 节, changelog hint | 改选返工: B 约 1 小时 (index.js 按钮换算与 getter, d.ts, MIGRATION 与 changelog 各一处, 单测 2 个) | 来源: imgui-r1
- [已决 (2026-10-30 00:50, 维护者选: A 保持现状)] Q9 悬浮按钮颜色 (backgroundColor / borderColor / textColor) 传数字时怎么解释 (1.11.0 按 Android ARGB 0xAARRGGBB) | 选项: A (推荐, 已先行) 与其他 imgui 颜色统一按打包 0xAABBGGRR (colorU32 的返回值) 解释, 数组 / 对象 / "#rrggbbaa" 写法不变, 破坏性, changelog hint 与 MIGRATION 已写 / B 保持 Android ARGB, 只在 d.ts 注明按钮颜色的数字写法与其他颜色不同 | 影响: R1.2 | 改选返工: B 约 0.5 小时 (androidColor 一处, 单测 1 个, d.ts / MIGRATION / changelog 各一句) | 来源: imgui-r1
- [已决 (2026-10-30 10:46, 维护者选: A 保持现状)] Q10 `listClipper` 的 `options.includeItems` 里超出 [0, itemCount) 的下标怎么处理 | 选项: A (推荐, 已先行) 静默忽略 (非数字仍抛 TypeError, 小数按其他整数参数取整), 适合 `includeItems: [selected]` 在 selected 为 -1 或数据缩短后的常见写法 / B 抛 RangeError, 与其他参数的越界一致 | 影响: R2.1 | 改选返工: B 约 0.5 小时 (index.js 一处, 单测 1 个, d.ts / LIMITS.md 各一句) | 来源: imgui-r2
- [已决 (2026-10-30 10:46, 维护者选: A 保持现状)] Q11 R2.1 验收 "帧耗时 (statsOverlay 读数) <= 5 ms" 用哪个读数: statsOverlay 原有的 frameTime 是两帧间隔 (60 fps 时恒为约 16.7 ms, 不可能 <= 5 ms) | 选项: A (推荐, 已先行) statsOverlay 新增 workTime (渲染回调加组件的耗时, 不含 eglSwapBuffers 与等待), 叠加层多一行 "Work x.xx ms", snapshot() 多一个字段, 验收按 workTime / B 不加字段, 验收改用设备脚本自行计时 (overlay 读数仍只有帧间隔) | 影响: R2.1, statsOverlay 的 d.ts | 改选返工: B 约 0.5 小时 (删字段与一行文字, d.ts 与 changelog 各一处) | 来源: imgui-r2
- [已决 (2026-10-30 10:46, 维护者选: A 保持现状; A 相对标准 + 候选宿主复核, 绝对 5 ms 由 R7 总校在 6.8.0 发布候选宿主上复核)] Q12 R2.1 验收 "968e9f18 上 100000 行 workTime <= 5 ms" 在 debug 宿主上达不到: 已连接设备装的都是可调试的 6.8.0 (5935), Rhino 大部分在 ART 解释器里运行, 968e9f18 上空子窗口本身就要 5.7 - 6.2 ms, 100000 行 (clip) 中位数 12.7 - 14.6 ms, 与只给可见行的 clipper (14.1 - 14.3 ms) 和直接画可见行 (14.6 - 15.1 ms) 持平; 63751f63 快档时 100000 行 4.92 ms 达标 | 选项: A (推荐, 已先行) debug 宿主上按相对标准验收 (100000 行不比只给可见行的 clipper 多 1 ms 或 15 %, 设备脚本 list-work 项), 绝对 5 ms 由 list-work-5ms 项在 6.8.0 发布候选 (非 debug) 宿主上复核 / B 现在给 968e9f18 换装非 debug 宿主再测 (需卸载 debug 宿主, 丢其数据, 维护者装包) / C 取消绝对数字, 只留相对标准 | 影响: R2.1 | 改选返工: B 约 0.5 小时加维护者装包, 无代码改动; C 只改 Roadmap 一句 | 来源: imgui-r2
- [已决 (2026-10-30 13:24, 维护者选: B 在 R4 新增公开 addMousePosEvent / addMouseButtonEvent)] Q13 R3.4 验收写的 "经 `addMousePosEvent` 注入拖动" 无法照做: 插件只公开 `addKeyEvent` / `addMouseWheel` / `addInputCharacters`, 没有公开的鼠标位置与按键注入 | 选项: A (推荐, 已先行) 保持现状: 设备脚本用 `adb shell input swipe` 真实触摸拖动 (覆盖触摸到 ImGui 输入的完整路径), 阈值按松手帧保留上一位置放宽 (sliderInt2 > 50, sliderAngle 在 (1, π]), 不新增 API / B 在 R4 (R4.1 键盘查询旁) 新增公开的 `addMousePosEvent` / `addMouseButtonEvent` (d.ts, 别名, 单测), R3.4 与 R4.3 拖放的设备验收改用脚本注入, 结果可精确断言 | 影响: R3.4 (已完成), R4 | 改选返工: B 约 2 小时 (index.js / Java / JNI 各一处, 单测与设备脚本各一项, 10 语言 changelog 一条) | 来源: imgui-r3
- [已决 (2026-10-30 13:24, 维护者选: A 子会话随宿主提交做)] Q14 宿主 ImguiNames 提交是否同时登记 api-coverage 矩阵 (调度会话 2026-10-30 登记, 见看板)
- [已决 (2026-10-30 19:03, 维护者选: A 保持现状)] Q15 `imgui.Key` 补全到整个键盘时, 主键盘数字键 0 - 9 的常量名 (JS 属性不宜用纯数字) | 选项: A (推荐, 已先行) `Digit0` - `Digit9`, 与 Web 的 KeyboardEvent.code 一致 / B `Key0` - `Key9` (`ui.Key.Key0`) / C `Num0` - `Num9` | 影响: R4.1 | 改选返工: 约 0.5 小时 (index.js 一处, d.ts, ALIASES.md, 单测 1 个, device_r4_check 1 处; 已随 1.15.0 发布, 改名需保留旧名作别名)
- [已决 (2026-10-30 19:03, 维护者选: A 保持现状)] Q16 `addMousePosEvent` / `addMouseButtonEvent` 注入的事件算哪种输入来源 | 选项: A (推荐, 已先行) 算触摸 (ImGuiMouseSource_TouchScreen), 与手指事件走同一路径, 设备验收因此代表真实手指, 代价是位置与按键变化总在不同帧生效 / B 算鼠标 (默认来源), 同一帧可同时生效, 但第一次真实触摸之前与之后行为不同 | 影响: R4.5 | 改选返工: 约 0.5 小时 (ImGuiBridge.cpp 两行, d.ts / LIMITS.md 各一句)
- [已决 (2026-10-30 19:03, 维护者选: A R5 起 imgui 子会话随宿主提交重生成文档仓库 api/imgui.md 的运行时支持表)] Q17 文档站 api/imgui.md 运行时支持表由谁重生成 (调度会话 2026-10-30 登记, 源自 api-coverage 跨主题提示)
- [已按推荐先行待确认] Q18 R5.3 的完整字形从哪里来: Android 15 / 16 的 NotoSansCJK-Regular.ttc 是 CFF2 可变字体 (32 MB), stb_truetype 读不了, 按原文读 /system/fonts 只在 Android 13 及以下有效 | 选项: A (推荐, 已先行) Android Paint 逐字绘制进图集, 不增 APK, 内存差 < 1 MB, 也支持厂商替换的字体, 字形随设备语言 / B 内置 FreeType, 每 ABI 增 .so (估 0.6 MB), 新增第三方来源与许可证记录, 字体文件要进内存或 mmap / C 只保留 stb 能读的文件, Android 15 / 16 上选项无效 | 影响: R5.3 | 改选返工: B 约半个阶段, 脚本 API 不变; C 删约 150 行
- [已按推荐先行待确认] Q19 R5.4 输入框打开时特权层怎么办: 特权层在所有窗口之上, 会盖住 floaty 与键盘 | 选项: A (推荐, 已先行) 整层呈现空帧, 帧循环继续, 直连输入关闭, 收起后恢复 / B 只在输入框与键盘的矩形上挖洞, ImGui 其余部分保持可见, 要处理键盘高度与遮挡 / C 把层移到键盘之下 (SurfaceControl 层级), 受 OEM 策略影响 | 影响: R5.4 | 改选返工: B 约 1 个条目
- [已按推荐先行待确认] Q20 R5.1 特权模式 capture 在帧内调用: 上一帧的绘制数据此时已重置, 读回不到完整画面 | 选项: A (推荐, 已先行) 帧内抛错, 提示用 setTimeout(fn, 0) / B 排到帧结束后读回, capture 改成异步或回调, 与其他模式不一致 / C 在特权 Surface 上试 PixelCopy (未验证) | 影响: R5.1 | 改选返工: B 或 C 约半个条目
- [已按推荐先行待确认] Q21 R5.2 Activity 窗口遇到密度或字体大小变化: 宿主 MainActivity 的 configChanges 不含 density / fontScale, 系统重建 Activity, 表面随之消失 | 选项: A (推荐, 已先行) 会话以 configuration-changed 关闭, 与特权模式一致, 脚本可在 closed 里重建 / B 宿主 Manifest 加 density|fontScale, 宿主界面要自行刷新, 影响面大 / C 重建后把表面重新挂到新 Activity | 影响: R5.2 | 改选返工: B 改宿主 1 行加全面回归; C 约 1 个条目
- [已按推荐先行待确认] Q22 R5.2 系统 fontScale 变化时是否缩放控件: 原文是 density 或 fontScale 变化都按比例 ScaleAllSizes | 选项: A (推荐, 已先行) fontScale 只缩放字体, 与 Android 控件一致 (dp 尺寸不随字体设置变化), 且相对 createWindow 时的值 / B 按原文连 padding 等一起缩放 | 影响: R5.2 | 改选返工: 2 行
