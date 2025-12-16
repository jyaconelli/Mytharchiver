import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import { ScrollArea } from './scroll-area';
import { cn } from './utils';

type ScrollAreaStoryProps = React.ComponentProps<typeof ScrollArea> & {
  itemCount?: number;
};

const meta = {
  title: 'UI/Scroll Area',
  component: ScrollArea,
  args: {
    type: 'hover',
    scrollHideDelay: 700,
    className: 'h-64 w-[360px] rounded-md border bg-card',
    itemCount: 24,
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['auto', 'always', 'scroll', 'hover'],
    },
    dir: {
      control: 'inline-radio',
      options: ['ltr', 'rtl'],
    },
    scrollHideDelay: {
      control: { type: 'number', min: 0, step: 100 },
    },
    itemCount: {
      control: { type: 'number', min: 4, max: 60, step: 4 },
    },
  },
} satisfies Meta<ScrollAreaStoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

const ScrollAreaDemo = ({ itemCount = 24, className, ...props }: ScrollAreaStoryProps) => {
  const entries = React.useMemo(
    () =>
      Array.from({ length: itemCount }, (_, index) => ({
        id: index + 1,
        title: `Entry ${index + 1}`,
        detail: 'Myth data file · 24 KB · Updated 3h ago',
      })),
    [itemCount],
  );

  return (
    <ScrollArea {...props} className={cn('bg-background', className)}>
      <div className="space-y-2 p-4">
        {entries.map((item) => (
          <div
            key={item.id}
            className="border-border/60 bg-muted/40 hover:bg-muted flex flex-col rounded-md border px-3 py-2 transition-colors"
          >
            <span className="font-medium leading-5">{item.title}</span>
            <span className="text-muted-foreground text-sm">{item.detail}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export const Hover: Story = {
  name: 'Hover (default)',
  render: (args) => <ScrollAreaDemo {...args} />,
};

export const AlwaysVisible: Story = {
  args: {
    type: 'always',
  },
  render: (args) => <ScrollAreaDemo {...args} />,
};

export const AutoShow: Story = {
  args: {
    type: 'auto',
  },
  render: (args) => <ScrollAreaDemo {...args} />,
};

export const ShowWhileScrolling: Story = {
  args: {
    type: 'scroll',
    scrollHideDelay: 0,
  },
  render: (args) => <ScrollAreaDemo {...args} />,
};

export const RightToLeft: Story = {
  args: {
    dir: 'rtl',
    type: 'always',
    itemCount: 16,
  },
  render: (args) => <ScrollAreaDemo {...args} />,
};

export const CompactSurface: Story = {
  args: {
    className: 'h-40 w-[280px] rounded-md border bg-card',
    itemCount: 12,
  },
  render: (args) => <ScrollAreaDemo {...args} />,
};
