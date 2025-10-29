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
  collaboratorCategories: [
    {
      plotPointId: 'point-1',
      collaboratorCategoryId: 'cat-1',
      collaboratorEmail: 'editor@example.com',
      categoryName: 'Drama',
    },
  ],
};

describe('PlotPoint', () => {
  test('renders plot point with highlighted mythemes and triggers actions', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onEdit = vi.fn();

    render(
      <PlotPoint
        plotPoint={plotPoint}
        mythemes={mythemes}
        onDelete={onDelete}
        onEdit={onEdit}
        viewerEmail="editor@example.com"
      />,
    );

    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('Prometheus')).toHaveClass('inline-block');
    expect(screen.getByText('Fire')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit plot point/i }));
    expect(onEdit).toHaveBeenCalledWith(plotPoint);

    await user.click(screen.getByRole('button', { name: /delete plot point/i }));
    expect(onDelete).toHaveBeenCalledWith('point-1');
  });

  test('hides category and actions when not provided', () => {
    render(<PlotPoint plotPoint={plotPoint} mythemes={mythemes} showCategory={false} />);

    expect(screen.queryByText('Introduction')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit plot point/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete plot point/i })).not.toBeInTheDocument();
  });
});
