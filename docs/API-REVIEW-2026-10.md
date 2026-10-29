# AutoJs6-Plugin-ImGui 脚本 API 设计评审

范围: `imgui.d.ts` (下称 d.ts), `plugin/index.js` (下称 js), `ImGuiBridge.cpp`, README, docs, examples, 对照宿主 `floaty.md`. 只读评审. 工作量: 小 = 半天内, 中 = 1 到 3 天, 大 = 一周以上.

## 1. 设计合理性

| # | 结论 | 证据 | 建议 | 量 |
| --- | --- | --- | --- | --- |
| A1 | createWindow 回调签名在 d.ts 写错 | d.ts:895 为 `(session) => void`, js:5907 实际调用 `renderCallback(api, session)`, README 示例为 `(ui, overlay)` | 改为 `(ui: ApiCore, session: Session) => void` | 小 |
| A2 | PlotOptions 的 valuesOffset, stride 不生效 | d.ts:137-145 声明, js:1762-1786 只读 `options.offset`, 不传 stride | 以 valuesOffset 为准并兼容 offset, stride 实现或删除 | 小 |
| A3 | dp 与 px 混用 | js:4034-4233 中 width / height 乘 density, x / y 不乘; 帧内坐标是 px; 示例手动乘 `window.density` | 加 `ui.dp()`, d.ts 逐参数注明单位 | 中 |
| A4 | 两代参数与校验风格并存 | 旧控件经 js:31-38 `number()` 静默强转, DrawList 用 `requiredNumber()` 抛错; 颜色有 r,g,b,a 位置参数 (d.ts:711, 802) 与 Color 两套 | 统一接受 Color, 位置参数作重载保留; 非法参数统一抛 TypeError 并带参数名 | 中 |
| A5 | 错误不可见 | ImGuiBridge.cpp:1085-1090 关闭 ErrorRecovery 的 Assert 与 DebugLog, Begin / End 不配对被静默修复; 回调抛错即以 render-error 关闭 (js:5861-5952), 无 error 事件 | 加 `on("error")` 与 `options.debug` | 小 |
| A6 | 线程模型易踩坑 | 帧由脚本线程定时器驱动 (FRAME-LOOP.md), 回调里同步 http 或 sleep 会冻结界面; ready / resized 在 UI 线程派发 (js:5449-5562) | 事件统一回到脚本线程, 文档加线程表与后台任务示例 | 中 |
| A7 | 全局状态与单会话 | 全局 setter 依赖可能为 null 的 `_activeSession` (js:5963-6033); 新会话关闭旧会话 | d.ts 标注可空, README 写明单会话 | 小 |
| A8 | Session 状态字段可写 | d.ts:569-588 的 x, y, width, ready, closed, closeReason 非 readonly, 已有 setPosition / setSize | 改为 readonly, 写入只走方法 | 小 |
| A9 | 别名宣传过度 | README 称全量 PascalCase, 迁移零成本; 实际签名为 ValueRef 风格, 多分量控件与键盘查询缺失 | 改称常用 API 别名, 附迁移差异表 | 小 |

## 2. Dear ImGui 1.92 分组缺口

窗口, 布局, 滚动, 基础控件, Tree, Tab, Menu, Popup, Tooltip, 颜色, 样式, 鼠标查询均已暴露 (d.ts:695-865), 下表只列缺口.

| 分组 | 状态 | 证据 / 缺口 | 价值 |
| --- | --- | --- | --- |
| 表格排序 TableGetSortSpecs | 部分 | 有 beginTable, tableSetupScrollFreeze, 无排序规格, Sortable 标志无法落地 | 高 |
| ListClipper | 未暴露 | 大列表只能全量提交, combo / listBox 上限 512 (LIMITS.md) | 高 |
| 调试窗口 Metrics, DebugLog, IDStackTool, StyleEditor | 部分 | 仅 showDemoWindow (d.ts:749) | 高 |
| Drag / Slider / Input 多分量, Range2, VSlider | 未暴露 | 只有单值 (d.ts:716-719, 757-758) | 中 |
| 键盘查询 IsKeyPressed, Shortcut | 未暴露 | Key 枚举 (d.ts:687) 只用于注入 addKeyEvent / sendKey | 中 |
| 剪贴板 Get / SetClipboardText | 未暴露 | 脚本层无入口 | 中 |
| 拖放 DragDrop | 未暴露 | 无 | 中 |
| DrawList | 部分 | 11 种图元, 无 Path 系列与 PushClipRect | 中 |
| 多选 BeginMultiSelect | 未暴露 | 无 | 低 |
| Docking, 多 Viewport | 未暴露 | 有意延期 (DOCKING-MULTI-VIEWPORT.md) | 低 |

## 3. Android 场景

| 能力 | 现状与证据 | 建议 | 价值 | 量 |
| --- | --- | --- | --- | --- |
| 返回键 | 仅 IME 有焦点时 BACK 映射为 Escape (ImGuiImeView.java 约 347-393) | 加可拦截的 `on("back")` | 高 | 小 |
| 省电, 后台, 锁屏 | 只按折叠降帧, fps 15..120, collapsedFps 1..15 | idleFps (无输入自动降帧), 熄屏暂停, `session.setFps()` | 高 | 中 |
| Bitmap 纹理, images 互通 | createTexture 后只能销毁 (js:2063-2124) | `texture.update(src)` 做实时预览, 直接接受 ImageWrapper | 高 | 中 |
| 截图 | 无 | `session.capture()` 返回 ImageWrapper | 中 | 中 |
| 旋转与 DPI | ScaleAllSizes 只在初始化执行 (ImGuiBridge.cpp:656) | 密度变化时重算样式与字体 | 中 | 中 |
| CJK 字体 | 需自备字体, 上限 16 | 系统 CJK 字体一键回退 | 中 | 小 |
| IME | 特权模式无 IME (README 已知限制) | 回退到临时 floaty 输入框 | 中 | 中 |
| 手势 | 单指针与滚轮 | 长按映射右键, 双指缩放映射字体缩放 | 中 | 中 |
| 多窗口 | 单引擎单会话 | 文档推荐单 Surface 多 ImGui 窗口并给示例 | 低 | 小 |

## 4. 开发者体验

| # | 结论 | 证据 | 建议 | 量 |
| --- | --- | --- | --- | --- |
| D1 | d.ts 精度不足 | 39 处 unknown; alert, confirm 等为 `...args: any[]` (d.ts:614-617); 多个 Options 继承 `Record<string, any>` 吞掉拼写错误; rowKey 只声明函数 (d.ts:534), 实现与示例用字符串 (js:3640) | 补重载, 去掉 any 扩展, rowKey 接受键名或函数; 仅 10 段 JSDoc, 补单位与线程说明 | 中 |
| D2 | 示例覆盖窄 | examples/index.json 共 5 个 | 补后台任务, 纹理刷新, 大列表, 错误处理 4 个示例 | 小 |
| D3 | 调试手段少 | 见 A5 与调试窗口缺口 | `options.debug` 一键打开 Metrics 与 DebugLog | 小 |
| D4 | 文档不一致 | README 写目标 SDK 36, changelog 为 37 | 统一 | 小 |

优点: getBackendCapabilities, listExamples / runExample, LIMITS.md 的边界说明, finalizeClose 统一释放资源 (js:5383-5443), 均值得保留.

## 5. 优先级

1. 先修: A1, A2, A5 (都是小改动, 直接影响正确性与排错).
2. 再统一: A3 单位, A4 参数风格, A6 线程文档.
3. 补能力: ListClipper, 省电降帧, texture.update, 调试窗口, 返回键事件, 其次表格排序与多分量控件.
