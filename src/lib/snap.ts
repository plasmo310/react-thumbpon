import type { CanvasSize } from '../types/editor'

export type SnapRect = { x: number; y: number; width: number; height: number }

export type SnapResult = { x: number; y: number; guidesX: number[]; guidesY: number[] }

type Candidate = { delta: number; line: number }

function bestSnap(edges: number[], lines: number[], threshold: number): Candidate | null {
  let best: Candidate | null = null
  for (const edge of edges) {
    for (const line of lines) {
      const delta = line - edge
      if (Math.abs(delta) > threshold) continue
      if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, line }
    }
  }
  return best
}

/**
 * 移動中の矩形を、キャンバスの端・中央と他レイヤーの端・中央に吸着させる。
 * threshold はキャンバス実寸でのしきい値（画面上で一定になるよう 表示px / scale を渡す）。
 */
export function snapPosition(
  moving: SnapRect,
  targets: SnapRect[],
  canvas: CanvasSize,
  threshold: number,
): SnapResult {
  const linesX = [0, canvas.width / 2, canvas.width]
  const linesY = [0, canvas.height / 2, canvas.height]
  for (const target of targets) {
    linesX.push(target.x, target.x + target.width / 2, target.x + target.width)
    linesY.push(target.y, target.y + target.height / 2, target.y + target.height)
  }

  const x = bestSnap(
    [moving.x, moving.x + moving.width / 2, moving.x + moving.width],
    linesX,
    threshold,
  )
  const y = bestSnap(
    [moving.y, moving.y + moving.height / 2, moving.y + moving.height],
    linesY,
    threshold,
  )

  return {
    x: moving.x + (x?.delta ?? 0),
    y: moving.y + (y?.delta ?? 0),
    guidesX: x ? [x.line] : [],
    guidesY: y ? [y.line] : [],
  }
}

/** DOM から他レイヤーの矩形を集める（テキストの高さも実測できる） */
export function collectLayerRects(surface: HTMLElement, excludeId: string): SnapRect[] {
  return [...surface.querySelectorAll<HTMLElement>('[data-layer-id]')]
    .filter((el) => el.dataset.layerId !== excludeId)
    .map((el) => ({
      x: el.offsetLeft,
      y: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight,
    }))
}
