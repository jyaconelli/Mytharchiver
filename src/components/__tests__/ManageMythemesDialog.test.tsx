import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { ManageMythemesDialog } from '../ManageMythemesDialog';

const mythemes = [
  { id: 'a', name: 'Prometheus', type: 'character', color: '#fff' },
  { id: 'b', name: 'Zeus', type: 'character', color: '#fff' },
  { id: 'c', name: 'Olympus', type: 'place', color: '#fff' },
];

describe('ManageMythemesDialog', () => {
  test('renders grouped mythemes, handles delete and add flows', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onAdd = vi.fn();
    const onOpenChange = vi.fn();

    const { container } = render(
      <ManageMythemesDialog
        open
        onOpenChange={onOpenChange}
        mythemes={mythemes}
        onDelete={onDelete}
        onAdd={onAdd}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText(/characters/i)).toBeInTheDocument();
    expect(screen.getByText(/place/i)).toBeInTheDocument();

    const characterSection = screen.getByText(/characters/i).closest('div') as HTMLElement;
    const firstBadge = characterSection.querySelector('[data-slot="badge"]') as HTMLElement;
    await user.click(within(firstBadge).getByRole('button', { hidden: true }));
    expect(onDelete).toHaveBeenCalledWith('a');

    await user.click(screen.getByRole('button', { name: /add mytheme/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('displays error when deletion fails', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue(new Error('Unable to delete the mytheme.'));

    render(
      <ManageMythemesDialog
        open
        onOpenChange={vi.fn()}
        mythemes={[mythemes[2]]}
        onDelete={onDelete}
        onAdd={vi.fn()}
      />,
    );

    const badge = screen.getByText('Olympus').closest('[data-slot="badge"]') as HTMLElement;
    await user.click(within(badge).getByRole('button', { hidden: true }));

    expect(await screen.findByText(/unable to delete the mytheme/i)).toBeInTheDocument();
  });
});
