import { t } from '@/shared/lib/i18n'
import { toBlob } from 'html-to-image'
import { pngFileNames } from '@/domain/project'
import { downloadBlob } from './download'
import { buildFontEmbedCss } from './fontEmbed'
import { getSurface } from '@/shared/lib/surfaceRef'
import type { Thumbnail } from '@/domain/thumbnail'
import { useEditorStore } from '@/app/store'

/** 連続保存の間隔(ms)。間を空けないと、ブラウザが後続のダウンロードを落とすことがある */
const DOWNLOAD_INTERVAL = 200

/**
 * 描画済みのキャンバスを実寸の PNG にする。
 *
 * @param thumbnail 書き出すサムネイル。canvas を出力サイズにする
 */
async function renderPng(thumbnail: Thumbnail): Promise<Blob> {
  const surface = getSurface(thumbnail.id)
  if (!surface) throw new Error(t('キャンバスが準備できていません'))

  const options = {
    width: thumbnail.canvas.width,
    height: thumbnail.canvas.height,
    pixelRatio: 1,
    // cacheBust を有効にすると html-to-image が URL に ?<timestamp> を付けてしまい、
    // 素材画像の blob: URL が壊れて fetch に失敗する。素材は URL 自体が一意なので不要。
    cacheBust: false,
    // 使っている文字範囲のフォントだけを渡す。任せると Web フォントを毎回すべて取得して遅い
    fontEmbedCSS: await buildFontEmbedCss(surface),
    // 表示用の縮小スケールを打ち消して実寸で書き出す
    style: { transform: 'none', transformOrigin: 'top left' },
    // 選択枠などのUIは出力に含めない
    filter: (node: Node) => !(node instanceof HTMLElement && node.dataset.exportIgnore),
  }

  // 1回目はWebフォントや画像の埋め込みが間に合わないことがあるため捨てる（html-to-imageの既知の挙動）
  await toBlob(surface, options)
  const blob = await toBlob(surface, options)
  if (!blob) throw new Error(t('書き出しに失敗しました'))
  return blob
}

/**
 * Canvas に表示中のサムネイルを1枚ずつ PNG として書き出す。表示は縮小されていても実寸で出力する。
 *
 * @param thumbnails 書き出すサムネイル。Canvas の表示順で渡し、保存もその順で行う
 */
export async function exportPngs(thumbnails: Thumbnail[]) {
  // 書き出しにも最終フォントの計測値を使い、描画の反映を待つ。
  await document.fonts.ready
  useEditorStore.getState().refreshTextLayout()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  // 途中で失敗したときに一部だけ保存されないよう、全部描き終えてから保存する
  const blobs: Blob[] = []
  for (const thumbnail of thumbnails) blobs.push(await renderPng(thumbnail))

  const fileNames = pngFileNames(thumbnails.map((thumbnail) => thumbnail.name))
  for (const [index, blob] of blobs.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_INTERVAL))
    downloadBlob(blob, fileNames[index])
  }
}
