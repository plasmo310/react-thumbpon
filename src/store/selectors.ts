import { BACKGROUND_ID, type Layer, type Thumbnail } from '../types'
import { useEditorStore } from './editorStore'

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
