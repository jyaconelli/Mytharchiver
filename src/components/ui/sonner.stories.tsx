import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CheckCircle, Info, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from './button';
import { Toaster } from './sonner';

const meta = {
  title: 'UI/Toaster (Sonner)',
  component: Toaster,
  args: {
    position: 'top-right',
    richColors: true,
    duration: 2500,
  },
  argTypes: {
    position: {
      options: [
        'top-left',
        'top-center',
        'top-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ],
      control: { type: 'select' },
    },
    expand: { control: 'boolean' },
    closeButton: { control: 'boolean' },
    duration: { control: { type: 'number', min: 500, max: 8000, step: 250 } },
  },
  decorators: [
    (Story) => (
      <div className="space-y-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

function DemoButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast('Draft saved')}>Default</Button>
      <Button variant="secondary" onClick={() => toast.success('Export complete', { icon: <CheckCircle className="size-4" /> })}>
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.info('Version restored', {
            description: 'Reverted to draft from 2 hours ago.',
            icon: <Info className="size-4" />,
          })
        }
      >
        Info with description
      </Button>
      <Button
        variant="destructive"
        onClick={() =>
          toast.error('Failed to publish', {
            description: 'Resolve conflicts before publishing.',
            icon: <TriangleAlert className="size-4" />,
          })
        }
      >
        Error
      </Button>
    </div>
  );
}

export const Default: Story = {
  render: (args) => (
    <>
      <DemoButtons />
      <Toaster {...args} />
    </>
  ),
};

export const BottomStack: Story = {
  args: {
    position: 'bottom-center',
    expand: true,
  },
  render: (args) => (
    <>
      <DemoButtons />
      <Toaster {...args} />
    </>
  ),
};

export const Minimal: Story = {
  name: 'Subtle style',
  args: {
    richColors: false,
    closeButton: false,
    duration: 4000,
  },
  render: (args) => (
    <>
      <DemoButtons />
      <Toaster {...args} />
    </>
  ),
};
