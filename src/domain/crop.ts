import type { CSSProperties } from 'react'
import {
  MIN_SIZE,
  clamp,
  handleSignX,
  handleSignY,
  rotateVector,
  type Handle,
  type Rect,
} from './geometry'

/**
 * 画像の表示範囲。各辺から切り落とす量を 0..1 の割合で持つ。
 * 素材の実寸ではなく割合で持つのは、レイヤーを拡大縮小してもクロップが崩れないため。
 */
export type Crop = { top: number; right: number; bottom: number; left: number }

export const DEFAULT_CROP: Crop = { top: 0, right: 0, bottom: 0, left: 0 }

/** 残す最小の割合。0 まで詰めると表示サイズが無限に発散するため */
const MIN_VISIBLE = 0.05

/** 1辺で切り落とせる上限。反対側の辺と合わせた上限は mergeCrop が抑える */
export const MAX_CROP = 1 - MIN_VISIBLE

/** クロップ後に見えている幅の割合(0..1) */
const visibleWidth = (crop: Crop) => 1 - crop.left - crop.right

/** クロップ後に見えている高さの割合(0..1) */
const visibleHeight = (crop: Crop) => 1 - crop.top - crop.bottom

/**
 * どこかを切り落としているか。既定値との比較で、UIの表示切り替えに使う。
 *
 * @param crop 判定するクロップ
 */
export function isCropped(crop: Crop): boolean {
  return crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0
}

/**
 * クロップを部分的に更新する。反対側の辺と合わせて画像が消えないところで止める。
 *
 * @param crop  現在のクロップ
 * @param patch 変更したい辺だけ。両方の辺を同時に渡したときは left / top を優先して詰める
 */
export function mergeCrop(crop: Crop, patch: Partial<Crop>): Crop {
  const next = { ...DEFAULT_CROP, ...crop, ...patch }

  // 動かした側を優先し、反対側の辺は据え置いたまま上限を決める
  const limit = (moved: keyof Crop, fixed: keyof Crop) => {
    next[fixed] = clamp(next[fixed], 0, 1 - MIN_VISIBLE)
    next[moved] = clamp(next[moved], 0, 1 - MIN_VISIBLE - next[fixed])
  }
  limit(patch.right !== undefined && patch.left === undefined ? 'right' : 'left', 'right')
  limit(patch.bottom !== undefined && patch.top === undefined ? 'bottom' : 'top', 'bottom')

  return next
}

/**
 * レイヤーの枠に対して、クロップ後の範囲だけが見えるようにする画像側のスタイル。
 * 枠を基準にした % で書くので、レイヤーの実寸が変わっても比率だけで決まる。
 * 枠の外にはみ出す分は、呼び出し側が枠を overflow: hidden で切る前提。
 *
 * @param crop 適用するクロップ
 */
export function cropImageStyle(crop: Crop): CSSProperties {
  const vw = visibleWidth(crop)
  const vh = visibleHeight(crop)
  return {
    position: 'absolute',
    left: `${(-crop.left / vw) * 100}%`,
    top: `${(-crop.top / vh) * 100}%`,
    width: `${(1 / vw) * 100}%`,
    height: `${(1 / vh) * 100}%`,
  }
}

/**
 * 端を掴んで表示範囲を詰める／広げる。
 * 枠だけを縮めると中身が伸びてしまうので、枠の変化と同じだけクロップも動かし、
 * 見えている画像が動かないようにする（＝トリミング）。
 *
 * @param start    ドラッグ開始時の枠。キャンバス実寸座標
 * @param crop     ドラッグ開始時のクロップ
 * @param rotation レイヤーの回転角(度)
 * @param handle   掴んでいるハンドル
 * @param dx       ポインタの移動量X。キャンバス実寸に直したもの(表示px / scale)
 * @param dy       ポインタの移動量Y。同上
 * @returns 新しい枠とクロップ。切り落とした分を戻す向きへは、元画像の端までしか広がらない
 */
export function cropByHandle(
  start: Rect,
  crop: Crop,
  rotation: number,
  handle: Handle,
  dx: number,
  dy: number,
): { rect: Rect; crop: Crop } {
  // 画面座標の移動量をレイヤーのローカル空間へ（＝逆回転）
  const [lx, ly] = rotateVector(dx, dy, -rotation)
  // 画像全体を表示したときの大きさ。切り落とす割合を実寸へ換算するのに使う
  const fullWidth = start.width / visibleWidth(crop)
  const fullHeight = start.height / visibleHeight(crop)

  const sx = handleSignX(handle)
  const sy = handleSignY(handle)
  const next = { ...crop }
  let width = start.width
  let height = start.height

  if (sx < 0) {
    const move = clamp(lx, -crop.left * fullWidth, start.width - MIN_SIZE)
    width = start.width - move
    next.left = crop.left + move / fullWidth
  } else if (sx > 0) {
    const move = clamp(lx, -(start.width - MIN_SIZE), crop.right * fullWidth)
    width = start.width + move
    next.right = crop.right - move / fullWidth
  }

  if (sy < 0) {
    const move = clamp(ly, -crop.top * fullHeight, start.height - MIN_SIZE)
    height = start.height - move
    next.top = crop.top + move / fullHeight
  } else if (sy > 0) {
    const move = clamp(ly, -(start.height - MIN_SIZE), crop.bottom * fullHeight)
    height = start.height + move
    next.bottom = crop.bottom - move / fullHeight
  }

  // 掴んだ辺の反対側が動かないよう、大きさの変化ぶんだけ中心をずらす
  const dw = width - start.width
  const dh = height - start.height
  const [gx, gy] = rotateVector((sx * dw) / 2, (sy * dh) / 2, rotation)
  const cx = start.x + start.width / 2 + gx
  const cy = start.y + start.height / 2 + gy

  return { rect: { x: cx - width / 2, y: cy - height / 2, width, height }, crop: next }
}

/**
 * クロップ後に見えている部分の縦横比(幅 ÷ 高さ)。
 * 枠の縦横比をここに合わせると、画像が伸び縮みせずに収まる。
 *
 * @param natural 素材の実寸
 * @param crop    適用するクロップ
 */
export function croppedRatio(natural: { width: number; height: number }, crop: Crop): number {
  return (natural.width * visibleWidth(crop)) / (natural.height * visibleHeight(crop))
}
