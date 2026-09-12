import type { SliceCreator } from './index'

/**
 * none            フォルダ未接続。IndexedDB だけで作業している
 * connected       フォルダに接続済み。保存はそのフォルダへ直接書く
 * needs-permission 前回のフォルダは覚えているが権限が切れている。再接続の操作待ち
 */
export type WorkspaceStatus = 'none' | 'connected' | 'needs-permission'

export type WorkspaceSlice = {
  /** 接続中(または再接続待ち)のフォルダ名。ハンドル自体は fsAccess が持つ */
  workspaceFolderName: string | null
  /** 正本にしているマニフェストのファイル名。次の保存で同じ名前に書き戻すために覚える */
  workspaceFileName: string | null
  workspaceStatus: WorkspaceStatus
  /** フォルダへまだ書いていない変更があるか */
  workspaceDirty: boolean
  workspaceSavedAt: number | null
  /** 読み込んだプロジェクトが要求するのに、この環境で解決できなかったフォントの表示名 */
  missingFontLabels: string[]
  /** 読み込んだプロジェクトに載っているのに、実体が見つからなかった素材のファイル名 */
  missingAssetNames: string[]

  setWorkspace: (
    status: WorkspaceStatus,
    folderName: string | null,
    fileName?: string | null,
  ) => void
  setWorkspaceDirty: (dirty: boolean) => void
  markWorkspaceSaved: () => void
  setMissingFontLabels: (labels: string[]) => void
  setMissingAssetNames: (names: string[]) => void
}

/**
 * ローカルフォルダとの接続状態。
 * FileSystemDirectoryHandle は JSON 化できないのでここには入れず、
 * core/storage/fsAccess.ts のモジュール変数に置いている。
 */
export const createWorkspaceSlice: SliceCreator<WorkspaceSlice> = (set) => ({
  workspaceFolderName: null,
  workspaceFileName: null,
  workspaceStatus: 'none',
  workspaceDirty: false,
  workspaceSavedAt: null,
  missingFontLabels: [],
  missingAssetNames: [],

  /**
   * 接続状態を差し替える。
   *
   * @param status     新しい接続状態
   * @param folderName 画面に出すフォルダ名。切断時は null
   * @param fileName   正本のマニフェスト名。省略すると忘れる（切断と同じ扱い）
   */
  setWorkspace: (workspaceStatus, workspaceFolderName, workspaceFileName = null) =>
    set({ workspaceStatus, workspaceFolderName, workspaceFileName }),

  /**
   * 未保存の変更があるかを設定する。
   *
   * @param dirty 変更が溜まっているか
   */
  setWorkspaceDirty: (workspaceDirty) => set({ workspaceDirty }),

  /** フォルダへの保存が終わったことを記録する */
  markWorkspaceSaved: () => set({ workspaceDirty: false, workspaceSavedAt: Date.now() }),

  /**
   * 解決できなかったフォントの告知を差し替える。
   *
   * @param labels 足りないフォントの表示名。空配列で告知を消す
   */
  setMissingFontLabels: (missingFontLabels) => set({ missingFontLabels }),

  /**
   * 実体が見つからなかった素材の告知を差し替える。
   * 黙って落とすと画像が消えた理由が分からないので、名前で知らせる。
   *
   * @param names 見つからなかった素材のファイル名。空配列で告知を消す
   */
  setMissingAssetNames: (missingAssetNames) => set({ missingAssetNames }),
})
