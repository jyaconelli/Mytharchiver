import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { GridView } from '../GridView';

const plotPointMock = vi.hoisted(() => vi.fn());

vi.mock('../PlotPoint', () => ({
  PlotPoint: vi.fn((props) => {
    plotPointMock(props);
    return (
      <div data-testid={`plot-${props.plotPoint.id}`}>
        {props.plotPoint.text} [{props.plotPoint.category}]
      </div>
    );
  }),
}));

const mythemes = [
  { id: 'theme-1', name: 'Fire', type: 'object', color: '#f00' },
  { id: 'theme-2', name: 'Hero', type: 'character', color: '#00f' },
];

const createPlotPoint = (overrides: Partial<any> = {}) => ({
  id: `point-${Math.random().toString(36).slice(2, 7)}`,
  text: 'Sample plot point',
  category: 'Introduction',
  order: 1,
  mythemeRefs: [],
  ...overrides,
});

describe('GridView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders plot points grouped by category with snapshot', () => {
    const plotPoints = [
      createPlotPoint({ id: '1', text: 'First', category: 'Introduction', order: 2 }),
      createPlotPoint({ id: '2', text: 'Second', category: 'Conflict', order: 1 }),
      createPlotPoint({ id: '3', text: 'Third', category: 'Conflict', order: 3 }),
    ];

    const { container } = render(
      <GridView
        plotPoints={plotPoints}
        mythemes={mythemes}
        categories={['Introduction', 'Conflict']}
        onDeletePlotPoint={vi.fn()}
        onEditPlotPoint={vi.fn()}
        canEdit
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Conflict')).toBeInTheDocument();
    expect(plotPointMock).toHaveBeenCalledTimes(3);
    expect(plotPointMock.mock.calls[0][0].plotPoint.id).toBe('2'); // sorted by order
  });

  test('shows placeholder when no plot points and cannot edit', () => {
    render(
      <GridView
        plotPoints={[]}
        mythemes={mythemes}
        categories={[]}
        canEdit={false}
      />,
    );

    expect(screen.getByText(/no plot points to display/i)).toBeInTheDocument();
    expect(plotPointMock).not.toHaveBeenCalled();
  });
});
