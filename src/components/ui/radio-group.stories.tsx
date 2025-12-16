import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';

type Option = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type TemplateProps = React.ComponentProps<typeof RadioGroup> & {
  options?: Option[];
  showInvalid?: boolean;
};

const defaultOptions: Option[] = [
  { value: 'myths', label: 'Myths', description: 'Classical or reimagined folklore collections.' },
  { value: 'sagas', label: 'Sagas', description: 'Long-form, multi-chapter epics and chronicles.' },
  { value: 'legends', label: 'Legends', description: 'Shorter tales centered on a notable hero.' },
];

const meta = {
  title: 'UI/Radio Group',
  component: RadioGroup,
  args: {
    orientation: 'vertical',
    options: defaultOptions,
  },
  argTypes: {
    onValueChange: { action: 'valueChange' },
    orientation: {
      control: { type: 'inline-radio' },
      options: ['vertical', 'horizontal'],
    },
    className: { control: 'text' },
    showInvalid: { control: 'boolean' },
    options: { table: { disable: true } },
  },
} satisfies Meta<TemplateProps>;

export default meta;

type Story = StoryObj<typeof meta>;

const Template = ({ options = defaultOptions, showInvalid, ...args }: TemplateProps) => {
  const firstValue = options[0]?.value ?? '';
  const [value, setValue] = React.useState(args.value ?? args.defaultValue ?? firstValue);

  React.useEffect(() => {
    if (args.value !== undefined) {
      setValue(args.value ?? '');
    }
  }, [args.value]);

  const handleChange = (nextValue: string) => {
    setValue(nextValue);
    args.onValueChange?.(nextValue);
  };

  return (
    <div className="space-y-3">
      <RadioGroup
        {...args}
        value={args.value ?? value}
        onValueChange={handleChange}
        className={args.className}
      >
        {options.map((option) => {
          const id = `radio-${option.value}`;

          return (
            <div key={option.value} className="flex items-start gap-3">
              <RadioGroupItem
                value={option.value}
                id={id}
                disabled={option.disabled || args.disabled}
                aria-invalid={showInvalid || args['aria-invalid'] ? true : undefined}
              />
              <div className="space-y-1">
                <Label htmlFor={id} className="leading-none">
                  {option.label}
                </Label>
                {option.description ? (
                  <p className="text-muted-foreground text-sm">{option.description}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </RadioGroup>

      <p className="text-muted-foreground text-sm">Selected: {(args.value ?? value) || '—'}</p>
    </div>
  );
};

export const VerticalList: Story = {
  name: 'Vertical (default)',
  args: {
    defaultValue: defaultOptions[1].value,
  },
  render: (args) => <Template {...args} />,
};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
    className: 'grid auto-cols-max grid-flow-col gap-4',
  },
  render: (args) => (
    <Template
      {...args}
      options={[
        { value: 'draft', label: 'Draft' },
        { value: 'review', label: 'In review' },
        { value: 'published', label: 'Published' },
      ]}
    />
  ),
};

export const DisabledGroup: Story = {
  args: {
    disabled: true,
    defaultValue: defaultOptions[0].value,
  },
  render: (args) => <Template {...args} />,
};

export const WithDisabledOption: Story = {
  args: {
    defaultValue: 'myths',
  },
  render: (args) => (
    <Template
      {...args}
      options={[
        ...defaultOptions.slice(0, 2),
        { value: 'legends', label: 'Legends', description: 'Temporarily unavailable', disabled: true },
      ]}
    />
  ),
};

export const InvalidState: Story = {
  args: {
    defaultValue: '',
    required: true,
  },
  render: (args) => <Template {...args} />,
};

export const Controlled: Story = {
  args: {
    value: defaultOptions[2].value,
  },
  render: (args) => <Template {...args} />,
};
