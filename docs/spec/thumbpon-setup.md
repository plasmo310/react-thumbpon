# サムネぽん / ThumbPon — セットアップ仕様

ThumbPon を一から構築する場合の導入手順、依存パッケージ、確認手順を記す。アプリの機能仕様は[現行仕様](thumbpon-spec.md)を参照する。

## 前提環境

- Node.js の LTS バージョン
- npm
- 対応ブラウザ: Chromium 系ブラウザを推奨する。File System Access API を使うプロジェクトフォルダ連携は Chromium 系でのみ利用できる。

## 初期構築

React と TypeScript の Vite テンプレートを作成し、プロジェクトへ移動する。

```bash
npm create vite@latest thumbpon -- --template react-ts
cd thumbpon
npm install
```

次に、アプリで使う実行時依存を追加する。

```bash
npm install zustand idb-keyval html-to-image fflate
```

Storybook、テスト、整形を使うため、開発用依存を追加する。

```bash
npm install -D storybook @storybook/react-vite vitest prettier
```

Vite の React TypeScript テンプレートに含まれない場合は、以下も開発用依存として追加する。

```bash
npm install -D vite typescript @vitejs/plugin-react @types/react @types/react-dom
```

## 依存パッケージ

| パッケージ | 種別 | 用途 |
|---|---|---|
| `react` / `react-dom` | 実行時 | UI の描画 |
| `zustand` | 実行時 | エディタ状態と操作の管理 |
| `idb-keyval` | 実行時 | IndexedDB への素材・保存データの保持 |
| `html-to-image` | 実行時 | キャンバス DOM の PNG 書き出し |
| `fflate` | 実行時 | プロジェクト ZIP の圧縮・展開 |
| `vite` | 開発 | 開発サーバーと本番ビルド |
| `typescript` | 開発 | 型チェック |
| `@vitejs/plugin-react` | 開発 | Vite での React 変換 |
| `vitest` | 開発 | ユニットテスト |
| `storybook` / `@storybook/react-vite` | 開発 | UI 部品の単体確認 |
| `prettier` | 開発 | コード書式の統一 |
| `@types/react` / `@types/react-dom` | 開発 | React の型定義 |

## npm scripts

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバーを起動 |
| `npm run storybook` | Storybook をポート 6006 で起動 |
| `npm run typecheck` | TypeScript の型チェック |
| `npm run test` | Vitest を一度実行 |
| `npm run test:watch` | Vitest を監視実行 |
| `npm run format` | Prettier で自動整形 |
| `npm run format:check` | Prettier の書式確認 |
| `npm run build` | 型チェック後に Vite の本番ビルド |
| `npm run preview` | 本番ビルドをローカルで確認 |

## 変更後の確認手順

変更内容に応じて、少なくとも該当する確認を行う。

```bash
npm run typecheck
npm run test
npm run format:check
npm run build
```

- UI またはスタイルを変更した場合は、`npm run dev` で画面を目視確認する。
- `shared/ui` のコンポーネントを追加・変更した場合は、`npm run storybook` で Story を確認する。
- 自動整形が必要な場合は `npm run format` を実行する。
