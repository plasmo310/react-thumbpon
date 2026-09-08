import { useRef } from 'react'
import { notifyError } from '../../lib/dom/notify'
import { exportProjectFile, importProjectFile } from '../../services/projectFile'
import { toolbarButton } from './styles'

/**
 * プロジェクトを1つのファイルとして受け渡しする。
 * フォルダ連携と違い全ブラウザで使えるので、非対応ブラウザではこちらが唯一の保存手段になる。
 */
export function ProjectFileButtons() {
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * 選ばれたファイルを読み込む。
   *
   * @param file 選択されたファイル。キャンセル時は undefined
   */
  const handleImport = async (file: File | undefined) => {
    if (!file) return
    if (!window.confirm('現在の内容を破棄してプロジェクトを読み込みます。よろしいですか？')) return
    try {
      await importProjectFile(file)
    } catch (error) {
      notifyError('読み込みに失敗しました', error)
    }
  }

  return (
    <>
      <button
        type="button"
        className={toolbarButton}
        title=".thumbpon ファイルを読み込む"
        onClick={() => inputRef.current?.click()}
      >
        インポート
      </button>
      <button
        type="button"
        className={toolbarButton}
        title="プロジェクトを .thumbpon ファイル1つとして書き出す"
        onClick={() => void exportProjectFile().catch((e) => notifyError('書き出しに失敗しました', e))}
      >
        エクスポート
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".thumbpon,.json,.zip,application/json,application/zip"
        hidden
        onChange={(event) => {
          void handleImport(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </>
  )
}
