import type { Meta, StoryObj } from '@storybook/react-vite'
import { Header } from '@/features/project'
import { withStore } from '../../helpers/store'

const meta = {
  title: 'features/project/Header',
  component: Header,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  decorators: [withStore({ locale: 'ja' })],
  render: () => <Header />,
}

export const English: Story = {
  decorators: [withStore({ locale: 'en' })],
  render: () => <Header />,
}
