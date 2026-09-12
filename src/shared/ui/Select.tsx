import styles from './styles.module.css'

/**
 * ドロップダウン選択。
 * option の value は DOM 上では文字列になるため、数値も扱えるよう元の値に引き直して返す。
 *
 * @param props.value    現在の値
 * @param props.onChange 選択が変わったときに呼ばれる
 * @param props.options  選択肢。label が表示名、value が実際の値
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { label: string; value: T }[]
}) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(e) => {
        const raw = e.target.value
        const found = options.find((o) => String(o.value) === raw)
        if (found) onChange(found.value)
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
