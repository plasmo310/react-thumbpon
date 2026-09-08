import { get, set } from 'idb-keyval'
import { kv } from './db'
import type { FontEntry } from '../../types'

const FONT_LIST_KEY = 'font:list'
const fontKey = (id: string) => `font:${id}`

type StoredFont = { id: string; family: string; label: string }

/** Local Font Access API（Chrome系のみ） */
type LocalFontData = { family: string; fullName: string; postscriptName: string }
type WindowWithLocalFonts = Window & {
  queryLocalFonts?: () => Promise<LocalFontData[]>
}

/** ローカルフォント一覧のボタンを出してよいか。非対応ブラウザでは出さない */
export function canQueryLocalFonts(): boolean {
  return typeof (window as WindowWithLocalFonts).queryLocalFonts === 'function'
}

/**
 * OSにインストールされているフォント一覧を取得する。
 * 一覧の取得だけに権限が必要で、描画自体は family 名を指定すれば使える。
 *
 * @returns family で重複を除き、名前順に並べたもの
 */
export async function queryLocalFonts(): Promise<FontEntry[]> {
  const query = (window as WindowWithLocalFonts).queryLocalFonts
  if (!query) throw new Error('このブラウザはローカルフォント一覧に対応していません')
  const fonts = await query()
  const families = new Map<string, string>()
  for (const font of fonts) {
    if (!families.has(font.family)) families.set(font.family, font.family)
  }
  return [...families.keys()].sort().map((family) => ({
    id: `local:${family}`,
    family: `"${family}"`,
    label: family,
    source: 'local' as const,
  }))
}

/**
 * フォントを document に登録して使えるようにする。
 *
 * @param family CSS の font-family で指定する名前
 * @param buffer フォントファイルの中身
 */
async function register(family: string, buffer: ArrayBuffer) {
  const face = new FontFace(family, buffer)
  await face.load()
  document.fonts.add(face)
}

/**
 * 起動時に、保存済みのフォントファイルを再登録する。
 * 1つ失敗しても残りは読めるよう、個別に握りつぶす。
 */
export async function loadStoredFonts(): Promise<FontEntry[]> {
  const stored = (await get<StoredFont[]>(FONT_LIST_KEY, kv)) ?? []
  const entries: FontEntry[] = []
  for (const font of stored) {
    const blob = await get<Blob>(fontKey(font.id), kv)
    if (!blob) continue
    try {
      await register(font.label, await blob.arrayBuffer())
      entries.push({ id: font.id, family: font.family, label: font.label, source: 'file' })
    } catch (error) {
      console.error('フォントの復元に失敗しました', font.label, error)
    }
  }
  return entries
}

/**
 * フォントファイルを読み込んで登録・保存する。
 *
 * @param files .ttf / .otf / .woff / .woff2。同名で登録済みのものは読み飛ばす
 * @returns 新しく追加できたものだけ
 */
export async function addFontFiles(files: File[]): Promise<FontEntry[]> {
  const stored = (await get<StoredFont[]>(FONT_LIST_KEY, kv)) ?? []
  const added: FontEntry[] = []

  for (const file of files) {
    const label = file.name.replace(/\.[^.]+$/, '')
    if (stored.some((f) => f.label === label)) continue
    const buffer = await file.arrayBuffer()
    await register(label, buffer)
    const font: StoredFont = { id: `file:${label}`, family: `"${label}"`, label }
    await set(fontKey(font.id), file, kv)
    stored.push(font)
    added.push({ ...font, source: 'file' })
  }

  await set(FONT_LIST_KEY, stored, kv)
  return added
}
