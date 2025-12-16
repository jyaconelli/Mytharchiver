import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './context-menu';

const meta: Meta<typeof ContextMenu> = {
  title: 'UI/Context Menu',
  component: ContextMenu,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    open: { control: false },
    defaultOpen: { control: false },
    onOpenChange: { control: false },
    modal: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof ContextMenu>;

const TriggerBox = ({ label }: { label: string }) => (
  <div className="bg-muted/50 text-muted-foreground flex min-w-[220px] cursor-default select-none items-center justify-center rounded-md border border-dashed p-8 text-sm">
    {label}
  </div>
);

export const Basic: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TriggerBox label="Right-click anywhere" />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuGroup>
          <ContextMenuItem inset>
            Back
            <ContextMenuShortcut>⌘[</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem inset disabled>
            Forward
            <ContextMenuShortcut>⌘]</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem inset>
            Reload
            <ContextMenuShortcut>⌘R</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem>
            Copy Link
            <ContextMenuShortcut>⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            Inspect
            <ContextMenuShortcut>⌥⌘I</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">
          Delete
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

export const WithCheckboxes: Story = {
  render: () => {
    const [hiddenFiles, setHiddenFiles] = React.useState(true);
    const [autoSave, setAutoSave] = React.useState(false);

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TriggerBox label="Toggle settings" />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuLabel>Project</ContextMenuLabel>
          <ContextMenuCheckboxItem
            checked={hiddenFiles}
            onCheckedChange={(checked) => setHiddenFiles(Boolean(checked))}
          >
            Show hidden files
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem
            checked={autoSave}
            onCheckedChange={(checked) => setAutoSave(Boolean(checked))}
          >
            Autosave drafts
            <ContextMenuShortcut>⌘S</ContextMenuShortcut>
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuItem inset>
            Preferences…
            <ContextMenuShortcut>⌘,</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};

export const WithRadioGroup: Story = {
  render: () => {
    const [alignment, setAlignment] = React.useState('center');

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TriggerBox label="Choose alignment" />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-60">
          <ContextMenuLabel>Alignment</ContextMenuLabel>
          <ContextMenuRadioGroup value={alignment} onValueChange={setAlignment}>
            <ContextMenuRadioItem value="left">
              Left
              <ContextMenuShortcut>⌘L</ContextMenuShortcut>
            </ContextMenuRadioItem>
            <ContextMenuRadioItem value="center">
              Center
              <ContextMenuShortcut>⌘E</ContextMenuShortcut>
            </ContextMenuRadioItem>
            <ContextMenuRadioItem value="right">
              Right
              <ContextMenuShortcut>⌘R</ContextMenuShortcut>
            </ContextMenuRadioItem>
            <ContextMenuRadioItem value="justify">
              Justify
              <ContextMenuShortcut>⇧⌘J</ContextMenuShortcut>
            </ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};

export const WithSubmenus: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button variant="secondary">Right-click this button</Button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem>Open in new tab</ContextMenuItem>
        <ContextMenuItem>Open in new window</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem>Email link</ContextMenuItem>
            <ContextMenuItem>Copy to clipboard</ContextMenuItem>
            <ContextMenuItem>Export as PDF</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem inset disabled>
          Add to favorites
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
