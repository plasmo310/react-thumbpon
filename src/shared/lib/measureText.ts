import { textStyle, type TextLayer } from '@/domain/layer'
import { paintEditorText } from './textEditorDom'

/**
 * 部分書式と明示改行を含む文章の最長行を実寸pxで測る。
 * @param layer 測定対象。背景余白は呼び出し側で加える
 */
export function measureTextWidth(layer: TextLayer): number {
  if (typeof document === 'undefined')
    return Math.max(
      1,
      layer.width - (layer.backgroundEnabled ? layer.paddingLeft + layer.paddingRight : 0),
    )
  const element = document.createElement('div')
  const css = { ...textStyle(layer), fontSize: `${layer.fontSize}px` }
  Object.assign(element.style, css, {
    position: 'fixed',
    visibility: 'hidden',
    pointerEvents: 'none',
    width: 'max-content',
    whiteSpace: 'pre',
    wordBreak: 'normal',
    minWidth: '1px',
    minHeight: '1em',
    left: '0',
    top: '0',
  })
  paintEditorText(element, layer)
  document.body.append(element)
  try {
    return Math.max(1, Math.ceil(element.getBoundingClientRect().width))
  } finally {
    element.remove()
  }
}
