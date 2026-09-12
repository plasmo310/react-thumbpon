export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export type Rect = { x: number; y: number; width: number; height: number }

/** これ以上小さくすると掴めなくなるため、リサイズの下限にする(px) */
export const MIN_SIZE = 8

const RAD = Math.PI / 180

/**
 * ベクトルを回転する。
 *
 * @param dx  X成分
 * @param dy  Y成分
 * @param deg 回転角(度)。負を渡せば逆回転になる
 */
export function rotateVector(dx: number, dy: number, deg: number): [number, number] {
  const rad = deg * RAD
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [dx * cos - dy * sin, dx * sin + dy * cos]
}

/**
 * ハンドルが矩形の右(1)か左(-1)か、どちらでもない(0)かを返す。
 *
 * @param handle 掴んでいるハンドル
 */
export function handleSignX(handle: Handle): number {
  if (handle.includes('e')) return 1
  if (handle.includes('w')) return -1
  return 0
}

/**
 * ハンドルが矩形の下(1)か上(-1)か、どちらでもない(0)かを返す。
 *
 * @param handle 掴んでいるハンドル
 */
export function handleSignY(handle: Handle): number {
  if (handle.includes('s')) return 1
  if (handle.includes('n')) return -1
  return 0
}

/**
 * 角のハンドルかどうか。名前が2文字なら角。
 *
 * @param handle 判定するハンドル
 */
export function isCornerHandle(handle: Handle): boolean {
  return handle.length === 2
}

/**
 * 回転を考慮したリサイズ。
 * ドラッグしたハンドルの対角のアンカーが動かないよう x/y を補正して返す。
 *
 * @param start      ドラッグ開始時の矩形。キャンバス実寸座標
 * @param rotation   レイヤーの回転角(度)
 * @param handle     掴んでいるハンドル
 * @param dx         ポインタの移動量X。キャンバス実寸に直したもの(表示px / scale)
 * @param dy         ポインタの移動量Y。同上
 * @param keepAspect 縦横比を保つか。角ハンドルのときだけ効く
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
  const sx = handleSignX(handle)
  const sy = handleSignY(handle)

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

/**
 * 中心からポインタへの角度を求める。上方向が0度、時計回りが正。
 *
 * @param cx 回転中心X（画面座標）
 * @param cy 回転中心Y（画面座標）
 * @param px ポインタX（画面座標）
 * @param py ポインタY（画面座標）
 */
export function angleFromCenter(cx: number, cy: number, px: number, py: number): number {
  return Math.atan2(px - cx, cy - py) / RAD
}

/**
 * 角度を一定刻みに丸める。
 *
 * @param deg  丸める角度(度)
 * @param step 刻み幅(度)
 */
export function snapAngle(deg: number, step = 15): number {
  return Math.round(deg / step) * step
}

/**
 * 角度を 0..360 の範囲に収める。
 *
 * @param deg 正規化する角度(度)。負でもよい
 */
export function normalizeAngle(deg: number): number {
  const value = deg % 360
  return value < 0 ? value + 360 : value
}

/**
 * 値を範囲内に収める。
 *
 * @param value 対象の値
 * @param min   下限
 * @param max   上限
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 縦横比を保ったまま、指定した枠に収まるサイズを求める。拡大はしない。
 *
 * @param width     元の幅
 * @param height    元の高さ
 * @param maxWidth  収める枠の幅
 * @param maxHeight 収める枠の高さ
 */
export function fitInto(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
