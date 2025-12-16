import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';

type DialogStoryProps = React.ComponentProps<typeof Dialog> & {
  triggerLabel: string;
  title: string;
  description: string;
  body: string;
  showFooter?: boolean;
};

const meta: Meta<DialogStoryProps> = {
  title: 'UI/Dialog',
  component: Dialog,
  args: {
    triggerLabel: 'Open dialog',
    title: 'Dialog title',
    description: 'Use dialogs to surface contextual tasks without leaving the current screen.',
    body: 'Dialogs support freeform content. Use them for quick edits, confirmations, and previews.',
    showFooter: true,
    defaultOpen: false,
    modal: true,
  },
  argTypes: {
    defaultOpen: { control: 'boolean' },
    modal: { control: 'boolean' },
    triggerLabel: { control: 'text' },
    title: { control: 'text' },
    description: { control: 'text' },
    body: { control: 'text' },
    showFooter: { control: 'boolean' },
    open: { control: false },
    onOpenChange: { action: 'openChange' },
    className: { control: false },
  },
};

export default meta;

type Story = StoryObj<DialogStoryProps>;

const Template = (args: DialogStoryProps) => {
  const { triggerLabel, title, description, body, showFooter, ...dialogProps } = args;

  return (
    <Dialog {...dialogProps}>
      <DialogTrigger asChild>
        <Button variant="default">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        {showFooter ? (
          <DialogFooter>
            <Button variant="secondary">Cancel</Button>
            <Button>Save</Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export const Basic: Story = {
  render: Template,
};

export const DefaultOpen: Story = {
  args: { defaultOpen: true, triggerLabel: 'Opens by default' },
  render: Template,
};

export const NonModal: Story = {
  args: {
    modal: false,
    triggerLabel: 'Non-modal dialog',
    description: 'Non-modal dialogs allow interacting with the rest of the UI while open.',
    body: 'Try clicking around the canvas; focus is not trapped when modal is false.',
  },
  render: Template,
};

export const WithFormFields: Story = {
  args: {
    triggerLabel: 'Edit profile',
    title: 'Edit profile',
    description: 'Make quick changes and save.',
    showFooter: false,
  },
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button>{args.triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{args.title}</DialogTitle>
          <DialogDescription>{args.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" placeholder="Ada Lovelace" defaultValue="Ada Lovelace" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="ada@example.com" defaultValue="ada@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} placeholder="Short summary for teammates." defaultValue="Mathematician and inventor." />
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="secondary">Cancel</Button>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const ScrollableContent: Story = {
  args: {
    triggerLabel: 'Show long content',
    title: 'Long-form dialog',
    description: 'Content scrolls within the max height.',
    showFooter: false,
  },
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button>{args.triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{args.title}</DialogTitle>
          <DialogDescription>{args.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          {Array.from({ length: 8 }).map((_, index) => (
            <p key={index}>
              We use dialogs to keep people in context while gathering more details. Consider progressive disclosure,
              clear primary actions, and concise supporting text. Long copy will scroll so users can still reach the
              buttons without the overlay covering the viewport.
            </p>
          ))}
        </div>
        <DialogFooter className="pt-4">
          <Button variant="secondary">Close</Button>
          <Button variant="default">Apply changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const ControlledOpen: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);

    return (
      <Dialog {...args} open={open} onOpenChange={setOpen}>
        <div className="flex gap-3">
          <DialogTrigger asChild>
            <Button>{open ? 'Close dialog' : 'Open dialog'}</Button>
          </DialogTrigger>
          <Button variant="outline" onClick={() => setOpen((prev) => !prev)}>
            Toggle programmatically
          </Button>
        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controlled dialog</DialogTitle>
            <DialogDescription>open/onOpenChange props are useful for syncing external state.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Use controlled mode when the parent needs to drive the open state, such as after form submissions or analytics.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Dismiss
            </Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};
