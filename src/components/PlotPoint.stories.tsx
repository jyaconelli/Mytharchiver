import type { Meta, StoryObj } from '@storybook/react-vite';

import { PlotPoint } from './PlotPoint';
import type { PlotPoint as PlotPointType, Mytheme } from '../types/myth';

const sampleMythemes: Mytheme[] = [
  { id: 'm1', name: 'Hero', type: 'character' },
  { id: 'm2', name: 'Underworld', type: 'place' },
];

const basePlotPoint: PlotPointType = {
  id: 'pp-1',
  text: 'The Hero ventures into the Underworld to retrieve a lost relic.',
  order: 1,
  mythemeRefs: ['m1', 'm2'],
  category: 'Introduction',
  canonicalCategoryId: null,
  collaboratorCategories: [
    {
      plotPointId: 'pp-1',
      collaboratorCategoryId: 'cat-1',
      collaboratorEmail: 'ally@example.com',
      categoryName: 'Setup',
    },
  ],
};

const otherEditorPlotPoint: PlotPointType = {
  id: 'pp-1',
  text: 'The Hero ventures into the Underworld to retrieve a lost relic.',
  order: 1,
  mythemeRefs: ['m1', 'm2'],
  category: 'Introduction',
  canonicalCategoryId: null,
  collaboratorCategories: [
    {
      plotPointId: 'pp-1',
      collaboratorCategoryId: 'cat-1',
      collaboratorEmail: 'other@example.com',
      categoryName: 'Setup',
    },
  ],
};

const meta = {
  component: PlotPoint,
  args: {
    plotPoint: basePlotPoint,
    mythemes: sampleMythemes,
    viewerEmail: 'ally@example.com',
  },
  argTypes: {
    onDelete: { action: 'delete' },
    onEdit: { action: 'edit' }
  }
} satisfies Meta<typeof PlotPoint>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CreatedByOther: Story = {
  args: {
    plotPoint: { ...otherEditorPlotPoint, category: 'Conflict', order: 3 },
  },
};

export const Dragging: Story = {
  args: {
    plotPoint: { ...basePlotPoint, order: 2, category: 'Journey' },
    isDragging: true,
  },
};

export const NoCollaborators: Story = {
  args: {
    plotPoint: { ...basePlotPoint, collaboratorCategories: [], category: 'Conflict', order: 3 },
    viewerEmail: undefined,
  },
};

