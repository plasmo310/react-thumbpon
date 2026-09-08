import type { Background } from './background'
import type { Layer } from './layer'

export type CanvasSize = { width: number; height: number }

export type CanvasPreset = { id: string; label: string; width: number; height: number }

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'fhd', label: '1920 × 1080', width: 1920, height: 1080 },
  { id: 'svga', label: '800 × 600', width: 800, height: 600 },
]

/** プリセットに当てはまらないサイズを表す、select の value 用の値 */
export const CUSTOM_PRESET_ID = 'custom'

/** 1枚のサムネイル。キャンバスサイズもサムネイルごとに持つ */
export type Thumbnail = {
  id: string
  name: string
  folderId: string | null
  canvas: CanvasSize
  background: Background
  /** index 0 が最背面。zIndex フィールドは持たない */
  layers: Layer[]
}

export type Folder = { id: string; name: string; collapsed: boolean }
