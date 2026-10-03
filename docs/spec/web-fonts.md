# 標準 Web フォントとライセンス

## 読み込みと保存

`index.html` の Google Fonts CSS API と `src/domain/font.ts` の標準選択肢で、以下の書体を提供する。PC のフォント一覧取得やフォントファイル追加は不要で、選択した書体に必要なフォント本体をブラウザが取得する。

| 書体 | 太さ | 斜体 | Google Fonts のライセンス原文 |
|---|---|---|---|
| M PLUS 1p | 400 / 700 / 900 | ブラウザが合成 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/mplus1p/OFL.txt) |
| M PLUS 2 | 400 / 700 / 900 | ブラウザが合成 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/mplus2/OFL.txt) |
| Roboto | 400 / 700 / 900 | 400 / 700 / 900 を取得 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/roboto/OFL.txt) |
| Noto Sans JP（既存） | 400 / 700 / 900 | ブラウザが合成 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/notosansjp/OFL.txt) |

`display=swap` を指定し、取得中は代替書体で表示する。初回取得にはインターネット接続が必要で、オフライン・通信失敗時には代替書体となる。キャッシュの保持はブラウザに依存する。Roboto は日本語を収録していないため、日本語など未収録の文字は CSS の `sans-serif` へフォールバックする。

通信先は `fonts.googleapis.com`（CSS）と `fonts.gstatic.com`（フォント本体）。Google に通常の HTTP リクエスト情報は送信されるが、編集テキスト・画像・追加したフォントファイルは送信しない。フォントファイルをプロジェクト ZIP やローカルプロジェクトフォルダへ同梱せず、標準書体は別端末でもアプリの CSS から取得する。標準書体は `builtin` として扱い、プロジェクトの不足フォント一覧には含めない。

## ライセンスの収録

2026-10-04 に Google Fonts 公式リポジトリの上記原文を確認した。現行配布版は4書体とも SIL Open Font License 1.1（OFL-1.1）。Roboto の古い配布版の Apache License 2.0 と混同しない。

| 書体 | 著作権表示 | 同梱ファイル |
|---|---|---|
| M PLUS 1p | Copyright 2016 The M+ Project Authors.（原文末尾の Rounded M+ の表示も保持） | [mplus1p-OFL.txt](../../public/licenses/fonts/mplus1p-OFL.txt) |
| M PLUS 2 | Copyright 2021 The M+ FONTS Project Authors | [mplus2-OFL.txt](../../public/licenses/fonts/mplus2-OFL.txt) |
| Roboto | Copyright 2011 The Roboto Project Authors | [roboto-OFL.txt](../../public/licenses/fonts/roboto-OFL.txt) |
| Noto Sans JP | Copyright 2014-2021 Adobe, with Reserved Font Name 'Source' | [notosansjp-OFL.txt](../../public/licenses/fonts/notosansjp-OFL.txt) |

各ファイルには取得元の著作権表示とライセンス全文をそのまま収録する。Vite は `public/` をビルド出力へコピーするため、公開先でも `licenses/fonts/` 以下から閲覧できる。出典一覧は [README.txt](../../public/licenses/fonts/README.txt) に含める。

OFL は商用利用・埋め込み・ソフトウェアと一緒の再配布を認める。フォントを再配布する場合は著作権表示とライセンス全文を保持し、フォント単体の販売は行わない。改変版には予約名などの条件が適用される。フォントで作成した PNG などの成果物は OFL の適用対象にならず、成果物へのフォントの著作権表示・ライセンス添付は要求されない。正確な条件は同梱した全文を参照する。

Google Fonts の配信内容は更新される可能性があるため、書体追加・配布元変更時には現行のライセンスを確認し、同梱原文とこの一覧を更新する。ユーザーが追加する PC フォント・フォントファイルの利用条件はそれぞれのライセンスに従う。
