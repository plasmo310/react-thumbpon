# CLAUDE.md

サムネぽん / ThumbPon — テンプレートをベースにサムネイル画像を量産するブラウザ完結型のWebツール。

概要と使い方は [README.md](README.md)、要件は [docs/plan/thumbpon-spec.md](docs/plan/thumbpon-spec.md) を参照。

## コマンド

```bash
npm run dev        # 開発サーバー
npm run typecheck  # tsc --noEmit
npm run build      # 型チェック + 本番ビルド（変更後はこれを通すこと）
```

テストランナーは未導入。純粋関数（`src/lib/geometry.ts`、`src/lib/snap.ts`）は
`npx esbuild <file> --format=esm --outfile=<tmp>.mjs` でトランスパイルして
`node` から呼べば手早く検証できる。

## アーキテクチャの要点

変更前に把握しておくべき前提。

- **キャンバス内部は常に実寸座標（1920×1080 など）**。表示だけ `CanvasSurface` の
  CSS `transform: scale()` で縮小する。ポインタの移動量は必ず `/ scale` して実寸に直す。
  PNG 書き出しは `transform: none` を渡すだけで実寸になる。
- **レイヤーの重なり順は配列順**（index 0 が最背面）。`zIndex` フィールドは無い。
  レイヤーパネルも配列順に上から並べるので、**一覧の下にあるものが前面**。
- **テキストレイヤーは `height` を持たない**（内容に応じて伸びる）。高さが要る箇所
  （選択枠・スナップ）は `[data-layer-id]` の `offsetHeight` から実測する。
- **状態はすべて JSON 化できる値に保つ。** objectURL / Blob / DOM 参照をストアに入れない。
  画像の Blob は IndexedDB、objectURL は `assetStore.ts` 内の Map に置く。
- 状態は**すべて `src/store/editorStore.ts` の Zustand ストア**に集約する。
  レイヤー操作は現在のサムネイルに対して行われる（`patchCurrent` / `patchLayers`）。
- ドラッグ・リサイズ・回転はライブラリを使わず Pointer Events で実装している
  （`lib/pointerDrag.ts` + `lib/geometry.ts`）。ここにライブラリを足さない。

## 注意点

- **`idb-keyval` の `createStore` は 1つのDBに 1つの objectStore しか作れない。**
  同じDB名で2回呼ぶと2つ目は `NotFoundError` になる。そのため `src/lib/db.ts` の
  `kv` ひとつだけを使い、キーの接頭辞（`blob:` `meta:` `font:` `project:`）で用途を分ける。
  新しい保存先が要るときも createStore を追加せず、接頭辞を足すこと。
- **書き出しに含めたくないDOMには `data-export-ignore="true"` を付ける。**
  `exportImage.ts` の filter がこれを除外する（選択枠・スナップガイドが該当）。
- `html-to-image` は初回呼び出しでWebフォントや画像の埋め込みが間に合わないことがあるため、
  `exportImage.ts` では意図的に2回呼んで1回目を捨てている。消さないこと。
- **フォントファイルはプロジェクトファイルに含まれない。** IndexedDB にのみ保存され、
  プロジェクトには `fontFamily` の文字列だけが入る。別環境では代替フォントになる。
- 自動保存（`lib/workspace.ts`）は `ready` が true の間だけ動く。復元中に
  上書き保存されないようにするための仕組みなので、順序を変えないこと。
- スナップは回転していないレイヤー（`rotation === 0`）だけが対象。矩形が合わないため。

## コードスタイル

- シングルクォート、セミコロンなし、2スペースインデント（既存ファイルに合わせる）。
  ユーザーのエディタが Prettier で整形し直すことがあるが、新規コードは既存に揃える。
- コメントは日本語で、**なぜそうしているか**を書く。何をしているかは書かない。
- UI文言は日本語。
- 色は `src/index.css` の `@theme` トークンを使う（`bg-panel` `text-ink-sub` `border-accent` など）。
  ハードコードした 16進数をコンポーネントに書かない。例外はキャンバス内部に直接描く色
  （選択枠・ガイド線）で、これらは Tailwind の外なので定数として先頭に置く。
- 新しい依存は足す前に必要性を確認する。現在の依存は
  react / zustand / idb-keyval / html-to-image / fflate のみ。

## 未実装

Undo / Redo、整列コマンド、グループ化、テキストの影・グロー・グラデーション、
テンプレート機能、一括生成、ローカルフォルダ連携。
