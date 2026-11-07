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
