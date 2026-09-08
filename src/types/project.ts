import type { AssetMeta } from './asset'
import type { BackgroundPreset, TextPreset } from './preset'
import type { Folder, Thumbnail } from './thumbnail'

/** 素材は JSON なら dataUrl、ZIP なら zip 内のパス(file)で持つ */
export type ProjectAssetEntry = { meta: AssetMeta; dataUrl?: string; file?: string }

/**
 * プロジェクトファイル(.thumbpon.json / .thumbpon.zip)の中身。
 * フォントファイルは含まれない（IndexedDB にのみ保存され、ここには fontFamily の文字列だけが入る）。
 */
export type ProjectFile = {
  format: 'thumbpon-project'
  version: 1
  folders: Folder[]
  thumbnails: Thumbnail[]
  currentThumbnailId: string | null
  assets: ProjectAssetEntry[]
  textPresets?: TextPreset[]
  backgroundPresets?: BackgroundPreset[]
}
