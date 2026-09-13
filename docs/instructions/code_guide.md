# サムネぽん / ThumbPon — 基本コーディング規約

この文書は、日常的にコードを書くときの基本規約をまとめたものです。
プロジェクト固有の構造・依存方向・状態管理は[アーキテクチャガイド](architecture_guide.md)を参照してください。

## 命名

| 対象 | 規則 | 例 |
|---|---|---|
| ディレクトリ | すべて小文字 / kebab-case | `features/canvas/` |
| React コンポーネント | `PascalCase.tsx` | `CanvasStage.tsx` |
| フック | `useSomething.ts` | `useCanvasView.ts` |
| ユーティリティ・ロジック | `camelCase.ts` | `projectFolder.ts` |
| 型定義ファイル | `types.ts` | `features/layer/types.ts` |
| CSS Module | `styles.module.css` | `features/canvas/styles.module.css` |
| 公開面（バレル） | `index.ts` | `features/canvas/index.ts` |

- コンポーネントは **named export** にする。`export default` は使わない。
- JSX を含むフックだけは `.tsx` を使える（例: `shared/ui/useFilePicker.tsx`）。

## コメントと JSDoc

- コメントは日本語で、**なぜその形にしたか**を書く。コードから読める処理内容は繰り返さない。
- export する関数・コンポーネントには JSDoc を付け、引数を明記する。
- `@param` には意味・単位・座標系など、型だけでは分からない情報を書く。
- コンポーネントの props は `@param props.xxx` の形で書く。

## 書式

Prettier に任せる。設定は `.prettierrc`（シングルクォート、セミコロンなし、2スペース、100桁）を正とする。

```bash
npm run format
```

Markdown は ASCII 図や表の可読性を保つため整形対象外である。

## Storybook

- Story は `stories/` に `*.stories.tsx` として置き、`src/` の実装コードに混在させない。
- `shared/ui` のコンポーネントを追加・変更したら、最低1つの基本 Story を用意する。
- 入力など状態を持つ部品は、Story 内で状態を管理して操作可能にする。
- Story は代表的な利用例に絞り、実装上必要な場合だけバリエーションを追加する。

## テスト

- テストは Vitest を使い、ルートの `tests/` に置く。テスト環境は node のため、DOM を直接使わない。
- ブラウザ API を触るモジュールは `tests/helpers/` のメモリ実装を `vi.mock` で差し込む。
- モジュールを移動したらモックのパスを確認してテストを実行する。パスがずれると Vitest はモックを黙って無視する。
- モジュール全体を置き換えるのではなく、可能な限り1段下のブラウザ境界を偽物にして本体を検証する。`fakeKv` と `fakeHandle` はそのための helper である。
- 純粋ロジックは `domain/` に置き、直接テストする。
- 新しい層やディレクトリを追加したら `tests/architecture.test.ts` も更新する。
