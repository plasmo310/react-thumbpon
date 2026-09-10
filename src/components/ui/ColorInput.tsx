import { inputBase } from '../../styles'

/**
 * 色の入力。カラーピッカーと16進数の直接入力を並べる。
 *
 * @param props.value    現在の色。#RRGGBB 形式
 * @param props.onChange 色が変わったときに呼ばれる
 */
export function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <input
        type="color"
        className="h-7 w-9 shrink-0 cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className={inputBase}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
