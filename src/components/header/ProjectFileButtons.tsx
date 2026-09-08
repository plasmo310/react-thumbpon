import { useRef, useState } from 'react'
import { notifyError } from '../../lib/dom/notify'
import { downloadProject, importProjectFile, type ProjectFormat } from '../../services/projectFile'
import { toolbarButton, toolbarSelect } from './styles'

/** プロジェクトの保存と読込。読込は現在の内容を破棄するので確認を挟む */
export function ProjectFileButtons() {
  const [saveFormat, setSaveFormat] = useState<ProjectFormat>('zip')
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
      <select
        className={`${toolbarSelect} px-2`}
        value={saveFormat}
        onChange={(e) => setSaveFormat(e.target.value as ProjectFormat)}
        title="ZIPは画像を画像ファイルのまま格納するので軽い"
      >
        <option value="zip">ZIP</option>
        <option value="json">JSON</option>
      </select>
      <button
        type="button"
        className={toolbarButton}
        onClick={() => void downloadProject(saveFormat)}
      >
        保存
      </button>
      <button type="button" className={toolbarButton} onClick={() => inputRef.current?.click()}>
        読込
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.zip,application/json,application/zip"
        hidden
        onChange={(event) => {
          void handleImport(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </>
  )
}
