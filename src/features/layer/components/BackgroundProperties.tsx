import { useTranslation } from '@/shared/lib/i18n'
import { PresetRow } from './PresetRow'
import { EffectsSection } from './EffectsSection'
import { useCurrentThumbnail, useEditorStore } from '@/app/store'
import type { BackgroundFit, BackgroundType, PatternType } from '@/domain/background'
import { ColorInput, NumberInput, PercentRow, Row, Select, SliderRow } from '@/shared/ui'
import styles from '../styles.module.css'

/** 背景の種別。4つあり「グラデーション」も入るため、横並びではなくドロップダウンで出す */
const typeOptions = (
  t: ReturnType<typeof useTranslation>,
): { label: string; value: BackgroundType }[] => [
  { label: t('単色'), value: 'color' },
  { label: t('グラデーション'), value: 'gradient' },
  { label: t('画像'), value: 'image' },
  { label: t('パターン'), value: 'pattern' },
]

/** 画像の敷き方。240px まで縮むサイドバーでは横並びだと文字が入りきらないので Select にする */
const fitOptions = (
  t: ReturnType<typeof useTranslation>,
): { label: string; value: BackgroundFit }[] => [
  { label: t('cover（全体を覆う）'), value: 'cover' },
  { label: t('contain（全体を収める）'), value: 'contain' },
  { label: t('タイル（繰り返す）'), value: 'tile' },
]

const patternOptions = (
  t: ReturnType<typeof useTranslation>,
): { label: string; value: PatternType }[] => [
  { label: t('水玉'), value: 'dots' },
  { label: t('ライン'), value: 'lines' },
  { label: t('チェック'), value: 'checker' },
]

/**
 * 背景のプロパティ欄。
 * 種別を切り替えても設定は消えないので、表示だけを種別で出し分ける。
 * エフェクトは下地色を除いた絵柄（画像・グラデーション・模様）に掛かるので、
 * 絵柄を持たない単色のときだけ欄を出さない。
 */
export function BackgroundProperties() {
  const t = useTranslation()

  const { background } = useCurrentThumbnail()
  const setBackground = useEditorStore((s) => s.setBackground)
  const setBackgroundEffects = useEditorStore((s) => s.setBackgroundEffects)
  const assets = useEditorStore((s) => s.assets)
  const backgroundPresets = useEditorStore((s) => s.backgroundPresets)
  const addBackgroundPreset = useEditorStore((s) => s.addBackgroundPreset)
  const applyBackgroundPreset = useEditorStore((s) => s.applyBackgroundPreset)
  const removeBackgroundPreset = useEditorStore((s) => s.removeBackgroundPreset)

  return (
    <div className={styles.properties}>
      <PresetRow
        presets={backgroundPresets}
        onApply={applyBackgroundPreset}
        onSave={addBackgroundPreset}
        onRemove={removeBackgroundPreset}
      />
      <Row label={t('種類')}>
        <Select<BackgroundType>
          value={background.type}
          options={typeOptions(t)}
          onChange={(type) => setBackground({ type })}
        />
      </Row>

      {background.type === 'color' && (
        <Row label={t('色')}>
          <ColorInput value={background.color} onChange={(color) => setBackground({ color })} />
        </Row>
      )}

      {background.type === 'gradient' && (
        <>
          <Row label={t('開始色')}>
            <ColorInput
              value={background.gradientFrom}
              onChange={(gradientFrom) => setBackground({ gradientFrom })}
            />
          </Row>
          <Row label={t('終了色')}>
            <ColorInput
              value={background.gradientTo}
              onChange={(gradientTo) => setBackground({ gradientTo })}
            />
          </Row>
          <SliderRow
            label={t('角度')}
            value={background.gradientAngle}
            min={0}
            max={360}
            unit="°"
            onChange={(gradientAngle) => setBackground({ gradientAngle })}
          />
        </>
      )}

      {background.type === 'image' && (
        <>
          <Row label={t('画像')}>
            <Select
              value={background.assetId ?? ''}
              options={[
                { label: t('未選択'), value: '' },
                ...assets.map((a) => ({ label: a.name, value: a.id })),
              ]}
              onChange={(assetId) => setBackground({ assetId: assetId === '' ? null : assetId })}
            />
          </Row>
          <Row label={t('敷き方')}>
            <Select<BackgroundFit>
              value={background.fit}
              options={fitOptions(t)}
              onChange={(fit) => setBackground({ fit })}
            />
          </Row>
          {background.fit === 'tile' ? (
            <Row label={t('タイル幅')}>
              <NumberInput
                value={background.tileWidth}
                min={2}
                onChange={(tileWidth) => setBackground({ tileWidth })}
              />
            </Row>
          ) : (
            <Row label={t('位置')}>
              <Select
                value={background.position}
                options={[
                  { label: t('中央'), value: 'center' },
                  { label: t('上'), value: 'top' },
                  { label: t('下'), value: 'bottom' },
                  { label: t('左'), value: 'left' },
                  { label: t('右'), value: 'right' },
                ]}
                onChange={(position) => setBackground({ position })}
              />
            </Row>
          )}
          <Row label={t('下地色')}>
            <ColorInput value={background.color} onChange={(color) => setBackground({ color })} />
          </Row>
        </>
      )}

      {background.type === 'pattern' && (
        <>
          <Row label={t('模様')}>
            <Select<PatternType>
              value={background.pattern}
              options={patternOptions(t)}
              onChange={(pattern) => setBackground({ pattern })}
            />
          </Row>

          <Row label={t('間隔')}>
            <NumberInput
              value={background.patternSize}
              min={2}
              onChange={(patternSize) => setBackground({ patternSize })}
            />
          </Row>

          <Row label={t('模様の色')}>
            <ColorInput
              value={background.patternColor}
              onChange={(patternColor) => setBackground({ patternColor })}
            />
          </Row>

          {background.pattern !== 'checker' && (
            <PercentRow
              label={t('太さ')}
              value={background.patternWeight}
              min={0.05}
              max={0.95}
              step={0.05}
              onChange={(patternWeight) => setBackground({ patternWeight })}
            />
          )}

          {background.pattern === 'lines' && (
            <SliderRow
              label={t('角度')}
              value={background.patternAngle}
              min={0}
              max={180}
              unit="°"
              onChange={(patternAngle) => setBackground({ patternAngle })}
            />
          )}

          <Row label={t('下地色')}>
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
