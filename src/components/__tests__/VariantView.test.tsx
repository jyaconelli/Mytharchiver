import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { VariantView } from '../VariantView';
import type { MythVariant, PlotPoint, Mytheme } from '../../types/myth';

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
    // @ts-expect-error mock for test environment
    window.ResizeObserver = MockResizeObserver;
  }
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: vi.fn(() => 'generated-id') },
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
    return <div data-testid="timeline-view">{props.plotPoints.map((p: PlotPoint) => p.text).join(',')}</div>;
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
  { id: 't1', name: 'Fire', type: 'object', color: '#fff' },
  { id: 't2', name: 'Prometheus', type: 'character', color: '#eee' },
];

const variant: MythVariant = {
  id: 'variant-1',
  name: 'Canonical Version',
  source: 'Oral tradition',
  plotPoints: [
    { id: 'p1', text: 'Prometheus observes humans', category: 'Introduction', order: 1, mythemeRefs: [] },
    { id: 'p2', text: 'Fire is stolen', category: 'Conflict', order: 2, mythemeRefs: ['t1'] },
  ],
};

const categories = ['Introduction', 'Conflict', 'Resolution'];

describe('VariantView', () => {
  beforeAll(() => {
    ensureDomMocks();
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => 'generated-id');
    }
  });

  beforeEach(() => {
    resetCapturedProps();
  });

  test('renders variant summary and tabs with snapshot', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <VariantView variant={variant} mythemes={mythemes} categories={categories} onUpdateVariant={vi.fn()} />,
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
      <VariantView variant={variant} mythemes={mythemes} categories={categories} onUpdateVariant={onUpdateVariant} />,
    );

    // Trigger add plot point
    await user.click(screen.getByRole('button', { name: /add plot point/i }));
    expect(addDialogProps.open).toBe(true);
    await act(async () => {
      await addDialogProps.onAdd('New point', 'Resolution', ['t2']);
    });

    expect(onUpdateVariant).toHaveBeenCalledWith({
      ...variant,
      plotPoints: [
        ...variant.plotPoints,
        {
          id: 'generated-id',
          text: 'New point',
          category: 'Resolution',
          order: variant.plotPoints.length + 1,
          mythemeRefs: ['t2'],
        },
      ],
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

    expect(onUpdateVariant).toHaveBeenCalledWith({
      ...variant,
      plotPoints: [
        variant.plotPoints[0],
        {
          ...variant.plotPoints[1],
          text: 'Updated fire theft',
          category: 'Conflict',
          mythemeRefs: [],
        },
      ],
    });

    // Trigger delete
    await act(async () => {
      await timelineProps.onDeletePlotPoint?.('p1');
    });

    expect(onUpdateVariant).toHaveBeenCalledWith({
      ...variant,
      plotPoints: [
        { ...variant.plotPoints[1], id: 'p2', order: 1 },
      ],
    });
  });

  test('displays error when persistence fails', async () => {
    const user = userEvent.setup();
    const onUpdateVariant = vi.fn().mockRejectedValue(new Error('Unable to update the variant.'));

    render(
      <VariantView variant={variant} mythemes={mythemes} categories={categories} onUpdateVariant={onUpdateVariant} />,
    );

    await user.click(screen.getByRole('button', { name: /add plot point/i }));
    expect(addDialogProps.open).toBe(true);
    await act(async () => {
      await expect(addDialogProps.onAdd('Failing', 'Conflict', [])).rejects.toThrow();
    });

    expect(await screen.findByText(/unable to update the variant/i)).toBeInTheDocument();
  });

  test('disables dialogs and handlers when cannot edit', () => {
    render(
      <VariantView
        variant={variant}
        mythemes={mythemes}
        categories={categories}
        onUpdateVariant={vi.fn()}
        canEdit={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /add plot point/i })).not.toBeInTheDocument();
    expect(addDialogProps).toBeUndefined();
    expect(timelinePropsCalls[0].onDeletePlotPoint).toBeUndefined();
    expect(groupedPropsCalls[0]?.onUpdatePlotPoint).toBeUndefined();
    expect(gridPropsCalls[0]?.onEditPlotPoint).toBeUndefined();
  });
});
