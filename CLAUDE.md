# CLAUDE.md

サムネぽん / ThumbPon — テンプレートをベースにサムネイル画像を量産するブラウザ完結型のWebツール。

概要と使い方は [README.md](README.md)、要件は [docs/plan/thumbpon-spec.md](docs/plan/thumbpon-spec.md) を参照。

## コマンド

```bash
npm run dev        # 開発サーバー
npm run typecheck  # tsc --noEmit（tests/ も対象）
npm run test       # vitest run
npm run build      # 型チェック + 本番ビルド（変更後はこれを通すこと）
```

テストは Vitest でルートの `tests/` に置く。環境は node なので DOM は使えない。
ブラウザAPIに触るモジュール（`fsAccess` など）は `tests/helpers/` の
メモリ実装を `vi.mock` で差し込む。純粋関数は `src/lib/core/` に置いてそのまま呼ぶ。

## ディレクトリ構成

**第1階層＝役割（何に依存してよいか）、第2階層＝関心事（何を扱うか）**の2段で分ける。
依存は `types → lib → store → services → components` の一方向のみ。逆流させない。
図は [docs/uml/](docs/uml/)（`layers.puml` が層の全体像、`package-dependencies.puml` が詳細）。

```
src/
  App.tsx        main.tsx     アプリの入口
  types/         型と定数。何にも依存しない
  lib/
    core/        純粋関数。DOMもブラウザAPIも触らない（geometry / snap / factory / project）
    dom/         DOM・ブラウザ操作（pointerDrag / layerRect / dnd / download / notify）
    storage/     永続化（db / assetRepo / fontRepo / fsAccess）
  store/
    slices/      関心事ごとの状態と操作（thumbnail / layer / asset / font / preset / ui / workspace）
    helpers.ts   patchCurrent / patchLayers
    selectors.ts useCurrentThumbnail / useSelectedLayer
  services/      store を使うユーザー操作
                 workspace（復元と自動保存）/ projectFolder（フォルダ連携）/
                 projectData（store ⇄ project.json）/ projectFile（.thumbpon.zip）/
                 exportImage / shortcuts
  components/    header / thumbnail / layer / asset / properties / canvas / ui
tests/           Vitest。src/ の外に置く
```

新しいファイルの置き場所は上から順に当てはめる。

1. 何も import しない純粋な処理か → `lib/core/`
2. DOM を触るか → `lib/dom/`
3. IndexedDB を触るか → `lib/storage/`
4. store を import するか → `services/`（**`lib/` には絶対に置かない**。循環するため）
5. 画面に出るものか → `components/` の該当する関心事の下

## アーキテクチャの要点

変更前に把握しておくべき前提。

- **キャンバス内部は常に実寸座標（1920×1080 など）**。表示だけ `CanvasSurface` の
  CSS `transform: scale()` で縮小する。ポインタの移動量は必ず `/ scale` して実寸に直す。
  PNG 書き出しは `transform: none` を渡すだけで実寸になる。
- **レイヤーの重なり順は配列順**（index 0 が最背面）。`zIndex` フィールドは無い。
  レイヤーパネルも配列順に上から並べるので、**一覧の下にあるものが前面**。
- **テキストレイヤーは `height` を持たない**（内容に応じて伸びる）。高さが要る箇所
  （選択枠・スナップ）は `[data-layer-id]` の `offsetHeight` から実測する。実測の入口は
  `lib/dom/layerRect.ts` に集約してあるので、DOMを直接引かずこれを使う。
- **状態はすべて JSON 化できる値に保つ。** objectURL / Blob / DOM 参照をストアに入れない。
  画像の Blob は IndexedDB、objectURL は `lib/storage/assetRepo.ts` 内の Map に置く。
- 状態は**すべて `src/store/` の Zustand ストア**に集約する。中身は `slices/` に
  thumbnail / layer / asset / font / preset / ui の6つに分かれているが、実体は1つの
  オブジェクトなので slice をまたいだ更新もできる（素材を消したらそれを使うレイヤーも消す等）。
  レイヤー操作は現在のサムネイルに対して行われる（`helpers.ts` の `patchCurrent` / `patchLayers`）。
  利用側は `import { useEditorStore, useCurrentThumbnail } from '../store'` の1行で足りる。
- ドラッグ・リサイズ・回転はライブラリを使わず Pointer Events で実装している
  （`lib/dom/pointerDrag.ts` + `lib/core/geometry.ts`）。ここにライブラリを足さない。
- **D&Dの種別・エラー通知・ダウンロードは共通化済み**。`lib/dom/` の `dnd.ts`（`DND_TYPE` /
  `hasDragType`）、`notify.ts`（`notifyError`）、`download.ts` を使う。各所に書き直さない。

## 注意点

- **`idb-keyval` の `createStore` は 1つのDBに 1つの objectStore しか作れない。**
  同じDB名で2回呼ぶと2つ目は `NotFoundError` になる。そのため `src/lib/storage/db.ts` の
  `kv` ひとつだけを使い、キーの接頭辞（`blob:` `meta:` `font:` `project:` `handle:`）で用途を分ける。
  新しい保存先が要るときも createStore を追加せず、接頭辞を足すこと。
- **書き出しに含めたくないDOMには `data-export-ignore="true"` を付ける。**
  `exportImage.ts` の filter がこれを除外する（選択枠・スナップガイドが該当）。
- `html-to-image` は初回呼び出しでWebフォントや画像の埋め込みが間に合わないことがあるため、
  `exportImage.ts` では意図的に2回呼んで1回目を捨てている。消さないこと。
- **フォントファイルはプロジェクトに含めない。同梱するとフォントの再配布にあたるため。**
  実体は IndexedDB にのみ保存する。代わりに `project.json` の `fonts` に
  使用フォントのマニフェスト（表示名 / family / local か file か）を持たせ、
  読み込み側で解決できなかったものを `missingFontLabels` に入れて名前で告知する。
  マニフェストの組み立ては `lib/core/project.ts` の `collectUsedFonts` / `findMissingFonts`。
- 自動保存（`services/workspace.ts`）は `ready` が true の間だけ動く。復元中に
  上書き保存されないようにするための仕組みなので、順序を変えないこと。
- **保存先が2つあるので、どちらが正かのルールを崩さない。**
  ローカルフォルダに接続している間は**フォルダが唯一の正本**で、起動時にフォルダを読めたら
  IndexedDB のスナップショットは捨てて上書きする（`restoreWorkspace()` に集約）。
  IndexedDB は「まだフォルダに保存していないもの」の置き場（フォルダ未接続時の作業・
  非対応ブラウザ・明示保存前のクラッシュ復旧）に徹する。
- **フォルダへの書き込みは明示保存のみ**（保存ボタン / Ctrl+S）。自動では書かない。
  外部エディタとの競合と、編集途中の意図しない上書きを避けるため。
- **`.thumbpon.zip` はワークスペースフォルダをそのまま ZIP にしただけ**。形式は1つしかなく、
  入れ物（1ファイルか展開したフォルダか）だけが違う。`buildProjectFile()` を両方から使うこと。
  拡張子を `.zip` で終わらせているのは OS から普通の ZIP として扱えるようにするため。
  読み込み側はフォルダごと圧縮された ZIP（中身が「フォルダ名/」の下にある形）も受け付ける。
- **File System Access API は Chromium 系のみ。** `fsAccess.ts` の
  `canUseFileSystemAccess()` で判定し、非対応ブラウザでは UI を出さない
  （`fontRepo.ts` の `canQueryLocalFonts()` と同じ段階的強化の形）。
  型は lib.dom に無いので、型定義パッケージを足さず `fsAccess.ts` 内にローカル宣言している。
  権限の要求（`requestPermission`）はユーザー操作の中からしか通らないため、
  起動時の自動復元では要求せず `needs-permission` を立てて通知バーに委ねる。
- スナップは回転していないレイヤー（`rotation === 0`）だけが対象。矩形が合わないため。

## コードスタイル

- シングルクォート、セミコロンなし、2スペースインデント（既存ファイルに合わせる）。
  ユーザーのエディタが Prettier で整形し直すことがあるが、新規コードは既存に揃える。
- コメントは日本語で、**なぜそうしているか**を書く。何をしているかは書かない。
- **export する関数・コンポーネントには JSDoc を付け、引数を明記する。** `@param` には
  意味・単位・座標系など、型から読み取れない情報を書く（型が語ることは繰り返さない）。
  コンポーネントの props は `@param props.xxx` の形で書く。
- **命名**: ディレクトリはすべて小文字。コンポーネントは PascalCase（`components/` 配下と
  `src/App.tsx` のみ）。それ以外のモジュールは camelCase。
- UI文言は日本語。
- 色は `src/index.css` の `@theme` トークンを使う（`bg-panel` `text-ink-sub` `border-accent` など）。
  ハードコードした 16進数をコンポーネントに書かない。例外はキャンバス内部に直接描く色
  （選択枠・ガイド線）で、これらは Tailwind の外なので定数として先頭に置く。
- 新しい依存は足す前に必要性を確認する。現在の依存は
  react / zustand / idb-keyval / html-to-image / fflate（開発は vite / tailwind / vitest）のみ。

## 未実装

Undo / Redo、整列コマンド、グループ化、テキストの影・グロー・グラデーション、
テンプレート機能、一括生成。
