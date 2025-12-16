import type { Meta, StoryObj } from '@storybook/react';
import { addDays } from 'date-fns';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Calendar } from './calendar';

const meta: Meta<typeof Calendar> = {
  title: 'UI/Calendar',
  component: Calendar,
  args: {
    className: 'rounded-md border',
    showOutsideDays: true,
  },
  argTypes: {
    mode: { control: { type: 'inline-radio' }, options: ['single', 'multiple', 'range'] },
    showOutsideDays: { control: 'boolean' },
    numberOfMonths: { control: { type: 'number', min: 1, max: 3, step: 1 } },
  },
};

export default meta;
type Story = StoryObj<typeof Calendar>;

export const SingleDate: Story = {
  render: (args) => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {date ? date.toLocaleDateString() : 'Pick a date'}
        </p>
        <Calendar {...args} mode="single" selected={date} onSelect={setDate} />
      </div>
    );
  },
};

export const RangeSelection: Story = {
  args: {
    numberOfMonths: 2,
  },
  render: (args) => {
    const [range, setRange] = React.useState<DateRange | undefined>({
      from: new Date(),
      to: addDays(new Date(), 5),
    });

    const label =
      range?.from && range?.to
        ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
        : 'Select a start and end date';

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Calendar {...args} mode="range" selected={range} onSelect={setRange} />
      </div>
    );
  },
};

export const MultipleDates: Story = {
  args: {
    numberOfMonths: 1,
  },
  render: (args) => {
    const [dates, setDates] = React.useState<Date[]>([
      new Date(),
      addDays(new Date(), 1),
      addDays(new Date(), 3),
    ]);

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {dates.length ? `${dates.length} dates selected` : 'Pick multiple dates'}
        </p>
        <Calendar
          {...args}
          mode="multiple"
          selected={dates}
          onSelect={(value) => setDates(value ?? [])}
        />
      </div>
    );
  },
};

export const NoOutsideDaysWithDisabled: Story = {
  args: {
    showOutsideDays: false,
    numberOfMonths: 1,
  },
  render: (args) => {
    const today = new Date();
    const [date, setDate] = React.useState<Date | undefined>();

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Weekends and past dates are disabled; outside days are hidden.
        </p>
        <Calendar
          {...args}
          mode="single"
          selected={date}
          onSelect={setDate}
          fromMonth={today}
          disabled={[{ before: today }, { dayOfWeek: [0, 6] }]}
        />
      </div>
    );
  },
};
