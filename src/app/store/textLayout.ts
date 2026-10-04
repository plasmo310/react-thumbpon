import { type Layer, type TextLayer } from '@/domain/layer'
import { measureTextWidth } from '@/shared/lib/measureText'

/**
 * 自動フィット幅を保存データへ反映する。実測はブラウザ境界に委ねる。
 * @param layer 更新後のレイヤー
 * @param previous 更新前。配置だけの変更では計測を省く
 */
export function fitTextLayer(layer: Layer, previous?: Layer): Layer {
  if (layer.type !== 'text') return layer
  const padding = layer.backgroundEnabled ? layer.paddingLeft + layer.paddingRight : 0
  if (!layer.autoFit) return layer.width >= padding + 1 ? layer : { ...layer, width: padding + 1 }
  const keys: (keyof TextLayer)[] = [
    'autoFit',
    'text',
    'inlineStyles',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'lineHeight',
    'backgroundEnabled',
    'paddingLeft',
    'paddingRight',
  ]
  if (previous?.type === 'text' && keys.every((key) => layer[key] === previous[key])) return layer
  const width = measureTextWidth(layer) + padding
  return width === layer.width ? layer : { ...layer, width }
}
