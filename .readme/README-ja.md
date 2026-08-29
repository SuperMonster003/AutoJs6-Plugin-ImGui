<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Dear ImGui でフローティング UI を作成</p>

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

### 言語 (Languages)

******

現在の README.md は次の言語に対応しています:

- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-en.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-fr.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-es.md)
- 日本語 [ja] # 現在
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ru.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ar.md)

******

### 概要

******

ImGui プラグインはスクリプトエンジンで Dear ImGui をグローバル `imgui` オブジェクトとして公開します. 透明なフローティングウィンドウに即時モードのコントロールを描画し, ウィンドウ作成/フレームスケジュール/タッチ入力/ネイティブリソース解放をコンパクトな API にまとめます.

******

### 機能

******

- 自動マウントまたは `plugins.load(packageName)` でグローバル `imgui` オブジェクトを読み込みます.
- サイズ/位置/フレームレート/フォント/空白領域のドラッグを設定できる透明なフローティングウィンドウを作成します.
- ウィンドウ/子領域/タブ/ツリー/テキスト/ボタン/可変入力/セレクター/進捗表示/レイアウト補助/テーマ/Dear ImGui デモウィンドウを提供します.
- 状態を持つコントロール向けに Boolean/整数/浮動小数点/文字列/カラーの可変参照を提供します.
- プラグイン情報/使用説明/README/CHANGELOG を 10 言語にローカライズします.

******

### 使い方

******

プラグインセンターで自動マウントを有効にするか明示的に読み込み, フローティングウィンドウを作成します:

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

可変コントロールは `imgui.bool`/`imgui.int`/`imgui.float`/`imgui.string`/`imgui.floats` で作成した参照を更新します. `width`/`height`/`fontSize` は画面密度に依存しない単位です. 空白領域をドラッグして移動するか, `movable: false` で固定できます.

******

### API 概要

******

lower camel case メソッドは一般的な Dear ImGui 操作に対応し, 慣れたウィジェット呼び出し向けの PascalCase エイリアスも利用できます:

- ライフサイクル: `createWindow`/`closeWindow`/`withWindow`/`withChild`/`withTabBar`/`withTabItem`/`withTreeNode`.
- コントロール: テキスト/ボタン/チェックボックス/ラジオボタン/スライダー/編集フィールド/カラー/進捗/コンボ/選択項目.
- レイアウトと状態: カーソル/幅の各メソッド/`sameLine`/`separator`/`spacing`/項目クエリ/キャプチャクエリ.
- 定数: `Cond`/`WindowFlags`/`InputTextFlags`/`SliderFlags`/`TreeNodeFlags`/`SelectableFlags`/`TabBarFlags`/`TabItemFlags`/`MouseButton`.

******

### リリース履歴

******

# v1.0.0

###### 2026/08/29

* `機能` 自動マウントと `plugins.load` による明示的な読み込みに対応したグローバル `imgui` オブジェクト
* `機能` Dear ImGui 1.92.9 で描画し, サイズ/フレームレート/フォント/空白領域のドラッグを設定できる透明なフローティングウィンドウ
* `機能` ウィンドウ/レイアウト/テキスト/入力/選択/カラー/進捗/ツリー/タブ/テーマ/デモの即時モード API
* `機能` 状態を持つコントロール向けの Boolean/整数/浮動小数点/文字列/カラー可変参照
* `機能` プラグイン情報/使用説明/README/CHANGELOG の 10 言語ローカライズ
* `依存関係` プラグイン探索メタデータ向けの Common Plugin API を追加
* `依存関係` Kotlin 標準ライブラリおよび Parcelize ランタイム 2.2.21 を追加
* `依存関係` ビルドツール向けに Apache Commons Compress 1.28.0 および XZ for Java 1.10 を追加
* `依存関係` プラグイン契約テスト向けに JUnit 4.13.2 を追加

##### その他のリリース履歴

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-ja.md)

******

### ビルド

******

```powershell
.\gradlew.bat :app:assembleDebug
```

CRC32 ダイジェスト付きファイル名の Release ビルド:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

ビルドパラメータは `version.properties` から取得します. 現在の最小 SDK は 24, ターゲット SDK は 36 です.

******

### リソース構成

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
```

`strings.xml` はローカライズされた説明を保持し, `plugin_instruction.md` はホストに表示する使用説明を保持します. `.python/generate_markdown.py` が JSON ソースから README と CHANGELOG を生成します.

******

### リンク

******

- AutoJs6 プロジェクト: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui 公式プロジェクト: https://github.com/ocornut/imgui
