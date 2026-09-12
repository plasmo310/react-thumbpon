import type { StoreApi } from 'zustand'
import type { Layer } from '@/domain/layer'
import type { Thumbnail } from '@/domain/thumbnail'
import type { EditorState } from './index'

type Set = StoreApi<EditorState>['setState']
type Get = StoreApi<EditorState>['getState']

/**
 * 「現在のサムネイル」に対する更新をまとめたヘルパを作る。
 * レイヤー操作はすべて現在のサムネイルに対して行われるため、各 slice の先頭でこれを取り出して使う。
 *
 * index.ts からは型だけを取り込む。実行時の import を持たせると
 * index → slice → ここ → index の循環になるため。
 *
 * @param set slice に渡される set
 * @param get slice に渡される get
 */
export function createPatchers(set: Set, get: Get) {
  /** 現在のサムネイル。id が失われていても落ちないよう先頭にフォールバックする */
  const current = (): Thumbnail => {
    const s = get()
    return s.thumbnails.find((t) => t.id === s.currentThumbnailId) ?? s.thumbnails[0]
  }

  /**
   * 現在のサムネイルだけを差し替える。
   *
   * @param updater 現在のサムネイルを受け取り、新しいサムネイルを返す
   */
  const patchCurrent = (updater: (thumbnail: Thumbnail) => Thumbnail) =>
    set((s) => ({
      thumbnails: s.thumbnails.map((t) => (t.id === s.currentThumbnailId ? updater(t) : t)),
    }))

  /**
   * 現在のサムネイルのレイヤー配列だけを差し替える。
   *
   * @param updater 現在のレイヤー配列を受け取り、新しい配列を返す。index 0 が最背面
   */
  const patchLayers = (updater: (layers: Layer[]) => Layer[]) =>
    patchCurrent((t) => ({ ...t, layers: updater(t.layers) }))

  return { current, patchCurrent, patchLayers }
}
