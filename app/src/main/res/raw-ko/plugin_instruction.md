서로 다른 호스트 설정에서도 동작하도록 플러그인을 명시적으로 로드하세요. AutoJs6 6.8 이상에서는 플러그인 센터 설정에서 전역 `imgui` 객체로 선택적 자동 마운트를 활성화할 수도 있습니다.

플로팅 창을 열기 전에 변경 가능한 참조를 만듭니다:

```js
var imgui = plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui 컨트롤",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("활성화", enabled);
            ui.sliderFloat("수준", level, 0, 1, "%.2f");
            if (ui.button("닫기", 120, 0)) {
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

`width`, `height`, `fontSize`는 화면 밀도와 무관한 단위를 사용합니다. `inputText`에 포커스하면 조합 입력을 지원하는 시스템 IME가 자동으로 열립니다. 빈 영역 드래그로 창을 이동하고 두 손가락 세로 스와이프로 관성 스크롤하며 한 손가락 길게 누르기로 오른쪽 클릭합니다. `movable: false`를 전달하면 드래그를 비활성화합니다. 시스템 글꼴에 필요한 문자가 없으면 `fontPath`로 TTF 또는 OTF 파일을 불러옵니다.

`Themes` / `setTheme`, `setStyleProperties`, `Appearance`로 외형을 설정할 수 있습니다. `createWindow.fonts`는 assets 또는 파일 글꼴을 `pushFont` / `withFont`용으로 로드하며 CJK 대체 글꼴과 Material 아이콘이 자동 병합되어 `Icons` / `icon(name)`으로 제공됩니다.

`createTexture`는 경로, 인코딩된 바이트, Android `Bitmap`, `images.read` 또는 스크린샷의 AutoJs6 `Image`를 지원합니다. `image` / `imageButton`으로 표시하고 더 이상 필요하지 않으면 `dispose()`를 호출하세요. 남은 텍스처는 세션이 자동으로 해제합니다. `getWindowDrawList`, `getForegroundDrawList`, `getBackgroundDrawList`는 Surface 픽셀 좌표의 선, 도형, 텍스트, 이미지 프리미티브를 제공합니다.

오버레이는 기본적으로 `TouchMode.Auto`를 사용하여 ImGui 창은 상호작용 가능하게 유지하고 빈 영역의 터치는 통과시킵니다. 세션은 터치/투명도/보안 변경, 저 FPS 미니 버블로 접기, 독립적인 `addButtonEx`, `iniPath` 레이아웃 저장과 이벤트 알림을 지원합니다. `imgui.launch(...)`는 현재 resumed 상태인 AutoJs6 Activity에서 전체 화면 Surface를 사용합니다. 하나의 네이티브 세션에 여러 `begin` / `withWindow` 루트를 만들 수 있으며 새 세션은 이전 세션을 닫습니다.

`setMoreTouch(true)`는 기본 창과 독립 버튼에서 Android split-touch를 활성화합니다. `launchPrivileged(callback, {backend: "auto"})`는 운영 SurfaceFlinger 모드를 명시적으로 선택하고 AutoJs6의 기존 Shizuku/root 승인을 재사용하므로 오버레이 권한이 필요 없습니다. `/dev/input`은 관찰만 하며 터치스크린을 독점하지 않습니다. `getBackendCapabilities()`는 권한 상승 없이 호스트 상태를 보고합니다.

테이블, 컨텍스트 팝업, 메뉴, 툴팁, 스타일 스택과 60개 이상의 컨트롤을 사용할 수 있습니다. `withTable`, `withPopupModal`, `withContextItem`, `withMenuBar`는 begin/end 호출을 안전하게 짝지어 줍니다. 전체 API 개요는 프로젝트 README와 로드맵을 참고하세요.

상태형 컨트롤은 `imgui.ref(value)`로 만든 가벼운 참조나 일반 `{ value: ... }` 객체도 허용하며, 기존 `bool`, `float`, `int`, `string`, 색상 배열 헬퍼와도 호환됩니다. 세션 관리형 `logWindow`, `toast`, Promise 대화상자, `statsOverlay`, `dataTable` 컴포넌트는 사용자 콜백 뒤에 렌더링되고 세션과 함께 자동으로 닫힙니다.

내장 예제 5개는 `imgui.runExample("widget-overview")`, `"parameter-panel"`, `"log-hud"`, `"data-table-demo"`, `"theme-gallery"`로 실행하고, `listExamples`에서 목록을 확인하며 `getExampleSource`로 소스를 볼 수 있습니다. AutoJs6 6.8 플러그인 센터는 아직 일반적인 원클릭 예제 실행 동작을 제공하지 않습니다.

v1.7은 완전한 편집기 선언을 `types/imgui.d.ts`에 제공합니다. 런타임 한도는 `imgui.Limits`(텍스트 64 KiB, 선택 항목 512개, 입력 이벤트 2,048개)로 확인하며, 초과 입력은 조용히 잘리지 않고 거부됩니다.
