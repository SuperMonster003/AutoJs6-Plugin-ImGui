# PascalCase aliases

Common APIs have a PascalCase alias next to the lower camel case method, on the global `imgui` object and on the
`ui` argument of render callbacks. An alias is the same function object as its target (`ui.Button === ui.button`), so
it takes the plugin's arguments, not the C++ ones. The aliases help readers who know Dear ImGui find the method; they
do not make C++ code run unchanged. Methods without an alias, such as the `with*` helpers, are reachable only by their
lower camel case name.

Constants need no alias: `ui.WindowFlags.NoTitleBar` stands for `ImGuiWindowFlags_NoTitleBar`, `ui.Col.Text` for
`ImGuiCol_Text`, and so on.

## Differences from the C++ signatures

| Area | C++ (Dear ImGui 1.92) | Plugin | Aliases concerned |
| --- | --- | --- | --- |
| Mutable values | `bool*`, `int*`, `float*`, `char*` buffers, `float col[3]` | A mutable value: `imgui.ref(x)`, a plain `{value: x}` object, or a Java array from `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.ints`. Colors and multi-component widgets take a reference to a number array (`{value: [...]}`) or a Java array from `imgui.floats` / `imgui.ints`. | `Begin`, `BeginTabItem`, `BeginPopupModal`, `Checkbox`, `RadioButton`, `SliderFloat`, `SliderInt`, `VSliderFloat`, `VSliderInt`, `DragFloat`, `DragInt`, `InputText`, `InputTextMultiline`, `InputInt`, `InputFloat`, `Combo`, `ListBox`, `ColorEdit3`, `ColorEdit4`, `ColorPicker3`, `ColorPicker4`, `MenuItem`, `Toggle`, `DragFloat2` to `DragFloat4`, `DragInt2` to `DragInt4`, `SliderFloat2` to `SliderFloat4`, `SliderInt2` to `SliderInt4`, `InputFloat2` to `InputFloat4`, `InputInt2` to `InputInt4`, `DragFloatRange2`, `DragIntRange2`, `SliderAngle`, `ShowMetricsWindow`, `ShowDebugLogWindow`, `ShowIDStackToolWindow`, `ShowStyleEditor`, `ShowAboutWindow`, `ShowUserGuide` |
| Debug and tool windows | `ShowStyleEditor(ImGuiStyle* ref)` and `ShowUserGuide()` draw inside the current window; the others take `bool* p_open` | Each takes an optional mutable boolean (the window's close button sets it to false). `ShowStyleEditor` (no reference style) and `ShowUserGuide` open their own windows, "Dear ImGui Style Editor" and "Dear ImGui User Guide". | `ShowStyleEditor`, `ShowUserGuide` |
| Multi-component widgets | `float v[2]` .. `float v[4]`, `int v[2]` .. `int v[4]`; `InputFloat2` .. `InputInt4` without steps | A mutable number array with at least as many numbers as components; the other arguments as in the one-component form | `DragFloat2` to `DragFloat4`, `DragInt2` to `DragInt4`, `SliderFloat2` to `SliderFloat4`, `SliderInt2` to `SliderInt4`, `InputFloat2` to `InputFloat4`, `InputInt2` to `InputInt4` |
| Table sorting | `ImGuiTableSortSpecs*` pointing into the table, `SpecsDirty` cleared by the caller | `{specsDirty, specs: [{columnIndex, columnUserId, sortDirection, sortOrder}]}` copied for the frame, or `null`; reading it clears `SpecsDirty`, so `specsDirty` is true only in the frame the specs change. `TableSetupColumn` takes the user id as its fourth argument. | `TableGetSortSpecs`, `TableSetupColumn` |
| `ImVec2` arguments | One `ImVec2` (`size`, `pos`, `pivot`) | Two numbers (`width, height`, `x, y`, `pivotX, pivotY`) | `Button`, `InvisibleButton`, `Dummy`, `BeginChild`, `BeginListBox`, `Selectable`, `ProgressBar`, `ColorButton`, `VSliderFloat`, `VSliderInt`, `InputTextMultiline`, `SetNextWindowPos`, `SetNextWindowSize`, `SetNextWindowSizeConstraints`, `SetCursorPos`, `BeginTable` (outer size; there is no `inner_width`) |
| `ImVec2` results | `ImVec2` | `Vec2`: a two-element array, `[x, y]` | `GetWindowPos`, `GetWindowSize`, `GetContentRegionAvail`, `GetCursorPos`, `GetMousePos`, `GetMouseDragDelta`, `CalcTextSize` |
| Colors | `ImVec4` or `ImU32` | Four numbers from 0 to 1 (`red, green, blue, alpha`); alpha defaults to 1 | `TextColored`, `PushStyleColor`, `ColorButton`, `TableSetBgColor` |
| Formatted text | `fmt, ...` in printf style | One value, converted with `String(value)` and shown as is; `%` is not special. Build the string in JavaScript. | `Text`, `TextWrapped`, `TextColored`, `TextDisabled`, `BulletText`, `LabelText`, `SetTooltip`, `SetItemTooltip` |
| Item lists | `const char* const items[]` plus a count, or a getter callback | A JavaScript array, each item converted with `String`; at most `imgui.Limits` items (512) | `Combo`, `ListBox` |
| Text input | `buf`, `buf_size`, flags, callback, user data | A string reference and a maximum length in bytes (2 to 65,536); no callbacks, so flags that need one are not exposed | `InputText`, `InputTextMultiline` |
| Plots | `values`, `values_count`, `values_offset`, `overlay_text`, `scale_min`, `scale_max`, `graph_size`, `stride` in bytes; or a getter callback | `values` plus an options object `{valuesOffset, overlay, scaleMin, scaleMax, width, height, stride}`; `stride` counts values, not bytes; no getter overload | `PlotLines`, `PlotHistogram` |
| Images | `ImTextureRef`, `image_size`, `uv0`, `uv1`, `bg_col`, `tint_col` | A texture from `createTexture`, then a width or an `ImageOptions` object (`width`, `height`, `uv0`, `uv1`, `background`, `tint`) | `Image`, `ImageButton` |
| Overloads | Several C++ overloads per name | One function per name. `MenuItem` takes a boolean or a mutable value; `PushStyleVar` takes a number or a point; `PushID` takes a string or a number (no pointer or range form); `TreeNode` takes a label only (no `str_id, fmt` or pointer form) | `MenuItem`, `PushStyleVar`, `PushID`, `TreeNode`, `TreeNodeEx` |
| Fonts | `ImFont*`, size | A font index or name from `createWindow({fonts})`; `pushFont` returns the index it pushed | `PushFont`, `WithFont` |
| Key chords | `ImGuiMod_Ctrl \| ImGuiKey_S` | `ui.Mod.Ctrl \| ui.Key.S`; `Key.ModCtrl` is the same value as `Mod.Ctrl`. The keys 0 to 9 are `Key.Digit0` to `Key.Digit9`. A value that is not a key throws `RangeError` instead of being undefined behavior. | `IsKeyDown`, `IsKeyPressed`, `IsKeyReleased`, `GetKeyPressedAmount`, `GetKeyName`, `IsKeyChordPressed`, `Shortcut`, `SetNextItemShortcut` |
| Clipboard | `const char*`, valid until the next call | A string, also outside a frame. `GetClipboardText` returns `""` when there is no text or the system does not allow reading it (see `docs/LIMITS.md`). | `GetClipboardText`, `SetClipboardText` |
| Drag and drop | `const void* data`, `size_t sz`; `const ImGuiPayload*` | `SetDragDropPayload(type, data, condition)` takes a JSON-serializable value and copies it; `AcceptDragDropPayload` and `GetDragDropPayload` return `{type, data, preview, delivery}` or `null`, with `IsPreview()` / `IsDelivery()` as the last two fields. Types starting with `_` cannot be set; `_COL3F` / `_COL4F` can be accepted and give the color as a number array. `with*` helpers run the `End*` call for you. | `SetDragDropPayload`, `AcceptDragDropPayload`, `GetDragDropPayload` |
| Injected mouse events | `io.AddMousePosEvent`, `io.AddMouseButtonEvent` on `ImGuiIO` | Methods of the API object; the events count as touch input. | `AddMousePosEvent`, `AddMouseButtonEvent` |
| Clip rectangles | `ImVec2` pair; `intersect_with_current_clip_rect` is required by `ImGui::PushClipRect` | Two points (`[x, y]` or `{x, y}`); `ui.pushClipRect` intersects by default, `drawList.pushClipRect` does not (as in C++). A pop without a push in the same frame throws an `Error` instead of corrupting the stack. | `PushClipRect`, `PopClipRect` |
| Names | - | `ColorU32` stands for `GetColorU32`, `WantCaptureMouse` reads `io.WantCaptureMouse`, `ToggleSwitch` is a second name of the plugin's `Toggle` widget, and `PushID` / `PopID` call `pushId` / `popId`. `SetWindowFontScale` is obsolete in Dear ImGui 1.92 but kept by the plugin. | `ColorU32`, `WantCaptureMouse`, `Toggle`, `ToggleSwitch`, `PushID`, `PopID`, `SetWindowFontScale` |

## Not exposed

These Dear ImGui functions have no plugin method, so they have no alias either:

- `InputDouble`, the `*Scalar*` functions, `CheckboxFlags`.
- Multi-select, docking and multiple viewports.

## Alias list

The section below is generated by `python tools/generate_aliases_doc.py`; `--check` reports whether it is current.

<!-- aliases:begin (generated by tools/generate_aliases_doc.py) -->

248 aliases, in the order of the facade's alias table. "Upstream" is the `ImGui::` function of the
same name in the vendored `imgui.h`, marked "obsolete" when the header lists it only as an obsolete function.
The 44 aliases marked "-" name plugin features or differ from the upstream name (see "Names" above).

| Alias | Target | Upstream |
| --- | --- | --- |
| `Ref` | `ref` | - |
| `GetBackendCapabilities` | `getBackendCapabilities` | - |
| `ListExamples` | `listExamples` | - |
| `GetExampleSource` | `getExampleSource` | - |
| `RunExample` | `runExample` | - |
| `LogWindow` | `logWindow` | - |
| `Toast` | `toast` | - |
| `Alert` | `alert` | - |
| `Confirm` | `confirm` | - |
| `SingleChoice` | `singleChoice` | - |
| `MultiChoice` | `multiChoice` | - |
| `StatsOverlay` | `statsOverlay` | - |
| `DataTable` | `dataTable` | - |
| `GetComponent` | `getComponent` | - |
| `CreateWindow` | `createWindow` | - |
| `CloseWindow` | `closeWindow` | - |
| `LaunchFloaty` | `launchFloaty` | - |
| `Launch` | `launch` | - |
| `LaunchPrivileged` | `launchPrivileged` | - |
| `AddButtonEx` | `addButtonEx` | - |
| `SetTouchable` | `setTouchable` | - |
| `SetMoreTouch` | `setMoreTouch` | - |
| `SetGlobalAlpha` | `setGlobalAlpha` | - |
| `SetSecure` | `setSecure` | - |
| `CollapseWindow` | `collapseWindow` | - |
| `ExpandWindow` | `expandWindow` | - |
| `Dp` | `dp` | - |
| `Px` | `px` | - |
| `SetNextWindowPos` | `setNextWindowPos` | `ImGui::SetNextWindowPos` |
| `SetNextWindowSize` | `setNextWindowSize` | `ImGui::SetNextWindowSize` |
| `SetNextWindowSizeConstraints` | `setNextWindowSizeConstraints` | `ImGui::SetNextWindowSizeConstraints` |
| `SetNextWindowBgAlpha` | `setNextWindowBgAlpha` | `ImGui::SetNextWindowBgAlpha` |
| `SetKeyboardFocusHere` | `setKeyboardFocusHere` | `ImGui::SetKeyboardFocusHere` |
| `Begin` | `begin` | `ImGui::Begin` |
| `End` | `end` | `ImGui::End` |
| `BeginChild` | `beginChild` | `ImGui::BeginChild` |
| `EndChild` | `endChild` | `ImGui::EndChild` |
| `GetWindowPos` | `getWindowPos` | `ImGui::GetWindowPos` |
| `GetWindowSize` | `getWindowSize` | `ImGui::GetWindowSize` |
| `GetContentRegionAvail` | `getContentRegionAvail` | `ImGui::GetContentRegionAvail` |
| `GetCursorPos` | `getCursorPos` | `ImGui::GetCursorPos` |
| `SetCursorPos` | `setCursorPos` | `ImGui::SetCursorPos` |
| `Text` | `text` | `ImGui::Text` |
| `TextWrapped` | `textWrapped` | `ImGui::TextWrapped` |
| `TextColored` | `textColored` | `ImGui::TextColored` |
| `Button` | `button` | `ImGui::Button` |
| `SmallButton` | `smallButton` | `ImGui::SmallButton` |
| `Checkbox` | `checkbox` | `ImGui::Checkbox` |
| `RadioButton` | `radioButton` | `ImGui::RadioButton` |
| `SliderFloat` | `sliderFloat` | `ImGui::SliderFloat` |
| `SliderInt` | `sliderInt` | `ImGui::SliderInt` |
| `DragFloat` | `dragFloat` | `ImGui::DragFloat` |
| `DragInt` | `dragInt` | `ImGui::DragInt` |
| `InputText` | `inputText` | `ImGui::InputText` |
| `ColorEdit3` | `colorEdit3` | `ImGui::ColorEdit3` |
| `ColorEdit4` | `colorEdit4` | `ImGui::ColorEdit4` |
| `ProgressBar` | `progressBar` | `ImGui::ProgressBar` |
| `Combo` | `combo` | `ImGui::Combo` |
| `Selectable` | `selectable` | `ImGui::Selectable` |
| `CollapsingHeader` | `collapsingHeader` | `ImGui::CollapsingHeader` |
| `TreeNode` | `treeNode` | `ImGui::TreeNode` |
| `TreePop` | `treePop` | `ImGui::TreePop` |
| `BeginTabBar` | `beginTabBar` | `ImGui::BeginTabBar` |
| `EndTabBar` | `endTabBar` | `ImGui::EndTabBar` |
| `BeginTabItem` | `beginTabItem` | `ImGui::BeginTabItem` |
| `EndTabItem` | `endTabItem` | `ImGui::EndTabItem` |
| `SameLine` | `sameLine` | `ImGui::SameLine` |
| `Separator` | `separator` | `ImGui::Separator` |
| `Spacing` | `spacing` | `ImGui::Spacing` |
| `NewLine` | `newLine` | `ImGui::NewLine` |
| `Dummy` | `dummy` | `ImGui::Dummy` |
| `SetNextItemWidth` | `setNextItemWidth` | `ImGui::SetNextItemWidth` |
| `PushItemWidth` | `pushItemWidth` | `ImGui::PushItemWidth` |
| `PopItemWidth` | `popItemWidth` | `ImGui::PopItemWidth` |
| `IsItemClicked` | `isItemClicked` | `ImGui::IsItemClicked` |
| `IsItemHovered` | `isItemHovered` | `ImGui::IsItemHovered` |
| `IsAnyItemHovered` | `isAnyItemHovered` | `ImGui::IsAnyItemHovered` |
| `IsAnyItemActive` | `isAnyItemActive` | `ImGui::IsAnyItemActive` |
| `ShowDemoWindow` | `showDemoWindow` | `ImGui::ShowDemoWindow` |
| `ShowMetricsWindow` | `showMetricsWindow` | `ImGui::ShowMetricsWindow` |
| `ShowDebugLogWindow` | `showDebugLogWindow` | `ImGui::ShowDebugLogWindow` |
| `ShowIDStackToolWindow` | `showIdStackToolWindow` | `ImGui::ShowIDStackToolWindow` |
| `ShowStyleEditor` | `showStyleEditor` | `ImGui::ShowStyleEditor` |
| `ShowAboutWindow` | `showAboutWindow` | `ImGui::ShowAboutWindow` |
| `ShowUserGuide` | `showUserGuide` | `ImGui::ShowUserGuide` |
| `StyleColorsDark` | `styleColorsDark` | `ImGui::StyleColorsDark` |
| `StyleColorsLight` | `styleColorsLight` | `ImGui::StyleColorsLight` |
| `StyleColorsClassic` | `styleColorsClassic` | `ImGui::StyleColorsClassic` |
| `WantCaptureMouse` | `wantCaptureMouse` | - |
| `SeparatorText` | `separatorText` | `ImGui::SeparatorText` |
| `Bullet` | `bullet` | `ImGui::Bullet` |
| `BulletText` | `bulletText` | `ImGui::BulletText` |
| `LabelText` | `labelText` | `ImGui::LabelText` |
| `TextDisabled` | `textDisabled` | `ImGui::TextDisabled` |
| `ArrowButton` | `arrowButton` | `ImGui::ArrowButton` |
| `InvisibleButton` | `invisibleButton` | `ImGui::InvisibleButton` |
| `InputInt` | `inputInt` | `ImGui::InputInt` |
| `InputFloat` | `inputFloat` | `ImGui::InputFloat` |
| `InputTextMultiline` | `inputTextMultiline` | `ImGui::InputTextMultiline` |
| `BeginListBox` | `beginListBox` | `ImGui::BeginListBox` |
| `EndListBox` | `endListBox` | `ImGui::EndListBox` |
| `ListBox` | `listBox` | `ImGui::ListBox` |
| `ColorPicker3` | `colorPicker3` | `ImGui::ColorPicker3` |
| `ColorPicker4` | `colorPicker4` | `ImGui::ColorPicker4` |
| `ColorButton` | `colorButton` | `ImGui::ColorButton` |
| `PlotLines` | `plotLines` | `ImGui::PlotLines` |
| `PlotHistogram` | `plotHistogram` | `ImGui::PlotHistogram` |
| `TreeNodeEx` | `treeNodeEx` | `ImGui::TreeNodeEx` |
| `VSliderFloat` | `vSliderFloat` | `ImGui::VSliderFloat` |
| `VSliderInt` | `vSliderInt` | `ImGui::VSliderInt` |
| `DragFloat2` | `dragFloat2` | `ImGui::DragFloat2` |
| `DragFloat3` | `dragFloat3` | `ImGui::DragFloat3` |
| `DragFloat4` | `dragFloat4` | `ImGui::DragFloat4` |
| `DragInt2` | `dragInt2` | `ImGui::DragInt2` |
| `DragInt3` | `dragInt3` | `ImGui::DragInt3` |
| `DragInt4` | `dragInt4` | `ImGui::DragInt4` |
| `SliderFloat2` | `sliderFloat2` | `ImGui::SliderFloat2` |
| `SliderFloat3` | `sliderFloat3` | `ImGui::SliderFloat3` |
| `SliderFloat4` | `sliderFloat4` | `ImGui::SliderFloat4` |
| `SliderInt2` | `sliderInt2` | `ImGui::SliderInt2` |
| `SliderInt3` | `sliderInt3` | `ImGui::SliderInt3` |
| `SliderInt4` | `sliderInt4` | `ImGui::SliderInt4` |
| `InputFloat2` | `inputFloat2` | `ImGui::InputFloat2` |
| `InputFloat3` | `inputFloat3` | `ImGui::InputFloat3` |
| `InputFloat4` | `inputFloat4` | `ImGui::InputFloat4` |
| `InputInt2` | `inputInt2` | `ImGui::InputInt2` |
| `InputInt3` | `inputInt3` | `ImGui::InputInt3` |
| `InputInt4` | `inputInt4` | `ImGui::InputInt4` |
| `DragFloatRange2` | `dragFloatRange2` | `ImGui::DragFloatRange2` |
| `DragIntRange2` | `dragIntRange2` | `ImGui::DragIntRange2` |
| `SliderAngle` | `sliderAngle` | `ImGui::SliderAngle` |
| `Toggle` | `toggle` | - |
| `ToggleSwitch` | `toggle` | - |
| `BeginCombo` | `beginCombo` | `ImGui::BeginCombo` |
| `EndCombo` | `endCombo` | `ImGui::EndCombo` |
| `ListClipper` | `listClipper` | - |
| `OpenPopup` | `openPopup` | `ImGui::OpenPopup` |
| `BeginPopup` | `beginPopup` | `ImGui::BeginPopup` |
| `BeginPopupModal` | `beginPopupModal` | `ImGui::BeginPopupModal` |
| `BeginPopupContextItem` | `beginPopupContextItem` | `ImGui::BeginPopupContextItem` |
| `BeginPopupContextWindow` | `beginPopupContextWindow` | `ImGui::BeginPopupContextWindow` |
| `EndPopup` | `endPopup` | `ImGui::EndPopup` |
| `CloseCurrentPopup` | `closeCurrentPopup` | `ImGui::CloseCurrentPopup` |
| `IsPopupOpen` | `isPopupOpen` | `ImGui::IsPopupOpen` |
| `BeginMenuBar` | `beginMenuBar` | `ImGui::BeginMenuBar` |
| `EndMenuBar` | `endMenuBar` | `ImGui::EndMenuBar` |
| `BeginMenu` | `beginMenu` | `ImGui::BeginMenu` |
| `EndMenu` | `endMenu` | `ImGui::EndMenu` |
| `MenuItem` | `menuItem` | `ImGui::MenuItem` |
| `SetTooltip` | `setTooltip` | `ImGui::SetTooltip` |
| `SetItemTooltip` | `setItemTooltip` | `ImGui::SetItemTooltip` |
| `BeginTooltip` | `beginTooltip` | `ImGui::BeginTooltip` |
| `BeginItemTooltip` | `beginItemTooltip` | `ImGui::BeginItemTooltip` |
| `EndTooltip` | `endTooltip` | `ImGui::EndTooltip` |
| `BeginTable` | `beginTable` | `ImGui::BeginTable` |
| `EndTable` | `endTable` | `ImGui::EndTable` |
| `TableNextRow` | `tableNextRow` | `ImGui::TableNextRow` |
| `TableNextColumn` | `tableNextColumn` | `ImGui::TableNextColumn` |
| `TableSetColumnIndex` | `tableSetColumnIndex` | `ImGui::TableSetColumnIndex` |
| `TableSetupColumn` | `tableSetupColumn` | `ImGui::TableSetupColumn` |
| `TableGetSortSpecs` | `tableGetSortSpecs` | `ImGui::TableGetSortSpecs` |
| `TableSetupScrollFreeze` | `tableSetupScrollFreeze` | `ImGui::TableSetupScrollFreeze` |
| `TableHeadersRow` | `tableHeadersRow` | `ImGui::TableHeadersRow` |
| `TableSetBgColor` | `tableSetBgColor` | `ImGui::TableSetBgColor` |
| `PushStyleColor` | `pushStyleColor` | `ImGui::PushStyleColor` |
| `PopStyleColor` | `popStyleColor` | `ImGui::PopStyleColor` |
| `SetStyleColor` | `setStyleColor` | - |
| `SetStyleProperties` | `setStyleProperties` | - |
| `SetTheme` | `setTheme` | - |
| `PushStyleVar` | `pushStyleVar` | `ImGui::PushStyleVar` |
| `PopStyleVar` | `popStyleVar` | `ImGui::PopStyleVar` |
| `SetWindowFontScale` | `setWindowFontScale` | `ImGui::SetWindowFontScale` (obsolete) |
| `PushFont` | `pushFont` | `ImGui::PushFont` |
| `PopFont` | `popFont` | `ImGui::PopFont` |
| `WithFont` | `withFont` | - |
| `Icon` | `icon` | - |
| `ColorU32` | `colorU32` | - |
| `CreateTexture` | `createTexture` | - |
| `DestroyTexture` | `destroyTexture` | - |
| `Image` | `image` | `ImGui::Image` |
| `ImageButton` | `imageButton` | `ImGui::ImageButton` |
| `GetWindowDrawList` | `getWindowDrawList` | `ImGui::GetWindowDrawList` |
| `GetForegroundDrawList` | `getForegroundDrawList` | `ImGui::GetForegroundDrawList` |
| `GetBackgroundDrawList` | `getBackgroundDrawList` | `ImGui::GetBackgroundDrawList` |
| `PushID` | `pushId` | `ImGui::PushID` |
| `PopID` | `popId` | `ImGui::PopID` |
| `BeginGroup` | `beginGroup` | `ImGui::BeginGroup` |
| `EndGroup` | `endGroup` | `ImGui::EndGroup` |
| `Indent` | `indent` | `ImGui::Indent` |
| `Unindent` | `unindent` | `ImGui::Unindent` |
| `AlignTextToFramePadding` | `alignTextToFramePadding` | `ImGui::AlignTextToFramePadding` |
| `BeginDisabled` | `beginDisabled` | `ImGui::BeginDisabled` |
| `EndDisabled` | `endDisabled` | `ImGui::EndDisabled` |
| `GetScrollX` | `getScrollX` | `ImGui::GetScrollX` |
| `GetScrollY` | `getScrollY` | `ImGui::GetScrollY` |
| `GetScrollMaxX` | `getScrollMaxX` | `ImGui::GetScrollMaxX` |
| `GetScrollMaxY` | `getScrollMaxY` | `ImGui::GetScrollMaxY` |
| `SetScrollX` | `setScrollX` | `ImGui::SetScrollX` |
| `SetScrollY` | `setScrollY` | `ImGui::SetScrollY` |
| `SetScrollHereX` | `setScrollHereX` | `ImGui::SetScrollHereX` |
| `SetScrollHereY` | `setScrollHereY` | `ImGui::SetScrollHereY` |
| `IsItemActive` | `isItemActive` | `ImGui::IsItemActive` |
| `IsItemEdited` | `isItemEdited` | `ImGui::IsItemEdited` |
| `IsItemActivated` | `isItemActivated` | `ImGui::IsItemActivated` |
| `IsItemDeactivated` | `isItemDeactivated` | `ImGui::IsItemDeactivated` |
| `IsItemDeactivatedAfterEdit` | `isItemDeactivatedAfterEdit` | `ImGui::IsItemDeactivatedAfterEdit` |
| `IsItemFocused` | `isItemFocused` | `ImGui::IsItemFocused` |
| `IsItemVisible` | `isItemVisible` | `ImGui::IsItemVisible` |
| `IsWindowHovered` | `isWindowHovered` | `ImGui::IsWindowHovered` |
| `IsWindowFocused` | `isWindowFocused` | `ImGui::IsWindowFocused` |
| `IsWindowCollapsed` | `isWindowCollapsed` | `ImGui::IsWindowCollapsed` |
| `IsWindowAppearing` | `isWindowAppearing` | `ImGui::IsWindowAppearing` |
| `GetMousePos` | `getMousePos` | `ImGui::GetMousePos` |
| `IsMouseDown` | `isMouseDown` | `ImGui::IsMouseDown` |
| `IsMouseClicked` | `isMouseClicked` | `ImGui::IsMouseClicked` |
| `IsMouseDoubleClicked` | `isMouseDoubleClicked` | `ImGui::IsMouseDoubleClicked` |
| `IsMouseReleased` | `isMouseReleased` | `ImGui::IsMouseReleased` |
| `IsMouseDragging` | `isMouseDragging` | `ImGui::IsMouseDragging` |
| `GetMouseDragDelta` | `getMouseDragDelta` | `ImGui::GetMouseDragDelta` |
| `ResetMouseDragDelta` | `resetMouseDragDelta` | `ImGui::ResetMouseDragDelta` |
| `CalcTextSize` | `calcTextSize` | `ImGui::CalcTextSize` |
| `GetFrameHeight` | `getFrameHeight` | `ImGui::GetFrameHeight` |
| `GetFrameHeightWithSpacing` | `getFrameHeightWithSpacing` | `ImGui::GetFrameHeightWithSpacing` |
| `GetTextLineHeight` | `getTextLineHeight` | `ImGui::GetTextLineHeight` |
| `GetTextLineHeightWithSpacing` | `getTextLineHeightWithSpacing` | `ImGui::GetTextLineHeightWithSpacing` |
| `IsKeyDown` | `isKeyDown` | `ImGui::IsKeyDown` |
| `IsKeyPressed` | `isKeyPressed` | `ImGui::IsKeyPressed` |
| `IsKeyReleased` | `isKeyReleased` | `ImGui::IsKeyReleased` |
| `GetKeyPressedAmount` | `getKeyPressedAmount` | `ImGui::GetKeyPressedAmount` |
| `GetKeyName` | `getKeyName` | `ImGui::GetKeyName` |
| `IsKeyChordPressed` | `isKeyChordPressed` | `ImGui::IsKeyChordPressed` |
| `Shortcut` | `shortcut` | `ImGui::Shortcut` |
| `SetNextItemShortcut` | `setNextItemShortcut` | `ImGui::SetNextItemShortcut` |
| `GetClipboardText` | `getClipboardText` | `ImGui::GetClipboardText` |
| `SetClipboardText` | `setClipboardText` | `ImGui::SetClipboardText` |
| `BeginDragDropSource` | `beginDragDropSource` | `ImGui::BeginDragDropSource` |
| `SetDragDropPayload` | `setDragDropPayload` | `ImGui::SetDragDropPayload` |
| `EndDragDropSource` | `endDragDropSource` | `ImGui::EndDragDropSource` |
| `BeginDragDropTarget` | `beginDragDropTarget` | `ImGui::BeginDragDropTarget` |
| `AcceptDragDropPayload` | `acceptDragDropPayload` | `ImGui::AcceptDragDropPayload` |
| `EndDragDropTarget` | `endDragDropTarget` | `ImGui::EndDragDropTarget` |
| `GetDragDropPayload` | `getDragDropPayload` | `ImGui::GetDragDropPayload` |
| `WithDragDropSource` | `withDragDropSource` | - |
| `WithDragDropTarget` | `withDragDropTarget` | - |
| `PushClipRect` | `pushClipRect` | `ImGui::PushClipRect` |
| `PopClipRect` | `popClipRect` | `ImGui::PopClipRect` |
| `AddMousePosEvent` | `addMousePosEvent` | - |
| `AddMouseButtonEvent` | `addMouseButtonEvent` | - |

<!-- aliases:end -->
