import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { ArchiveLayout, useArchiveLayoutContext } from '../ArchiveLayout';

const useMythArchiveMock = vi.fn();
const useMythsContextMock = vi.fn();
const useMythemesContextMock = vi.fn();
const useCollaboratorActionsMock = vi.fn();

vi.mock('../../providers/MythArchiveProvider', () => ({
  useMythArchive: (...args: unknown[]) => useMythArchiveMock(...args),
  useMythsContext: () => useMythsContextMock(),
  useMythemesContext: () => useMythemesContextMock(),
  useCollaboratorActions: () => useCollaboratorActionsMock(),
}));

vi.mock('../../components/AppHeader', () => ({
  AppHeader: ({ onSignOut }: { onSignOut: () => Promise<void> }) => (
    <header>
      <button data-testid="sign-out" onClick={() => onSignOut()}>
        Sign Out
      </button>
    </header>
  ),
}));

const supabaseClient = {
  auth: {
    signOut: vi.fn().mockResolvedValue(undefined),
  },
};

const session = {
  user: {
    id: 'user-1',
    email: 'owner@example.com',
    user_metadata: {
      display_name: 'Owner One',
      avatar_url: 'owner.png',
    },
  },
} as any;

const OutletProbe = () => {
  const ctx = useArchiveLayoutContext();
  return <div data-testid="context-email">{ctx.currentUserEmail}</div>;
};

describe('ArchiveLayout', () => {
  beforeEach(() => {
    useMythArchiveMock.mockReturnValue({
      dataLoading: false,
      dataError: null,
      loadArchiveData: vi.fn(),
    });
    useMythsContextMock.mockReturnValue({
      myths: [],
      loading: false,
      addMyth: vi.fn(),
      addVariant: vi.fn(),
      updateVariant: vi.fn(),
      updateContributorInstructions: vi.fn(),
      updateMythCategories: vi.fn(),
      createCollaboratorCategory: vi.fn(),
    });
    useMythemesContextMock.mockReturnValue({
      mythemes: [],
      addMytheme: vi.fn(),
      deleteMytheme: vi.fn(),
    });
    useCollaboratorActionsMock.mockReturnValue({
      addCollaborator: vi.fn(),
      updateCollaboratorRole: vi.fn(),
      removeCollaborator: vi.fn(),
    });
  });

  it('renders error banner when data fails to load', () => {
    useMythArchiveMock.mockReturnValueOnce({
      dataLoading: false,
      dataError: 'Boom',
      loadArchiveData: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ArchiveLayout session={session} supabaseClient={supabaseClient}>
                <OutletProbe />
              </ArchiveLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/unable to load archive data/i)).toBeInTheDocument();
  });

  it('exposes layout context to children', () => {
    useMythsContextMock.mockReturnValueOnce({
      myths: [
        {
          id: 'myth-1',
          name: 'Fire Theft',
          description: '',
          contributorInstructions: '',
          ownerId: 'user-1',
          categories: [],
          variants: [],
          collaborators: [],
          canonicalCategories: [],
          collaboratorCategories: [],
        },
      ],
      loading: false,
      addMyth: vi.fn(),
      addVariant: vi.fn(),
      updateVariant: vi.fn(),
      updateContributorInstructions: vi.fn(),
      updateMythCategories: vi.fn(),
      createCollaboratorCategory: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ArchiveLayout session={session} supabaseClient={supabaseClient}>
                <OutletProbe />
              </ArchiveLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('context-email')).toHaveTextContent('owner@example.com');
  });

  it('allows signing out via header menu', async () => {
    useMythArchiveMock.mockReturnValueOnce({
      dataLoading: false,
      dataError: null,
      loadArchiveData: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ArchiveLayout session={session} supabaseClient={supabaseClient}>
                <div data-testid="root" />
              </ArchiveLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('sign-out'));

    expect(supabaseClient.auth.signOut).toHaveBeenCalled();
  });
});
