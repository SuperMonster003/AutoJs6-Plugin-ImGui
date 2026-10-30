<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Dear ImGui로 플로팅 UI 만들기</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-ImGui?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-ImGui?color=A24232&label=Issues"/></a>
    <a href="https://github.com/ocornut/imgui"><img alt="Dear ImGui" src="https://img.shields.io/badge/Dear%20ImGui-1.92.9-3D6CB4"/></a>
    <br>
    <a href="https://developer.android.com/studio/archive"><img alt="Android Studio" src="https://img.shields.io/badge/Android%20Studio-2023.3+-B64FC8"/></a>
    <a href="https://www.jetbrains.com/idea/download/other.html"><img alt="IntelliJ IDEA" src="https://img.shields.io/badge/IntelliJ%20IDEA-2023.3+-EE4677"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-ImGui?color=534BAE&label=License"/></a>
  </p>
</div>

******

### 언어 (Languages)

******

현재 README.md는 다음 언어를 지원합니다:

- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-en.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-fr.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-es.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ja.md)
- 한국어 [ko] # 현재
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ru.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ar.md)

******

### 소개

******

ImGui 플러그인은 [Dear ImGui](https://github.com/ocornut/imgui) 즉시 모드 GUI 라이브러리를 AutoJs6에 도입하여 투명한 플로팅 창 안에서 OpenGL ES로 컨트롤을 렌더링합니다. 디버그 패널, 매개변수 조정기, 실행 중 HUD 같은 가벼운 플로팅 인터페이스에 잘 어울리며 창 생성, 프레임 예약, 터치 입력, 네이티브 리소스 정리를 하나의 간결한 API로 관리합니다.

플러그인 센터에서 플러그인을 활성화하면 스크립트에서 전역 객체 `imgui`를 바로 사용할 수 있습니다 (AutoJs6이 등록하며 멤버를 처음 호출할 때 플러그인을 로드합니다). `plugins.load`는 필요하지 않습니다. AutoJs6 6.8.0 이상이 필요합니다. 플러그인이 AutoJs6보다 새로우면 AutoJs6에 아직 등록되지 않은 새 멤버는 플러그인이 로드된 뒤(`imgui` 멤버를 처음 사용할 때)에야 `imgui`에 나타납니다. 렌더 콜백의 `ui` 인수는 항상 모든 멤버를 가집니다.

******

### 기능

******

- 자동 터치 통과, 접기/펼치기, 독립 플로팅 버튼, 투명도/보안, 레이아웃 저장과 수명 주기 이벤트를 제공하는 반응형 오버레이 및 Activity 전체 화면 세션.
- `launchPrivileged`는 AutoJs6가 관리하는 Shizuku/root를 이용하는 명시적 운영 SurfaceFlinger 모드입니다. 인증 Binder가 권한 Surface를 기존의 완전한 렌더러로 전달하고 `/dev/input`이 관찰형 포인터 입력을 제공합니다.
- AutoJs6이 전역 `imgui` 객체로 직접 등록하므로 플러그인을 활성화한 뒤 별도의 로드 단계가 필요 없으며, pinyin / mediainfo 등 공식 플러그인과 같은 방식입니다.
- 크기, 위치, 프레임 속도, 글꼴을 설정할 수 있는 투명 플로팅 창을 제공하며 빈 영역 드래그로 이동하고 두 손가락 관성 스크롤과 한 손가락 길게 누르기 오른쪽 클릭을 지원합니다. 몇 초간 입력이 없으면 배터리를 아끼기 위해 프레임 속도를 낮추고, 화면이 꺼져 있는 동안에는 그리기를 멈춥니다.
- `inputText` 계열은 조합 중 텍스트, 소프트 키보드 자동 표시/숨김, 일반 편집 키를 포함해 시스템 IME와 완전히 연동됩니다.
- 창, 탭, 트리 노드, 테이블, 팝업, 메뉴, 툴팁과 모바일 스타일 `toggle` 스위치를 포함한 60개 이상의 즉시 모드 컨트롤을 제공합니다.
- 11개 `Themes`, 일괄 스타일, 둥근 모서리/테두리/그림자 외형, 다중 글꼴 스택, CJK 대체 글꼴, Material Icons 하위 집합을 제공합니다.
- 관리형 텍스처는 파일 경로, 인코딩된 바이트, Android `Bitmap`, AutoJs6 `Image`를 지원하며 `image` / `imageButton`과 3개 DrawList 레이어로 이미지 표시와 사용자 지정 그리기를 제공합니다.
- 가벼운 `imgui.ref(value)` / `{value: x}` 참조는 모든 상태형 컨트롤에서 작동하며 기존 Java 배열 참조 헬퍼도 완전히 호환됩니다.
- 세션 관리 `logWindow`, 스택형 `toast`, Promise 대화상자, 임계값 색상 `statsOverlay`, 선택/CRUD `dataTable`로 즉시 디버그 UI를 구성할 수 있습니다.
- 자주 쓰는 API와 상수 열거형에는 PascalCase 별칭(예: `ui.Button`)이 있으며 인수는 플러그인 형식을 따릅니다. 별칭 목록과 업스트림 C++ 시그니처와의 차이는 [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md)를 참고하세요.
- 완전한 TypeScript 선언, 실행 가능한 예제 9개, Android 렌더링 계측 테스트, 락프리 입력 큐, 검증 가능한 업스트림 업데이트 도구, CI 릴리스 자동화를 제공합니다.
- 플러그인 정보, 사용 설명, README, CHANGELOG를 10개 언어로 현지화합니다.

******

### 설치

******

- [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases)에서 기기 아키텍처에 맞는 APK를 내려받습니다. 잘 모르겠다면 `universal` 패키지를 선택하세요.
- APK를 설치한 뒤 AutoJs6를 열고 플러그인 관리 페이지에서 이 플러그인이 인식되고 활성화되어 있는지 확인합니다.
- 스크립트에서 `imgui.createWindow(...)`를 바로 호출합니다. 처음 사용할 때 AutoJs6에 오버레이 (플로팅 창) 권한을 부여하세요.
- `launchPrivileged`를 사용하기 전에 AutoJs6에서 평소처럼 Root 또는 Shizuku를 설정하고 승인하세요. 플러그인은 해당 호스트 상태를 재사용하며 권한 모드에는 오버레이 권한이 필요하지 않습니다.

호스트 요구 사항: versionCode 5935 이상의 AutoJs6. 플러그인은 `arm64-v8a`, `armeabi-v7a`, `x86_64`, `x86` 바이너리를 제공하며 Android 7.0 (API 24) 이상과 OpenGL ES 3.0 지원 GPU/드라이버가 필요합니다.

******

### 빠른 시작

******

플러그인을 설치하고 활성화한 뒤 가변 참조를 만든 다음 플로팅 창을 엽니다:

```js
var enabled = imgui.ref(true);
var volume = imgui.ref(0.5);
var themeColor = imgui.ref([0.25, 0.55, 0.90]);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(ui.dp(overlay.width), ui.dp(overlay.height), ui.Cond.Always);
    ui.withWindow(
        "ImGui Panel",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("Enabled", enabled);
            ui.sliderFloat("Volume", volume, 0, 1, "%.2f");
            ui.colorEdit3("Theme", themeColor);
            if (ui.button("Close", 120, 0)) {
                overlay.close();
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

가변 컨트롤은 `imgui.ref(value)`로 만든 가벼운 참조나 일반 `{ value: ... }` 객체를 허용하며, 기존 `imgui.bool`, `imgui.int`, `imgui.float`, `imgui.string`, `imgui.floats` 헬퍼와도 호환됩니다. `inputText`에 포커스하면 조합 입력을 지원하는 시스템 IME가 자동으로 열리며 `ime: false`로 끌 수 있습니다. 창의 크기와 위치는 dp 단위입니다. `width`, `height`, `x`, `y` 옵션, 세션 필드, 이벤트 데이터가 모두 해당하며 `fontSize`도 dp입니다. 프레임 안의 좌표는 px이므로 `ui.dp()` / `ui.px()`로 변환합니다. 이벤트와 버튼 콜백은 스크립트 스레드에서 실행되며 ([THREADING.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/THREADING.md) 참고), 이전 버전과의 차이는 [MIGRATION-1.12.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/MIGRATION-1.12.md)에 정리되어 있습니다. 빈 영역 드래그로 창을 옮길 수 있고 (`movable: false`로 고정), 두 손가락 세로 스와이프에는 설정 가능한 관성 (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`)이 적용되며 한 손가락 길게 누르기는 오른쪽 클릭을 보냅니다 (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). 시스템 글꼴이 필요한 문자를 지원하지 않으면 `fontPath`로 TTF 또는 OTF 글꼴 파일을 지정하세요.

테마와 글꼴: `setTheme`은 11개 `Themes` 값을 받고 `setStyleProperties`는 여러 `StyleVar`를 한 번에 갱신합니다. `createWindow`에는 `theme`, `appearance`, `style`, `shadow`도 지정할 수 있습니다. `fonts` 배열로 assets (`asset://...`) 또는 파일 글꼴을 미리 로드하고 `pushFont` / `withFont`로 전환합니다. CJK 대체 글꼴과 아이콘은 자동 병합되며 `Icons` / `icon(name)`으로 아이콘 글리프를 얻습니다.

텍스처와 사용자 지정 그리기: 창 세션이 준비된 뒤 `createTexture`를 호출하세요 (일반적으로 렌더 콜백 안에서 처음 한 번 생성). 반환 객체는 `width`, `height`, `update(source)`(픽셀을 바꾸고 핸들은 유지하며, 크기가 바뀌면 `width` / `height`도 따라 바뀜), 멱등인 `dispose()` / `close()`를 제공하며 남은 텍스처는 세션 종료 시 자동으로 해제됩니다. `image` / `imageButton`으로 텍스처를 표시하고 `getWindowDrawList`, `getForegroundDrawList`, `getBackgroundDrawList`로 일반적인 그리기 프리미티브를 사용할 수 있습니다. DrawList 좌표는 Surface 픽셀 좌표입니다. AutoJs6 `images.read(...)`와 스크린샷 `Image` 값, PNG 또는 JPEG 데이터를 담은 `ArrayBuffer`나 형식화 배열을 직접 전달할 수 있습니다.

창 세션: 오버레이는 기본적으로 `TouchMode.Auto`를 사용하여 ImGui 루트 창은 상호작용 가능하게 유지하고 Surface 빈 영역의 입력은 뒤쪽 앱으로 전달합니다. 고정 정책은 `Touchable` 또는 `Passthrough`를 선택하세요. 세션은 투명도/보안/터치 모드 변경, 저 FPS 미니 버블로 접기, 독립적인 `addButtonEx`, `AlwaysAutoResize` 콘텐츠 추적, `iniPath` 레이아웃 저장, `on` / `once` / `off` 또는 옵션 콜백 이벤트를 지원합니다. `imgui.launch(...)`는 현재 resumed 상태인 AutoJs6 Activity에 전체 화면 Surface를 만들고 `launchFloaty(...)`는 오버레이를 명시합니다. 스크립트 엔진당 네이티브 렌더 세션은 하나지만 같은 콜백에서 원하는 수의 `begin` / `withWindow` ImGui 루트를 만들 수 있습니다. 새 세션은 이전 세션을 닫습니다. 렌더 콜백이나 이벤트 콜백이 예외를 던지면 `console.error`로 오류와 스택을 출력하고(같은 오류가 이어지면 한 번만) `error` 이벤트(`error` / `phase` / `frame`)를 발생시킵니다. `error` 리스너가 없으면 렌더 오류는 세션을 닫고(`closeReason`은 `render-error`), 리스너가 있으면 해당 프레임의 나머지를 건너뛰고 렌더링을 계속합니다. 옵션 `debug: true`는 `begin`에 짝이 맞는 `end`가 없는 등의 사용 오류를 `console.warn`과 logcat으로 보고하고 Metrics와 Debug Log 창을 표시합니다. `setTouchable` / `setGlobalAlpha` / `getComponent` 등 전역 메서드는 현재 세션에 작용하며 활성 세션이 없으면 `imgui.<name>: no active session`을 던집니다. `imgui.launch` 세션에서는 `back` 리스너가 `event.preventDefault()`를 호출하지 않는 한 뒤로 키가 세션을 닫습니다(`closeReason`은 `back`). 소프트 키보드가 표시되어 있으면 뒤로 키는 먼저 키보드를 닫습니다. 오버레이 창은 텍스트 입력에 포커스가 있을 때만 뒤로 키를 받으며 이때는 키보드만 닫습니다. `debug: true`에서는 렌더 콜백이 250 ms를 넘으면 `threads.start` 사용을 권하는 `console.warn`도 출력합니다(10초에 최대 한 번).

고수준 컴포넌트는 활성 세션에 연결되어 사용자 렌더 콜백 뒤에 그려집니다. `logWindow`는 레벨 색상, 지우기, 내보내기, 자동 스크롤을, `toast`는 위치 지정 시간 알림을, `alert` / `confirm` / `singleChoice` / `multiChoice`는 Promise를, `statsOverlay`는 프레임 시간 그래프와 프레임별 작업 시간을, `dataTable`은 선택과 CRUD를 제공합니다. 내장 예제 9개(`widget-overview`, `parameter-panel`, `log-hud`, `data-table-demo`, `theme-gallery`, `error-handling`, `background-task`, `large-list`, `texture-refresh`)는 `listExamples` / `getExampleSource`로 찾고 `runExample`로 실행할 수 있습니다. AutoJs6 6.8 플러그인 센터는 아직 범용 예제 메타데이터를 사용하지 않으므로 호스트 지원 전에는 아래 호출을 직접 실행하세요:

```js
imgui.runExample("widget-overview");
```

******

### API 개요

******

자주 쓰는 API에는 PascalCase 별칭도 있습니다(예: `ui.Button`은 `ui.button`과 같습니다). 별칭의 인수는 플러그인 형식(가변 값은 `imgui.ref` 등)을 따르므로 업스트림 C++ 시그니처와 일대일로 대응하지 않습니다. 목록과 차이는 [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md)를 참고하세요. lower camel case 메서드는 같은 이름의 Dear ImGui 작업에 대응하며 기능별 분류는 다음과 같습니다:

- 세션 런타임: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, 단위 변환 `density` / `dp` / `px`, 세션별 형식을 포함한 `on` / `once` / `off`, 콜백 오류를 알리는 세션 `error` 이벤트, 디버그 모드를 켜는 `debug` 옵션, 절전을 위한 `idleFps` / `idleDelay`, `setFps` / `setIdleFps` / `getFps`, `idle` / `active` 이벤트.
- 백엔드 탐색: `getBackendCapabilities` / `BackendStatus`는 창, split-touch, 권한 있는 프로세스, 직접 입력, Docking 및 Multi-Viewport의 사용 가능 여부와 운영 환경 준비 상태를 보고하며 권한 상승은 수행하지 않습니다.
- 세션과 창: `createWindow`, `closeWindow`, `withWindow`, `withChild`, `setNextWindowPos`, `setNextWindowSize`, `setNextWindowBgAlpha` 및 `isWindowHovered` 같은 창 상태 조회.
- 텍스트와 컨트롤: `text`, `textColored`, `textWrapped`, `separatorText`, `bulletText`, `labelText`, `button`, `arrowButton`, `invisibleButton`, `checkbox`, `toggle`, `radioButton`, `sliderFloat`, `sliderInt`, `vSliderFloat`, `dragFloat`, `dragInt`, `inputText`, `inputInt`, `inputFloat`, `inputTextMultiline`, `colorEdit3`, `colorEdit4`, `colorPicker4`, `colorButton`, `progressBar`, `plotLines`, `plotHistogram` 등. 여러 값을 다루는 위젯: `dragFloat2/3/4` / `dragInt2/3/4` / `sliderFloat2/3/4` / `sliderInt2/3/4` / `inputFloat2/3/4` / `inputInt2/3/4` / `dragFloatRange2` / `dragIntRange2` / `sliderAngle`.
- 컨테이너와 탐색: `withTabBar`, `withTabItem`, `withTreeNode`, `treeNodeEx`, `collapsingHeader`, `withTable` 테이블 계열, `withListBox`, `withCombo`, `selectable`, 긴 목록용 `listClipper`. 표 정렬: `tableGetSortSpecs` / `SortDirection`, `dataTable`의 `sortable: true`.
- 팝업과 메뉴: `openPopup`, `withPopup`, `withPopupModal`, `beginPopupContextItem`, `beginPopupContextWindow`, `withContextItem`, `withContextWindow`, `closeCurrentPopup`, `withMenuBar`, `withMenu`, `menuItem`, `setTooltip`, `setItemTooltip`, `withItemTooltip`.
- 스타일과 레이아웃: `styleColorsDark`, `styleColorsLight`, `styleColorsClassic`, `pushStyleColor`, `pushStyleVar`, `setWindowFontScale`, `withGroup`, `withDisabled`, `withId`, `indent`, `sameLine`, `separator`, `spacing` 및 커서와 스크롤 계열.
- 텍스처와 그리기: `createTexture`, `texture.update`, `destroyTexture`, `image`, `imageButton`, `colorU32` 및 선, 사각형, 원, 삼각형, 텍스트, 폴리라인, 베지어 곡선, 이미지 프리미티브를 제공하는 `getWindowDrawList`, `getForegroundDrawList`, `getBackgroundDrawList`. 경로 그리기: `pathLineTo` / `pathArcTo` / `pathArcToFast` / `pathBezierCubicCurveTo` / `pathBezierQuadraticCurveTo` / `pathRect` / `pathStroke` / `pathFillConvex` / `pathFillConcave`; 드로우 리스트와 창의 `pushClipRect` / `popClipRect`; 추가 도형: `addEllipse` / `addNgon` / `addQuad` / `addBezierQuadratic` / `addRectFilledMultiColor` / `addConvexPolyFilled` / `addConcavePolyFilled` / `addImageQuad` / `addImageRounded`.
- 조회와 입력: `isItemClicked`, `isItemHovered`, `isItemActive`, `isItemEdited`, `isMouseDown`, `getMousePos`, `calcTextSize`, `framerate` 같은 상태 조회, `setKeyboardFocusHere` 능동 포커스, 입력 프리미티브 `addInputCharacters`, `sendKey`, `addMouseWheel`, `wantTextInput`. 현재 공개된 모든 `InputTextFlags` 값은 Dear ImGui로 전달되며 콜백 의존 플래그는 제외되고 `WordWrap`은 여러 줄 입력에만 적용됩니다. 키 조회와 단축키: `isKeyDown` / `isKeyPressed` / `isKeyReleased` / `getKeyPressedAmount` / `getKeyName` / `isKeyChordPressed` / `shortcut` / `setNextItemShortcut`, 키 조합은 `ui.Mod.Ctrl | ui.Key.S` 처럼 씁니다. 클립보드: `getClipboardText` / `setClipboardText`. UI 자동 테스트용 포인터 주입: `addMousePosEvent` / `addMouseButtonEvent` (`getMousePos` 와 같은 프레임 픽셀).
- 드래그 앤 드롭: `withDragDropSource` / `withDragDropTarget`, `beginDragDropSource` / `setDragDropPayload` / `endDragDropSource` / `beginDragDropTarget` / `acceptDragDropPayload` / `endDragDropTarget` / `getDragDropPayload`, 그리고 `DragDropFlags`. 페이로드는 문자열, 숫자 또는 JSON 으로 직렬화할 수 있는 객체입니다.
- 디버그 도구: `showMetricsWindow` / `showDebugLogWindow` / `showIdStackToolWindow` / `showStyleEditor` / `showAboutWindow` / `showUserGuide`는 Dear ImGui 내장 도구 창을 표시합니다. 각각 선택적인 가변 boolean 참조를 받으며 닫기 버튼을 누르면 false가 됩니다.
- 고수준 컴포넌트와 예제: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, 그리고 `listExamples` / `getExampleSource` / `runExample`; 각 세션에도 같은 팩터리가 있습니다.
- 가변 참조: 가벼운 `imgui.ref`(또는 일반 `{value: x}` 객체)와 호환 Java 배열 헬퍼 `imgui.bool`, `imgui.int`, `imgui.float`, `imgui.string`, `imgui.floats`, `imgui.ints`, `imgui.strings`.
- 상수: `BackendStatus` / `Cond`, `WindowFlags`, `ChildFlags`, `InputTextFlags`, `SliderFlags`, `TreeNodeFlags`, `SelectableFlags`, `TabBarFlags`, `TabItemFlags`, `ComboFlags`, `PopupFlags`, `HoveredFlags`, `FocusedFlags`, `ColorEditFlags`, `TableFlags`, `TableColumnFlags`, `TableRowFlags`, `TableBgTarget`, `SortDirection`, `Col`, `StyleVar`, `Themes`, `Appearance`, `Fonts`, `Icons`, `Dir`, `Key`, `Mod`, `InputFlags`, `DragDropFlags`, `MouseButton`, `ButtonFlags`, `TextureFlags`, `DrawListLayer`, `DrawFlags`, `LogLevel`, `ToastPosition`, `Limits`. 값은 같은 이름의 Dear ImGui 열거형 또는 플러그인 표와 일치합니다.

******

### 알려진 제한

******

- 각 스크립트 엔진은 한 번에 하나의 네이티브 렌더 세션만 지원합니다. 여러 패널이 필요하면 해당 세션 안에 여러 ImGui 루트 창을 만드세요. 새 오버레이 또는 Activity 세션은 이전 세션을 닫습니다.
- `imgui.launch`에는 현재 resumed 상태인 AutoJs6 Activity가 필요합니다. 전면 호스트 Activity 없이 계속 렌더링해야 하면 `launchFloaty`를 사용하세요.
- v1.9 권한 모드는 고정 전체 화면의 포인터 전용이며 IME/키 입력, 호스트 레이어 알파/보안, 접기, 보조 Android 버튼, 회전 시 동적 재생성을 지원하지 않습니다. 직접 입력은 `EVIOCGRAB`을 쓰지 않으며 OEM SurfaceControl/SELinux 정책으로 시작이 거부될 수 있습니다. 기능 탐지는 `su` 실행이나 Shizuku 권한 요청을 하지 않습니다.

******

### 릴리스 기록

******

#### v1.15.0

###### 2026/10/30

* `기능` 키보드 조회: isKeyDown / isKeyPressed / isKeyReleased / getKeyPressedAmount / getKeyName / isKeyChordPressed 와 단축키 shortcut, setNextItemShortcut 을 추가했습니다. 키 조합은 ui.Mod.Ctrl | ui.Key.S 처럼 씁니다. Key 상수는 이제 키보드 전체를 포함합니다: A 부터 Z, Digit0 부터 Digit9, F1 부터 F24, 숫자 키패드 등
* `기능` 클립보드: getClipboardText / setClipboardText 는 호스트의 getClip / setClip 과 같은 Android 클립보드를 사용하며, 입력란의 Ctrl+C / Ctrl+V 도 마찬가지입니다. Android 10 부터는 입력 포커스를 가진 앱만 클립보드를 읽을 수 있습니다. 플로팅 창에 미치는 영향은 docs/LIMITS.md 를 참고하세요
* `기능` 드래그 앤 드롭: beginDragDropSource / setDragDropPayload / beginDragDropTarget / acceptDragDropPayload 와 도우미 함수 withDragDropSource / withDragDropTarget 으로 항목을 다른 항목으로 끌어다 놓을 수 있습니다 (옵션은 DragDropFlags). 페이로드는 문자열, 숫자 또는 JSON 으로 직렬화할 수 있는 객체이며, 색상 위젯의 색도 끌 수 있습니다. 예제 widget-overview 의 새 섹션을 참고하세요
* `기능` 사용자 정의 그리기: 경로 함수 (pathLineTo / pathArcTo / pathBezierCubicCurveTo / pathStroke / pathFillConvex 등), 드로우 리스트와 창의 pushClipRect / popClipRect, 새 도형 addEllipse, addNgon, addQuad 와 채우기 버전, addBezierQuadratic, addRectFilledMultiColor, addConvexPolyFilled, addConcavePolyFilled, addImageQuad, addImageRounded 를 추가했습니다. 예제 widget-overview 를 참고하세요
* `기능` 터치 시뮬레이션: addMousePosEvent(x, y) 와 addMouseButtonEvent(button, down) 으로 스크립트가 손가락처럼 창을 조작할 수 있어 UI 자동 테스트 등에 쓸 수 있습니다. 좌표는 getMousePos 와 같은 프레임 픽셀이며 createWindow 의 dp 가 아닙니다. 창 아래의 앱에는 영향을 주지 않습니다

#### v1.14.0

###### 2026/10/30

* `힌트` 동작 변경: imgui.launch로 연 전체 화면 창은 이제 뒤로 키를 누르면 닫힙니다(session.closeReason은 "back"). 창을 유지하려면 session.on("back", e) 안에서 e.preventDefault()를 호출하세요. 플로팅 창(launchFloaty)은 이전과 같습니다
* `기능` 디버그 도구 창: showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow / showUserGuide(별칭 ShowMetricsWindow 등)로 Dear ImGui 내장 도구를 표시합니다. imgui.bool(true)를 넘기면 닫기 버튼으로 숨길 수 있습니다. widget-overview 예제에 이 창들을 여는 Debug 메뉴가 추가되었습니다
* `기능` 표 정렬: Sortable 플래그가 있는 표에서는 열 머리글을 누르면 정렬이 바뀝니다. tableGetSortSpecs()는 정렬 열과 방향(imgui.SortDirection)을 반환하며 specsDirty는 정렬이 바뀐 프레임에서만 true입니다. tableSetupColumn의 네 번째 인수는 열의 사용자 id입니다. dataTable은 sortable: true로 행을 정렬하고 열의 compare 함수로 순서를 직접 정할 수 있습니다. data-table-demo 예제를 참고하세요
* `기능` 여러 값을 다루는 위젯: dragFloat2 / 3 / 4, dragInt2 / 3 / 4, sliderFloat2 / 3 / 4, sliderInt2 / 3 / 4, inputFloat2 / 3 / 4, inputInt2 / 3 / 4, 최솟값과 최댓값을 편집하는 dragFloatRange2 / dragIntRange2, 각도를 편집하는 sliderAngle(라디안으로 저장하고 도로 표시). 값은 {value: [x, y, z]}, imgui.floats(...) 또는 새 imgui.ints(...)로 넘깁니다. widget-overview 예제의 새 섹션을 참고하세요
* `개선` createWindow({debug: true})일 때 렌더 콜백이 250밀리초를 넘기면 console.warn으로 걸린 시간을 알리고 sleep, 네트워크, 파일 같은 느린 작업을 threads.start로 옮기라고 안내합니다(10초에 최대 한 번). 방법은 docs/THREADING.md에 있습니다

#### v1.13.0

###### 2026/10/30

* `힌트` 동작 변경: 배터리를 아끼기 위해 3초 동안 터치나 키 입력이 없으면 창은 초당 10프레임만 그리고, 화면이 꺼지거나 잠겨 있는 동안에는 그리기를 멈춥니다. 다시 터치하면 즉시 정상 프레임 속도로 돌아옵니다. 애니메이션이 있거나 입력 없이 바뀌는 데이터(타이머, 차트, 진행 막대)를 보여 주는 창은 createWindow에 idleFps: 0을 넘기거나 session.setIdleFps(0)을 호출해 정상 프레임 속도를 유지하세요
* `기능` ui.listClipper(itemCount, options, callback)(별칭 ListClipper)는 보이는 행만 그리므로 10만 행 목록도 부드럽게 스크롤됩니다. 새 예제 large-list를 참고하세요
* `기능` 프레임 속도 제어: createWindow 옵션 idleFps / idleDelay, session.setFps / setIdleFps / getFps, 세션 이벤트 idle / active, 필드 idle / paused
* `기능` texture.update(source)는 텍스처의 이미지를 바꾸고 핸들은 그대로 두므로 이를 표시하는 image 호출은 고칠 필요가 없습니다. 크기가 바뀌면 texture.width / height도 따라 바뀝니다. 1초에 두 번 미리보기를 새로 고치는 새 예제 texture-refresh를 참고하세요
* `기능` createTexture와 texture.update는 PNG 또는 JPEG 데이터를 담은 ArrayBuffer나 형식화 배열(Uint8Array 등)도 받습니다
* `기능` statsOverlay는 각 프레임의 작업 시간(화면 갱신 대기를 뺀 그리기 시간)을 표시하고, snapshot()은 이를 workTime으로 반환합니다
* `개선` docs/FRAME-LOOP.md에서 프레임 속도와 절전 방식을, docs/LIMITS.md에서 listClipper의 제한을 설명합니다

##### 더 많은 릴리스 기록

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-ko.md)

******

### 빌드

******

```powershell
.\gradlew.bat :app:assembleDebug
```

CRC32 요약을 파일 이름에 포함하는 Release 빌드:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

네이티브 소스 목록, JNI 선언 일치, 단위 테스트, ABI 분할 무결성을 검증:

```powershell
.\gradlew.bat :app:verifyImGuiDebugApks
```

빌드 매개변수는 `version.properties`에서 가져옵니다. 현재 최소 SDK는 24이고 대상 SDK는 37입니다.

******

### 프로젝트 구성

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/assets/plugin/index.js
app/src/main/assets/examples/widget-overview.js
app/src/main/cpp/ImGuiBridge.cpp
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
Roadmap.md
```

`index.js`는 스크립트 엔진 쪽 `imgui` 모듈이고 `ImGuiBridge.cpp`는 Dear ImGui로 이어지는 JNI 브리지입니다. `strings.xml`에는 현지화된 플러그인 설명이 있고 `plugin_instruction.md`에는 호스트가 표시하는 사용 설명이 있습니다. README와 CHANGELOG는 `.python/generate_markdown.py`가 JSON 소스에서 생성하므로 생성된 파일 대신 JSON 소스를 편집하세요.

******

### 링크

******

- AutoJs6 프로젝트: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui 공식 프로젝트: https://github.com/ocornut/imgui
- 기능 확장 로드맵 (Roadmap): https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)
