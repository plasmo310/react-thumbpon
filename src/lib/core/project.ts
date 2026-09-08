import type { AssetMeta, FontEntry, ProjectFontRef, Thumbnail } from '../../types'

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
 * 素材の格納先パス。ZIP のエントリ名とワークスペースフォルダ内のパスで共通に使う。
 *
 * @param meta 素材のメタ情報
 */
export function assetPath(meta: AssetMeta): string {
  return `assets/${meta.id}${extensionFor(meta)}`
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
