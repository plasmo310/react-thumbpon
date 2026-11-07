/** レイヤー内の基準点。枠の左上を (0,0)、右下を (1,1) とした割合 */
export type Pivot = { x: number; y: number }

/**
 * 基準点の計算に要る最小限の枠。保存する x/y は左上、height は実際の高さ。
 * テキストは height を持たず内容で伸びるので、呼び出し側が実測した高さを渡す。
 */
export type PivotBox = { x: number; y: number; width: number; height: number; pivot?: Pivot }

/** 旧データと新規のレイヤーは左上基準。座標の意味は従来と同じ */
const DEFAULT_PIVOT: Pivot = { x: 0, y: 0 }

/** 画面で選べる9点。表示順（左上 → 右下）に並べる */
export const PIVOT_PRESETS: Pivot[] = [0, 0.5, 1].flatMap((y) => [0, 0.5, 1].map((x) => ({ x, y })))

/**
 * レイヤーの基準点（割合）。保存データに無ければ左上。
 *
 * @param layer 対象のレイヤー
 */
export function pivotOf(layer: { pivot?: Pivot }): Pivot {
  return layer.pivot ?? DEFAULT_PIVOT
}

/**
 * 基準点が今いるキャンバス上の位置。X/Y の入力欄はこの点を表す。
 * 回転は考慮しない（回転は中心まわりで、枠の左上と幅・高さから求める素直な位置）。
 *
 * @param box 対象の枠
 */
export function pivotPoint(box: PivotBox): { x: number; y: number } {
  const pivot = pivotOf(box)
  return { x: box.x + box.width * pivot.x, y: box.y + box.height * pivot.y }
}

/**
 * 基準点を指定した位置に置くための、枠の左上座標（と大きさ）。
 * 幅・高さを変えるときは、基準点を動かさないようにこれで x/y を直す。
 * 下端中央を基準にしたテンプレなら、サイズが変わっても足元の位置が保たれる。
 *
 * @param box   対象の枠
 * @param point 基準点を置きたいキャンバス上の位置
 * @param size  新しい幅・高さ。省略した方は今の値のまま
 */
export function placeByPivot(
  box: PivotBox,
  point: { x: number; y: number },
  size: { width?: number; height?: number } = {},
): { x: number; y: number; width: number; height: number } {
  const pivot = pivotOf(box)
  const width = size.width ?? box.width
  const height = size.height ?? box.height
  return {
    x: Math.round(point.x - width * pivot.x),
    y: Math.round(point.y - height * pivot.y),
    width,
    height,
  }
}

/**
 * 幅・高さを変えても基準点が動かない更新内容を作る。
 *
 * @param box  変更前の枠
 * @param size 新しい幅・高さ（変えない方は省略）
 */
export function resizeKeepingPivot(
  box: PivotBox,
  size: { width?: number; height?: number },
): { x: number; y: number; width: number; height: number } {
  return placeByPivot(box, pivotPoint(box), size)
}
