import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { ArchiveLayout, useArchive } from '../ArchiveLayout';

const useMythArchiveMock = vi.fn();

vi.mock('../../hooks/useMythArchive', () => ({
  useMythArchive: (...args: unknown[]) => useMythArchiveMock(...args),
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
  const ctx = useArchive();
  return <div data-testid="context-size">{ctx.myths.length}</div>;
};

describe('ArchiveLayout', () => {
  beforeEach(() => {
    useMythArchiveMock.mockReturnValue({
      myths: [],
      mythemes: [],
      dataLoading: false,
      dataError: null,
      loadArchiveData: vi.fn(),
      addMyth: vi.fn(),
      addVariant: vi.fn(),
      updateVariant: vi.fn(),
      addMytheme: vi.fn(),
      deleteMytheme: vi.fn(),
      updateMythCategories: vi.fn(),
      addCollaborator: vi.fn(),
      updateCollaboratorRole: vi.fn(),
      removeCollaborator: vi.fn(),
      createCollaboratorCategory: vi.fn(),
    });
  });

  it('renders error banner when data fails to load', () => {
    useMythArchiveMock.mockReturnValueOnce({
      myths: [],
      mythemes: [],
      dataLoading: false,
      dataError: 'Boom',
      loadArchiveData: vi.fn(),
      addMyth: vi.fn(),
      addVariant: vi.fn(),
      updateVariant: vi.fn(),
      addMytheme: vi.fn(),
      deleteMytheme: vi.fn(),
      updateMythCategories: vi.fn(),
      addCollaborator: vi.fn(),
      updateCollaboratorRole: vi.fn(),
      removeCollaborator: vi.fn(),
      createCollaboratorCategory: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            element={<ArchiveLayout session={session} supabaseClient={supabaseClient} />}
          >
            <Route index element={<OutletProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/unable to load archive data/i),
    ).toBeInTheDocument();
  });

  it('exposes archive context to children', () => {
    useMythArchiveMock.mockReturnValueOnce({
      myths: [
        {
          id: 'myth-1',
          name: 'Fire Theft',
          description: '',
          ownerId: 'user-1',
          categories: [],
          variants: [],
          collaborators: [],
          canonicalCategories: [],
          collaboratorCategories: [],
        },
      ],
      mythemes: [],
      dataLoading: false,
      dataError: null,
      loadArchiveData: vi.fn(),
      addMyth: vi.fn(),
      addVariant: vi.fn(),
      updateVariant: vi.fn(),
      addMytheme: vi.fn(),
      deleteMytheme: vi.fn(),
      updateMythCategories: vi.fn(),
      addCollaborator: vi.fn(),
      updateCollaboratorRole: vi.fn(),
      removeCollaborator: vi.fn(),
      createCollaboratorCategory: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            element={<ArchiveLayout session={session} supabaseClient={supabaseClient} />}
          >
            <Route index element={<OutletProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('context-size')).toHaveTextContent('1');
  });

  it('allows signing out via header menu', async () => {
    useMythArchiveMock.mockReturnValueOnce({
      myths: [],
      mythemes: [],
      dataLoading: false,
      dataError: null,
      loadArchiveData: vi.fn(),
      addMyth: vi.fn(),
      addVariant: vi.fn(),
      updateVariant: vi.fn(),
      addMytheme: vi.fn(),
      deleteMytheme: vi.fn(),
      updateMythCategories: vi.fn(),
      addCollaborator: vi.fn(),
      updateCollaboratorRole: vi.fn(),
      removeCollaborator: vi.fn(),
      createCollaboratorCategory: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            element={<ArchiveLayout session={session} supabaseClient={supabaseClient} />}
          >
            <Route index element={<div data-testid="root" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('sign-out'));

    expect(supabaseClient.auth.signOut).toHaveBeenCalled();
  });
});
