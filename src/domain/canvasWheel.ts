/** wheel イベントのうち、振り分けに使う値だけ */
export type WheelInput = Pick<WheelEvent, 'deltaX' | 'deltaY' | 'deltaMode' | 'ctrlKey' | 'metaKey'>

/**
 * wheel イベントの移動量を px に揃える。行単位・ページ単位で来るブラウザがあるため。
 *
 * @param delta    deltaX / deltaY の値
 * @param deltaMode WheelEvent.deltaMode（0: px, 1: 行, 2: ページ）
 */
export function wheelDeltaPx(delta: number, deltaMode: number): number {
  const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? 400 : 1
  return delta * unit
}

/**
 * wheel イベントをズームと移動に振り分ける。
 * Mac のトラックパッドはピンチを ctrlKey 付きの wheel、2本指スクロールを修飾なしの wheel で送るので、
 * 修飾なしのものはマウスホイール（ズーム）とトラックパッド（移動）を見分ける必要がある。
 * ブラウザは入力機器を教えてくれないため、マウスは横成分を出さず整数で来るという特徴で推定する。
 * トラックパッドの縦スクロールが整数で来た場合はズームに倒れることがある。
 *
 * @param event 振り分ける wheel イベント
 */
export function classifyWheel(event: WheelInput): 'zoom' | 'pan' {
  if (event.ctrlKey || event.metaKey) return 'zoom'
  if (event.deltaMode !== 0) return 'zoom'
  if (event.deltaX !== 0) return 'pan'
  if (!Number.isInteger(event.deltaY)) return 'pan'
  return 'zoom'
}
