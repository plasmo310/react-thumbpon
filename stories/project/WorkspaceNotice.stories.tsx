import type { Meta, StoryObj } from '@storybook/react-vite'
import { WorkspaceNotice } from '@/features/project'
import { withStore } from '../helpers/store'

const meta = {
  title: 'features/project/WorkspaceNotice',
  component: WorkspaceNotice,
  decorators: [
    withStore({ missingFontLabels: ['Noto Sans JP'], missingAssetNames: ['photo.svg'] }),
  ],
} satisfies Meta<typeof WorkspaceNotice>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <WorkspaceNotice /> }
