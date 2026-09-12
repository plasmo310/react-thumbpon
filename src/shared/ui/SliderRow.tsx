import { Row } from './Row'
import { Slider } from './Slider'
import styles from './ui.module.css'

/**
 * スライダーと、その右に現在値を出す行。
 * 値の欄は幅を固定してあるので、桁が変わっても行がずれない。
 *
 * @param props.label    左に出す項目名
 * @param props.value    現在の値
 * @param props.onChange つまみを動かすたびに呼ばれる
 * @param props.min      下限
 * @param props.max      上限
 * @param props.step     刻み幅
 * @param props.unit     値の後ろに付ける単位（px / ° など）
 */
export function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}) {
  return (
    <Row label={label}>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} />
      <span className={styles.value}>
        {value}
        {unit}
      </span>
    </Row>
  )
}
