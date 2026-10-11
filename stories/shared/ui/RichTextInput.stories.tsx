import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RichTextInput } from '@/shared/ui'
import { createTextLayer, extractTextStyle, textStyle, textFrameStyle } from '@/domain/layer'
import type { TextStrokeJoin } from '@/domain/layer'
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

function FixedLineHeightExample() {
  const [fixedLineHeight, setFixedLineHeight] = useState(80)
  const [fixed, setFixed] = useState(true)
  const [value, setValue] = useState<TextContent>({
    text: '一行目 Ag\n大きな文字 pq\n三行目 Ag\n',
    inlineStyles: [{ start: 7, end: 12, style: { fontSize: 72 } }],
  })
  const preview = {
    ...layer,
    fontSize: 32,
    textAlign: 'left' as const,
    fixedLineHeight: fixed ? fixedLineHeight : null,
    backgroundEnabled: true,
    backgroundColor: '#FFD8C6',
    autoFit: false,
  }
  return (
    <>
      <p>部分的な大きな文字、改行、折り返し、末尾の空行を含む固定の行高を確認できます。</p>
      <label>
        <input
          type="checkbox"
          checked={fixed}
          onChange={(event) => setFixed(event.target.checked)}
        />
        固定の行高
      </label>
      <label>
        行の高さ(px)
        <input
          type="number"
          min="1"
          value={fixedLineHeight}
          onChange={(event) => setFixedLineHeight(Math.max(1, Number(event.target.value)))}
        />
      </label>
      <div style={{ ...textStyle(preview), ...textFrameStyle(preview), width: 320 }}>
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

export const FixedLineHeight: Story = { render: () => <FixedLineHeightExample /> }

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

function ThickStrokeExample() {
  const [value, setValue] = useState<TextContent>({
    text: 'How Do Games\nRun as Programs?',
    inlineStyles: [
      { start: 7, end: 12, style: { color: '#FF4A4A', fontSize: 184 } },
      { start: 20, end: 29, style: { color: '#FFE600', fontSize: 191 } },
    ],
  })
  const preview = {
    ...layer,
    fontSize: 92,
    fontWeight: 900,
    letterSpacing: 12,
    lineHeight: 1.1,
    strokeWidth: 40,
    strokeColor: '#000000',
    outerStrokeWidth: 10,
    outerStrokeColor: '#FFFFFF',
    color: '#FFFFFF',
    textAlign: 'center' as const,
    autoFit: false,
  }
  return (
    <>
      <p>
        文字に対して太い縁1でも、角から突起が出ず、丸い字の縁も丸いことを確認できます（小さい字 92px
        に縁1 40px）。下はキャンバスと同じく CSS transform で縮小した表示です。
      </p>
      <div style={{ ...textStyle(preview), width: 1700, background: '#556', padding: 40 }}>
        <RichTextInput
          canvas
          editable
          baseStyle={extractTextStyle(preview)}
          value={value}
          onChange={setValue}
        />
      </div>
      <div style={{ width: 1780 * 0.4, height: 460 * 0.4, overflow: 'hidden' }}>
        <div
          style={{
            ...textStyle(preview),
            width: 1700,
            background: '#556',
            padding: 40,
            transform: 'scale(0.4)',
            transformOrigin: '0 0',
          }}
        >
          <RichTextInput canvas baseStyle={extractTextStyle(preview)} value={value} />
        </div>
      </div>
      <p>字の穴（ロ・o の内側）にも、外側と同じ縁1・縁2が付きます。</p>
      <div
        style={{
          ...textStyle({ ...preview, fontSize: 80, strokeWidth: 24 }),
          width: 1700,
          background: '#556',
          padding: 40,
        }}
      >
        <RichTextInput
          canvas
          baseStyle={extractTextStyle({ ...preview, fontSize: 80, strokeWidth: 24 })}
          value={{
            text: 'ゲームは プログラムで\nどう動く？',
            inlineStyles: [
              { start: 5, end: 10, style: { color: '#FF4A4A', fontSize: 160, strokeWidth: 40 } },
              { start: 14, end: 17, style: { color: '#FFE600', fontSize: 167, strokeWidth: 40 } },
            ],
          }}
        />
      </div>
    </>
  )
}

export const ThickStroke: Story = { render: () => <ThickStrokeExample /> }

function OutlineCountersExample() {
  const [value, setValue] = useState<TextContent>({ text: 'o O A M 0 8 ロ 回' })
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [outerStrokeWidth, setOuterStrokeWidth] = useState(2)
  const [strokeJoin, setStrokeJoin] = useState<TextStrokeJoin>('round')
  const preview = {
    ...layer,
    fontFamily: 'Arial, sans-serif',
    fontSize: 64,
    fontWeight: 400,
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth,
    strokeJoin,
    outerStrokeColor: '#FF8A5B',
    outerStrokeWidth,
    textAlign: 'left' as const,
  }
  return (
    <>
      <p>縁を太くすると穴が自然に閉じ、その後も穴や突起が再出現しないことを確認します。</p>
      <label>
        縁の角
        <select
          value={strokeJoin}
          onChange={(event) => setStrokeJoin(event.target.value as TextStrokeJoin)}
        >
          <option value="round">丸くする</option>
          <option value="miter">角を残す</option>
        </select>
      </label>
      <label>
        縁1の幅
        <input
          type="range"
          min="0"
          max="80"
          value={strokeWidth}
          onChange={(event) => setStrokeWidth(Number(event.target.value))}
        />
      </label>
      <label>
        縁2オフセット
        <input
          type="range"
          min="0"
          max="40"
          value={outerStrokeWidth}
          onChange={(event) => setOuterStrokeWidth(Number(event.target.value))}
        />
      </label>
      {[1, 0.5].map((scale) => (
        <div key={scale} style={{ height: 140 * scale }}>
          <div
            style={{
              ...textStyle(preview),
              width: 900,
              padding: 24,
              background: '#778899',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <RichTextInput
              canvas
              editable
              baseStyle={extractTextStyle(preview)}
              value={value}
              onChange={setValue}
            />
          </div>
        </div>
      ))}
      <RichTextInput
        editable
        previewStyle={extractTextStyle(preview)}
        value={value}
        onChange={setValue}
      />
    </>
  )
}

export const OutlineCounters: Story = { render: () => <OutlineCountersExample /> }

function OutlineScrollExample() {
  const [value, setValue] = useState<TextContent>({
    text: Array.from({ length: 24 }, () => 'o AM ロ 回 折り返しの確認').join('\n'),
  })
  const [width, setWidth] = useState(220)
  return (
    <>
      <p>
        縦スクロールと太い縁がある入力欄です。幅を変更しても点滅せず、横スクロールが出ないことを確認します。
      </p>
      <label>
        入力欄の幅
        <input
          type="range"
          min="160"
          max="400"
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
        />
      </label>
      {(['round', 'miter'] as const).map((strokeJoin) => (
        <div key={strokeJoin} style={{ width }}>
          <p>{strokeJoin === 'round' ? '丸くする' : '角を残す'}</p>
          <RichTextInput
            editable
            value={value}
            onChange={setValue}
            previewStyle={{
              ...extractTextStyle(layer),
              fontSize: 80,
              strokeWidth: 40,
              outerStrokeWidth: 10,
              strokeJoin,
            }}
          />
        </div>
      ))}
    </>
  )
}

export const OutlineScroll: Story = {
  render: () => <OutlineScrollExample />,
  play: async ({ canvasElement }) => {
    await document.fonts.ready
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    // 初期レイアウトと最初のResizeObserver通知が完了してから、複数フレームの安定性を確認する。
    for (let i = 0; i < 4; i++) await frame()
    const fields = [...canvasElement.querySelectorAll<HTMLElement>('[role="textbox"]')].map(
      (input) => input.parentElement!.parentElement!,
    )
    if (fields.length !== 2) throw new Error('確認対象の入力欄がありません')
    const sizes = fields.map((field) => [field.clientWidth, field.clientHeight, field.scrollHeight])
    for (let i = 0; i < 20; i++) {
      await frame()
      fields.forEach((field, index) => {
        if (field.scrollWidth > field.clientWidth + 1)
          throw new Error('輪郭が横スクロール範囲を広げています')
        if (field.scrollHeight <= field.clientHeight)
          throw new Error('縦スクロールの確認条件を満たしていません')
        if (
          JSON.stringify([field.clientWidth, field.clientHeight, field.scrollHeight]) !==
          JSON.stringify(sizes[index])
        )
          throw new Error('入力欄の大きさが再描画で変動しています')
      })
    }
  },
}
