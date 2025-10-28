import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { ManageCategoriesDialog } from '../ManageCategoriesDialog';

describe('ManageCategoriesDialog', () => {
  test('allows adding, removing, and saving categories', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const { container } = render(
      <ManageCategoriesDialog
        open
        onOpenChange={onOpenChange}
        categories={['Introduction', 'Conflict']}
        onUpdateCategories={onUpdate}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();

    await user.type(screen.getByLabelText(/add new category/i), 'Resolution');
    await user.keyboard('{Enter}');

    const badges = screen.getAllByText(/introduction|conflict|resolution/i);
    expect(badges).toHaveLength(3);

    // Remove first category
    const firstBadge = badges[0].closest('[data-slot="badge"]') as HTMLElement;
    await user.click(firstBadge.querySelector('button') as HTMLButtonElement);

    await user.click(screen.getByRole('button', { name: /save categories/i }));

    expect(onUpdate).toHaveBeenCalledWith(['Conflict', 'Resolution']);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('shows error when save fails and resets on cancel', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockRejectedValue(new Error('Unable to update categories.'));
    const onOpenChange = vi.fn();

    render(
      <ManageCategoriesDialog
        open
        onOpenChange={onOpenChange}
        categories={['Journey']}
        onUpdateCategories={onUpdate}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save categories/i }));
    expect(await screen.findByText(/unable to update categories/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/unable to update categories/i)).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
