import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Calendar, Home, Inbox, Plus, Settings, Users } from 'lucide-react';

import { Badge } from './badge';
import { Button } from './button';
import { Input } from './input';
import { Separator } from './separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from './sidebar';

interface SidebarStoryProps extends React.ComponentProps<typeof Sidebar> {
  defaultOpen?: boolean;
}

const meta: Meta<SidebarStoryProps> = {
  title: 'UI/Sidebar',
  component: Sidebar,
  args: {
    side: 'left',
    variant: 'sidebar',
    collapsible: 'offcanvas',
    defaultOpen: true,
  },
  argTypes: {
    side: {
      options: ['left', 'right'],
      control: { type: 'inline-radio' },
    },
    variant: {
      options: ['sidebar', 'floating', 'inset'],
      control: { type: 'inline-radio' },
    },
    collapsible: {
      options: ['offcanvas', 'icon', 'none'],
      control: { type: 'inline-radio' },
    },
    defaultOpen: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

function DemoLayout({ defaultOpen, ...sidebarProps }: SidebarStoryProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen} className="rounded-lg border">
      <div className="flex h-[520px] w-full">
        <Sidebar {...sidebarProps}>
          <SidebarHeader className="gap-3">
            <div className="flex items-center gap-2 px-2 text-sm font-semibold">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                MA
              </div>
              Mytharchiver
            </div>
            <Input placeholder="Search" className="h-8" />
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive>
                      <Home /> Overview
                    </SidebarMenuButton>
                    <SidebarMenuBadge>4</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Inbox /> Inbox
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Calendar /> Calendar
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Users /> Team
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton>Editors</SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton>Reviewers</SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>Projects</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      Arcana anthology <Badge className="ml-auto">New</Badge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      Hollow archives
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      Aurora tapes
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <Button size="sm" className="w-full" variant="outline">
              <Plus className="size-4" /> New project
            </Button>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <div className="flex items-center gap-3 border-b p-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Dashboard</span>
              <Separator orientation="vertical" className="h-4" />
              Mytharchiver workspace
            </div>
            <div className="ml-auto text-xs text-muted-foreground">Shortcut: ⌘+B</div>
          </div>
          <div className="flex-1 overflow-auto bg-muted/20 p-6 text-sm text-muted-foreground">
            This area represents your main page content. Resize the viewport or toggle the sidebar to
            see offcanvas and icon modes.
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export const Default: Story = {
  render: (args) => <DemoLayout {...args} />,
};

export const FloatingIconCollapse: Story = {
  args: {
    variant: 'floating',
    collapsible: 'icon',
  },
  render: (args) => <DemoLayout {...args} />,
};

export const RightAlignedInset: Story = {
  args: {
    side: 'right',
    variant: 'inset',
    collapsible: 'offcanvas',
  },
  render: (args) => <DemoLayout {...args} />,
};
