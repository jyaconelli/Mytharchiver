import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';

type HoverCardStoryProps = React.ComponentProps<typeof HoverCard> & {
  side?: React.ComponentProps<typeof HoverCardContent>['side'];
  align?: React.ComponentProps<typeof HoverCardContent>['align'];
  sideOffset?: number;
};

const meta: Meta<HoverCardStoryProps> = {
  title: 'UI/HoverCard',
  component: HoverCard,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    side: {
      options: ['top', 'right', 'bottom', 'left'],
      control: { type: 'inline-radio' },
    },
    align: {
      options: ['start', 'center', 'end'],
      control: { type: 'inline-radio' },
    },
    sideOffset: {
      control: { type: 'number', min: 0, max: 32, step: 1 },
    },
    openDelay: {
      control: { type: 'number', min: 0, max: 1000, step: 50 },
    },
    closeDelay: {
      control: { type: 'number', min: 0, max: 1000, step: 50 },
    },
  },
};

export default meta;

type Story = StoryObj<HoverCardStoryProps>;

const DemoContent = ({
  title = 'Workshop invite',
  body = 'Hover cards are great for showing quick previews without leaving the flow.',
  footer = 'Tip: adjust side and align controls to see placement changes.',
}) => (
  <div className="space-y-2">
    <div className="text-sm font-semibold">{title}</div>
    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    <p className="text-xs text-muted-foreground/80">{footer}</p>
  </div>
);

export const Default: Story = {
  args: {
    side: 'bottom',
    align: 'center',
    sideOffset: 4,
    openDelay: 150,
    closeDelay: 150,
  },
  render: ({ side, align, sideOffset, openDelay, closeDelay, ...cardProps }) => (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay} {...cardProps}>
      <HoverCardTrigger asChild>
        <Button variant="secondary">Hover me</Button>
      </HoverCardTrigger>
      <HoverCardContent side={side} align={align} sideOffset={sideOffset}>
        <DemoContent />
      </HoverCardContent>
    </HoverCard>
  ),
};

export const WithLargeOffset: Story = {
  args: {
    side: 'right',
    align: 'center',
    sideOffset: 16,
    openDelay: 0,
    closeDelay: 0,
  },
  render: ({ side, align, sideOffset, ...cardProps }) => (
    <HoverCard {...cardProps}>
      <HoverCardTrigger asChild>
        <Button>Right offset</Button>
      </HoverCardTrigger>
      <HoverCardContent side={side} align={align} sideOffset={sideOffset}>
        <DemoContent
          title="Offset preview"
          body="A larger offset keeps the card away from the trigger element."
          footer="Side offset is especially handy when the trigger has shadows or outlines."
        />
      </HoverCardContent>
    </HoverCard>
  ),
};

export const AlignStartOnTop: Story = {
  args: {
    side: 'top',
    align: 'start',
    sideOffset: 6,
    openDelay: 200,
    closeDelay: 150,
  },
  render: ({ side, align, sideOffset, openDelay, closeDelay, ...cardProps }) => (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay} {...cardProps}>
      <HoverCardTrigger asChild>
        <Button variant="outline">Top start</Button>
      </HoverCardTrigger>
      <HoverCardContent side={side} align={align} sideOffset={sideOffset}>
        <DemoContent
          title="Aligned start"
          body="Use start alignment when the trigger content is left-anchored, like labels or lists."
          footer="Try changing the side control to explore other placements."
        />
      </HoverCardContent>
    </HoverCard>
  ),
};

export const ControlledOpen: Story = {
  render: (args) => {
    const [open, setOpen] = React.useState(true);

    return (
      <HoverCard open={open} onOpenChange={setOpen} openDelay={0} closeDelay={0} {...args}>
        <HoverCardTrigger asChild>
          <Button variant={open ? 'secondary' : 'default'}>
            {open ? 'Close on unhover' : 'Hover to open'}
          </Button>
        </HoverCardTrigger>
        <HoverCardContent side="bottom" align="center" sideOffset={8}>
          <DemoContent
            title="Controlled card"
            body="The open state is managed externally, so you can sync it with other UI."
            footer="Use onOpenChange to react to hover intent."
          />
        </HoverCardContent>
      </HoverCard>
    );
  },
};

