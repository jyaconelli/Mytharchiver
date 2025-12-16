import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command';

type CommandDialogArgs = React.ComponentProps<typeof CommandDialog> & {
  placeholder: string;
  defaultSearch?: string;
};

const quickActions = [
  { label: 'Create new category', shortcut: '⌘+N' },
  { label: 'Import dataset', shortcut: '⌘+I' },
  { label: 'Open review queue', shortcut: '⌘+R' },
];

const navigation = [
  { label: 'Go to Canonicalization', shortcut: 'G C' },
  { label: 'Clusters view', shortcut: 'G V' },
  { label: 'Workspace dashboard', shortcut: 'G D' },
];

const settings = [
  { label: 'Workspace settings', shortcut: 'S W' },
  { label: 'Notification preferences', shortcut: 'S N' },
  { label: 'Billing (restricted)', shortcut: 'S B', disabled: true },
];

const meta: Meta<CommandDialogArgs> = {
  title: 'UI/Command',
  component: CommandDialog,
  args: {
    open: true,
    modal: true,
    placeholder: 'Search actions...',
    title: 'Command Palette',
    description: 'Jump to views or run quick actions.',
  },
  argTypes: {
    open: { control: 'boolean' },
    modal: { control: 'boolean' },
    placeholder: { control: 'text' },
    title: { control: 'text' },
    description: { control: 'text' },
    defaultSearch: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const PaletteTemplate = (args: CommandDialogArgs) => {
  const { placeholder, defaultSearch = '', ...dialogProps } = args;
  const [search, setSearch] = React.useState(defaultSearch);

  return (
    <CommandDialog {...dialogProps}>
      <CommandInput
        placeholder={placeholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          {quickActions.map((action) => (
            <CommandItem key={action.label}>
              {action.label}
              <CommandShortcut>{action.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          {navigation.map((item) => (
            <CommandItem key={item.label}>
              {item.label}
              <CommandShortcut>{item.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Settings">
          {settings.map((item) => (
            <CommandItem key={item.label} disabled={item.disabled}>
              {item.label}
              <CommandShortcut>{item.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export const DefaultPalette: Story = {
  render: (args) => <PaletteTemplate {...args} />,
};

export const WithPreFilteredQuery: Story = {
  args: {
    defaultSearch: 'settings',
  },
  render: (args) => <PaletteTemplate {...args} />,
};

export const InlineSurface: Story = {
  args: {
    open: true,
    modal: false,
  },
  render: ({ placeholder }) => (
    <div className="w-full max-w-2xl rounded-lg border bg-background p-4">
      <Command className="border-none shadow-none">
        <CommandInput placeholder={placeholder} />
        <CommandList className="max-h-80">
          <CommandEmpty>Try searching for "category".</CommandEmpty>
          <CommandGroup heading="Recently used">
            <CommandItem>Tag feedback as actionable</CommandItem>
            <CommandItem>Open Cluster 12</CommandItem>
            <CommandItem>Share workspace invite link</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="System">
            <CommandItem>Sync with Supabase</CommandItem>
            <CommandItem disabled>Pause background jobs</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
};
