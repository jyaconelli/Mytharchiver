import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { VariantView } from '../VariantView';
import type {
  CollaboratorCategory,
  MythCollaborator,
  MythVariant,
  PlotPoint,
  Mytheme,
} from '../../types/myth';

const ensureDomMocks = () => {
  const proto = window.HTMLElement.prototype as HTMLElement & {
    hasPointerCapture?: (pointerId: number) => boolean;
    releasePointerCapture?: (pointerId: number) => void;
    scrollIntoView?: () => void;
  };

  if (typeof proto.hasPointerCapture !== 'function') {
    Object.defineProperty(proto, 'hasPointerCapture', {
      value: () => false,
      configurable: true,
    });
  }
  if (typeof proto.releasePointerCapture !== 'function') {
    Object.defineProperty(proto, 'releasePointerCapture', {
      value: () => {},
      configurable: true,
    });
  }
  if (typeof proto.scrollIntoView !== 'function') {
    Object.defineProperty(proto, 'scrollIntoView', {
      value: () => {},
      configurable: true,
    });
  }
  if (typeof window.ResizeObserver === 'undefined') {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = MockResizeObserver;
  }
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: vi.fn(() => 'generated-id-faked-for-testing') },
      configurable: true,
    });
  }
};

const timelinePropsCalls: Array<any> = [];
const groupedPropsCalls: Array<any> = [];
const gridPropsCalls: Array<any> = [];
let addDialogProps: any;
let editDialogProps: any;

const resetCapturedProps = () => {
  timelinePropsCalls.length = 0;
  groupedPropsCalls.length = 0;
  gridPropsCalls.length = 0;
  addDialogProps = undefined;
  editDialogProps = undefined;
};

vi.mock('../TimelineView', () => ({
  TimelineView: (props: any) => {
    timelinePropsCalls.push(props);
    return (
      <div data-testid="timeline-view">
        {props.plotPoints.map((p: PlotPoint) => p.text).join(',')}
      </div>
    );
  },
}));

vi.mock('../GroupedView', () => ({
  GroupedView: (props: any) => {
    groupedPropsCalls.push(props);
    return <div data-testid="grouped-view">{props.categories.join('|')}</div>;
  },
}));

vi.mock('../GridView', () => ({
  GridView: (props: any) => {
    gridPropsCalls.push(props);
    return <div data-testid="grid-view">{props.categories.length} columns</div>;
  },
}));

vi.mock('../AddPlotPointDialog', () => ({
  AddPlotPointDialog: (props: any) => {
    addDialogProps = props;
    return props.open ? <div data-testid="add-plot-dialog">Add dialog open</div> : null;
  },
}));

vi.mock('../EditPlotPointDialog', () => ({
  EditPlotPointDialog: (props: any) => {
    editDialogProps = props;
    return props.open ? <div data-testid="edit-plot-dialog">Edit dialog open</div> : null;
  },
}));

const mythemes: Mytheme[] = [
  { id: 't1', name: 'Fire', type: 'object' },
  { id: 't2', name: 'Prometheus', type: 'character' },
];

const variant: MythVariant = {
  id: 'variant-1',
  name: 'Canonical Version',
  source: 'Oral tradition',
  plotPoints: [
    {
      id: 'p1',
      text: 'Prometheus observes humans',
      category: 'Introduction',
      order: 1,
      mythemeRefs: [],
    },
    { id: 'p2', text: 'Fire is stolen', category: 'Conflict', order: 2, mythemeRefs: ['t1'] },
  ],
};

const categories = ['Introduction', 'Conflict', 'Resolution'];
const collaboratorCategories: CollaboratorCategory[] = [];
const collaborators: MythCollaborator[] = [
  { id: 'collab-owner', mythId: 'myth-1', email: 'owner@example.com', role: 'owner' },
  { id: 'collab-2', mythId: 'myth-1', email: 'editor@example.com', role: 'editor' },
];

describe('VariantView', () => {
  beforeAll(() => {
    ensureDomMocks();
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(
        () => 'generated-id-faked-for-testing',
      );
    }
  });

  beforeEach(() => {
    resetCapturedProps();
  });

  test('renders variant summary and tabs with snapshot', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <VariantView
        variant={variant}
        mythemes={mythemes}
        categories={categories}
        canonicalCategories={[]}
        collaboratorCategories={collaboratorCategories}
        collaborators={collaborators}
        onUpdateVariant={vi.fn()}
        viewerEmail="owner@example.com"
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByTestId('timeline-view')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /grouped/i }));
    expect(groupedPropsCalls.at(-1)?.categories).toEqual(categories);

    await user.click(screen.getByRole('tab', { name: /grid/i }));
    expect(gridPropsCalls.at(-1)?.plotPoints.length).toBe(2);
  });

  test('supports adding, editing, and deleting plot points', async () => {
    const user = userEvent.setup();
    const onUpdateVariant = vi.fn().mockResolvedValue(undefined);

    render(
      <VariantView
        variant={variant}
        mythemes={mythemes}
        categories={categories}
        canonicalCategories={[]}
        collaboratorCategories={collaboratorCategories}
        collaborators={collaborators}
        onUpdateVariant={onUpdateVariant}
        viewerEmail="owner@example.com"
      />,
    );

    // Trigger add plot point
    await user.click(screen.getByRole('button', { name: /add plot point/i }));
    expect(addDialogProps.open).toBe(true);
    await act(async () => {
      await addDialogProps.onAdd('New point', ['t2']);
    });

    const firstCall = onUpdateVariant.mock.calls[0][0];
    expect(firstCall.plotPoints).toHaveLength(variant.plotPoints.length + 1);
    const addedPoint = firstCall.plotPoints.at(-1);
    expect(addedPoint).toMatchObject({
      text: 'New point',
      category: 'Uncategorized',
      mythemeRefs: ['t2'],
      canonicalCategoryId: null,
      collaboratorCategories: [],
    });

    // Trigger edit
    const timelineProps = timelinePropsCalls.at(-1);
    await act(async () => {
      timelineProps.onEditPlotPoint?.(variant.plotPoints[1]);
    });
    expect(editDialogProps.open).toBe(true);
    await act(async () => {
      await editDialogProps.onSave({
        text: 'Updated fire theft',
        category: 'Conflict',
        mythemeRefs: [],
      });
    });

    const secondCall = onUpdateVariant.mock.calls[1][0];
    expect(secondCall.plotPoints[1]).toMatchObject({
      id: variant.plotPoints[1].id,
      text: 'Updated fire theft',
      category: 'Conflict',
      mythemeRefs: [],
    });

    // Trigger delete
    await act(async () => {
      await timelineProps.onDeletePlotPoint?.('p1');
    });

    const thirdCall = onUpdateVariant.mock.calls[2][0];
    expect(thirdCall.plotPoints).toHaveLength(2);
    expect(thirdCall.plotPoints[0]).toMatchObject({
      id: 'p2',
      order: 1,
    });
    expect(thirdCall.plotPoints[1]).toMatchObject({
      id: 'generated-id-faked-for-testing',
      order: 2,
    });
  });

  test('creates collaborator category before assigning when available', async () => {
    const onUpdateVariant = vi.fn().mockResolvedValue(undefined);
    const onCreateCollaboratorCategory = vi.fn().mockResolvedValue({
      id: 'cat-123',
      mythId: 'myth-1',
      collaboratorEmail: 'owner@example.com',
      name: 'My Thread',
    });
    const user = userEvent.setup();

    render(
      <VariantView
        variant={variant}
        mythemes={mythemes}
        categories={categories}
        canonicalCategories={[]}
        collaboratorCategories={collaboratorCategories}
        collaborators={collaborators}
        onUpdateVariant={onUpdateVariant}
        onCreateCollaboratorCategory={onCreateCollaboratorCategory}
        viewerEmail="owner@example.com"
      />,
    );

    await user.click(screen.getByRole('tab', { name: /grouped/i }));

    const groupedProps = groupedPropsCalls.at(-1);
    expect(groupedProps?.onAssignCategory).toBeDefined();

    await act(async () => {
      await groupedProps.onAssignCategory?.('p1', null, 'My Thread');
    });

    expect(onCreateCollaboratorCategory).toHaveBeenCalledWith('My Thread');
    const updatedVariant = onUpdateVariant.mock.calls.at(-1)?.[0];
    expect(updatedVariant).toBeDefined();
    expect(updatedVariant.plotPoints[0].collaboratorCategories).toEqual([
      {
        plotPointId: 'p1',
        collaboratorCategoryId: 'cat-123',
        collaboratorEmail: 'owner@example.com',
        categoryName: 'My Thread',
      },
    ]);
  });

  test('preserves previous grouped assignments after consecutive drags', async () => {
    const user = userEvent.setup();
    const onUpdateVariant = vi.fn().mockResolvedValue(undefined);
    const viewerEmail = 'editor@example.com';

    const variantWithAssignments: MythVariant = {
      ...variant,
      plotPoints: [
        {
          ...variant.plotPoints[0],
          collaboratorCategories: [
            {
              plotPointId: 'p1',
              collaboratorCategoryId: 'cat-1',
              collaboratorEmail: viewerEmail,
              categoryName: 'Thread Alpha',
            },
          ],
        },
        {
          ...variant.plotPoints[1],
          collaboratorCategories: [
            {
              plotPointId: 'p2',
              collaboratorCategoryId: 'cat-1',
              collaboratorEmail: viewerEmail,
              categoryName: 'Thread Alpha',
            },
          ],
        },
      ],
    };

    const viewerCollaboratorCategories: CollaboratorCategory[] = [
      { id: 'cat-1', mythId: variant.id, collaboratorEmail: viewerEmail, name: 'Thread Alpha' },
      { id: 'cat-2', mythId: variant.id, collaboratorEmail: viewerEmail, name: 'Thread Beta' },
    ];

    render(
      <VariantView
        variant={variantWithAssignments}
        mythemes={mythemes}
        categories={categories}
        canonicalCategories={[]}
        collaboratorCategories={viewerCollaboratorCategories}
        collaborators={collaborators}
        onUpdateVariant={onUpdateVariant}
        viewerEmail={viewerEmail}
      />,
    );

    expect(screen.queryByRole('tab', { name: /insights/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /grouped/i }));

    const groupedProps = groupedPropsCalls.at(-1);
    expect(groupedProps?.onAssignCategory).toBeDefined();

    await act(async () => {
      await groupedProps.onAssignCategory?.('p1', 'cat-2', 'Thread Beta');
    });

    await act(async () => {
      await groupedProps.onAssignCategory?.('p2', 'cat-2', 'Thread Beta');
    });

    expect(onUpdateVariant).toHaveBeenCalledTimes(2);

    const finalVariant = onUpdateVariant.mock.calls.at(-1)?.[0];
    expect(
      finalVariant?.plotPoints.find((point: PlotPoint) => point.id === 'p1')
        ?.collaboratorCategories,
    ).toEqual([
      {
        plotPointId: 'p1',
        collaboratorCategoryId: 'cat-2',
        collaboratorEmail: viewerEmail,
        categoryName: 'Thread Beta',
      },
    ]);
    expect(
      finalVariant?.plotPoints.find((point: PlotPoint) => point.id === 'p2')
        ?.collaboratorCategories,
    ).toEqual([
      {
        plotPointId: 'p2',
        collaboratorCategoryId: 'cat-2',
        collaboratorEmail: viewerEmail,
        categoryName: 'Thread Beta',
      },
    ]);
  });

  test('displays error when persistence fails', async () => {
    const user = userEvent.setup();
    const onUpdateVariant = vi.fn().mockRejectedValue(new Error('Unable to update the variant.'));

    render(
      <VariantView
        variant={variant}
        mythemes={mythemes}
        categories={categories}
        canonicalCategories={[]}
        collaboratorCategories={collaboratorCategories}
        collaborators={collaborators}
        onUpdateVariant={onUpdateVariant}
        viewerEmail="owner@example.com"
      />,
    );

    await user.click(screen.getByRole('button', { name: /add plot point/i }));
    expect(addDialogProps.open).toBe(true);
    await act(async () => {
      await expect(addDialogProps.onAdd('Failing', [])).rejects.toThrow();
    });

    expect(await screen.findByText(/unable to update the variant/i)).toBeInTheDocument();
  });

  test('disables dialogs and handlers when cannot edit', () => {
    render(
      <VariantView
        variant={variant}
        mythemes={mythemes}
        categories={categories}
        canonicalCategories={[]}
        collaboratorCategories={collaboratorCategories}
        collaborators={collaborators}
        onUpdateVariant={vi.fn()}
        canEdit={false}
        viewerEmail="owner@example.com"
      />,
    );

    expect(screen.queryByRole('button', { name: /add plot point/i })).not.toBeInTheDocument();
    expect(addDialogProps).toBeUndefined();
    expect(timelinePropsCalls[0].onDeletePlotPoint).toBeUndefined();
    expect(groupedPropsCalls[0]?.onAssignCategory).toBeUndefined();
    expect(gridPropsCalls[0]?.onEditPlotPoint).toBeUndefined();
  });
});
