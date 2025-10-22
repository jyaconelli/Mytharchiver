import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { VariantSelector } from '../VariantSelector';
import type { MythVariant } from '../../types/myth';

const variants: MythVariant[] = [
  {
    id: 'variant-1',
    name: "Hesiod's Version",
    source: 'Theogony',
    plotPoints: [],
  },
  {
    id: 'variant-2',
    name: "Aeschylus's Version",
    source: 'Prometheus Bound',
    plotPoints: [],
  },
];

describe('VariantSelector', () => {
  test('shows add variant button and calls handler when editable', async () => {
    const user = userEvent.setup();
    const handleAddVariant = vi.fn();

    const { container } = render(
      <VariantSelector
        variants={variants}
        selectedVariantId={null}
        onSelectVariant={() => undefined}
        onAddVariant={handleAddVariant}
        canEdit
      />,
    );

    const addButton = screen.getByRole('button', { name: /add variant/i });
    expect(addButton).toBeInTheDocument();

    await user.click(addButton);
    expect(handleAddVariant).toHaveBeenCalled();

    expect(container.firstChild).toMatchSnapshot();
  });

  test('hides add variant button when read only', () => {
    const { container } = render(
      <VariantSelector
        variants={variants}
        selectedVariantId={variants[0].id}
        onSelectVariant={() => undefined}
        canEdit={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /add variant/i })).not.toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });
});
