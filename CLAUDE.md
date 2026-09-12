# CLAUDE.md

サムネぽん / ThumbPon — テンプレートをベースにサムネイル画像を量産するブラウザ完結型のWebツール。

概要と使い方は [README.md](README.md)、要件は [docs/plan/thumbpon-spec.md](docs/plan/thumbpon-spec.md)、
**コーディング規約は [docs/instructions/code_guide.md](docs/instructions/code_guide.md)** を参照。

## コマンド

```bash
npm run dev        # 開発サーバー
npm run typecheck  # tsc --noEmit（tests/ も対象）
npm run test       # vitest run（層と feature の境界も検証する）
npm run format     # prettier --write .
npm run build      # 型チェック + 本番ビルド（変更後はこれを通すこと）
```

テストは Vitest でルートの `tests/` に置く。環境は node なので DOM は使えない。
ブラウザAPIに触るモジュール（`fsAccess` など）は `tests/helpers/` の
メモリ実装を `vi.mock` で差し込む。純粋関数は `src/domain/` に置いてそのまま呼ぶ。

## ディレクトリ構成

**詳しい決まりごとは [docs/instructions/code_guide.md](docs/instructions/code_guide.md) を読むこと。**
ここには要点だけ置く。

**1機能＝1ディレクトリ**（Feature-based + Colocation）。依存は次の一方向のみで、
加えて **features 同士は import しない**。

```
domain  →  shared  →  app/store  →  features  →  app
```

```
src/
  styles.css       トークンとリセット（唯一のグローバルCSS）
  app/             main / App / shortcuts / LayerMenu / panelLayout /
                   store（Zustand と8つの slice）
  domain/          UIに依存しない型と純粋な計算。entity ごとに分ける
                   id / asset / font / effects / crop / background / layer /
                   thumbnail / preset / project / geometry
  features/        thumbnail / layer / canvas / asset / project
                   中は components / hooks / lib の3分類まで（無い種類は作らない）
                   types.ts / styles.module.css / index.ts は feature 直下
  shared/
    ui/            汎用UI部品 + styles.module.css
    lib/           DOMの小物とフック（storage/ に IndexedDB と File System Access）
tests/             Vitest。src/ の外に置く
```

`features/<x>/index.ts` が各 feature の公開面。App はここだけを見る。

**この境界は `tests/architecture.test.ts` が検証している。** 層の逆流、feature 同士の
import、使われていない export はテストで落ちるので、散文の約束に頼らなくてよい。

### 判断に迷ったとき

- **UI 部品を shared に出すか** → 「別の React アプリに持っていっても意味が通るか？」
  YES なら `shared/ui/`、NO なら feature 側（`EffectsSection` と `PresetRow` は feature 側）
- **道具を shared に出すか** → 1つの feature からしか使わないなら、その feature に置く
  （`snap.ts` `layerRect.ts` は canvas、`download.ts` は project）
- **feature を分けるか** → 分けると feature 同士の import が生えるなら分けない

### feature に分けなかったもの

- **背景はレイヤーの中**。画面上それはレイヤー一覧の一番上の行で、
  `LayerPanel` が `BackgroundProperties` を直接埋めている
- **フォントの UI も layer**。テキストのプロパティ欄にしか出ない
- **`shortcuts.ts` は app**。Ctrl+S（project）と Delete/矢印（layer）の両方を扱う
- **右クリックメニュー（`app/LayerMenu.tsx`）も app**。レイヤー一覧（layer）とキャンバス
  （canvas）の両方から同じメニューを出すため、どちらの feature にも置けない。
  各 feature は `openLayerMenu(id, clientX, clientY)` でストアに伝えるだけで、
  App が `<LayerMenu />` を1つだけ描く

### ストアは feature に分けない（意図的）

8つの slice は**1つのオブジェクトを意図的に共有**していて、互いの state を書く
（サムネイルを切り替えたらレイヤーの選択を外す、素材を消したらそれを使うレイヤーも消す等）。
単一のドキュメントを全機能で編集するエディタとして正しい形なので壊さない。
slice を feature 側に置くと `app/store` が `features/*` を import して確実に循環する。

**slice は「操作のまとまり」であって「状態の所有単位」ではない。**

## アーキテクチャの要点

変更前に把握しておくべき前提。

- **キャンバス内部は常に実寸座標（1920×1080 など）**。表示だけ `CanvasSurface` の
  CSS `transform: scale()` で縮小する。ポインタの移動量は必ず `/ scale` して実寸に直す。
  PNG 書き出しは `transform: none` を渡すだけで実寸になる。
- **レイヤーの重なり順は配列順**（index 0 が最背面）。`zIndex` フィールドは無い。
  レイヤーパネルも配列順に上から並べるので、**一覧の下にあるものが前面**。
- **画像のクロップは各辺から切り落とす割合**（0..1）で持つ（`domain/crop.ts`）。素材の実寸に
  依存しないのでレイヤーを拡大縮小しても崩れない。描画は画像側を `%` で広げてずらし、
  レイヤーの枠を `overflow: hidden` で切るだけ（CSS だけなので書き出しでも劣化しない）。
  端を掴んだクロップ（`cropByHandle`）は**枠とクロップを同時に動かす**。枠だけ縮めると
  中身が伸びてしまい、トリミングにならないため。
- **画像の左右反転は「中身の層」に掛ける**（`imageFrameStyle`）。レイヤー自体に
  `scaleX(-1)` を掛けるとエフェクト（影・光彩）の向きまで反転してしまうため、
  枠いっぱいの層を1つ挟んでそこで反転させる。クロップ後の見た目がそのまま鏡像になる。
- **テキストレイヤーは `height` を持たない**（内容に応じて伸びる）。高さが要る箇所
  （選択枠・スナップ）は `[data-layer-id]` の `offsetHeight` から実測する。実測の入口は
  `features/canvas/layerRect.ts` に集約してあるので、DOMを直接引かずこれを使う。
- **状態はすべて JSON 化できる値に保つ。** objectURL / Blob / DOM 参照をストアに入れない。
  画像の Blob は IndexedDB、objectURL は `shared/lib/storage/assetRepo.ts` 内の Map に置く。
- 状態は**すべて `src/app/store/` の Zustand ストア**に集約する（上の「ストアは feature に
  分けない」を参照）。レイヤー操作は現在のサムネイルに対して行われる（`patch.ts` の
  `patchCurrent` / `patchLayers`）。利用側は
  `import { useEditorStore, useCurrentThumbnail } from '@/app/store'` の1行で足りる。
- ドラッグ・リサイズ・回転はライブラリを使わず Pointer Events で実装している
  （`shared/lib/pointerDrag.ts` + `domain/geometry.ts`）。ここにライブラリを足さない。
- **`draggable` は「掴む行」だけに付ける。行全体には付けない。** 行の中に開くプロパティ欄の
  スライダーや入力を掴んだだけで HTML5 のドラッグが始まり、値を変えられなくなるため。
  `LayerRow` / `ThumbnailRow` はどちらも名前の行にだけ `draggable` を付け、
  `onDragOver` / `onDrop`（落とす先）だけを行全体に付けている。
- **繰り返し出てくる定型は `shared/` に共通化済み**。書き直さずにこれらを使う。
  `useDropTarget`（ドロップ受け）/ `useAsyncAction`（busy + try/catch + 通知）/
  `dnd.ts`（`DND_TYPE` / `hasDragType`）/ `notify.ts` / `download.ts` / `cx.ts`、
  UI 側は `Panel` / `Button` / `SliderRow` / `PercentRow` / `InlineName` /
  `useFilePicker` / `ContextMenu`（項目と画面座標を渡すだけの右クリックメニュー）。

## 注意点

- **`idb-keyval` の `createStore` は 1つのDBに 1つの objectStore しか作れない。**
  同じDB名で2回呼ぶと2つ目は `NotFoundError` になる。そのため `src/shared/lib/storage/db.ts` の
  `kv` ひとつだけを使い、キーの接頭辞（`blob:` `meta:` `font:` `project:` `handle:`）で用途を分ける。
  新しい保存先が要るときも createStore を追加せず、接頭辞を足すこと。
- **書き出しに含めたくないDOMには `data-export-ignore="true"` を付ける。**
  `features/project/exportImage.ts` の filter がこれを除外する（選択枠・スナップガイドが該当）。
- `html-to-image` は初回呼び出しでWebフォントや画像の埋め込みが間に合わないことがあるため、
  `exportImage.ts` では意図的に2回呼んで1回目を捨てている。消さないこと。
- **フォントファイルはプロジェクトに含めない。同梱するとフォントの再配布にあたるため。**
  実体は IndexedDB にのみ保存する。代わりにマニフェスト(`*.thumbpon`)の `fonts` に
  使用フォントのマニフェスト（表示名 / family / local か file か）を持たせ、
  読み込み側で解決できなかったものを `missingFontLabels` に入れて名前で告知する。
  マニフェストの組み立ては `domain/project.ts` の `collectUsedFonts` / `findMissingFonts`。
- 自動保存（`features/project/workspace.ts`）は `ready` が true の間だけ動く。復元中に
  上書き保存されないようにするための仕組みなので、順序を変えないこと。
- **保存先が2つあるので、どちらが正かのルールを崩さない。**
  ローカルフォルダに接続している間は**フォルダが唯一の正本**で、起動時にフォルダを読めたら
  IndexedDB のスナップショットは捨てて上書きする（`restoreWorkspace()` に集約）。
  IndexedDB は「まだフォルダに保存していないもの」の置き場（フォルダ未接続時の作業・
  非対応ブラウザ・明示保存前のクラッシュ復旧）に徹する。
- **フォルダへの書き込みは明示保存のみ**（保存ボタン / Ctrl+S）。自動では書かない。
  外部エディタとの競合と、編集途中の意図しない上書きを避けるため。
- **「開く」も「保存」もフォルダ単位**（`projectFolder.ts` の `openProjectFolder` /
  `saveProjectFolder`）。**ファイルピッカーにはしないこと。** 選んだファイルからは親フォルダを
  辿れないので、素材（マニフェストの隣の `assets/`）の許可をもらう2つ目のダイアログが要る。
  一度そう実装して、ダイアログが2回出るのが煩わしいと判断して戻した経緯がある。
  - **「開く」はプロジェクトが無いフォルダを受け付けない。** 開くで新しい作業場所まで
    作れると「保存」と役割が混ざるため。新しい保存先は「保存」から選ぶ。
  - **「保存」は選んだフォルダを読み込まない。** 保存を押したのに今の作業が捨てられるのを
    防ぐため、別のプロジェクトが入っていても確認のうえ今の内容で上書きする。
  - **インポートは読み込み後に `disconnectProjectFolder()` を通す**（`importProjectFile` の中）。
    繋いだままだと次の保存が前のフォルダを別プロジェクトの内容で上書きしてしまう。
- **`.thumbpon.zip` はワークスペースフォルダをそのまま ZIP にしただけ**。形式は1つしかなく、
  入れ物（1ファイルか展開したフォルダか）だけが違う。`buildProjectFile()` を両方から使うこと。
  拡張子を `.zip` で終わらせているのは OS から普通の ZIP として扱えるようにするため。
  読み込み側はフォルダごと圧縮された ZIP（中身が「フォルダ名/」の下にある形）も受け付ける。
- **マニフェストの名前は固定ではない**（`<フォルダ名>.thumbpon`。外からリネームしてよい）。
  探索と命名は `domain/project.ts` の `findManifestName` / `findManifestEntry` /
  `defaultManifestName` に集約し、ZIP とフォルダの両方から同じものを使う。
  保存時は覚えている名前（`workspaceFileName`）を最優先にする。付け直すと同じフォルダに
  マニフェストが2つ並んでしまうため。
- **File System Access API は Chromium 系のみ。** `shared/lib/storage/fsAccess.ts` の
  `canUseFileSystemAccess()` で判定し、非対応ブラウザでは UI を出さない
  （`fontRepo.ts` の `canQueryLocalFonts()` と同じ段階的強化の形）。開く/保存はこれで隠し、
  インポート/エクスポート（生の file input と download）だけはどこでも出す。
  型は lib.dom に無いので、型定義パッケージを足さず `fsAccess.ts` 内にローカル宣言している。
  権限の要求（`requestPermission`）はユーザー操作の中からしか通らないため、
  起動時の自動復元では要求せず `needs-permission` を立てて通知バーに委ねる。
- スナップは回転していないレイヤー（`rotation === 0`）だけが対象。矩形が合わないため。
- **エフェクト（ブラー / シャドウ / 光彩）はレイヤーと背景で共通**。型も CSS への変換も `domain/effects.ts`、UI は `features/layer/EffectsSection`
  （ストアに触らず値と更新関数を props で受ける）。掛ける先が増えてもこの3つを使い回す。CSS の `filter` 1本で描き、影に `box-shadow` ではなく `drop-shadow` を
  使うのは、要素の矩形ではなく中身の形（文字の輪郭・画像の透過・模様の隙間）に沿った影を
  出すため。光彩は drop-shadow 1回だと薄すぎるので同じものを重ねている。
- **背景は「下地色」と「絵柄」の2層に分ける**（`backgroundBaseStyle` / `backgroundArtStyle`）。
  エフェクトは絵柄の層だけに掛ける。サーフェス自体に `filter` を掛けるとレイヤーまで
  一緒にぼけるため。ぼかすと絵柄の縁が透けるので、`effectsBleed()` の分だけ外側に
  はみ出させて `overflow: hidden` で切る。単色の背景は絵柄を持たないので効果は出ない。
- **背景の模様（パターン）は画像を作らず CSS のグラデーションで描く**（`domain/background.ts`）。
  書き出しでも劣化せず、素材の管理も要らないため。**素材を使う敷き詰め（タイル）は
  パターンではなく背景「画像」の敷き方**（`fit: 'tile'`）に置く。タイルは模様の形ではなく
  1枚の画像の敷き方で、cover / contain と同じ軸のため。素材の参照は `assetId` ひとつ。
- **`effects` と `crop` は入れ子フィールドなので浅いマージでは潰れる。** 更新には専用の口
  （レイヤーは `updateLayerEffects` / `updateLayerCrop`、背景は `setBackgroundEffects`）を
  使うこと。`updateLayerCrop` は枠（x/y/width/height）も一緒に渡せるようにしてある。
- **素材のフォルダは「書き出し先のパス」に出る。** `assetPath(meta, folders)` が
  `assets/<フォルダ名>/<id>.<ext>` を返し、ZIP とワークスペースフォルダの両方で同じ形になる。
  フォルダ名はそのままディレクトリ名になるので `sanitizePathName()` を必ず通すこと
  （PNG のファイル名も同じ関数を使う）。
- **保存と復元は「確かめられないもの」を消さない。** 素材ファイルは必ず `<id>.<拡張子>`
  なので、`assetIdFromPath()` で id を引ける。読み込みは書かれていたパス →
  同じ id のファイル → IndexedDB の実体、の順に拾い直す（フォルダ名を OS 側で
  変えられても失わないため）。保存側も、実体を取り出せなかった素材のファイルは
  消さず参照も残す。`applyProjectFile` は素材をまるごと入れ替えるので、
  ここで拾い落とすと実体まで消える。どちらにも無かったものは
  `missingAssetNames` に入れて通知帯で名前を出す（`missingFontLabels` と同じ形）。
- **素材フォルダの保存先はプロジェクトではなく素材と同じ場所**（IndexedDB の `meta:folders`）。
  素材の実体がプロジェクトと独立して溜まるのと同じ扱いにしてある。マニフェストには
  `assetFolders` として書き出し、読み込み時は `normalizeAssets()` で
  無くなったフォルダを指す素材を未分類に落とす。
- **後から増えたフィールドは `domain/project.ts` の `normalizeThumbnails` で補う。**
  `loadProject` が必ず通すので、読み込み後は「必ず在る」前提で書いてよい。

## コードスタイル

- 整形は Prettier に任せる（`npm run format`）。設定は `.prettierrc`
  （シングルクォート / セミコロンなし / 2スペース / 100桁）。
- コメントは日本語で、**なぜそうしているか**を書く。何をしているかは書かない。
- **export する関数・コンポーネントには JSDoc を付け、引数を明記する。** `@param` には
  意味・単位・座標系など、型から読み取れない情報を書く（型が語ることは繰り返さない）。
  コンポーネントの props は `@param props.xxx` の形で書く。
- **命名**: ディレクトリはすべて小文字。コンポーネントは PascalCase（`features/` と
  `shared/ui/` 配下、`src/App.tsx`）。それ以外のモジュールは camelCase。
  CSS Modules のクラス名も camelCase（`styles.panelBody`）。
- UI文言は日本語。
- **スタイルは CSS Modules**（`*.module.css`）。1 feature につき1枚 `styles.module.css` にまとめ、
  `shared/ui` も1枚。値は必ず `src/styles.css` のトークンから取り、
  16進数や px を直接書かない。条件付きの class は `shared/lib/cx.ts` の `cx()` で繋ぐ。
  例外はキャンバス内部（レイヤー・選択枠・ガイド線）で、実寸座標と表示倍率に依存する
  動的な値しかないので style オブジェクトのまま書き、色は定数として先頭に置く。
- 新しい依存は足す前に必要性を確認する。現在の依存は
  react / zustand / idb-keyval / html-to-image / fflate
  （開発は vite / typescript / vitest / prettier）のみ。CSS Modules は Vite 標準。

## 未実装

Undo / Redo、整列コマンド、グループ化、テキストのグラデーション、
テンプレート機能、一括生成。
