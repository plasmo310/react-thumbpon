import { getAssetUrl } from '@/core/storage/assetRepo'
import { useEditorStore } from '@/core/store'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE } from '@/shared/lib/dnd'
import { notifyError } from '@/shared/lib/notify'
import { useDropTarget } from '@/shared/lib/useDropTarget'
import { Panel, useFilePicker } from '@/shared/ui'
import styles from './asset.module.css'

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml'

/** 取り込んだ素材の一覧。キャンバスへのドラッグ元でもある */
export function AssetPanel() {
  const assets = useEditorStore((s) => s.assets)
  const addAssetFiles = useEditorStore((s) => s.addAssetFiles)
  const removeAsset = useEditorStore((s) => s.removeAsset)
  const addImageLayer = useEditorStore((s) => s.addImageLayer)

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return
    try {
      const added = await addAssetFiles(Array.from(files))
      if (added.length === 0) {
        window.alert('画像ファイル（PNG / JPEG / WebP / SVG）を選んでください')
      }
    } catch (error) {
      notifyError('素材の追加に失敗しました', error)
    }
  }

  const picker = useFilePicker(ACCEPT, (files) => void handleFiles(files), true)
  const { over, dropProps } = useDropTarget([DND_TYPE.files], (event) =>
    handleFiles(event.dataTransfer.files),
  )

  return (
    <Panel
      title="素材"
      actions={<span className={styles.count}>{assets.length}件</span>}
      section={{ ...dropProps, className: cx(over && styles.dropping) }}
    >
      <div className={styles.grid}>
        {assets.map((asset) => {
          const url = getAssetUrl(asset.id)
          return (
            <div key={asset.id} className={styles.tile}>
              <button
                type="button"
                title={`${asset.name}（クリックで中央に配置 / キャンバスへドラッグ）`}
                onClick={() => addImageLayer(asset.id)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(DND_TYPE.asset, asset.id)
                  event.dataTransfer.effectAllowed = 'copy'
                }}
                className={styles.tileButton}
              >
                {url && (
                  <img src={url} alt={asset.name} className={styles.thumb} draggable={false} />
                )}
              </button>
              <button
                type="button"
                title="素材を削除"
                onClick={() => void removeAsset(asset.id)}
                className={styles.remove}
              >
                ✕
              </button>
            </div>
          )
        })}

        <button type="button" onClick={picker.open} className={styles.add}>
          ＋ 追加
        </button>
      </div>

      {assets.length === 0 && (
        <p className={styles.empty}>画像をここにドロップしても追加できます</p>
      )}

      {picker.element}
    </Panel>
  )
}
