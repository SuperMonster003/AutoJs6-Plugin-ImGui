<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Dear ImGui로 플로팅 UI 만들기</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-ImGui?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-ImGui?color=A24232&label=Issues"/></a>
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

ImGui 플러그인은 스크립트 엔진에서 Dear ImGui를 전역 `imgui` 객체로 제공합니다. 투명한 플로팅 창에 즉시 모드 컨트롤을 렌더링하고 창 생성, 프레임 예약, 터치 입력, 네이티브 리소스 정리를 하나의 간결한 API로 관리합니다.

******

### 기능

******

- 자동 마운트 또는 `plugins.load(packageName)`로 전역 `imgui` 객체를 불러옵니다.
- 크기, 위치, 프레임 속도, 글꼴, 빈 영역 드래그를 설정할 수 있는 투명 플로팅 창을 만듭니다.
- 창, 하위 영역, 탭, 트리, 텍스트, 버튼, 변경 가능한 입력, 선택기, 진행 표시, 레이아웃 도우미, 테마, Dear ImGui 데모 창을 제공합니다.
- 상태를 가진 컨트롤을 위한 Boolean, 정수, 부동 소수점, 문자열, 색상 가변 참조를 제공합니다.
- 플러그인 정보, 사용 설명, README, CHANGELOG를 10개 언어로 현지화합니다.

******

### 사용법

******

플러그인 센터에서 자동 마운트를 활성화하거나 플러그인을 명시적으로 불러온 뒤 플로팅 창을 만듭니다:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");

var enabled = imgui.bool(true);
var value = imgui.float(0.5);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(overlay.width, overlay.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui controls",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("Enabled", enabled);
            ui.sliderFloat("Value", value, 0, 1, "%.2f");
            if (ui.button("Close", 120, 0)) {
                overlay.close();
            }
        }
    );
}, {
    width: 360,
    height: 240,
    fontSize: 16,
    fps: 60
});
```

가변 컨트롤은 `imgui.bool`, `imgui.int`, `imgui.float`, `imgui.string`, `imgui.floats`로 만든 참조를 갱신합니다. `width`, `height`, `fontSize`는 화면 밀도와 무관한 단위를 사용합니다. 빈 영역을 드래그해 창을 옮기거나 `movable: false`로 고정할 수 있습니다.

******

### API 개요

******

lower camel case 메서드는 일반적인 Dear ImGui 작업에 대응하며 익숙한 컨트롤 호출을 위한 PascalCase 별칭도 제공합니다:

- 수명 주기: `createWindow`, `closeWindow`, `withWindow`, `withChild`, `withTabBar`, `withTabItem`, `withTreeNode`.
- 컨트롤: 텍스트, 버튼, 체크박스, 라디오 버튼, 슬라이더, 편집 필드, 색상, 진행 표시, 콤보, 선택 항목.
- 레이아웃과 상태: 커서 및 너비 메서드, `sameLine`, `separator`, `spacing`, 항목 조회, 캡처 조회.
- 상수: `Cond`, `WindowFlags`, `InputTextFlags`, `SliderFlags`, `TreeNodeFlags`, `SelectableFlags`, `TabBarFlags`, `TabItemFlags`, `MouseButton`.

******

### 릴리스 기록

******

# v1.0.0

###### 2026/08/29

* `기능` 자동 마운트와 명시적 `plugins.load`를 지원하는 전역 `imgui` 객체
* `기능` Dear ImGui 1.92.9로 렌더링하며 크기, 프레임 속도, 글꼴, 빈 영역 드래그를 설정할 수 있는 투명 플로팅 창
* `기능` 창, 레이아웃, 텍스트, 입력, 선택, 색상, 진행 표시, 트리, 탭, 테마, 데모를 위한 즉시 모드 API
* `기능` 상태를 가진 컨트롤을 위한 Boolean, 정수, 부동 소수점, 문자열, 색상 가변 참조
* `기능` 플러그인 정보, 사용 설명, README, CHANGELOG의 10개 언어 현지화
* `의존성` 플러그인 검색 메타데이터를 위한 Common Plugin API 추가
* `의존성` Kotlin 표준 라이브러리 및 Parcelize 런타임 2.2.21 추가
* `의존성` 빌드 도구를 위한 Apache Commons Compress 1.28.0 및 XZ for Java 1.10 추가
* `의존성` 플러그인 계약 테스트를 위한 JUnit 4.13.2 추가

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

빌드 매개변수는 `version.properties`에서 가져옵니다. 현재 최소 SDK는 24이고 대상 SDK는 36입니다.

******

### 리소스 구성

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
```

`strings.xml`에는 현지화된 설명이 있고 `plugin_instruction.md`에는 호스트가 표시하는 사용 설명이 있습니다. `.python/generate_markdown.py`가 JSON 소스에서 README와 CHANGELOG를 생성합니다.

******

### 링크

******

- AutoJs6 프로젝트: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui 공식 프로젝트: https://github.com/ocornut/imgui
