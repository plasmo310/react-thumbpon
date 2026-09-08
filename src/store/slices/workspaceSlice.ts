import type { SliceCreator } from '../types'

/**
 * none            フォルダ未接続。IndexedDB だけで作業している
 * connected       フォルダに接続済み。保存はそのフォルダへ直接書く
 * needs-permission 前回のフォルダは覚えているが権限が切れている。再接続の操作待ち
 */
export type WorkspaceStatus = 'none' | 'connected' | 'needs-permission'

export type WorkspaceSlice = {
  /** 接続中(または再接続待ち)のフォルダ名。ハンドル自体は fsAccess が持つ */
  workspaceFolderName: string | null
  workspaceStatus: WorkspaceStatus
  /** フォルダへまだ書いていない変更があるか */
  workspaceDirty: boolean
  workspaceSavedAt: number | null
  /** 読み込んだプロジェクトが要求するのに、この環境で解決できなかったフォントの表示名 */
  missingFontLabels: string[]

  setWorkspace: (status: WorkspaceStatus, folderName: string | null) => void
  setWorkspaceDirty: (dirty: boolean) => void
  markWorkspaceSaved: () => void
  setMissingFontLabels: (labels: string[]) => void
}

/**
 * ローカルフォルダとの接続状態。
 * FileSystemDirectoryHandle は JSON 化できないのでここには入れず、
 * lib/storage/fsAccess.ts のモジュール変数に置いている。
 */
export const createWorkspaceSlice: SliceCreator<WorkspaceSlice> = (set) => ({
  workspaceFolderName: null,
  workspaceStatus: 'none',
  workspaceDirty: false,
  workspaceSavedAt: null,
  missingFontLabels: [],

  /**
   * 接続状態を差し替える。
   *
   * @param status     新しい接続状態
   * @param folderName 画面に出すフォルダ名。切断時は null
   */
  setWorkspace: (workspaceStatus, workspaceFolderName) =>
    set({ workspaceStatus, workspaceFolderName }),

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
})
