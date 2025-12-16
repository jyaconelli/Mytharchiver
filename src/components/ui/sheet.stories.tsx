import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { Input } from './input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

interface SheetStoryProps extends React.ComponentProps<typeof Sheet> {
  side?: React.ComponentProps<typeof SheetContent>['side'];
  triggerLabel?: string;
}

const meta: Meta<SheetStoryProps> = {
  title: 'UI/Sheet',
  component: Sheet,
  args: {
    open: undefined,
    defaultOpen: false,
    triggerLabel: 'Open sheet',
    side: 'right',
  },
  argTypes: {
    open: { control: false },
    onOpenChange: { action: 'openChange' },
    triggerLabel: { control: 'text' },
    side: {
      options: ['top', 'right', 'bottom', 'left'],
      control: { type: 'inline-radio' },
    },
  },
};

export default meta;

type Story = StoryObj<SheetStoryProps>;

function SheetShell({ triggerLabel, side, children, ...rootProps }: SheetStoryProps & { children: React.ReactNode }) {
  return (
    <Sheet {...rootProps}>
      <SheetTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </SheetTrigger>
      <SheetContent side={side} className="sm:max-w-lg">
        {children}
      </SheetContent>
    </Sheet>
  );
}

export const ProfilePanel: Story = {
  render: (args) => (
    <SheetShell {...args}>
      <SheetHeader>
        <SheetTitle>Edit profile</SheetTitle>
        <SheetDescription>Update your profile details and click save.</SheetDescription>
      </SheetHeader>
      <div className="space-y-3 px-4">
        <label className="space-y-1 text-sm font-medium">
          Name
          <Input defaultValue="Ari Winters" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Role
          <Input placeholder="Story lead" />
        </label>
      </div>
      <SheetFooter>
        <Button variant="ghost">Cancel</Button>
        <Button>Save changes</Button>
      </SheetFooter>
    </SheetShell>
  ),
};

export const Sides: Story = {
  name: 'Top / bottom / left',
  render: (args) => (
    <div className="flex flex-wrap gap-4">
      {(['top', 'bottom', 'left'] as const).map((side) => (
        <SheetShell key={side} {...args} side={side} triggerLabel={`Open ${side}`}>
          <SheetHeader>
            <SheetTitle>{side} sheet</SheetTitle>
            <SheetDescription>Each side animates in from its origin.</SheetDescription>
          </SheetHeader>
          <div className="px-4 text-sm text-muted-foreground">
            Use this to show filters, quick settings, or mobile navigation.
          </div>
        </SheetShell>
      ))}
    </div>
  ),
};

export const WithLongContent: Story = {
  name: 'Scrollable content',
  args: { side: 'right' },
  render: (args) => (
    <SheetShell {...args} triggerLabel="Show release notes">
      <SheetHeader>
        <SheetTitle>Release notes</SheetTitle>
        <SheetDescription>Scrollable content stays within the panel.</SheetDescription>
      </SheetHeader>
      <div className="px-4 space-y-3 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
        {Array.from({ length: 12 }).map((_, i) => (
          <p key={i}>
            v0.{20 + i}.0 — Added timeline exports and improved collaborator mentions.
          </p>
        ))}
      </div>
      <SheetFooter>
        <Button>Close</Button>
      </SheetFooter>
    </SheetShell>
  ),
};
