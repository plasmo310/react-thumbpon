import { cx } from '@/shared/lib/cx'
import styles from './ui.module.css'

/**
 * 横並びの排他選択。選択肢が2〜3個で、選択中が一目で分かるべき項目に使う。
 *
 * @param props.value    現在の値
 * @param props.onChange 選択が変わったときに呼ばれる
 * @param props.options  選択肢。label が表示名、value が実際の値
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { label: string; value: T }[]
}) {
  return (
    <div className={styles.segmented}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(styles.segment, value === o.value && styles.segmentOn)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
