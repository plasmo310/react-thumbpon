import type { Meta, StoryObj } from '@storybook/react-vite'
import { LayerPanel } from '@/features/layer'
import { PanelBox } from '../../helpers/frames'
import { withStore } from '../../helpers/store'
import { sampleTextLayer, sampleThumbnail, SAMPLE_TEXT_LAYER_ID } from '../../helpers/fixtures'

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

export const TextBackgroundCorners: Story = {
  ...Default,
  decorators: [
    withStore({
      thumbnails: [
        {
          ...sampleThumbnail(),
          layers: [
            sampleTextLayer({
              backgroundEnabled: true,
              paddingTop: 8,
              paddingBottom: 16,
              paddingLeft: 24,
              paddingRight: 32,
              backgroundRadiusMode: 'individual',
              backgroundRadiusTopLeft: 4,
              backgroundRadiusTopRight: 8,
              backgroundRadiusBottomLeft: 12,
              backgroundRadiusBottomRight: 16,
            }),
          ],
        },
      ],
      currentThumbnailId: 'thumb-main',
      selectedId: SAMPLE_TEXT_LAYER_ID,
      selectedIds: [SAMPLE_TEXT_LAYER_ID],
    }),
  ],
}
