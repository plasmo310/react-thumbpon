import type { Meta, StoryObj } from '@storybook/react-vite'
import { NumberInput } from '@/shared/ui'
import { Stateful } from '../../helpers/state'

const meta = {
  title: 'shared/ui/NumberInput',
  component: NumberInput,
  args: { value: 24, min: 0, max: 100, onChange: () => {} },
} satisfies Meta<typeof NumberInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Stateful initial={args.value}>
      {(value, onChange) => <NumberInput {...args} value={value} onChange={onChange} />}
    </Stateful>
  ),
}
