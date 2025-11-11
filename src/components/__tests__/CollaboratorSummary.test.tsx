import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { CollaboratorSummary } from '../CollaboratorSummary';
import { Myth } from '../../types/myth';

const createMyth = (overrides: Partial<Myth> = {}): Myth => ({
  id: 'myth-1',
  name: 'Fire Theft',
  description: 'Prometheus steals fire.',
  contributorInstructions: '',
  ownerId: 'owner-1',
  categories: [],
  variants: [],
  collaborators: [],
  canonicalCategories: [],
  collaboratorCategories: [],
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
          displayName: 'Guardian Gal',
        },
      ],
    });

    const { container } = render(
      <CollaboratorSummary
        myth={myth}
        currentUserEmail="OWNER@example.com"
        sessionUserId="owner-1"
        currentUserDisplayName="Owner One"
        currentUserAvatarUrl="data:image/jpeg;base64,owner"
        onManage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /manage/i })).toBeInTheDocument();
    expect(screen.getByText('Owner One')).toBeInTheDocument();
    expect(screen.getByText(/guardian gal/i)).toBeInTheDocument();
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
          displayName: 'Keeper Kai',
        },
        {
          id: 'editor-entry',
          mythId: 'myth-1',
          email: 'scribe@example.com',
          role: 'editor',
          displayName: 'Scribe Syd',
        },
      ],
    });

    render(
      <CollaboratorSummary
        myth={myth}
        currentUserEmail="viewer@example.com"
        sessionUserId="viewer-1"
        currentUserDisplayName="Viewer Vic"
        currentUserAvatarUrl={null}
        onManage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
    expect(screen.getByText('Keeper Kai')).toBeInTheDocument();
    expect(screen.getByText('Scribe Syd')).toBeInTheDocument();
  });
});
