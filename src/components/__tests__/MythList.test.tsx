import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { MythList } from '../MythList';
import { Myth } from '../../types/myth';

const createMyth = (overrides: Partial<Myth> = {}): Myth => ({
  id: `myth-${Math.random().toString(36).slice(2, 7)}`,
  name: 'Sample Myth',
  description: 'Myth description',
  ownerId: 'owner-1',
  categories: [],
  variants: [
    {
      id: 'variant-1',
      name: 'Variant One',
      source: 'Source',
      plotPoints: [{ id: 'point-1', text: 'Plot', category: 'Intro', order: 1, mythemeRefs: [] }],
    },
  ],
  collaborators: [],
  ...overrides,
});

describe('MythList', () => {
  test('renders myths and handles selection and addition', async () => {
    const user = userEvent.setup();
    const onSelectMyth = vi.fn();
    const onAddMyth = vi.fn();

    const myths = [
      createMyth({
        id: 'myth-1',
        name: 'Creation Myth',
        description: 'How everything began.',
        variants: [
          {
            id: 'v1',
            name: 'Primary',
            source: 'Oral tradition',
            plotPoints: [{ id: 'p1', text: 'The world forms', category: 'Intro', order: 1, mythemeRefs: [] }],
          },
        ],
        collaborators: [
          { id: 'c1', mythId: 'myth-1', email: 'owner@example.com', role: 'owner' },
          { id: 'c2', mythId: 'myth-1', email: 'scribe@example.com', role: 'editor' },
          { id: 'c3', mythId: 'myth-1', email: 'viewer@example.com', role: 'viewer' },
          { id: 'c4', mythId: 'myth-1', email: 'extra@example.com', role: 'viewer' },
        ],
      }),
      createMyth({
        id: 'myth-2',
        name: 'Flood Myth',
        description: 'A great flood reshapes the world.',
        variants: [],
        collaborators: [],
      }),
    ];

    const { container } = render(
      <MythList
        myths={myths}
        selectedMythId="myth-2"
        onSelectMyth={onSelectMyth}
        onAddMyth={onAddMyth}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByRole('button', { name: /add myth folder/i })).toBeInTheDocument();
    expect(screen.getByText('Creation Myth')).toBeInTheDocument();
    expect(screen.getByText('Flood Myth')).toBeInTheDocument();
    expect(screen.getByText('Flood Myth').closest('[class*="border-purple"]')).toBeNull();

    await user.click(screen.getByRole('button', { name: /add myth folder/i }));
    expect(onAddMyth).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Creation Myth'));
    expect(onSelectMyth).toHaveBeenCalledWith('myth-1');

    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
