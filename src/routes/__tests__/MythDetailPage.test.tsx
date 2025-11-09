import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { MythDetailPage } from '../MythDetailPage';

const useArchiveMock = vi.fn();

vi.mock('../ArchiveLayout', () => ({
  useArchive: () => useArchiveMock(),
}));

vi.mock('../../components/LoadingAnimation', () => ({
  LoadingAnimation: ({ message }: { message: string }) => (
    <div data-testid="loading">{message}</div>
  ),
}));

const baseContext = {
  myths: [],
  addVariant: vi.fn(),
  updateContributorInstructions: vi.fn(),
  currentUserEmail: 'owner@example.com',
  currentUserDisplayName: 'Owner One',
  currentUserAvatarUrl: 'owner.png',
  sessionUserId: 'user-1',
  openManageCollaborators: vi.fn(),
  isInitialLoad: false,
};

describe('MythDetailPage', () => {
  beforeEach(() => {
    useArchiveMock.mockReturnValue(baseContext);
  });

  it('shows loading state during initial load', () => {
    useArchiveMock.mockReturnValue({ ...baseContext, isInitialLoad: true });

    render(
      <MemoryRouter initialEntries={['/myths/myth-1']}>
        <Routes>
          <Route path="/myths/:mythId" element={<MythDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('loading')).toHaveTextContent(/loading myth/i);
  });

  it('renders not found message when myth is missing', () => {
    useArchiveMock.mockReturnValue(baseContext);

    render(
      <MemoryRouter initialEntries={['/myths/unknown']}>
        <Routes>
          <Route path="/myths/:mythId" element={<MythDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/myth not found/i)).toBeInTheDocument();
  });

  it('renders myth details with collaborator summary', () => {
    useArchiveMock.mockReturnValue({
      ...baseContext,
      myths: [
        {
          id: 'myth-1',
          name: 'Fire Theft',
          description: 'story',
          contributorInstructions: '',
          ownerId: 'user-1',
          categories: [],
          variants: [],
          collaborators: [
            {
              id: 'collab-1',
              mythId: 'myth-1',
              email: 'scribe@example.com',
              role: 'editor',
              displayName: 'Scribe Syd',
              avatarUrl: 'scribe.png',
            },
          ],
          canonicalCategories: [],
          collaboratorCategories: [],
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/myths/myth-1']}>
        <Routes>
          <Route path="/myths/:mythId" element={<MythDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Fire Theft')).toBeInTheDocument();
    expect(screen.getByText(/scribe syd/i)).toBeInTheDocument();
  });
});
