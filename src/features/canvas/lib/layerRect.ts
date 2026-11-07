import type { SnapRect } from './snap'

/**
 * スナップの吸着先として、他レイヤーの矩形をDOMから集める。
 * テキストの実測高さもここで取れる。
 *
 * @param surface   レイヤーを含むキャンバス要素。offsetParent になっている必要がある
 * @param excludeIds 除外するレイヤーの id。通常は移動中のレイヤー自身または選択グループ
 */
export function collectLayerRects(surface: HTMLElement, excludeIds: string[]): SnapRect[] {
  return [...surface.querySelectorAll<HTMLElement>('[data-layer-id]')]
    .filter((el) => !excludeIds.includes(el.dataset.layerId ?? ''))
    .map((el) => ({
      x: el.offsetLeft,
      y: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight,
    }))
}
