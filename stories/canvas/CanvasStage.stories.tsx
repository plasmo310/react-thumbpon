import type { Meta, StoryObj } from '@storybook/react-vite'
import { CanvasStage } from '@/features/canvas'
import { withStore } from '../helpers/store'

const meta = {
  title: 'features/canvas/CanvasStage',
  component: CanvasStage,
  decorators: [withStore()],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CanvasStage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div style={{ height: '100vh' }}>
      <CanvasStage />
    </div>
  ),
}
