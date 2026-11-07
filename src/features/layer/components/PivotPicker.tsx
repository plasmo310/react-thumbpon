import { useTranslation } from '@/shared/lib/i18n'
import { PIVOT_PRESETS, type Pivot } from '@/domain/pivot'
import { cx } from '@/shared/lib/cx'
import styles from '../styles.module.css'

const LABEL_ROWS = ['上', '中央', '下'] as const
const LABEL_COLUMNS = ['左', '中央', '右'] as const

/**
 * 基準点を左上から右下までの9点から選ぶ。
 * X/Y の入力とサイズ変更はここで選んだ点を基準にするので、下端合わせのテンプレなら下端の点を選ぶ。
 *
 * @param props.value    今の基準点（割合）
 * @param props.onChange 選ばれたときに呼ばれる
 */
export function PivotPicker({
  value,
  onChange,
}: {
  value: Pivot
  onChange: (pivot: Pivot) => void
}) {
  const t = useTranslation()

  return (
    <div className={styles.pivotGrid} role="radiogroup" aria-label={t('基準点')}>
      {PIVOT_PRESETS.map((pivot) => {
        const row = Math.round(pivot.y * 2)
        const column = Math.round(pivot.x * 2)
        const active = pivot.x === value.x && pivot.y === value.y
        const label =
          row === 1 && column === 1
            ? t('中央')
            : t('{0}・{1}', t(LABEL_ROWS[row]), t(LABEL_COLUMNS[column]))
        return (
          <button
            key={`${pivot.x}-${pivot.y}`}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            className={cx(styles.pivotDot, active && styles.pivotDotActive)}
            onClick={() => onChange(pivot)}
          />
        )
      })}
    </div>
  )
}
