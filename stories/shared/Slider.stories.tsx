import type { Meta, StoryObj } from '@storybook/react-vite'
import { Slider } from '@/shared/ui'
import { PanelBox } from '../helpers/frames'
import { Stateful } from '../helpers/state'

const meta = {
  title: 'shared/ui/Slider',
  component: Slider,
  args: { value: 50, min: 0, max: 100, step: 1, onChange: () => {} },
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <PanelBox>
      <Stateful initial={args.value}>
        {(value, onChange) => <Slider {...args} value={value} onChange={onChange} />}
      </Stateful>
    </PanelBox>
  ),
}

/** 回転のように負の値から始まる範囲 */
export const Signed: Story = {
  ...Default,
  args: { value: 0, min: -180, max: 180, step: 1, onChange: () => {} },
}
