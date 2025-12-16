import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Bold, Italic, Underline } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from './toggle-group';

const meta = {
  title: 'UI/Toggle Group',
  component: ToggleGroup,
  args: {
    type: 'single',
    defaultValue: 'bold',
    variant: 'default',
    size: 'default',
  },
  argTypes: {
    type: {
      options: ['single', 'multiple'],
      control: { type: 'inline-radio' },
    },
    variant: {
      options: ['default', 'outline'],
      control: { type: 'inline-radio' },
    },
    size: {
      options: ['sm', 'default', 'lg'],
      control: { type: 'inline-radio' },
    },
    value: { control: false },
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SingleChoice: Story = {
  render: (args) => (
    <ToggleGroup {...args} aria-label="Text style">
      <ToggleGroupItem value="bold" aria-label="Bold">
        <Bold />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <Italic />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <Underline />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const MultipleChoice: Story = {
  args: {
    type: 'multiple',
    defaultValue: ['bold', 'underline'],
  },
  render: (args) => (
    <ToggleGroup {...args} aria-label="Text formatting">
      <ToggleGroupItem value="bold" aria-label="Bold">
        <Bold />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <Italic />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <Underline />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const OutlineSmall: Story = {
  args: {
    type: 'single',
    variant: 'outline',
    size: 'sm',
    defaultValue: 'italic',
  },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="bold" aria-label="Bold">
        <Bold />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <Italic />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <Underline />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
