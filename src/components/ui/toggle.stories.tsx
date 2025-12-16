import type { Meta, StoryObj } from '@storybook/react';
import { Italic, Strikethrough } from 'lucide-react';

import { Toggle } from './toggle';

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  args: {
    children: 'Toggle',
    variant: 'default',
    size: 'default',
  },
  argTypes: {
    pressed: { control: 'boolean' },
    defaultPressed: { control: 'boolean' },
    disabled: { control: 'boolean' },
    variant: {
      options: ['default', 'outline'],
      control: { type: 'inline-radio' },
    },
    size: {
      options: ['sm', 'default', 'lg'],
      control: { type: 'inline-radio' },
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TextToggle: Story = {
  render: (args) => <Toggle {...args}>Mark complete</Toggle>,
};

export const OutlineIcons: Story = {
  args: {
    variant: 'outline',
    defaultPressed: true,
  },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Toggle {...args} aria-label="Italic">
        <Italic />
      </Toggle>
      <Toggle {...args} aria-label="Strikethrough" defaultPressed={false}>
        <Strikethrough />
      </Toggle>
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Toggle {...args} size="sm">
        Small
      </Toggle>
      <Toggle {...args} size="default" defaultPressed>
        Default
      </Toggle>
      <Toggle {...args} size="lg">
        Large
      </Toggle>
    </div>
  ),
};
