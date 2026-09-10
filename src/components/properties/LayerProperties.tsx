import { useEditorStore } from '../../store'
import { panelBody } from '../../styles'
import type { Layer } from '../../types'
import { EffectsSection } from '../effects/EffectsSection'
import { NumberInput, Row, TextInput } from '../ui'
import { ImageLayerProperties } from './ImageLayerProperties'
import { TextLayerProperties } from './TextLayerProperties'

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
    <div className={panelBody}>
      <Row label="名前">
        <TextInput value={layer.name} onChange={(name) => updateLayer(layer.id, { name })} />
      </Row>
      <div className="flex gap-2">
        <Row label="X">
          <NumberInput value={layer.x} onChange={(x) => updateLayer(layer.id, { x })} />
        </Row>
        <Row label="Y">
          <NumberInput value={layer.y} onChange={(y) => updateLayer(layer.id, { y })} />
        </Row>
      </div>

      {layer.type === 'image' ? (
        <ImageLayerProperties layer={layer} />
      ) : (
        <TextLayerProperties layer={layer} />
      )}

      <EffectsSection
        effects={layer.effects}
        onChange={(patch) => updateLayerEffects(layer.id, patch)}
      />
    </div>
  )
}
