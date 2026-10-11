import { afterEach, describe, expect, it, vi } from 'vitest'
import { expandTextAlpha } from '@/domain/textOutline'
import { drawTextOutline } from '@/shared/lib/textOutlineCanvas'
import { FakeCanvas, FakeContext } from './helpers/fakeTextOutlineDom'

afterEach(() => vi.unstubAllGlobals())

function ring(radius: number) {
  const width = 31
  const data = new Uint8ClampedArray(width * width * 4)
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.hypot(x - 15, y - 15)
      if (distance >= 4 && distance <= 8) data[(y * width + x) * 4 + 3] = 255
    }
  }
  expandTextAlpha(data, width, width, radius)
  return data
}

describe('字形からの距離で縁を広げる', () => {
  it('o の小さい穴は幅に応じて閉じ、さらに太くしても再び穴が開かない', () => {
    let previous = ring(0)
    expect(ring(1)[(15 * 31 + 15) * 4 + 3]).toBe(0)
    for (const radius of [0.5, 1, 2, 3, 4, 5, 8, 12, 20]) {
      const next = ring(radius)
      for (let i = 3; i < next.length; i += 4) expect(next[i]).toBeGreaterThanOrEqual(previous[i])
      if (radius >= 4.5) expect(next[(15 * 31 + 15) * 4 + 3]).toBe(255)
      previous = next
    }
  })

  it('円の内周と外周は上下左右に対称で、角形の膨張にならない', () => {
    const data = ring(2)
    const alpha = (x: number, y: number) => data[(y * 31 + x) * 4 + 3]
    for (let y = 0; y < 31; y++) {
      for (let x = 0; x < 31; x++) {
        expect(alpha(x, y)).toBe(alpha(30 - x, y))
        expect(alpha(x, y)).toBe(alpha(y, x))
      }
    }
    expect(alpha(25, 15)).toBeGreaterThan(0)
    expect(alpha(25, 25)).toBe(0)
  })

  it('距離変換は全画素を直接比較した円形の膨張と一致する', () => {
    const width = 13
    const height = 9
    const seeds = [
      [2, 3, 255],
      [9, 1, 80],
      [6, 7, 190],
    ]
    const data = new Uint8ClampedArray(width * height * 4)
    for (const [x, y, alpha] of seeds) data[(y * width + x) * 4 + 3] = alpha
    const original = data.slice()
    expandTextAlpha(data, width, height, 2.25)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distance = Math.sqrt(
          Math.min(
            ...seeds.map(
              ([sx, sy, alpha]) =>
                (x - sx) ** 2 + (y - sy) ** 2 + Math.max(0, 0.5 - alpha / 255) ** 2,
            ),
          ),
        )
        const at = (y * width + x) * 4 + 3
        const expected = new Uint8ClampedArray([
          Math.max(original[at], Math.min(1, Math.max(0, 2.75 - distance)) * 255),
        ])[0]
        expect(data[at]).toBe(expected)
      }
    }
  })

  it('空の字形は太い縁でも透明で、幅0では元のアンチエイリアスを保つ', () => {
    const empty = new Uint8ClampedArray(100)
    expandTextAlpha(empty, 5, 5, 100)
    expect(empty.every((value) => value === 0)).toBe(true)
    empty[3] = 80
    const original = empty.slice()
    expandTextAlpha(empty, 5, 5, 0)
    expect(empty).toEqual(original)
  })
})

describe('輪郭用canvas', () => {
  function setup() {
    const canvases: FakeCanvas[] = []
    const fonts = new EventTarget()
    vi.stubGlobal('document', {
      fonts,
      createElement: () => {
        const canvas = new FakeCanvas()
        canvases.push(canvas)
        return canvas
      },
    })
    const context = new FakeContext()
    context.font = 'normal 400 64px Arial'
    const draw = (text = 'o', width = 20, color = '#123456', join: 'round' | 'miter' = 'round') =>
      drawTextOutline(
        context as unknown as CanvasRenderingContext2D,
        text,
        20,
        50,
        width,
        color,
        2,
        join,
      )
    return { canvases, fonts, context, draw }
  }

  it('丸い縁は塗りマスクを拡張し、指定色・位置で合成する', () => {
    const { canvases, context, draw } = setup()
    draw()
    const [mask, colored] = canvases
    expect(mask.context.calls[0]).toMatchObject({ op: 'fill', text: 'o', font: context.font })
    expect(mask.context.calls.some((call) => call.op === 'stroke')).toBe(false)
    expect(colored.context.globalCompositeOperation).toBe('source-in')
    expect(colored.context.calls.at(-1)).toEqual({ op: 'color', color: '#123456' })
    expect(context.calls).toEqual([{ op: 'image', image: colored, x: 8, y: 8 }])
    expect(mask.width).toBe(128)
    expect(mask.height).toBe(118)
  })

  it('角を残す縁はマイターで描き、小さい穴が再出現しない丸い下地を重ねる', () => {
    const { canvases, draw } = setup()
    draw('o', 20, '#000000', 'miter')
    const [round, sharp] = canvases
    expect(sharp.context.lineJoin).toBe('miter')
    // 直角は角を保ち、60度以下の鋭角は長い接合線を伸ばさず面取りする。
    expect(sharp.context.miterLimit).toBeGreaterThanOrEqual(1 / Math.sin(Math.PI / 4))
    expect(sharp.context.miterLimit).toBeLessThan(1 / Math.sin(Math.PI / 6))
    expect(sharp.context.calls[0]).toMatchObject({ op: 'stroke', text: 'o', width: 20 })
    expect(sharp.context.calls[1]).toMatchObject({ op: 'image', image: round })
    expect(sharp.width).toBeGreaterThan(round.width)
  })

  it('同じ字形は100回描画・色変更しても画素計算は初回だけ。幅・フォント・解像度は別に計算する', () => {
    const { context, draw } = setup()
    const read = vi.spyOn(FakeContext.prototype, 'getImageData')
    try {
      for (let i = 0; i < 100; i++) draw('o', 20, i % 2 ? '#ffffff' : '#000000')
      expect(read).toHaveBeenCalledTimes(1)
      draw('o', 22)
      context.font = 'normal 900 64px Arial'
      draw('o', 22)
      drawTextOutline(context as unknown as CanvasRenderingContext2D, 'o', 0, 0, 22, '#000000', 3)
      expect(read).toHaveBeenCalledTimes(4)
    } finally {
      read.mockRestore()
    }
  })

  it('別レイヤーでも字形を共有し、フォント読み込み後は古い字形を破棄する', () => {
    const { context, fonts, draw } = setup()
    const read = vi.spyOn(FakeContext.prototype, 'getImageData')
    try {
      draw()
      const other = new FakeContext()
      other.font = context.font
      drawTextOutline(other as unknown as CanvasRenderingContext2D, 'o', 300, 50, 20, '#ff0000', 2)
      expect(read).toHaveBeenCalledTimes(1)
      fonts.dispatchEvent(new Event('loadingdone'))
      draw()
      expect(read).toHaveBeenCalledTimes(2)
    } finally {
      read.mockRestore()
    }
  })

  it('大量の字形を描いた場合は容量を超えた古いキャッシュを破棄する', () => {
    const { draw } = setup()
    const read = vi.spyOn(FakeContext.prototype, 'getImageData')
    try {
      draw('old')
      for (let i = 0; i < 600; i++) draw(String(i))
      draw('old')
      expect(read).toHaveBeenCalledTimes(602)
    } finally {
      read.mockRestore()
    }
  })
})
