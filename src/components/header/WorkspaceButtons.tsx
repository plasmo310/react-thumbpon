import { useState } from 'react'
import { notifyError } from '../../lib/dom/notify'
import { canUseFileSystemAccess } from '../../lib/storage/fsAccess'
import { openProjectFolder, saveProjectFolder } from '../../services/projectFolder'
import { useEditorStore } from '../../store'
import { toolbarButton } from './styles'

/**
 * ローカルフォルダとの接続と保存。
 * File System Access API 非対応のブラウザでは何も描画しない
 * （エクスポート / インポートで作業できるため、機能を出さないだけでよい）。
 */
export function WorkspaceButtons() {
  const status = useEditorStore((s) => s.workspaceStatus)
  const folderName = useEditorStore((s) => s.workspaceFolderName)
  const dirty = useEditorStore((s) => s.workspaceDirty)
  const [busy, setBusy] = useState(false)

  if (!canUseFileSystemAccess()) return null

  /**
   * 失敗をまとめて拾いつつ、処理中の二重押しを防ぐ。
   *
   * @param message 失敗したときに出す見出し
   * @param run     実際の処理
   */
  const guard = async (message: string, run: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await run()
    } catch (error) {
      notifyError(message, error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {status === 'connected' && folderName && (
        <span
          className="max-w-[160px] truncate text-[11px] text-ink-sub"
          title={`ワークスペース: ${folderName}`}
        >
          {dirty ? '● ' : ''}
          {folderName}
        </span>
      )}
      <button
        type="button"
        className={toolbarButton}
        disabled={busy}
        title="ローカルのフォルダをワークスペースとして開く"
        onClick={() => void guard('フォルダを開けませんでした', openProjectFolder)}
      >
        開く
      </button>
      <button
        type="button"
        className={toolbarButton}
        disabled={busy}
        title="ワークスペースフォルダに保存する（未接続なら保存先を選ぶ）"
        onClick={() => void guard('保存に失敗しました', saveProjectFolder)}
      >
        保存
      </button>
    </>
  )
}
