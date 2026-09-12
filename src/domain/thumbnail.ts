import { DEFAULT_BACKGROUND, type Background } from './background'
import { createId } from './id'
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

/** 新規サムネイルの既定サイズ。プリセットの先頭を正とする */
export const DEFAULT_CANVAS: CanvasSize = {
  width: CANVAS_PRESETS[0].width,
  height: CANVAS_PRESETS[0].height,
}

/**
 * 空のサムネイルを作る。
 *
 * @param name     一覧に表示する名前
 * @param folderId 所属フォルダ。null は未分類
 * @param canvas   キャンバス実寸。サムネイルごとに持つので呼び出し側の現在値を渡す
 */
export function createThumbnail(
  name: string,
  folderId: string | null = null,
  canvas: CanvasSize = DEFAULT_CANVAS,
): Thumbnail {
  return {
    id: createId(),
    name,
    folderId,
    canvas: { ...canvas },
    background: { ...DEFAULT_BACKGROUND },
    layers: [],
  }
}

/**
 * サムネイルを複製する。レイヤーの id も振り直すので、複製元とは独立して編集できる。
 *
 * @param source 複製元。folderId は引き継ぐため、貼り付け先を変えるときは呼び出し側で上書きする
 * @param name   複製後の名前
 */
export function cloneThumbnail(source: Thumbnail, name: string): Thumbnail {
  return {
    ...source,
    id: createId(),
    name,
    canvas: { ...source.canvas },
    background: { ...source.background },
    layers: source.layers.map((l) => ({ ...l, id: createId(), effects: { ...l.effects } })),
  }
}
