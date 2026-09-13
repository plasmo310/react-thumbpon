# サムネぽん / ThumbPon — アーキテクチャガイド

ThumbPon 固有の構造・配置・実装ルールです。命名、書式、Storybook、テストは[基本コーディング規約](code_guide.md)を参照してください。

## 全体の構成

ThumbPon は **Feature-based Architecture + Colocation** を採用する。関連コードは機能の近くに置き、
本当に複数箇所から共有するものだけを外へ出す。

```
src/
  styles.css           色・余白・文字サイズのトークンとリセット（唯一のグローバル CSS）
  app/                 アプリの組み立て。ここだけが全体を知ってよい
    layout/             App 専用のレイアウト設定
    config/             画面全体の設定・ショートカット
    store/              Zustand の状態と操作
  domain/              UI に依存しないドメインモデル・型・ロジック
  features/            画面に出る機能。1機能 = 1ディレクトリ
  shared/              複数 feature から使う UI とユーティリティ
    ui/                 汎用 UI 部品
    lib/                DOM・ブラウザ操作の小物とフック
      storage/          IndexedDB と File System Access
tests/                 Vitest。src/ の外に置く
stories/               Storybook。src/ の実装コードに混在させない
```

## 依存方向

```
domain  →  shared  →  app/store  →  features  →  app
```

この一方向だけを許可し、**feature 同士は直接 import しない**。
`features/<feature>/index.ts` を feature の公開面とし、`app/` はそこだけを参照する。

| 階層 | 置くもの | 依存できるもの |
|---|---|---|
| `domain/` | 型・既定値・純粋な計算・CSS への変換 | なし（React の型を除く） |
| `shared/` | 複数 feature から使う UI 部品と道具 | `domain` |
| `app/store/` | アプリ全体の状態と更新操作 | `domain` / `shared` |
| `features/` | 画面に出る機能 | 上記すべて |
| `app/` | feature を組み立てる | すべて |

この境界は `tests/architecture.test.ts` が検証する。層の逆流、feature 間 import、feature 直下への置きっぱなし、未使用 export を残さない。

## 置き場所と feature の構成

置き場所は次の順で判断する。

1. 特定機能の画面 → `features/<feature>/`
2. 複数 feature から使う UI → `shared/ui/`
3. 複数 feature から使う DOM 操作・小さなフック → `shared/lib/`
4. ドキュメントの型・純粋な計算 → `domain/`
5. IndexedDB / File System Access → `shared/lib/storage/`
6. 状態と更新操作 → `app/store/`

`shared/ui` は別の React アプリでも意味が通る部品だけにする。`shared/lib` も、1つの feature からしか使わないものはその feature の `lib/` に置く。

feature は `components/`、`hooks/`、`lib/` の3分類までにする。存在しない種類のフォルダは作らないが、作る場合は役割ごとの配置を崩さない。

| 置くもの | 場所 |
|---|---|
| React コンポーネント | `components/` |
| React フック | `hooks/` |
| React に依存しない feature 固有ロジック | `lib/` |
| feature 内で共有する型 | feature 直下の `types.ts` |
| feature 全体の CSS | feature 直下の `styles.module.css` |
| 公開 API | feature 直下の `index.ts` |

feature の分割によって feature 間 import が必要になるなら、原則として分けない。背景・フォント UI・`LayerMenu`・全体ショートカットは、この基準で現在の場所に置かれている。

## 型とスタイル

複数 feature が使う中心的な型は `domain/` に entity ごとのファイルとして置く。各ファイルには型、既定値、ファクトリ、純粋な変換ロジックを近接配置する。feature 内だけで使う型は feature 直下の `types.ts` に置き、中身がなければ作らない。

スタイルは CSS Modules を使い、グローバル CSS は `src/styles.css` に限定する。

- 1 feature につき `styles.module.css` は1枚。コンポーネントごとに増やさない。
- クラス名は camelCase にする。
- 色・余白・文字サイズは `src/styles.css` のトークンを使い、16進数や固定 px を直接書かない。
- 条件付き class は `shared/lib/cx.ts` の `cx()` を使う。
- ホバーでの表示切替は可能な限り CSS 側で完結させる。
- `LayerView`、`SelectionOverlay`、`CanvasSurface` のキャンバス内部だけは、実寸座標や倍率に依存するため style オブジェクトを許可する。

## 状態と既存の共通化

状態はすべて `app/store/` の Zustand ストアに集約する。slice は操作のまとまりであり、状態の所有単位ではない。feature 側に slice を置かず、書き込みは既存の action に一本化する。外部から `setState` を直接呼ばない。

状態は JSON 化できる値だけにする。Blob、Object URL、DOM 参照は Zustand に入れず、Blob は IndexedDB、Object URL は `assetRepo.ts` 内の Map で扱う。

新しい実装の前に既存の共通部品を確認し、同じ定型を作り直さない。代表例は `useDropTarget`、`useAsyncAction`、`dnd`、`notify`、`cx`、`Panel`、`Button`、`SliderRow`、`PercentRow`、`InlineName`、`useFilePicker`、`ContextMenu`、`createId` である。

依存はむやみに増やさない。CSS Modules、Pointer Events、既存のアーキテクチャテストで満たせることに新規ライブラリを入れない。
