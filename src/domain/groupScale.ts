import { MIN_SIZE, handleSignX, handleSignY, rotateVector } from './geometry'
import type { Handle, Rect } from './geometry'
import type { Layer, TextLayer } from './layer'
import { formatWholeText } from './text'

/** 拡縮の対象。テキストは高さを持たないので、DOM で測った高さを添える */
export type GroupItem = { layer: Layer; height: number }

/** 拡縮を3桁以上の精度で戻せなくなる極小の倍率を避ける */
const MIN_FACTOR = 0.02

/**
 * テキストレイヤーを倍率で拡縮したときの見た目の変化（位置と幅を除く）。
 * 角ハンドルで1枚を拡縮する場合と、複数選択をまとめて拡縮する場合で同じ結果にするため共有する。
 *
 * @param layer  拡縮前のテキストレイヤー
 * @param factor 倍率。1 より大きいと拡大
 */
export function scaledTextStyle(layer: TextLayer, factor: number): Partial<TextLayer> {
  return {
    autoFit: layer.autoFit,
    fixedLineHeight:
      layer.fixedLineHeight == null ? null : Math.max(1, layer.fixedLineHeight * factor),
    paddingTop: layer.paddingTop * factor,
    paddingRight: layer.paddingRight * factor,
    paddingBottom: layer.paddingBottom * factor,
    paddingLeft: layer.paddingLeft * factor,
    backgroundRadius: layer.backgroundRadius * factor,
    backgroundRadiusTopLeft: layer.backgroundRadiusTopLeft * factor,
    backgroundRadiusTopRight: layer.backgroundRadiusTopRight * factor,
    backgroundRadiusBottomLeft: layer.backgroundRadiusBottomLeft * factor,
    backgroundRadiusBottomRight: layer.backgroundRadiusBottomRight * factor,
    ...formatWholeText(layer, { fontSize: Math.max(4, layer.fontSize * factor) }),
  }
}

/**
 * 回転した矩形を囲む、軸に平行な最小の矩形。
 *
 * @param rect     回転前の矩形（左上基準）
 * @param rotation 中心まわりの回転角(度)
 */
export function rotatedBounds(rect: Rect, rotation: number): Rect {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const xs: number[] = []
  const ys: number[] = []
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const [vx, vy] = rotateVector((sx * rect.width) / 2, (sy * rect.height) / 2, rotation)
    xs.push(cx + vx)
    ys.push(cy + vy)
  }
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/**
 * 複数のレイヤーを囲む矩形。回転しているレイヤーも見た目の外形で数える。
 *
 * @param items 対象。空なら null
 */
export function groupBounds(items: GroupItem[]): Rect | null {
  if (items.length === 0) return null
  const boxes = items.map(({ layer, height }) =>
    rotatedBounds(
      { x: layer.x, y: layer.y, width: layer.width, height: Math.max(height, 1) },
      layer.rotation,
    ),
  )
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
  }
}

/**
 * 角ハンドルを掴んだときの、固定する対角の点と掴んだ角の点。
 *
 * @param box    拡縮前の外接矩形
 * @param handle 掴んだ角ハンドル
 */
export function cornerPoints(box: Rect, handle: Handle) {
  const sx = handleSignX(handle)
  const sy = handleSignY(handle)
  return {
    anchor: { x: sx > 0 ? box.x : box.x + box.width, y: sy > 0 ? box.y : box.y + box.height },
    corner: { x: sx > 0 ? box.x + box.width : box.x, y: sy > 0 ? box.y + box.height : box.y },
  }
}

/**
 * これ以上小さくすると最小のレイヤーが掴めなくなる、倍率の下限。
 *
 * @param items 拡縮の対象
 */
export function factorFloor(items: GroupItem[]): number {
  const smallest = Math.min(
    ...items.map(({ layer, height }) =>
      Math.min(layer.width, layer.type === 'text' ? height : layer.height),
    ),
  )
  return Math.max(MIN_FACTOR, MIN_SIZE / Math.max(smallest, 1))
}

/**
 * ドラッグ量から倍率を決める。縦横比は保つので、対角線方向への射影で求める。
 *
 * @param box    拡縮前の外接矩形
 * @param handle 掴んだ角ハンドル
 * @param dx     ポインタの移動量X（キャンバス実寸）
 * @param dy     ポインタの移動量Y（キャンバス実寸）
 * @param floor  倍率の下限（factorFloor）
 */
export function dragFactor(box: Rect, handle: Handle, dx: number, dy: number, floor: number) {
  const { anchor, corner } = cornerPoints(box, handle)
  const diagonalX = corner.x - anchor.x
  const diagonalY = corner.y - anchor.y
  const length2 = diagonalX * diagonalX + diagonalY * diagonalY
  if (length2 === 0) return 1
  const projected =
    ((corner.x + dx - anchor.x) * diagonalX + (corner.y + dy - anchor.y) * diagonalY) / length2
  return Math.max(floor, projected)
}

export type FactorSnap = { factor: number; guidesX: number[]; guidesY: number[] }

/**
 * 掴んでいる角が吸着線に近ければ、そこに載る倍率へ寄せる。縦横比は保つので、
 * 角の X か Y の近い方に合わせると、もう一方は倍率から決まる。
 *
 * @param box       拡縮前の外接矩形
 * @param handle    掴んだ角ハンドル
 * @param factor    ドラッグから求めた倍率
 * @param linesX    吸着線のX座標（キャンバスの端・中央、他レイヤーの端・中央）
 * @param linesY    吸着線のY座標
 * @param threshold この距離以内なら吸着する（キャンバス実寸）
 * @param floor     これ以下の倍率には寄せない
 */
export function snapFactor(
  box: Rect,
  handle: Handle,
  factor: number,
  linesX: number[],
  linesY: number[],
  threshold: number,
  floor: number,
): FactorSnap {
  const { anchor, corner } = cornerPoints(box, handle)
  const diagonalX = corner.x - anchor.x
  const diagonalY = corner.y - anchor.y
  let best: { distance: number; factor: number; axis: 'x' | 'y'; line: number } | null = null
  const consider = (axis: 'x' | 'y', lines: number[], origin: number, diagonal: number) => {
    if (diagonal === 0) return
    const at = origin + diagonal * factor
    for (const line of lines) {
      const distance = Math.abs(line - at)
      const wanted = (line - origin) / diagonal
      if (distance > threshold || wanted < floor) continue
      if (!best || distance < best.distance) best = { distance, factor: wanted, axis, line }
    }
  }
  consider('x', linesX, anchor.x, diagonalX)
  consider('y', linesY, anchor.y, diagonalY)
  const hit = best as { factor: number; axis: 'x' | 'y'; line: number } | null
  if (!hit) return { factor, guidesX: [], guidesY: [] }
  return {
    factor: hit.factor,
    guidesX: hit.axis === 'x' ? [hit.line] : [],
    guidesY: hit.axis === 'y' ? [hit.line] : [],
  }
}

/**
 * 固定点を中心に、各レイヤーの位置と大きさを倍率で拡縮した結果を返す。
 * 回転しているレイヤーも、角度は変えず中心の位置だけを拡縮する。
 *
 * @param items  拡縮前の対象
 * @param anchor 動かさない点（掴んだ角の対角）
 * @param factor 倍率
 * @returns レイヤー id ごとの更新内容
 */
export function scaleGroup(
  items: GroupItem[],
  anchor: { x: number; y: number },
  factor: number,
): Map<string, Partial<Layer>> {
  const result = new Map<string, Partial<Layer>>()
  for (const { layer, height } of items) {
    const boxHeight = Math.max(height, 1)
    const cx = anchor.x + (layer.x + layer.width / 2 - anchor.x) * factor
    const cy = anchor.y + (layer.y + boxHeight / 2 - anchor.y) * factor
    const width = layer.width * factor
    const scaledHeight = boxHeight * factor
    const position = {
      x: Math.round(cx - width / 2),
      y: Math.round(cy - scaledHeight / 2),
      width: Math.round(width),
    }
    result.set(
      layer.id,
      layer.type === 'text'
        ? { ...position, ...scaledTextStyle(layer, factor) }
        : { ...position, height: Math.round(layer.height * factor) },
    )
  }
  return result
}
