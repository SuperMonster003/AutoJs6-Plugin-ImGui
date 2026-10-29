******

### 发行历史

******

# v1.11.0

###### 2026/10/29

* `提示` 依赖活动窗口会话的全局方法 (setTouchable / setMoreTouch / setGlobalAlpha / setSecure / collapseWindow / expandWindow / addButtonEx / getComponent) 在没有活动会话时改为抛出 `imgui.<方法名>: no active session` 错误, 其中 getComponent 以前返回 null
* `提示` 绘图选项 offset 已废弃, 请改用 valuesOffset (旧写法仍然有效)
* `新增` 窗口会话的 error 事件: 渲染回调或事件回调抛错时触发, 事件含 error, phase (render 或 event) 与 frame; 有 error 监听时会话继续渲染, 可在处理器中自行关闭会话, 没有监听时与以前一样以 render-error 关闭
* `新增` 窗口选项 debug: 打开 Dear ImGui 的错误恢复与调试日志, Begin / End 不配对等用法错误经 console.warn 提示, 并显示 Metrics 与 Debug Log 窗口
* `新增` 示例 error-handling, 演示 error 事件, debug 模式与常见错误的排查
* `新增` 别名文档 docs/ALIASES.md, 列出全部 PascalCase 别名及其与 Dear ImGui C++ 签名的差异
* `修复` plotLines / plotHistogram 的 valuesOffset 与 stride 选项不生效的问题
* `优化` 渲染回调或事件回调出错时控制台输出带调用栈的错误信息, 同一错误连续出现时只输出一次
* `优化` README 的别名说明改为 "常用 API 别名", 补充单会话模型 (新建会话会关闭上一个会话) 与新增成员的使用说明, 目标 SDK 更正为 37

# v1.10.0

###### 2026/10/29

* `提示` 需要 AutoJs6 6.8.0 及以上版本 (版本号 versionCode 不低于 5935)
* `修复` TypeScript 声明中 createWindow / launchFloaty / launch / launchPrivileged 的渲染回调参数被声明为 (session) 的问题, 现与实际调用一致为 (ui, session), 并新增 RenderCallback 类型
* `优化` 插件启用后直接以全局对象 imgui 使用, 由 AutoJs6 注册并在首次调用成员时加载插件, 不再需要 plugins.load; 原有 plugins.load("io.github.supermonster003.autojs6.plugin.imgui") 写法返回同一对象
* `优化` 示例脚本, 使用说明, README 及 TypeScript 声明按全局对象用法更新, 声明文件不再扩展 plugins.load 的重载

# v1.9.4

###### 2026/10/05

* `优化` 插件中心图标采用统一工作台调整后的尺寸, 位置, 亮暗图稿与圆形底色, 保留可重建原稿和参数
* `优化` Android 系统应用信息图标与图标工作台共用图稿和亮暗底色, 保留插件中心透明图稿及现有启动器选项

# v1.9.3

###### 2026/09/19

* `修复` AGP 9.1 构建时的 SDK XML v4 解析警告, 以及 JVM 单元测试误触发 APK 原生库对齐检查的问题 (共享构建插件 1.8.3)
* `优化` compileSdk/targetSdk 升级至 37 (Android 17)

# v1.9.2

###### 2026/09/13

* `修复` 插件中心显示的版本及 ABI 信息与实际安装包不一致的问题
* `修复` 版本日期受构建环境语言影响, 未统一使用英文格式的问题
* `优化` 发布前校验 APK 版本, 签名及变体完整性

# v1.9.1

###### 2026/09/11

* `优化` 构建阶段校验 64 位原生库的 16 KB 内存页对齐及 Manifest 配置, 并输出校验报告

# v1.9.0

###### 2026/08/30

* `新增` launchPrivileged 及 WindowMode.Privileged 后端, 支持 auto/shizuku/root 启动策略及 Session.getBackendInfo 诊断
* `新增` 特权后端复用宿主 Root 及已授权的 Shizuku 服务, 无需单独管理提权
* `新增` Binder Surface v2 协议, 支持由 Root/Shizuku 子进程创建图层并交由宿主渲染
* `新增` 特权后端支持读取 /dev/input 的 Type A/Type B 触摸事件, 采用非独占方式并支持 Passthrough 回调
* `修复` Android 10+ 的 IContentProvider.call 重载选择及 Android 12+ 的外部 Provider 通信问题
* `修复` 特权子进程正常退出时错误提示 "Main thread not allowed to quit" 的问题
* `修复` Broker 绑定及端点注册的权限校验问题, 补充插件权限及重复注册限制
* `优化` 后端能力描述及 TypeScript 声明升级至 schema v2, 支持查询 Root/Shizuku 授权, Binder 传输, 渲染进程及输入路由状态
* `优化` 补充 Android 9 Root 及 Android 12 Shizuku 13.5 环境的宿主集成验证, 覆盖渲染, 触摸输入及退出清理

# v1.8.0

###### 2026/08/30

* `新增` moreTouch 窗口选项及 setMoreTouch 方法, 支持已有手指触摸屏幕时独立操作浮窗按钮
* `新增` BackendStatus 及 getBackendCapabilities, 用于查询窗口后端, 多点触摸, 特权进程及 Docking/Multi-Viewport 状态, 并提供 TypeScript 声明
* `新增` 实验性特权渲染进程, 支持通过 SurfaceControl/EGL 渲染 Dear ImGui 图层及带令牌鉴权的本地 socket 通信
* `新增` /dev/input 事件读取, 支持 16/24 字节事件, Type A/Type B 多点触摸及旋转坐标映射
* `修复` 多点触摸标志动态切换及会话关闭后恢复不完整的问题, 同步更新已有浮窗按钮
* `修复` 特权协议的非法请求校验及超时, 断连, 关闭时的资源清理问题
* `优化` 补充 Android 9 Root 环境的特权渲染及触摸输入验证, 并通过 Android 9/15 设备测试
* `优化` 补充特权后端, Docking/Multi-Viewport 文档及输入协议测试 (特权后端仍为实验原型, 暂不支持由普通脚本选择)

# v1.7.0

###### 2026/08/30

* `新增` TypeScript 声明 types/imgui.d.ts, 覆盖 API, 常量, 会话, 高级组件, DrawList 及各类调用入口
* `新增` 内置示例增加控件总览, 参数调节面板, 日志 HUD, 表格及主题画廊
* `新增` Android Surface 渲染测试, 覆盖初始化, 控件渲染, 截图及关闭
* `新增` GitHub Actions 拉取请求校验及 v* 标签的签名发布流程, 支持签名复验及 APK 上传
* `新增` Dear ImGui 上游源码更新工具, 支持固定标签或提交, 校验和检查及预演
* `修复` 触摸, 输入法, 按键及滚轮事件的线程同步问题, 防止旧会话的延迟事件进入新会话
* `修复` 帧调度误差随运行时间累积的问题
* `优化` Limits 限制及说明, 文本输入上限为 64 KiB, 选择项上限为 512 个, 输入队列上限为 2048 条
* `优化` 构建校验覆盖运行时 API, TypeScript 声明, 示例, 输入队列及上游源码完整性

# v1.6.0

###### 2026/08/30

* `新增` imgui.ref(value) 及 { value: ... } 引用, 用于保存控件状态 (兼容原有 Java 数组方式)
* `新增` logWindow 日志窗口及可堆叠的定时 toast, 支持日志级别颜色, 导出及会话结束时自动清理
* `新增` 基于 Promise 的 alert/confirm/singleChoice/multiChoice 对话框, 支持按队列依次显示
* `新增` statsOverlay 状态面板及 dataTable 表格, 支持阈值着色, 行选择, 增删改查, 工具栏及自定义渲染
* `新增` widget-overview 控件示例及 listExamples/getExampleSource/runExample 方法, 支持宿主发现及运行
* `修复` 会话关闭后待处理的对话框 Promise 未返回取消结果及高级组件未释放的问题
* `修复` 示例源码查询的路径校验问题, 仅允许访问内置示例
* `修复` 较慢设备上恢复 Surface 时可能重复初始化原生上下文的问题
* `优化` 补充 LogLevel/ToastPosition 及 PascalCase 别名, 常量扩展至 35 组
* `优化` 补充 OpenGL ES 3.2 设备的高级组件, 示例及资源清理验证

# v1.5.0

###### 2026/08/30

* `新增` TouchMode.Touchable/Passthrough/Auto 触摸模式, 自动模式支持浮窗空白区域的点击穿透
* `新增` collapse/expand 会话折叠与展开, 迷你悬浮球及可拖动的 addButtonEx 按钮, 支持运行时设置透明度及 FLAG_SECURE
* `新增` imgui.launch 全屏模式及 launchFloaty 悬浮窗模式, 支持多个 begin/withWindow 根窗口
* `新增` 屏幕尺寸适配, AlwaysAutoResize 窗口自适应, iniPath 状态保存及会话事件回调
* `修复` Surface 销毁后 EGL/ImGui 上下文及纹理丢失的问题
* `修复` 自动点击穿透的兼容性问题, 改用 Android 公共 API 并限制最多 64 个交互根窗口
* `优化` JNI 绑定由 186 个扩展至 190 个, 补充会话接口校验
* `优化` 会话关闭时恢复 Activity 标志及系统界面状态, 清理悬浮窗, 触摸代理及独立按钮
* `优化` Manifest 及安装文档明确要求设备支持 OpenGL ES 3.0

# v1.4.0

###### 2026/08/30

* `新增` createTexture 方法, 支持文件路径, 编码字节数组, ByteBuffer, Bitmap, 输入流及 AutoJs6 Image
* `新增` image/imageButton 图像控件, 支持原始尺寸, 宽高比, UV 范围, 着色及背景色
* `新增` AutoJs6 图像及截图纹理转换, 保留调用方持有的原始图像
* `新增` 窗口, 前景及背景 DrawList, 支持线段, 矩形, 圆形, 三角形, 文本, 折线, 贝塞尔曲线及图像
* `修复` Bitmap 纹理上传的行跨度及预乘 Alpha 处理问题, 避免半透明图像出现暗边
* `修复` 绘制完成前提前销毁纹理的问题, 拒绝过期, 已销毁及跨会话的纹理句柄
* `优化` JNI 绑定由 172 个扩展至 186 个, 补充纹理及 DrawList 接口校验
* `优化` 纹理大小校验, 限制编码数据为 128 MiB, 图像为 3200 万像素及 OpenGL 支持的尺寸, 会话结束时自动清理

# v1.3.0

###### 2026/08/30

* `新增` Themes 及 setTheme 方法, 内置 11 套主题, 包含 Pink/Blue/ModernDark/CyanDusk 等预设
* `新增` setStyleColor/setStyleProperties 样式设置, createWindow 支持 theme/appearance/style 及圆角, 边框, 阴影选项
* `新增` 内置约 9800 字符的 CJK 后备字体, 支持缺少 Noto CJK 的系统显示常用中文
* `新增` Fonts/pushFont/popFont/withFont 及 createWindow.fonts, 支持资源或文件字体, 多字体及动态字号
* `新增` Icons 常量及 icon 方法, 内置 38 个 Material Icons 图标
* `修复` 切换主题时样式缩放累积的问题, 保留当前字体, 字号及全局字体缩放
* `优化` JNI 绑定由 167 个扩展至 172 个, 补充主题, 字体接口及内置字体完整性校验
* `优化` 默认及自定义字体自动合并 CJK 后备字形及图标

# v1.2.0

###### 2026/08/30

* `新增` inputText/inputTextMultiline 系统输入法支持, 聚焦时唤起软键盘, 支持中文拼音及退格, 回车, 方向键
* `新增` setKeyboardFocusHere 方法, 支持主动聚焦输入控件并唤起输入法
* `新增` 双指滚动惯性, 支持 fling/flingFriction/flingMinVelocity/flingMaxVelocity 窗口选项
* `新增` 单指长按右键及 beginPopupContextItem/beginPopupContextWindow/withContextItem/withContextWindow 上下文菜单
* `修复` 取消拖动, 双指滚动或切换长按手势时可能误触发点击及右键菜单的问题
* `修复` 创建输入法代理时 Surface 已就绪却未初始化渲染会话的问题
* `修复` 悬浮窗首次请求软键盘时, 输入视图尚未就绪导致请求丢失的问题
* `修复` 启动文档将宿主自动挂载误写为默认行为的问题 (默认使用 plugins.load, 自动挂载为可选设置)
* `优化` verifyImGuiSource 校验覆盖 JNI, Java 及 JavaScript 三层接口
* `优化` 输入法预编辑文本同步, 无需脚本处理拼音组合过程

# v1.1.0

###### 2026/08/30

* `新增` withTable/beginTable 等表格接口, 支持边框, 条纹, 行列冻结及背景色
* `新增` openPopup/withPopup/withPopupModal 等弹窗接口及 withMenuBar/withMenu/menuItem 菜单接口
* `新增` setTooltip/setItemTooltip/withTooltip/withItemTooltip 工具提示接口
* `新增` toggleSwitch 开关控件及 ToggleSwitch 别名
* `新增` 更多控件及文本接口, 包含数值/多行输入框, 列表框, 颜色选择器, 折线图/直方图及垂直滑块
* `新增` 样式及结构接口, 支持颜色/变量栈, 字体缩放, ID 分组, 禁用区域, 缩进及文本对齐
* `新增` getScrollX/Y, getScrollMaxX/Y, setScrollX/Y 及 setScrollHereX/Y 滚动控制接口
* `新增` 控件及窗口状态查询, 包含活动, 编辑, 焦点, 悬停及折叠状态, 并支持鼠标状态, 文本尺寸及帧率查询
* `新增` addInputCharacters/addKeyEvent/sendKey/addMouseWheel/wantTextInput 输入接口
* `新增` 双指纵向滑动滚动窗口内容, 与单指拖动窗口的手势自动区分
* `新增` 常量表扩充至 24 组, 包含子窗口, 弹窗, 表格, 颜色, 样式及输入按键等标志
* `修复` 触摸线程与渲染线程并发访问原生上下文的竞态问题, 交互查询改为帧末快照缓存
* `修复` WantCaptureMouse 及 StyleColorsDark/StyleColorsLight/StyleColorsClassic 的 PascalCase 别名缺失的问题
* `优化` 文档与示例统一为宿主常驻全局对象机制, 不再引导调用 plugins.load
* `优化` 宿主最低版本码及 ABI 列表统一由插件契约提供, 构建时自动读取
* `优化` 全部新增 API 均提供与 Dear ImGui 同名的 PascalCase 别名

# v1.0.0

###### 2026/08/29

* `新增` 全局 imgui 对象, 由宿主自动挂载至脚本引擎
* `新增` 由 Dear ImGui 1.92.9 渲染的透明浮动窗口, 支持配置尺寸/帧率/字体和空白区域拖动
* `新增` 即时模式窗口及布局, 文本, 输入, 选择, 颜色, 进度, 树形节点, 标签页, 主题和演示接口
* `新增` 布尔/整数/浮点数/字符串和颜色可变引用, 用于保存有状态控件的数据
* `新增` 插件信息/使用说明/README 和 CHANGELOG 的十种语言本地化
* `依赖` 附加 Common Plugin API, 用于插件发现元数据
* `依赖` 附加 Kotlin 标准库与 Parcelize 运行时版本 2.2.21
* `依赖` 附加 Apache Commons Compress 版本 1.28.0 及 XZ for Java 版本 1.10, 用于构建工具
* `依赖` 附加 JUnit 版本 4.13.2, 用于插件契约测试
