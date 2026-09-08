import { useState } from 'react'
import { notifyError } from '../../lib/dom/notify'
import { exportPng } from '../../services/exportImage'
import { useCurrentThumbnail } from '../../store'

/** 現在のサムネイルを PNG として書き出す。書き出し中は二重押しを防ぐ */
export function ExportButton() {
  const { canvas, name } = useCurrentThumbnail()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportPng(canvas, name)
    } catch (error) {
      notifyError('書き出しに失敗しました', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={exporting}
      className="rounded-md bg-accent px-4 py-1.5 text-xs font-bold text-white transition hover:bg-accent-hover disabled:opacity-50"
    >
      {exporting ? '書き出し中…' : 'PNG書き出し'}
    </button>
  )
}
