import { useState } from 'react'
import { useCurrentThumbnail, useEditorStore } from '@/core/store'
import { CANVAS_PRESETS, CUSTOM_PRESET_ID } from '@/core/model/types'
import { NumberInput, Select } from '@/shared/ui'

/**
 * 選択中のサムネイルのキャンバスサイズを変える行。
 * サイズはサムネイルごとの属性なので、ヘッダーではなくサムネイル一覧の中に置く。
 * プリセットと一致していてもカスタム入力を開いたままにできるよう、選択状態を自前で持つ。
 */
export function ThumbnailSizeRow() {
  const { canvas } = useCurrentThumbnail()
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize)
  const [customMode, setCustomMode] = useState(false)

  const matched = CANVAS_PRESETS.find((p) => p.width === canvas.width && p.height === canvas.height)
  const presetValue = matched && !customMode ? matched.id : CUSTOM_PRESET_ID
  const showCustom = presetValue === CUSTOM_PRESET_ID

  const options = [
    ...CANVAS_PRESETS.map((preset) => ({ label: preset.label, value: preset.id })),
    { label: 'カスタム', value: CUSTOM_PRESET_ID },
  ]

  return (
    // サイドバーは 240px まで縮むので、幅は固定せず余りに追従させる
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 pb-1.5 pl-7">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="shrink-0 text-[10px] text-ink-sub">サイズ</span>
        <div className="min-w-0 flex-1">
          <Select
            value={presetValue}
            options={options}
            onChange={(value) => {
              if (value === CUSTOM_PRESET_ID) {
                setCustomMode(true)
                return
              }
              const preset = CANVAS_PRESETS.find((p) => p.id === value)
              if (preset) {
                setCustomMode(false)
                setCanvasSize({ width: preset.width, height: preset.height })
              }
            }}
          />
        </div>
      </div>

      {showCustom && (
        // 幅×高さは1行に収まらないことがあるので、常に次の行へ送る
        <div className="flex w-full items-center gap-1 text-[10px] text-ink-sub">
          <div className="min-w-0 flex-1">
            <NumberInput
              value={canvas.width}
              min={1}
              onChange={(width) => setCanvasSize({ width, height: canvas.height })}
            />
          </div>
          ×
          <div className="min-w-0 flex-1">
            <NumberInput
              value={canvas.height}
              min={1}
              onChange={(height) => setCanvasSize({ width: canvas.width, height })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
