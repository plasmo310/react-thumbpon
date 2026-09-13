import type { Meta, StoryObj } from '@storybook/react-vite'
import { AssetPanel } from '@/features/asset'
import { PanelBox } from '../../helpers/frames'
import { withStore } from '../../helpers/store'

const meta = {
  title: 'features/asset/AssetPanel',
  component: AssetPanel,
  decorators: [withStore()],
} satisfies Meta<typeof AssetPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PanelBox>
      <AssetPanel />
    </PanelBox>
  ),
}
