import type { ReactNode } from 'react'

/*
 * 部品を「本来置かれる器」に入れてから見せるための枠。
 *
 * Panel は flex: 1 で伸びる前提、キャンバス内部の部品は実寸座標の親がある前提なので、
 * 素で置くと潰れたり位置が出鱈目になる。ストーリーごとに書くと揃わないのでここにまとめる。
 */

/**
 * サイドバーと同じ形の器。パネル1枚をそのまま入れる。
 *
 * @param props.width  横幅(px)。既定はサイドバーの初期値と同じ
 * @param props.height 高さ(px)。スクロールの出方を見たいときに縮める
 */
export function Sidebar({
  width = 300,
  height = 420,
  children,
}: {
  width?: number
  height?: number
  children: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        overflow: 'hidden',
        background: 'var(--color-panel)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {children}
    </div>
  )
}

/**
 * プロパティ欄のように、パネルの中身として並ぶ部品用の器。
 *
 * @param props.width 横幅(px)。サイドバーが縮んだときの見え方を確かめるのに使う
 */
export function PanelBox({ width = 276, children }: { width?: number; children: ReactNode }) {
  return (
    <div
      style={{
        width,
        padding: 'var(--space-2)',
        background: 'var(--color-panel)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {children}
    </div>
  )
}

/**
 * キャンバス実寸の面。中に置く部品は実寸座標で並ぶので、表示だけ scale で縮める。
 *
 * @param props.width  キャンバス実寸の幅(px)
 * @param props.height キャンバス実寸の高さ(px)
 * @param props.scale  表示倍率。中の部品にも同じ値を渡すこと
 */
export function CanvasFrame({
  width = 1920,
  height = 1080,
  scale = 0.4,
  children,
}: {
  width?: number
  height?: number
  scale?: number
  children: ReactNode
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: width * scale,
        height: height * scale,
        overflow: 'hidden',
        background: 'var(--color-stage)',
        boxShadow: '0 4px 24px rgb(0 0 0 / 0.12)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: '#FFFFFF',
        }}
      >
        {children}
      </div>
    </div>
  )
}
