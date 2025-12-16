import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Globe2, Lock, ShieldCheck } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

interface SelectStoryProps extends React.ComponentProps<typeof Select> {
  size?: React.ComponentProps<typeof SelectTrigger>['size'];
  placeholder?: string;
}

const meta: Meta<SelectStoryProps> = {
  title: 'UI/Select',
  component: Select,
  args: {
    defaultValue: 'public',
    size: 'default',
    placeholder: 'Select visibility',
  },
  argTypes: {
    size: {
      options: ['sm', 'default'],
      control: { type: 'inline-radio' },
    },
    value: { control: false },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

function Shell({ size = 'default', placeholder, children, ...rootProps }: SelectStoryProps & { children: React.ReactNode }) {
  return (
    <Select {...rootProps}>
      <SelectTrigger size={size} className="w-60">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

export const Visibility: Story = {
  render: (args) => (
    <Shell {...args}>
      <SelectGroup>
        <SelectLabel>Visibility</SelectLabel>
        <SelectItem value="public">
          <Globe2 /> Public
        </SelectItem>
        <SelectItem value="team">
          <ShieldCheck /> Team only
        </SelectItem>
        <SelectItem value="private" disabled>
          <Lock /> Private (disabled)
        </SelectItem>
      </SelectGroup>
    </Shell>
  ),
};

export const WithSeparators: Story = {
  args: {
    defaultValue: 'weekly',
    placeholder: 'Choose schedule',
  },
  render: (args) => (
    <Shell {...args}>
      <SelectGroup>
        <SelectLabel>Cadence</SelectLabel>
        <SelectItem value="daily">Daily</SelectItem>
        <SelectItem value="weekly">Weekly</SelectItem>
        <SelectItem value="monthly">Monthly</SelectItem>
        <SelectSeparator />
        <SelectItem value="manual">Manual (triggered)</SelectItem>
      </SelectGroup>
    </Shell>
  ),
};

export const Compact: Story = {
  args: {
    size: 'sm',
    defaultValue: 'short',
    placeholder: 'Compact trigger',
  },
  render: (args) => (
    <Shell {...args}>
      <SelectItem value="short">Short form</SelectItem>
      <SelectItem value="long">Long form</SelectItem>
    </Shell>
  ),
};
