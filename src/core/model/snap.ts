import type { CanvasSize } from './types'

export type SnapRect = { x: number; y: number; width: number; height: number }

export type SnapResult = { x: number; y: number; guidesX: number[]; guidesY: number[] }

type Candidate = { delta: number; line: number }

/**
 * 吸着線の候補から、最も近いものを1つ選ぶ。
 *
 * @param edges     動かしている矩形の辺と中央
 * @param lines     吸着先の座標
 * @param threshold この距離以内なら吸着する
 * @returns 吸着しないなら null
 */
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
 *
 * @param moving    移動中の矩形。キャンバス実寸座標、左上基準
 * @param targets   吸着先の候補。回転したレイヤーは矩形が合わないので呼び出し側で除外する
 * @param canvas    キャンバス実寸。端と中央を吸着線として使う
 * @param threshold 吸着しきい値。画面上で一定になるよう「表示px / scale」を渡す
 * @returns 吸着後の座標と、表示すべきガイド線の位置
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
