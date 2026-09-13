import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContextMenu } from '@/shared/ui'

const meta = {
  title: 'shared/ui/ContextMenu',
  component: ContextMenu,
  args: {
    x: 32,
    y: 32,
    onClose: () => {},
    items: [
      { label: '複製', onSelect: () => {} },
      { label: '削除', onSelect: () => {}, separated: true },
    ],
  },
} satisfies Meta<typeof ContextMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div style={{ height: 160, position: 'relative' }}>
      <ContextMenu {...args} />
    </div>
  ),
}
