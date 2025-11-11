import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { AddMythDialog } from '../AddMythDialog';

describe('AddMythDialog', () => {
  test('submits new myth details and closes dialog', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn().mockResolvedValue(undefined);
    const handleOpenChange = vi.fn();

    const { container } = render(
      <AddMythDialog open onOpenChange={handleOpenChange} onAdd={handleAdd} />,
    );

    await user.type(screen.getByLabelText(/myth name/i), 'Prometheus');
    await user.type(screen.getByLabelText(/description/i), 'Fire bringer');
    await user.type(screen.getByLabelText(/contributor instructions/i), 'Share source links.');
    await user.click(screen.getByRole('button', { name: /add myth/i }));

    expect(handleAdd).toHaveBeenCalledWith('Prometheus', 'Fire bringer', 'Share source links.');
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('shows error message when submission fails', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn().mockRejectedValue(new Error('Failed to add myth'));

    const { container } = render(<AddMythDialog open onOpenChange={vi.fn()} onAdd={handleAdd} />);

    await user.type(screen.getByLabelText(/myth name/i), 'Prometheus');
    await user.click(screen.getByRole('button', { name: /add myth/i }));

    expect(await screen.findByText(/Failed to add myth/i)).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });
});
