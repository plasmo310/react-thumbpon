import { afterEach, describe, expect, it, vi } from 'vitest'
import { paintEditorOutline } from '@/shared/lib/textEditorDom'
import { FakeCanvas, fakeTextOutlineDom } from './helpers/fakeTextOutlineDom'
import { drawTextOutline } from '@/shared/lib/textOutlineCanvas'

vi.mock('@/shared/lib/textOutlineCanvas', () => ({ drawTextOutline: vi.fn() }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function paint(offset = 5, previewBaseSize?: number, dom = fakeTextOutlineDom(offset)) {
  vi.stubGlobal('document', dom.document)
  vi.stubGlobal('window', dom.window)
  vi.stubGlobal('getComputedStyle', dom.getComputedStyle)
  vi.stubGlobal('HTMLCanvasElement', FakeCanvas)
  paintEditorOutline(
    dom.root as unknown as HTMLElement,
    dom.outline as unknown as HTMLElement,
    previewBaseSize,
  )
  // 背面に置くのは縁2の canvas。縁1は別の canvas に描いてから重ねる
  const canvas = dom.outline.childNodes[0] as unknown as FakeCanvas | undefined
  const stroke = dom.canvases.find((value) => value !== canvas)
  const calls = (context: unknown) =>
    vi
      .mocked(drawTextOutline)
      .mock.calls.filter(([target]) => target === context)
      .map(([, text, x, y, width, color]) => ({ op: 'stroke', text, x, y, width, color }))
  return {
    ...dom,
    canvas,
    stroke,
    outerCalls: calls(canvas?.context),
    strokeCalls: calls(stroke?.context),
  }
}

const strokes = (calls: ReturnType<typeof paint>['outerCalls']) =>
  calls.filter((call) => call.op === 'stroke').map((call) => [call.text, call.width, call.color])

describe('縁の背面描画（canvas）', () => {
  it('縁2と縁1を別々に描き、縁1を縁2の上に重ねる。角を丸くつなぎ、縁の無い文字と空白は描かない', () => {
    const { canvas, stroke, outerCalls, strokeCalls } = paint()
    // 縁2: 縁1の幅 + オフセット×2
    expect(strokes(outerCalls)).toEqual([
      ['A', 30, '#FFFFFF'],
      ['b', 30, '#FFFFFF'],
      ['C', 14, '#FF0000'],
    ])
    expect(strokes(strokeCalls)).toEqual([
      ['A', 20, '#000000'],
      ['b', 20, '#000000'],
      ['C', 10, '#0000FF'],
    ])
    expect(canvas!.context.calls.at(-1)).toMatchObject({ op: 'image', image: stroke })
    const all = [...outerCalls, ...strokeCalls]
    expect(all.some((call) => call.text === 'D' || call.text === ' ')).toBe(false)
    expect(stroke!.context.font).toBe('normal 900 150px Test')
  })

  it('位置は前面の文字の箱から測り、表示の縮小を打ち消して実寸にする', () => {
    const { outerCalls } = paint()
    const first = outerCalls[0]
    // 表示上 (110 - 100) / 0.5 = 20px。上端 (60 - 50) / 0.5 = 20px にフォントの上側 30px を足してベースライン
    expect(first.x).toBe(20)
    expect(first.y).toBe(50)
    expect(outerCalls.find((call) => call.text === 'C')!.x).toBe(120)
  })

  it('canvas は文字の範囲に余白を足した大きさで置き、描き直しでは使い回す', () => {
    const dom = fakeTextOutlineDom()
    const { canvas } = paint(5, undefined, dom)
    expect(canvas!.style.position).toBe('absolute')
    expect(parseFloat(canvas!.style.left)).toBeLessThan(20)
    paint(5, undefined, dom)
    expect(dom.outline.childNodes[0]).toBe(canvas)
    expect(dom.canvases).toHaveLength(2)
  })

  it('サイドバーではオフセットも文字と同じ比率に縮小する（縁1の幅は計算値で縮小済み）', () => {
    const { outerCalls } = paint(5, 200)
    expect(strokes(outerCalls)[0][1]).toBe(20 + 2.5 * 2)
  })

  it('縁2が無くても、縁1は描く', () => {
    const { outerCalls, strokeCalls } = paint(0)
    expect(strokes(outerCalls)).toEqual([])
    expect(strokes(strokeCalls)).toHaveLength(3)
  })

  it('前面には触らない', () => {
    const { root } = paint()
    expect(root.style).toEqual({})
    expect(root.attributes.role).toBe('textbox')
  })

  it('縁を描く文字が無ければ背面を空にする', () => {
    const dom = fakeTextOutlineDom()
    dom.root.replaceChildren()
    const { outline } = paint(5, undefined, dom)
    expect(outline.childNodes).toHaveLength(0)
  })
})
