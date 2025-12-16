import type { Meta, StoryObj } from '@storybook/react-vite';

import { Slider } from './slider';

const meta = {
  title: 'UI/Slider',
  component: Slider,
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};