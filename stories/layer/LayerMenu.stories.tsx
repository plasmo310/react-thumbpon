import type { Meta, StoryObj } from '@storybook/react-vite'
import { LayerMenu } from '@/features/layer'
import { SAMPLE_TEXT_LAYER_ID } from '../helpers/fixtures'
import { withStore } from '../helpers/store'

const meta = {
  title: 'features/layer/LayerMenu',
  component: LayerMenu,
  decorators: [withStore({ layerMenu: { layerId: SAMPLE_TEXT_LAYER_ID, x: 32, y: 32 } })],
} satisfies Meta<typeof LayerMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <LayerMenu /> }
