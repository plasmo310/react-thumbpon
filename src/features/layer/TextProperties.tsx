import { PresetRow } from './PresetRow'
import { extractTextStyle } from '@/domain/layer'
import { useEditorStore } from '@/app/store'
import { FONT_WEIGHTS } from '@/domain/font'
import type { TextAlign, TextLayer } from '@/domain/layer'
import {
  ColorInput,
  NumberInput,
  PercentRow,
  Row,
  SegmentedControl,
  Select,
  TextArea,
} from '@/shared/ui'
import { FontLoader } from './FontLoader'
import styles from './styles.module.css'

/**
 * テキストレイヤー固有のプロパティ。
 * テキストは height を持たず内容に応じて伸びるので、高さの入力は無く回転を並べる。
 *
 * @param props.layer 編集対象のテキストレイヤー
 */
export function TextProperties({ layer }: { layer: TextLayer }) {
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const fonts = useEditorStore((s) => s.fonts)
  const textPresets = useEditorStore((s) => s.textPresets)
  const addTextPreset = useEditorStore((s) => s.addTextPreset)
  const applyTextPreset = useEditorStore((s) => s.applyTextPreset)
  const removeTextPreset = useEditorStore((s) => s.removeTextPreset)
  const patch = (values: Partial<TextLayer>) => updateLayer(layer.id, values)

  return (
    <>
      <div className={styles.pair}>
        <Row label="幅">
          <NumberInput value={layer.width} min={1} onChange={(width) => patch({ width })} />
        </Row>
        <Row label="回転">
          <NumberInput value={layer.rotation} onChange={(rotation) => patch({ rotation })} />
        </Row>
      </div>
      <PercentRow
        label="不透明度"
        value={layer.opacity}
        onChange={(opacity) => patch({ opacity })}
      />

      <div className={styles.divider} />
      <PresetRow
        presets={textPresets}
        onApply={(id) => applyTextPreset(id, layer.id)}
        onSave={(name) => addTextPreset(name, extractTextStyle(layer))}
        onRemove={removeTextPreset}
      />
      <Row label="テキスト">
        <TextArea value={layer.text} onChange={(text) => patch({ text })} />
      </Row>
      <Row label="フォント">
        <Select
          value={layer.fontFamily}
          options={fonts.map((f) => ({ label: f.label, value: f.family }))}
          onChange={(fontFamily) => patch({ fontFamily })}
        />
      </Row>
      <FontLoader />
      <div className={styles.pair}>
        <Row label="サイズ">
          <NumberInput
            value={layer.fontSize}
            min={4}
            onChange={(fontSize) => patch({ fontSize })}
          />
        </Row>
        <Row label="太さ">
          <Select
            value={layer.fontWeight}
            options={FONT_WEIGHTS.map((w) => ({ label: String(w), value: w }))}
            onChange={(fontWeight) => patch({ fontWeight })}
          />
        </Row>
      </div>
      <Row label="揃え">
        <SegmentedControl<TextAlign>
          value={layer.textAlign}
          options={[
            { label: '左', value: 'left' },
            { label: '中央', value: 'center' },
            { label: '右', value: 'right' },
          ]}
          onChange={(textAlign) => patch({ textAlign })}
        />
      </Row>
      <div className={styles.pair}>
        <Row label="字間">
          <NumberInput
            value={layer.letterSpacing}
            step={0.5}
            onChange={(letterSpacing) => patch({ letterSpacing })}
          />
        </Row>
        <Row label="行間">
          <NumberInput
            value={layer.lineHeight}
            step={0.1}
            min={0.5}
            onChange={(lineHeight) => patch({ lineHeight })}
          />
        </Row>
      </div>
      <Row label="斜体">
        <SegmentedControl
          value={layer.fontStyle}
          options={[
            { label: 'なし', value: 'normal' },
            { label: '斜体', value: 'italic' },
          ]}
          onChange={(fontStyle) => patch({ fontStyle })}
        />
      </Row>
      <Row label="色">
        <ColorInput value={layer.color} onChange={(color) => patch({ color })} />
      </Row>
      <Row label="縁取り">
        <NumberInput
          value={layer.strokeWidth}
          min={0}
          step={0.5}
          onChange={(strokeWidth) => patch({ strokeWidth })}
        />
      </Row>
      {layer.strokeWidth > 0 && (
        <Row label="縁の色">
          <ColorInput
            value={layer.strokeColor}
            onChange={(strokeColor) => patch({ strokeColor })}
          />
        </Row>
      )}
    </>
  )
}
