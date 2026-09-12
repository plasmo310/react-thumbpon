import type { AssetFolder, AssetMeta } from './asset'
import { DEFAULT_BACKGROUND } from './background'
import { DEFAULT_CROP } from './crop'
import { DEFAULT_EFFECTS } from './effects'
import type { FontEntry } from './font'
import type { BackgroundPreset, TextPreset } from './preset'
import type { Layer } from './layer'
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
 * プロジェクトファイル(.thumbpon.zip)とワークスペースフォルダの project.json の中身。
 * version 1 は fonts を、version 2 までは背景の模様設定とレイヤーのエフェクトを、
 * version 3 までは素材フォルダと画像のクロップ・左右反転を持たない。
 * 読み込み側は無い前提で扱うこと（欠けは normalizeThumbnails が既定値で補う）。
 */
export type ProjectFile = {
  format: 'thumbpon-project'
  version: 1 | 2 | 3 | 4
  folders: Folder[]
  thumbnails: Thumbnail[]
  currentThumbnailId: string | null
  assets: ProjectAssetEntry[]
  /** 素材フォルダ。素材の格納先パスもこの名前で分かれる */
  assetFolders?: AssetFolder[]
  textPresets?: TextPreset[]
  backgroundPresets?: BackgroundPreset[]
  fonts?: ProjectFontRef[]
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
}

/**
 * 素材を保存するときの拡張子を決める。
 *
 * @param meta 素材のメタ情報。mime が未知ならファイル名の末尾から拾う
 */
export function extensionFor(meta: AssetMeta): string {
  const fromName = /\.[a-z0-9]+$/i.exec(meta.name)?.[0]
  return EXTENSION_BY_MIME[meta.mime] ?? fromName ?? '.bin'
}

/**
 * OS のファイル名・フォルダ名として使えない文字を落とす。
 * 前後の空白とドットまで落とすのは、Windows がその名前を作れないため。
 *
 * @param name 元の名前。全部落ちて空になることがあるので、代替名は呼び出し側で用意する
 */
export function sanitizePathName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
}

/**
 * 素材フォルダのディレクトリ名。
 *
 * @param folder 対象の素材フォルダ。名前が使えない文字だけなら id で代替する
 */
export function assetFolderDirName(folder: AssetFolder): string {
  return sanitizePathName(folder.name) || folder.id
}

/**
 * 素材の格納先パス。ZIP のエントリ名とワークスペースフォルダ内のパスで共通に使う。
 * 素材フォルダに入っているものは、書き出しでも同じ名前のフォルダに分ける。
 *
 * @param meta    素材のメタ情報
 * @param folders 素材フォルダの一覧。meta.folderId をディレクトリ名に直すのに使う
 */
export function assetPath(meta: AssetMeta, folders: AssetFolder[] = []): string {
  const folder = folders.find((f) => f.id === meta.folderId)
  const dir = folder ? `${assetFolderDirName(folder)}/` : ''
  return `assets/${dir}${meta.id}${extensionFor(meta)}`
}

/**
 * 素材ファイルのパスから素材 id を取り出す。
 * 保存したファイルは必ず `<id>.<拡張子>` なので、置かれているフォルダの名前が変わっていても
 * id で元の素材に結び付けられる（コンテナは OS や外部エディタからも触れるため）。
 *
 * @param path コンテナ内のパス。フォルダを含んでいてもよい
 */
export function assetIdFromPath(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  // id は UUID でドットを含まないので、最後のドットから後ろが拡張子
  return dot > 0 ? name.slice(0, dot) : name
}

/**
 * プロジェクトが必要とするフォントを洗い出す。
 * フォントファイル自体は保存しないので、代わりにこの一覧を持たせて
 * 読み込んだ側に「何が足りないか」を名前で伝える。
 *
 * @param thumbnails 全サムネイル。テキストレイヤーの fontFamily を見る
 * @param fonts      現在選べるフォント一覧。family から表示名を逆引きするのに使う
 * @returns builtin なフォントはどの環境でも出るため含めない。family の重複も除く
 */
export function collectUsedFonts(thumbnails: Thumbnail[], fonts: FontEntry[]): ProjectFontRef[] {
  const byFamily = new Map(fonts.map((font) => [font.family, font]))
  const used = new Map<string, ProjectFontRef>()

  for (const thumbnail of thumbnails) {
    for (const layer of thumbnail.layers) {
      if (layer.type !== 'text') continue
      const font = byFamily.get(layer.fontFamily)
      if (!font || font.source === 'builtin') continue
      if (used.has(font.family)) continue
      used.set(font.family, { label: font.label, family: font.family, source: font.source })
    }
  }

  return [...used.values()]
}

/**
 * 読み込んだプロジェクトのうち、この環境で解決できないフォントを探す。
 *
 * @param required  プロジェクトが要求するフォント。version 1 のファイルには無いので undefined を許す
 * @param available 現在選べるフォント一覧
 * @returns 足りないフォントの表示名。告知にそのまま使う
 */
export function findMissingFonts(
  required: ProjectFontRef[] | undefined,
  available: FontEntry[],
): string[] {
  if (!required) return []
  const known = new Set(available.map((font) => font.family))
  return required.filter((font) => !known.has(font.family)).map((font) => font.label)
}

/**
 * 読み込んだサムネイルに、後から増えたフィールドの既定値を埋める。
 * 保存済みのプロジェクトには背景の模様設定やレイヤーのエフェクトが無いため、
 * 読み込みの入口でここを通して以降は「必ず在る」前提で扱えるようにする。
 *
 * @param thumbnails 読み込んだサムネイル。ファイル由来なので欠けを前提にする
 */
export function normalizeThumbnails(thumbnails: Thumbnail[]): Thumbnail[] {
  return thumbnails.map((thumbnail) => ({
    ...thumbnail,
    background: {
      ...DEFAULT_BACKGROUND,
      ...thumbnail.background,
      effects: { ...DEFAULT_EFFECTS, ...thumbnail.background?.effects },
    },
    layers: thumbnail.layers.map((layer) => {
      const normalized = { ...layer, effects: { ...DEFAULT_EFFECTS, ...layer.effects } } as Layer
      if (normalized.type !== 'image') return normalized
      return {
        ...normalized,
        crop: { ...DEFAULT_CROP, ...normalized.crop },
        flipX: normalized.flipX ?? false,
      }
    }),
  }))
}
