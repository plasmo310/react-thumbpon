`features` 以下を、役割ごとに最低限整理してください。

基本ルール：

```text
feature/
├─ components/
├─ hooks/
├─ lib/
├─ types.ts
├─ styles.module.css
└─ index.ts
```

ただし、存在しない種類のフォルダは作らないでください。

* React Component → `components/`
* React Hook → `hooks/`
* React非依存のfeature固有ロジック → `lib/`
* feature内で共有する型 → `types.ts`
* feature全体のCSS → `styles.module.css`
* 公開API → `index.ts`

例：

```text
canvas/
├─ components/
│  ├─ CanvasStage.tsx
│  ├─ CanvasSurface.tsx
│  ├─ LayerView.tsx
│  └─ SelectionOverlay.tsx
├─ hooks/
│  ├─ useCanvasView.ts
│  └─ useLayerHeight.ts
├─ lib/
│  ├─ layerRect.ts
│  └─ snap.ts
├─ styles.module.css
└─ index.ts
```

`layer` は主に `components/` に整理してください。

`project` は Component を `components/`、`confirmOverwrite.ts`、`exportImage.ts`、`projectFile.ts`、`workspace.ts` などの非Reactロジックを `lib/` に整理してください。

`asset` や `thumbnail` のようにファイル数が少ないfeatureは、無理にサブフォルダ化しなくて構いません。

過剰に `utils/`、`helpers/`、`services/` などへ細分化せず、基本は `components / hooks / lib` の3分類までにしてください。
