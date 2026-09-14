今の構成をベースに、以下の方針で整理・リファクタリングしてください。

## 基本方針

* Feature-based Architecture + Colocation を維持する
* 不要に細かいフォルダ分割はしない
* feature 内は基本的にフラットに保つ
* 関連コードは、その feature の近くに置く
* 本当に複数 feature から共有されるものだけ `shared` や `domain` に出す

## 1. `core` を整理する

現在は以下の構成です。

```text
core/
├─ model/
├─ storage/
└─ store/
```

`model`、`storage`、`store` は責務が異なるため、`core` という抽象的なまとまりを解消したいです。

以下の方向で整理してください。

```text
app/
  store/

domain/
  ...

shared/
  lib/
    storage/
```

### `core/store`

アプリ全体の状態管理なので、

```text
app/store/
```

へ移動してください。

現在の Slice 群もここにまとめます。

### `core/model`

UIやfeatureに依存しない、アプリ全体で共有されるドメインモデル・型・ロジックとして扱います。

```text
domain/
```

へ移動してください。

ただし、特定 feature でしか使われない型やロジックまで `domain` に置かず、その feature 内へ移してください。

### `core/storage`

汎用的なストレージ・File System Access API・DB関連処理であれば、

```text
shared/lib/storage/
```

へ移動してください。

## 2. feature 内の命名規則を統一する

以下のルールにしてください。

```text
feature folder       lowercase / kebab-case
React Component      PascalCase.tsx
Hook                 useSomething.ts
utility / logic      camelCase.ts
feature-local types  types.ts
feature-wide CSS     styles.module.css
barrel export        index.ts
```

例：

```text
features/
└─ canvas/
   ├─ CanvasStage.tsx
   ├─ CanvasSurface.tsx
   ├─ LayerView.tsx
   ├─ SelectionOverlay.tsx
   ├─ useCanvasView.ts
   ├─ useLayerHeight.ts
   ├─ types.ts
   ├─ styles.module.css
   └─ index.ts
```

## 3. CSS Module 名を統一する

現在は、

```text
asset.module.css
canvas.module.css
layer.module.css
project.module.css
thumbnail.module.css
```

となっています。

各 feature で1枚のCSS Moduleを共有する設計はそのままで問題ありません。

ただし名前はすべて、

```text
styles.module.css
```

に統一してください。

例：

```text
features/canvas/styles.module.css
features/layer/styles.module.css
features/project/styles.module.css
```

各ファイルからは、

```ts
import styles from "./styles.module.css";
```

として利用します。

## 4. 型は使用範囲に応じて配置する

型を一箇所に集約しすぎないでください。

### feature 内だけで使用する型

```text
features/<feature>/types.ts
```

へ置きます。

例：

```text
features/canvas/types.ts
features/layer/types.ts
```

### アプリ全体で共有されるドメイン型

`Layer`、`Project`、`TextStyle` など、複数featureから参照されるアプリ固有の中心的な型は、

```text
domain/
```

に置きます。

必要に応じて、

```text
domain/
├─ layer.ts
├─ project.ts
├─ geometry.ts
└─ style.ts
```

のように分割してください。

`domain/types.ts` にすべて集約する必要はありません。

## 5. `shared/ui` の責務を確認する

`shared/ui` には、本当に汎用的なUIコンポーネントだけを置いてください。

例：

```text
Button
IconButton
Select
Slider
TextInput
TextArea
SegmentedControl
Panel
Splitter
```

など。

一方で、特定の feature の意味を持つUIコンポーネントは、可能なら該当featureへ移してください。

判断基準：

「別のReactアプリに持っていっても意味が通るか？」

YES → `shared/ui`
NO → `features/<feature>/`

既存の `EffectsSection`、`PresetRow`、`PercentRow`、`SliderRow` などは、使用箇所を確認した上で判断してください。

## 6. `features/project` は現時点では無理に分割しない

現在 `project` feature には project / workspace / export 関連の処理が含まれています。

現時点ではファイル数がそこまで多くないため、そのままでも構いません。

ただし今後肥大化した場合は、

```text
features/
├─ project/
├─ workspace/
└─ export/
```

への分割を検討してください。

今回のリファクタリングでは、明確に責務を分けた方が良い場合のみ分割してください。

## 7. feature 内に `components/` や `hooks/` を新設しない

現状程度のファイル数であれば、

```text
features/canvas/components/
features/canvas/hooks/
```

のような種類別フォルダは不要です。

feature内は基本フラットに維持してください。

ファイル数が大幅に増えた場合のみ、後からサブフォルダ化する方針にします。

## 目標構成

おおよそ以下の形を目指してください。

```text
src/
├─ app/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ shortcuts.ts
│  └─ store/
│
├─ domain/
│  ├─ project.ts
│  ├─ layer.ts
│  ├─ geometry.ts
│  ├─ style.ts
│  └─ ...
│
├─ features/
│  ├─ asset/
│  │  ├─ AssetPanel.tsx
│  │  ├─ types.ts
│  │  ├─ styles.module.css
│  │  └─ index.ts
│  │
│  ├─ canvas/
│  │  ├─ CanvasStage.tsx
│  │  ├─ CanvasSurface.tsx
│  │  ├─ LayerView.tsx
│  │  ├─ SelectionOverlay.tsx
│  │  ├─ useCanvasView.ts
│  │  ├─ useLayerHeight.ts
│  │  ├─ types.ts
│  │  ├─ styles.module.css
│  │  └─ index.ts
│  │
│  ├─ layer/
│  ├─ project/
│  └─ thumbnail/
│
└─ shared/
   ├─ lib/
   │  ├─ storage/
   │  └─ ...
   │
   └─ ui/
```

重要なのは、構造を大きく作り替えることではなく、

* `core` の責務を明確にする
* feature単位のColocationを強める
* 命名規則を統一する
* feature専用の型はfeature内に置く
* 本当に共有されるものだけ外へ出す

ことです。

既存のimportや動作を壊さないようにリファクタリングし、不要な過剰設計は避けてください。
