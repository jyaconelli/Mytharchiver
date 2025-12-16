import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer';
import { Input } from './input';
import { Label } from './label';

type DrawerStoryArgs = React.ComponentProps<typeof Drawer> & {
  triggerLabel: string;
  title: string;
  description: string;
  footerActionLabel: string;
  showCancel?: boolean;
};

const DrawerSurface = ({ children }: { children: React.ReactNode }) => (
  <div
    data-vaul-drawer-wrapper
    className="bg-muted/20 text-foreground flex min-h-[70vh] items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 p-8"
  >
    {children}
  </div>
);

const meta: Meta<DrawerStoryArgs> = {
  title: 'UI/Drawer',
  component: Drawer,
  args: {
    direction: 'bottom',
    shouldScaleBackground: false,
    defaultOpen: false,
    closeThreshold: 0.35,
    triggerLabel: 'Open drawer',
    title: 'Review settings',
    description: 'Tune parameters, then save or cancel your changes.',
    footerActionLabel: 'Save changes',
    showCancel: true,
  },
  argTypes: {
    direction: {
      options: ['bottom', 'top', 'left', 'right'],
      control: { type: 'inline-radio' },
    },
    shouldScaleBackground: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
    closeThreshold: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    snapPoints: { control: 'object' },
  },
};

export default meta;

type Story = StoryObj<DrawerStoryArgs>;

const Template = (args: DrawerStoryArgs) => {
  const { triggerLabel, title, description, footerActionLabel, showCancel, ...drawerProps } = args;

  return (
    <DrawerSurface>
      <Drawer {...drawerProps}>
        <DrawerTrigger asChild>
          <Button variant="secondary">{triggerLabel}</Button>
        </DrawerTrigger>
        <DrawerContent className="gap-2 p-6">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input id="project-name" placeholder="Mytharchiver workspace" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="summary">Summary</Label>
              <Input id="summary" placeholder="Short reminder for collaborators" />
            </div>
          </div>
          <DrawerFooter>
            {showCancel ? (
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            ) : null}
            <Button>{footerActionLabel}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </DrawerSurface>
  );
};

export const BottomSheet: Story = {
  args: {
    shouldScaleBackground: true,
    triggerLabel: 'Open bottom drawer',
    snapPoints: [0.35, 0.6, 1],
  },
  render: Template,
};

export const SideFromRight: Story = {
  args: {
    direction: 'right',
    triggerLabel: 'Open side drawer',
    description: 'Great for settings panels or inspector views.',
    shouldScaleBackground: false,
  },
  render: Template,
};

export const SlideFromTop: Story = {
  args: {
    direction: 'top',
    triggerLabel: 'Open top drawer',
    defaultOpen: true,
    showCancel: false,
    description: 'Use a top-aligned drawer for announcements or global banners.',
  },
  render: Template,
};

export const Controlled: Story = {
  render: (args) => {
    const [open, setOpen] = React.useState<boolean>(true);

    return (
      <DrawerSurface>
        <Drawer
          {...args}
          open={open}
          onOpenChange={setOpen}
          direction={args.direction ?? 'bottom'}
          shouldScaleBackground={args.shouldScaleBackground}
        >
          <DrawerTrigger asChild>
            <Button variant="outline">Toggle programmatically</Button>
          </DrawerTrigger>
          <DrawerContent className="gap-3 p-6">
            <DrawerHeader>
              <DrawerTitle>Controlled drawer</DrawerTitle>
              <DrawerDescription>
                State lives in Storybook controls; close with buttons or Escape.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setOpen(false)}>
                Close via state
              </Button>
              <DrawerClose asChild>
                <Button size="sm" variant="secondary">
                  Close via component
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
      </DrawerSurface>
    );
  },
};
