import type { StateCreator } from 'zustand'
import type { AssetSlice } from './slices/assetSlice'
import type { FontSlice } from './slices/fontSlice'
import type { LayerSlice } from './slices/layerSlice'
import type { PresetSlice } from './slices/presetSlice'
import type { ThumbnailSlice } from './slices/thumbnailSlice'
import type { UiSlice } from './slices/uiSlice'

/**
 * エディタの状態すべて。6つの slice を合成したもの。
 * slice は分かれているが実体は1つのオブジェクトなので、slice をまたいだ更新もできる
 * （例: 素材を削除したら、その素材を使っているレイヤーも消す）。
 */
export type EditorState = ThumbnailSlice &
  LayerSlice &
  AssetSlice &
  FontSlice &
  PresetSlice &
  UiSlice

/** slice を書くための StateCreator。set / get からは合成後の全状態が見える */
export type SliceCreator<T> = StateCreator<EditorState, [], [], T>
