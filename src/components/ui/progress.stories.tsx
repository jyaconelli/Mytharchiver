import type { Meta, StoryObj } from '@storybook/react';

import { Progress } from './progress';

const meta = {
  title: 'UI/Progress',
  component: Progress,
  args: {
    value: 45,
    max: 100,
  },
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
      description: 'Current value between 0 and 100.',
    },
    max: {
      control: { type: 'number' },
      description: 'Maximum value passed to the underlying Radix root.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const QuarterComplete: Story = {
  args: { value: 25 },
};

export const HalfComplete: Story = {
  args: { value: 50 },
};

export const NearlyDone: Story = {
  args: { value: 85 },
};

export const Complete: Story = {
  args: { value: 100 },
};

export const CustomHeightAndColor: Story = {
  args: {
    value: 60,
    className:
      'h-4 bg-muted [&_[data-slot=progress-indicator]]:bg-emerald-500 [&_[data-slot=progress-indicator]]:transition-all',
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex w-64 flex-col gap-2">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>Syncing data</span>
        <span>{args.value ?? 0}%</span>
      </div>
      <Progress {...args} />
    </div>
  ),
};
