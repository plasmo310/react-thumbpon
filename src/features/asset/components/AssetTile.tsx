import { useState } from 'react'
import type { AssetMeta } from '@/domain/asset'
import { useEditorStore } from '@/app/store'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE } from '@/shared/lib/dnd'
import { getAssetUrl } from '@/shared/lib/storage/assetRepo'
import styles from '../styles.module.css'

/**
 * 素材1つ分のタイル。クリックで中央に配置、キャンバスへドラッグでその位置に配置できる。
 * 同じドラッグをフォルダの上で落とすと、そのフォルダへの移動になる。
 *
 * @param props.asset 表示する素材のメタ情報
 */
export function AssetTile({ asset }: { asset: AssetMeta }) {
  const addImageLayer = useEditorStore((s) => s.addImageLayer)
  const removeAsset = useEditorStore((s) => s.removeAsset)
  const reorderAsset = useEditorStore((s) => s.reorderAsset)
  const url = getAssetUrl(asset.id)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null)

  return (
    <div
      className={cx(
        styles.tile,
        dropPosition === 'before' && styles.tileDropBefore,
        dropPosition === 'after' && styles.tileDropAfter,
      )}
    >
      <button
        type="button"
        title={`${asset.name}（クリックで中央に配置 / キャンバスかフォルダへドラッグ）`}
        onClick={() => addImageLayer(asset.id)}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DND_TYPE.asset, asset.id)
          // フォルダへ移す場合もあるので、コピー専用にはしない
          event.dataTransfer.effectAllowed = 'copyMove'
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(DND_TYPE.asset)) return
          event.preventDefault()
          event.stopPropagation()
          const rect = event.currentTarget.getBoundingClientRect()
          setDropPosition(event.clientY > rect.top + rect.height / 2 ? 'after' : 'before')
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDropPosition(null)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          const id = event.dataTransfer.getData(DND_TYPE.asset)
          if (id && dropPosition) void reorderAsset(id, asset.id, dropPosition)
          setDropPosition(null)
        }}
        onDragEnd={() => setDropPosition(null)}
        className={styles.tileButton}
      >
        {url && <img src={url} alt={asset.name} className={styles.thumb} draggable={false} />}
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
}
