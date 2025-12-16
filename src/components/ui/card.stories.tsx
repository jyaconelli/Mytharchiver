import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import { cn } from './utils';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  argTypes: {
    className: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  args: {
    className: 'w-full max-w-xl',
  },
  render: ({ className, ...args }) => (
    <Card {...args} className={cn('w-full max-w-xl', className)}>
      <CardHeader className="border-b">
        <CardTitle>Workspace health</CardTitle>
        <CardDescription>
          Keep an eye on curation progress, collaborator activity, and overdue reviews.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">Categories ready for review: 18</p>
        <p className="text-sm text-muted-foreground">Drafts awaiting feedback: 6</p>
        <p className="text-sm text-muted-foreground">Average response time: 2h 14m</p>
      </CardContent>
    </Card>
  ),
};

export const WithAction: Story = {
  args: {
    className: 'w-full max-w-xl',
  },
  render: ({ className, ...args }) => (
    <Card {...args} className={cn('w-full max-w-xl', className)}>
      <CardHeader className="border-b">
        <CardTitle>Pending approvals</CardTitle>
        <CardDescription>Collaborators are waiting on your review for new categories.</CardDescription>
        <CardAction>
          <Button size="sm">Open queue</Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>- Three plot threads flagged for clarification.</p>
        <p>- Two new character sheets added today.</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooterActions: Story = {
  args: {
    className: 'w-full max-w-xl',
  },
  render: ({ className, ...args }) => (
    <Card {...args} className={cn('w-full max-w-xl', className)}>
      <CardHeader className="border-b">
        <CardTitle>Edit summary</CardTitle>
        <CardDescription>Confirm changes before publishing to the workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>Updated tags: folklore, maritime, unreliable narrator.</p>
        <p>Added three references to primary sources in the notes.</p>
        <p>Suggested next step: ask Lina to review the timeline.</p>
      </CardContent>
      <CardFooter className="border-t gap-2">
        <Button variant="ghost">Discard</Button>
        <Button>Publish</Button>
      </CardFooter>
    </Card>
  ),
};

export const SubtleMuted: Story = {
  args: {
    className: 'w-full max-w-xl border-dashed bg-muted/40',
  },
  render: ({ className, ...args }) => (
    <Card {...args} className={cn('w-full max-w-xl', className)}>
      <CardContent className="space-y-2 text-sm">
        <CardTitle className="text-base">Empty state</CardTitle>
        <CardDescription>
          Use cards for lightweight callouts or placeholders when data is still loading.
        </CardDescription>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="secondary">
            Create draft
          </Button>
          <Button size="sm" variant="ghost">
            Import data
          </Button>
        </div>
      </CardContent>
    </Card>
  ),
};
