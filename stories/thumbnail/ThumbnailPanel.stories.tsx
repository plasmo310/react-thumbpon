import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThumbnailPanel } from '@/features/thumbnail'
import { PanelBox } from '../helpers/frames'
import { withStore } from '../helpers/store'

const meta = {
  title: 'features/thumbnail/ThumbnailPanel',
  component: ThumbnailPanel,
  decorators: [withStore()],
} satisfies Meta<typeof ThumbnailPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PanelBox>
      <ThumbnailPanel />
    </PanelBox>
  ),
}
