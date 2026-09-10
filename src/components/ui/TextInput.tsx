import { inputBase } from '../../styles'

/**
 * 1行のテキスト入力。
 *
 * @param props.value       現在の値
 * @param props.onChange    入力のたびに呼ばれる
 * @param props.placeholder 未入力時に薄く出す文言
 */
export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      className={inputBase}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
