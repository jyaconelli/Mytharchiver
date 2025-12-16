import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './input';
import { Label } from './label';
import { Switch } from './switch';

const meta = {
  title: 'UI/Label',
  component: Label,
  args: {
    children: 'Label text',
    htmlFor: 'field-id',
  },
  argTypes: {
    children: { control: 'text' },
    htmlFor: { control: 'text' },
    className: { control: false },
  },
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInputField: Story = {
  name: 'With input field',
  render: (args) => (
    <div className="w-full max-w-sm space-y-2">
      <Label {...args} />
      <Input id={args.htmlFor ?? 'email'} placeholder="you@example.com" />
      <p className="text-xs text-muted-foreground">Pairs label and input via htmlFor/id.</p>
    </div>
  ),
};

export const WithRequiredIndicator: Story = {
  name: 'With required indicator',
  render: (args) => (
    <div className="w-full max-w-sm space-y-2">
      <Label {...args} htmlFor="workspace-name">
        Workspace name <span className="text-destructive">*</span>
      </Label>
      <Input id="workspace-name" placeholder="Mytharchiver workspace" aria-required />
      <p className="text-xs text-muted-foreground">Asterisk lives in the label children.</p>
    </div>
  ),
};

export const PeerDisabled: Story = {
  name: 'Peer-disabled state',
  render: (args) => (
    <div className="w-full max-w-sm space-y-2">
      <Label {...args} htmlFor="peer-disabled-input">
        Disabled input
      </Label>
      <Input
        id="peer-disabled-input"
        className="peer"
        disabled
        placeholder="Disabled input"
        aria-disabled
      />
      <p className="text-xs text-muted-foreground">
        Label picks up `peer-disabled` styles when the input is disabled.
      </p>
    </div>
  ),
};

export const GroupDisabled: Story = {
  name: 'Disabled group',
  render: () => (
    <div className="group w-full max-w-sm space-y-2" data-disabled="true">
      <Label htmlFor="group-disabled-input">Group disabled field</Label>
      <Input id="group-disabled-input" disabled placeholder="Group disabled input" />
      <p className="text-xs text-muted-foreground">
        Uses `data-disabled` on the parent group to gray out and disable pointer events.
      </p>
    </div>
  ),
};

export const InlineWithControl: Story = {
  name: 'Inline with switch',
  render: () => (
    <div className="flex items-center gap-3">
      <Label htmlFor="label-switch" className="leading-none">
        Enable notifications
      </Label>
      <Switch id="label-switch" aria-label="Enable notifications" />
    </div>
  ),
};
