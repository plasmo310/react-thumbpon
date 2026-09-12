import type { AssetFolder, AssetMeta } from '@/domain/asset'
import { replaceAssets } from '@/shared/lib/storage/assetRepo'

/*
 * 素材の見た目は「実体の Blob が IndexedDB にあり、objectURL が assetRepo の Map に載っている」
 * ことで初めて出る（getAssetUrl がそこからしか引かない）。ストアにメタを流し込むだけでは
 * 絵が出ないので、本番と同じ replaceAssets() を通して実体ごと用意する。
 *
 * 書き込み先は Storybook のオリジン(localhost:6006)の IndexedDB で、
 * 開発サーバー(5173)のものとは別なので、実際の作業内容は壊さない。
 *
 * 画像はファイルを置かずに SVG 文字列から作る。素材そのものが本題ではないため。
 */

export const SAMPLE_PHOTO_ID = 'sample-photo'
export const SAMPLE_LOGO_ID = 'sample-logo'
export const SAMPLE_ASSET_FOLDER_ID = 'asset-folder-logo'

const svg = (body: string, width: number, height: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`

const PHOTO = svg(
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0" stop-color="#5BC8FF"/><stop offset="1" stop-color="#FF8A5B"/>
   </linearGradient></defs>
   <rect width="640" height="360" fill="url(#g)"/>
   <circle cx="470" cy="110" r="60" fill="#FFF7F2" opacity="0.85"/>
   <path d="M0 300 L180 190 L320 280 L470 170 L640 270 L640 360 L0 360Z" fill="#25282D" opacity="0.35"/>`,
  640,
  360,
)

const LOGO = svg(
  `<rect width="200" height="200" rx="36" fill="#FF8A5B"/>
   <circle cx="100" cy="100" r="52" fill="#FFF7F2"/>
   <circle cx="100" cy="100" r="22" fill="#FF7440"/>`,
  200,
  200,
)

export const SAMPLE_ASSET_FOLDERS: AssetFolder[] = [
  { id: SAMPLE_ASSET_FOLDER_ID, name: 'ロゴ', collapsed: false },
]

export const SAMPLE_ASSETS: AssetMeta[] = [
  {
    id: SAMPLE_PHOTO_ID,
    name: 'photo.svg',
    mime: 'image/svg+xml',
    width: 640,
    height: 360,
    createdAt: 0,
    folderId: null,
  },
  {
    id: SAMPLE_LOGO_ID,
    name: 'logo.svg',
    mime: 'image/svg+xml',
    width: 200,
    height: 200,
    createdAt: 0,
    folderId: SAMPLE_ASSET_FOLDER_ID,
  },
]

const blobOf = (source: string) => new Blob([source], { type: 'image/svg+xml' })

/*
 * 何度マウントされても書き込みは1回でよいので、最初の Promise を使い回す。
 * replaceAssets は既存の素材を消してから入れ直すため、毎回呼ぶと無駄が大きい。
 */
let installed: Promise<void> | null = null

/** サンプル素材の実体を IndexedDB に入れ、objectURL を張る。解決後に getAssetUrl が引けるようになる */
export function installSampleAssets(): Promise<void> {
  installed ??= replaceAssets(
    [
      { meta: SAMPLE_ASSETS[0], blob: blobOf(PHOTO) },
      { meta: SAMPLE_ASSETS[1], blob: blobOf(LOGO) },
    ],
    SAMPLE_ASSET_FOLDERS,
  ).then(() => undefined)
  return installed
}
