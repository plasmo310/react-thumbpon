import type { Meta, StoryObj } from '@storybook/react-vite'
import { Panel } from '@/shared/ui'
import { PanelBox } from '../../helpers/frames'

const meta = {
  title: 'shared/ui/Panel',
  component: Panel,
  args: { title: 'Text', children: <input value="Example" readOnly /> },
} satisfies Meta<typeof Panel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <PanelBox>
      <Panel {...args} />
    </PanelBox>
  ),
}
