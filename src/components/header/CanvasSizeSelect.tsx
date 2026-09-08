import { useState } from 'react'
import { useCurrentThumbnail, useEditorStore } from '../../store'
import { CANVAS_PRESETS, CUSTOM_PRESET_ID } from '../../types'
import { NumberInput } from '../ui'
import { toolbarSelect } from './styles'

/**
 * キャンバスサイズの切り替え。
 * プリセットと一致していてもカスタム入力を開いたままにできるよう、選択状態を自前で持つ。
 */
export function CanvasSizeSelect() {
  const { canvas } = useCurrentThumbnail()
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize)
  const [customMode, setCustomMode] = useState(false)

  const matched = CANVAS_PRESETS.find(
    (p) => p.width === canvas.width && p.height === canvas.height,
  )
  const presetValue = matched && !customMode ? matched.id : CUSTOM_PRESET_ID
  const showCustom = presetValue === CUSTOM_PRESET_ID

  return (
    <>
      <select
        className={toolbarSelect}
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
    </>
  )
}
