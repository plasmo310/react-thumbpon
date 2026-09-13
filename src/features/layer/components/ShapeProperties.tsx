import { useEditorStore } from '@/app/store'
import type { ShapeFillType, ShapeKind, ShapeLayer, ShapePattern } from '@/domain/layer'
import { ColorInput, NumberInput, PercentRow, Row, Select, SliderRow } from '@/shared/ui'
import { EffectsSection } from './EffectsSection'
import styles from '../styles.module.css'

/** 図形レイヤー固有のプロパティ。 */
export function ShapeProperties({ layer }: { layer: ShapeLayer }) {
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const updateLayerEffects = useEditorStore((s) => s.updateLayerEffects)
  const patch = (values: Partial<ShapeLayer>) => updateLayer(layer.id, values)
  const radiusMax = Math.floor(Math.min(layer.width, layer.height) / 2)

  return (
    <>
      <div className={styles.pair}>
        <Row label="幅">
          <NumberInput value={layer.width} min={1} onChange={(width) => patch({ width })} />
        </Row>
        <Row label="高さ">
          <NumberInput value={layer.height} min={1} onChange={(height) => patch({ height })} />
        </Row>
      </div>
      <Row label="形状">
        <Select<ShapeKind>
          value={layer.shape}
          options={[
            { label: '四角形', value: 'rectangle' },
            { label: '円', value: 'ellipse' },
          ]}
          onChange={(shape) => patch({ shape })}
        />
      </Row>
      {layer.shape === 'rectangle' && (
        <SliderRow
          label="角丸"
          value={Math.min(layer.cornerRadius, radiusMax)}
          min={0}
          max={radiusMax}
          unit="px"
          onChange={(cornerRadius) => patch({ cornerRadius })}
        />
      )}
      <Row label="塗り">
        <Select<ShapeFillType>
          value={layer.fillType}
          options={[
            { label: '単色', value: 'color' },
            { label: 'グラデーション', value: 'gradient' },
            { label: 'パターン', value: 'pattern' },
          ]}
          onChange={(fillType) => patch({ fillType })}
        />
      </Row>
      {layer.fillType === 'color' && (
        <Row label="色">
          <ColorInput value={layer.color} onChange={(color) => patch({ color })} />
        </Row>
      )}
      {layer.fillType === 'gradient' && (
        <>
          <Row label="開始色">
            <ColorInput
              value={layer.gradientFrom}
              onChange={(gradientFrom) => patch({ gradientFrom })}
            />
          </Row>
          <Row label="終了色">
            <ColorInput value={layer.gradientTo} onChange={(gradientTo) => patch({ gradientTo })} />
          </Row>
          <SliderRow
            label="角度"
            value={layer.gradientAngle}
            min={0}
            max={360}
            unit="°"
            onChange={(gradientAngle) => patch({ gradientAngle })}
          />
        </>
      )}
      {layer.fillType === 'pattern' && (
        <>
          <Row label="模様">
            <Select<ShapePattern>
              value={layer.pattern}
              options={[
                { label: '水玉', value: 'dots' },
                { label: 'ライン', value: 'lines' },
                { label: 'チェック', value: 'checker' },
              ]}
              onChange={(pattern) => patch({ pattern })}
            />
          </Row>
          <Row label="下地色">
            <ColorInput value={layer.color} onChange={(color) => patch({ color })} />
          </Row>
          <Row label="模様の色">
            <ColorInput
              value={layer.patternColor}
              onChange={(patternColor) => patch({ patternColor })}
            />
          </Row>
          <Row label="間隔">
            <NumberInput
              value={layer.patternSize}
              min={2}
              onChange={(patternSize) => patch({ patternSize })}
            />
          </Row>
          {layer.pattern !== 'checker' && (
            <PercentRow
              label="太さ"
              value={layer.patternWeight}
              min={0.05}
              max={0.95}
              step={0.05}
              onChange={(patternWeight) => patch({ patternWeight })}
            />
          )}
          {layer.pattern === 'lines' && (
            <SliderRow
              label="角度"
              value={layer.patternAngle}
              min={0}
              max={180}
              unit="°"
              onChange={(patternAngle) => patch({ patternAngle })}
            />
          )}
        </>
      )}
      <Row label="回転">
        <NumberInput value={layer.rotation} onChange={(rotation) => patch({ rotation })} />
      </Row>
      <PercentRow
        label="不透明度"
        value={layer.opacity}
        onChange={(opacity) => patch({ opacity })}
      />
      <EffectsSection
        effects={layer.effects}
        onChange={(values) => updateLayerEffects(layer.id, values)}
      />
    </>
  )
}
