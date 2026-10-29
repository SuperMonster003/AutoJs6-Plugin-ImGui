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
