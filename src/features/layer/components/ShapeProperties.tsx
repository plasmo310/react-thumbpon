import { useTranslation } from '@/shared/lib/i18n'
import { useEditorStore } from '@/app/store'
import type { ShapeFillType, ShapeKind, ShapeLayer, ShapePattern } from '@/domain/layer'
import { ColorInput, NumberInput, PercentRow, Row, Select, SliderRow } from '@/shared/ui'
import { EffectsSection } from './EffectsSection'
import styles from '../styles.module.css'

/** 図形レイヤー固有のプロパティ。 */
export function ShapeProperties({ layer }: { layer: ShapeLayer }) {
  const t = useTranslation()

  const updateLayer = useEditorStore((s) => s.updateLayer)
  const updateLayerEffects = useEditorStore((s) => s.updateLayerEffects)
  const patch = (values: Partial<ShapeLayer>) => updateLayer(layer.id, values)
  const radiusMax = Math.floor(Math.min(layer.width, layer.height) / 2)

  return (
    <>
      <div className={styles.pair}>
        <Row label={t('幅')}>
          <NumberInput value={layer.width} min={1} onChange={(width) => patch({ width })} />
        </Row>
        <Row label={t('高さ')}>
          <NumberInput value={layer.height} min={1} onChange={(height) => patch({ height })} />
        </Row>
      </div>
      <Row label={t('形状')}>
        <Select<ShapeKind>
          value={layer.shape}
          options={[
            { label: t('四角形'), value: 'rectangle' },
            { label: t('円'), value: 'ellipse' },
          ]}
          onChange={(shape) => patch({ shape })}
        />
      </Row>
      {layer.shape === 'rectangle' && (
        <SliderRow
          label={t('角丸')}
          value={Math.min(layer.cornerRadius, radiusMax)}
          min={0}
          max={radiusMax}
          unit="px"
          onChange={(cornerRadius) => patch({ cornerRadius })}
        />
      )}
      <Row label={t('塗り')}>
        <Select<ShapeFillType>
          value={layer.fillType}
          options={[
            { label: t('単色'), value: 'color' },
            { label: t('グラデーション'), value: 'gradient' },
            { label: t('パターン'), value: 'pattern' },
          ]}
          onChange={(fillType) => patch({ fillType })}
        />
      </Row>
      {layer.fillType === 'color' && (
        <Row label={t('色')}>
          <ColorInput value={layer.color} onChange={(color) => patch({ color })} />
        </Row>
      )}
      {layer.fillType === 'gradient' && (
        <>
          <Row label={t('開始色')}>
            <ColorInput
              value={layer.gradientFrom}
              onChange={(gradientFrom) => patch({ gradientFrom })}
            />
          </Row>
          <Row label={t('終了色')}>
            <ColorInput value={layer.gradientTo} onChange={(gradientTo) => patch({ gradientTo })} />
          </Row>
          <SliderRow
            label={t('角度')}
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
          <Row label={t('模様')}>
            <Select<ShapePattern>
              value={layer.pattern}
              options={[
                { label: t('水玉'), value: 'dots' },
                { label: t('ライン'), value: 'lines' },
                { label: t('チェック'), value: 'checker' },
              ]}
              onChange={(pattern) => patch({ pattern })}
            />
          </Row>
          <Row label={t('下地色')}>
            <ColorInput value={layer.color} onChange={(color) => patch({ color })} />
          </Row>
          <Row label={t('模様の色')}>
            <ColorInput
              value={layer.patternColor}
              onChange={(patternColor) => patch({ patternColor })}
            />
          </Row>
          <Row label={t('間隔')}>
            <NumberInput
              value={layer.patternSize}
              min={2}
              onChange={(patternSize) => patch({ patternSize })}
            />
          </Row>
          {layer.pattern !== 'checker' && (
            <PercentRow
              label={t('太さ')}
              value={layer.patternWeight}
              min={0.05}
              max={0.95}
              step={0.05}
              onChange={(patternWeight) => patch({ patternWeight })}
            />
          )}
          {layer.pattern === 'lines' && (
            <SliderRow
              label={t('角度')}
              value={layer.patternAngle}
              min={0}
              max={180}
              unit="°"
              onChange={(patternAngle) => patch({ patternAngle })}
            />
          )}
        </>
      )}
      <Row label={t('回転')}>
        <NumberInput value={layer.rotation} onChange={(rotation) => patch({ rotation })} />
      </Row>
      <PercentRow
        label={t('不透明度')}
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
