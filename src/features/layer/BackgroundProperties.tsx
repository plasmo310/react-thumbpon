import { useCurrentThumbnail, useEditorStore } from '@/core/store'
import { panelBody } from '@/styles'
import type { BackgroundFit, BackgroundType, PatternType } from '@/core/model/types'
import { EffectsSection } from '@/shared/ui'
import { ColorInput, NumberInput, Row, Select, Slider } from '@/shared/ui'
import { PresetRow } from '@/shared/ui'

/** 背景の種別。4つあり「グラデーション」も入るため、横並びではなくドロップダウンで出す */
const TYPE_OPTIONS: { label: string; value: BackgroundType }[] = [
  { label: '単色', value: 'color' },
  { label: 'グラデーション', value: 'gradient' },
  { label: '画像', value: 'image' },
  { label: 'パターン', value: 'pattern' },
]

/** 画像の敷き方。240px まで縮むサイドバーでは横並びだと文字が入りきらないので Select にする */
const FIT_OPTIONS: { label: string; value: BackgroundFit }[] = [
  { label: 'cover（全体を覆う）', value: 'cover' },
  { label: 'contain（全体を収める）', value: 'contain' },
  { label: 'タイル（繰り返す）', value: 'tile' },
]

const PATTERN_OPTIONS: { label: string; value: PatternType }[] = [
  { label: '水玉', value: 'dots' },
  { label: 'ライン', value: 'lines' },
  { label: 'チェック', value: 'checker' },
]

/**
 * 背景のプロパティ欄。
 * 種別を切り替えても設定は消えないので、表示だけを種別で出し分ける。
 * エフェクトは下地色を除いた絵柄（画像・グラデーション・模様）に掛かるので、
 * 絵柄を持たない単色のときだけ欄を出さない。
 */
export function BackgroundProperties() {
  const { background } = useCurrentThumbnail()
  const setBackground = useEditorStore((s) => s.setBackground)
  const setBackgroundEffects = useEditorStore((s) => s.setBackgroundEffects)
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
        <Select<BackgroundType>
          value={background.type}
          options={TYPE_OPTIONS}
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
          <Row label="敷き方">
            <Select<BackgroundFit>
              value={background.fit}
              options={FIT_OPTIONS}
              onChange={(fit) => setBackground({ fit })}
            />
          </Row>
          {background.fit === 'tile' ? (
            <Row label="タイル幅">
              <NumberInput
                value={background.tileWidth}
                min={2}
                onChange={(tileWidth) => setBackground({ tileWidth })}
              />
            </Row>
          ) : (
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
          )}
          <Row label="下地色">
            <ColorInput value={background.color} onChange={(color) => setBackground({ color })} />
          </Row>
        </>
      )}

      {background.type === 'pattern' && (
        <>
          <Row label="模様">
            <Select<PatternType>
              value={background.pattern}
              options={PATTERN_OPTIONS}
              onChange={(pattern) => setBackground({ pattern })}
            />
          </Row>

          <Row label="間隔">
            <NumberInput
              value={background.patternSize}
              min={2}
              onChange={(patternSize) => setBackground({ patternSize })}
            />
          </Row>

          <Row label="模様の色">
            <ColorInput
              value={background.patternColor}
              onChange={(patternColor) => setBackground({ patternColor })}
            />
          </Row>

          {background.pattern !== 'checker' && (
            <Row label="太さ">
              <Slider
                value={background.patternWeight}
                min={0.05}
                max={0.95}
                step={0.05}
                onChange={(patternWeight) => setBackground({ patternWeight })}
              />
              <span className="w-8 shrink-0 text-right text-[11px] text-ink-sub">
                {Math.round(background.patternWeight * 100)}%
              </span>
            </Row>
          )}

          {background.pattern === 'lines' && (
            <Row label="角度">
              <Slider
                value={background.patternAngle}
                min={0}
                max={180}
                onChange={(patternAngle) => setBackground({ patternAngle })}
              />
              <span className="w-8 shrink-0 text-right text-[11px] text-ink-sub">
                {background.patternAngle}°
              </span>
            </Row>
          )}

          <Row label="下地色">
            <ColorInput value={background.color} onChange={(color) => setBackground({ color })} />
          </Row>
        </>
      )}

      {/* 単色は絵柄を持たず何も変わらないので、死んだ操作を並べない（設定自体は残る） */}
      {background.type !== 'color' && (
        <EffectsSection effects={background.effects} onChange={setBackgroundEffects} />
      )}
    </div>
  )
}
