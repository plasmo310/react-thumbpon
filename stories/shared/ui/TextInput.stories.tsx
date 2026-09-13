import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextInput } from '@/shared/ui'
import { Stateful } from '../../helpers/state'

const meta = {
  title: 'shared/ui/TextInput',
  component: TextInput,
  args: { value: 'サムネイル', placeholder: '名前を入力', onChange: () => {} },
} satisfies Meta<typeof TextInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Stateful initial={args.value}>
      {(value, onChange) => <TextInput {...args} value={value} onChange={onChange} />}
    </Stateful>
  ),
}
