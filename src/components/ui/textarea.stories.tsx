import type { Meta, StoryObj } from '@storybook/react';

import { Label } from './label';
import { Textarea } from './textarea';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  args: {
    placeholder: 'Capture ideas, notes, or feedback...',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    rows: { control: { type: 'number', min: 2, max: 12, step: 1 } },
  },
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: (args) => <Textarea {...args} />,
};

export const WithLabelAndHelp: Story = {
  render: (args) => (
    <div className="space-y-2">
      <Label htmlFor="notes">Notes</Label>
      <Textarea id="notes" {...args} rows={4} />
      <p className="text-xs text-muted-foreground">Markdown shortcuts are supported.</p>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled textarea',
  },
  render: (args) => <Textarea {...args} />,
};
