import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileText, Settings, Users } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  args: {
    defaultValue: 'overview',
    orientation: 'horizontal',
  },
  argTypes: {
    orientation: {
      options: ['horizontal', 'vertical'],
      control: { type: 'inline-radio' },
    },
    defaultValue: { control: false },
    value: { control: false },
  },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

function TabsShell({
  children,
  orientation,
  ...props
}: React.ComponentProps<typeof Tabs> & { children: React.ReactNode }) {
  return (
    <Tabs orientation={orientation} className="w-full max-w-2xl" {...props}>
      {children}
    </Tabs>
  );
}

export const Basic: Story = {
  render: (args) => (
    <TabsShell {...args}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="collab">Collaborators</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="rounded-md border p-4">
        Keep drafts, plot points, and research together.
      </TabsContent>
      <TabsContent value="collab" className="rounded-md border p-4">
        Invite writers, set roles, and track review states.
      </TabsContent>
      <TabsContent value="settings" className="rounded-md border p-4">
        Configure autosave, export, and notification rules.
      </TabsContent>
    </TabsShell>
  ),
};

export const WithIcons: Story = {
  name: 'With icons & badge',
  render: (args) => (
    <TabsShell {...args}>
      <TabsList>
        <TabsTrigger value="drafts">
          <FileText /> Drafts
        </TabsTrigger>
        <TabsTrigger value="team">
          <Users /> Team
        </TabsTrigger>
        <TabsTrigger value="updates">
          <Settings /> Updates <Badge variant="secondary">3</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="drafts" className="rounded-md border p-4">
        Draft list and quick filters.
      </TabsContent>
      <TabsContent value="team" className="rounded-md border p-4">
        Collaborator directory with roles.
      </TabsContent>
      <TabsContent value="updates" className="rounded-md border p-4">
        Release notes and configuration changes.
      </TabsContent>
    </TabsShell>
  ),
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
    defaultValue: 'overview',
  },
  render: (args) => (
    <div className="flex w-full max-w-3xl gap-4">
      <Tabs orientation={args.orientation} defaultValue="overview" className="flex-1">
        <TabsList className="flex-col">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="disabled" disabled>
            Disabled
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="rounded-md border p-4">
          Overview content aligned for vertical tabs.
        </TabsContent>
        <TabsContent value="analytics" className="rounded-md border p-4">
          Charts and metrics.
        </TabsContent>
        <TabsContent value="audits" className="rounded-md border p-4">
          Audit log and recent changes.
        </TabsContent>
        <TabsContent value="disabled" className="rounded-md border p-4">
          This tab is disabled.
        </TabsContent>
      </Tabs>
    </div>
  ),
};
