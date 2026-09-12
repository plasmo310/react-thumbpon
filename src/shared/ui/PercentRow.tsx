import { Row } from './Row'
import { Slider } from './Slider'
import styles from './ui.module.css'

/**
 * 割合の行。ストアは 0..1 で持ち、画面には % で見せる。
 * 不透明度・影の濃さ・模様の太さのように、内部表現と表示単位が違う項目に使う。
 *
 * @param props.label    左に出す項目名
 * @param props.value    現在の値(0..1)
 * @param props.onChange 変更後の値(0..1)を受け取る
 * @param props.min      下限(0..1)
 * @param props.max      上限(0..1)
 * @param props.step     刻み幅(0..1)
 */
export function PercentRow({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <Row label={label}>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} />
      <span className={styles.value}>{Math.round(value * 100)}%</span>
    </Row>
  )
}
