import type { Meta, StoryObj } from '@storybook/react';
import { Check, Flame, Sparkles } from 'lucide-react';

import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: {
    children: 'New',
    variant: 'default',
  },
  argTypes: {
    variant: {
      options: ['default', 'secondary', 'destructive', 'outline'],
      control: { type: 'inline-radio' },
    },
    asChild: { control: 'boolean' },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Badge {...args} variant="default">
        <Sparkles className="size-3" /> Live
      </Badge>
      <Badge {...args} variant="secondary">
        <Check className="size-3" /> Synced
      </Badge>
      <Badge {...args} variant="destructive">
        <Flame className="size-3" /> Alert
      </Badge>
      <Badge {...args} variant="outline">
        Outline
      </Badge>
    </div>
  ),
};

export const LinkBadge: Story = {
  render: (args) => (
    <a href="#" className="inline-block">
      <Badge {...args} asChild>
        <span>Clickable badge</span>
      </Badge>
    </a>
  ),
};

export const WithLongText: Story = {
  render: (args) => (
    <Badge {...args} className="max-w-[220px] truncate" variant="secondary">
      This badge truncates long content
    </Badge>
  ),
};
