import type { Meta, StoryObj } from '@storybook/react-vite'
import { InlineName } from '@/shared/ui'

const meta = {
  title: 'shared/ui/InlineName',
  component: InlineName,
  args: { value: 'レイヤー 1', onCommit: () => {}, onCancel: () => {} },
} satisfies Meta<typeof InlineName>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
