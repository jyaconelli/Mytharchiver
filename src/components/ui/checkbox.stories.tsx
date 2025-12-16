import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './checkbox';
import { Label } from './label';

const meta = {
  component: Checkbox,
  argTypes: {
    onCheckedChange: { action: 'checkedChange' },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    id: 'checkbox-unchecked',
    defaultChecked: false,
    'aria-label': 'Unchecked checkbox',
  },
};

export const Checked: Story = {
  args: {
    id: 'checkbox-checked',
    defaultChecked: true,
    'aria-label': 'Checked checkbox',
  },
};

export const Disabled: Story = {
  args: {
    id: 'checkbox-disabled',
    disabled: true,
    'aria-label': 'Disabled checkbox',
  },
};

export const DisabledChecked: Story = {
  args: {
    id: 'checkbox-disabled-checked',
    defaultChecked: true,
    disabled: true,
    'aria-label': 'Disabled checked checkbox',
  },
};

export const Invalid: Story = {
  args: {
    id: 'checkbox-invalid',
    'aria-invalid': true,
    'aria-label': 'Invalid checkbox',
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox {...args} id="checkbox-with-label" />
      <Label htmlFor="checkbox-with-label">Accept terms and conditions</Label>
    </div>
  ),
  args: {
    defaultChecked: false,
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [checked, setChecked] = React.useState<boolean | 'indeterminate'>(true);

    return (
      <div className="flex items-center gap-2">
        <Checkbox
          {...args}
          id="checkbox-controlled"
          checked={checked}
          onCheckedChange={setChecked}
          aria-label="Controlled checkbox"
        />
        <Label htmlFor="checkbox-controlled">Controlled: {String(checked)}</Label>
      </div>
    );
  },
};
