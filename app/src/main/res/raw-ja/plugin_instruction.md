プラグインセンターでプラグインを有効にした後は, グローバルオブジェクト `imgui` を直接使用できます (AutoJs6 6.8.0 以降が必要). `plugins.load` を呼び出す必要はありません.

フローティングウィンドウを開く前に可変参照を作成します:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui コントロール",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("有効", enabled);
            ui.sliderFloat("レベル", level, 0, 1, "%.2f");
            if (ui.button("閉じる", 120, 0)) {
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

`width`, `height`, `fontSize` は画面密度に依存しない単位です. `inputText` にフォーカスすると変換中テキスト対応のシステム IME が自動表示されます. 空白領域のドラッグで移動でき, 二本指の縦スワイプは慣性スクロール, 一本指の長押しは右クリックになります. `movable: false` で移動を無効にできます. システムフォントに必要な文字がない場合は `fontPath` で TTF または OTF ファイルを読み込みます.

`Themes` / `setTheme`、`setStyleProperties`、`Appearance` で外観を設定できます. `createWindow.fonts` は assets またはファイルフォントを `pushFont` / `withFont` 用に読み込み、CJK フォールバックと Material アイコンは自動マージされて `Icons` / `icon(name)` から利用できます.

`createTexture` はパス、エンコード済みバイト列、Android `Bitmap`、`images.read` やスクリーンショットの AutoJs6 `Image` に対応します. `image` / `imageButton` で表示し、不要になったら `dispose()` を呼び出してください. 残ったテクスチャはセッションが自動解放します. `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` は Surface ピクセル座標の線・図形・テキスト・画像プリミティブを提供します.

オーバーレイは既定で `TouchMode.Auto` を使い、ImGui ウィンドウを操作可能に保ちながら空白領域のタッチを透過します。セッションはタッチ/透明度/セキュリティの変更、低 FPS ミニバブルへの折りたたみ、独立した `addButtonEx`、`iniPath` での配置保存、イベント通知に対応します。`imgui.launch(...)` は現在 resumed の AutoJs6 Activity で全画面 Surface を使います。1 つのネイティブセッションに複数の `begin` / `withWindow` ルートを作成でき、新しいセッションは以前のセッションを閉じます。

`setMoreTouch(true)` はメインウィンドウと独立ボタンで Android の split-touch を有効にします。`launchPrivileged(callback, {backend: "auto"})` は本番 SurfaceFlinger モードを明示的に選択し、AutoJs6 の既存 Shizuku/root 認可を再利用するためオーバーレイ権限は不要です。`/dev/input` は観測のみでタッチスクリーンを独占しません。`getBackendCapabilities()` は昇格せずホスト状態を報告します。

テーブル/コンテキストポップアップ/メニュー/ツールチップ/スタイルスタックと 60 以上のコントロールを利用できます. `withTable`, `withPopupModal`, `withContextItem`, `withMenuBar` は begin/end 呼び出しを安全にペアリングします. API の全体像はプロジェクトの README とロードマップを参照してください.

ステートフルコントロールは `imgui.ref(value)` で作る軽量参照や通常の `{ value: ... }` オブジェクトも受け付け、従来の `bool`、`float`、`int`、`string`、カラー配列ヘルパーとの互換性も維持します。セッション管理の `logWindow`、`toast`、Promise ダイアログ、`statsOverlay`、`dataTable` はユーザーコールバックの後に描画され、セッションとともに自動終了します。

5 つの同梱サンプルは `imgui.runExample("widget-overview")`、`"parameter-panel"`、`"log-hud"`、`"data-table-demo"`、`"theme-gallery"` で実行でき、`listExamples` で一覧、`getExampleSource` でソースを確認できます。AutoJs6 6.8 のプラグインセンターには、汎用的なワンクリック実行操作はまだありません。

v1.7 は完全なエディター宣言を `types/imgui.d.ts` に公開します。実行時上限は `imgui.Limits`（テキスト 64 KiB、選択項目 512 件、入力イベント 2,048 件）で確認でき、超過入力は暗黙に切り詰めず拒否されます。
