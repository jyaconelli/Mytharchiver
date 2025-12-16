import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from './button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';

const meta: Meta<typeof Collapsible> = {
  title: 'UI/Collapsible',
  component: Collapsible,
  args: {
    defaultOpen: false,
    disabled: false,
  },
  argTypes: {
    open: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onOpenChange: { action: 'openChange' },
  },
};

export default meta;

type Story = StoryObj<typeof Collapsible>;

const Panel = ({ label }: { label: string }) => (
  <div className="space-y-2 rounded-md border border-dashed p-4 text-sm">
    <p className="font-medium">{label}</p>
    <p className="text-muted-foreground">
      Toggle to reveal extra context, helper text, or a mini-form. This component does not ship
      with styles, so we compose it with our Button and utility classes.
    </p>
  </div>
);

export const ClosedByDefault: Story = {
  render: (args) => (
    <Collapsible {...args} className="w-full max-w-lg space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm">
          Show details
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out">
        <Panel label="Collapsed initially" />
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const OpenByDefault: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <Collapsible {...args} className="w-full max-w-lg space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="secondary" size="sm">
          Hide onboarding tips
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out">
        <Panel label="Starts expanded" />
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const ControlledOpenState: Story = {
  args: {
    open: true,
    onOpenChange: undefined,
  },
  render: (args) => {
    const [open, setOpen] = useState<boolean>(args.open ?? false);

    return (
      <Collapsible
        {...args}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          args.onOpenChange?.(next);
        }}
        className="w-full max-w-lg space-y-2"
      >
        <div className="flex items-center gap-3">
          <CollapsibleTrigger asChild>
            <Button variant={open ? 'default' : 'outline'} size="sm">
              {open ? 'Collapse' : 'Expand'} notes
            </Button>
          </CollapsibleTrigger>
          <Button variant="ghost" size="sm" onClick={() => setOpen((prev) => !prev)}>
            Toggle externally
          </Button>
        </div>
        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out">
          <Panel label="Controlled open state" />
        </CollapsibleContent>
      </Collapsible>
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultOpen: false,
  },
  render: (args) => (
    <Collapsible {...args} className="w-full max-w-lg space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" disabled>
          Disabled trigger
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Panel label="This content stays hidden because the collapsible is disabled." />
      </CollapsibleContent>
    </Collapsible>
  ),
};
