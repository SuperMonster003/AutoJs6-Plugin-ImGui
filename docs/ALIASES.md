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
| Mutable values | `bool*`, `int*`, `float*`, `char*` buffers, `float col[3]` | A mutable value: `imgui.ref(x)`, a plain `{value: x}` object, or a Java array from `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats`. Colors are a reference to a number array. | `Begin`, `BeginTabItem`, `BeginPopupModal`, `Checkbox`, `RadioButton`, `SliderFloat`, `SliderInt`, `VSliderFloat`, `VSliderInt`, `DragFloat`, `DragInt`, `InputText`, `InputTextMultiline`, `InputInt`, `InputFloat`, `Combo`, `ListBox`, `ColorEdit3`, `ColorEdit4`, `ColorPicker3`, `ColorPicker4`, `MenuItem`, `Toggle` |
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
| Names | - | `ColorU32` stands for `GetColorU32`, `WantCaptureMouse` reads `io.WantCaptureMouse`, `ToggleSwitch` is a second name of the plugin's `Toggle` widget, and `PushID` / `PopID` call `pushId` / `popId`. `SetWindowFontScale` is obsolete in Dear ImGui 1.92 but kept by the plugin. | `ColorU32`, `WantCaptureMouse`, `Toggle`, `ToggleSwitch`, `PushID`, `PopID`, `SetWindowFontScale` |

## Not exposed

These Dear ImGui functions have no plugin method, so they have no alias either:

- Multi-component and range widgets: `SliderFloat2` to `SliderFloat4`, `DragFloat2` to `DragFloat4`, `InputFloat2`
  to `InputFloat4` and the `Int` forms, `DragFloatRange2`, `SliderAngle`, `InputDouble`, the `*Scalar*` functions,
  `CheckboxFlags`.
- Keyboard queries: `IsKeyDown`, `IsKeyPressed`, `IsKeyReleased`, `Shortcut`, `GetKeyName`. The `Key` constants
  are for injecting input with `addKeyEvent` / `sendKey`.
- Clipboard (`GetClipboardText`, `SetClipboardText`), drag and drop, `ImGuiListClipper`, `TableGetSortSpecs`,
  multi-select, the draw list `Path*` functions and `PushClipRect`, docking and multiple viewports.

## Alias list

The section below is generated by `python tools/generate_aliases_doc.py`; `--check` reports whether it is current.

<!-- aliases:begin (generated by tools/generate_aliases_doc.py) -->

194 aliases, in the order of the facade's alias table. "Upstream" is the `ImGui::` function of the
same name in the vendored `imgui.h`, marked "obsolete" when the header lists it only as an obsolete function.
The 37 aliases marked "-" name plugin features or differ from the upstream name (see "Names" above).

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
| `Toggle` | `toggle` | - |
| `ToggleSwitch` | `toggle` | - |
| `BeginCombo` | `beginCombo` | `ImGui::BeginCombo` |
| `EndCombo` | `endCombo` | `ImGui::EndCombo` |
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

<!-- aliases:end -->
