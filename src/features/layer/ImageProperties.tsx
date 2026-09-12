import { useEditorStore } from '@/core/store'
import type { ImageLayer } from '@/core/model/types'
import { NumberInput, Row } from '@/shared/ui'
import { OpacityRow } from './OpacityRow'

/**
 * 画像レイヤー固有のプロパティ。画像は height を持つので幅と高さを並べて出す。
 *
 * @param props.layer 編集対象の画像レイヤー
 */
export function ImageProperties({ layer }: { layer: ImageLayer }) {
  const updateLayer = useEditorStore((s) => s.updateLayer)

  return (
    <>
      <div className="flex gap-2">
        <Row label="幅">
          <NumberInput
            value={layer.width}
            min={1}
            onChange={(width) => updateLayer(layer.id, { width })}
          />
        </Row>
        <Row label="高さ">
          <NumberInput
            value={layer.height}
            min={1}
            onChange={(height) => updateLayer(layer.id, { height })}
          />
        </Row>
      </div>
      <Row label="回転">
        <NumberInput
          value={layer.rotation}
          onChange={(rotation) => updateLayer(layer.id, { rotation })}
        />
      </Row>
      <OpacityRow
        opacity={layer.opacity}
        onChange={(opacity) => updateLayer(layer.id, { opacity })}
      />
    </>
  )
}
