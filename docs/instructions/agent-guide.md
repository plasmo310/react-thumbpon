# エージェント共通ガイド

ThumbPon は React、TypeScript、Vite、Zustand を使ったサムネイル作成アプリです。
この文書は Claude と Codex を含む、リポジトリで作業するすべてのエージェントに共通の入口です。

## 読む順番

1. 機能要件: [仕様](../plan/thumbpon-spec.md)
2. 設計・配置・命名: [コードガイド](code_guide.md)
3. 実装計画が必要な場合: `docs/plan/` の関連文書

`docs/instructions/code_guide.md` がアーキテクチャ、依存方向、状態管理、CSS、テストの詳細な規約です。実装時は必ず従ってください。

## 必須ルール

- 依存方向は `domain` / `shared` → `app/store` → `features` → `app`。feature 間は直接 import しない。
- UI に依存しない型・ロジックは `src/domain/`、複数 feature で共有する UI・ユーティリティは `src/shared/`、画面固有の実装は対応する `src/features/<feature>/` に置く。
- 新しい feature の公開 API は `features/<feature>/index.ts` に限定する。
- スタイルは CSS Modules を使い、グローバル CSS は `src/styles.css` に限定する。
- DOM、Blob、Object URL など JSON 化できない値は Zustand の状態に入れない。
- 変更に応じてテストを追加・更新し、既存のアーキテクチャテストを壊さない。

## 確認コマンド

変更内容に応じて、少なくとも該当する確認を行います。

```bash
npm run typecheck
npm run test
npm run format:check
npm run build
```

自動整形が必要な場合は `npm run format` を実行します。
