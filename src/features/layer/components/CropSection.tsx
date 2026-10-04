import { useTranslation } from '@/shared/lib/i18n'
import { DEFAULT_CROP, MAX_CROP, croppedRatio, isCropped } from '@/domain/crop'
import type { ImageLayer } from '@/domain/layer'
import { useEditorStore } from '@/app/store'
import { Button, PercentRow } from '@/shared/ui'
import styles from '../styles.module.css'

/**
 * 画像の表示範囲(クロップ)の設定欄。
 * 主な操作はキャンバスで枠を掴んで詰めることなので、ここはその開始と、
 * 数値で詰めたいとき・元に戻したいときの受け皿にする。
 *
 * @param props.layer 編集対象の画像レイヤー
 */
export function CropSection({ layer }: { layer: ImageLayer }) {
  const t = useTranslation()

  const cropping = useEditorStore((s) => s.cropping)
  const setCropping = useEditorStore((s) => s.setCropping)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const updateLayerCrop = useEditorStore((s) => s.updateLayerCrop)
  const asset = useEditorStore((s) => s.assets.find((a) => a.id === layer.assetId))

  const { crop } = layer

  /** 残った部分が引き伸ばされないよう、枠の高さを表示範囲の縦横比に合わせる */
  const fitToRatio = () => {
    if (!asset) return
    updateLayer(layer.id, {
      height: Math.max(1, Math.round(layer.width / croppedRatio(asset, crop))),
    })
  }

  return (
    <>
      <div className={styles.divider} />
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{t('クロップ')}</span>
        <Button
          onClick={() => setCropping(!cropping)}
          title={t('キャンバス上の枠を掴んで表示範囲を詰める')}
        >
          {cropping ? t('調整を終える') : t('枠で調整')}
        </Button>
        <Button
          onClick={fitToRatio}
          disabled={!asset}
          title={t('枠の高さを表示範囲の比率に合わせる')}
        >
          {t('比率')}
        </Button>
        <Button
          onClick={() => updateLayerCrop(layer.id, DEFAULT_CROP)}
          disabled={!isCropped(crop)}
          title={t('画像全体を表示する')}
        >
          {t('解除')}
        </Button>
      </div>

      <PercentRow
        label={t('上を切る')}
        value={crop.top}
        max={MAX_CROP - crop.bottom}
        onChange={(top) => updateLayerCrop(layer.id, { top })}
      />
      <PercentRow
        label={t('下を切る')}
        value={crop.bottom}
        max={MAX_CROP - crop.top}
        onChange={(bottom) => updateLayerCrop(layer.id, { bottom })}
      />
      <PercentRow
        label={t('左を切る')}
        value={crop.left}
        max={MAX_CROP - crop.right}
        onChange={(left) => updateLayerCrop(layer.id, { left })}
      />
      <PercentRow
        label={t('右を切る')}
        value={crop.right}
        max={MAX_CROP - crop.left}
        onChange={(right) => updateLayerCrop(layer.id, { right })}
      />
    </>
  )
}
