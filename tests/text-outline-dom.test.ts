import { afterEach, describe, expect, it, vi } from 'vitest'
import { paintEditorOutline, resolveCounters } from '@/shared/lib/textEditorDom'
import { FakeCanvas, fakeTextOutlineDom } from './helpers/fakeTextOutlineDom'

afterEach(() => vi.unstubAllGlobals())

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
  const inner = dom.canvases.find((value) => value !== canvas)
  return {
    ...dom,
    canvas,
    outerCalls: canvas?.context.calls ?? [],
    innerCalls: inner?.context.calls ?? [],
    inner,
  }
}

const strokes = (calls: ReturnType<typeof paint>['outerCalls']) =>
  calls.filter((call) => call.op === 'stroke').map((call) => [call.text, call.width, call.color])

describe('縁の背面描画（canvas）', () => {
  it('縁2と縁1を別々に描き、縁1を縁2の上に重ねる。角を丸くつなぎ、縁の無い文字と空白は描かない', () => {
    const { canvas, inner, outerCalls, innerCalls } = paint()
    expect(canvas!.context.lineJoin).toBe('round')
    expect(inner!.context.lineJoin).toBe('round')
    // 縁2: 縁1の幅 + オフセット×2
    expect(strokes(outerCalls)).toEqual([
      ['A', 30, '#FFFFFF'],
      ['b', 30, '#FFFFFF'],
      ['C', 14, '#FF0000'],
    ])
    expect(strokes(innerCalls)).toEqual([
      ['A', 20, '#000000'],
      ['b', 20, '#000000'],
      ['C', 10, '#0000FF'],
    ])
    expect(outerCalls.at(-1)).toMatchObject({ op: 'image', image: inner })
    expect(
      [...outerCalls, ...innerCalls].some((call) => call.text === 'D' || call.text === ' '),
    ).toBe(false)
    expect(innerCalls.find((call) => call.text === 'C')!.font).toBe('normal 900 150px Test')
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
    const { outerCalls, innerCalls } = paint(0)
    expect(strokes(outerCalls)).toEqual([])
    expect(strokes(innerCalls)).toHaveLength(3)
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

/**
 * 9×9 の画像に、縁1の四角い輪（外周 1〜7、穴 3〜5）を描く。縁2は全面に白。
 */
function ring() {
  const width = 9
  const inner = new Uint8ClampedArray(width * width * 4)
  const outer = new Uint8ClampedArray(width * width * 4)
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4
      outer.set([255, 255, 255, 255], at)
      const inRing = x >= 1 && x <= 7 && y >= 1 && y <= 7
      const inHole = x >= 3 && x <= 5 && y >= 3 && y <= 5
      if (inRing && !inHole) inner.set([10, 20, 30, 255], at)
    }
  }
  const alpha = (data: Uint8ClampedArray, x: number, y: number) => data[(y * width + x) * 4 + 3]
  return { width, inner, outer, alpha }
}

describe('字の穴の中の縁2', () => {
  it('外周から届かない空き（字の穴）の縁2を消し、外側の縁2は残す', () => {
    const { width, inner, outer, alpha } = ring()
    resolveCounters(inner, outer, width, width, 0)
    expect(alpha(outer, 4, 4)).toBe(0)
    expect(alpha(outer, 3, 5)).toBe(0)
    expect(alpha(outer, 0, 0)).toBe(255)
    expect(alpha(outer, 8, 4)).toBe(255)
    // 大きい穴は埋めない
    expect(alpha(inner, 4, 4)).toBe(0)
  })

  it('縁1の幅に比べて小さい穴は、まわりの縁1の色で埋める', () => {
    const { width, inner, outer, alpha } = ring()
    resolveCounters(inner, outer, width, width, 10)
    expect(alpha(inner, 4, 4)).toBe(255)
    expect([...inner.slice((4 * width + 4) * 4, (4 * width + 4) * 4 + 3)]).toEqual([10, 20, 30])
    expect(alpha(outer, 4, 4)).toBe(0)
  })

  it('外とつながった空き（c の開いた所など）は穴とみなさない', () => {
    const { width, inner, outer, alpha } = ring()
    // 輪の右側を切って外とつなげる
    for (let y = 3; y <= 5; y++) inner.set([0, 0, 0, 0], (y * width + 6) * 4)
    for (let y = 3; y <= 5; y++) inner.set([0, 0, 0, 0], (y * width + 7) * 4)
    resolveCounters(inner, outer, width, width, 100)
    expect(alpha(outer, 4, 4)).toBe(255)
    expect(alpha(inner, 4, 4)).toBe(0)
  })
})
