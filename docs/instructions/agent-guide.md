# エージェント共通ガイド

ThumbPon は React、TypeScript、Vite、Zustand を使ったサムネイル作成アプリです。
この文書は Claude と Codex を含む、リポジトリで作業するすべてのエージェントに共通の入口です。

## 読む順番

1. 機能要件: [現行仕様](../spec/thumbpon-spec.md)
2. 基本規約（命名・コメント・書式）: [コードガイド](code_guide.md)
3. 設計・配置・プロジェクト固有ルール: [アーキテクチャガイド](architecture_guide.md)
4. 導入手順・依存パッケージ・確認手順: [セットアップ仕様](../spec/setup.md)
5. 実装計画が必要な場合のみ: `docs/plan/` の関連文書

各文書の対象範囲を守り、実装時はすべての規約に従ってください。

## 必須ルール

- [アーキテクチャガイド](architecture_guide.md)の依存方向と feature 境界を守る。
- 新しい feature の公開 API は `features/<feature>/index.ts` に限定する。
- DOM、Blob、Object URL など JSON 化できない値は Zustand の状態に入れない。
- [コードガイド](code_guide.md)に従ってテストを追加・更新し、既存のアーキテクチャテストを壊さない。

## 確認

実装・テスト・UI 確認・整形の手順は[セットアップ仕様](../spec/setup.md)に従ってください。
