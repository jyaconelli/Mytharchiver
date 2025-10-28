import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { CollaboratorSummary } from '../CollaboratorSummary';
import { Myth } from '../../types/myth';

const createMyth = (overrides: Partial<Myth> = {}): Myth => ({
  id: 'myth-1',
  name: 'Fire Theft',
  description: 'Prometheus steals fire.',
  ownerId: 'owner-1',
  categories: [],
  variants: [],
  collaborators: [],
  ...overrides,
});

describe('CollaboratorSummary', () => {
  test('shows collaborators with manage access for owner', () => {
  const myth = createMyth({
      collaborators: [
        {
          id: 'collab-1',
          mythId: 'myth-1',
          email: 'guardian@example.com',
          role: 'viewer',
        },
      ],
    });

    const { container } = render(
      <CollaboratorSummary
        myth={myth}
        currentUserEmail="OWNER@example.com"
        sessionUserId="owner-1"
        onManage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /manage/i })).toBeInTheDocument();
    const ownerBadges = screen.getAllByText(/^owner$/i);
    expect(ownerBadges.length).toBeGreaterThan(0);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('displays collaborators for non-owner with view access', () => {
    const myth = createMyth({
      ownerId: 'owner-2',
      collaborators: [
        {
          id: 'owner-entry',
          mythId: 'myth-1',
          email: 'keeper@example.com',
          role: 'owner',
        },
        {
          id: 'editor-entry',
          mythId: 'myth-1',
          email: 'scribe@example.com',
          role: 'editor',
        },
      ],
    });

    render(
      <CollaboratorSummary
        myth={myth}
        currentUserEmail="viewer@example.com"
        sessionUserId="viewer-1"
        onManage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
    const badges = screen.getAllByText(/example\.com/);
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('keeper@example.com');
    expect(badges[1]).toHaveTextContent('scribe@example.com');
  });
});
