import type { Meta, StoryObj } from '@storybook/react-vite'
import { ColorInput } from '@/shared/ui'
import { Stateful } from '../helpers/state'

const meta = {
  title: 'shared/ui/ColorInput',
  component: ColorInput,
  args: { value: '#4f7cff', onChange: () => {} },
} satisfies Meta<typeof ColorInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Stateful initial={args.value}>
      {(value, onChange) => <ColorInput {...args} value={value} onChange={onChange} />}
    </Stateful>
  ),
}
