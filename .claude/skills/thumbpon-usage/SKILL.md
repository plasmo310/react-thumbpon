---
name: thumbpon-usage
description: サムネぽん（ThumbPon。サムネイル画像を作るブラウザの Web ツール）を起動する・操作を説明する・作業プロジェクト（Thumbpon.thumbpon と assets/）を読む／書き換える。「サムネぽん」「ThumbPon」「.thumbpon」「サムネのレイヤーを直して」のときに使う。
---

# サムネぽんを扱う

詳しい使い方は `docs/usage.md`（このリポジトリの中）。起動、プロジェクトの開き方・保存、操作、マニフェストの構造、書き換えの注意はそこが正。

## 要点

- 起動: `npm install`（初回のみ）→ `npm run dev`（http://localhost:5173、Chrome / Edge）
- マニフェスト（`Thumbpon.thumbpon`）は素の JSON。読むのは自由だが、**直接書き換えるのは最後の手段**
  （ブラウザが同じフォルダに接続中だと保存で上書きされる。書き換えたら「プロジェクトを開く」で読み直す）
- 書き換える前に `docs/project-format.md` を読む。**`version` が現行より大きいファイルは書き換えない**／知らないキーと既存の `id` は消さない・変えない／`assetId` の参照を壊さない／**先にバックアップを取る**／書き換えたら開き直して確認し、可能なら `npm run export` で PNG まで見る
- **PNG 書き出しはコマンドだけでできる**（画面は開かない）。`npm run build`（初回・コード変更後）→
  `npm run export -- --project <プロジェクトのフォルダ> --out <出力先> [--thumbnail <名前>]...`。
  詳細は `docs/usage.md` の「コマンドで書き出す」。見た目の最終確認は人がブラウザで行ってもよい
- ツール本体（コード）を直すときは `CLAUDE.md` / `AGENTS.md` → `docs/instructions/agent-guide.md` の順に読む
