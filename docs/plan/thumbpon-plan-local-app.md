# サムネぽん / ThumbPon — ローカルアプリ化の仕様と実装計画

## 目的

ブラウザ版 ThumbPon の編集体験を保ったまま、Windows と macOS 向けのローカルアプリを Electron で配布する。
ローカルアプリでは、ユーザーが選んだプロジェクトフォルダを OS のネイティブダイアログから開き、以後はブラウザの File System Access API の権限再確認なしで保存できるようにする。

Web 版は廃止せず、従来どおりブラウザ内の IndexedDB と File System Access API で利用可能な状態を維持する。

## 対象範囲と決定事項

| 項目 | 決定 |
| --- | --- |
| デスクトップ基盤 | Electron + Electron Forge（Vite プラグイン） |
| 初回の配布対象 | Windows 10 / 11（x64）、macOS（Apple Silicon / Intel） |
| 将来の対象 | Linux は同じコードベースで追加可能にするが、今回の配布対象外 |
| レンダラー | 既存の React + Vite アプリをそのまま利用する |
| 実装の分離 | ドメイン・UI・プロジェクト操作は共有し、Web／Electron 固有の入出力だけをアダプタとして分離する |
| ローカルファイル操作 | main process が Node.js の `fs/promises` と Electron の native dialog を使用する |
| セキュリティ | `nodeIntegration: false`、`contextIsolation: true`、sandbox 有効。preload から用途限定 API だけを公開する |
| 保存形式 | 既存の `.thumbpon` マニフェスト、`assets/` 配下の素材、`.thumbpon.zip` を変更しない |
| ブラウザ版 | 現在の動作と UI を維持する |

今回の対象外は、自動アップデート、複数ウィンドウ、OS ネイティブメニューの全面置換、クラウド同期である。

Web 版の変更は、共通インターフェースを経由して既存の `fsAccess.ts` を呼ぶようにする範囲に限定する。既存の React コンポーネント、Zustand のドキュメント状態、ドメイン型、プロジェクトファイル形式、素材・フォントの IndexedDB リポジトリは Electron 化のために移動または複製しない。

## ローカルアプリ仕様

### 起動とデータ保存

- アプリは既存の編集画面を単一ウィンドウで表示する。画面レイアウト、編集機能、PNG 書き出し、ZIP のインポート／エクスポートはブラウザ版と同一とする。
- 未接続の作業内容、素材 Blob、フォント Blob、UI レイアウトは renderer 側の IndexedDB に自動保存する。これはブラウザ版との互換性を保つためであり、フォルダを保存先に選ぶまでのクラッシュ復旧にも使う。
- 接続済みプロジェクトでは、選択済みフォルダの絶対パスとマニフェスト名を Electron のユーザーデータ領域に記録する。次回起動時はパスが存在し、マニフェストを読める場合に限り復元する。
- 接続済みフォルダを正本とする点は現在と同じとし、起動時にフォルダから復元できた場合は IndexedDB の作業スナップショットよりフォルダ内容を優先する。

### プロジェクトの開く・保存

- 「プロジェクトを開く」は OS のフォルダ選択ダイアログを開く。選択先直下に既存形式のマニフェストがなければエラーとして扱い、現在の編集内容は変更しない。
- 「プロジェクトを保存」は未接続なら OS のフォルダ選択ダイアログを開く。既存プロジェクトがあるフォルダを選んだ場合は、現在と同じ上書き確認を表示する。
- 接続済みなら `Ctrl+S` / `Cmd+S` とメニュー操作で、確認ダイアログを出さずに同じフォルダへ保存する。
- 保存時は現在と同じく、マニフェストを上書きし、素材の追加・削除・空フォルダの整理を反映する。素材ファイルの名前とフォルダ階層の規則は変更しない。
- 接続解除は保存先パスの記録を消し、以後は IndexedDB のみを正本とする。

### 権限とエラー

- ブラウザ版の `FileSystemDirectoryHandle`、権限問い合わせ、再許可 UI はローカルアプリでは使わない。ユーザーがネイティブダイアログで選んだフォルダへは、アプリが直接読み書きする。
- ただし読み書き不可、フォルダ削除、保護フォルダの OS 制限、ファイル競合は失敗として画面に通知する。失敗しても editor store や IndexedDB の作業内容は消さない。
- Electron 固有の API を React コンポーネントや Zustand store に直接公開しない。renderer から使えるのは、選択・読込・書込・接続情報のための明示的なメソッドだけとする。

## 実装方針

### デスクトップ実行基盤

1. Electron Forge を導入し、開発時は Vite dev server、パッケージ時は既存の Vite build を Electron の BrowserWindow から読み込む構成にする。
2. `src/electron/main`、`src/electron/preload`、renderer の3責務を分離する。main process はウィンドウ生成、ネイティブダイアログ、ファイル操作、接続先の永続化を担当する。
3. preload は `contextBridge` で `window.thumbponDesktop` を公開する。任意の IPC channel や Node.js モジュールは公開しない。
4. renderer 用のグローバル型定義を `src/app/platform/` に追加し、ブラウザ実行時には `window.thumbponDesktop` が存在しないことを許容する。
5. renderer 用の `tsconfig.json` から `src/electron/` を除外し、Node/Electron 型を使う main/preload 専用の `tsconfig.electron.json` を追加する。`typecheck` は両方の設定を検査する。

### フォルダ構成

```
src/
  app/
    platform/
      index.ts                     # 実行環境を一度だけ判定し adapter を登録
      web/
        workspaceAdapter.ts        # 既存 File System Access API の呼出し
      desktop/
        workspaceAdapter.ts        # window.thumbponDesktop を呼出す
        api.d.ts                   # renderer に公開される bridge の型
  shared/
    lib/
      workspace/
        types.ts                   # WorkspaceAdapter と入出力 DTO
        port.ts                    # adapter の登録・取得のみ
        path.ts                    # 相対パスの共通検証
  electron/
    main/
      index.ts                     # BrowserWindow と IPC handler の登録
      workspaceIpc.ts              # native dialog / fs/promises / 接続先記録
      workspacePath.ts             # main process 用の絶対パス安全化
    preload/
      index.ts                     # contextBridge の公開入口
      workspaceBridge.ts           # 用途限定の IPC 呼出し
```

- `domain/`、`app/store/`、通常の `features/`、`shared/ui/`、既存の素材・フォント用 IndexedDB リポジトリは移動しない。
- `app/platform/` は renderer の起動時統合だけを担う。`web/` と `desktop/` は互いに import せず、`index.ts` だけが実行環境に応じて一方を選ぶ。`features` から `app/platform/` は import せず、`features/project` は `shared/lib/workspace/port.ts` の共通ポートだけを参照する。
- `src/electron/` は renderer の依存グラフに含めない。Electron main/preload が共有できるのは workspace の DTO と純粋なパス検証のみであり、`app`、`features`、Zustand store は import しない。

### ファイルアクセスの抽象化

1. `shared/lib/workspace/` にプロジェクトフォルダ操作の共通ポートを定義する。`WorkspaceAdapter` はフォルダ選択、接続復元・解除、ファイル読込・書込・列挙・削除、対応可否を扱う。各 adapter の接続先は内部状態とし、feature・store にディレクトリハンドルや絶対パスを渡さない。
2. `app/platform/index.ts` が起動時に Web または Electron adapter を共通ポートへ一度だけ登録する。feature やコンポーネント内では Electron の有無を判定しない。
3. `app/platform/web/workspaceAdapter.ts` は既存の `shared/lib/storage/fsAccess.ts` を利用する。File System Access API のディレクトリハンドル、ブラウザ権限、IndexedDB へのハンドル保存はこの adapter と既存実装だけの責務とする。
4. `app/platform/desktop/workspaceAdapter.ts` は preload API を通して main process に要求する。main process だけが絶対パス、native dialog、`fs/promises`、ユーザーデータ領域を扱う。
5. Electron adapter が renderer へ返すのはファイル内容、ワークスペース名、相対パス、接続状態、エラーだけとする。絶対パスを store、React props、プロジェクトファイルへ渡さない。バイナリは `ArrayBuffer` として bridge を通し、renderer adapter が `Blob` へ変換する。
6. `projectFolder.ts` は具体的な Web API・Electron API のいずれにも依存せず、共通ポートだけを用いて、既存のマニフェスト探索・素材同期・上書き確認・workspace 状態更新を継続する。
7. `canUseFileSystemAccess()` を「フォルダワークスペースが使えるか」という共通の能力判定へ置き換える。Web adapter は従来どおり API 対応時だけ true、Electron adapter は true とする。

### 依存境界

```
domain / app/store / features / shared UI
                 │
                 ▼
     features/project の共通ロジック
                 │
                 ▼
       project workspace interface
           ┌─────┴─────┐
           ▼           ▼
     Web adapter   Electron renderer adapter
           │           │
 File System API    preload (用途限定 API)
                       │
                       ▼
              src/electron/main process
             native dialog / fs/promises
```

- `domain/`、`app/store/`、`features/` の通常の編集機能、`shared/ui/` はプラットフォームを知らない。`window.thumbponDesktop`、Electron 型、Node.js API は import しない。
- Web 固有コードは既存の `shared/lib/storage/fsAccess.ts` と Web adapter に閉じ込める。`showDirectoryPicker`、`FileSystemDirectoryHandle`、ブラウザ権限の型を他層へ漏らさない。
- Electron 固有コードは `src/electron/` と Electron adapter に閉じ込める。renderer が Electron main process や Node.js を import することは禁止する。
- adapter の選択はアプリ起動時に1か所で行い、feature やコンポーネント内で `window.thumbponDesktop` の有無を判定しない。テストでは共通インターフェースへ fake adapter を注入する。

### UI とショートカット

1. 既存のプロジェクトメニューとワークスペース表示を再利用する。Electron ではブラウザ権限の再接続案内を表示せず、フォルダが消失またはアクセス不能な場合は「保存先を選び直す」案内を表示する。
2. `Ctrl+S` / `Cmd+S` は Web の対応ブラウザと Electron の両方で有効にする。未対応 Web ブラウザでは従来どおりブラウザ既定の保存操作を妨げない。
3. PNG と ZIP のダウンロードは、初回では既存の renderer 実装を維持する。Windows アプリでの保存先選択を改善する必要が確認された場合に限り、後続作業として native save dialog に移す。

### テストと配布

1. ファイルアクセスの共通インターフェースを Vitest でモックし、既存の project-folder テストを Web／Electron 実装共通の契約テストとして維持する。
2. main process の IPC handler は、許可された操作・入力値・エラー変換を単体テストする。絶対パス、`..`、OS 固有の区切りを含む相対パスを拒否し、解決後のパスが接続済みフォルダ配下にあることを確認する。preload の公開面は型テストまたはユニットテストで固定する。
3. Electron Forge の make で Windows 用インストーラと macOS 用アプリケーションを生成する。Windows と macOS のクリーンな環境で、起動・開く・保存・再起動後の復元を手動確認する。
4. Windows はコード署名済みインストーラ、macOS は Developer ID 署名および Apple 公証済みアプリとして配布する。署名用証明書・Apple Developer Program・CI の秘密情報はリポジトリに保存しない。

## 実装ステップ

1. **基盤追加** — Electron Forge、`src/electron/main`、`src/electron/preload`、renderer／Electron 用 TypeScript 設定、開発・build・make 用 scripts を追加し、既存アプリを安全な BrowserWindow で起動する。
2. **Desktop bridge** — preload の型付き `thumbponDesktop` API と、main process の native dialog・filesystem・接続先記録を実装する。IPC は用途ごとに固定し、相対パスと入力を検証する。
3. **保存層の分離** — Web adapter と Electron adapter を共通インターフェースへ合わせ、アプリ起動時に一度だけ選択する。`projectFolder.ts` と workspace 復元を実装依存から切り離す。
4. **画面の分岐整理** — プラットフォーム判定、保存ショートカット、接続状態表示、接続切れ時の案内を共通の能力情報だけで更新する。ブラウザ版の対応判定と権限フローを回帰させない。
5. **検証とパッケージング** — 単体テスト、既存テスト、Web build、Electron package、Windows / macOS 実機の手動シナリオを実行し、署名・公証済み配布物を生成する。

## 受け入れ条件

- `npm run dev` による Web 版が従来どおり起動し、Chromium では File System Access API のフォルダ保存が使える。
- Electron 開発起動、Windows パッケージ、macOS アプリのすべてで、既存の編集・自動保存・素材・フォント・PNG 出力・ZIP 入出力が動作する。
- Electron でプロジェクトフォルダを選択して保存した後、再起動しても権限再要求なしに同じフォルダのプロジェクトを復元できる。
- Electron で開く、別名の既存プロジェクトへの保存、素材の追加・削除、空素材フォルダの整理が現在のファイル形式を壊さずに行える。
- 保存先が削除済みまたは書込不能な場合、編集内容を失わずにエラーと再選択手段を表示する。
- renderer に Node.js、`ipcRenderer`、任意の filesystem 操作を公開しない。
- Electron の有無を判定する処理は `src/app/platform/index.ts` の1か所だけにあり、通常の feature・UI・store・domain は Web／Electron 固有の import を持たない。
- Web adapter と Electron adapter は同じ契約テストに通り、同じプロジェクトフォルダに対して同じマニフェストと素材構成を読み書きする。
- renderer 側の `tsconfig.json` は `src/electron/` を検査対象にせず、`tsconfig.electron.json` が main/preload の型検査を担う。アーキテクチャテストは renderer から `src/electron/` を import できないこと、および `src/electron/` が `app`・`features`・store を import しないことを検証する。
- macOS では Documents / Desktop などユーザーが選択した場所のプロジェクトを開き、必要な OS のプライバシー許可を案内したうえで保存できる。
- Windows の配布物はコード署名済み、macOS の配布物は Developer ID 署名と Apple 公証済みである。
- `npm run typecheck`、`npm run test`、`npm run build`、Electron の package／make が通る。

## 前提と将来の判断

- 初回リリースから Windows と macOS の署名済み配布を行う。Windows のコード署名証明書、Apple Developer Program、Developer ID 証明書、Apple 公証用資格情報、各OSの実機またはCI環境が必要である。
- macOS は Apple Silicon と Intel の両方を対象に universal binary として配布する。ビルド環境と Electron Forge の maker が universal binary を生成できることを事前に検証する。
- 既存のブラウザ版とのデータ互換性を優先する。デスクトップ専用のプロジェクト形式、クラウド同期、バックグラウンド自動保存は今回導入しない。
