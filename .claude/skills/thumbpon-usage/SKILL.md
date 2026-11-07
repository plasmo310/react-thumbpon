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
- **PNG 書き出しはブラウザ専用**。CLI では出せない。確認と完成は人がブラウザで行う
- ツール本体（コード）を直すときは `CLAUDE.md` / `AGENTS.md` → `docs/instructions/agent-guide.md` の順に読む
