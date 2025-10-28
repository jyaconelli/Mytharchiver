import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { PlotPoint } from '../PlotPoint';

const mythemes = [
  { id: 't1', name: 'Prometheus', type: 'character', color: '#fff' },
  { id: 't2', name: 'Fire', type: 'object', color: '#eee' },
];

const plotPoint = {
  id: 'point-1',
  text: 'Prometheus delivers Fire to humanity.',
  category: 'Introduction',
  order: 3,
  mythemeRefs: ['t1', 't2'],
};

describe('PlotPoint', () => {
  test('renders plot point with highlighted mythemes and triggers actions', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onEdit = vi.fn();

    const { container } = render(
      <PlotPoint
        plotPoint={plotPoint}
        mythemes={mythemes}
        onDelete={onDelete}
        onEdit={onEdit}
      />,
    );

    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('Prometheus')).toHaveClass('inline-block');
    expect(screen.getByText('Fire')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();

    await user.click(screen.getByRole('button', { name: /edit plot point/i }));
    expect(onEdit).toHaveBeenCalledWith(plotPoint);

    await user.click(screen.getByRole('button', { name: /delete plot point/i }));
    expect(onDelete).toHaveBeenCalledWith('point-1');
  });

  test('hides category and actions when not provided', () => {
    const { container } = render(
      <PlotPoint plotPoint={plotPoint} mythemes={mythemes} showCategory={false} />,
    );

    expect(screen.queryByText('Introduction')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit plot point/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete plot point/i })).not.toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });
});
