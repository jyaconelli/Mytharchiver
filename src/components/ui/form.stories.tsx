import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useForm } from 'react-hook-form';

import { Button } from './button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { Input } from './input';
import { Switch } from './switch';
import { Textarea } from './textarea';

type FormValues = {
  displayName: string;
  email: string;
  bio: string;
  updates: boolean;
};

type FormStoryArgs = {
  defaultDisplayName: string;
  defaultEmail: string;
  bioPlaceholder: string;
  showValidationErrors: boolean;
  disabled: boolean;
  helperMessage?: string;
};

const meta: Meta<FormStoryArgs> = {
  title: 'UI/Form',
  component: Form,
  args: {
    defaultDisplayName: 'Myth weaver',
    defaultEmail: 'author@mytharchiver.io',
    bioPlaceholder: 'Share a short note about your story universe…',
    showValidationErrors: false,
    disabled: false,
    helperMessage: 'You can change this later from your profile settings.',
  },
  argTypes: {
    showValidationErrors: { control: 'boolean' },
    disabled: { control: 'boolean' },
    defaultDisplayName: { control: 'text' },
    defaultEmail: { control: 'text' },
    bioPlaceholder: { control: 'text' },
    helperMessage: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<FormStoryArgs>;

const FormTemplate = (args: FormStoryArgs) => {
  const {
    defaultDisplayName,
    defaultEmail,
    bioPlaceholder,
    showValidationErrors,
    disabled,
    helperMessage,
  } = args;

  const [submitted, setSubmitted] = React.useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      displayName: defaultDisplayName,
      email: defaultEmail,
      bio: '',
      updates: true,
    },
    mode: 'onBlur',
  });

  React.useEffect(() => {
    if (showValidationErrors) {
      void form.trigger();
    } else {
      form.clearErrors();
    }
  }, [showValidationErrors, form]);

  const onSubmit = (values: FormValues) => {
    setSubmitted(values);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-xl space-y-6 rounded-lg border border-border/60 bg-card p-6 shadow-sm"
      >
        <FormField<FormValues, 'displayName'>
          control={form.control}
          name="displayName"
          rules={{
            required: 'Display name is required',
            minLength: { value: 3, message: 'Use at least 3 characters' },
          }}
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} disabled={disabled} />
              </FormControl>
              <FormDescription>
                This name appears to collaborators when you comment or edit.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField<FormValues, 'email'>
          control={form.control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/,
              message: 'Enter a valid email address',
            },
          }}
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Contact email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} disabled={disabled} />
              </FormControl>
              <FormDescription>
                We send notifications about category reviews to this address.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField<FormValues, 'bio'>
          control={form.control}
          name="bio"
          rules={{ maxLength: { value: 160, message: 'Keep it under 160 characters' } }}
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={bioPlaceholder}
                  className="min-h-20"
                  {...field}
                  disabled={disabled}
                />
              </FormControl>
              <FormDescription>Optional context about your project or universe.</FormDescription>
              {helperMessage ? <FormMessage>{helperMessage}</FormMessage> : <FormMessage />}
            </FormItem>
          )}
        />

        <FormField<FormValues, 'updates'>
          control={form.control}
          name="updates"
          render={({ field }: { field: any }) => (
            <FormItem className="flex items-center justify-between rounded-md border border-border/60 px-4 py-3">
              <div className="space-y-1">
                <FormLabel>Product updates</FormLabel>
                <FormDescription>
                  Receive occasional emails when we ship new clustering tools.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                  aria-label="Toggle product updates"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={disabled}>
            Save preferences
          </Button>
          {submitted && (
            <span className="text-sm text-muted-foreground">
              Saved for demo: {submitted.displayName}
            </span>
          )}
        </div>
      </form>
    </Form>
  );
};

export const Default: Story = {
  render: (args) => <FormTemplate {...args} />,
};

export const WithValidationErrors: Story = {
  args: {
    defaultDisplayName: 'x',
    defaultEmail: 'not-an-email',
    showValidationErrors: true,
  },
  render: (args) => <FormTemplate {...args} />,
};

export const DisabledState: Story = {
  args: {
    disabled: true,
    helperMessage: 'Fields are locked until you gain editor access.',
  },
  render: (args) => <FormTemplate {...args} />,
};

export const WithCustomMessage: Story = {
  args: {
    helperMessage:
      'Use this space for success, tips, or server messages when no errors are present.',
  },
  render: (args) => <FormTemplate {...args} />,
};
