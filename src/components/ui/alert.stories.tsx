import type { Meta, StoryObj } from '@storybook/react';
import { AlertCircle, Info } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';

type AlertStoryProps = React.ComponentProps<typeof Alert> & {
  title: string;
  description: string;
  showIcon?: boolean;
};

const meta = {
  title: 'UI/Alert',
  component: Alert,
  args: {
    variant: 'default',
    title: 'Heads up!',
    description: 'You can now invite collaborators to review canonical categories.',
    showIcon: true,
  },
  argTypes: {
    variant: {
      options: ['default', 'destructive'],
      control: { type: 'inline-radio' },
    },
    showIcon: { control: 'boolean' },
    className: { control: false },
  },
} satisfies Meta<AlertStoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

const Template = ({ title, description, showIcon = true, ...alertProps }: AlertStoryProps) => {
  const Icon = alertProps.variant === 'destructive' ? AlertCircle : Info;

  return (
    <Alert {...alertProps} className="w-full max-w-xl">
      {showIcon ? <Icon className="text-current size-4" aria-hidden /> : null}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
};

export const Informational: Story = {
  render: Template,
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    title: 'Action required',
    description: 'Deleting a canonical category cannot be undone. Proceed only if you are sure.',
  },
  render: Template,
};

export const WithoutIcon: Story = {
  args: {
    showIcon: false,
    title: 'No icon needed',
    description: 'Use this style when the surrounding context already conveys status.',
  },
  render: Template,
};

export const WithInlineAction: Story = {
  render: (args) => (
    <Alert {...args} className="w-full max-w-xl">
      <Info className="text-current size-4" aria-hidden />
      <AlertTitle>Update available</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-2">
        <span>Version 1.12 improves clustering accuracy and speeds up exports.</span>
        <Button size="sm" variant="secondary">
          View changelog
        </Button>
      </AlertDescription>
    </Alert>
  ),
};
