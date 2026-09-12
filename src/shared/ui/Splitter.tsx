import type { PointerEvent as ReactPointerEvent } from 'react'
import { cx } from '@/shared/lib/cx'
import { startPointerDrag } from '@/shared/lib/pointerDrag'
import styles from './styles.module.css'

type SplitterProps = {
  /** 'x' なら左右の幅、'y' なら上下の高さを変える */
  axis: 'x' | 'y'
  /** 変更対象パネルの現在のサイズ(px)。ドラッグ開始時の基準になる */
  size: number
  /** 仕切りより後ろ側（右または下）のパネルを変更する場合に true */
  invert?: boolean
  /** ドラッグ中に呼ばれる。新しいサイズ(px)で、上限・下限は呼び出し側で決める */
  onResize: (size: number) => void
  title?: string
}

/**
 * パネルの境目に置くドラッグ用の仕切り。見た目上の区切り線も兼ねる。
 * 範囲の制限は隣のパネルの都合次第なので、ここでは行わず呼び出し側に任せる。
 *
 * @param props.axis 'x' なら左右の幅、'y' なら上下の高さを変える
 * @param props.size 変更対象パネルの現在のサイズ(px)
 * @param props.invert 仕切りより後ろ側（右または下）のパネルを変更する場合に true
 * @param props.onResize 新しいサイズ(px)を受け取る。範囲の制限は呼び出し側で行う
 * @param props.title つまみのツールチップ
 */
export function Splitter({ axis, size, invert = false, onResize, title }: SplitterProps) {
  const handlePointerDown = (event: ReactPointerEvent) => {
    if (event.button !== 0) return
    // ドラッグ中に文字が選択されるのを防ぐ
    event.preventDefault()
    const start = size
    startPointerDrag(event, (dx, dy) => {
      const delta = axis === 'x' ? dx : dy
      onResize(start + (invert ? -delta : delta))
    })
  }

  return (
    <div
      role="separator"
      title={title}
      onPointerDown={handlePointerDown}
      className={cx(styles.splitter, axis === 'x' ? styles.splitterX : styles.splitterY)}
    />
  )
}
