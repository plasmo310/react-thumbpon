import { createAssetFolder, normalizeAssets } from '@/domain/asset'
import { createId } from '@/domain/id'
import {
  deleteAsset,
  loadAssetLibrary,
  readImageSize,
  saveAsset,
  saveAssetFolders,
  saveAssetMetas,
} from '@/shared/lib/storage/assetRepo'
import type { AssetFolder, AssetMeta } from '@/domain/asset'
import type { SliceCreator } from './index'

export type AssetSlice = {
  /** 素材のメタ情報だけを持つ。画像の実体は IndexedDB 側にある */
  assets: AssetMeta[]
  /** 素材をまとめるフォルダ。書き出したときのフォルダ分けにもなる */
  assetFolders: AssetFolder[]

  initAssets: () => Promise<void>
  addAssetFiles: (files: File[], folderId?: string | null) => Promise<AssetMeta[]>
  removeAsset: (id: string) => Promise<void>
  moveAssetToFolder: (id: string, folderId: string | null) => Promise<void>
  reorderAsset: (id: string, targetId: string, position: 'before' | 'after') => Promise<void>

  addAssetFolder: () => Promise<void>
  renameAssetFolder: (id: string, name: string) => Promise<void>
  reorderAssetFolder: (id: string, targetId: string, position: 'before' | 'after') => Promise<void>
  toggleAssetFolder: (id: string) => Promise<void>
  removeAssetFolder: (id: string) => Promise<void>
}

/** アップロードした素材画像の管理。実体の読み書きは assetRepo に任せる */
export const createAssetSlice: SliceCreator<AssetSlice> = (set, get) => {
  /**
   * フォルダ一覧を差し替えて保存する。
   * 素材はプロジェクトとは別に IndexedDB に持つので、フォルダも同じ場所へ書き戻す。
   *
   * @param folders 新しいフォルダ一覧
   */
  const commitFolders = async (folders: AssetFolder[]) => {
    set({ assetFolders: folders })
    await saveAssetFolders(folders)
  }

  return {
    assets: [],
    assetFolders: [],

    /**
     * 保存済みの素材とフォルダを読み込んで一覧に反映する。
     * フォルダを持たない頃に保存したメタもあるので、ここで既定値を埋める。
     */
    initAssets: async () => {
      const { assets, folders } = await loadAssetLibrary()
      set({ assets: normalizeAssets(assets, folders), assetFolders: folders })
    },

    /**
     * 画像ファイルを素材として取り込む。
     *
     * @param files    取り込むファイル。画像以外は読み飛ばす
     * @param folderId 入れ先のフォルダ。null / 省略で未分類
     * @returns 実際に追加できた素材のメタ情報。呼び出し側でそのままレイヤー化できる
     */
    addAssetFiles: async (files, folderId = null) => {
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
          folderId,
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
          background:
            t.background.assetId === id ? { ...t.background, assetId: null } : t.background,
        })),
      })
    },

    /**
     * 素材を別のフォルダへ移す。書き出し先のパスも変わる。
     *
     * @param id       移す素材の id
     * @param folderId 移動先のフォルダ。null で未分類
     */
    moveAssetToFolder: async (id, folderId) => {
      const assets = get().assets.map((a) => (a.id === id ? { ...a, folderId } : a))
      set({ assets })
      await saveAssetMetas(assets)
    },

    /**
     * 素材を別の素材の前後へ移す。移動先の所属フォルダも引き継いで保存する。
     *
     * @param id       移動する素材の id
     * @param targetId 移動先の基準になる素材の id
     * @param position 基準の前か後か
     */
    reorderAsset: async (id, targetId, position) => {
      if (id === targetId) return
      const assets = get().assets
      const sourceIndex = assets.findIndex((asset) => asset.id === id)
      const targetIndex = assets.findIndex((asset) => asset.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return

      const next = [...assets]
      const [source] = next.splice(sourceIndex, 1)
      const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex
      const insertIndex = adjustedTargetIndex + (position === 'after' ? 1 : 0)
      const target = assets[targetIndex]
      next.splice(insertIndex, 0, { ...source, folderId: target.folderId })
      set({ assets: next })
      await saveAssetMetas(next)
    },

    /** 素材フォルダを追加する */
    addAssetFolder: async () => {
      const { assetFolders } = get()
      await commitFolders([...assetFolders, createAssetFolder(`素材 ${assetFolders.length + 1}`)])
    },

    /**
     * 素材フォルダの名前を変える。書き出し先のフォルダ名もこれになる。
     *
     * @param id   対象のフォルダの id
     * @param name 新しい名前
     */
    renameAssetFolder: async (id, name) => {
      await commitFolders(get().assetFolders.map((f) => (f.id === id ? { ...f, name } : f)))
    },

    /**
     * 素材フォルダを別のフォルダの前後へ移し、並び順を保存する。
     *
     * @param id       移動するフォルダの id
     * @param targetId 移動先の基準になるフォルダの id
     * @param position 基準の前か後か
     */
    reorderAssetFolder: async (id, targetId, position) => {
      if (id === targetId) return
      const folders = get().assetFolders
      const sourceIndex = folders.findIndex((folder) => folder.id === id)
      const targetIndex = folders.findIndex((folder) => folder.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return

      const next = [...folders]
      const [source] = next.splice(sourceIndex, 1)
      const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex
      next.splice(adjustedTargetIndex + (position === 'after' ? 1 : 0), 0, source)
      await commitFolders(next)
    },

    /**
     * 素材フォルダの開閉を切り替える。
     *
     * @param id 対象のフォルダの id
     */
    toggleAssetFolder: async (id) => {
      await commitFolders(
        get().assetFolders.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)),
      )
    },

    /**
     * 素材フォルダを削除する。中の素材は消さず未分類へ移す。
     *
     * @param id 削除するフォルダの id
     */
    removeAssetFolder: async (id) => {
      const assets = get().assets.map((a) => (a.folderId === id ? { ...a, folderId: null } : a))
      set({ assets })
      await saveAssetMetas(assets)
      await commitFolders(get().assetFolders.filter((f) => f.id !== id))
    },
  }
}
