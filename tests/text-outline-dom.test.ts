import { afterEach, describe, expect, it, vi } from 'vitest'
import { paintEditorOutline } from '@/shared/lib/textEditorDom'
import { fakeTextOutlineDom } from './helpers/fakeTextOutlineDom'

afterEach(() => vi.unstubAllGlobals())

function paint(offset = 5, previewBaseSize?: number) {
  const dom = fakeTextOutlineDom(offset)
  vi.stubGlobal('document', dom.document)
  vi.stubGlobal('getComputedStyle', dom.getComputedStyle)
  paintEditorOutline(
    dom.root as unknown as HTMLElement,
    dom.outline as unknown as HTMLElement,
    'test',
    'sameTextLayout',
    previewBaseSize,
  )
  return dom
}

describe('縁2の背面描画', () => {
  it('縁1を太くし直さず、指定pxだけその形を拡張する', () => {
    const { root, outline } = paint()
    const nodes = outline.querySelectorAll()
    const dilation = nodes.filter((node) => node.tagName === 'feMorphology')
    expect(dilation.map((node) => node.attributes.radius)).toEqual(['5', '2'])
    expect(dilation.every((node) => node.attributes.in === 'SourceAlpha')).toBe(true)
    const back = outline.children[1]
    expect(back.style.webkitTextStrokeWidth).toBe('20px')
    expect(back.children[0].style.webkitTextStrokeWidth).toBe('10px')
    expect(back.style.fontSize).toBe(root.style.fontSize)
    expect(back.style.lineHeight).toBe(root.style.lineHeight)
    expect(back.style.whiteSpace).toBe(root.style.whiteSpace)
    expect(back.children[0].style.fontSize).toBe('150px')
    expect(back.className).toBe('sameTextLayout')
    expect(back.attributes.role).toBeUndefined()
    expect(back.attributes.tabindex).toBeUndefined()
    expect(root.attributes.role).toBe('textbox')
    expect(root.style.filter).toBeUndefined()
    expect(root.children[0].style.webkitTextStrokeWidth).toBeUndefined()
  })

  it('部分指定の色ごとに背面を分け、無効な文字は描かない', () => {
    const { outline } = paint()
    const colors = outline.querySelectorAll().filter((node) => node.tagName === 'feFlood')
    expect(colors.map((node) => node.attributes['flood-color'])).toEqual(['#FFFFFF', '#FF0000'])
    const whole = outline.children[1],
      partial = outline.children[2]
    expect(whole.children[0].style.webkitTextFillColor).toBe('transparent')
    expect(partial.children[0].style.webkitTextFillColor).toBe('#FFFFFF')
    expect(whole.children[1].style.webkitTextStrokeColor).toBe('transparent')
    expect(partial.children[1].style.webkitTextStrokeColor).toBe('transparent')
    expect(whole.style.filter).not.toBe(partial.style.filter)
  })

  it('サイドバーではオフセットも文字と同じ比率に縮小する', () => {
    const { outline } = paint(5, 200)
    const dilation = outline.querySelectorAll().filter((node) => node.tagName === 'feMorphology')
    expect(dilation.map((node) => node.attributes.radius)).toEqual(['2.5', '1'])
  })

  it('オフセット0では背面の文字を生成しない', () => {
    const { outline } = paint(0)
    expect(outline.children).toHaveLength(1)
    expect(outline.querySelectorAll().some((node) => node.tagName === 'feMorphology')).toBe(false)
  })
})
