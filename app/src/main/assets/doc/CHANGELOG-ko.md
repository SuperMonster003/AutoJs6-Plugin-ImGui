******

### 릴리스 기록

******

# v1.9.0

###### 2026/08/30

* `기능` 선택 가능한 `launchPrivileged` / `WindowMode.Privileged` 백엔드를 추가하고 명시적 `auto`·`shizuku`·`root` 실행 정책 및 `Session.getBackendInfo()` 실시간 진단을 지원
* `기능` AutoJs6 RootMode, `RootUtils` / `ProcessShell`, 이미 승인된 `WrappedShizuku` UserService를 재사용하는 리플렉션 전용 호스트 어댑터 추가
* `기능` 인증된 Binder Surface v2 프로토콜 추가: UID 0/2000 권한 자식 프로세스가 SurfaceControl 레이어를 소유하고 Surface만 기존의 완전한 호스트 렌더러로 전달
* `기능` 권한 Type A/Type B `/dev/input` 리더를 일반 제한형 ImGui 입력 큐에 연결하고 비독점 관찰 정책과 `Passthrough` 콜백 제어를 구현
* `수정` Android 29+의 권위 있는 `IContentProvider.call` 오버로드를 선택하여 API 31+ 외부 Provider 랑데부에서 실제 Broker authority를 보존
* `수정` `app_process` 자식이 종료 가능한 Looper를 사용하도록 변경하여 정상 정리 중의 잘못된 `Main thread not allowed to quit` 오류 제거
* `수정` Broker 일반 바인딩에 AutoJs6 플러그인 권한을 적용하고 endpoint 등록을 1회로 제한하면서 UID·소유자·상수 시간 token·Binder death 검증 유지
* `개선` 백엔드 기능과 TypeScript를 schema v2로 갱신하여 호스트 Root/Shizuku 상태, Binder 전송, 256-bit token 경계, 렌더러 위치 및 direct-input 정책 공개
* `개선` API 28 Magisk root 및 API 31 Shizuku 13.5의 실제 AutoJs6 호스트 경로에서 UID 0/2000 레이어, 기존 JS API 렌더링, Type A/Type B 입력 감지, 스크린샷과 잔여 프로세스 없는 종료를 검증

# v1.8.0

###### 2026/08/30

* `기능` 창/플로팅 버튼용 `moreTouch` 옵션과 세션/전역 `setMoreTouch`를 추가하여 `FLAG_SPLIT_TOUCH`를 일관되게 제어
* `기능` `BackendStatus`와 `getBackendCapabilities`를 추가하여 운영 창 백엔드, split-touch, 권한 프로세스, direct input, Docking, Multi-Viewport 상태를 타입과 함께 공개
* `기능` 독립 `app_process`의 실험적 권한 렌더링 수직 경로 구현: SurfaceControl 레이어 → Surface → EGL ES 3 → Dear ImGui, 256-bit token 인증 로컬 socket 프레임 프로토콜 지원
* `기능` `/dev/input` 16/24-byte 디코딩, Type A/Type B 멀티터치 추적, 회전 좌표 매핑 및 프레임 시작 시 소비하는 제한 입력 큐 구현
* `수정` Activity/overlay split-touch 플래그를 런타임에 변경하고 종료 시 호스트 원본 플래그를 확정적으로 복원하며 기존 버튼도 동기화
* `수정` 권한 프로토콜이 잘못된 magic/version, 과대·잘린 payload, 미인증 클라이언트를 거부하고 timeout/연결 종료 후 input, EGL, SurfaceControl, 프로세스를 정리
* `개선` API 28 root 실기기에서 UID 2000 → UID 0 socket 프레임, 독립 ImGui 레이어, `/dev/input/event6` down/move/up을 검증하고 API 28/35 실기기에서 connected 테스트 3개 통과
* `개선` 권한 백엔드 및 Docking/Multi-Viewport 설계 문서, protocol/evdev 단위 테스트와 빌드 안전 검사를 추가; P6는 명시적으로 experimental 상태 유지

# v1.7.0

###### 2026/08/30

* `기능` 호출 가능한 API 214개, 상수 그룹 36개, 세션, 컴포넌트, DrawList, 전역/플러그인/모듈 진입점을 모두 다루는 완전한 `types/imgui.d.ts`를 strict TypeScript 스모크 계약과 함께 제공
* `기능` 내장 라이브러리를 바로 실행할 수 있는 예제 5개로 확장: 위젯 개요, 매개변수 패널, 로그 HUD, 데이터 테이블 데모, 테마 갤러리
* `기능` 실제 Surface에서 초기화, 프레임 구성, 컨트롤, 렌더링, PixelCopy 의미 기반 스크린샷 기준선, 종료를 검증하는 Android 계측 테스트 추가
* `기능` GitHub Actions PR 검증과 서명된 `v*` 릴리스 자동화를 추가하고 서명 재검증 및 APK 결과물 게시 지원
* `기능` 체크섬이 있는 Dear ImGui 업스트림 스냅샷과 불변 tag/commit, 아카이브 검증, dry-run, 허용 목록 추출을 지원하는 안전한 업데이트 도구 추가
* `수정` 터치, IME, 키, 휠 이벤트가 프레임 시작 시 소비되는 용량 제한 락프리 FIFO 큐에 들어가며, 수명 주기 큐 교체로 지연 이벤트가 새 네이티브 세션에 도달하지 않도록 수정
* `수정` 프레임 스케줄링을 절대 마감 시각 보정 방식으로 바꿔 작업 시간과 타이머 지연의 누적 드리프트를 줄이고 늦거나 접힌 프레임 뒤에 안정적으로 재설정
* `개선` 텍스트 64 KiB, 선택 항목 512개, 입력 이벤트 2,048개의 `Limits`를 공개하고 강제하며 구성 가능성 판단과 안전 근거를 문서화
* `개선` 빌드 검증을 런타임 API, 별칭, 상수, TypeScript 선언, 예제, 입력 큐 불변 조건, 모든 vendored 업스트림 해시의 교차 확인으로 확장

# v1.6.0

###### 2026/08/30

* `기능` 기존 Java 배열 헬퍼와의 호환성을 유지하면서 모든 상태형 위젯에 가벼운 `imgui.ref(value)` 및 `{ value: ... }` 참조를 추가했습니다
* `기능` 세션 관리형 `logWindow`와 레벨 색상, 내보내기, 결정적 정리를 지원하는 누적·시간 제한 `toast` 알림을 추가했습니다
* `기능` 모달을 순서대로 표시하는 Promise 기반 `alert`, `confirm`, `singleChoice`, `multiChoice` 대화상자를 추가했습니다
* `기능` 임계값 색상을 사용하는 `statsOverlay`와 안정적인 행, CRUD, 도구 모음, 사용자 지정 렌더링을 갖춘 선택형 `dataTable`을 추가했습니다
* `기능` 완전한 `widget-overview` 예제와 `listExamples`, `getExampleSource`, `runExample`, 호스트 검색 메타데이터를 번들했습니다
* `수정` 대기 중인 대화상자 Promise가 결정적인 취소 값으로 완료되고 세션 종료 시 모든 고수준 컴포넌트가 정리되도록 했습니다
* `수정` 예제 소스 조회를 계약 허용 목록으로 제한하고 경로 순회를 거부하도록 했습니다
* `수정` 지연 Surface 복구 프로브를 Android holder 콜백과 직렬화하여 느린 기기에서 네이티브 컨텍스트가 중복 초기화되지 않도록 했습니다
* `개선` `LogLevel`과 `ToastPosition`을 추가해 상수 목록을 35개 그룹으로 확장하고 PascalCase 별칭과 소스 검증을 강화했습니다
* `개선` 물리 OpenGL ES 3.2 기기에서 고수준 렌더링, 공개 예제 실행, 결과 의미 및 정리를 검증했습니다

# v1.5.0

###### 2026/08/30

* `기능` `TouchMode.Touchable` / `Passthrough` / `Auto`를 추가했습니다. Auto 모드는 ImGui 루트 창별 투명 터치 프록시를 만들어 빈 영역의 입력을 뒤쪽 앱으로 전달합니다
* `기능` 세션 `collapse` / `expand`, 저 FPS 미니 버블, 독립적으로 드래그 가능한 `addButtonEx`, 런타임 투명도 및 `FLAG_SECURE` 제어를 추가했습니다
* `기능` `imgui.launch` Activity 전체 화면 모드와 명시적인 `launchFloaty` 오버레이 모드를 추가했으며 하나의 렌더러가 여러 `begin` / `withWindow` 루트를 지원합니다
* `기능` 반응형 화면 추적, `AlwaysAutoResize` 외부 창 크기 조정, 선택적 `iniPath` 영속화와 세션 이벤트를 추가했습니다
* `수정` Surface가 파괴되면 분리하고 복원 시 다시 연결하여 EGL/ImGui 컨텍스트와 관리 텍스처 핸들을 유지합니다
* `수정` 자동 터치 통과는 Android 공개 API만 사용하며 프록시를 최대 64개의 상호작용 루트로 제한합니다
* `개선` JNI 표면을 186개에서 190개 바인딩으로 확장하고 소스 검증이 P3 세션 파사드까지 검사하도록 했습니다
* `개선` 종료 시 Activity 플래그, 시스템 UI, 오버레이, 터치 프록시와 플로팅 버튼을 결정적으로 복원하거나 정리합니다
* `개선` APK Manifest와 설치 문서에 OpenGL ES 3.0 하드웨어 요구 사항을 명시했습니다

# v1.4.0

###### 2026/08/30

* `기능` 세션 관리형 `createTexture`를 추가해 파일 경로, 인코딩된 `byte[]` / `ByteBuffer`, Android `Bitmap`, 스트림, AutoJs6 `Image`를 지원
* `기능` 원본 크기와 종횡비 도우미, UV 범위, 색조, 배경색을 지원하는 `image` / `imageButton` 추가
* `기능` 호출자가 소유한 이미지를 재활용하지 않고 AutoJs6 `images.read`와 스크린샷 결과를 직접 텍스처로 만들 수 있도록 연동
* `기능` 창/전경/배경 3개 DrawList 레이어와 선, 사각형, 원, 삼각형, 텍스트, 폴리라인, 3차 베지어 곡선, 이미지 프리미티브 추가
* `수정` Bitmap 업로드에서 행 스트라이드를 올바르게 처리하고 Android의 미리 곱해진 Alpha를 복원해 반투명 색상의 어두운 테두리를 제거
* `수정` 대기 중인 그리기 데이터가 렌더링된 뒤까지 텍스처 폐기를 지연하고 만료됨, 폐기됨, 다른 세션의 핸들을 안전하게 거부
* `개선` JNI 바인딩을 172개에서 186개로 확장하고 소스 검증이 텍스처와 DrawList 퍼사드까지 확인하도록 개선
* `개선` 인코딩 데이터 128 MiB, 3,200만 화소, OpenGL 최대 크기 제한과 세션에 남은 모든 텍스처 자동 정리를 추가

# v1.3.0

###### 2026/08/30

* `기능` `Themes` / `setTheme(name)`에 Pink, Blue, ModernDark, CyanDusk, OrangeDark, CrystalClear, VibrantNight, PurpleDream을 포함한 11개 완성형 테마 추가
* `기능` 영구 `setStyleColor`와 일괄 `setStyleProperties`를 추가하고 `createWindow`에서 `theme` / `appearance` / `style`, 모서리, 테두리, 그림자를 직접 설정하도록 확장
* `기능` `AssetManager` 글꼴 경로를 활성화하고 약 9,800자의 CJK 하위 집합을 내장하여 Noto CJK가 없는 경량 시스템을 보완
* `기능` `Fonts` / `pushFont` / `popFont` / `withFont` 및 `createWindow.fonts`를 추가하여 assets/파일 글꼴, 이름 있는 핸들, Dear ImGui 1.92 동적 크기를 지원
* `기능` 38개 글리프 Material Icons 하위 집합과 `Icons` 표, `icon(name, label)` 도우미 내장
* `수정` 테마 변경 시 밀도에 맞춰 조정된 기준 스타일에서 결정적으로 초기화하면서 현재 글꼴 크기와 전역 배율을 유지하도록 수정
* `개선` JNI 바인딩을 167개에서 172개로 확장하고 테마/글꼴 파사드 목록 및 두 글꼴 자산의 SHA-256 무결성 검사를 추가
* `개선` 기본 및 추가 글꼴에 CJK 대체 글꼴과 아이콘을 자동 병합하여 스크립트의 수동 아틀라스 조립을 제거

# v1.2.0

###### 2026/08/30

* `기능` 시스템 IME 통합: `inputText` / `inputTextMultiline`에 포커스하면 소프트 키보드가 자동으로 열리고 조합/확정 텍스트와 Backspace, Enter, 방향키를 처리
* `기능` 스크립트가 다음 입력 컨트롤에 능동적으로 포커스하고 IME로 넘길 수 있는 `setKeyboardFocusHere` 추가
* `기능` 두 손가락 스크롤에 `fling` / `flingFriction` / `flingMinVelocity` / `flingMaxVelocity`로 설정 가능한 관성 감쇠 추가
* `기능` 한 손가락 길게 누르기를 오른쪽 클릭으로 설정할 수 있으며 `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` 추가
* `수정` 창 드래그, 두 손가락 스크롤, 길게 누르기 전환을 취소할 때 활성 컨트롤을 해제해 의도치 않은 클릭을 방지
* `수정` IME 프록시를 만들기 전에 SurfaceHolder 콜백을 등록하여 이미 유효한 Surface 때문에 렌더링 세션이 초기화되지 않는 경쟁 조건을 수정
* `수정` 플로팅 창이 포커스를 얻은 뒤 소프트 키보드 요청을 재시도하여 Android가 IME 뷰를 serve하기 전 첫 요청이 사라지는 문제를 수정
* `수정` 시작 문서는 기본적으로 `plugins.load`를 사용하고 호스트 자동 마운트를 AutoJs6의 선택적 설정으로 설명하도록 수정
* `개선` `verifyImGuiSource`를 JNI → Java 연결 계층 → JavaScript 파사드의 3계층 래퍼 커버리지 검사로 확장
* `개선` IME 조합 문자열은 이전 사전 편집 문자열을 교체해 동기화하므로 스크립트가 후보 과정을 관리할 필요가 없음

# v1.1.0

###### 2026/08/30

* `기능` 테이블 API 계열: `withTable`, `beginTable`, `tableNextRow`, `tableNextColumn`, `tableSetupColumn`, `tableSetupScrollFreeze`, `tableHeadersRow`, `tableSetBgColor`. 테두리, 행 줄무늬, 행/열 고정, 배경색 지원
* `기능` 팝업과 메뉴: `openPopup`, `withPopup`, `withPopupModal`, `closeCurrentPopup`, `isPopupOpen`, `withMenuBar`, `withMenu`, `menuItem`
* `기능` 툴팁: `setTooltip`, `setItemTooltip`, `withTooltip`, `withItemTooltip`
* `기능` `toggleSwitch` 및 `ToggleSwitch` 별칭을 갖춘 모바일 스타일 `toggle` 스위치 컨트롤
* `기능` 추가 컨트롤과 텍스트 항목: `separatorText`, `bullet`, `bulletText`, `labelText`, `textDisabled`, `arrowButton`, `invisibleButton`, `inputInt`, `inputFloat`, `inputTextMultiline`, `listBox`, `withListBox`, `colorPicker3`, `colorPicker4`, `colorButton`, `plotLines`, `plotHistogram`, `treeNodeEx`, `vSliderFloat`, `vSliderInt`, `withCombo`
* `기능` 스타일 스택과 구조 API: `pushStyleColor`, `popStyleColor`, `pushStyleVar`, `popStyleVar`, `setWindowFontScale`, `pushId`, `withId`, `withGroup`, `withDisabled`, `indent`, `unindent`, `alignTextToFramePadding`
* `기능` 스크롤 계열: `getScrollX/Y`, `getScrollMaxX/Y`, `setScrollX/Y`, `setScrollHereX/Y`
* `기능` 상태 조회: `isItemActive`, `isItemEdited`, `isItemDeactivatedAfterEdit`, `isItemFocused`, `isWindowHovered`, `isWindowFocused`, `isWindowCollapsed`, `isMouseDown`, `isMouseClicked`, `isMouseDragging`, `getMousePos`, `getMouseDragDelta`, `calcTextSize`, `getFrameHeight`, `framerate` 등
* `기능` 입력 프리미티브: `addInputCharacters`, `addKeyEvent`, `sendKey`, `addMouseWheel`, `wantTextInput`. 향후 IME 지원을 위한 이벤트 채널을 마련
* `기능` 두 손가락 세로 스와이프로 창 내용을 스크롤하며 한 손가락 창 드래그와 자동으로 구분
* `기능` 상수 테이블을 24개 그룹으로 확장하고 `ChildFlags`, `ComboFlags`, `PopupFlags`, `HoveredFlags`, `FocusedFlags`, `ColorEditFlags`, `TableFlags`, `TableColumnFlags`, `TableRowFlags`, `TableBgTarget`, `Col`, `StyleVar`, `Dir`, `Key`, `ButtonFlags` 추가
* `수정` 네이티브 컨텍스트에서 터치 스레드와 렌더링 스레드 간의 경쟁 상태를 수정하고 상호 작용 조회가 프레임 종료 시점의 스냅샷을 읽도록 변경
* `수정` `WantCaptureMouse`와 `StyleColorsDark`, `StyleColorsLight`, `StyleColorsClassic`의 누락된 PascalCase 별칭 추가
* `개선` 문서와 예제가 호스트 상주 전역 객체 메커니즘을 설명하며 더 이상 `plugins.load` 호출을 권장하지 않음
* `개선` 필요한 호스트 버전 코드와 ABI 목록을 `ImGuiPluginContract`에서 단일 소스로 관리하고 빌드 스크립트가 파싱하도록 변경
* `개선` 모든 새 API에 해당 Dear ImGui 이름과 일치하는 PascalCase 별칭 제공

# v1.0.0

###### 2026/08/29

* `기능` 호스트가 스크립트 엔진에 자동으로 마운트하는 전역 `imgui` 객체
* `기능` Dear ImGui 1.92.9로 렌더링하며 크기, 프레임 속도, 글꼴, 빈 영역 드래그를 설정할 수 있는 투명 플로팅 창
* `기능` 창, 레이아웃, 텍스트, 입력, 선택, 색상, 진행 표시, 트리, 탭, 테마, 데모를 위한 즉시 모드 API
* `기능` 상태를 가진 컨트롤을 위한 Boolean, 정수, 부동 소수점, 문자열, 색상 가변 참조
* `기능` 플러그인 정보, 사용 설명, README, CHANGELOG의 10개 언어 현지화
* `의존성` 플러그인 검색 메타데이터를 위한 Common Plugin API 추가
* `의존성` Kotlin 표준 라이브러리 및 Parcelize 런타임 2.2.21 추가
* `의존성` 빌드 도구를 위한 Apache Commons Compress 1.28.0 및 XZ for Java 1.10 추가
* `의존성` 플러그인 계약 테스트를 위한 JUnit 4.13.2 추가
