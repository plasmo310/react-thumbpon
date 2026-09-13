import type { Meta, StoryObj } from '@storybook/react-vite'
import { Panel, TextInput } from '@/shared/ui'
import { PanelBox } from '../../helpers/frames'

const meta = {
  title: 'shared/ui/Panel',
  component: Panel,
  args: { title: 'テキスト', children: <TextInput value="見出し" onChange={() => {}} /> },
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
