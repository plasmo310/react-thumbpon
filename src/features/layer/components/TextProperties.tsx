import { PresetRow } from './PresetRow'
import { extractTextStyle } from '@/domain/layer'
import { useEditorStore } from '@/app/store'
import { FONT_WEIGHTS } from '@/domain/font'
import type { TextAlign, TextLayer } from '@/domain/layer'
import { insertionStyle, textSegments } from '@/domain/text'
import type { InlineTextStyle } from '@/domain/text'
import {
  ColorInput,
  NumberInput,
  PercentRow,
  Row,
  SegmentedControl,
  Select,
  RichTextInput,
  Button,
} from '@/shared/ui'
import { FontLoader } from './FontLoader'
import styles from '../styles.module.css'

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
  const editing = useEditorStore((s) => s.textEditing)
  const beginTextEditing = useEditorStore((s) => s.beginTextEditing)
  const endTextEditing = useEditorStore((s) => s.endTextEditing)
  const selectTextRange = useEditorStore((s) => s.selectTextRange)
  const setTextFormatTarget = useEditorStore((s) => s.setTextFormatTarget)
  const updateTextContent = useEditorStore((s) => s.updateTextContent)
  const formatText = useEditorStore((s) => s.formatText)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const recordHistory = useEditorStore((s) => s.recordHistory)
  const session = editing?.layerId === layer.id ? editing : null
  const partial = session?.target === 'selection'
  const selected =
    session && session.range.start !== session.range.end
      ? textSegments(layer)
          .filter((part) => part.start < session.range.end && part.end > session.range.start)
          .map((part) => ({ ...layer, ...part.style }))
      : [
          {
            ...layer,
            ...(session
              ? (session.pendingStyle ?? insertionStyle(layer, session.range.start))
              : {}),
          },
        ]
  const value = partial ? (selected[0] ?? layer) : layer
  const mixed = (key: keyof InlineTextStyle) =>
    !!partial && selected.some((part) => part[key] !== value[key])
  const label = (name: string, key: keyof InlineTextStyle) =>
    mixed(key) ? `${name}（混在）` : name
  const format = (style: InlineTextStyle) => formatText(layer.id, style)
  const patch = (values: Partial<TextLayer>) => {
    recordHistory()
    updateLayer(layer.id, values)
  }

  return (
    <div data-text-properties={layer.id}>
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
        <RichTextInput
          value={layer}
          previewStyle={extractTextStyle(layer)}
          editable
          disabled={layer.locked}
          active={session?.surface === 'properties'}
          selection={session?.surface === 'properties' ? session.range : undefined}
          revision={session?.surface === 'properties' ? session.revision : undefined}
          pendingStyle={session?.pendingStyle}
          onActivate={() => beginTextEditing(layer.id, 'properties')}
          onSelectionChange={selectTextRange}
          onChange={(content, range, kind) => updateTextContent(layer.id, content, range, kind)}
          onFinish={endTextEditing}
          onUndo={undo}
          onRedo={redo}
        />
      </Row>
      <Row label="適用先">
        <SegmentedControl
          value={session?.target ?? 'whole'}
          options={[
            { label: '全体', value: 'whole' },
            { label: '選択部分', value: 'selection' },
          ]}
          onChange={(target) => {
            if (!session) beginTextEditing(layer.id, 'properties')
            setTextFormatTarget(target)
          }}
        />
      </Row>
      {partial && session && (
        <Row label="対象">
          {session.range.start === session.range.end
            ? '次に入力する文字'
            : `「${layer.text.slice(session.range.start, session.range.end)}」`}
        </Row>
      )}
      <Row label={label('フォント', 'fontFamily')}>
        <Select
          value={value.fontFamily}
          mixed={mixed('fontFamily')}
          options={fonts.map((f) => ({ label: f.label, value: f.family }))}
          onChange={(fontFamily) => format({ fontFamily })}
        />
      </Row>
      <FontLoader />
      <div className={styles.pair}>
        <Row label={label('サイズ', 'fontSize')}>
          <NumberInput
            value={value.fontSize}
            mixed={mixed('fontSize')}
            min={4}
            onChange={(fontSize) => format({ fontSize: Math.max(4, fontSize) })}
          />
        </Row>
        <Row label={label('太さ', 'fontWeight')}>
          <Select
            value={value.fontWeight}
            mixed={mixed('fontWeight')}
            options={FONT_WEIGHTS.map((w) => ({ label: String(w), value: w }))}
            onChange={(fontWeight) => format({ fontWeight })}
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
      <Row label={label('斜体', 'fontStyle')}>
        <SegmentedControl
          value={mixed('fontStyle') ? '' : value.fontStyle}
          options={[
            { label: 'なし', value: 'normal' },
            { label: '斜体', value: 'italic' },
          ]}
          onChange={(fontStyle) => format({ fontStyle: fontStyle as TextLayer['fontStyle'] })}
        />
      </Row>
      <Row label={label('色', 'color')}>
        <ColorInput
          value={value.color}
          mixed={mixed('color')}
          onChange={(color) => format({ color })}
        />
      </Row>
      <Row label={label('縁取り', 'strokeWidth')}>
        <NumberInput
          value={value.strokeWidth}
          mixed={mixed('strokeWidth')}
          min={0}
          step={0.5}
          onChange={(strokeWidth) => format({ strokeWidth: Math.max(0, strokeWidth) })}
        />
      </Row>
      {(value.strokeWidth > 0 || mixed('strokeWidth')) && (
        <Row label={label('縁の色', 'strokeColor')}>
          <ColorInput
            value={value.strokeColor}
            mixed={mixed('strokeColor')}
            onChange={(strokeColor) => format({ strokeColor })}
          />
        </Row>
      )}
      <Row label="部分書式">
        <Button onClick={() => formatText(layer.id, null)}>部分書式を解除</Button>
      </Row>
    </div>
  )
}
