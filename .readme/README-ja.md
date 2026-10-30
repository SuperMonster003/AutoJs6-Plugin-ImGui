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

プラグインセンターでプラグインを有効にすると, スクリプトはグローバルオブジェクト `imgui` を直接使用できます (AutoJs6 が登録し, メンバーを初めて呼び出したときにプラグインを読み込みます). `plugins.load` は不要です. AutoJs6 6.8.0 以降が必要です. プラグインが AutoJs6 より新しい場合, AutoJs6 にまだ登録されていない新メンバーはプラグインの読み込み後 (`imgui` のいずれかのメンバーを初めて使ったとき) に `imgui` に現れます. 描画コールバックの `ui` 引数は常にすべてのメンバーを持ちます.

******

### 機能

******

- 自動タッチ透過、折りたたみ/展開、独立フローティングボタン、透明度/セキュリティ、配置保存、ライフサイクルイベントに対応する適応型オーバーレイおよび Activity 全画面セッション.
- `launchPrivileged` は AutoJs6 管理の Shizuku/root を利用する明示的な本番 SurfaceFlinger モードです。認証 Binder が特権 Surface を既存の完全なレンダラーへ渡し、`/dev/input` が観測型ポインター入力を提供します.
- AutoJs6 がグローバル `imgui` オブジェクトとして直接登録するため, プラグインを有効にすれば読み込み手順は不要です. pinyin / mediainfo などの公式プラグインと同じ使い方です.
- 透明なフローティングウィンドウ: サイズ/位置/フレームレート/フォントを設定でき, 空白領域のドラッグで移動, 二本指で慣性スクロール, 一本指の長押しで右クリックできます. 入力が数秒ないとフレームレートを下げて電池を節約し, 画面がオフの間は描画を止めます.
- `inputText` ファミリーはシステム IME に完全対応し, 変換中テキスト, ソフトキーボードの自動表示/非表示, 一般的な編集キーを扱えます.
- ウィンドウ/タブ/ツリーノード/テーブル/ポップアップ/メニュー/ツールチップのほか, モバイルスタイルの `toggle` スイッチを含む 60 以上の即時モードコントロールを提供します.
- 11 種類の `Themes`、一括スタイル、角丸/境界線/影の外観、複数フォントスタック、CJK フォールバック、Material Icons サブセットを備えます.
- 管理対象テクスチャはファイルパス、エンコード済みバイト列、Android `Bitmap`、AutoJs6 `Image` に対応し、`image` / `imageButton` と 3 層の DrawList で画像表示とカスタム描画を行えます.
- `session.capture()` はウィンドウの内容を AutoJs6 の `Image` として返します. `systemCjkFont: true` は同梱フォントにない CJK 文字をシステムに描画させ, `pinchZoom: true` は 2 本指のピンチでフォント倍率を変更します. ウィンドウは表示密度とシステムのフォントサイズの変更にも追従します.
- 軽量な `imgui.ref(value)` / `{value: x}` 参照はすべての状態付きコントロールで使用でき、従来の Java 配列参照ヘルパーも完全互換です.
- セッション管理の `logWindow`、積み重ね可能な `toast`、Promise ダイアログ、しきい値色付き `statsOverlay`、選択/CRUD 対応 `dataTable` でデバッグ UI をすぐ構築できます.
- よく使う API と定数列挙には PascalCase エイリアス (例: `ui.Button`) があり, 引数はプラグインの形式に従います. エイリアス一覧と上流 C++ シグネチャとの違いは [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md) を参照してください.
- 完全な TypeScript 宣言, 実行可能な 9 サンプル, Android 描画計装テスト, ロックフリー入力キュー, 検証可能な上流更新ツール, CI リリース自動化を提供します.
- プラグイン情報/使用説明/README/CHANGELOG を 10 言語にローカライズします.

******

### インストール

******

- [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) からデバイスのアーキテクチャに合った APK をダウンロードします. 不明な場合は `universal` パッケージを選択してください.
- APK をインストールして AutoJs6 を開き, プラグイン管理ページで本プラグインが認識され有効になっていることを確認します.
- スクリプトから `imgui.createWindow(...)` を直接呼び出します. 初回使用時には AutoJs6 にオーバーレイ (フローティングウィンドウ) 権限を付与してください.
- `launchPrivileged` の前に AutoJs6 で通常どおり Root または Shizuku を設定・認可してください. プラグインはそのホスト状態を再利用し、特権モードにオーバーレイ権限は不要です.

ホスト要件: AutoJs6 の versionCode 5935 以降. プラグインは `arm64-v8a`/`armeabi-v7a`/`x86_64`/`x86` のバイナリを同梱し, Android 7.0 (API 24) 以降と OpenGL ES 3.0 対応の GPU/ドライバーが必要です.

******

### クイックスタート

******

プラグインをインストールして有効化したら, 可変参照を作成してフローティングウィンドウを開きます:

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

可変コントロールは `imgui.ref(value)` で作る軽量参照や通常の `{ value: ... }` オブジェクトを受け付け, 従来の `imgui.bool`/`imgui.int`/`imgui.float`/`imgui.string`/`imgui.floats` ヘルパーとも互換性があります. `inputText` にフォーカスすると変換中テキスト対応のシステム IME が自動表示されます (`ime: false` で無効化). ウィンドウのサイズと位置は dp です. `width`, `height`, `x`, `y` オプション, セッションのフィールド, イベントデータのすべてが該当し, `fontSize` も dp です. フレーム内の座標は px なので `ui.dp()` / `ui.px()` で換算します. イベントとボタンのコールバックはスクリプトスレッドで実行されます ([THREADING.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/THREADING.md) を参照). 以前のバージョンからの変更点は [MIGRATION-1.12.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/MIGRATION-1.12.md) にまとめています. 空白領域をドラッグするとウィンドウを移動でき (`movable: false` で固定), 二本指の縦スワイプには設定可能な慣性 (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`) が付き, 一本指の長押しは右クリックを送ります (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). システムフォントが必要な文字をカバーしていない場合は `fontPath` に TTF または OTF フォントファイルを指定してください.

テーマとフォント: `setTheme` は 11 種類の `Themes` を受け取り、`setStyleProperties` は複数の `StyleVar` を一括更新します. `createWindow` には `theme` / `appearance` / `style` / `shadow` も指定できます. `fonts` 配列で assets (`asset://...`) またはファイルフォントを読み込み、`pushFont` / `withFont` で切り替えます. CJK フォールバックとアイコンは自動マージされ、`Icons` / `icon(name)` でアイコングリフを取得できます.

テクスチャとカスタム描画: ウィンドウセッションの準備完了後に `createTexture` を呼び出してください (通常はレンダーコールバック内の初回実行時). 戻り値は `width` / `height`, `update(source)` (ピクセルを置き換え, ハンドルは変わりません. サイズが変わると `width` / `height` も追従します), 冪等な `dispose()` / `close()` を公開します. 残ったテクスチャはセッション終了時に自動解放されます. `image` / `imageButton` でテクスチャを表示し、`getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` で一般的な描画プリミティブを利用できます. DrawList 座標は Surface のピクセル座標です. AutoJs6 の `images.read(...)` やスクリーンショットの `Image`, PNG または JPEG データを含む `ArrayBuffer` や型付き配列を直接渡せます.

ウィンドウセッション: オーバーレイは既定で `TouchMode.Auto` を使い、ImGui ルートウィンドウを操作可能に保ちながら Surface の空白領域を背後のアプリへ渡します。固定する場合は `Touchable` または `Passthrough` を選択します。セッションは透明度/セキュリティ/タッチモードの変更、低 FPS ミニバブルへの折りたたみ、独立した `addButtonEx`、`AlwaysAutoResize` 追従、`iniPath` による配置保存、`on` / `once` / `off` またはオプションのコールバックによるイベント購読に対応します。`imgui.launch(...)` は現在 resumed の AutoJs6 Activity に全画面 Surface を作り、`launchFloaty(...)` はオーバーレイを明示します。スクリプトエンジンごとのネイティブレンダーセッションは 1 つですが、同じコールバックで任意の数の `begin` / `withWindow` ImGui ルートを作成できます。新しいセッションは以前のセッションを閉じます。 描画コールバックやイベントコールバックが例外を投げると, `console.error` にエラーとスタックを出力し (同じエラーが続く場合は 1 回だけ), `error` イベント (`error` / `phase` / `frame`) を発行します. `error` リスナーがない場合, 描画エラーはセッションを閉じます (`closeReason` は `render-error`). リスナーがある場合はそのフレームの残りを飛ばして描画を続けます. オプション `debug: true` は `begin` に対応する `end` がないなどの使い方の誤りを `console.warn` と logcat に報告し, Metrics と Debug Log ウィンドウを表示します. `setTouchable` / `setGlobalAlpha` / `getComponent` などのグローバルメソッドは現在のセッションに作用し, アクティブなセッションがない場合は `imgui.<name>: no active session` を投げます. `imgui.launch` のセッションでは, `back` リスナーが `event.preventDefault()` を呼ばない限り, 戻るキーでセッションが閉じます (`closeReason` は `back`). ソフトキーボードが表示中なら, 戻るキーはまずキーボードを閉じます. オーバーレイは文字入力にフォーカスがある間だけ戻るキーを受け取り, そのときはキーボードを閉じるだけです. `debug: true` では, 描画コールバックが 250 ms を超えると `threads.start` の利用を勧める `console.warn` も出力します (10 秒に最大 1 回).

高レベルコンポーネントはアクティブなセッションに接続され, ユーザーの描画コールバック後に描画されます. `logWindow` はレベル色分け, 消去, エクスポート, オートスクロール, `toast` は位置指定付き時間通知, `alert` / `confirm` / `singleChoice` / `multiChoice` は Promise, `statsOverlay` はフレーム時間グラフと各フレームの処理時間, `dataTable` は選択と CRUD を提供します. 9 つの内蔵例 (`widget-overview` / `parameter-panel` / `log-hud` / `data-table-demo` / `theme-gallery` / `error-handling` / `background-task` / `large-list` / `texture-refresh`) は `listExamples` / `getExampleSource` で確認し, `runExample` で実行できます. AutoJs6 6.8 のプラグインセンターは汎用サンプルメタデータをまだ利用しないため, ホスト対応までは次の呼び出しを直接実行してください:

```js
imgui.runExample("widget-overview");
```

******

### API 概要

******

よく使う API には PascalCase エイリアスもあります (例: `ui.Button` は `ui.button` と等価). エイリアスの引数はプラグインの形式 (可変値は `imgui.ref` など) に従い, 上流 C++ シグネチャと 1 対 1 には対応しません. 一覧と違いは [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md) を参照してください. lower camel case メソッドは同名の Dear ImGui 操作に対応し, 機能別に次のように分類されます:

- セッションランタイム: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, 単位換算の `density` / `dp` / `px`, セッション版を含む `on` / `once` / `off`, コールバックのエラーを伝えるセッションの `error` イベント, デバッグモードを有効にする `debug` オプション, 省電力のための `idleFps` / `idleDelay`, `setFps` / `setIdleFps` / `getFps`, `idle` / `active` イベント.
- バックエンドの検出: `getBackendCapabilities` / `BackendStatus` は, ウィンドウ, split-touch, 特権プロセス, direct input, Docking, Multi-Viewport の利用可否と本番運用への対応状況を報告します. 権限昇格は行いません.
- セッションとウィンドウ: `createWindow`/`closeWindow`/`withWindow`/`withChild`/`setNextWindowPos`/`setNextWindowSize`/`setNextWindowBgAlpha` に加え, `isWindowHovered` などのウィンドウ状態クエリ.
- テキストとコントロール: `text`/`textColored`/`textWrapped`/`separatorText`/`bulletText`/`labelText`/`button`/`arrowButton`/`invisibleButton`/`checkbox`/`toggle`/`radioButton`/`sliderFloat`/`sliderInt`/`vSliderFloat`/`dragFloat`/`dragInt`/`inputText`/`inputInt`/`inputFloat`/`inputTextMultiline`/`colorEdit3`/`colorEdit4`/`colorPicker4`/`colorButton`/`progressBar`/`plotLines`/`plotHistogram` など. 複数の値を扱うウィジェット: `dragFloat2/3/4` / `dragInt2/3/4` / `sliderFloat2/3/4` / `sliderInt2/3/4` / `inputFloat2/3/4` / `inputInt2/3/4` / `dragFloatRange2` / `dragIntRange2` / `sliderAngle`.
- コンテナとナビゲーション: `withTabBar`/`withTabItem`/`withTreeNode`/`treeNodeEx`/`collapsingHeader`/`withTable` テーブルファミリー/`withListBox`/`withCombo`/`selectable`, 長いリスト向けの `listClipper`. テーブルの並べ替え: `tableGetSortSpecs` / `SortDirection` と, `dataTable` の `sortable: true`.
- ポップアップとメニュー: `openPopup`/`withPopup`/`withPopupModal`/`beginPopupContextItem`/`beginPopupContextWindow`/`withContextItem`/`withContextWindow`/`closeCurrentPopup`/`withMenuBar`/`withMenu`/`menuItem`/`setTooltip`/`setItemTooltip`/`withItemTooltip`.
- スタイルとレイアウト: `styleColorsDark`/`styleColorsLight`/`styleColorsClassic`/`pushStyleColor`/`pushStyleVar`/`setWindowFontScale`/`withGroup`/`withDisabled`/`withId`/`indent`/`sameLine`/`separator`/`spacing` に加え, カーソルとスクロールのファミリー.
- テクスチャと描画: `createTexture` / `texture.update` / `destroyTexture` / `image` / `imageButton` / `colorU32`、および線・矩形・円・三角形・テキスト・ポリライン・ベジェ曲線・画像プリミティブを備えた `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList`. パス描画: `pathLineTo` / `pathArcTo` / `pathArcToFast` / `pathBezierCubicCurveTo` / `pathBezierQuadraticCurveTo` / `pathRect` / `pathStroke` / `pathFillConvex` / `pathFillConcave`; 描画リストとウィンドウの `pushClipRect` / `popClipRect`; 追加の図形: `addEllipse` / `addNgon` / `addQuad` / `addBezierQuadratic` / `addRectFilledMultiColor` / `addConvexPolyFilled` / `addConcavePolyFilled` / `addImageQuad` / `addImageRounded`.
- クエリと入力: `isItemClicked`/`isItemHovered`/`isItemActive`/`isItemEdited`/`isMouseDown`/`getMousePos`/`calcTextSize`/`framerate` などの状態クエリ, `setKeyboardFocusHere` による能動的フォーカス, 入力プリミティブ `addInputCharacters`/`sendKey`/`addMouseWheel`/`wantTextInput`. 現在公開中の `InputTextFlags` はすべて Dear ImGui に渡されます. コールバック依存フラグは公開せず, `WordWrap` は複数行入力専用です. キー照会とショートカット: `isKeyDown` / `isKeyPressed` / `isKeyReleased` / `getKeyPressedAmount` / `getKeyName` / `isKeyChordPressed` / `shortcut` / `setNextItemShortcut`, キーの組み合わせは `ui.Mod.Ctrl | ui.Key.S` のように書きます. クリップボード: `getClipboardText` / `setClipboardText`. UI の自動テスト用ポインター注入: `addMousePosEvent` / `addMouseButtonEvent` (`getMousePos` と同じフレーム内ピクセル).
- ドラッグ アンド ドロップ: `withDragDropSource` / `withDragDropTarget`, `beginDragDropSource` / `setDragDropPayload` / `endDragDropSource` / `beginDragDropTarget` / `acceptDragDropPayload` / `endDragDropTarget` / `getDragDropPayload`, および `DragDropFlags`. ペイロードは文字列, 数値, または JSON に変換できる任意のオブジェクトです.
- デバッグツール: `showMetricsWindow` / `showDebugLogWindow` / `showIdStackToolWindow` / `showStyleEditor` / `showAboutWindow` / `showUserGuide` は Dear ImGui 組み込みのツールウィンドウを表示します. それぞれ省略可能な可変 boolean 参照を受け取り, 閉じるボタンで false になります.
- 高レベルコンポーネントと例: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`、および `listExamples` / `getExampleSource` / `runExample`. 各セッションにも同名のファクトリがあります.
- 可変参照: 軽量な `imgui.ref` (または通常の `{value: x}` オブジェクト) と、互換 Java 配列ヘルパー `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.ints` / `imgui.strings`.
- 定数: `BackendStatus` / `Cond`/`WindowFlags`/`ChildFlags`/`InputTextFlags`/`SliderFlags`/`TreeNodeFlags`/`SelectableFlags`/`TabBarFlags`/`TabItemFlags`/`ComboFlags`/`PopupFlags`/`HoveredFlags`/`FocusedFlags`/`ColorEditFlags`/`TableFlags`/`TableColumnFlags`/`TableRowFlags`/`TableBgTarget`/`SortDirection`/`Col`/`StyleVar`/`Themes`/`Appearance`/`Fonts`/`Icons`/`Dir`/`Key`/`Mod`/`InputFlags`/`DragDropFlags`/`MouseButton`/`ButtonFlags`/`TextureFlags`/`DrawListLayer`/`DrawFlags`/`LogLevel`/`ToastPosition`/`Limits`. Dear ImGui の列挙またはプラグインの同名テーブルに対応します.

******

### 既知の制限

******

- 各スクリプトエンジンが同時に持てるネイティブレンダーセッションは 1 つです。複数パネルはそのセッション内に複数の ImGui ルートウィンドウとして作成してください。新しいオーバーレイまたは Activity セッションは以前のセッションを閉じます。
- `imgui.launch` には現在 resumed の AutoJs6 Activity が必要です。フォアグラウンドのホスト Activity なしで描画を続ける場合は `launchFloaty` を使います。
- 特権モードは固定全画面かつポインター専用です. テキスト欄は AutoJs6 の一時入力ボックスを使い (オーバーレイ権限が必要, カーソル位置への追加のみ), キー入力, ホストレイヤーの透明度/セキュリティ、折りたたみ、補助 Android ボタン、回転時の動的再構築には未対応です。直接入力は `EVIOCGRAB` を使わず、OEM の SurfaceControl/SELinux 方針で起動できない場合があります。能力検査は `su` 実行や Shizuku 許可要求を行いません。

******

### リリース履歴

******

#### v1.16.0

###### 2026/10/31

* `機能` session.capture(options) はウィンドウの画像を取得し, images モジュールで使える画像を返します. 例: images.save(session.capture(), path). options.region でウィンドウの一部を dp で指定できます. 特権モードのウィンドウは 2 フレームの間でのみ取得できます. 例: setTimeout(fn, 0) の中で呼び出します
* `機能` createWindow({systemCjkFont: true}) はデバイスにあるすべての CJK 文字を表示します. 同梱フォントにない 龘 のような珍しい文字も表示できます. 各文字は最初に使うときに Android が描画するので, 追加メモリはほとんど必要ありません. 同梱フォントの範囲は docs/LIMITS.md を参照してください
* `機能` createWindow({pinchZoom: true}) で, 2 本指のピンチにより文字サイズを 0.5 倍から 3 倍まで変更できます. 2 本指を同じ方向に動かすとこれまで通りスクロールします. 倍率は session.fontScale で読み取り, session.setFontScale(scale) で設定し, 新しい fontScaleChanged イベントで変更を受け取れます. widget-overview の例で確認できます
* `機能` 特権モードのテキスト入力: inputText をタップすると AutoJs6 の小さな入力ボックスとキーボードが開きます (AutoJs6 のオーバーレイ権限が必要です). OK ボタン, キーボードの完了キー, またはほかの場所をタップすると, 文字が入力欄のカーソル位置に入ります. 入力欄の既存の文字はボックスでは編集できません
* `改善` ウィンドウは実行中の表示サイズ (密度) とシステムのフォントサイズの変更に追従するようになりました. 文字とコントロールは新しいサイズになり, ウィンドウの dp サイズは変わりません. configurationChanged に density, oldDensity, fontScale, oldFontScale を追加しました. imgui.launch の全画面ウィンドウは閉じます (session.closeReason は "configuration-changed"). Android がそのウィンドウのある Activity を作り直すためです

#### v1.15.0

###### 2026/10/30

* `機能` キーボード照会: isKeyDown / isKeyPressed / isKeyReleased / getKeyPressedAmount / getKeyName / isKeyChordPressed と, ショートカットの shortcut / setNextItemShortcut を追加. キーの組み合わせは ui.Mod.Ctrl | ui.Key.S と書きます. Key 定数はキーボード全体に対応しました: A から Z, Digit0 から Digit9, F1 から F24, テンキーなど
* `機能` クリップボード: getClipboardText / setClipboardText はホストの getClip / setClip と同じ Android クリップボードを使い, 入力欄の Ctrl+C / Ctrl+V も同様です. Android 10 以降, クリップボードを読み取れるのは入力フォーカスを持つアプリだけです. フローティング ウィンドウへの影響は docs/LIMITS.md を参照してください
* `機能` ドラッグ アンド ドロップ: beginDragDropSource / setDragDropPayload / beginDragDropTarget / acceptDragDropPayload とヘルパー withDragDropSource / withDragDropTarget で, 項目を別の項目へドラッグできます (オプションは DragDropFlags). ペイロードは文字列, 数値, または JSON に変換できる任意のオブジェクトで, カラー ウィジェットの色もドラッグできます. サンプル widget-overview の新しいセクションを参照してください
* `機能` カスタム描画: パス関数 (pathLineTo / pathArcTo / pathBezierCubicCurveTo / pathStroke / pathFillConvex など), 描画リストとウィンドウの pushClipRect / popClipRect, 新しい図形 addEllipse, addNgon, addQuad とその塗りつぶし版, addBezierQuadratic, addRectFilledMultiColor, addConvexPolyFilled, addConcavePolyFilled, addImageQuad, addImageRounded を追加. サンプル widget-overview を参照してください
* `機能` タッチのシミュレーション: addMousePosEvent(x, y) と addMouseButtonEvent(button, down) で, スクリプトが指のようにウィンドウを操作できます. UI の自動テストなどに使えます. 座標は getMousePos と同じフレーム内ピクセルで, createWindow の dp ではありません. ウィンドウの下のアプリには影響しません

#### v1.14.0

###### 2026/10/30

* `ヒント` 動作の変更: imgui.launch で開いた全画面ウィンドウは, 戻るキーで閉じるようになりました (session.closeReason は "back"). ウィンドウを残すには session.on("back", e) の中で e.preventDefault() を呼びます. フローティングウィンドウ (launchFloaty) は従来どおりです
* `機能` デバッグ用ツールウィンドウ: showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow / showUserGuide (別名 ShowMetricsWindow など) で Dear ImGui 組み込みのツールを表示します. imgui.bool(true) を渡すと閉じるボタンで隠せます. 例 widget-overview に, これらを開く Debug メニューを追加しました
* `機能` テーブルの並べ替え: Sortable フラグ付きのテーブルでは列見出しをタップすると並び順が変わります. tableGetSortSpecs() は並べ替えの列と方向 (imgui.SortDirection) を返し, specsDirty は並び順が変わったフレームだけ true です. tableSetupColumn の 4 番目の引数は列のユーザー id です. dataTable は sortable: true で行を並べ替え, 列の compare 関数で独自の順序を指定できます. 例 data-table-demo を参照してください
* `機能` 複数の値を扱うウィジェット: dragFloat2 / 3 / 4, dragInt2 / 3 / 4, sliderFloat2 / 3 / 4, sliderInt2 / 3 / 4, inputFloat2 / 3 / 4, inputInt2 / 3 / 4, 最小値と最大値を編集する dragFloatRange2 / dragIntRange2, 角度を編集する sliderAngle (ラジアンで保存し度で表示). 値は {value: [x, y, z]}, imgui.floats(...) または新しい imgui.ints(...) で渡します. 例 widget-overview の新しいセクションを参照してください
* `改善` createWindow({debug: true}) のとき, 描画コールバックが 250 ミリ秒を超えると console.warn で所要時間を示し, sleep, ネットワーク, ファイルなどの遅い処理を threads.start へ移すよう提案します (10 秒に最大 1 回). docs/THREADING.md でやり方を説明しています

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

ビルドパラメータは `version.properties` から取得します. 現在の最小 SDK は 24, ターゲット SDK は 37 です.

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
