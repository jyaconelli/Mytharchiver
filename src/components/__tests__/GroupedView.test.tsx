import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { GroupedView } from '../GroupedView';
import type { CollaboratorCategory } from '../../types/myth';

const dropHandlers = vi.hoisted(
  () => [] as Array<(item: { id: string; currentCategory: string }) => void>,
);
const plotPointCalls = vi.hoisted(() => [] as Array<any>);

vi.mock('../PlotPoint', () => ({
  PlotPoint: vi.fn((props) => {
    plotPointCalls.push(props);
    return <div data-testid={`plot-${props.plotPoint.id}`}>{props.plotPoint.text}</div>;
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

const viewerEmail = 'editor@example.com';
const collaboratorCategories: CollaboratorCategory[] = [
  { id: 'cat-1', mythId: 'myth-1', collaboratorEmail: viewerEmail, name: 'Drama' },
];

const createPlotPoint = (overrides: Partial<any> = {}) => ({
  id: `point-${Math.random().toString(36).slice(2, 7)}`,
  text: 'Sample plot point',
  category: 'Introduction',
  order: 1,
  mythemeRefs: [],
  collaboratorCategories: [],
  ...overrides,
});

describe('GroupedView', () => {
  beforeEach(() => {
    dropHandlers.length = 0;
    plotPointCalls.length = 0;
    vi.clearAllMocks();
  });

  test('renders grouped plot points and handles assignments', async () => {
    const onAssignCategory = vi.fn().mockResolvedValue(undefined);

    const assignedPlotPoint = createPlotPoint({
      id: 'p1',
      text: 'Assigned',
      collaboratorCategories: [
        {
          plotPointId: 'p1',
          collaboratorCategoryId: 'cat-1',
          collaboratorEmail: viewerEmail,
          categoryName: 'Drama',
        },
      ],
    });
    const unassignedPlotPoint = createPlotPoint({ id: 'p2', text: 'Unassigned' });

    render(
      <GroupedView
        plotPoints={[assignedPlotPoint, unassignedPlotPoint]}
        mythemes={mythemes}
        categories={['Introduction']}
        collaboratorCategories={collaboratorCategories}
        viewerEmail={viewerEmail}
        onAssignCategory={onAssignCategory}
        canEdit
      />,
    );

    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(plotPointCalls).toHaveLength(2);

    const [, dropIntoDrama, dropIntoNew] = dropHandlers;
    dropIntoDrama({ id: 'p2', currentCategory: '__uncategorized__' });
    expect(onAssignCategory).toHaveBeenCalledWith('p2', 'cat-1', 'Drama');

    const [dropIntoUncategorized] = dropHandlers;
    dropIntoUncategorized({ id: 'p1', currentCategory: 'cat-1' });
    expect(onAssignCategory).toHaveBeenCalledWith('p1', null, undefined);

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Mystery');
    dropIntoNew({ id: 'p1', currentCategory: 'cat-1' });
    expect(onAssignCategory).toHaveBeenCalledWith('p1', null, 'Mystery');
    promptSpy.mockRestore();
  });

  test('renders read-only view when editing disabled', () => {
    render(
      <GroupedView
        plotPoints={[]}
        mythemes={mythemes}
        categories={['Introduction']}
        collaboratorCategories={collaboratorCategories}
        viewerEmail={viewerEmail}
        canEdit={false}
      />,
    );

    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(dropHandlers.length).toBeGreaterThan(0);

    dropHandlers[0]({ id: 'p1', currentCategory: '' });
    expect(plotPointCalls).toHaveLength(0);
  });
});
