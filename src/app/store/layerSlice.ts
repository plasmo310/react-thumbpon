import { BACKGROUND_ID } from '@/domain/background'
import { cloneLayer, createImageLayer, createTextLayer } from '@/domain/layer'
import { fitInto, type Rect } from '@/domain/geometry'
import { createPatchers } from './patch'
import { mergeCrop, type Crop } from '@/domain/crop'
import { DEFAULT_EFFECTS, type Effects } from '@/domain/effects'
import type { Layer } from '@/domain/layer'
import type { SliceCreator } from './index'

/** 重なり順の動かし方。配列順がそのまま重なり順なので、端の1つ隣か端そのものになる */
export type LayerOrder = 'front' | 'forward' | 'backward' | 'back'

export type LayerSlice = {
  /** 選択中のレイヤー。背景を選んでいるときは BACKGROUND_ID が入る */
  selectedId: string | null
  /**
   * Shift+クリックで積み上げた複数選択。背景は含まない。
   * 単一選択のときも selectedId と同じ1件を持ち、キャンバスやレイヤー一覧はこちらを見て強調する。
   */
  selectedIds: string[]

  select: (id: string | null, options?: { additive?: boolean }) => void
  addImageLayer: (assetId: string, center?: { x: number; y: number }) => void
  addTextLayer: () => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  updateLayerEffects: (id: string, patch: Partial<Effects>) => void
  updateLayerCrop: (id: string, patch: Partial<Crop>, rect?: Partial<Rect>) => void
  removeLayer: (id: string) => void
  removeLayers: (ids: string[]) => void
  duplicateLayer: (id: string) => void
  moveLayer: (id: string, order: LayerOrder) => void
  reorderLayer: (fromIndex: number, insertIndex: number) => void
  nudgeLayer: (id: string, dx: number, dy: number) => void
}

/**
 * 現在のサムネイルの背景とレイヤーを扱う。
 * レイヤーの重なり順は配列順で、index 0 が最背面（zIndex フィールドは持たない）。
 */
export const createLayerSlice: SliceCreator<LayerSlice> = (set, get) => {
  const { current, patchLayers } = createPatchers(set, get)

  return {
    selectedId: null,
    selectedIds: [],

    /**
     * 選択状態を変える。
     * 別の項目に移ったときはプロパティ欄を開き直す
     * （閉じたまま選び直すと何も出ず、選べていないように見えるため）。
     *
     * @param id      選択するレイヤーの id。背景なら BACKGROUND_ID、解除なら null
     * @param options additive を立てると Shift+クリックとして扱い、複数選択に対して
     *                 id を足す・既に入っていれば外す。背景や解除では常に単一選択に戻す
     */
    select: (id, options) =>
      set((s) => {
        if (options?.additive && id && id !== BACKGROUND_ID) {
          const exists = s.selectedIds.includes(id)
          const nextIds = exists ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id]
          return {
            selectedId: nextIds.length > 0 ? nextIds[nextIds.length - 1] : null,
            selectedIds: nextIds,
            propertiesOpen: true,
            cropping: false,
          }
        }
        return {
          selectedId: id,
          selectedIds: id && id !== BACKGROUND_ID ? [id] : [],
          propertiesOpen: s.selectedId === id ? s.propertiesOpen : true,
          // 別のレイヤーに移ったらクロップ編集は畳む。掴んだ枠の意味が変わってしまうため
          cropping: s.selectedId === id ? s.cropping : false,
        }
      }),

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
      get().recordHistory()
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
      set({ selectedId: layer.id, selectedIds: [layer.id], propertiesOpen: true, cropping: false })
    },

    /** テキストレイヤーをキャンバス中央に追加し、選択する */
    addTextLayer: () => {
      const thumbnail = current()
      if (!thumbnail) return
      get().recordHistory()
      const layer = createTextLayer(thumbnail.canvas)
      patchLayers((layers) => [...layers, layer])
      set({ selectedId: layer.id, selectedIds: [layer.id], propertiesOpen: true, cropping: false })
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
     * 画像レイヤーの表示範囲(クロップ)を更新する。
     * crop は入れ子なので updateLayer の浅いマージでは潰れてしまうため、専用の口を用意する。
     *
     * @param id    更新するレイヤーの id
     * @param patch 変更したい辺だけ。反対側の辺と合わせて画像が消えない範囲に収められる
     * @param rect  同時に変える配置とサイズ。端を掴んだクロップでは枠も一緒に詰まるため
     */
    updateLayerCrop: (id, patch, rect) =>
      patchLayers((layers) =>
        layers.map((l) => {
          if (l.id !== id || l.type !== 'image') return l
          return { ...l, ...rect, crop: mergeCrop(l.crop, patch) }
        }),
      ),

    /**
     * レイヤーをまとめて削除する。選択中のものが含まれていれば選択も外す。
     * Undo の単位をひとつにまとめるため、削除前に一度だけ履歴に積む。
     *
     * @param ids 削除するレイヤーの id の一覧
     */
    removeLayers: (ids) => {
      if (ids.length === 0) return
      get().recordHistory()
      patchLayers((layers) => layers.filter((l) => !ids.includes(l.id)))
      set((s) =>
        s.selectedId && ids.includes(s.selectedId)
          ? { selectedId: null, selectedIds: [], cropping: false }
          : { selectedIds: s.selectedIds.filter((id) => !ids.includes(id)) },
      )
    },

    /**
     * レイヤーを削除する。選択中だったら選択も解除する。
     *
     * @param id 削除するレイヤーの id
     */
    removeLayer: (id) => get().removeLayers([id]),

    /**
     * レイヤーを複製して元のすぐ前面に挿し、複製の方を選択する。
     *
     * @param id 複製元のレイヤーの id
     */
    duplicateLayer: (id) => {
      const layers = current()?.layers ?? []
      const index = layers.findIndex((l) => l.id === id)
      if (index < 0) return
      get().recordHistory()
      const copy = cloneLayer(layers[index])
      patchLayers((list) => {
        const next = [...list]
        next.splice(index + 1, 0, copy)
        return next
      })
      set({ selectedId: copy.id, selectedIds: [copy.id], propertiesOpen: true, cropping: false })
    },

    /**
     * レイヤーの重なり順を変える。
     * 一覧の並び（＝配列順）そのものを動かすので、ドラッグでの並べ替えと同じ結果になる。
     *
     * @param id    動かすレイヤーの id
     * @param order forward / backward は1つ隣と入れ替え、front / back は端へ送る。
     *              既にその位置なら何もしない
     */
    moveLayer: (id, order) => {
      const layers = current()?.layers ?? []
      const index = layers.findIndex((l) => l.id === id)
      if (index < 0) return
      const last = layers.length - 1
      const target = { front: last, forward: index + 1, backward: index - 1, back: 0 }[order]
      if (target === index || target < 0 || target > last) return
      get().recordHistory()
      patchLayers((ls) => {
        const next = [...ls]
        const [moved] = next.splice(index, 1)
        next.splice(target, 0, moved)
        return next
      })
    },

    /**
     * レイヤーをドラッグで並べ替える。
     *
     * @param fromIndex   動かすレイヤーの現在の位置
     * @param insertIndex 「元の配列のこの要素の手前に入れる」位置(0..length)
     */
    reorderLayer: (fromIndex, insertIndex) => {
      const layers = current()?.layers ?? []
      if (fromIndex < 0 || fromIndex >= layers.length) return
      if (insertIndex === fromIndex || insertIndex === fromIndex + 1) return
      get().recordHistory()
      patchLayers((ls) => {
        const next = [...ls]
        const [moved] = next.splice(fromIndex, 1)
        const adjusted = insertIndex > fromIndex ? insertIndex - 1 : insertIndex
        next.splice(Math.max(0, Math.min(next.length, adjusted)), 0, moved)
        return next
      })
    },

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
