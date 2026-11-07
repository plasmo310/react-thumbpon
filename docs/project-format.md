# プロジェクト形式と互換性ポリシー

サムネぽん（ThumbPon）のプロジェクトファイルの中身と、バージョンの扱いを定める。
外部ツールや AI エージェントがプロジェクトを読み書きするときの正本。操作や書き出しの手順は [usage.md](usage.md)。

現行の形式バージョンは **8**（コードでは `src/domain/project.ts` の `PROJECT_VERSION`）。

## 1. ファイルの種類

| 種類                | 中身                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| `*.thumbpon`        | マニフェスト。素の JSON（UTF-8）。サムネ・レイヤー・プリセットのすべて                |
| `assets/<フォルダ>/<素材id>.<拡張子>` | 素材画像の実体。`<フォルダ>` は素材フォルダ名（未分類は直下）          |
| `*.thumbpon.zip`    | 上の一式を ZIP にしたもの（書き出し／読み込み用）。先頭ディレクトリを 1 つ挟んでもよい |

ブラウザ内の自動保存（IndexedDB）は回復用の内部キャッシュで、この形式とは別。やり取りには使わない。

## 2. マニフェスト

```json
{
  "format": "thumbpon-project",
  "version": 8,
  "folders": [],
  "thumbnails": [],
  "currentThumbnailId": null,
  "assets": [],
  "assetFolders": [],
  "textPresets": [],
  "backgroundPresets": [],
  "fonts": []
}
```

| キー                 | 必須 | 中身                                                                    |
| -------------------- | ---- | ----------------------------------------------------------------------- |
| `format`             | 必須 | 常に `"thumbpon-project"`                                               |
| `version`            | 必須 | 整数。§4                                                                |
| `folders`            | 必須 | サムネイルのフォルダ `{id, name, collapsed}`                            |
| `thumbnails`         | 必須 | サムネイルの配列。§3                                                    |
| `currentThumbnailId` | 必須 | 開いているサムネイルの id。何も開いていなければ `null`                 |
| `assets`             | 必須 | `{meta: {id, name, mime, width, height, createdAt, folderId}, file}`    |
| `assetFolders`       | 任意 | 素材フォルダ `{id, name, collapsed, parentId?}`                         |
| `textPresets` / `backgroundPresets` | 任意 | プリセット                                           |
| `fonts`              | 任意 | 使用フォントの参照 `{label, family, source: "local"\|"file"}`。実体は含まない |

## 3. サムネイルとレイヤー

```
thumbnail = { id, name, folderId, canvas: {width, height}, background, layers[] }
```

- `layers[0]` が最背面。`zIndex` は無い
- 座標・サイズはキャンバス実寸 px、**左上基準**。`rotation` は度、`opacity` は 0〜1
- 共通キー: `id, name, x, y, width, rotation, opacity, visible, locked, effects`、任意で `pivot {x, y}`（枠に対する 0〜1 の割合。省略は左上）

| `type`  | 追加のキー                                                                                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `image` | `assetId, height, crop{top,right,bottom,left}, flipX, overlayEnabled, overlayColor, overlayOpacity`                                                                           |
| `text`  | `text`（改行は `\n`）, `inlineStyles?`, `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `textAlign`, `letterSpacing`, `lineHeight`, `color`, `strokeWidth`, `strokeColor` ほか |
| `shape` | `height, shape("rectangle"\|"ellipse"), cornerRadius, fillType("color"\|"gradient"\|"pattern"), color, gradientFrom/To/Angle, pattern, patternColor/Size/Weight/Angle`          |

`effects`: `blur, shadowEnabled, shadowX, shadowY, shadowBlur, shadowColor, shadowOpacity, glowEnabled, glowBlur, glowColor, glowOpacity`

`background`: `type("color"\|"gradient"\|"image"\|"pattern"), color, gradientFrom/To/Angle, assetId, fit("cover"\|"contain"\|"tile"), position, tileWidth, pattern…, effects`

型の正本は `src/domain/layer.ts`・`src/domain/background.ts`・`src/domain/project.ts`。キーが増えたときはそちらが先に更新される。

### 参照関係

- 画像レイヤーと背景の `assetId` は、`assets[].meta.id` のどれかと一致する。一致しない参照は壊れる
- `assets[].file` は ZIP／フォルダ内の相対パス。ファイル名は `<素材id>.<拡張子>`、表示名は `meta.name`
- `assets[].meta.folderId` は `assetFolders[].id`。無い id は未分類として読まれる
- すべての `id` は UUID。既存の id を付け替えない

## 4. バージョンと互換性ポリシー

### version の履歴

| version | 追加されたもの                                           |
| ------- | -------------------------------------------------------- |
| 1       | 基本形（`fonts` は無い）                                 |
| 2       | `fonts`                                                  |
| 3       | 背景の模様設定、レイヤーのエフェクト                     |
| 4       | 素材フォルダ、画像のクロップ・左右反転                   |
| 5       | 文字範囲ごとの部分書式（`inlineStyles`）                 |
| 6       | テキストの自動フィットと背景設定                         |
| 7       | テキスト背景の角丸モードと四隅の設定                     |
| 8       | 基準点 `pivot`                                           |

### v1.0 以降の約束

1. 既存のキーを削除しない。意味を変えない。
2. 新機能は**省略可能な新しいキー**として足す。省略時は従来と同じ見た目・動作になるようにする。
3. 構造を変えて古い版では読めなくなる変更をするときだけ `version` を上げる。
4. 古い version のファイルは、読み込み時に既定値で補って現行形式へ移行する。保存すると現行 version になる。

### 新しい version のファイルを古いアプリで開いたとき

`version` がそのアプリの `PROJECT_VERSION` より大きいファイルは**読み込まない**（エラーを出し、今の編集内容も変えない）。
読み込んで保存し直すと、新しい形式の項目が消えるため。サムネぽんを更新して開く。

### 外部ツール・AI が書き換えるとき

- 先に `version` を確認する。**現行より大きいものは書き換えない**
- 知らないキーは消さない。既存の `id` を変えない。`assetId` などの参照を壊さない
- 書き換え前にバックアップを取る（ファイルをコピーする）
- 書き換えたらサムネぽんで開き直して確認する。可能なら `npm run export` で PNG まで確認する
- ブラウザが同じフォルダに接続中だと、ブラウザ側の保存で上書きされる。ブラウザを閉じるか、書き換え後に「プロジェクトを開く」で読み直す

### 既知の制限

- マニフェストの**最上位**にある未知のキーは、読み込み→保存で落ちる（サムネイル・レイヤーの中の未知のキーは保持される）。新しい version のファイルは §4 のとおり読み込まないので、通常は問題にならない
