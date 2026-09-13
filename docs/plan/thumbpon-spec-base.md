# サムネぽん / ThumbPon - 要件定義メモ

## 概要

**サムネぽん** は、複数の画像・テキストをレイヤーとして配置し、テンプレートをベースにサムネイルや告知画像などを効率よく作成するためのWebツール。

Illustrator / Photoshop / Figma などの汎用デザインツールを毎回開かず、定型レイアウトをベースに画像やテキストを差し替えて素早く画像を作ることを目的とする。

将来的な一般公開も想定するが、まずは個人利用を優先する。

---

# コンセプト

このツールは「小型Illustrator」を作ることを目的にしない。

目的は、

**テンプレートをベースに画像と文字を差し替えて、サムネイル画像を高速に量産すること。**

自由度よりも以下を優先する。

- 速さ
- テンプレート性
- 再利用性
- 操作の少なさ
- 分かりやすさ
- 軽さ

画像編集ソフトというより、**Thumbnail Template Editor / Thumbnail Generator** として設計する。

---

# ツール名

## 正式名称

**日本語名：サムネぽん**  
**英語名 / リポジトリ名：ThumbPon**

名前だけで用途が分かりつつ、堅すぎず、軽く使える印象を重視する。

英語表記は `Samunepon` ではなく、サムネイルを意味する `Thumb` と「ぽん」を組み合わせた **ThumbPon** を使用する。

---

# 基本方針

## Webアプリとして実装する

デスクトップアプリではなく、ブラウザ上で動作するWebアプリを基本とする。

理由：

- UIを作りやすい
- CSSによるテキスト・画像エフェクトを利用できる
- 静的Webアプリとして公開しやすい
- クライアントサイドだけで処理できる
- OS依存を減らせる
- 将来的に公開しやすい

---

# 想定技術

## フロントエンド

- React
- TypeScript
- Vite

## UI / CSS

基本候補：

- Tailwind CSS

方針：

- アプリUI部分は Tailwind CSS を中心に構築する
- 実際のサムネイルキャンバス内のデザインは通常のCSSやstyleオブジェクトも使用する
- CSSベースのエフェクトを積極的に利用する

## 状態管理

候補：

- Zustand

管理対象：

- 現在のプロジェクト
- キャンバス設定
- レイヤー一覧
- 選択中レイヤー
- テキスト設定
- 画像設定
- 素材一覧
- Undo / Redo用履歴
- テンプレート情報

---

# Canvas

画像編集用のキャンバスを表示する。

## 初期キャンバスサイズ

最初は以下の2種類を用意する。

### 1920 × 1080

- アスペクト比：16:9
- YouTubeサムネイル
- 動画用画像
- 横長コンテンツ向け

### 800 × 600

- アスペクト比：4:3
- ブログ画像
- 汎用画像
- 旧来の4:3用途

将来的にはカスタムサイズにも対応する。

---

# Canvas Preset と Template の区別

キャンバスサイズとレイアウトテンプレートは別概念として扱う。

## Canvas Preset

例：

```text
1920 × 1080
800 × 600
```

キャンバスそのもののサイズを決める。

## Template

例：

```text
技術記事
MV
ブログ
ゲーム紹介
```

レイヤー配置・文字スタイル・画像位置などを保存する。

---

# Canvas実装方針

キャンバス内部は基本的にHTML DOMで構成する。

```html
<div class="canvas">
  <img />
  <img />
  <div class="text-layer">TEXT</div>
</div>
```

Canvas APIを直接使うのではなく、以下を中心に構築する。

- HTML
- CSS
- DOM

これによりCSSによる装飾を利用しやすくする。

---

# Layer

以下のレイヤーを扱えるようにする。

## Image Layer

画像を配置できる。

対応予定：

- PNG
- JPEG
- WebP
- SVG

設定：

- Position X
- Position Y
- Width
- Height
- Scale
- Rotation
- Opacity
- Z Index
- Visibility
- Lock
- Crop（表示する範囲。各辺から切り落とす割合で持つ）
- Flip X（左右反転）

操作：

- Drag
- Resize
- Rotate
- Flip
- Crop
- Layer reorder

---

## Text Layer

任意のテキストを配置できる。

設定：

- Text
- Font Family
- Font Size
- Font Weight
- Font Style
- Text Align
- Letter Spacing
- Line Height
- Color

CSSベースのエフェクトも設定可能にする。

例：

- text-shadow
- outline
- drop-shadow
- gradient
- transform
- blur
- opacity

特にサムネイル用途として以下は簡単に設定できるようにしたい。

- 縁取り
- 影
- グロー
- グラデーション

---

# Background

キャンバス背景を設定できる。

対応：

- 単色
- 画像
- グラデーション

背景画像について以下を設定できるようにする。

- cover
- contain
- position

---

# UI Layout

## 基本構成

画面は大きく2カラム構成とする。

- 左：操作パネル
- 右：キャンバス

左側の操作パネルは上下に分割する。

- 左上：レイヤー
- 左下：素材
- 右：大きなキャンバス

イメージ：

```text
+--------------------------------------------------------------+
| サムネぽん        [プリセット] [保存] [PNG書き出し]         |
+----------------------+---------------------------------------+
| レイヤー             |                                       |
|----------------------|                                       |
| タイトル             |                                       |
| キャラ               |                                       |
| ロゴ                 |              Canvas                   |
| 背景                 |              1920 × 1080              |
|                      |                                       |
|----------------------|                                       |
| 素材                 |                                       |
| [img] [img]          |                                       |
| [img] [img]          |                                       |
| [+ 追加]             |                                       |
+----------------------+---------------------------------------+
```

---

# UI方針

UIはAdobe系のような重いプロツール感ではなく、軽くて親しみやすいデザインにする。

イメージ：

- 白ベース
- 薄いグレー
- コーラルオレンジをアクセント
- 角丸は少し
- 余白は広め
- 操作項目を詰め込みすぎない
- 必要な設定だけ見せる

---

# カラーリング

## 基本カラー

### アプリ背景

```text
#F5F6F8
```

### パネル背景

```text
#FFFFFF
```

### 境界線

```text
#E3E6EA
```

### メイン文字色

```text
#25282D
```

### サブ文字色

```text
#7A8088
```

### アクセントカラー

コーラルオレンジ。

```text
#FF8A5B
```

Hover：

```text
#FF7440
```

---

## 選択状態

レイヤー選択などでは、強い青色ではなく柔らかいコーラル系を使用する。

例：

```css
background: #FFF1EB;
border: 1px solid #FF8A5B;
```

---

## Canvas領域

キャンバスの外側は少し暗めのグレーにする。

例：

```text
Canvas Area: #E5E7EA
```

その中央に実際の画像キャンバスを配置する。

これにより白背景のサムネイルでも見やすくする。

---

# Header

上部には最低限の操作のみ表示する。

例：

```text
サムネぽん    [サイズ] [保存] [読み込み] [PNG書き出し]
```

重要な操作：

- Canvas Preset選択
- 保存
- 読み込み
- 書き出し

項目を増やしすぎない。

---

# Layer Panel

左上に配置する。

Photoshop / Illustratorのような簡易レイヤーパネル。

表示例：

```text
[Text]   Remotion Tutorial
[Image]  Character.png
[Image]  Screenshot.png
[Image]  Logo.png
[BG]     Background.png
```

できること：

- 選択
- 並び替え
- 表示 / 非表示
- ロック
- 削除
- 複製

レイヤーの上下関係は縦方向で管理する。

---

# Asset Library

左下に配置する。

画像のサムネイルを一覧表示する。

例：

```text
素材

[画像1] [画像2]
[画像3] [画像4]
[ + 追加 ]
```

素材は視覚的に選びやすいUIにする。

将来的にはカテゴリ分けも可能にする。

例：

- すべて
- キャラ
- 背景
- ロゴ
- その他

Asset Libraryからキャンバスへドラッグして配置できるようにする。

---

# Properties

常時大きなプロパティパネルを表示しない。

選択したレイヤーに応じて必要な設定のみ表示する。

候補：

- 左パネル内に展開
- 小さなフローティングパネル
- 選択中レイヤー直下に表示

「サムネぽん」の軽さを保つため、Photoshopのように常に大量の設定項目を表示する設計は避ける。

---

# Project

1つの制作物またはテンプレート群を「Project」として扱う。

例：

```text
YouTubeTechThumbnail
```

Projectには以下を保存する。

```text
Project
├ canvas
├ layers
├ assets
├ fonts
├ templates
└ settings
```

---

# Template

レイヤー構成をTemplateとして保存できるようにする。

例：

```text
Tech Tutorial
Game Dev
Music Video
Blog Thumbnail
```

Templateには主に以下を保存する。

- Canvas Size
- Layer Structure
- Layer Position
- Layer Size
- Layer Style
- Text Style
- Effects

Templateを選択して、画像・タイトルなどだけを差し替えて新しい画像を作れるようにする。

---

# データ保存

ブラウザ単体でも利用可能にする。

## Local Storage

簡単な設定などに利用する。

例：

- 最後に開いたプロジェクト
- UI設定
- 最後に使用したキャンバスサイズ

## IndexedDB

プロジェクトデータや画像などの保存に利用する候補。

ブラウザ内部だけで以下を保存できるようにする。

- Project
- Template
- Asset

---

# Import / Export

ブラウザのデータだけに依存せず、プロジェクトを外部ファイルとして保存できるようにする。

例：

```text
project.thumbnail
```

または

```text
project.zip
```

内部構成例：

```text
project/
├ project.thumbpon
├ assets/
│   ├ background.png
│   ├ character.png
│   └ logo.png
└ fonts/
```

マニフェスト(`*.thumbpon`)の例：

```json
{
  "canvas": {
    "width": 1920,
    "height": 1080
  },
  "layers": [
    {
      "type": "image",
      "src": "assets/character.png",
      "x": 400,
      "y": 200,
      "width": 500
    },
    {
      "type": "text",
      "text": "Remotion Tutorial",
      "x": 80,
      "y": 80,
      "fontSize": 80
    }
  ]
}
```

これにより、

- Export → ファイル保存
- Import → 編集再開

が可能になる。

---

# Local Folder Mode

可能であれば、ユーザーが任意のローカルフォルダをProject Folderとして指定できるようにする。

File System Access APIなどの利用を検討する。

例：

```text
MyThumbnailProject/
├ project.thumbpon
├ templates/
├ assets/
│   ├ characters/
│   ├ backgrounds/
│   └ logos/
└ output/
```

一度フォルダを指定した後は、次回以降も同じProjectを開きやすくする。

ただし、この機能は必須ではなく、ブラウザ内部のみでも完全に使用可能という設計にする。

---

# Privacy

公開Webアプリとして使用する場合でも、ユーザーの画像をサーバーへアップロードしないことを基本方針とする。

画像処理・編集・保存は原則として以下のみで完結させる。

```text
User PC
↓
Browser
↓
Memory / IndexedDB
```

サーバーは静的HTML / JS / CSSの配信だけでも動作可能な構成を目指す。

---

# Image Export

完成したCanvasを画像として書き出せるようにする。

出力：

- PNG
- JPEG
- WebP

候補ライブラリ：

- html-to-image
- modern-screenshot
- html2canvas

第一候補として `html-to-image` などを検討する。

ただし、以下の再現性について検証する。

- Web Font
- CSS filter
- pseudo-element
- SVG
- external image

---

# Editor操作

最低限対応したい操作：

- 画像追加
- テキスト追加
- ドラッグ移動
- リサイズ
- 回転
- レイヤー順変更
- Delete
- Duplicate
- Undo
- Redo

キーボード操作：

```text
Delete        Delete Layer

Ctrl + Z      Undo
Ctrl + Y      Redo

Ctrl + C      Copy
Ctrl + V      Paste

Arrow         Move 1px
Shift+Arrow   Move 10px
```

---

# Alignment

将来的に以下も追加する。

- Center Horizontal
- Center Vertical
- Align Left
- Align Right
- Align Top
- Align Bottom

ガイド表示：

- Canvas Center
- Smart Guide
- Snap

なども検討する。

---

# Font

Web Fontだけでなく、ローカルフォントの読み込みもできるようにしたい。

方法候補：

- FontFace API
- File Input

読み込んだフォントはブラウザ上だけで利用する。

---

# 将来的な機能

## Component / Group

複数レイヤーをGroup化する。

例：

```text
Character Card
├ Character
├ Shadow
└ Name
```

## Preset

テキストスタイルなどをPreset化する。

例：

```text
White Bold Outline
Yellow Pop
Black Shadow
Tech Orange
```

## Batch Generation

テンプレートとデータから複数画像を一括生成する。

例：

```json
[
  {
    "title": "Remotion Tutorial",
    "image": "remotion.png"
  },
  {
    "title": "Unreal Engine Tutorial",
    "image": "unreal.png"
  }
]
```

出力例：

```text
thumbnail_01.png
thumbnail_02.png
```

---

# MVP

## Phase 1

- React + TypeScript
- Vite
- Tailwind CSS
- 1920 × 1080 Canvas
- 800 × 600 Canvas
- Image Layer
- Text Layer
- Drag
- Resize
- Layer Panel
- Asset Panel
- Properties
- PNG Export

## Phase 2

- Template Save
- Template Load
- Project Save
- Project Load
- IndexedDB
- Import / Export

## Phase 3

- Asset Library強化
- Folder Project
- Fonts
- Text Presets
- Effects
- Alignment
- Undo / Redo

## Phase 4

- Batch Generation
- Groups
- Smart Guides
- Keyboard Shortcuts
- Public Web App

---

# 最終的なUIイメージ

```text
+--------------------------------------------------------------+
| サムネぽん     [1920×1080 ▼] [保存] [読込] [PNG書き出し]  |
+----------------------+---------------------------------------+
| レイヤー             |                                       |
|----------------------|                                       |
| [T] タイトル         |                                       |
| [I] キャラ           |                                       |
| [I] ロゴ             |              Canvas                   |
| [I] 背景             |                                       |
|                      |                                       |
|----------------------|                                       |
| 素材                 |                                       |
| [img] [img]          |                                       |
| [img] [img]          |                                       |
| [+ 素材追加]         |                                       |
+----------------------+---------------------------------------+
```

UIはシンプルにし、「サムネを作る」という目的以外の要素を増やしすぎない。
