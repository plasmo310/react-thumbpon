import { useTranslation } from '@/shared/lib/i18n'
import { useEditorStore } from '@/app/store'
import type { ImageLayer } from '@/domain/layer'
import { NumberInput, PercentRow, Row, Select } from '@/shared/ui'
import { CropSection } from './CropSection'
import styles from '../styles.module.css'

/**
 * 画像レイヤー固有のプロパティ。画像は height を持つので幅と高さを並べて出す。
 * 表示範囲(クロップ)は画像だけの設定なのでここに置く。
 *
 * @param props.layer 編集対象の画像レイヤー
 */
export function ImageProperties({ layer }: { layer: ImageLayer }) {
  const t = useTranslation()

  const updateLayer = useEditorStore((s) => s.updateLayer)
  const assets = useEditorStore((s) => s.assets)

  return (
    <>
      <Row label={t('画像')}>
        <Select
          value={layer.assetId}
          options={assets.map((asset) => ({ label: asset.name, value: asset.id }))}
          onChange={(assetId) => updateLayer(layer.id, { assetId })}
        />
      </Row>
      <div className={styles.pair}>
        <Row label={t('幅')}>
          <NumberInput
            value={layer.width}
            min={1}
            onChange={(width) => updateLayer(layer.id, { width })}
          />
        </Row>
        <Row label={t('高さ')}>
          <NumberInput
            value={layer.height}
            min={1}
            onChange={(height) => updateLayer(layer.id, { height })}
          />
        </Row>
      </div>
      <Row label={t('回転')}>
        <NumberInput
          value={layer.rotation}
          onChange={(rotation) => updateLayer(layer.id, { rotation })}
        />
      </Row>
      <Row label={t('反転')}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={layer.flipX}
            onChange={(e) => updateLayer(layer.id, { flipX: e.target.checked })}
          />
          {t('左右')}
        </label>
      </Row>
      <PercentRow
        label={t('不透明度')}
        value={layer.opacity}
        onChange={(opacity) => updateLayer(layer.id, { opacity })}
      />
      <CropSection layer={layer} />
    </>
  )
}
