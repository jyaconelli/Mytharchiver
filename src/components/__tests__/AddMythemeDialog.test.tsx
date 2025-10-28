import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { AddMythemeDialog } from '../AddMythemeDialog';

describe('AddMythemeDialog', () => {
  test('submits mytheme details and closes dialog', async () => {
    const handleAdd = vi.fn().mockResolvedValue(undefined);
    const handleOpenChange = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <AddMythemeDialog open onOpenChange={handleOpenChange} onAdd={handleAdd} />,
    );

    await user.type(screen.getByLabelText(/mytheme name/i), 'Zeus');
    await user.click(screen.getByRole('button', { name: /add mytheme/i }));

    expect(handleAdd).toHaveBeenCalledWith('Zeus', 'character');
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('shows error message on submission failure', async () => {
    const handleAdd = vi.fn().mockRejectedValue(new Error('Failed to add mytheme'));
    const user = userEvent.setup();

    const { container } = render(
      <AddMythemeDialog open onOpenChange={vi.fn()} onAdd={handleAdd} />,
    );

    await user.type(screen.getByLabelText(/mytheme name/i), 'Athena');
    await user.click(screen.getByRole('button', { name: /add mytheme/i }));

    expect(await screen.findByText(/Failed to add mytheme/i)).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });
});
