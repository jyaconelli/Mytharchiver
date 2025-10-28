import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { GroupedView } from '../GroupedView';

const dropHandlers = vi.hoisted(() => [] as Array<(item: { id: string; currentCategory: string }) => void>);
const plotPointCalls = vi.hoisted(() => [] as Array<any>);

vi.mock('../PlotPoint', () => ({
  PlotPoint: vi.fn((props) => {
    plotPointCalls.push(props);
    return (
      <div data-testid={`plot-${props.plotPoint.id}`}>
        {props.plotPoint.text} ({props.plotPoint.category})
      </div>
    );
  }),
}));

vi.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-provider">{children}</div>
  ),
  useDrag: vi.fn(() => [{ isDragging: false }, () => {}]),
  useDrop: vi.fn((getConfig: any) => {
    const config = typeof getConfig === 'function' ? getConfig() : getConfig;
    dropHandlers.push(config.drop);
    return [{ isOver: false }, () => {}];
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

describe('GroupedView', () => {
  beforeEach(() => {
    dropHandlers.length = 0;
    plotPointCalls.length = 0;
    vi.clearAllMocks();
  });

  test('renders grouped plot points and handles drop updates', () => {
    const onUpdatePlotPoint = vi.fn().mockResolvedValue(undefined);
    const plotPoints = [
      createPlotPoint({ id: 'p1', text: 'Arrival', category: 'Introduction', order: 2 }),
      createPlotPoint({ id: 'p2', text: 'Conflict arises', category: 'Conflict', order: 1 }),
    ];

    const { container } = render(
      <GroupedView
        plotPoints={plotPoints}
        mythemes={mythemes}
        categories={['Introduction', 'Conflict']}
        onUpdatePlotPoint={onUpdatePlotPoint}
        onDeletePlotPoint={vi.fn()}
        onEditPlotPoint={vi.fn()}
        canEdit
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Conflict')).toBeInTheDocument();
    expect(plotPointCalls).toHaveLength(2);

    // Simulate dropping plot point p1 into the Conflict column.
    expect(dropHandlers.length).toBeGreaterThanOrEqual(2);
    const dropIntoConflict = dropHandlers[1];
    dropIntoConflict({ id: 'p1', currentCategory: 'Introduction' });
    expect(onUpdatePlotPoint).toHaveBeenCalledWith('p1', { category: 'Conflict' });
  });

  test('shows placeholder when no plot points and editing disabled', () => {
    render(
      <GroupedView
        plotPoints={[]}
        mythemes={mythemes}
        categories={['Resolution']}
        onUpdatePlotPoint={undefined}
        canEdit={false}
      />,
    );

    expect(screen.getByText(/no plot points in this category/i)).toBeInTheDocument();

    // Drop should not trigger update when editing disabled.
    expect(dropHandlers.length).toBeGreaterThan(0);
    dropHandlers[0]({ id: 'p1', currentCategory: 'Resolution' });
    expect(plotPointCalls).toHaveLength(0);
  });
});
