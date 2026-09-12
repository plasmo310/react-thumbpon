import { create, type StateCreator } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { BACKGROUND_ID } from '@/domain/background'
import type { Layer } from '@/domain/layer'
import type { BackgroundPreset, TextPreset } from '@/domain/preset'
import type { Folder, Thumbnail } from '@/domain/thumbnail'
import { createAssetSlice, type AssetSlice } from './assetSlice'
import { createBackgroundSlice, type BackgroundSlice } from './backgroundSlice'
import { createFontSlice, type FontSlice } from './fontSlice'
import { createLayerSlice, type LayerSlice } from './layerSlice'
import { createPresetSlice, type PresetSlice } from './presetSlice'
import { createThumbnailSlice, type ThumbnailSlice } from './thumbnailSlice'
import { createUiSlice, type UiSlice } from './uiSlice'
import { createWorkspaceSlice, type WorkspaceSlice } from './workspaceSlice'

/**
 * エディタの状態すべて。8つの slice を合成したもの。
 *
 * slice は「操作のまとまり」であって「状態の所有単位」ではない。実体は1つのオブジェクトなので
 * slice をまたいだ更新ができる（素材を消したらそれを使うレイヤーも消す、サムネイルを
 * 切り替えたらレイヤーの選択を外す、など）。単一のドキュメントを全機能で編集する
 * エディタなので、これは意図した形。
 */
export type EditorState = ThumbnailSlice &
  LayerSlice &
  BackgroundSlice &
  AssetSlice &
  FontSlice &
  PresetSlice &
  UiSlice &
  WorkspaceSlice

/** slice を書くための StateCreator。set / get からは合成後の全状態が見える */
export type SliceCreator<T> = StateCreator<EditorState, [], [], T>

/**
 * エディタの状態はすべてここに集約する。
 * subscribeWithSelector を通してあるので、自動保存のように一部だけを見たい購読は
 * 全状態を受け取って自前で差分を取らなくてよい。
 */
export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((...a) => ({
    ...createThumbnailSlice(...a),
    ...createLayerSlice(...a),
    ...createBackgroundSlice(...a),
    ...createAssetSlice(...a),
    ...createFontSlice(...a),
    ...createPresetSlice(...a),
    ...createUiSlice(...a),
    ...createWorkspaceSlice(...a),
  })),
)

/**
 * 保存されるドキュメント。ガイド線や選択状態のような、その場限りのものは含めない。
 * 自動保存の対象がこれで、将来 Undo/Redo を載せるときの履歴の単位も同じになる。
 */
export type SavedDocument = {
  folders: Folder[]
  thumbnails: Thumbnail[]
  currentThumbnailId: string | null
  textPresets: TextPreset[]
  backgroundPresets: BackgroundPreset[]
  snapEnabled: boolean
}

/**
 * 状態から保存対象だけを取り出す。
 *
 * @param state ストアの現在の状態
 */
export function pickDocument(state: EditorState): SavedDocument {
  return {
    folders: state.folders,
    thumbnails: state.thumbnails,
    currentThumbnailId: state.currentThumbnailId,
    textPresets: state.textPresets,
    backgroundPresets: state.backgroundPresets,
    snapEnabled: state.snapEnabled,
  }
}

/**
 * 編集中のサムネイルを購読する。
 * id が失われていても落ちないよう先頭にフォールバックする。
 */
export const useCurrentThumbnail = (): Thumbnail => {
  const thumbnails = useEditorStore((s) => s.thumbnails)
  const currentThumbnailId = useEditorStore((s) => s.currentThumbnailId)
  return thumbnails.find((t) => t.id === currentThumbnailId) ?? thumbnails[0]
}

/**
 * 選択中のレイヤーを購読する。
 * 背景を選んでいるときはレイヤーではないので null を返す。
 */
export const useSelectedLayer = (): Layer | null => {
  const selectedId = useEditorStore((s) => s.selectedId)
  const thumbnail = useCurrentThumbnail()
  if (!selectedId || selectedId === BACKGROUND_ID) return null
  return thumbnail.layers.find((l) => l.id === selectedId) ?? null
}
