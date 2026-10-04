class Element {
  children: Element[] = []
  attributes: Record<string, string> = {}
  style: Record<string, string> = {}
  className = ''
  id = ''
  contentEditable = ''
  offsetWidth = 300
  offsetHeight = 100

  constructor(readonly tagName: string) {}

  append(...children: Element[]) {
    this.children.push(
      ...children.flatMap((child) => (child.tagName === 'fragment' ? child.children : [child])),
    )
  }

  replaceChildren(...children: Element[]) {
    this.children = []
    this.append(...children)
  }

  setAttribute(key: string, value: string) {
    this.attributes[key] = value
  }

  removeAttribute(key: string) {
    delete this.attributes[key]
  }

  querySelectorAll(): Element[] {
    return this.children.flatMap((child) => [child, ...child.querySelectorAll()])
  }

  cloneNode(): Element {
    const clone = new Element(this.tagName)
    clone.attributes = { ...this.attributes }
    clone.style = { ...this.style }
    clone.className = this.className
    clone.children = this.children.map((child) => child.cloneNode())
    return clone
  }
}

/**
 * レイアウトはブラウザ境界の固定値とし、背面だけが変更されることを検証する。
 * @param offset 全体の縁2オフセット(px)
 */
export function fakeTextOutlineDom(offset = 5) {
  const root = new Element('div')
  root.style = { fontSize: '100px', lineHeight: '1.3', whiteSpace: 'pre-wrap' }
  root.attributes = { role: 'textbox', tabindex: '0' }
  const partial = new Element('span')
  partial.style = { fontSize: '150px' }
  const disabled = new Element('span')
  root.append(partial, disabled)
  const outline = new Element('div')
  const paints = new Map([
    [root, { offset, color: '#FFFFFF', stroke: 20 }],
    [partial, { offset: offset > 0 ? 2 : 0, color: '#FF0000', stroke: 10 }],
    [disabled, { offset: 0, color: '#FFFFFF', stroke: 20 }],
  ])
  return {
    root,
    outline,
    document: {
      createElementNS: (_namespace: string, tag: string) => new Element(tag),
      createDocumentFragment: () => new Element('fragment'),
    },
    getComputedStyle: (element: Element) => {
      const paint = paints.get(element)!
      return {
        fontSize: root.style.fontSize,
        webkitTextStrokeWidth: `${paint.stroke}px`,
        getPropertyValue: (key: string) =>
          key === '--text-outer-stroke-width' ? String(paint.offset) : paint.color,
      }
    },
  }
}
