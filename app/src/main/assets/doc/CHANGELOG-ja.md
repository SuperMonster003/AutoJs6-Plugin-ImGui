******

### リリース履歴

******

# v1.16.0

###### 2026/10/31

* `機能` session.capture(options) はウィンドウの画像を取得し, images モジュールで使える画像を返します. 例: images.save(session.capture(), path). options.region でウィンドウの一部を dp で指定できます. 特権モードのウィンドウは 2 フレームの間でのみ取得できます. 例: setTimeout(fn, 0) の中で呼び出します
* `機能` createWindow({systemCjkFont: true}) はデバイスにあるすべての CJK 文字を表示します. 同梱フォントにない 龘 のような珍しい文字も表示できます. 各文字は最初に使うときに Android が描画するので, 追加メモリはほとんど必要ありません. 同梱フォントの範囲は docs/LIMITS.md を参照してください
* `機能` createWindow({pinchZoom: true}) で, 2 本指のピンチにより文字サイズを 0.5 倍から 3 倍まで変更できます. 2 本指を同じ方向に動かすとこれまで通りスクロールします. 倍率は session.fontScale で読み取り, session.setFontScale(scale) で設定し, 新しい fontScaleChanged イベントで変更を受け取れます. widget-overview の例で確認できます
* `機能` 特権モードのテキスト入力: inputText をタップすると AutoJs6 の小さな入力ボックスとキーボードが開きます (AutoJs6 のオーバーレイ権限が必要です). OK ボタン, キーボードの完了キー, またはほかの場所をタップすると, 文字が入力欄のカーソル位置に入ります. 入力欄の既存の文字はボックスでは編集できません
* `改善` ウィンドウは実行中の表示サイズ (密度) とシステムのフォントサイズの変更に追従するようになりました. 文字とコントロールは新しいサイズになり, ウィンドウの dp サイズは変わりません. configurationChanged に density, oldDensity, fontScale, oldFontScale を追加しました. imgui.launch の全画面ウィンドウは閉じます (session.closeReason は "configuration-changed"). Android がそのウィンドウのある Activity を作り直すためです

# v1.15.0

###### 2026/10/30

* `機能` キーボード照会: isKeyDown / isKeyPressed / isKeyReleased / getKeyPressedAmount / getKeyName / isKeyChordPressed と, ショートカットの shortcut / setNextItemShortcut を追加. キーの組み合わせは ui.Mod.Ctrl | ui.Key.S と書きます. Key 定数はキーボード全体に対応しました: A から Z, Digit0 から Digit9, F1 から F24, テンキーなど
* `機能` クリップボード: getClipboardText / setClipboardText はホストの getClip / setClip と同じ Android クリップボードを使い, 入力欄の Ctrl+C / Ctrl+V も同様です. Android 10 以降, クリップボードを読み取れるのは入力フォーカスを持つアプリだけです. フローティング ウィンドウへの影響は docs/LIMITS.md を参照してください
* `機能` ドラッグ アンド ドロップ: beginDragDropSource / setDragDropPayload / beginDragDropTarget / acceptDragDropPayload とヘルパー withDragDropSource / withDragDropTarget で, 項目を別の項目へドラッグできます (オプションは DragDropFlags). ペイロードは文字列, 数値, または JSON に変換できる任意のオブジェクトで, カラー ウィジェットの色もドラッグできます. サンプル widget-overview の新しいセクションを参照してください
* `機能` カスタム描画: パス関数 (pathLineTo / pathArcTo / pathBezierCubicCurveTo / pathStroke / pathFillConvex など), 描画リストとウィンドウの pushClipRect / popClipRect, 新しい図形 addEllipse, addNgon, addQuad とその塗りつぶし版, addBezierQuadratic, addRectFilledMultiColor, addConvexPolyFilled, addConcavePolyFilled, addImageQuad, addImageRounded を追加. サンプル widget-overview を参照してください
* `機能` タッチのシミュレーション: addMousePosEvent(x, y) と addMouseButtonEvent(button, down) で, スクリプトが指のようにウィンドウを操作できます. UI の自動テストなどに使えます. 座標は getMousePos と同じフレーム内ピクセルで, createWindow の dp ではありません. ウィンドウの下のアプリには影響しません

# v1.14.0

###### 2026/10/30

* `ヒント` 動作の変更: imgui.launch で開いた全画面ウィンドウは, 戻るキーで閉じるようになりました (session.closeReason は "back"). ウィンドウを残すには session.on("back", e) の中で e.preventDefault() を呼びます. フローティングウィンドウ (launchFloaty) は従来どおりです
* `機能` デバッグ用ツールウィンドウ: showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow / showUserGuide (別名 ShowMetricsWindow など) で Dear ImGui 組み込みのツールを表示します. imgui.bool(true) を渡すと閉じるボタンで隠せます. 例 widget-overview に, これらを開く Debug メニューを追加しました
* `機能` テーブルの並べ替え: Sortable フラグ付きのテーブルでは列見出しをタップすると並び順が変わります. tableGetSortSpecs() は並べ替えの列と方向 (imgui.SortDirection) を返し, specsDirty は並び順が変わったフレームだけ true です. tableSetupColumn の 4 番目の引数は列のユーザー id です. dataTable は sortable: true で行を並べ替え, 列の compare 関数で独自の順序を指定できます. 例 data-table-demo を参照してください
* `機能` 複数の値を扱うウィジェット: dragFloat2 / 3 / 4, dragInt2 / 3 / 4, sliderFloat2 / 3 / 4, sliderInt2 / 3 / 4, inputFloat2 / 3 / 4, inputInt2 / 3 / 4, 最小値と最大値を編集する dragFloatRange2 / dragIntRange2, 角度を編集する sliderAngle (ラジアンで保存し度で表示). 値は {value: [x, y, z]}, imgui.floats(...) または新しい imgui.ints(...) で渡します. 例 widget-overview の新しいセクションを参照してください
* `改善` createWindow({debug: true}) のとき, 描画コールバックが 250 ミリ秒を超えると console.warn で所要時間を示し, sleep, ネットワーク, ファイルなどの遅い処理を threads.start へ移すよう提案します (10 秒に最大 1 回). docs/THREADING.md でやり方を説明しています

# v1.13.0

###### 2026/10/30

* `ヒント` 動作の変更: 電池を節約するため, タッチやキー入力が 3 秒ないとウィンドウは毎秒 10 フレームだけ描画し, 画面がオフまたはロック中は描画を止めます. 次にタッチするとすぐに通常のフレームレートに戻ります. アニメーションや入力なしで変わるデータ (タイマー, グラフ, 進捗バー) を表示するウィンドウでは, createWindow に idleFps: 0 を渡すか session.setIdleFps(0) を呼んで通常のフレームレートを保ってください
* `機能` ui.listClipper(itemCount, options, callback) (エイリアス ListClipper) は見えている行だけを描画するため, 10 万行のリストもなめらかにスクロールできます. 新しいサンプル large-list を参照してください
* `機能` フレームレートの制御: createWindow のオプション idleFps / idleDelay, session.setFps / setIdleFps / getFps, セッションイベント idle / active, フィールド idle / paused
* `機能` texture.update(source) はテクスチャの画像を置き換え, ハンドルは変わらないため, それを表示する image の呼び出しはそのままで構いません. サイズが変わると texture.width / height も更新されます. 1 秒に 2 回プレビューを更新する新しいサンプル texture-refresh を参照してください
* `機能` createTexture と texture.update は PNG または JPEG データを含む ArrayBuffer や型付き配列 (Uint8Array など) も受け付けます
* `機能` statsOverlay は各フレームの処理時間 (画面の更新待ちを除いた描画時間) を表示し, snapshot() はそれを workTime として返します
* `改善` docs/FRAME-LOOP.md でフレームレートと省電力の仕組みを, docs/LIMITS.md で listClipper の制限を説明します

# v1.12.0

###### 2026/10/29

* `ヒント` 互換性のない変更: ウィンドウの位置とサイズはすべて dp になりました. createWindow の x / y, Session の x / y / width / height / displayWidth / displayHeight, setPosition / setSize, イベントデータ, フローティングボタンの x / y は以前 px でした. フレーム内の座標は引き続き px です. スクリプトの直し方は docs/MIGRATION-1.12.md を参照してください
* `ヒント` 互換性のない変更: 引数が不正なとき (型の誤り, NaN, 数値の文字列, 範囲外の値), 黙って変換や切り詰めをせず, メソッド名と引数名を含む TypeError または RangeError を投げるようになりました. 例: `imgui.sliderFloat: argument "max" must be a finite number`. fps, alpha, fontSize などのウィンドウオプションも同様に検査します
* `ヒント` 互換性のない変更: Session とフローティングボタンのフィールドは読み取り専用になりました (strict モードでは代入すると例外). 代わりに set メソッドを使ってください. FloatingButton.setPosition は source 引数を受け取らなくなり, フローティングボタンの色に数値を渡すと Android の ARGB ではなく, ほかの imgui の色と同じ 0xAABBGGRR (colorU32 の戻り値) として解釈します
* `ヒント` 互換性のない変更: セッションイベント, フローティングボタンのコールバック, ダイアログの結果は Android の UI スレッドではなく, 描画コールバックと同じスクリプトスレッドで実行されます. 詳しくは docs/THREADING.md を参照してください
* `機能` imgui.dp() / imgui.px() (エイリアス Dp / Px) で dp と px を換算でき, imgui.density で 1 dp あたりの px 数を取得できます
* `機能` 色はすべての API でパック済み整数, [r, g, b, a], {r, g, b, a}, "#rrggbbaa" のいずれでも指定できます (textColored / pushStyleColor / setStyleColor / colorButton / tableSetBgColor を含む). r, g, b, a を個別に渡す書き方も引き続き使えます
* `機能` サンプル background-task: ワーカースレッドで重い処理を行い, その間もウィンドウは描画を続けます. 進捗表示とキャンセル付き
* `機能` docs/THREADING.md で各コールバックを実行するスレッドと重い処理をバックグラウンドで行う方法を, docs/MIGRATION-1.12.md でこのバージョンに必要なスクリプトの変更を説明します
* `修正` イベントやフローティングボタンのコールバックが描画コールバックと同時に実行されることがあり, その中で sleep を呼ぶとエラーになる問題
* `修正` imgui.setTheme を呼んでも Session.theme が変わらない問題
* `修正` ウィンドウをドラッグしたときの moved イベントの source が drag ではなく api になる問題
* `改善` サンプルは window.density を掛ける代わりに ui.dp() を使うようになりました
* `改善` TypeScript 宣言にすべてのサイズ, 位置, オプションの単位と範囲を記載し, Session とフローティングボタンのフィールドを readonly にしました
* `改善` 各 GitHub リリースに, ダウンロードした APK を検証するための SHA256SUMS ファイルを添付します

# v1.11.0

###### 2026/10/29

* `ヒント` アクティブなウィンドウセッションに依存するグローバルメソッド (setTouchable / setMoreTouch / setGlobalAlpha / setSecure / collapseWindow / expandWindow / addButtonEx / getComponent) は, アクティブなセッションがないとき `imgui.<メソッド名>: no active session` エラーを投げるようになりました. getComponent は以前 null を返していました
* `ヒント` 描画オプション offset は非推奨になりました. 代わりに valuesOffset を使ってください (offset も引き続き動作します)
* `機能` ウィンドウセッションの error イベント: 描画コールバックまたはイベントコールバックが例外を投げたときに発生し, error, phase (render または event), frame を含みます. error リスナーがあればセッションは描画を続け, ハンドラー内でセッションを閉じることもできます. リスナーがなければ従来どおり render-error で閉じます
* `機能` ウィンドウオプション debug: Dear ImGui のエラー回復とデバッグログを有効にし, Begin / End の対応漏れなどの使い方の誤りを console.warn で知らせ, Metrics と Debug Log ウィンドウを表示します
* `機能` サンプル error-handling: error イベント, debug モード, よくある誤りの調べ方を示します
* `機能` エイリアス文書 docs/ALIASES.md: すべての PascalCase エイリアスと Dear ImGui C++ シグネチャとの違いを一覧にしました
* `修正` plotLines / plotHistogram の valuesOffset と stride オプションが効かない問題
* `改善` 描画コールバックまたはイベントコールバックでエラーが起きると, コンソールにスタックトレース付きで出力し, 同じエラーが続く場合は 1 回だけ出力します
* `改善` README のエイリアス説明を "よく使う API のエイリアス" に改め, 単一セッションモデル (新しいセッションは前のセッションを閉じる) と新しいメンバーの使い方を追記し, ターゲット SDK を 37 に訂正しました

# v1.10.0

###### 2026/10/29

* `ヒント` AutoJs6 6.8.0 以降が必要です (versionCode 5935 以上)
* `修正` TypeScript 宣言で createWindow / launchFloaty / launch / launchPrivileged の描画コールバックの引数が (session) と宣言されていた問題; 実際の呼び出しと同じ (ui, session) に揃え, RenderCallback 型を追加
* `改善` プラグインを有効にするとグローバルオブジェクト imgui としてそのまま使用でき, AutoJs6 が登録してメンバーの初回呼び出し時にプラグインを読み込むため plugins.load は不要になりました; 従来の plugins.load("io.github.supermonster003.autojs6.plugin.imgui") も同じオブジェクトを返します
* `改善` サンプルスクリプト, 使用説明, README, TypeScript 宣言をグローバルオブジェクトの使い方に合わせて更新し, 宣言ファイルは plugins.load のオーバーロードを拡張しなくなりました

# v1.9.4

###### 2026/10/05

* `改善` プラグインセンターのアイコンに Icon Studio で調整したサイズ, 位置, 明暗の図稿と円形背景を適用し, 再生成可能な原稿とパラメーターを保持
* `改善` Android のアプリ情報アイコンに Icon Studio と共通の図案と明暗の背景色を使用し, プラグインセンターの透明な図案と既存のランチャー設定を維持

# v1.9.3

###### 2026/09/19

* `修正` 共有ビルドプラグイン 1.8.3 により, AGP 9.1 での SDK XML v4 解析警告と, JVM 単体テストの組み立て時に APK ネイティブライブラリのアラインメント検証が誤って実行される問題
* `改善` compileSdk と targetSdk を 37 (Android 17) に引き上げ, プラグインの動作は新しいターゲットの影響を受けない

# v1.9.2

###### 2026/09/13

* `修正` プラグインセンターのバージョンと ABI 情報がインストール済み APK と一致
* `修正` バージョン日付は英語の統一形式で表示されます
* `改善` ダウンロード用ファイルの作成前に, リリース APK のバージョン, 署名, バリアントの完全性を検証

# v1.9.1

###### 2026/09/11

* `改善` 64 ビットのネイティブライブラリの 16 KB ページアラインメントをビルド時に検証, manifest 契約の検査と JSON レポートに対応

# v1.9.0

###### 2026/08/30

* `機能` 選択可能な `launchPrivileged` / `WindowMode.Privileged` バックエンドを追加し、`auto`・`shizuku`・`root` の明示的な起動方針と `Session.getBackendInfo()` のライブ診断に対応
* `機能` AutoJs6 の RootMode、`RootUtils` / `ProcessShell`、認可済み `WrappedShizuku` UserService を再利用するリフレクション専用ホストアダプターを追加
* `機能` 認証付き Binder Surface v2 プロトコルを追加: UID 0/2000 の特権子プロセスが SurfaceControl レイヤーを保持し、Surface だけを既存の完全なホストレンダラーへ転送
* `機能` 特権 Type A/Type B `/dev/input` リーダーを通常の有界 ImGui 入力キューへ接続し、非排他的な観測方針と `Passthrough` によるコールバック制御を実装
* `修正` Android 29+ の正式な `IContentProvider.call` オーバーロードを選択し、API 31+ の外部 Provider ランデブーで実際の Broker authority を保持
* `修正` `app_process` 子プロセスを終了可能な Looper に変更し、正常なクリーンアップ時の誤った `Main thread not allowed to quit` を解消
* `修正` Broker の通常バインドを AutoJs6 プラグイン権限で保護し、endpoint 登録を一度だけに制限しつつ UID・所有者・定時間 token・Binder death 検証を維持
* `改善` バックエンド能力と TypeScript を schema v2 へ更新し、ホスト Root/Shizuku 状態、Binder 転送、256-bit token 境界、レンダラー位置、direct-input 方針を公開
* `改善` API 28 Magisk root と API 31 Shizuku 13.5 の実際の AutoJs6 ホスト経路で、UID 0/2000 レイヤー、既存 JS API 描画、Type A/Type B 入力検出、スクリーンショット、残留なし終了を検証

# v1.8.0

###### 2026/08/30

* `機能` ウィンドウ/フローティングボタン用 `moreTouch` とセッション/グローバル `setMoreTouch` を追加し、`FLAG_SPLIT_TOUCH` を一貫して制御
* `機能` `BackendStatus` と `getBackendCapabilities` を追加し、本番ウィンドウ、split-touch、特権プロセス、direct input、Docking、Multi-Viewport の状態を型付きで公開
* `機能` 独立 `app_process` による実験的な特権レンダリング垂直スライスを実装: SurfaceControl レイヤー → Surface → EGL ES 3 → Dear ImGui、256-bit token 認証のローカル socket フレームプロトコルに対応
* `機能` `/dev/input` の 16/24-byte デコード、Type A/Type B マルチタッチ追跡、回転座標変換、フレーム先頭で消費する有界入力キューを実装
* `修正` Activity/overlay の split-touch フラグを実行時に変更可能にし、終了時にホストの元フラグを確実に復元、既存ボタンも同期
* `修正` 特権プロトコルは不正な magic/version、過大・切断 payload、未認証クライアントを拒否し、timeout/切断/終了後に input、EGL、SurfaceControl、プロセスを清掃
* `改善` API 28 root 実機で UID 2000 → UID 0 socket フレーム、独立 ImGui レイヤー、`/dev/input/event6` の down/move/up を検証し、API 28/35 実機でも connected テスト 3 件を通過
* `改善` 特権バックエンドおよび Docking/Multi-Viewport の設計記録、protocol/evdev 単体テスト、ビルド安全チェックを追加; P6 は明示的に experimental のまま

# v1.7.0

###### 2026/08/30

* `機能` 214 個の呼び出し可能 API、36 定数グループ、セッション、コンポーネント、DrawList、グローバル/プラグイン/モジュール入口を網羅する完全な `types/imgui.d.ts` を公開し、strict TypeScript スモーク契約で検証
* `機能` 内蔵ライブラリを直接実行できる 5 例へ拡張: ウィジェット概要、パラメーターパネル、ログ HUD、データテーブルデモ、テーマギャラリー
* `機能` 実 Surface 上で初期化、フレーム構築、コントロール、描画、PixelCopy の意味的スクリーンショット基準、終了を確認する Android 計装テストを追加
* `機能` GitHub Actions の PR 検証と署名付き `v*` リリース自動化を追加し、署名再検証と APK 成果物公開に対応
* `機能` チェックサム付き Dear ImGui 上流スナップショットと、不変 tag/commit、アーカイブ検証、dry-run、ホワイトリスト展開に対応する安全な更新ツールを追加
* `修正` タッチ、IME、キー、ホイールイベントを有界ロックフリー FIFO キューへ投入しフレーム開始時に消費; ライフサイクル時のキュー交換で遅延イベントが新しいネイティブセッションへ届くことを防止
* `修正` フレームスケジューラを絶対期限補正方式に変更し、処理時間とタイマー待ちの累積ドリフトを抑え、遅延または折りたたみフレーム後に確実にリセット
* `改善` テキスト 64 KiB、選択項目 512 件、入力イベント 2,048 件の `Limits` を公開・強制し、設定可能化の判断と安全上の根拠を文書化
* `改善` ビルド検証を実行時 API、別名、定数、TypeScript 宣言、サンプル、入力キュー不変条件、vendored 上流ファイル全ハッシュの相互照合へ拡張

# v1.6.0

###### 2026/08/30

* `機能` 従来の Java 配列ヘルパーとの互換性を保ちながら、すべてのステートフルウィジェットで軽量な `imgui.ref(value)` と `{ value: ... }` 参照を利用できるようにしました
* `機能` セッション管理の `logWindow` と、レベル色・エクスポート・確実なクリーンアップを備えた積み重ね表示の時限 `toast` 通知を追加しました
* `機能` モーダルを順番に表示する Promise ベースの `alert`、`confirm`、`singleChoice`、`multiChoice` を追加しました
* `機能` しきい値で色分けする `statsOverlay` と、安定した行・CRUD・ツールバー・カスタム描画を備えた選択可能な `dataTable` を追加しました
* `機能` 完全な `widget-overview` サンプルと `listExamples`、`getExampleSource`、`runExample`、ホスト検出用メタデータを同梱しました
* `修正` 保留中のダイアログ Promise が確定的なキャンセル値で解決され、セッション終了時にすべての高レベルコンポーネントが破棄されるようにしました
* `修正` サンプルソースの取得をコントラクトの許可リストに限定し、パストラバーサルを拒否するようにしました
* `修正` 遅延 Surface 復旧プローブを Android の holder コールバックと直列化し、低速端末でのネイティブコンテキスト二重初期化を防止しました
* `改善` `LogLevel` と `ToastPosition` を追加して定数を 35 グループに拡張し、PascalCase エイリアスとソース検証も強化しました
* `改善` 物理 OpenGL ES 3.2 端末で高レベル描画、公開サンプル実行、結果の意味、クリーンアップを検証しました

# v1.5.0

###### 2026/08/30

* `機能` `TouchMode.Touchable` / `Passthrough` / `Auto` を追加しました。Auto は ImGui ルートウィンドウ単位の透明タッチプロキシを作り、空白領域の操作を背後のアプリへ渡します
* `機能` セッションの `collapse` / `expand`、低 FPS ミニバブル、独立してドラッグ可能な `addButtonEx`、実行時の透明度と `FLAG_SECURE` 制御を追加しました
* `機能` `imgui.launch` の Activity 全画面モードと明示的な `launchFloaty` オーバーレイモードを追加し、1 つのレンダラーで複数の `begin` / `withWindow` ルートに対応しました
* `機能` 画面サイズ追跡、`AlwaysAutoResize` による外枠追従、任意の `iniPath` 永続化、セッションイベントを追加しました
* `修正` Surface 破棄時は切り離し、復帰時に再接続することで EGL/ImGui コンテキストと管理テクスチャハンドルを保持するようにしました
* `修正` 自動タッチ透過を Android の公開 API のみで実装し、プロキシを最大 64 個の対話ルートに制限しました
* `改善` JNI を 186 から 190 バインディングへ拡張し、ソース検証を P3 セッションファサードまで広げました
* `改善` 終了時に Activity フラグ、システム UI、オーバーレイ、タッチプロキシ、フローティングボタンを確実に復元または解放します
* `改善` APK Manifest とインストール文書に OpenGL ES 3.0 ハードウェア要件を明記しました

# v1.4.0

###### 2026/08/30

* `機能` セッション管理の `createTexture` を追加し、ファイルパス、エンコード済み `byte[]` / `ByteBuffer`、Android `Bitmap`、ストリーム、AutoJs6 `Image` に対応
* `機能` 原寸・アスペクト比ヘルパー、UV 範囲、色調、背景色に対応した `image` / `imageButton` を追加
* `機能` AutoJs6 の `images.read` とスクリーンショット結果を直接テクスチャ化でき、呼び出し側が所有する画像はリサイクルしない設計に変更
* `機能` ウィンドウ/前景/背景の 3 層 DrawList と、線・矩形・円・三角形・テキスト・ポリライン・3 次ベジェ曲線・画像プリミティブを追加
* `修正` Bitmap アップロードで行ストライドを正しく処理し、Android の乗算済み Alpha を復元して半透明色の暗い縁を解消
* `修正` キュー済み描画データのレンダリング後までテクスチャ破棄を遅延し、期限切れ・破棄済み・別セッションのハンドルを安全に拒否
* `改善` JNI バインディングを 172 から 186 に拡張し、ソース検証をテクスチャと DrawList ファサードにも適用
* `改善` エンコードデータ 128 MiB、3,200 万画素、OpenGL 最大サイズの制限と、セッション内に残る全テクスチャの自動解放を追加

# v1.3.0

###### 2026/08/30

* `機能` `Themes` / `setTheme(name)` に 11 種類の完全なテーマを追加し、Pink、Blue、ModernDark、CyanDusk、OrangeDark、CrystalClear、VibrantNight、PurpleDream を収録
* `機能` 永続的な `setStyleColor` と一括 `setStyleProperties` を追加し、`createWindow` から `theme` / `appearance` / `style`、角丸、境界線、影を直接設定可能に変更
* `機能` `AssetManager` のフォント経路を有効化し、約 9,800 文字の CJK サブセットを内蔵して Noto CJK のない軽量システムを補完
* `機能` `Fonts` / `pushFont` / `popFont` / `withFont` と `createWindow.fonts` を追加し、assets/ファイルフォント、名前付きハンドル、Dear ImGui 1.92 の動的サイズに対応
* `機能` 38 グリフの Material Icons サブセットと `Icons` テーブル、`icon(name, label)` ヘルパーを内蔵
* `修正` テーマ切り替え時に密度スケーリング済みの基準スタイルから確実にリセットし、現在のフォントサイズとグローバルスケールは保持するよう修正
* `改善` JNI バインディングを 167 から 172 に拡張し、テーマ/フォント API 一覧と 2 つのフォント資産の SHA-256 整合性検査を追加
* `改善` 既定フォントと追加フォントへ CJK フォールバックとアイコンを自動マージし、スクリプト側の手動アトラス構築を不要化

# v1.2.0

###### 2026/08/30

* `機能` システム IME 統合: `inputText` / `inputTextMultiline` のフォーカス時にソフトキーボードを自動表示し, 変換中/確定テキストと Backspace/Enter/矢印キーを処理
* `機能` スクリプトから次の入力コントロールへフォーカスして IME に渡せる `setKeyboardFocusHere` を追加
* `機能` 二本指スクロールに `fling` / `flingFriction` / `flingMinVelocity` / `flingMaxVelocity` で設定可能な慣性減衰を追加
* `機能` 一本指の長押しを右クリックとして設定可能にし, `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` を追加
* `修正` ウィンドウ移動, 二本指スクロール, 長押し切替のキャンセル時にアクティブなコントロールを解除し, 意図しないクリックを防止
* `修正` IME プロキシ作成前に SurfaceHolder コールバックを登録し, すでに有効な Surface で描画セッションが未初期化のままになる競合を修正
* `修正` フローティングウィンドウがフォーカスを得た後にソフトキーボード要求を再試行し, Android が IME ビューを serve する前の要求消失を防止
* `修正` 起動ドキュメントを修正し, 既定では `plugins.load` を使用し, ホストの自動マウントは AutoJs6 の任意設定として説明
* `改善` `verifyImGuiSource` を JNI → Java 接続層 → JavaScript ファサードの三層ラッパーカバレッジ検証へ拡張
* `改善` IME の変換中文字列は以前のプレエディットを置換して同期するため, スクリプト側で候補処理を管理する必要なし

# v1.1.0

###### 2026/08/30

* `機能` テーブル API ファミリー: `withTable`/`beginTable`/`tableNextRow`/`tableNextColumn`/`tableSetupColumn`/`tableSetupScrollFreeze`/`tableHeadersRow`/`tableSetBgColor`. 罫線/行の縞模様/行と列の固定/背景色に対応
* `機能` ポップアップとメニュー: `openPopup`/`withPopup`/`withPopupModal`/`closeCurrentPopup`/`isPopupOpen`/`withMenuBar`/`withMenu`/`menuItem`
* `機能` ツールチップ: `setTooltip`/`setItemTooltip`/`withTooltip`/`withItemTooltip`
* `機能` モバイルスタイルの `toggle` スイッチコントロール (`toggleSwitch` および `ToggleSwitch` エイリアス付き)
* `機能` さらに多くのコントロールとテキスト項目: `separatorText`/`bullet`/`bulletText`/`labelText`/`textDisabled`/`arrowButton`/`invisibleButton`/`inputInt`/`inputFloat`/`inputTextMultiline`/`listBox`/`withListBox`/`colorPicker3`/`colorPicker4`/`colorButton`/`plotLines`/`plotHistogram`/`treeNodeEx`/`vSliderFloat`/`vSliderInt`/`withCombo`
* `機能` スタイルスタックと構造 API: `pushStyleColor`/`popStyleColor`/`pushStyleVar`/`popStyleVar`/`setWindowFontScale`/`pushId`/`withId`/`withGroup`/`withDisabled`/`indent`/`unindent`/`alignTextToFramePadding`
* `機能` スクロールファミリー: `getScrollX/Y`/`getScrollMaxX/Y`/`setScrollX/Y`/`setScrollHereX/Y`
* `機能` 状態クエリ: `isItemActive`/`isItemEdited`/`isItemDeactivatedAfterEdit`/`isItemFocused`/`isWindowHovered`/`isWindowFocused`/`isWindowCollapsed`/`isMouseDown`/`isMouseClicked`/`isMouseDragging`/`getMousePos`/`getMouseDragDelta`/`calcTextSize`/`getFrameHeight`/`framerate` など
* `機能` 入力プリミティブ: `addInputCharacters`/`addKeyEvent`/`sendKey`/`addMouseWheel`/`wantTextInput`. 今後の IME サポートに向けたイベントチャネルを整備
* `機能` 二本指の縦スワイプでウィンドウコンテンツをスクロールし, 一本指のウィンドウドラッグと自動的に区別
* `機能` 定数テーブルを 24 グループに拡張し, `ChildFlags`/`ComboFlags`/`PopupFlags`/`HoveredFlags`/`FocusedFlags`/`ColorEditFlags`/`TableFlags`/`TableColumnFlags`/`TableRowFlags`/`TableBgTarget`/`Col`/`StyleVar`/`Dir`/`Key`/`ButtonFlags` を新規追加
* `修正` ネイティブコンテキスト上のタッチスレッドとレンダースレッドの競合を修正し, インタラクションクエリがフレーム終了時のスナップショットを読み取るように変更
* `修正` `WantCaptureMouse` および `StyleColorsDark`/`StyleColorsLight`/`StyleColorsClassic` の欠落していた PascalCase エイリアスを追加
* `改善` ドキュメントとサンプルがホスト常駐のグローバルオブジェクトの仕組みを説明するようになり, `plugins.load` の呼び出しを提案しないように変更
* `改善` 必要なホストバージョンコードと ABI リストを `ImGuiPluginContract` に一元化し, ビルドスクリプトで解析するように変更
* `改善` すべての新規 API に, 対応する Dear ImGui と一致する PascalCase エイリアスを同梱

# v1.0.0

###### 2026/08/29

* `機能` ホストによりスクリプトエンジンへ自動マウントされるグローバル `imgui` オブジェクト
* `機能` Dear ImGui 1.92.9 で描画し, サイズ/フレームレート/フォント/空白領域のドラッグを設定できる透明なフローティングウィンドウ
* `機能` ウィンドウ/レイアウト/テキスト/入力/選択/カラー/進捗/ツリー/タブ/テーマ/デモの即時モード API
* `機能` 状態を持つコントロール向けの Boolean/整数/浮動小数点/文字列/カラー可変参照
* `機能` プラグイン情報/使用説明/README/CHANGELOG の 10 言語ローカライズ
* `依存関係` プラグイン探索メタデータ向けの Common Plugin API を追加
* `依存関係` Kotlin 標準ライブラリおよび Parcelize ランタイム 2.2.21 を追加
* `依存関係` ビルドツール向けに Apache Commons Compress 1.28.0 および XZ for Java 1.10 を追加
* `依存関係` プラグイン契約テスト向けに JUnit 4.13.2 を追加
