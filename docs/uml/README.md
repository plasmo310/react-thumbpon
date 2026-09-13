# UML

`src/` の依存関係を PlantUML で図にしたもの。

| ファイル | 粒度 | 用途 |
| --- | --- | --- |
| [layers.puml](layers.puml) | 層（6つ） | 全体像。依存の向きのルールを1枚で把握する |
| [package-dependencies.puml](package-dependencies.puml) | パッケージ | どのパッケージが何に依存しているかの詳細 |

依存は `domain → shared → app/store → features → app` の一方向のみで、features 同士は import しない。
ルールの詳細は [アーキテクチャガイド](../instructions/architecture_guide.md)を参照。

## 描画

VS Code では PlantUML 拡張で `.puml` を開き、`PlantUML: Preview Current Diagram` を実行する。
図中の改行は、拡張・PlantUML のバージョン差で解釈が割れない `\n` 記法に統一している。

ローカル描画を選ぶ場合は Java と Graphviz が必要である。PlantUML Server 描画を選ぶ場合は、図の内容がサーバーへ送信されることを理解したうえで利用する。CLI で出す場合:

```bash
# plantuml.jar は https://plantuml.com/download から取得する（Graphviz が必要）
java -jar plantuml.jar -tpng -o out docs/uml/*.puml

# 構文チェックだけ
java -jar plantuml.jar -checkonly docs/uml/*.puml
```

## 書き換えるときの注意

**エイリアスに PlantUML の予約語を使わない。** `header` `footer` `storage` `node` `card`
`title` `legend` などは行頭に来るとコマンドとして解釈され、その行の依存が
**エラーにならないまま黙って消える**。この図では `cHeader` `libStorage` のように
接頭辞を付けて回避している。

依存を実際の import から抽出し直したいときは、`src/` の相対 import を辿って
パッケージ単位に畳めばよい（第2階層までをパッケージとみなす）。
