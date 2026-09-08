import { create } from 'zustand'
import { createAssetSlice } from './slices/assetSlice'
import { createFontSlice } from './slices/fontSlice'
import { createLayerSlice } from './slices/layerSlice'
import { createPresetSlice } from './slices/presetSlice'
import { createThumbnailSlice } from './slices/thumbnailSlice'
import { createUiSlice } from './slices/uiSlice'
import type { EditorState } from './types'

/** エディタの状態はすべてここに集約する。中身は slices/ に分かれている */
export const useEditorStore = create<EditorState>()((...a) => ({
  ...createThumbnailSlice(...a),
  ...createLayerSlice(...a),
  ...createAssetSlice(...a),
  ...createFontSlice(...a),
  ...createPresetSlice(...a),
  ...createUiSlice(...a),
}))
