import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from '@/shared/ui'
import { Stateful } from '../../helpers/state'

const options = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
]

const meta = {
  title: 'shared/ui/Select',
  component: Select,
  args: { value: 'png', onChange: () => {}, options },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Stateful initial={args.value}>
      {(value, onChange) => <Select {...args} value={value} onChange={onChange} />}
    </Stateful>
  ),
}
