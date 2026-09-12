import type { AssetMeta } from '@/domain/asset'
import { useEditorStore } from '@/app/store'
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
  const url = getAssetUrl(asset.id)

  return (
    <div className={styles.tile}>
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
