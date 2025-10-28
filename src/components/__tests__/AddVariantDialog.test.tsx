import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { AddVariantDialog } from '../AddVariantDialog';

describe('AddVariantDialog', () => {
  test('submits name and source then closes dialog', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const { container } = render(
      <AddVariantDialog open onOpenChange={onOpenChange} onAdd={onAdd} />,
    );

    await user.type(screen.getByLabelText(/variant name/i), 'Hesiod Version');
    await user.type(screen.getByLabelText(/source/i), 'Works and Days');
    await user.click(screen.getByRole('button', { name: /add variant/i }));

    expect(onAdd).toHaveBeenCalledWith('Hesiod Version', 'Works and Days');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('shows error message when submission fails', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValue(new Error('Unable to add variant'));

    render(<AddVariantDialog open onOpenChange={vi.fn()} onAdd={onAdd} />);

    await user.type(screen.getByLabelText(/variant name/i), 'Invalid Variant');
    await user.type(screen.getByLabelText(/source/i), 'Unknown Source');
    await user.click(screen.getByRole('button', { name: /add variant/i }));

    expect(await screen.findByText(/unable to add variant/i)).toBeInTheDocument();
  });
});
