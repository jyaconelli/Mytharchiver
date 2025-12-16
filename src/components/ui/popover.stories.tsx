import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';

interface PopoverStoryProps extends React.ComponentProps<typeof Popover> {
  triggerLabel?: string;
  align?: React.ComponentProps<typeof PopoverContent>['align'];
  side?: React.ComponentProps<typeof PopoverContent>['side'];
  sideOffset?: React.ComponentProps<typeof PopoverContent>['sideOffset'];
}

const meta: Meta<PopoverStoryProps> = {
  title: 'UI/Popover',
  component: Popover,
  args: {
    triggerLabel: 'Open popover',
    align: 'center',
    side: 'bottom',
    sideOffset: 4,
    defaultOpen: false,
  },
  argTypes: {
    triggerLabel: { control: 'text' },
    align: {
      options: ['start', 'center', 'end'],
      control: { type: 'inline-radio' },
    },
    side: {
      options: ['top', 'right', 'bottom', 'left'],
      control: { type: 'inline-radio' },
    },
    sideOffset: { control: { type: 'number', min: 0, max: 24, step: 1 } },
    open: { control: false },
    onOpenChange: { action: 'openChange' },
  },
};

export default meta;

type Story = StoryObj<PopoverStoryProps>;

function Shell({ triggerLabel, align, side, sideOffset, children, ...rootProps }: PopoverStoryProps & { children: React.ReactNode }) {
  return (
    <Popover {...rootProps}>
      <PopoverTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </PopoverTrigger>
      <PopoverContent align={align} side={side} sideOffset={sideOffset} className="w-72">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export const Basic: Story = {
  render: (args) => (
    <Shell {...args}>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Workspace status</h4>
        <p className="text-sm text-muted-foreground">
          Popovers are great for short confirmations or supporting text.
        </p>
      </div>
    </Shell>
  ),
};

export const WithForm: Story = {
  args: {
    triggerLabel: 'Invite collaborator',
    side: 'right',
    align: 'start',
  },
  render: (args) => (
    <Shell {...args}>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="writer@studio.com" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button size="sm">Send invite</Button>
        </div>
      </div>
    </Shell>
  ),
};

export const WithAnchorElement: Story = {
  name: 'Anchored to inline text',
  render: (args) => (
    <div className="text-sm text-muted-foreground">
      Hover over the inline anchor to see the popover{' '}
      <Popover {...args}>
        <PopoverAnchor asChild>
          <button className="underline decoration-dotted decoration-foreground/50">definition</button>
        </PopoverAnchor>
        <PopoverContent sideOffset={6} className="max-w-xs text-left">
          <h4 className="text-sm font-semibold">Definition</h4>
          <p className="mt-1 text-sm">
            Popovers can attach to any anchor, not just a button trigger.
          </p>
        </PopoverContent>
      </Popover>
      .
    </div>
  ),
};

export const OffsetAndAlign: Story = {
  args: {
    side: 'top',
    align: 'end',
    sideOffset: 12,
    triggerLabel: 'Aligned end',
  },
  render: (args) => (
    <Shell {...args}>
      <p className="text-sm">Using custom side, align, and offset values.</p>
    </Shell>
  ),
};
