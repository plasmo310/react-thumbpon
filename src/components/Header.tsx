import { useState } from 'react'
import { exportPng } from '../lib/exportImage'
import { useEditorStore } from '../store/editorStore'
import { CANVAS_PRESETS } from '../types/editor'

export default function Header() {
  const canvas = useEditorStore((s) => s.canvas)
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize)
  const [exporting, setExporting] = useState(false)

  const currentPreset =
    CANVAS_PRESETS.find((p) => p.width === canvas.width && p.height === canvas.height) ??
    CANVAS_PRESETS[0]

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportPng(canvas)
    } catch (error) {
      console.error(error)
      window.alert('書き出しに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel px-5">
      <div className="flex items-baseline gap-2">
        <h1 className="text-base font-bold tracking-wide">サムネぽん</h1>
        <span className="text-[11px] text-ink-sub">ThumbPon</span>
      </div>

      <div className="flex items-center gap-3">
        <select
          className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
          value={currentPreset.id}
          onChange={(e) => {
            const preset = CANVAS_PRESETS.find((p) => p.id === e.target.value)
            if (preset) setCanvasSize({ width: preset.width, height: preset.height })
          }}
        >
          {CANVAS_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="rounded-md bg-accent px-4 py-1.5 text-xs font-bold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {exporting ? '書き出し中…' : 'PNG書き出し'}
        </button>
      </div>
    </header>
  )
}
