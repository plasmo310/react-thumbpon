import type { Meta, StoryObj } from '@storybook/react-vite'
import { NumberInput, Row, TextInput } from '@/shared/ui'
import { PanelBox } from '../../helpers/frames'
import { Stateful } from '../../helpers/state'

const meta = {
  title: 'shared/ui/Row',
  component: Row,
  args: { label: '名前', children: null },
} satisfies Meta<typeof Row>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <PanelBox>
      <Stateful initial="見出し">
        {(value, onChange) => (
          <Row {...args}>
            <TextInput value={value} onChange={onChange} />
          </Row>
        )}
      </Stateful>
    </PanelBox>
  ),
}

/** ラベル列の幅は固定なので、縦に並べても右側が揃う */
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
            <Row label="長いラベル名">
              <NumberInput value={value.x} onChange={(x) => onChange({ ...value, x })} />
            </Row>
          </>
        )}
      </Stateful>
    </PanelBox>
  ),
}
