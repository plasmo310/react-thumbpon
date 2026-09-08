import type { AssetMeta } from './asset'
import type { BackgroundPreset, TextPreset } from './preset'
import type { Folder, Thumbnail } from './thumbnail'

/**
 * 素材の格納場所。file はコンテナ内の相対パス（ZIP エントリ名 / フォルダ内のパス）。
 * dataUrl は旧形式(.thumbpon.json)を読むためだけに残しており、書き出しでは使わない。
 */
export type ProjectAssetEntry = { meta: AssetMeta; dataUrl?: string; file?: string }

/**
 * プロジェクトが必要とするフォント。
 * フォントファイルの実体は含めない（同梱すると再配布にあたるため）。
 * 読み込んだ側では、解決できなかったものを名前で知らせるのに使う。
 */
export type ProjectFontRef = {
  /** 画面に出す名前。フォントファイル追加時のファイル名（拡張子なし）と一致する */
  label: string
  /** CSS の font-family にそのまま渡す値 */
  family: string
  /** local は OS のフォント、file は読み込んだフォントファイル */
  source: 'local' | 'file'
}

/**
 * プロジェクトファイル(.thumbpon)とワークスペースフォルダの project.json の中身。
 * version 1 は fonts を持たない。読み込み側は無い前提で扱うこと。
 */
export type ProjectFile = {
  format: 'thumbpon-project'
  version: 1 | 2
  folders: Folder[]
  thumbnails: Thumbnail[]
  currentThumbnailId: string | null
  assets: ProjectAssetEntry[]
  textPresets?: TextPreset[]
  backgroundPresets?: BackgroundPreset[]
  fonts?: ProjectFontRef[]
}
