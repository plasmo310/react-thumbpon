import type { ReactNode } from 'react'
import styles from './ui.module.css'

/**
 * プロパティ1行分のレイアウト。ラベル幅を揃えて縦に並べるためのもの。
 *
 * @param props.label    左側に出す項目名
 * @param props.children 右側に置く入力部品
 */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <div className={styles.rowBody}>{children}</div>
    </div>
  )
}
