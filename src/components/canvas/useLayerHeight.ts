import { useLayoutEffect, useState } from 'react'
import { findLayerElement } from '../../lib/dom/layerRect'
import type { Layer } from '../../types'

/**
 * レイヤーの高さをキャンバス実寸で返す。
 * テキストレイヤーは height を持たず内容に応じて伸びるため、DOMから実測して追従する。
 *
 * @param layer 対象のレイヤー。null なら 0 を返す
 */
export function useLayerHeight(layer: Layer | null): number {
  const [measured, setMeasured] = useState(0)

  useLayoutEffect(() => {
    if (!layer) return
    if (layer.type === 'image') {
      setMeasured(layer.height)
      return
    }
    const element = findLayerElement(layer.id)
    if (!element) return
    const update = () => setMeasured(element.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [layer])

  if (!layer) return 0
  return layer.type === 'image' ? layer.height : measured
}
