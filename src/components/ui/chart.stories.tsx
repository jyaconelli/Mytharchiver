import type { Meta, StoryObj } from '@storybook/react';
import { Activity, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from './chart';

const trafficConfig: ChartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
    icon: ArrowUpRight,
  },
  mobile: {
    label: 'Mobile',
    color: 'hsl(var(--chart-2))',
    icon: ArrowDownRight,
  },
};

const trafficData = [
  { month: 'Jan', desktop: 186, mobile: 80 },
  { month: 'Feb', desktop: 305, mobile: 200 },
  { month: 'Mar', desktop: 237, mobile: 120 },
  { month: 'Apr', desktop: 73, mobile: 190 },
  { month: 'May', desktop: 209, mobile: 130 },
  { month: 'Jun', desktop: 214, mobile: 140 },
];

const pipelineConfig: ChartConfig = {
  inbound: {
    label: 'Inbound',
    color: 'hsl(var(--chart-3))',
    icon: Activity,
  },
  outbound: {
    label: 'Outbound',
    color: 'hsl(var(--chart-4))',
  },
};

const pipelineData = [
  { stage: 'Discovery', inbound: 1200, outbound: 800 },
  { stage: 'Qualified', inbound: 900, outbound: 640 },
  { stage: 'Proposal', inbound: 760, outbound: 560 },
  { stage: 'Closed', inbound: 540, outbound: 430 },
];

const sessionConfig: ChartConfig = {
  sessions: {
    label: 'Daily Sessions',
    theme: { light: 'hsl(var(--chart-5))', dark: 'hsl(var(--chart-2))' },
  },
};

const sessionData = [
  { day: 'Mon', sessions: 140 },
  { day: 'Tue', sessions: 152 },
  { day: 'Wed', sessions: 131 },
  { day: 'Thu', sessions: 170 },
  { day: 'Fri', sessions: 165 },
  { day: 'Sat', sessions: 122 },
  { day: 'Sun', sessions: 118 },
];

const meta: Meta<typeof ChartContainer> = {
  title: 'UI/Chart',
  component: ChartContainer,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChartContainer>;

export const LineComparison: Story = {
  name: 'Line — Comparison',
  render: () => (
    <ChartContainer config={trafficConfig} className="w-full max-w-4xl">
      <LineChart data={trafficData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} />
        <Line
          type="monotone"
          dataKey="desktop"
          stroke="var(--color-desktop)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="mobile"
          stroke="var(--color-mobile)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={{ r: 3 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  ),
};

export const StackedBarsWithLegend: Story = {
  name: 'Bars — Stacked With Legend Icons',
  render: () => (
    <ChartContainer config={pipelineConfig} className="w-full max-w-4xl">
      <BarChart data={pipelineData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="stage"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ angle: -10 }}
        />
        <YAxis tickLine={false} axisLine={false} />
        <Bar dataKey="inbound" stackId="total" fill="var(--color-inbound)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="outbound" stackId="total" fill="var(--color-outbound)" radius={[6, 6, 0, 0]} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend verticalAlign="top" content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  ),
};

export const AreaSparkline: Story = {
  name: 'Area — Minimal Tooltip Variants',
  render: () => (
    <ChartContainer config={sessionConfig} className="w-full max-w-3xl">
      <AreaChart data={sessionData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis hide />
        <Area
          dataKey="sessions"
          type="monotone"
          stroke="var(--color-sessions)"
          fill="var(--color-sessions)"
          fillOpacity={0.2}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="dashed"
              hideIndicator
              hideLabel
              nameKey="sessions"
              labelKey="day"
            />
          }
        />
      </AreaChart>
    </ChartContainer>
  ),
};
