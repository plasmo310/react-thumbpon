import styles from './ui.module.css'

/**
 * スライダー入力。
 *
 * @param props.value    現在の値
 * @param props.onChange つまみを動かすたびに呼ばれる
 * @param props.min      下限
 * @param props.max      上限
 * @param props.step     刻み幅
 */
export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <input
      type="range"
      className={styles.slider}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}
