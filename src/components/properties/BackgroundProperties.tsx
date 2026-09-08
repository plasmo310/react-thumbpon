import { useCurrentThumbnail, useEditorStore } from '../../store'
import type { BackgroundFit, BackgroundType } from '../../types'
import { ColorInput, Row, SegmentedControl, Select, Slider } from '../ui'
import { PresetRow } from './PresetRow'
import { panelBody } from './styles'

/**
 * 背景のプロパティ欄。
 * 種別を切り替えても設定は消えないので、表示だけを種別で出し分ける。
 */
export function BackgroundProperties() {
  const { background } = useCurrentThumbnail()
  const setBackground = useEditorStore((s) => s.setBackground)
  const assets = useEditorStore((s) => s.assets)
  const backgroundPresets = useEditorStore((s) => s.backgroundPresets)
  const addBackgroundPreset = useEditorStore((s) => s.addBackgroundPreset)
  const applyBackgroundPreset = useEditorStore((s) => s.applyBackgroundPreset)
  const removeBackgroundPreset = useEditorStore((s) => s.removeBackgroundPreset)

  return (
    <div className={panelBody}>
      <PresetRow
        presets={backgroundPresets}
        onApply={applyBackgroundPreset}
        onSave={addBackgroundPreset}
        onRemove={removeBackgroundPreset}
      />
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
