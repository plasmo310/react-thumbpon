import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextArea } from '@/shared/ui'
import { Stateful } from '../../helpers/state'

const meta = {
  title: 'shared/ui/TextArea',
  component: TextArea,
  args: { value: 'テキストを入力', onChange: () => {} },
} satisfies Meta<typeof TextArea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Stateful initial={args.value}>
      {(value, onChange) => <TextArea {...args} value={value} onChange={onChange} />}
    </Stateful>
  ),
}
