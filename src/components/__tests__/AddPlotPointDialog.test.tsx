import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { AddPlotPointDialog } from '../AddPlotPointDialog';

const mythemes = [
  { id: 'theme-1', name: 'Hero', type: 'character', color: '#fff' },
  { id: 'theme-2', name: 'Prophecy', type: 'event', color: '#eee' },
];

describe('AddPlotPointDialog', () => {
  beforeAll(() => {
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
      // @ts-expect-error - assign mock for test environment.
      window.ResizeObserver = MockResizeObserver;
    }
  });
  const findBadge = (name: string) =>
    screen
      .queryAllByText(name, { exact: true })
      .map((element) => element.closest('[data-slot="badge"]'))
      .find((badge): badge is HTMLElement => Boolean(badge));

  test('submits plot point with selected mythemes', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const { container } = render(
      <AddPlotPointDialog
        open
        onOpenChange={onOpenChange}
        onAdd={onAdd}
        mythemes={mythemes}
        nextOrder={4}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();

    await user.type(
      screen.getByLabelText(/plot point text/i),
      'Prometheus walks among mortals to understand their suffering.',
    );

    await user.click(screen.getByRole('button', { name: /select mythemes/i }));
    await user.click(screen.getByLabelText(/hero/i));
    await user.click(screen.getByLabelText(/prophecy/i));

    expect(findBadge('Hero')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide mythemes/i }));

    await user.click(screen.getByRole('button', { name: /add plot point/i }));

    expect(onAdd).toHaveBeenCalledWith(
      'Prometheus walks among mortals to understand their suffering.',
      ['theme-1', 'theme-2'],
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('allows removing mythemes and handles submission error', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValue(new Error('Unable to add the plot point.'));

    render(
      <AddPlotPointDialog
        open
        onOpenChange={vi.fn()}
        onAdd={onAdd}
        mythemes={mythemes}
        nextOrder={10}
      />,
    );

    await user.type(screen.getByLabelText(/plot point text/i), 'Zeus notices the theft.');
    await user.click(screen.getByRole('button', { name: /select mythemes/i }));
    await user.click(screen.getByLabelText(/hero/i));
    await user.click(screen.getByLabelText(/hero/i));

    await user.click(screen.getByRole('button', { name: /add plot point/i }));

    expect(await screen.findByText(/unable to add the plot point/i)).toBeInTheDocument();

    expect(findBadge('Hero')).toBeUndefined();
  });
});
