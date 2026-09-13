import type { Meta, StoryObj } from '@storybook/react-vite'
import { LayerPanel } from '@/features/layer'
import { PanelBox } from '../helpers/frames'
import { withStore } from '../helpers/store'

const meta = {
  title: 'features/layer/LayerPanel',
  component: LayerPanel,
  decorators: [withStore()],
} satisfies Meta<typeof LayerPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PanelBox>
      <LayerPanel />
    </PanelBox>
  ),
}
