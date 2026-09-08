# CLAUDE.md

サムネぽん / ThumbPon — テンプレートをベースにサムネイル画像を量産するブラウザ完結型のWebツール。

概要と使い方は [README.md](README.md)、要件は [docs/plan/thumbpon-spec.md](docs/plan/thumbpon-spec.md) を参照。

## コマンド

```bash
npm run dev        # 開発サーバー
npm run typecheck  # tsc --noEmit
npm run build      # 型チェック + 本番ビルド（変更後はこれを通すこと）
```

テストランナーは未導入。純粋関数（`src/lib/core/` 配下）は
`npx esbuild <file> --format=esm --outfile=<tmp>.mjs` でトランスパイルして
`node` から呼べば手早く検証できる。

## ディレクトリ構成

**第1階層＝役割（何に依存してよいか）、第2階層＝関心事（何を扱うか）**の2段で分ける。
依存は `types → lib → store → services → components` の一方向のみ。逆流させない。

```
src/
  App.tsx        main.tsx     アプリの入口
  types/         型と定数。何にも依存しない
  lib/
    core/        純粋関数。DOMもブラウザAPIも触らない（geometry / snap / factory）
    dom/         DOM・ブラウザ操作（pointerDrag / layerRect / dnd / download / notify）
    storage/     IndexedDB 永続化（db / assetRepo / fontRepo）
  store/
    slices/      関心事ごとの状態と操作（thumbnail / layer / asset / font / preset / ui）
    helpers.ts   patchCurrent / patchLayers
    selectors.ts useCurrentThumbnail / useSelectedLayer
  services/      store を使うユーザー操作（workspace / projectFile / exportImage / shortcuts）
  components/    header / thumbnail / layer / asset / properties / canvas / ui
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
  `kv` ひとつだけを使い、キーの接頭辞（`blob:` `meta:` `font:` `project:`）で用途を分ける。
  新しい保存先が要るときも createStore を追加せず、接頭辞を足すこと。
- **書き出しに含めたくないDOMには `data-export-ignore="true"` を付ける。**
  `exportImage.ts` の filter がこれを除外する（選択枠・スナップガイドが該当）。
- `html-to-image` は初回呼び出しでWebフォントや画像の埋め込みが間に合わないことがあるため、
  `exportImage.ts` では意図的に2回呼んで1回目を捨てている。消さないこと。
- **フォントファイルはプロジェクトファイルに含まれない。** IndexedDB にのみ保存され、
  プロジェクトには `fontFamily` の文字列だけが入る。別環境では代替フォントになる。
- 自動保存（`services/workspace.ts`）は `ready` が true の間だけ動く。復元中に
  上書き保存されないようにするための仕組みなので、順序を変えないこと。
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
  react / zustand / idb-keyval / html-to-image / fflate のみ。

## 未実装

Undo / Redo、整列コマンド、グループ化、テキストの影・グロー・グラデーション、
テンプレート機能、一括生成、ローカルフォルダ連携。
