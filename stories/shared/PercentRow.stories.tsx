import type { Meta, StoryObj } from '@storybook/react-vite'
import { PercentRow } from '@/shared/ui'
import { PanelBox } from '../helpers/frames'
import { Stateful } from '../helpers/state'

/** ストアは 0..1 で持ち、画面には % で見せる行 */
const meta = {
  title: 'shared/ui/PercentRow',
  component: PercentRow,
  args: { label: '不透明度', value: 1, onChange: () => {} },
} satisfies Meta<typeof PercentRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <PanelBox>
      <Stateful initial={args.value}>
        {(value, onChange) => <PercentRow {...args} value={value} onChange={onChange} />}
      </Stateful>
    </PanelBox>
  ),
}

/** 模様の太さのように、範囲が 0..1 の一部に限られる項目 */
export const NarrowRange: Story = {
  ...Default,
  args: { label: '太さ', value: 0.3, min: 0.05, max: 0.9, step: 0.01, onChange: () => {} },
}
