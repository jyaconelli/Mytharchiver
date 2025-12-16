import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from './menubar';

type MenubarStoryArgs = React.ComponentProps<typeof Menubar> & {
  align: 'start' | 'center' | 'end';
  sideOffset: number;
  includeDisabled: boolean;
  showDestructive: boolean;
};

const meta: Meta<MenubarStoryArgs> = {
  title: 'UI/Menubar',
  component: Menubar,
  args: {
    orientation: 'horizontal',
    loop: true,
    align: 'start',
    sideOffset: 8,
    includeDisabled: false,
    showDestructive: false,
    'aria-label': 'Project navigation bar',
  },
  argTypes: {
    orientation: { control: { type: 'inline-radio' }, options: ['horizontal', 'vertical'] },
    loop: { control: 'boolean' },
    align: { control: { type: 'select' }, options: ['start', 'center', 'end'] },
    sideOffset: { control: { type: 'number', min: 0, max: 16, step: 1 } },
    includeDisabled: { control: 'boolean' },
    showDestructive: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const MenubarTemplate = ({
  align,
  sideOffset,
  includeDisabled,
  showDestructive,
  ...menubarProps
}: MenubarStoryArgs) => {
  const [viewOptions, setViewOptions] = React.useState({
    statusBar: true,
    activityBar: false,
  });
  const [theme, setTheme] = React.useState('system');

  return (
    <div className="w-full space-y-3">
      <Menubar className="w-full max-w-3xl" {...menubarProps}>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent align={align} sideOffset={sideOffset}>
            <MenubarLabel inset>Workspaces</MenubarLabel>
            <MenubarItem>Open recent</MenubarItem>
            <MenubarItem>New tab</MenubarItem>
            <MenubarItem>
              New window
              <MenubarShortcut>⌘+N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled={includeDisabled}>
              Save all
              <MenubarShortcut>⌘+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarSubContent align={align} sideOffset={sideOffset}>
                <MenubarItem>Copy invite link</MenubarItem>
                <MenubarItem>Grant edit access</MenubarItem>
                <MenubarSeparator />
                <MenubarItem>Export snapshot</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            {showDestructive ? (
              <MenubarItem variant="destructive">Delete workspace</MenubarItem>
            ) : null}
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent align={align} sideOffset={sideOffset}>
            <MenubarItem>Undo</MenubarItem>
            <MenubarItem>Redo</MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled={includeDisabled}>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent align={align} sideOffset={sideOffset}>
            <MenubarCheckboxItem
              checked={viewOptions.statusBar}
              onCheckedChange={(checked) =>
                setViewOptions((current) => ({ ...current, statusBar: Boolean(checked) }))
              }
            >
              Status bar
            </MenubarCheckboxItem>
            <MenubarCheckboxItem
              checked={viewOptions.activityBar}
              onCheckedChange={(checked) =>
                setViewOptions((current) => ({ ...current, activityBar: Boolean(checked) }))
              }
            >
              Activity bar
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarRadioGroup value={theme} onValueChange={setTheme}>
              <MenubarLabel inset>Theme</MenubarLabel>
              <MenubarRadioItem value="system">System</MenubarRadioItem>
              <MenubarRadioItem value="light">Light</MenubarRadioItem>
              <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Account</MenubarTrigger>
          <MenubarContent align={align} sideOffset={sideOffset}>
            <MenubarItem>Profile</MenubarItem>
            <MenubarItem>Notifications</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Switch workspace</MenubarItem>
            <MenubarItem>Preferences</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <div className="text-muted-foreground text-sm">
        <p>Theme: {theme}</p>
        <p>
          Visible: Status bar {viewOptions.statusBar ? 'on' : 'off'}, Activity bar{' '}
          {viewOptions.activityBar ? 'on' : 'off'}
        </p>
        {includeDisabled ? <p>Disabled actions are shown for demonstration.</p> : null}
        {showDestructive ? <p>Destructive actions use the `variant="destructive"` prop.</p> : null}
      </div>
    </div>
  );
};

export const DefaultBar: Story = {
  name: 'Default layout',
  render: (args) => <MenubarTemplate {...args} />,
};

export const WithDisabledItems: Story = {
  args: {
    includeDisabled: true,
  },
  render: (args) => <MenubarTemplate {...args} />,
};

export const WithDestructiveAction: Story = {
  args: {
    showDestructive: true,
  },
  render: (args) => <MenubarTemplate {...args} />,
};

export const CenterAlignedContent: Story = {
  args: {
    align: 'center',
    sideOffset: 4,
  },
  render: (args) => <MenubarTemplate {...args} />,
};

export const VerticalStacked: Story = {
  args: {
    orientation: 'vertical',
    align: 'start',
    sideOffset: 6,
  },
  render: (args) => (
    <div className="flex w-full max-w-sm justify-start">
      <MenubarTemplate {...args} />
    </div>
  ),
};
