import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';

type DropdownMenuStoryProps = React.ComponentProps<typeof DropdownMenu> & {
  triggerLabel?: string;
  align?: React.ComponentProps<typeof DropdownMenuContent>['align'];
  side?: React.ComponentProps<typeof DropdownMenuContent>['side'];
  sideOffset?: React.ComponentProps<typeof DropdownMenuContent>['sideOffset'];
};

const meta: Meta<DropdownMenuStoryProps> = {
  title: 'UI/Dropdown Menu',
  component: DropdownMenu,
  args: {
    triggerLabel: 'Open menu',
    align: 'start',
    side: 'bottom',
    sideOffset: 4,
    defaultOpen: false,
  },
  argTypes: {
    defaultOpen: { control: 'boolean' },
    modal: { control: 'boolean' },
    triggerLabel: { control: 'text' },
    align: {
      options: ['start', 'center', 'end'],
      control: { type: 'inline-radio' },
    },
    side: {
      options: ['top', 'right', 'bottom', 'left'],
      control: { type: 'inline-radio' },
    },
    sideOffset: {
      control: { type: 'number', min: 0, max: 24, step: 1 },
    },
  },
};

export default meta;
type Story = StoryObj<DropdownMenuStoryProps>;

function MenuShell({
  triggerLabel,
  align,
  side,
  sideOffset,
  children,
  ...rootProps
}: DropdownMenuStoryProps & { children: React.ReactNode }) {
  return (
    <DropdownMenu {...rootProps}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} sideOffset={sideOffset} className="w-56">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const Basic: Story = {
  render: (args) => (
    <MenuShell {...args}>
      <DropdownMenuLabel>Workspace</DropdownMenuLabel>
      <DropdownMenuGroup>
        <DropdownMenuItem>
          Invite collaborator
          <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem inset>Edit details</DropdownMenuItem>
        <DropdownMenuItem disabled>Archive (disabled)</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">
        Delete workspace
        <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
      </DropdownMenuItem>
    </MenuShell>
  ),
};

export const WithCheckboxes: Story = {
  args: {
    triggerLabel: 'Toggle options',
  },
  render: (args) => {
    const [checked, setChecked] = React.useState<Record<string, boolean>>({
      comments: true,
      notifications: false,
      summaries: true,
    });

    return (
      <MenuShell {...args}>
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={checked.comments}
          onCheckedChange={(value) => setChecked((prev) => ({ ...prev, comments: Boolean(value) }))}
        >
          Comments
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={checked.notifications}
          onCheckedChange={(value) =>
            setChecked((prev) => ({ ...prev, notifications: Boolean(value) }))
          }
        >
          Mentions
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={checked.summaries}
          onCheckedChange={(value) => setChecked((prev) => ({ ...prev, summaries: Boolean(value) }))}
        >
          Daily summaries
        </DropdownMenuCheckboxItem>
      </MenuShell>
    );
  },
};

export const WithRadioGroup: Story = {
  args: {
    triggerLabel: 'Switch theme',
    align: 'end',
  },
  render: (args) => {
    const [theme, setTheme] = React.useState<'system' | 'light' | 'dark'>('system');

    return (
      <MenuShell {...args}>
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as any)}>
          <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </MenuShell>
    );
  },
};

export const WithSubmenu: Story = {
  args: {
    triggerLabel: 'Choose export',
    side: 'right',
  },
  render: (args) => (
    <MenuShell {...args}>
      <DropdownMenuLabel>Export</DropdownMenuLabel>
      <DropdownMenuItem>Quick export</DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Format</DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-44">
          <DropdownMenuItem>Markdown</DropdownMenuItem>
          <DropdownMenuItem>JSON</DropdownMenuItem>
          <DropdownMenuItem>CSV</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger inset>Destination</DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-44">
          <DropdownMenuItem>Download</DropdownMenuItem>
          <DropdownMenuItem>Send to email</DropdownMenuItem>
          <DropdownMenuItem>Copy link</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </MenuShell>
  ),
};

export const CompactAlignEnd: Story = {
  args: {
    triggerLabel: 'Aligned end',
    align: 'end',
    sideOffset: 8,
  },
  render: (args) => (
    <MenuShell {...args}>
      <DropdownMenuLabel inset>Shortcuts</DropdownMenuLabel>
      <DropdownMenuItem inset>
        Command palette
        <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem inset>
        Create note
        <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem inset variant="destructive">
        Sign out
      </DropdownMenuItem>
    </MenuShell>
  ),
};
