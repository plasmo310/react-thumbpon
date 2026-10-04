import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RichTextInput } from '@/shared/ui'
import { createTextLayer, extractTextStyle, textStyle, textFrameStyle } from '@/domain/layer'
import { formatTextRange } from '@/domain/text'
import type { TextContent, TextRange } from '@/domain/text'

const layer = createTextLayer({ width: 1280, height: 720 })
const meta = {
  title: 'shared/ui/RichTextInput',
  component: RichTextInput,
  args: {
    editable: true,
    active: true,
    previewStyle: extractTextStyle(layer),
    value: {
      text: 'これが最強の方法',
      inlineStyles: [
        { start: 3, end: 5, style: { color: '#FF0000', fontSize: layer.fontSize * 2 } },
      ],
    },
  },
} satisfies Meta<typeof RichTextInput>

export default meta
type Story = StoryObj<typeof meta>

function Example() {
  const [value, setValue] = useState<TextContent>(meta.args.value)
  const [selection, setSelection] = useState<TextRange>({ start: 0, end: 0 })
  return (
    <>
      <p>文字を選択し、ボタンで部分書式を変更できます。</p>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() =>
          setValue(
            formatTextRange(value, selection, { color: '#FF0000', fontSize: layer.fontSize * 2 }),
          )
        }
      >
        選択文字を赤く大きく
      </button>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setValue(formatTextRange(value, selection, null))}
      >
        部分書式を解除
      </button>
      <RichTextInput
        {...meta.args}
        value={value}
        selection={selection}
        onSelectionChange={setSelection}
        onChange={(content, range) => {
          setValue(content)
          setSelection(range)
        }}
      />
    </>
  )
}

export const Default: Story = { render: () => <Example /> }

function LineSpacingExample() {
  const [lineHeight, setLineHeight] = useState(1.3)
  const [text, setText] = useState('一行のテキスト Ag')
  const [autoFit, setAutoFit] = useState(true)
  const preview = {
    ...layer,
    text,
    autoFit,
    fontSize: 32,
    lineHeight,
    backgroundEnabled: true,
    backgroundColor: '#FFD8C6',
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
  }
  return (
    <>
      <p>
        一行では行間を変えても背景の高さは変わりません。改行・折り返しでは行同士の間隔が変わります。
      </p>
      <label>
        行間
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={lineHeight}
          onChange={(event) => setLineHeight(Number(event.target.value))}
        />
        {lineHeight}
      </label>
      <button type="button" onClick={() => setText('一行のテキスト Ag')}>
        一行
      </button>
      <button type="button" onClick={() => setText('一行目 Ag\n二行目 pq\n三行目')}>
        複数行
      </button>
      <button type="button" onClick={() => setText('')}>
        空文字
      </button>
      <label>
        <input
          type="checkbox"
          checked={autoFit}
          onChange={(event) => setAutoFit(event.target.checked)}
        />
        折り返さない
      </label>
      <div
        style={{
          ...textStyle(preview),
          ...textFrameStyle(preview),
          width: autoFit ? 'max-content' : 220,
        }}
      >
        <RichTextInput
          canvas
          baseStyle={extractTextStyle(preview)}
          editable
          value={{ text }}
          style={{
            whiteSpace: autoFit ? 'pre' : 'pre-wrap',
            overflowWrap: autoFit ? 'normal' : 'anywhere',
            wordBreak: autoFit ? 'normal' : 'break-word',
          }}
          onChange={(content) => setText(content.text)}
        />
      </div>
    </>
  )
}

export const LineSpacing: Story = { render: () => <LineSpacingExample /> }

function DoubleOutlineExample() {
  const [value, setValue] = useState<TextContent>({
    text: 'プログラムって動く？\n部分書式にも対応 Ag',
    inlineStyles: [{ start: 9, end: 13, style: { fontSize: 64, outerStrokeColor: '#FFD800' } }],
  })
  const [outerStrokeWidth, setOuterStrokeWidth] = useState(8)
  const preview = {
    ...layer,
    fontSize: 40,
    strokeWidth: 20,
    strokeColor: '#000000',
    outerStrokeWidth,
    outerStrokeColor: '#FFFFFF',
    color: '#FF8A5B',
    textAlign: 'left' as const,
    autoFit: false,
  }
  return (
    <>
      <label>
        縁1からのオフセット(px){' '}
        <input
          type="range"
          min="0"
          max="20"
          value={outerStrokeWidth}
          onChange={(event) => setOuterStrokeWidth(Number(event.target.value))}
        />
      </label>
      <div style={{ ...textStyle(preview), width: 460, background: '#888888', padding: 24 }}>
        <RichTextInput
          canvas
          editable
          baseStyle={extractTextStyle(preview)}
          value={value}
          onChange={setValue}
        />
      </div>
      <RichTextInput
        editable
        previewStyle={extractTextStyle(preview)}
        value={value}
        onChange={setValue}
      />
    </>
  )
}

export const DoubleOutline: Story = { render: () => <DoubleOutlineExample /> }
