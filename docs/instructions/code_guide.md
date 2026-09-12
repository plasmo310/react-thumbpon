# サムネぽん / ThumbPon — コーディングガイド

このリポジトリでコードを書くときの決まりごと。
**構成は Feature-based Architecture + Colocation。**
関連するコードはその機能の近くに置き、本当に複数から共有されるものだけを外に出す。

---

## 1. 全体の構成

```
src/
  styles.css           色・余白・文字サイズのトークンとリセット（唯一のグローバルCSS）
  vite-env.d.ts

  app/                 アプリの組み立て。ここだけが全体を知ってよい
    main.tsx           入口（index.html が指す）
    App.tsx            画面のレイアウト
    styles.module.css
    shortcuts.ts       画面全体のキーボード操作
    LayerMenu.tsx      レイヤーの右クリックメニュー（layer と canvas の両方から出す）
    panelLayout.ts     パネル分割サイズの保存（App だけが使う）
    store/             Zustand。8つの slice もここ

  domain/              UIに依存しないドメインモデル・型・ロジック
    id / asset / font / effects / background / layer / thumbnail /
    preset / project / geometry

  features/            画面に出る機能。1機能＝1ディレクトリ
    thumbnail / layer / canvas / asset / project
      components/      React コンポーネント
      hooks/           React フック
      lib/             React に依存しない、その feature 固有のロジック
      types.ts         feature 内で共有する型
      styles.module.css
      index.ts         公開API

  shared/              本当に複数の feature から使うものだけ
    ui/                汎用UI部品 + styles.module.css
    lib/               DOM・ブラウザ操作の小物とフック
      storage/         IndexedDB と File System Access

tests/                 Vitest。src/ の外に置く
```

### 依存の向き

```
domain  →  shared  →  app/store  →  features  →  app
```

**この一方向のみ。加えて features 同士は import しない。** 覚えるルールはこの2行だけ。

| 階層 | 何を置くか | 他を知っているか |
|---|---|---|
| `domain/` | 型・既定値・純粋な計算・CSSへの変換 | 何も知らない（React の型を除く） |
| `shared/` | 複数 feature から使う UI 部品と道具 | domain だけ |
| `app/store/` | アプリ全体の状態と、その更新操作 | domain / shared |
| `features/` | 画面に出る機能 | 上記すべて。**他の feature は知らない** |
| `app/` | feature を並べる | すべて |

`features/<x>/index.ts` が各 feature の公開面。App はここだけを見る。

> **この境界は `tests/architecture.test.ts` が検証している。**
> 層の逆流、feature 同士の import、feature 直下への置きっぱなし、使われていない export は
> `npm run test` で落ちる。
> 散文の約束に頼らないので、迷ったらテストを走らせればよい。

---

## 2. 置き場所の決め方

上から順に当てはめる。

1. 特定の機能の画面か → `features/<機能>/`（**迷ったら、画面のどこに出るかで決める**）
2. 複数の feature から使う UI 部品か → `shared/ui/`
3. 複数の feature から使う道具（DOM操作・小さなフック）か → `shared/lib/`
4. ドキュメントの型・純粋な計算か → `domain/`
5. IndexedDB / File System Access を触るか → `shared/lib/storage/`
6. 状態と、その更新操作か → `app/store/`

### 「shared に出すか」の判断基準

**UI 部品**は「別の React アプリに持っていっても意味が通るか？」で決める。

- YES → `shared/ui/`（`Button` `Panel` `Row` `SliderRow` `Select` `Splitter` など）
- NO → `features/<機能>/`

`EffectsSection` は `Effects` 型に依存するので feature 側、
`PresetRow` は「プリセット」というこのアプリ固有の概念なので feature 側に置いている。
一方 `SliderRow` / `PercentRow` はラベルも値も props で受けるだけなので shared に置く。

**道具**（`shared/lib/`）は使用箇所で決める。**1つの feature からしか使わないなら、その feature に置く。**
`snap.ts` と `layerRect.ts` が `canvas/lib/` に、`download.ts` が `project/lib/` にあるのはこのため。

### feature を分けるか

分けると **feature 同士の import が生えるなら分けない。** 実際に分けなかったもの:

- **背景はレイヤーの中**。画面上、背景はレイヤー一覧の一番上の行で、
  `LayerPanel` が `BackgroundProperties` を直接埋めている
- **フォントの UI も layer**。テキストのプロパティ欄にしか出ない（実体は `shared/lib/storage/fontRepo.ts`）
- **`shortcuts.ts` は app**。Ctrl+S（project）と Delete/矢印（layer）の両方を扱う
- **`LayerMenu.tsx` も app**。レイヤー一覧（layer）とキャンバス（canvas）の両方から
  同じ右クリックメニューを出すので、どちらの feature にも置けない。
  feature 側は「どのレイヤーをどこで右クリックしたか」をストアに伝えるだけにする

`features/project` は project / workspace / export を抱えているが、
今のファイル数なら分けない。肥大化したら `project` / `workspace` / `export` への分割を検討する。

### feature の中の並べ方

役割ごとに **`components` / `hooks` / `lib` の3分類まで**。
`utils/` `helpers/` `services/` のようにこれ以上細分化しない。

| 置くもの | 場所 |
|---|---|
| React コンポーネント | `components/` |
| React フック | `hooks/` |
| React に依存しない feature 固有のロジック | `lib/` |
| feature 内で共有する型 | `types.ts`（feature 直下） |
| feature 全体の CSS | `styles.module.css`（feature 直下） |
| 公開API | `index.ts`（feature 直下） |

**存在しない種類のフォルダは作らない。**
`layer` には `hooks/` も `lib/` も無く、`project` には `hooks/` が無い。

**逆に、ファイル数が少なくてもフラットにはしない。** どの feature を開いても
`components/` を見れば画面、`lib/` を見ればロジックという並びを崩さないため。
`asset` も `thumbnail` もコンポーネントは `components/` に入れる。

```
features/canvas/
  components/   CanvasStage / CanvasSurface / LayerView / SelectionOverlay
  hooks/        useCanvasView / useLayerHeight
  lib/          layerRect / snap
  styles.module.css
  index.ts

features/asset/
  components/   AssetPanel / AssetFolderZone / AssetTile
  hooks/        useAssetImport
  styles.module.css
  index.ts

features/thumbnail/
  components/   ThumbnailPanel / ThumbnailRow / ThumbnailSizeRow / FolderDropZone
  styles.module.css
  index.ts
```

`styles.module.css` と `types.ts` は feature 直下に置くので、
サブフォルダからは `../styles.module.css` / `../types` で参照する。

---

## 3. 命名

| 対象 | 規則 | 例 |
|---|---|---|
| ディレクトリ | すべて小文字 / kebab-case | `features/canvas/` |
| feature 内の分類 | `components` / `hooks` / `lib` のみ | `features/canvas/hooks/` |
| React コンポーネント | `PascalCase.tsx` | `CanvasStage.tsx` |
| フック | `useSomething.ts` | `useCanvasView.ts` |
| ユーティリティ・ロジック | `camelCase.ts` | `projectFolder.ts` |
| feature ローカルの型 | `types.ts` | `features/layer/types.ts` |
| CSS Module | `styles.module.css` | `features/canvas/styles.module.css` |
| 公開面（バレル） | `index.ts` | `features/canvas/index.ts` |

- コンポーネントは **named export**。`export default` は使わない（バレルの口を揃えるため）。
- JSX を含むフックだけは `.tsx` になる（`shared/ui/useFilePicker.tsx`）。TypeScript の制約なので例外とする。

---

## 4. 型の置き場所

**一箇所に集約しない。使う範囲に合わせて置く。**

### domain

複数の feature から参照される、アプリの中心的な型。
**1つの `types.ts` にまとめず、entity ごとのファイルに分ける。**
各ファイルは「型 + 既定値 + ファクトリ + CSSへの変換」を持つので、
レイヤーのことを知りたければ `domain/layer.ts` だけを見ればよい。

```
domain/layer.ts      Layer / TextLayer / TextStyle + createTextLayer + layerStyle
domain/background.ts Background + DEFAULT_BACKGROUND + backgroundArtStyle
domain/effects.ts    Effects + DEFAULT_EFFECTS + effectsFilter
domain/crop.ts       Crop + DEFAULT_CROP + cropImageStyle + cropByHandle
domain/asset.ts      AssetMeta / AssetFolder + createAssetFolder + normalizeAssets
```

### feature ローカル

その feature の中だけで使う型は **feature 直下の** `types.ts` に置く
（`components/` や `lib/` の中には作らない）。
**中身が無いなら作らない**（`features/canvas` には types.ts が無い）。

---

## 5. スタイル

**CSS Modules を使う。Tailwind は使わない。**

- **1 feature につき1枚**、`styles.module.css` にまとめる。
  コンポーネントごとにファイルを作らない。`shared/ui` も1枚。
- 読み込みは必ず `import styles from './styles.module.css'`。
  サブフォルダに分かれている feature では `'../styles.module.css'`。
- クラス名は camelCase（`styles.panelBody`）。
- **値は必ず `src/styles.css` のトークンから取る。** 16進数や px を直接書かない。

```css
.name {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius);
  font-size: var(--font-label);
  color: var(--color-ink-sub);
}
```

- 条件付きの class は `shared/lib/cx.ts` の `cx()` で繋ぐ。

```tsx
className={cx(styles.row, selected && styles.rowSelected)}
```

- ホバーで出し入れするものは CSS 側で完結させる。

```css
.actions {
  display: none;
}
.handle:hover .actions {
  display: flex;
}
```

### 例外: キャンバスの中

`LayerView` / `SelectionOverlay` / `CanvasSurface` のキャンバス内部だけは
**style オブジェクトのまま書く。** 値がすべて実寸座標と表示倍率に依存する動的な数値で、
CSS に出せないため。色もトークンの外なので、ファイル先頭に定数として置く。

---

## 6. 状態

**状態はすべて `app/store/` の Zustand ストアに集約する。**

- 8つの slice（thumbnail / layer / background / asset / font / preset / ui / workspace）に
  分かれているが、**実体は1つのオブジェクト**。slice をまたいだ更新ができる
  （サムネイルを切り替えたらレイヤーの選択を外す、素材を消したらそれを使うレイヤーも消す等）。
  単一のドキュメントを全機能で編集するエディタとして正しい形なので壊さない。
- **slice は「操作のまとまり」であって「状態の所有単位」ではない。**
- **slice を feature 側に置かない。** `app/store` が `features/*` を import して確実に循環する。
- 利用側は `import { useEditorStore, useCurrentThumbnail } from '@/app/store'` の1行で足りる。
- レイヤー操作は現在のサムネイルに対して行う（`store/patch.ts` の `patchCurrent` / `patchLayers`）。
- **書き込み経路は「アクション」に一本化する。** 外から `setState` で近道しない
  （過去にそれでアクションが4つ死んだ）。
- **状態はすべて JSON 化できる値に保つ。** objectURL / Blob / DOM 参照をストアに入れない
  （画像の Blob は IndexedDB、objectURL は `assetRepo.ts` 内の Map）。

---

## 7. 繰り返しを書かない

よく出る定型はすでに共通化してある。**書き直さずにこれらを使う。**

| したいこと | 使うもの |
|---|---|
| ドロップを受ける | `shared/lib/useDropTarget` |
| 時間のかかる操作（押せなくする + 失敗を知らせる） | `shared/lib/useAsyncAction` |
| D&D の種別判定 | `shared/lib/dnd`（`DND_TYPE` / `hasDragType`） |
| エラー通知 | `shared/lib/notify`（`notifyError`） |
| class 名の結合 | `shared/lib/cx` |
| パネルの外枠 | `shared/ui/Panel` |
| 枠線ボタン | `shared/ui/Button` |
| スライダー + 数値 | `shared/ui/SliderRow` / `PercentRow`（0..1 を % で見せる） |
| 一覧の中で名前を打ち替える | `shared/ui/InlineName` |
| 隠した file input | `shared/ui/useFilePicker` |
| 右クリックメニュー | `shared/ui/ContextMenu`（項目と画面座標を渡す） |
| id を振る | `domain/id`（`createId`） |

---

## 8. コメントと JSDoc

- コメントは日本語で、**なぜそうしているか**を書く。何をしているかは書かない。
- **export する関数・コンポーネントには JSDoc を付け、引数を明記する。**
  `@param` には意味・単位・座標系など、**型から読み取れない情報**を書く（型が語ることは繰り返さない）。
  コンポーネントの props は `@param props.xxx` の形で書く。

---

## 9. テスト

```bash
npm run test
```

- Vitest。ルートの `tests/` に置く。**環境は node なので DOM は使えない。**
- ブラウザAPIに触るモジュール（`fsAccess` など）は `tests/helpers/` のメモリ実装を
  `vi.mock` で差し込む。**モックのパスがずれると Vitest は黙って無視する**ので、
  モジュールを移動したら必ずテストを走らせて確認する。
- **モジュールごと差し替えると、そのモジュール自身は検証できない。** 保存まわりは
  1段下（ブラウザが渡してくる側）を偽物にする helper も用意してある。
  `fakeKv`（idb-keyval）と `fakeHandle`（File System Access の handle）を差し込めば、
  `assetRepo` / `fsAccess` / 復元処理を本物のまま通せる（`tests/workspace-fs.test.ts`）。
- 純粋関数（`domain/`）はそのまま呼べる。**ロジックは `domain/` に置くほどテストしやすい。**
- `tests/architecture.test.ts` が層と feature の境界、未使用の export を検証している。
  新しい層やディレクトリを足したらここも更新する。

---

## 10. 依存を増やさない

現在の依存はこれだけ。**足す前に必要性を確認する。**

```
react / react-dom / zustand / idb-keyval / html-to-image / fflate
開発: vite / typescript / vitest / prettier
```

- CSS Modules は Vite 標準。CSS-in-JS も clsx も入れない。
- ドラッグ・リサイズ・回転・スナップは Pointer Events で自作している。ライブラリを足さない。
- アーキテクチャ検証は自前のテスト（ESLint も @types/node も使っていない）。

---

## 11. 書式

```bash
npm run format
```

Prettier に任せる。設定は `.prettierrc`
（シングルクォート / セミコロンなし / 2スペース / 100桁）。
ドキュメントは手で揃えた ASCII 図を含むので `.prettierignore` で対象外。

---

## 12. 変更後に必ず通すもの

```bash
npm run build       # 型チェック + 本番ビルド
npm run test        # 境界の検証を含む
npm run format
```

**スタイルの変更は、型もテストも通ったまま見た目だけ壊れる。**
`npm run dev` で画面を見て確認すること。
