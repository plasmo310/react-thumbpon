import type { SnapRect } from '@/features/canvas/snap'

/**
 * レイヤーのDOM要素を探す。
 * テキストレイヤーは height を持たず内容に応じて伸びるため、高さが要る処理はDOMから実測する。
 *
 * @param layerId 探すレイヤーの id
 */
export function findLayerElement(layerId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-layer-id="${layerId}"]`)
}

/**
 * レイヤーの表示上の高さをキャンバス実寸で得る。
 * offsetHeight は CSS transform: scale() の影響を受けないので、そのまま実寸として使える。
 *
 * @param layerId 測るレイヤーの id
 * @returns 要素が見つからなければ 0
 */
export function measureLayerHeight(layerId: string): number {
  return findLayerElement(layerId)?.offsetHeight ?? 0
}

/**
 * スナップの吸着先として、他レイヤーの矩形をDOMから集める。
 * テキストの実測高さもここで取れる。
 *
 * @param surface   レイヤーを含むキャンバス要素。offsetParent になっている必要がある
 * @param excludeId 除外するレイヤーの id。通常は移動中のレイヤー自身
 */
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
