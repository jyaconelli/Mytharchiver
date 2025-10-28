import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { TimelineView } from '../TimelineView';

const plotPointMock = vi.hoisted(() => vi.fn());

vi.mock('../PlotPoint', () => ({
  PlotPoint: vi.fn((props) => {
    plotPointMock(props);
    return (
      <div data-testid={`timeline-${props.plotPoint.id}`}>
        {props.plotPoint.text}
      </div>
    );
  }),
}));

const mythemes = [
  { id: 't1', name: 'Fire', type: 'object', color: '#fff' },
  { id: 't2', name: 'Hero', type: 'character', color: '#eee' },
];

const createPlotPoint = (overrides: Partial<any> = {}) => ({
  id: `point-${Math.random().toString(36).slice(2, 7)}`,
  text: 'Plot point',
  category: 'Introduction',
  order: 1,
  mythemeRefs: [],
  ...overrides,
});

describe('TimelineView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders plot points in order and forwards handlers', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const plotPoints = [
      createPlotPoint({ id: 'p2', text: 'Second', order: 2 }),
      createPlotPoint({ id: 'p1', text: 'First', order: 1 }),
    ];

    const { container } = render(
      <TimelineView
        plotPoints={plotPoints}
        mythemes={mythemes}
        onDeletePlotPoint={onDelete}
        onEditPlotPoint={onEdit}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getAllByTestId(/timeline-/)[0]).toHaveTextContent('First');
    expect(plotPointMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        plotPoint: expect.objectContaining({ id: 'p1' }),
        onDelete: onDelete,
        onEdit: onEdit,
      }),
    );
  });
});
