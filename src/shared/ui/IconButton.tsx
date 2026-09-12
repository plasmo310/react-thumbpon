import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import styles from './ui.module.css'

/**
 * アイコン1文字ぶんの小さなボタン。
 * 行全体がクリック可能な一覧の中に置くので、クリックが親へ伝わらないようにしている。
 *
 * @param props.title    ホバー時の説明。操作の意味はここでしか伝えられないので必須にする
 * @param props.onClick  押されたときに呼ばれる
 * @param props.active   強調表示するか。トグル状態を表すのに使う
 * @param props.children 表示する記号や絵文字
 */
export function IconButton({
  title,
  onClick,
  active,
  children,
}: {
  title: string
  onClick: () => void
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cx(styles.iconButton, active && styles.iconButtonOn)}
    >
      {children}
    </button>
  )
}
