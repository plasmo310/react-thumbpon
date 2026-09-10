import { cloneLayer, createImageLayer, createTextLayer } from '../../lib/core/factory'
import { fitInto } from '../../lib/core/geometry'
import { createPatchers } from '../helpers'
import { DEFAULT_EFFECTS, type Background, type Effects, type Layer } from '../../types'
import type { SliceCreator } from '../types'

export type LayerSlice = {
  /** 選択中のレイヤー。背景を選んでいるときは BACKGROUND_ID が入る */
  selectedId: string | null

  select: (id: string | null) => void
  setBackground: (patch: Partial<Background>) => void
  setBackgroundEffects: (patch: Partial<Effects>) => void
  addImageLayer: (assetId: string, center?: { x: number; y: number }) => void
  addTextLayer: () => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  updateLayerEffects: (id: string, patch: Partial<Effects>) => void
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  moveLayer: (id: string, direction: 1 | -1) => void
  reorderLayer: (fromIndex: number, insertIndex: number) => void
  nudgeLayer: (id: string, dx: number, dy: number) => void
}

/**
 * 現在のサムネイルの背景とレイヤーを扱う。
 * レイヤーの重なり順は配列順で、index 0 が最背面（zIndex フィールドは持たない）。
 */
export const createLayerSlice: SliceCreator<LayerSlice> = (set, get) => {
  const { current, patchCurrent, patchLayers } = createPatchers(set, get)

  return {
    selectedId: null,

    /**
     * 選択状態を変える。
     * 別の項目に移ったときはプロパティ欄を開き直す
     * （閉じたまま選び直すと何も出ず、選べていないように見えるため）。
     *
     * @param id 選択するレイヤーの id。背景なら BACKGROUND_ID、解除なら null
     */
    select: (id) =>
      set((s) => ({
        selectedId: id,
        propertiesOpen: s.selectedId === id ? s.propertiesOpen : true,
      })),

    /**
     * 現在のサムネイルの背景設定を部分的に更新する。
     *
     * @param patch 変更したい項目だけ。種別を切り替えても他の設定は残る
     */
    setBackground: (patch) =>
      patchCurrent((t) => ({ ...t, background: { ...t.background, ...patch } })),

    /**
     * 現在のサムネイルの背景のエフェクトを部分的に更新する。
     * effects は入れ子なので setBackground の浅いマージでは潰れてしまうため、専用の口を用意する。
     *
     * @param patch 変更したい項目だけ
     */
    setBackgroundEffects: (patch) =>
      patchCurrent((t) => ({
        ...t,
        background: {
          ...t.background,
          effects: { ...DEFAULT_EFFECTS, ...t.background.effects, ...patch },
        },
      })),

    /**
     * 素材から画像レイヤーを作って最前面に追加し、選択する。
     *
     * @param assetId 配置する素材の id
     * @param center  中心に置きたいキャンバス実寸座標。省略時はキャンバス中央
     */
    addImageLayer: (assetId, center) => {
      const { assets } = get()
      const thumbnail = current()
      const asset = assets.find((a) => a.id === assetId)
      if (!asset || !thumbnail) return
      const { canvas } = thumbnail
      const size = fitInto(asset.width, asset.height, canvas.width * 0.8, canvas.height * 0.8)
      const cx = center?.x ?? canvas.width / 2
      const cy = center?.y ?? canvas.height / 2
      const layer = createImageLayer(asset.name, assetId, {
        width: size.width,
        height: size.height,
        x: Math.round(cx - size.width / 2),
        y: Math.round(cy - size.height / 2),
      })
      patchLayers((layers) => [...layers, layer])
      set({ selectedId: layer.id, propertiesOpen: true })
    },

    /** テキストレイヤーをキャンバス中央に追加し、選択する */
    addTextLayer: () => {
      const thumbnail = current()
      if (!thumbnail) return
      const layer = createTextLayer(thumbnail.canvas)
      patchLayers((layers) => [...layers, layer])
      set({ selectedId: layer.id, propertiesOpen: true })
    },

    /**
     * レイヤーを部分的に更新する。
     *
     * @param id    更新するレイヤーの id
     * @param patch 変更したい項目だけ
     */
    updateLayer: (id, patch) =>
      patchLayers((layers) => layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l))),

    /**
     * レイヤーのエフェクトを部分的に更新する。
     * effects は入れ子なので updateLayer の浅いマージでは潰れてしまうため、専用の口を用意する。
     *
     * @param id    更新するレイヤーの id
     * @param patch 変更したい項目だけ
     */
    updateLayerEffects: (id, patch) =>
      patchLayers((layers) =>
        layers.map((l) => {
          if (l.id !== id) return l
          return { ...l, effects: { ...DEFAULT_EFFECTS, ...l.effects, ...patch } } as Layer
        }),
      ),

    /**
     * レイヤーを削除する。選択中だったら選択も解除する。
     *
     * @param id 削除するレイヤーの id
     */
    removeLayer: (id) => {
      patchLayers((layers) => layers.filter((l) => l.id !== id))
      if (get().selectedId === id) set({ selectedId: null })
    },

    /**
     * レイヤーを複製して元のすぐ前面に挿し、複製の方を選択する。
     *
     * @param id 複製元のレイヤーの id
     */
    duplicateLayer: (id) => {
      const layers = current()?.layers ?? []
      const index = layers.findIndex((l) => l.id === id)
      if (index < 0) return
      const copy = cloneLayer(layers[index])
      patchLayers((list) => {
        const next = [...list]
        next.splice(index + 1, 0, copy)
        return next
      })
      set({ selectedId: copy.id, propertiesOpen: true })
    },

    /**
     * レイヤーを1つ隣と入れ替える。
     *
     * @param id        動かすレイヤーの id
     * @param direction 1 = 前面へ / -1 = 背面へ。端なら何もしない
     */
    moveLayer: (id, direction) =>
      patchLayers((layers) => {
        const index = layers.findIndex((l) => l.id === id)
        const target = index + direction
        if (index < 0 || target < 0 || target >= layers.length) return layers
        const next = [...layers]
        ;[next[index], next[target]] = [next[target], next[index]]
        return next
      }),

    /**
     * レイヤーをドラッグで並べ替える。
     *
     * @param fromIndex   動かすレイヤーの現在の位置
     * @param insertIndex 「元の配列のこの要素の手前に入れる」位置(0..length)
     */
    reorderLayer: (fromIndex, insertIndex) =>
      patchLayers((layers) => {
        if (fromIndex < 0 || fromIndex >= layers.length) return layers
        if (insertIndex === fromIndex || insertIndex === fromIndex + 1) return layers
        const next = [...layers]
        const [moved] = next.splice(fromIndex, 1)
        const adjusted = insertIndex > fromIndex ? insertIndex - 1 : insertIndex
        next.splice(Math.max(0, Math.min(next.length, adjusted)), 0, moved)
        return next
      }),

    /**
     * レイヤーを相対移動する。矢印キーの微調整で使う。
     *
     * @param id 動かすレイヤーの id
     * @param dx X方向の移動量(キャンバス実寸px)
     * @param dy Y方向の移動量(キャンバス実寸px)
     */
    nudgeLayer: (id, dx, dy) =>
      patchLayers((layers) =>
        layers.map((l) => (l.id === id ? { ...l, x: l.x + dx, y: l.y + dy } : l)),
      ),
  }
}
