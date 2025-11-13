import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { MythDetailPage } from '../MythDetailPage';

const useMythsContextMock = vi.fn();
const useArchiveLayoutContextMock = vi.fn();

vi.mock('../../providers/MythArchiveProvider', () => ({
  useMythsContext: () => useMythsContextMock(),
}));

vi.mock('../ArchiveLayout', () => ({
  useArchiveLayoutContext: () => useArchiveLayoutContextMock(),
}));

vi.mock('../../components/ContributionRequestsPanel', () => ({
  ContributionRequestsPanel: () => <div data-testid="contribution-requests" />,
}));

vi.mock('../../components/LoadingAnimation', () => ({
  LoadingAnimation: ({ message }: { message: string }) => (
    <div data-testid="loading">{message}</div>
  ),
}));

const baseMythsContext = {
  myths: [],
  addVariant: vi.fn(),
  updateContributorInstructions: vi.fn(),
  loading: false,
};

const baseLayoutContext = {
  currentUserEmail: 'owner@example.com',
  currentUserDisplayName: 'Owner One',
  currentUserAvatarUrl: 'owner.png',
  sessionUserId: 'user-1',
  openManageCollaborators: vi.fn(),
};

describe('MythDetailPage', () => {
  beforeEach(() => {
    useMythsContextMock.mockReturnValue(baseMythsContext);
    useArchiveLayoutContextMock.mockReturnValue(baseLayoutContext);
  });

  it('shows loading state during initial load', () => {
    useMythsContextMock.mockReturnValue({ ...baseMythsContext, loading: true });

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
    useMythsContextMock.mockReturnValue(baseMythsContext);

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
    useMythsContextMock.mockReturnValue({
      ...baseMythsContext,
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

  it('shows canonicalization callout for owners', () => {
    useMythsContextMock.mockReturnValue({
      ...baseMythsContext,
      myths: [
        {
          id: 'myth-1',
          name: 'Fire Theft',
          description: 'story',
          contributorInstructions: '',
          ownerId: 'user-1',
          categories: [],
          variants: [],
          collaborators: [],
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

    expect(screen.getByTestId('canonicalization-callout')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open lab/i })).toHaveAttribute(
      'href',
      '/myths/myth-1/canonicalization',
    );
  });

  it('hides canonicalization callout for non-owners', () => {
    useMythsContextMock.mockReturnValue({
      ...baseMythsContext,
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
              email: 'editor@example.com',
              role: 'editor',
            },
          ],
          canonicalCategories: [],
          collaboratorCategories: [],
        },
      ],
    });
    useArchiveLayoutContextMock.mockReturnValue({
      ...baseLayoutContext,
      currentUserEmail: 'editor@example.com',
      sessionUserId: 'user-2',
    });

    render(
      <MemoryRouter initialEntries={['/myths/myth-1']}>
        <Routes>
          <Route path="/myths/:mythId" element={<MythDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('canonicalization-callout')).not.toBeInTheDocument();
  });
});
