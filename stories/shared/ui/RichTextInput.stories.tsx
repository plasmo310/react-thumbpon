import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RichTextInput } from '@/shared/ui'
import { createTextLayer, extractTextStyle } from '@/domain/layer'
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
