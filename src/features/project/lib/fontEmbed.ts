import { selectFontFaces, type FontFaceInfo, type FontUsage } from '@/domain/fontSubset'

const WEB_FONT_HOST = 'fonts.googleapis.com'

/** Web フォント CSS の @font-face 一覧。CSS はアプリ起動中に変わらないため1度だけ読む */
let webFontFaces: Promise<FontFaceInfo[]> | null = null

/** フォント本体の URL → data URL。書き出しのたびに取り直さないよう保持する */
const dataUrlCache = new Map<string, Promise<string>>()

/**
 * キャンバス内の文字と、その文字に効いている書体・太さを集める。
 *
 * @param surface 書き出す要素
 */
function collectUsage(surface: HTMLElement): FontUsage {
  const usage: FontUsage = { families: new Set(), weights: new Set(), codePoints: new Set() }
  const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    if (!text.trim() || !node.parentElement) continue
    const style = getComputedStyle(node.parentElement)
    // フォールバック先の書体でも描画されうるため、一覧のすべてを使用中として扱う
    for (const family of style.fontFamily.split(',')) usage.families.add(family)
    usage.weights.add(style.fontWeight)
    for (const char of text) usage.codePoints.add(char.codePointAt(0)!)
  }
  return usage
}

/**
 * index.html で読み込んでいる Web フォント CSS から @font-face を取り出す。
 * クロスオリジンの CSS は cssRules を読めないため、取り直して手元で解釈する。
 */
async function loadWebFontFaces(): Promise<FontFaceInfo[]> {
  const hrefs = Array.from(document.styleSheets)
    .map((sheet) => sheet.href)
    .filter((href): href is string => !!href && new URL(href).host === WEB_FONT_HOST)
  const faces: FontFaceInfo[] = []
  for (const href of hrefs) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(await (await fetch(href)).text())
    for (const rule of Array.from(sheet.cssRules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue
      faces.push({
        family: rule.style.getPropertyValue('font-family'),
        weight: rule.style.getPropertyValue('font-weight') || '400',
        unicodeRange: rule.style.getPropertyValue('unicode-range'),
        cssText: rule.cssText,
      })
    }
  }
  return faces
}

/**
 * フォント本体を data URL にする。
 *
 * @param url フォントファイルの絶対 URL
 */
function toDataUrl(url: string): Promise<string> {
  let cached = dataUrlCache.get(url)
  if (!cached) {
    cached = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${url}`)
        return res.blob()
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(blob)
          }),
      )
    // 失敗を保持すると次の書き出しでも失敗し続けるため、取り直せるようにする
    cached.catch(() => dataUrlCache.delete(url))
    dataUrlCache.set(url, cached)
  }
  return cached
}

/**
 * @font-face のフォント URL を data URL に置き換える。SVG 画像の中からは外部を読めないため。
 *
 * @param face 埋め込む @font-face
 * @returns 取得できなかったときは null（その書体だけ欠けても書き出しは続ける）
 */
async function embedFace(face: FontFaceInfo): Promise<string | null> {
  const urls = [...face.cssText.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1])
  try {
    let cssText = face.cssText
    for (const url of urls) cssText = cssText.replace(url, await toDataUrl(url))
    return cssText
  } catch (error) {
    console.warn('Failed to embed font', face.family, error)
    return null
  }
}

/**
 * html-to-image の fontEmbedCSS に渡す CSS を作る。
 * 任せると Web フォント CSS の全ファイル（日本語書体では千件超）を毎回取得するため、
 * 使っている書体・太さ・文字範囲のものだけを、取得済みなら使い回して埋め込む。
 *
 * @param surface 書き出す要素
 */
export async function buildFontEmbedCss(surface: HTMLElement): Promise<string> {
  webFontFaces ??= loadWebFontFaces().catch((error) => {
    // オフラインなどで読めなくても、Web フォント抜きで書き出せるようにする。次回は取り直す
    console.warn('Failed to load web font CSS', error)
    webFontFaces = null
    return []
  })
  const faces = selectFontFaces(await webFontFaces, collectUsage(surface))
  const cssTexts = await Promise.all(faces.map(embedFace))
  return cssTexts.filter((css): css is string => css !== null).join('\n')
}
