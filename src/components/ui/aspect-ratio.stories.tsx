import type { Meta, StoryObj } from '@storybook/react';

import { AspectRatio } from './aspect-ratio';

const meta = {
  title: 'UI/Aspect Ratio',
  component: AspectRatio,
  args: {
    ratio: 16 / 9,
  },
  argTypes: {
    ratio: {
      control: { type: 'number', min: 0.5, max: 3, step: 0.1 },
    },
  },
} satisfies Meta<typeof AspectRatio>;

export default meta;

type Story = StoryObj<typeof meta>;

const Placeholder = ({ label }: { label: string }) => (
  <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center rounded-md border">
    {label}
  </div>
);

export const Landscape: Story = {
  name: '16:9 landscape',
  render: (args) => (
    <div className="w-full max-w-2xl space-y-4">
      <AspectRatio {...args}>
        <Placeholder label="16:9 content" />
      </AspectRatio>
    </div>
  ),
};

export const Square: Story = {
  args: { ratio: 1 },
  render: (args) => (
    <div className="w-full max-w-sm space-y-3">
      <AspectRatio {...args}>
        <Placeholder label="1:1 cover art" />
      </AspectRatio>
    </div>
  ),
};

export const Portrait: Story = {
  args: { ratio: 3 / 4 },
  render: (args) => (
    <div className="w-full max-w-md space-y-3">
      <AspectRatio {...args}>
        <Placeholder label="3:4 mobile shot" />
      </AspectRatio>
    </div>
  ),
};

export const NestedMedia: Story = {
  name: 'With media element',
  args: { ratio: 4 / 3 },
  render: (args) => (
    <div className="w-full max-w-xl">
      <AspectRatio {...args}>
        <img
          className="h-full w-full rounded-md object-cover"
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
          alt="Forest"
        />
      </AspectRatio>
    </div>
  ),
};
