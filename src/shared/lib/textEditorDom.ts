import { inlineTextCss, textSegments } from '@/domain/text'
import type { TextContent, TextRange } from '@/domain/text'

/**
 * 入力DOMをプレーンテキストへ直す。ブラウザが挿入する改行要素も扱う。
 * @param root 入力要素
 */
export function readEditorText(root: HTMLElement): string {
  // 全削除後にブラウザが残す単独のbrは、改行ではなくカーソル用の空行である。
  if (!root.textContent && root.querySelectorAll('br:not([data-text-sentinel])').length === 1)
    return ''
  function read(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (!(node instanceof HTMLElement)) return ''
    if (node.dataset.textSentinel) return ''
    if (node.tagName === 'BR') return '\n'
    let value = ''
    for (const child of node.childNodes) {
      const block = child instanceof HTMLElement && ['DIV', 'P'].includes(child.tagName)
      if (block && value && !value.endsWith('\n')) value += '\n'
      value += read(child)
    }
    return value
  }
  return read(root).replace(/\r\n?/g, '\n')
}

/**
 * DOM選択をUTF-16位置へ変換する。入力欄外の選択は無視する。
 * @param root 入力要素
 */
export function readEditorSelection(root: HTMLElement): TextRange | null {
  const selection = window.getSelection()
  if (
    !selection?.anchorNode ||
    !selection.focusNode ||
    !root.contains(selection.anchorNode) ||
    !root.contains(selection.focusNode)
  )
    return null
  function offset(node: Node, position: number) {
    const range = document.createRange()
    range.selectNodeContents(root)
    range.setEnd(node, position)
    const temporary = document.createElement('div')
    temporary.append(range.cloneContents())
    return readEditorText(temporary).length
  }
  const anchor = offset(selection.anchorNode, selection.anchorOffset)
  const focus = offset(selection.focusNode, selection.focusOffset)
  return {
    start: Math.min(anchor, focus),
    end: Math.max(anchor, focus),
    ...(anchor > focus ? { backward: true } : {}),
  }
}

/**
 * 正規化済みの文字位置からDOM選択を復元する。
 * @param root 入力要素
 * @param selected UTF-16の選択範囲
 */
export function restoreEditorSelection(root: HTMLElement, selected: TextRange) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node = walker.nextNode()
  while (node) {
    nodes.push(node as Text)
    node = walker.nextNode()
  }
  if (!nodes.length) return
  function locate(position: number): [Text, number] {
    let remaining = Math.max(0, position)
    for (const text of nodes) {
      if (remaining <= text.length) return [text, remaining]
      remaining -= text.length
    }
    const last = nodes[nodes.length - 1]
    return [last, last.length]
  }
  const range = document.createRange()
  range.setStart(...locate(selected.start))
  range.setEnd(...locate(selected.end))
  const selection = window.getSelection()
  selection?.removeAllRanges()
  if (selected.backward)
    selection?.setBaseAndExtent(
      range.endContainer,
      range.endOffset,
      range.startContainer,
      range.startOffset,
    )
  else selection?.addRange(range)
}

/**
 * 信頼できるモデルだけから入力DOMを作る。外部HTMLは取り込まない。
 * @param root 入力要素
 * @param content 文字列と部分書式
 * @param previewBaseSize サイドバー表示の基準文字サイズ(px)。指定すると相対サイズへ変換する
 */
export function paintEditorText(root: HTMLElement, content: TextContent, previewBaseSize?: number) {
  const fragment = document.createDocumentFragment()
  for (const segment of textSegments(content)) {
    const span = document.createElement('span')
    const css = inlineTextCss(segment.style)
    for (const [key, value] of Object.entries(css)) {
      if (value === undefined) continue
      if (key.startsWith('--')) {
        span.style.setProperty(key, String(value))
        continue
      }
      const dimension =
        key === 'fontSize'
          ? previewBaseSize
            ? `${Number(value) / previewBaseSize}em`
            : `${value}px`
          : key === 'WebkitTextStrokeWidth' && previewBaseSize
            ? `${parseFloat(String(value)) / previewBaseSize}em`
            : String(value)
      Object.assign(span.style, { [key]: dimension })
    }
    span.textContent = content.text.slice(segment.start, segment.end)
    fragment.append(span)
  }
  if (!content.text) fragment.append(document.createTextNode(''))
  if (!content.text || content.text.endsWith('\n')) {
    const sentinel = document.createElement('br')
    sentinel.dataset.textSentinel = 'true'
    fragment.append(sentinel)
  }
  root.replaceChildren(fragment)
}

/**
 * 元の文字と縁1の形を背面で広げる。ストロークを太くし直すと角に新しい突起が出るため、形の拡張だけを行う。
 * @param root 入力中の未確定文字も含む前面DOM
 * @param outline 選択と入力から除外した背面の格納先
 * @param instanceId 他の入力欄と衝突しないフィルターIDの接頭辞
 * @param className 前面と同じ文字レイアウト用クラス
 * @param previewBaseSize サイドバー表示の基準文字サイズ(px)。省略時は実寸
 */
/**
 * 元の文字と縁1の形を背面で広げる。ストロークを太くし直すと角に新しい突起が出るため、形の拡張だけを行う。
 * @param root 入力中の未確定文字も含む前面DOM
 * @param outline 選択と入力から除外した背面の格納先
 * @param instanceId 他の入力欄と衝突しないフィルターIDの接頭辞
 * @param className 前面と同じ文字レイアウト用クラス
 * @param previewBaseSize サイドバー表示の基準文字サイズ(px)。省略時は実寸
 */
export function paintEditorOutline(
  root: HTMLElement,
  outline: HTMLElement,
  instanceId: string,
  className: string,
  previewBaseSize?: number,
) {
  const scale = previewBaseSize ? parseFloat(getComputedStyle(root).fontSize) / previewBaseSize : 1
  const sources = [root, ...root.querySelectorAll<HTMLElement>('*')]
  const paints = sources.map((source) => {
    const css = getComputedStyle(source)
    return {
      offset: Math.max(0, Number(css.getPropertyValue('--text-outer-stroke-width')) * scale),
      color: css.getPropertyValue('--text-outer-stroke-color').trim(),
      strokeWidth: parseFloat(css.webkitTextStrokeWidth) || 0,
    }
  })
  const groups = new Map<string, (typeof paints)[number]>()
  const key = (paint: (typeof paints)[number]) => JSON.stringify([paint.offset, paint.color])
  for (const paint of paints) {
    if (paint.offset > 0) groups.set(key(paint), paint)
  }
  const namespace = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(namespace, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  const defs = document.createElementNS(namespace, 'defs')
  svg.append(defs)
  const fragment = document.createDocumentFragment()
  fragment.append(svg)
  let index = 0
  for (const [group, paint] of groups) {
    const clone = root.cloneNode(true) as HTMLElement
    clone.className = className
    clone.removeAttribute('role')
    clone.removeAttribute('tabindex')
    clone.removeAttribute('aria-label')
    clone.contentEditable = 'false'
    const targets = [clone, ...clone.querySelectorAll<HTMLElement>('*')]
    targets.forEach((target, position) => {
      const included = key(paints[position]) === group
      target.style.color = included ? '#FFFFFF' : 'transparent'
      target.style.webkitTextFillColor = included ? '#FFFFFF' : 'transparent'
      target.style.webkitTextStrokeColor = included ? '#FFFFFF' : 'transparent'
      target.style.webkitTextStrokeWidth = `${paints[position].strokeWidth}px`
      target.style.textShadow = 'none'
    })
    const id = `text-outline-${instanceId}-${index++}`
    const filter = document.createElementNS(namespace, 'filter')
    filter.id = id
    filter.setAttribute('filterUnits', 'userSpaceOnUse')
    const padding = Math.ceil(
      Math.max(...paints.map((part) => part.strokeWidth * 4)) + paint.offset + 1,
    )
    filter.setAttribute('x', String(-padding))
    filter.setAttribute('y', String(-padding))
    filter.setAttribute('width', String(root.offsetWidth + padding * 2))
    filter.setAttribute('height', String(root.offsetHeight + padding * 2))
    const dilate = document.createElementNS(namespace, 'feMorphology')
    dilate.setAttribute('in', 'SourceAlpha')
    dilate.setAttribute('operator', 'dilate')
    dilate.setAttribute('radius', String(paint.offset))
    dilate.setAttribute('result', 'expanded')
    const flood = document.createElementNS(namespace, 'feFlood')
    flood.setAttribute('flood-color', paint.color)
    const composite = document.createElementNS(namespace, 'feComposite')
    composite.setAttribute('in2', 'expanded')
    composite.setAttribute('operator', 'in')
    filter.append(dilate, flood, composite)
    defs.append(filter)
    clone.style.filter = `url("#${id}")`
    fragment.append(clone)
  }
  outline.replaceChildren(fragment)
}
