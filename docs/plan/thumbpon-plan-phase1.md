# サムネぽん / ThumbPon — Phase 1 MVP 実装計画

対象仕様: [thumbpon-spec.md](./thumbpon-spec.md)

## 目的とスコープ

仕様書の **Phase 1 (MVP)** ＝ ブラウザだけで完結し、画像とテキストを配置して PNG を書き出せる状態までを実装する。
Template / Project 保存（Phase 2）、Undo/Redo・Effects・Alignment（Phase 3）は対象外だが、後から載せやすいデータ構造にしておく。

### 決定事項

| 項目 | 決定 |
|---|---|
| スコープ | Phase 1 MVP のみ |
| ドラッグ / リサイズ / 回転 | 自作（Pointer Events）。ライブラリなし |
| 素材画像 | Blob URL 表示 + IndexedDB(Blob) 永続化 |

## 技術構成

- Vite + React + TypeScript
- Tailwind CSS v4（`@tailwindcss/vite`。設定ファイル不要、`@theme` でカラートークン定義）
- Zustand（単一の editor store）
- `idb-keyval`（素材 Blob の IndexedDB 保存）
- `html-to-image`（PNG 書き出し）

依存はこの4つのみに留める。

## ディレクトリ構成

```
src/
  main.tsx / App.tsx
  index.css                 -- Tailwind + @theme カラートークン
  types/editor.ts           -- Layer / Canvas / Background / Asset 型
  store/editorStore.ts      -- Zustand store
  lib/
    assetStore.ts           -- IndexedDB(idb-keyval) + objectURL キャッシュ
    geometry.ts             -- 画面↔キャンバス座標変換、リサイズ/回転の計算
    exportImage.ts          -- html-to-image による PNG 書き出し
  components/
    Header.tsx / LayerPanel.tsx / AssetPanel.tsx / PropertiesPanel.tsx
    canvas/
      CanvasStage.tsx       -- グレー領域。スケール算出（ResizeObserver）
      CanvasSurface.tsx     -- 実寸 1920x1080 の div。背景 + レイヤー描画
      LayerView.tsx         -- image / text の描画
      SelectionOverlay.tsx  -- 選択枠・8リサイズハンドル・回転ハンドル
    ui/                     -- Button, NumberField など小物
```

## データモデル

- **重なり順は配列順で表現する**（index 0 = 最背面）。`zIndex` フィールドは持たない。
  レイヤーパネルは配列を reverse して上から表示する。
- **テキストレイヤーは `height` を持たず auto**。サイドハンドルで `width`、コーナーハンドルで `fontSize` を比例スケール。
- Background は type を切り替えても各設定が消えないよう、全フィールドを持つ単一オブジェクトにする。
- Asset のメタ情報は store に、Blob 実体は IndexedDB に。objectURL はメモリ Map で保持し state には入れない。
- state はすべて JSON 可能な値に保つ（Phase 2 のシリアライズ / Phase 3 の Undo/Redo をそのまま載せられる形）。

## 実装ステップ

1. **足場** — Vite + React + TS、Tailwind v4、`index.css` に仕様書のカラーを `@theme` トークン化
   （`--color-app:#F5F6F8` / `panel:#FFFFFF` / `line:#E3E6EA` / `ink:#25282D` / `ink-sub:#7A8088` /
   `accent:#FF8A5B` / `accent-hover:#FF7440` / `accent-soft:#FFF1EB` / `stage:#E5E7EA`）
2. **アプリシェル** — Header（プリセット select / PNG書き出し）＋ 左パネル(上:レイヤー / 下:素材) + 右キャンバス
3. **型 + store** — 上記データモデルと actions
4. **キャンバス描画** — `CanvasStage` が ResizeObserver でスケール算出、`CanvasSurface` は実寸 + `transform: scale()`。
   内部は常に実寸座標なので座標計算とエクスポートが単純になる
5. **操作** — Pointer Events + `setPointerCapture`。移動量を `/ scale` してキャンバス座標へ変換
   - ドラッグ: Shift で軸ロック
   - リサイズ: 8ハンドル。移動量をレイヤー回転の逆回転でローカル空間へ変換 → 対角アンカー固定で w/h と x/y を更新。Shift でアスペクト維持
   - 回転: `atan2`。Shift で15°スナップ
   - キーボード: Delete / 矢印1px / Shift+矢印10px
6. **レイヤーパネル** — reverse 表示、種別アイコン + 表示切替 + ロック + 複製 + 削除、並び替えは上/下ボタン。
   最下部に固定の `[BG] 背景` 行を置き、選択すると背景設定を表示する
7. **素材パネル + IndexedDB** — file input とドロップで追加、起動時に Blob を読んで objectURL 化。
   クリックでキャンバス中央に配置、キャンバスへのドロップでその位置に配置
8. **プロパティ** — 常設の大パネルは作らず、レイヤー一覧の選択行の直下にインライン展開する
9. **PNG 書き出し** — `toPng(surface, { width, height, style:{ transform:'none' } })` で実寸出力。
   選択枠は `data-export-ignore` + `filter` で除外

## 対象外（今回やらないこと）

Template / Project の保存・読込、zip Import/Export、Local Folder Mode、Undo/Redo、
テキストエフェクト（縁取り/影/グロー）、整列・スマートガイド、グループ、バッチ生成、
ローカルフォント読み込み、カスタムキャンバスサイズ。

## 検証手順

1. `npm run dev` で起動して手動確認
   - プリセット切替（1920×1080 ⇄ 800×600）でキャンバスが正しくフィットする
   - 素材追加 → 配置 → 移動 / リサイズ / 回転 が**表示倍率に関わらず**ポインタに追従する（ウィンドウ幅を変えて再確認）
   - テキストの内容・サイズ・色・揃えの変更が反映される
   - レイヤーの並び替え / 表示切替 / ロック / 複製 / 削除
   - リロード後も素材が残っている（IndexedDB）
2. PNG 書き出し → 画面表示と一致するか / 実寸か / フォントと画像が欠けていないかを目視確認
3. `npm run typecheck` と `npm run build` が通ること
