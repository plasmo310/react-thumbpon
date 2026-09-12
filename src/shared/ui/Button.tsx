import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import styles from './styles.module.css'

/**
 * 枠線だけの控えめなボタン。ヘッダーやプロパティ欄の操作に使う。
 *
 * @param props.onClick  押されたときに呼ばれる
 * @param props.size     'sm' はパネル内、'md' はヘッダー用の少し大きいもの
 * @param props.disabled 処理中などで押させたくないとき
 * @param props.title    ホバー時の説明
 * @param props.grow     横幅を余りいっぱいまで広げる
 * @param props.children 表示する文言
 */
export function Button({
  onClick,
  size = 'sm',
  disabled,
  title,
  grow,
  children,
}: {
  onClick: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
  title?: string
  grow?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={grow ? { flex: 1 } : undefined}
      className={cx(styles.button, size === 'sm' ? styles.buttonSm : styles.buttonMd)}
    >
      {children}
    </button>
  )
}
