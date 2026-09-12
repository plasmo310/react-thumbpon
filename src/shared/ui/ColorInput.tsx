import styles from './styles.module.css'

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
    <div className={styles.color}>
      <input
        type="color"
        className={styles.colorSwatch}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
