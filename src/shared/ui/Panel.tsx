import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import styles from './styles.module.css'

/**
 * サイドバーに縦積みするパネルの外枠。見出しと、スクロールする中身からなる。
 * 3つのパネルで余白が px-2 / p-2 / px-3 と割れていたので、ここで一度だけ決める。
 *
 * @param props.title    見出し
 * @param props.note     見出しに小さく添える補足
 * @param props.actions  見出しの右端に置く操作
 * @param props.divider  見出しと中身の間に区切り線を引く
 * @param props.section  外枠に足す属性。ドロップを受ける場合などに使う
 * @param props.body     中身のスクロール領域に足す属性
 * @param props.children 中身
 */
export function Panel({
  title,
  note,
  actions,
  divider,
  section,
  body,
  children,
}: {
  title: string
  note?: string
  actions?: ReactNode
  divider?: boolean
  section?: HTMLAttributes<HTMLElement>
  body?: HTMLAttributes<HTMLDivElement>
  children: ReactNode
}) {
  return (
    <section {...section} className={cx(styles.panel, section?.className)}>
      <div className={cx(styles.panelHeader, divider && styles.panelHeaderDivided)}>
        <h2 className={styles.panelTitle}>
          {title}
          {note && <span className={styles.panelNote}>{note}</span>}
        </h2>
        {actions && <div className={styles.panelActions}>{actions}</div>}
      </div>
      <div {...body} className={cx(styles.panelBody, body?.className)}>
        {children}
      </div>
    </section>
  )
}
