import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';

type AlertDialogArgs = React.ComponentProps<typeof AlertDialog> & {
  triggerLabel: string;
  title: string;
  description: string;
  actionLabel: string;
  cancelLabel: string;
  actionClassName?: string;
};

const meta: Meta<AlertDialogArgs> = {
  title: 'UI/Alert Dialog',
  component: AlertDialog,
  args: {
    triggerLabel: 'Delete project',
    title: 'Delete project?',
    description: 'This action is permanent and will remove all categories, plot points, and files.',
    actionLabel: 'Delete',
    cancelLabel: 'Cancel',
    defaultOpen: false,
  },
  argTypes: {
    defaultOpen: { control: 'boolean' },
    triggerLabel: { control: 'text' },
    title: { control: 'text' },
    description: { control: 'text' },
    actionLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<AlertDialogArgs>;

const Template = (args: AlertDialogArgs) => {
  const { triggerLabel, title, description, actionLabel, cancelLabel, actionClassName, ...rest } =
    args;

  return (
    <AlertDialog {...rest}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{triggerLabel}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction className={actionClassName}>{actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const Basic: Story = {
  render: Template,
};

export const Cautionary: Story = {
  args: {
    triggerLabel: 'Archive workspace',
    title: 'Archive this workspace?',
    description:
      'Collaborators will lose edit access. You can unarchive it later from workspace settings.',
    actionLabel: 'Archive',
    cancelLabel: 'Keep Active',
    actionClassName: 'bg-orange-500 text-white hover:bg-orange-600',
    defaultOpen: true,
  },
  render: Template,
};
