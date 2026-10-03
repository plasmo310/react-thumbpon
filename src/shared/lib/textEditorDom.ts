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
