import { useState } from 'react'
import { notifyError } from '../../lib/dom/notify'
import { canUseFileSystemAccess } from '../../lib/storage/fsAccess'
import { openProjectFolder, saveProjectFolder } from '../../services/projectFolder'
import { toolbarButton } from './styles'

/**
 * ローカルフォルダとの接続と保存。
 * File System Access API 非対応のブラウザでは何も描画しない
 * （エクスポート / インポートで作業できるため、機能を出さないだけでよい）。
 * 前に付く区切り線もここで出す。丸ごと消えたときに区切りだけ残らないようにするため。
 */
export function WorkspaceButtons() {
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
      <div className="mx-1 h-5 w-px bg-line" />
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
