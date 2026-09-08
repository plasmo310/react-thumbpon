import { useRef, useState } from 'react'
import { notifyError } from '../lib/dom/notify'
import { exportPng } from '../lib/exportImage'
import { downloadProject, importProjectFile, type ProjectFormat } from '../lib/projectFile'
import { useCurrentThumbnail, useEditorStore } from '../store/editorStore'
import { CANVAS_PRESETS, CUSTOM_PRESET_ID } from '../types'
import { NumberInput } from './ui/Field'

export default function Header() {
  const { canvas, name } = useCurrentThumbnail()
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize)
  const [exporting, setExporting] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [saveFormat, setSaveFormat] = useState<ProjectFormat>('zip')
  const projectInputRef = useRef<HTMLInputElement>(null)

  const matched = CANVAS_PRESETS.find(
    (p) => p.width === canvas.width && p.height === canvas.height,
  )
  const presetValue = matched && !customMode ? matched.id : CUSTOM_PRESET_ID
  const showCustom = presetValue === CUSTOM_PRESET_ID

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

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    if (!window.confirm('現在の内容を破棄してプロジェクトを読み込みます。よろしいですか？')) return
    try {
      await importProjectFile(file)
    } catch (error) {
      notifyError('読み込みに失敗しました', error)
    }
  }

  const buttonClass =
    'rounded-md border border-line px-3 py-1.5 text-xs text-ink-sub transition hover:border-accent hover:text-accent'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel px-5">
      <div className="flex items-baseline gap-2">
        <h1 className="text-base font-bold tracking-wide">サムネぽん！</h1>
        <span className="text-[11px] text-ink-sub">ThumbPon</span>
      </div>

      <div className="flex items-center gap-2">
        <select
          className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
          value={presetValue}
          onChange={(e) => {
            if (e.target.value === CUSTOM_PRESET_ID) {
              setCustomMode(true)
              return
            }
            const preset = CANVAS_PRESETS.find((p) => p.id === e.target.value)
            if (preset) {
              setCustomMode(false)
              setCanvasSize({ width: preset.width, height: preset.height })
            }
          }}
        >
          {CANVAS_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value={CUSTOM_PRESET_ID}>カスタム</option>
        </select>

        {showCustom && (
          <div className="flex items-center gap-1 text-xs text-ink-sub">
            <div className="w-20">
              <NumberInput
                value={canvas.width}
                min={1}
                onChange={(width) => setCanvasSize({ width, height: canvas.height })}
              />
            </div>
            ×
            <div className="w-20">
              <NumberInput
                value={canvas.height}
                min={1}
                onChange={(height) => setCanvasSize({ width: canvas.width, height })}
              />
            </div>
          </div>
        )}

        <div className="mx-1 h-5 w-px bg-line" />

        <select
          className="cursor-pointer rounded-md border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-accent"
          value={saveFormat}
          onChange={(e) => setSaveFormat(e.target.value as ProjectFormat)}
          title="ZIPは画像を画像ファイルのまま格納するので軽い"
        >
          <option value="zip">ZIP</option>
          <option value="json">JSON</option>
        </select>
        <button
          type="button"
          className={buttonClass}
          onClick={() => void downloadProject(saveFormat)}
        >
          保存
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => projectInputRef.current?.click()}
        >
          読込
        </button>
        <input
          ref={projectInputRef}
          type="file"
          accept=".json,.zip,application/json,application/zip"
          hidden
          onChange={(event) => {
            void handleImport(event.target.files?.[0])
            event.target.value = ''
          }}
        />

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
