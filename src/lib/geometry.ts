export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export type Rect = { x: number; y: number; width: number; height: number }

export const MIN_SIZE = 8

const RAD = Math.PI / 180

/** (dx, dy) を deg 度だけ回転する */
export function rotateVector(dx: number, dy: number, deg: number): [number, number] {
  const rad = deg * RAD
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [dx * cos - dy * sin, dx * sin + dy * cos]
}

function signX(handle: Handle): number {
  if (handle.includes('e')) return 1
  if (handle.includes('w')) return -1
  return 0
}

function signY(handle: Handle): number {
  if (handle.includes('s')) return 1
  if (handle.includes('n')) return -1
  return 0
}

export function isCornerHandle(handle: Handle): boolean {
  return handle.length === 2
}

/**
 * 回転を考慮したリサイズ。dx/dy はキャンバス実寸座標でのポインタ移動量。
 * ドラッグしたハンドルの対角のアンカーが動かないよう x/y を補正して返す。
 */
export function resizeRect(
  start: Rect,
  rotation: number,
  handle: Handle,
  dx: number,
  dy: number,
  keepAspect: boolean,
): Rect {
  // 画面座標の移動量をレイヤーのローカル空間へ（＝逆回転）
  const [lx, ly] = rotateVector(dx, dy, -rotation)
  const sx = signX(handle)
  const sy = signY(handle)

  let dw = sx * lx
  let dh = sy * ly

  if (keepAspect && sx !== 0 && sy !== 0) {
    const ratio = start.width / start.height
    if (Math.abs(dw) > Math.abs(dh * ratio)) dh = dw / ratio
    else dw = dh * ratio
  }

  const width = Math.max(MIN_SIZE, start.width + dw)
  const height = Math.max(MIN_SIZE, start.height + dh)
  // クランプ後の実際の変化量で中心の移動量を求める
  dw = width - start.width
  dh = height - start.height

  const [gx, gy] = rotateVector((sx * dw) / 2, (sy * dh) / 2, rotation)
  const cx = start.x + start.width / 2 + gx
  const cy = start.y + start.height / 2 + gy

  return { x: cx - width / 2, y: cy - height / 2, width, height }
}

/** 中心からポインタへの角度（deg、上方向が0） */
export function angleFromCenter(cx: number, cy: number, px: number, py: number): number {
  return Math.atan2(px - cx, cy - py) / RAD
}

export function snapAngle(deg: number, step = 15): number {
  return Math.round(deg / step) * step
}

export function normalizeAngle(deg: number): number {
  const value = deg % 360
  return value < 0 ? value + 360 : value
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** キャンバスに収まる初期サイズを求める */
export function fitInto(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
