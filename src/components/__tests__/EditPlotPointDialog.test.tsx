import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { EditPlotPointDialog } from '../EditPlotPointDialog';

const categories = ['Introduction', 'Conflict', 'Resolution'];
const mythemes = [
  { id: 'theme-1', name: 'Fire', type: 'object', color: '#f00' },
  { id: 'theme-2', name: 'Zeus', type: 'character', color: '#0f0' },
];
const plotPoint = {
  id: 'point-1',
  text: 'Prometheus steals fire from Zeus for humanity.',
  category: 'Introduction',
  order: 1,
  mythemeRefs: ['theme-2'],
};

const setupDomMocks = () => {
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
    // @ts-expect-error mock for tests
    window.ResizeObserver = MockResizeObserver;
  }
};

const selectCategory = async (user: ReturnType<typeof userEvent['setup']>, name: string) => {
  await user.click(screen.getByLabelText(/category/i));
  const option = screen
    .getAllByText(name, { exact: true })
    .find((el) => el.closest('[data-slot="select-item"]'));
  if (!option) {
    throw new Error(`Category option ${name} not found`);
  }
  await user.click(option.closest('[data-slot="select-item"]') as HTMLElement);
};

const findBadge = (name: string) =>
  screen
    .queryAllByText(name, { exact: true })
    .map((node) => node.closest('[data-slot="badge"]'))
    .find((badge): badge is HTMLElement => Boolean(badge));

describe('EditPlotPointDialog', () => {
  beforeAll(() => {
    setupDomMocks();
  });

  test('pre-populates plot point details and saves updates', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const { container } = render(
      <EditPlotPointDialog
        open
        onOpenChange={onOpenChange}
        plotPoint={plotPoint}
        categories={categories}
        mythemes={mythemes}
        onSave={onSave}
      />,
    );

    expect(screen.getByDisplayValue(plotPoint.text)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /category/i })).toHaveTextContent(
      plotPoint.category,
    );
    expect(findBadge('Zeus')).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();

    await user.clear(screen.getByLabelText(/plot point text/i));
    await user.type(
      screen.getByLabelText(/plot point text/i),
      'Prometheus delivers fire to mortals.',
    );
    await selectCategory(user, 'Conflict');

    await user.click(screen.getByRole('button', { name: /select mythemes/i }));
    await user.click(screen.getByLabelText(/fire/i));
    await user.click(screen.getByLabelText(/zeus/i));

    expect(findBadge('Fire')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith({
      text: 'Prometheus delivers fire to mortals.',
      category: 'Conflict',
      mythemeRefs: ['theme-1'],
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('shows error when save fails and resets on reopen', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Unable to update the plot point.'));
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <EditPlotPointDialog
        open
        onOpenChange={onOpenChange}
        plotPoint={plotPoint}
        categories={categories}
        mythemes={mythemes}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/unable to update the plot point/i)).toBeInTheDocument();

    rerender(
      <EditPlotPointDialog
        open={false}
        onOpenChange={onOpenChange}
        plotPoint={plotPoint}
        categories={categories}
        mythemes={mythemes}
        onSave={onSave}
      />,
    );

    rerender(
      <EditPlotPointDialog
        open
        onOpenChange={onOpenChange}
        plotPoint={plotPoint}
        categories={categories}
        mythemes={mythemes}
        onSave={onSave}
      />,
    );

    expect(screen.queryByText(/unable to update the plot point/i)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue(plotPoint.text)).toBeInTheDocument();
  });

  test('does not submit when plot point missing', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <EditPlotPointDialog
        open
        onOpenChange={vi.fn()}
        plotPoint={null}
        categories={categories}
        mythemes={mythemes}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
