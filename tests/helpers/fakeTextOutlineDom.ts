/** canvas 2D の呼び出しを順に記録する。縁を描く順番・幅・色・位置を検証するため */
export class FakeContext {
  calls: {
    op: string
    text?: string
    x?: number
    y?: number
    width?: number
    color?: string
    font?: string
    image?: unknown
  }[] = []
  font = ''
  lineWidth = 0
  strokeStyle = ''
  fillStyle = ''
  lineJoin = ''
  lineCap = ''
  textAlign = ''
  textBaseline = ''
  transform: number[] = []

  setTransform(...values: number[]) {
    this.transform = values
  }

  measureText() {
    return { fontBoundingBoxAscent: 30 }
  }

  getImageData(_x: number, _y: number, width: number, height: number) {
    return { data: new Uint8ClampedArray(width * height * 4), width, height }
  }

  putImageData() {}

  drawImage(image: unknown) {
    this.calls.push({ op: 'image', image })
  }

  strokeText(text: string, x: number, y: number) {
    this.calls.push({
      op: 'stroke',
      text,
      x,
      y,
      width: this.lineWidth,
      color: this.strokeStyle,
      font: this.font,
    })
  }

  fillText(text: string, x: number, y: number) {
    this.calls.push({ op: 'fill', text, x, y, color: this.fillStyle, font: this.font })
  }
}

export class FakeCanvas {
  width = 0
  height = 0
  style: Record<string, string> = {}
  context = new FakeContext()

  getContext() {
    return this.context
  }
}

class FakeText {
  readonly nodeType = 3
  parentElement: FakeElement | null = null
  constructor(readonly data: string) {}
}

class FakeElement {
  readonly nodeType = 1
  childNodes: (FakeText | FakeElement)[] = []
  style: Record<string, string> = {}
  attributes: Record<string, string> = {}
  offsetWidth = 600
  offsetHeight = 100

  constructor(readonly tagName: string) {}

  get firstElementChild() {
    return this.childNodes.find((node) => !(node instanceof FakeText)) ?? null
  }

  append(...children: (FakeText | FakeElement | FakeCanvas)[]) {
    for (const child of children) {
      if (child instanceof FakeText) child.parentElement = this
      this.childNodes.push(child as FakeElement)
    }
  }

  replaceChildren(...children: (FakeText | FakeElement | FakeCanvas)[]) {
    this.childNodes = []
    this.append(...children)
  }

  getBoundingClientRect() {
    // 表示は 0.5 倍に縮小している（キャンバスの CSS transform）
    return { left: 100, top: 50, width: this.offsetWidth * 0.5, height: this.offsetHeight * 0.5 }
  }
}

/**
 * 前面の文字は「Ab」（全体: 縁1 20px 黒・縁2 offset 白）、「C」（部分: 縁1 10px 青・縁2 2px 赤）、
 * 空白、「D」（縁なし）。1字ずつ横に 25px（表示上）ずつ並ぶ。
 * @param offset 全体の縁2オフセット(px)
 */
export function fakeTextOutlineDom(offset = 5) {
  const root = new FakeElement('div')
  root.attributes = { role: 'textbox' }
  const partial = new FakeElement('span')
  const plain = new FakeElement('span')
  const whole = new FakeText('Ab')
  root.append(whole, partial, new FakeText(' '), plain)
  partial.append(new FakeText('C'))
  plain.append(new FakeText('D'))
  const order = [
    whole,
    partial.childNodes[0],
    root.childNodes[2],
    plain.childNodes[0],
  ] as FakeText[]
  const outline = new FakeElement('div')
  const styles = new Map<
    FakeElement,
    { offset: number; color: string; stroke: number; strokeColor: string; fontSize: number }
  >([
    [root, { offset, color: '#FFFFFF', stroke: 20, strokeColor: '#000000', fontSize: 100 }],
    [
      partial,
      {
        offset: offset > 0 ? 2 : 0,
        color: '#FF0000',
        stroke: 10,
        strokeColor: '#0000FF',
        fontSize: 150,
      },
    ],
    [plain, { offset: 0, color: '#FFFFFF', stroke: 0, strokeColor: '#000000', fontSize: 100 }],
  ])
  // 文字の通し番号ごとの表示上の箱
  const charIndex = (node: FakeText, index: number) => {
    let count = 0
    for (const text of order) {
      if (text === node) return count + index
      count += text.data.length
    }
    return -1
  }
  const canvases: FakeCanvas[] = []
  return {
    root,
    outline,
    canvases,
    window: { devicePixelRatio: 1 },
    document: {
      createRange: () => {
        let node: FakeText
        let start = 0
        return {
          setStart: (target: FakeText, index: number) => {
            node = target
            start = index
          },
          setEnd: () => {},
          getClientRects: () => {
            const i = charIndex(node, start)
            return [{ left: 110 + 25 * i, right: 130 + 25 * i, top: 60, bottom: 80, width: 20 }]
          },
        }
      },
      createElement: () => {
        const canvas = new FakeCanvas()
        canvases.push(canvas)
        return canvas
      },
    },
    getComputedStyle: (element: FakeElement) => {
      const style = styles.get(element)!
      return {
        fontStyle: 'normal',
        fontWeight: '900',
        fontSize: `${style.fontSize}px`,
        fontFamily: 'Test',
        webkitTextStrokeWidth: `${style.stroke}px`,
        webkitTextStrokeColor: 'transparent',
        getPropertyValue: (key: string) =>
          ({
            '--text-outer-stroke-width': String(style.offset),
            '--text-outer-stroke-color': style.color,
            '--text-stroke-color': style.strokeColor,
          })[key] ?? '',
      }
    },
    FakeCanvas,
  }
}
