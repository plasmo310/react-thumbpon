import { useState } from 'react'
import { notifyError } from '../../lib/dom/notify'
import { newProject } from '../../services/workspace'
import { toolbarButton } from './styles'

/**
 * 作業中の内容をすべて捨てて新しいプロジェクトを始める。
 * 取り消せない操作なので必ず確認を挟む。
 */
export function NewProjectButton() {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    if (!window.confirm('現在の内容を破棄して新しいプロジェクトを作成します。よろしいですか？')) {
      return
    }
    setBusy(true)
    try {
      await newProject()
    } catch (error) {
      notifyError('新規作成に失敗しました', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={toolbarButton}
      disabled={busy}
      title="現在の内容を破棄して新しいプロジェクトを作る（フォルダ接続も解除される）"
      onClick={() => void handleClick()}
    >
      新規
    </button>
  )
}
