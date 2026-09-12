import { createId } from '../../lib/core/factory'
import { deleteAsset, loadAssets, readImageSize, saveAsset } from '../../lib/storage/assetRepo'
import type { AssetMeta } from '../../types'
import type { SliceCreator } from '../types'

export type AssetSlice = {
  /** 素材のメタ情報だけを持つ。画像の実体は IndexedDB 側にある */
  assets: AssetMeta[]

  initAssets: () => Promise<void>
  addAssetFiles: (files: File[]) => Promise<AssetMeta[]>
  removeAsset: (id: string) => Promise<void>
}

/** アップロードした素材画像の管理。実体の読み書きは assetRepo に任せる */
export const createAssetSlice: SliceCreator<AssetSlice> = (set, get) => ({
  assets: [],

  /** 保存済みの素材を読み込んで一覧に反映する */
  initAssets: async () => {
    const assets = await loadAssets()
    set({ assets })
  },

  /**
   * 画像ファイルを素材として取り込む。
   *
   * @param files 取り込むファイル。画像以外は読み飛ばす
   * @returns 実際に追加できた素材のメタ情報。呼び出し側でそのままレイヤー化できる
   */
  addAssetFiles: async (files) => {
    const added: AssetMeta[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const { width, height } = await readImageSize(file)
      const meta: AssetMeta = {
        id: createId(),
        name: file.name,
        mime: file.type,
        width,
        height,
        createdAt: Date.now(),
      }
      const assets = [...get().assets, meta]
      await saveAsset(meta, file, assets)
      set({ assets })
      added.push(meta)
    }
    return added
  },

  /**
   * 素材を削除する。参照が切れて表示が壊れないよう、
   * その素材を使っている画像レイヤーと背景も同時に外す。
   *
   * @param id 削除する素材の id
   */
  removeAsset: async (id) => {
    const assets = get().assets.filter((a) => a.id !== id)
    await deleteAsset(id, assets)
    set({
      assets,
      thumbnails: get().thumbnails.map((t) => ({
        ...t,
        layers: t.layers.filter((l) => l.type !== 'image' || l.assetId !== id),
        background: t.background.assetId === id ? { ...t.background, assetId: null } : t.background,
      })),
    })
  },
})
