import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from './input-otp';

type TemplateProps = Omit<React.ComponentProps<typeof InputOTP>, 'children' | 'render'> & {
  withSeparator?: boolean;
};

const meta = {
  title: 'UI/Input OTP',
  component: InputOTP,
  args: {
    maxLength: 6,
  },
  argTypes: {
    onChange: { action: 'change' },
    maxLength: { control: { type: 'number', min: 2, max: 8, step: 1 } },
  },
} satisfies Meta<TemplateProps>;

export default meta;

type Story = StoryObj<typeof meta>;

const Template = ({ withSeparator = true, maxLength = 6, ...args }: TemplateProps) => {
  const [value, setValue] = React.useState(args.value ?? '');

  React.useEffect(() => {
    if (args.value !== undefined) {
      setValue(args.value);
    }
  }, [args.value]);

  const handleChange = (next: string) => {
    setValue(next);
    args.onChange?.(next);
  };

  const slots = Array.from({ length: maxLength }, (_, index) => (
    <InputOTPSlot key={index} index={index} aria-label={`Digit ${index + 1}`} />
  ));

  const midpoint = Math.ceil(maxLength / 2);

  return (
    <div className="space-y-3">
      <InputOTP
        {...args}
        value={args.value ?? value}
        maxLength={maxLength}
        aria-label={args['aria-label'] ?? 'One-time passcode input'}
      >
        <InputOTPGroup>{withSeparator ? slots.slice(0, midpoint) : slots}</InputOTPGroup>
        {withSeparator ? <InputOTPSeparator /> : null}
        {withSeparator ? <InputOTPGroup>{slots.slice(midpoint)}</InputOTPGroup> : null}
      </InputOTP>
      <p className="text-muted-foreground text-sm">Value: {(args.value ?? value) || '—'}</p>
    </div>
  );
};

export const SixDigit: Story = {
  name: '6-digit with separator',
  args: {
    maxLength: 6,
  },
  render: (args) => <Template {...args} />,
};

export const FourDigitCompact: Story = {
  name: '4-digit compact',
  args: {
    maxLength: 4,
  },
  render: (args) => <Template {...args} withSeparator={false} />,
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => <Template {...args} />,
};

export const Invalid: Story = {
  args: {
    'aria-invalid': true,
  },
  render: (args) => <Template {...args} />,
};

export const CustomSpacing: Story = {
  args: {
    containerClassName: 'gap-4',
    className: 'h-11 text-base',
    maxLength: 6,
  },
  render: (args) => <Template {...args} />,
};
