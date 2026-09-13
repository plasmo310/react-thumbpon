import type { Meta, StoryObj } from '@storybook/react-vite'
import { NumberInput, Row } from '@/shared/ui'
import { PanelBox } from '../../helpers/frames'
import { Stateful } from '../../helpers/state'

const meta = {
  title: 'shared/ui/Row',
  component: Row,
  args: { label: 'Name', children: null },
} satisfies Meta<typeof Row>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <PanelBox>
      <Stateful initial="Example">
        {(value, onChange) => (
          <Row {...args}>
            <input value={value} onChange={(event) => onChange(event.target.value)} />
          </Row>
        )}
      </Stateful>
    </PanelBox>
  ),
}

export const Stacked: Story = {
  render: () => (
    <PanelBox>
      <Stateful initial={{ x: 160, y: 620 }}>
        {(value, onChange) => (
          <>
            <Row label="X">
              <NumberInput value={value.x} onChange={(x) => onChange({ ...value, x })} />
            </Row>
            <Row label="Y">
              <NumberInput value={value.y} onChange={(y) => onChange({ ...value, y })} />
            </Row>
            <Row label="Label width">
              <NumberInput value={value.x} onChange={(x) => onChange({ ...value, x })} />
            </Row>
          </>
        )}
      </Stateful>
    </PanelBox>
  ),
}
