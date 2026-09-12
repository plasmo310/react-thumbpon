import { useEffect } from 'react'
import { cx } from '@/shared/lib/cx'
import styles from './styles.module.css'

/**
 * 右クリックメニューの1項目。
 * separated を付けた項目の上に区切り線が入るので、削除のような戻せない操作を離せる。
 */
export type ContextMenuItem = {
  label: string
  onSelect: () => void
  disabled?: boolean
  separated?: boolean
}

/** メニューが画面からはみ出さないように残す余白(px) */
const EDGE_MARGIN = 8
/** 項目1つ分の高さと幅の見込み。開く前は実寸が測れないので、これで折り返し位置を決める */
const ITEM_HEIGHT = 26
const MENU_WIDTH = 180

/**
 * 画面座標に浮く右クリックメニュー。出す位置と項目は呼び出し側が決める。
 *
 * ポインタを押した時点で閉じるので、メニュー内のクリックは onPointerDown を止めて守っている。
 *
 * @param props.items   並べる項目。空なら何も出さない
 * @param props.x       出す位置X（画面座標。event.clientX をそのまま渡す）
 * @param props.y       出す位置Y（画面座標）
 * @param props.onClose 閉じるべきときに呼ばれる。項目を選んだとき・外を押したとき・Esc・スクロール
 */
export function ContextMenu({
  items,
  x,
  y,
  onClose,
}: {
  items: ContextMenuItem[]
  x: number
  y: number
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onClose)
    window.addEventListener('keydown', onKeyDown)
    // スクロールすると掴んだ行から離れてしまうので、追従させずに閉じる
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('pointerdown', onClose)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  if (items.length === 0) return null

  const height = items.length * ITEM_HEIGHT + EDGE_MARGIN

  return (
    <div
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      className={styles.menu}
      style={{
        left: Math.min(x, window.innerWidth - MENU_WIDTH - EDGE_MARGIN),
        top: Math.min(y, Math.max(EDGE_MARGIN, window.innerHeight - height)),
        width: MENU_WIDTH,
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            onClose()
            item.onSelect()
          }}
          className={cx(styles.menuItem, item.separated && styles.menuItemSeparated)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
