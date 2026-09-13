import { EffectsSection } from './EffectsSection'
import { useEditorStore } from '@/app/store'
import type { Layer } from '@/domain/layer'
import { NumberInput, Row } from '@/shared/ui'
import { ImageProperties } from './ImageProperties'
import { ShapeProperties } from './ShapeProperties'
import { TextProperties } from './TextProperties'
import styles from '../styles.module.css'

/**
 * レイヤーのプロパティ欄。共通の項目を出したあと、種別ごとの欄に振り分け、
 * 最後にテキストと画像で共通のエフェクトを並べる。
 *
 * @param props.layer 編集対象のレイヤー
 */
export function LayerProperties({ layer }: { layer: Layer }) {
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const updateLayerEffects = useEditorStore((s) => s.updateLayerEffects)

  return (
    <div className={styles.properties}>
      <div className={styles.pair}>
        <Row label="X">
          <NumberInput value={layer.x} onChange={(x) => updateLayer(layer.id, { x })} />
        </Row>
        <Row label="Y">
          <NumberInput value={layer.y} onChange={(y) => updateLayer(layer.id, { y })} />
        </Row>
      </div>

      {layer.type === 'image' && <ImageProperties layer={layer} />}
      {layer.type === 'text' && <TextProperties layer={layer} />}
      {layer.type === 'shape' && <ShapeProperties layer={layer} />}

      {layer.type !== 'shape' && (
        <EffectsSection
          effects={layer.effects}
          onChange={(patch) => updateLayerEffects(layer.id, patch)}
        />
      )}
    </div>
  )
}
