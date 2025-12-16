import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: {
    type: 'text',
    placeholder: 'Enter some text',
  },
  argTypes: {
    onChange: { action: 'change' },
    className: { control: false },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Create a password',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
  },
};

export const Invalid: Story = {
  args: {
    'aria-invalid': true,
    defaultValue: 'Invalid value',
    placeholder: 'Shows error ring',
  },
};

export const WithLabelAndHelper: Story = {
  render: (args) => (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Label htmlFor="input-with-label">Workspace name</Label>
      <Input id="input-with-label" {...args} placeholder="Mytharchiver workspace" />
      <p className="text-muted-foreground text-xs">Use a short, memorable name.</p>
    </div>
  ),
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = React.useState('Outline: Rewrite chapter 3');

    return (
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Label htmlFor="input-controlled">Controlled input</Label>
        <Input
          id="input-controlled"
          {...args}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            args.onChange?.(event);
          }}
        />
        <p className="text-muted-foreground text-xs">{value.length} characters</p>
      </div>
    );
  },
};
