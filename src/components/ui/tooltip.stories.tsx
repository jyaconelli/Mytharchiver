import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Info, Moon, Sun, Zap } from 'lucide-react';

import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  args: {
    delayDuration: 0,
    defaultOpen: false,
  },
  argTypes: {
    delayDuration: { control: { type: 'number', min: 0, max: 1000, step: 50 } },
    defaultOpen: { control: 'boolean' },
    open: { control: false },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Helpful short copy lives here.</TooltipContent>
    </Tooltip>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Tooltip {...args}>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Lightning bolt">
            <Zap />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Run quick action</TooltipContent>
      </Tooltip>
      <Tooltip {...args}>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Light mode">
            <Sun />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Switch to light</TooltipContent>
      </Tooltip>
      <Tooltip {...args}>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Dark mode">
            <Moon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          Switch to dark
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

export const Delayed: Story = {
  args: { delayDuration: 300 },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2">
        <Info className="size-4" />
        Hover with 300ms delay
      </TooltipTrigger>
      <TooltipContent>Delay is useful to reduce accidental opens.</TooltipContent>
    </Tooltip>
  ),
};
