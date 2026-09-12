import styles from './styles.module.css'

/**
 * 複数行のテキスト入力。
 *
 * @param props.value    現在の値
 * @param props.onChange 入力のたびに呼ばれる
 */
export function TextArea({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <textarea
      className={styles.textarea}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
