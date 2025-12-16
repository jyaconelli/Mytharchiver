import type { Meta, StoryObj } from '@storybook/react-vite';

import { Switch } from './switch';

const meta: Meta<typeof Switch>  = {
  title: 'UI/Switch',
  component: Switch,
  argTypes: {
    onCheckedChange: { action: 'checkedChange' },
  }
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};