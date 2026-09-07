import { useEditorStore } from '../store/editorStore'
import {
  FONT_OPTIONS,
  FONT_WEIGHTS,
  type BackgroundFit,
  type BackgroundType,
  type Layer,
  type TextAlign,
} from '../types/editor'
import {
  ColorInput,
  NumberInput,
  Row,
  SegmentedControl,
  Select,
  Slider,
  TextArea,
  TextInput,
} from './ui/Field'

const wrapper = 'flex flex-col gap-2 border-t border-line bg-app px-3 py-3'

export function LayerProperties({ layer }: { layer: Layer }) {
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const patch = (values: Partial<Layer>) => updateLayer(layer.id, values)

  return (
    <div className={wrapper}>
      <Row label="名前">
        <TextInput value={layer.name} onChange={(name) => patch({ name })} />
      </Row>
      <div className="flex gap-2">
        <Row label="X">
          <NumberInput value={layer.x} onChange={(x) => patch({ x })} />
        </Row>
        <Row label="Y">
          <NumberInput value={layer.y} onChange={(y) => patch({ y })} />
        </Row>
      </div>
      <div className="flex gap-2">
        <Row label="幅">
          <NumberInput value={layer.width} min={1} onChange={(width) => patch({ width })} />
        </Row>
        {layer.type === 'image' ? (
          <Row label="高さ">
            <NumberInput
              value={layer.height}
              min={1}
              onChange={(height) => updateLayer(layer.id, { height })}
            />
          </Row>
        ) : (
          <Row label="回転">
            <NumberInput value={layer.rotation} onChange={(rotation) => patch({ rotation })} />
          </Row>
        )}
      </div>
      {layer.type === 'image' && (
        <Row label="回転">
          <NumberInput value={layer.rotation} onChange={(rotation) => patch({ rotation })} />
        </Row>
      )}
      <Row label="不透明度">
        <Slider
          value={Math.round(layer.opacity * 100)}
          min={0}
          max={100}
          onChange={(value) => patch({ opacity: value / 100 })}
        />
        <span className="w-8 shrink-0 text-right text-[11px] text-ink-sub">
          {Math.round(layer.opacity * 100)}%
        </span>
      </Row>

      {layer.type === 'text' && (
        <>
          <div className="mt-1 border-t border-line pt-2" />
          <Row label="テキスト">
            <TextArea value={layer.text} onChange={(text) => updateLayer(layer.id, { text })} />
          </Row>
          <Row label="フォント">
            <Select
              value={layer.fontFamily}
              options={FONT_OPTIONS.map((f) => ({ label: f.label, value: f.value }))}
              onChange={(fontFamily) => updateLayer(layer.id, { fontFamily })}
            />
          </Row>
          <div className="flex gap-2">
            <Row label="サイズ">
              <NumberInput
                value={layer.fontSize}
                min={4}
                onChange={(fontSize) => updateLayer(layer.id, { fontSize })}
              />
            </Row>
            <Row label="太さ">
              <Select
                value={layer.fontWeight}
                options={FONT_WEIGHTS.map((w) => ({ label: String(w), value: w }))}
                onChange={(fontWeight) => updateLayer(layer.id, { fontWeight })}
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
              onChange={(textAlign) => updateLayer(layer.id, { textAlign })}
            />
          </Row>
          <div className="flex gap-2">
            <Row label="字間">
              <NumberInput
                value={layer.letterSpacing}
                step={0.5}
                onChange={(letterSpacing) => updateLayer(layer.id, { letterSpacing })}
              />
            </Row>
            <Row label="行間">
              <NumberInput
                value={layer.lineHeight}
                step={0.1}
                min={0.5}
                onChange={(lineHeight) => updateLayer(layer.id, { lineHeight })}
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
              onChange={(fontStyle) => updateLayer(layer.id, { fontStyle })}
            />
          </Row>
          <Row label="色">
            <ColorInput value={layer.color} onChange={(color) => updateLayer(layer.id, { color })} />
          </Row>
        </>
      )}
    </div>
  )
}

export function BackgroundProperties() {
  const background = useEditorStore((s) => s.background)
  const setBackground = useEditorStore((s) => s.setBackground)
  const assets = useEditorStore((s) => s.assets)

  return (
    <div className={wrapper}>
      <Row label="種類">
        <SegmentedControl<BackgroundType>
          value={background.type}
          options={[
            { label: '単色', value: 'color' },
            { label: 'グラデ', value: 'gradient' },
            { label: '画像', value: 'image' },
          ]}
          onChange={(type) => setBackground({ type })}
        />
      </Row>

      {background.type === 'color' && (
        <Row label="色">
          <ColorInput value={background.color} onChange={(color) => setBackground({ color })} />
        </Row>
      )}

      {background.type === 'gradient' && (
        <>
          <Row label="開始色">
            <ColorInput
              value={background.gradientFrom}
              onChange={(gradientFrom) => setBackground({ gradientFrom })}
            />
          </Row>
          <Row label="終了色">
            <ColorInput
              value={background.gradientTo}
              onChange={(gradientTo) => setBackground({ gradientTo })}
            />
          </Row>
          <Row label="角度">
            <Slider
              value={background.gradientAngle}
              min={0}
              max={360}
              onChange={(gradientAngle) => setBackground({ gradientAngle })}
            />
            <span className="w-8 shrink-0 text-right text-[11px] text-ink-sub">
              {background.gradientAngle}°
            </span>
          </Row>
        </>
      )}

      {background.type === 'image' && (
        <>
          <Row label="画像">
            <Select
              value={background.assetId ?? ''}
              options={[
                { label: '未選択', value: '' },
                ...assets.map((a) => ({ label: a.name, value: a.id })),
              ]}
              onChange={(assetId) => setBackground({ assetId: assetId === '' ? null : assetId })}
            />
          </Row>
          <Row label="表示">
            <SegmentedControl<BackgroundFit>
              value={background.fit}
              options={[
                { label: 'cover', value: 'cover' },
                { label: 'contain', value: 'contain' },
              ]}
              onChange={(fit) => setBackground({ fit })}
            />
          </Row>
          <Row label="位置">
            <Select
              value={background.position}
              options={[
                { label: '中央', value: 'center' },
                { label: '上', value: 'top' },
                { label: '下', value: 'bottom' },
                { label: '左', value: 'left' },
                { label: '右', value: 'right' },
              ]}
              onChange={(position) => setBackground({ position })}
            />
          </Row>
          <Row label="下地色">
            <ColorInput value={background.color} onChange={(color) => setBackground({ color })} />
          </Row>
        </>
      )}
    </div>
  )
}
