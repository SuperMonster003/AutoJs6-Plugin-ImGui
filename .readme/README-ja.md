<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Dear ImGui でフローティング UI を作成</p>

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

ImGui プラグインは [Dear ImGui](https://github.com/ocornut/imgui) 即時モード GUI ライブラリを AutoJs6 に取り込み, 透明なフローティングウィンドウ内で OpenGL ES を用いてコントロールを描画します. デバッグパネル/パラメータチューナー/実行時 HUD などの軽量なフローティングインターフェースに最適で, ウィンドウ作成/フレームスケジュール/タッチ入力/ネイティブリソース解放をひとつのコンパクトな API にまとめています.

最も互換性の高い入口は `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")` です. AutoJs6 6.8 以降ではプラグインセンターの設定からオブジェクト名 `imgui` で自動マウントすることもできます. この設定を有効にした場合に限り, グローバルオブジェクトを直接利用できます.

******

### 機能

******

- 自動タッチ透過、折りたたみ/展開、独立フローティングボタン、透明度/セキュリティ、配置保存、ライフサイクルイベントに対応する適応型オーバーレイおよび Activity 全画面セッション.
- `launchPrivileged` は AutoJs6 管理の Shizuku/root を利用する明示的な本番 SurfaceFlinger モードです。認証 Binder が特権 Surface を既存の完全なレンダラーへ渡し、`/dev/input` が観測型ポインター入力を提供します.
- 安定した `plugins.load` 入口はホスト側のマウント設定なしで動作し, AutoJs6 の任意の自動マウントを有効にすると同じ API がグローバル `imgui` オブジェクトとして公開されます.
- 透明なフローティングウィンドウ: サイズ/位置/フレームレート/フォントを設定でき, 空白領域のドラッグで移動, 二本指で慣性スクロール, 一本指の長押しで右クリックできます.
- `inputText` ファミリーはシステム IME に完全対応し, 変換中テキスト, ソフトキーボードの自動表示/非表示, 一般的な編集キーを扱えます.
- ウィンドウ/タブ/ツリーノード/テーブル/ポップアップ/メニュー/ツールチップのほか, モバイルスタイルの `toggle` スイッチを含む 60 以上の即時モードコントロールを提供します.
- 11 種類の `Themes`、一括スタイル、角丸/境界線/影の外観、複数フォントスタック、CJK フォールバック、Material Icons サブセットを備えます.
- 管理対象テクスチャはファイルパス、エンコード済みバイト列、Android `Bitmap`、AutoJs6 `Image` に対応し、`image` / `imageButton` と 3 層の DrawList で画像表示とカスタム描画を行えます.
- 軽量な `imgui.ref(value)` / `{value: x}` 参照はすべての状態付きコントロールで使用でき、従来の Java 配列参照ヘルパーも完全互換です.
- セッション管理の `logWindow`、積み重ね可能な `toast`、Promise ダイアログ、しきい値色付き `statsOverlay`、選択/CRUD 対応 `dataTable` でデバッグ UI をすぐ構築できます.
- 定数列挙と PascalCase メソッドエイリアスは Dear ImGui のネイティブ命名に従っており, 既存の知識をそのまま活かせます.
- 完全な TypeScript 宣言、実行可能な 5 サンプル、Android 描画計装テスト、ロックフリー入力キュー、検証可能な上流更新ツール、CI リリース自動化を提供します.
- プラグイン情報/使用説明/README/CHANGELOG を 10 言語にローカライズします.

******

### インストール

******

- [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) からデバイスのアーキテクチャに合った APK をダウンロードします. 不明な場合は `universal` パッケージを選択してください.
- APK をインストールして AutoJs6 を開き, プラグイン管理ページで本プラグインが認識され有効になっていることを確認します.
- `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")` でプラグインを読み込み, `imgui.createWindow(...)` を呼び出します. 初回使用時には AutoJs6 にオーバーレイ (フローティングウィンドウ) 権限を付与してください.
- `launchPrivileged` の前に AutoJs6 で通常どおり Root または Shizuku を設定・認可してください. プラグインはそのホスト状態を再利用し、特権モードにオーバーレイ権限は不要です.

ホスト要件: AutoJs6 の versionCode 3853 以降. プラグインは `arm64-v8a`/`armeabi-v7a`/`x86_64`/`x86` のバイナリを同梱し, Android 7.0 (API 24) 以降と OpenGL ES 3.0 対応の GPU/ドライバーが必要です.

******

### クイックスタート

******

プラグインをインストールして有効化したら, API を読み込み, 可変参照を作成してフローティングウィンドウを開きます:

```js
var imgui = plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
var enabled = imgui.ref(true);
var volume = imgui.ref(0.5);
var themeColor = imgui.ref([0.25, 0.55, 0.90]);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(overlay.width, overlay.height, ui.Cond.Always);
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

可変コントロールは `imgui.ref(value)` で作る軽量参照や通常の `{ value: ... }` オブジェクトを受け付け、従来の `imgui.bool`/`imgui.int`/`imgui.float`/`imgui.string`/`imgui.floats` ヘルパーとも互換性があります. `inputText` にフォーカスすると変換中テキスト対応のシステム IME が自動表示されます (`ime: false` で無効化). `width`/`height`/`fontSize` は画面密度に依存しない単位です. 空白領域をドラッグするとウィンドウを移動でき (`movable: false` で固定), 二本指の縦スワイプには設定可能な慣性 (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`) が付き, 一本指の長押しは右クリックを送ります (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). システムフォントが必要な文字をカバーしていない場合は `fontPath` に TTF または OTF フォントファイルを指定してください.

テーマとフォント: `setTheme` は 11 種類の `Themes` を受け取り、`setStyleProperties` は複数の `StyleVar` を一括更新します. `createWindow` には `theme` / `appearance` / `style` / `shadow` も指定できます. `fonts` 配列で assets (`asset://...`) またはファイルフォントを読み込み、`pushFont` / `withFont` で切り替えます. CJK フォールバックとアイコンは自動マージされ、`Icons` / `icon(name)` でアイコングリフを取得できます.

テクスチャとカスタム描画: ウィンドウセッションの準備完了後に `createTexture` を呼び出してください (通常はレンダーコールバック内の初回実行時). 戻り値は `width` / `height` と、冪等な `dispose()` / `close()` を公開します. 残ったテクスチャはセッション終了時に自動解放されます. `image` / `imageButton` でテクスチャを表示し、`getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` で一般的な描画プリミティブを利用できます. DrawList 座標は Surface のピクセル座標です. AutoJs6 の `images.read(...)` やスクリーンショットの `Image` を直接渡せます.

ウィンドウセッション: オーバーレイは既定で `TouchMode.Auto` を使い、ImGui ルートウィンドウを操作可能に保ちながら Surface の空白領域を背後のアプリへ渡します。固定する場合は `Touchable` または `Passthrough` を選択します。セッションは透明度/セキュリティ/タッチモードの変更、低 FPS ミニバブルへの折りたたみ、独立した `addButtonEx`、`AlwaysAutoResize` 追従、`iniPath` による配置保存、`on` / `once` / `off` またはオプションのコールバックによるイベント購読に対応します。`imgui.launch(...)` は現在 resumed の AutoJs6 Activity に全画面 Surface を作り、`launchFloaty(...)` はオーバーレイを明示します。スクリプトエンジンごとのネイティブレンダーセッションは 1 つですが、同じコールバックで任意の数の `begin` / `withWindow` ImGui ルートを作成できます。新しいセッションは以前のセッションを閉じます。

高レベルコンポーネントはアクティブなセッションに接続され、ユーザーの描画コールバック後に描画されます. `logWindow` はレベル色分け、消去、エクスポート、オートスクロール、`toast` は位置指定付き時間通知、`alert` / `confirm` / `singleChoice` / `multiChoice` は Promise、`statsOverlay` はフレーム時間グラフ、`dataTable` は選択と CRUD を提供します. 5 つの内蔵例 (`widget-overview`、`parameter-panel`、`log-hud`、`data-table-demo`、`theme-gallery`) は `listExamples` / `getExampleSource` で確認し、`runExample` で実行できます. AutoJs6 6.8 のプラグインセンターは汎用サンプルメタデータをまだ利用しないため、ホスト対応までは次の呼び出しを直接実行してください:

```js
imgui.runExample("widget-overview");
```

******

### API 概要

******

lower camel case メソッドは同名の Dear ImGui 操作に対応し, ネイティブ命名に慣れたユーザー向けに PascalCase エイリアスも利用できます (例: `ui.Button` は `ui.button` と等価):

- セッションランタイム: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, セッション版を含む `on` / `once` / `off`.
- バックエンドの検出: `getBackendCapabilities` / `BackendStatus` は, ウィンドウ, split-touch, 特権プロセス, direct input, Docking, Multi-Viewport の利用可否と本番運用への対応状況を報告します. 権限昇格は行いません.
- セッションとウィンドウ: `createWindow`/`closeWindow`/`withWindow`/`withChild`/`setNextWindowPos`/`setNextWindowSize`/`setNextWindowBgAlpha` に加え, `isWindowHovered` などのウィンドウ状態クエリ.
- テキストとコントロール: `text`/`textColored`/`textWrapped`/`separatorText`/`bulletText`/`labelText`/`button`/`arrowButton`/`invisibleButton`/`checkbox`/`toggle`/`radioButton`/`sliderFloat`/`sliderInt`/`vSliderFloat`/`dragFloat`/`dragInt`/`inputText`/`inputInt`/`inputFloat`/`inputTextMultiline`/`colorEdit3`/`colorEdit4`/`colorPicker4`/`colorButton`/`progressBar`/`plotLines`/`plotHistogram` など.
- コンテナとナビゲーション: `withTabBar`/`withTabItem`/`withTreeNode`/`treeNodeEx`/`collapsingHeader`/`withTable` テーブルファミリー/`withListBox`/`withCombo`/`selectable`.
- ポップアップとメニュー: `openPopup`/`withPopup`/`withPopupModal`/`beginPopupContextItem`/`beginPopupContextWindow`/`withContextItem`/`withContextWindow`/`closeCurrentPopup`/`withMenuBar`/`withMenu`/`menuItem`/`setTooltip`/`setItemTooltip`/`withItemTooltip`.
- スタイルとレイアウト: `styleColorsDark`/`styleColorsLight`/`styleColorsClassic`/`pushStyleColor`/`pushStyleVar`/`setWindowFontScale`/`withGroup`/`withDisabled`/`withId`/`indent`/`sameLine`/`separator`/`spacing` に加え, カーソルとスクロールのファミリー.
- テクスチャと描画: `createTexture` / `destroyTexture` / `image` / `imageButton` / `colorU32`、および線・矩形・円・三角形・テキスト・ポリライン・ベジェ曲線・画像プリミティブを備えた `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList`.
- クエリと入力: `isItemClicked`/`isItemHovered`/`isItemActive`/`isItemEdited`/`isMouseDown`/`getMousePos`/`calcTextSize`/`framerate` などの状態クエリ, `setKeyboardFocusHere` による能動的フォーカス, 入力プリミティブ `addInputCharacters`/`sendKey`/`addMouseWheel`/`wantTextInput`. 現在公開中の `InputTextFlags` はすべて Dear ImGui に渡されます. コールバック依存フラグは公開せず, `WordWrap` は複数行入力専用です.
- 高レベルコンポーネントと例: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`、および `listExamples` / `getExampleSource` / `runExample`. 各セッションにも同名のファクトリがあります.
- 可変参照: 軽量な `imgui.ref` (または通常の `{value: x}` オブジェクト) と、互換 Java 配列ヘルパー `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.strings`.
- 定数: `BackendStatus` / `Cond`/`WindowFlags`/`ChildFlags`/`InputTextFlags`/`SliderFlags`/`TreeNodeFlags`/`SelectableFlags`/`TabBarFlags`/`TabItemFlags`/`ComboFlags`/`PopupFlags`/`HoveredFlags`/`FocusedFlags`/`ColorEditFlags`/`TableFlags`/`TableColumnFlags`/`TableRowFlags`/`TableBgTarget`/`Col`/`StyleVar`/`Themes`/`Appearance`/`Fonts`/`Icons`/`Dir`/`Key`/`MouseButton`/`ButtonFlags`/`TextureFlags`/`DrawListLayer`/`DrawFlags`/`LogLevel`/`ToastPosition`/`Limits`. Dear ImGui の列挙またはプラグインの同名テーブルに対応します.

******

### 既知の制限

******

- 各スクリプトエンジンが同時に持てるネイティブレンダーセッションは 1 つです。複数パネルはそのセッション内に複数の ImGui ルートウィンドウとして作成してください。新しいオーバーレイまたは Activity セッションは以前のセッションを閉じます。
- `imgui.launch` には現在 resumed の AutoJs6 Activity が必要です。フォアグラウンドのホスト Activity なしで描画を続ける場合は `launchFloaty` を使います。
- v1.9 の特権モードは固定全画面かつポインター専用で、IME/キー入力、ホストレイヤーの透明度/セキュリティ、折りたたみ、補助 Android ボタン、回転時の動的再構築には未対応です。直接入力は `EVIOCGRAB` を使わず、OEM の SurfaceControl/SELinux 方針で起動できない場合があります。能力検査は `su` 実行や Shizuku 許可要求を行いません。

******

### リリース履歴

******

#### v1.9.4

###### 2026/10/05

* `改善` プラグインセンターのアイコンに Icon Studio で調整したサイズ, 位置, 明暗の図稿と円形背景を適用し, 再生成可能な原稿とパラメーターを保持
* `改善` Android のアプリ情報アイコンに Icon Studio と共通の図案と明暗の背景色を使用し, プラグインセンターの透明な図案と既存のランチャー設定を維持

#### v1.9.3

###### 2026/09/19

* `修正` 共有ビルドプラグイン 1.8.3 により, AGP 9.1 での SDK XML v4 解析警告と, JVM 単体テストの組み立て時に APK ネイティブライブラリのアラインメント検証が誤って実行される問題
* `改善` compileSdk と targetSdk を 37 (Android 17) に引き上げ, プラグインの動作は新しいターゲットの影響を受けない

#### v1.9.2

###### 2026/09/13

* `修正` プラグインセンターのバージョンと ABI 情報がインストール済み APK と一致
* `修正` バージョン日付は英語の統一形式で表示されます
* `改善` ダウンロード用ファイルの作成前に, リリース APK のバージョン, 署名, バリアントの完全性を検証

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

ネイティブソースインベントリ/JNI 宣言の整合性/単体テスト/ABI 分割の完全性を検証:

```powershell
.\gradlew.bat :app:verifyImGuiDebugApks
```

ビルドパラメータは `version.properties` から取得します. 現在の最小 SDK は 24, ターゲット SDK は 36 です.

******

### プロジェクト構成

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

`index.js` はスクリプトエンジン側の `imgui` モジュールで, `ImGuiBridge.cpp` は Dear ImGui への JNI ブリッジです. `strings.xml` はローカライズされたプラグイン説明を, `plugin_instruction.md` はホストに表示される使用説明を含みます. README と CHANGELOG は `.python/generate_markdown.py` が JSON ソースから生成するため, 生成物ではなく JSON ソースを編集してください.

******

### リンク

******

- AutoJs6 プロジェクト: https://github.com/SuperMonster003/AutoJs6
- Dear ImGui 公式プロジェクト: https://github.com/ocornut/imgui
- 機能拡張ロードマップ (Roadmap): https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)
