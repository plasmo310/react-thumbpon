import { useState } from 'react'
import { inputBase } from './styles'

/**
 * 数値入力。
 * 入力中は文字列のまま保持し、「0を消して打ち直す」ができるよう
 * 範囲の丸めはフォーカスが外れた時にだけ行う。
 *
 * @param props.value    現在の値
 * @param props.onChange 値が変わったときに呼ばれる。入力途中でも数値として読めれば都度呼ぶ
 * @param props.step     矢印キーやスピナーの刻み幅
 * @param props.min      下限。blur 時にここまで引き上げる
 * @param props.max      上限。blur 時にここまで引き下げる
 */
export function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const safeValue = Number.isFinite(value) ? value : 0

  return (
    <input
      type="number"
      className={inputBase}
      value={draft ?? String(safeValue)}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const text = e.target.value
        setDraft(text)
        // 入力途中でも数値として読めるならそのまま反映する（丸めはしない）
        const next = Number(text)
        if (text.trim() !== '' && Number.isFinite(next)) onChange(next)
      }}
      onBlur={() => {
        if (draft === null) return
        const next = Number(draft)
        if (draft.trim() !== '' && Number.isFinite(next)) {
          let fixed = next
          if (min !== undefined) fixed = Math.max(min, fixed)
          if (max !== undefined) fixed = Math.min(max, fixed)
          if (fixed !== safeValue) onChange(fixed)
        }
        setDraft(null)
      }}
    />
  )
}
