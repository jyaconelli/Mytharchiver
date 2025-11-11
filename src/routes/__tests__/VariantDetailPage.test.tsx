import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { VariantDetailPage } from '../VariantDetailPage';

const useArchiveMock = vi.fn();

vi.mock('../ArchiveLayout', () => ({
  useArchive: () => useArchiveMock(),
}));

vi.mock('../../components/VariantView', () => ({
  VariantView: ({ variant }: { variant: { name: string } }) => (
    <div data-testid="variant-view">{variant.name}</div>
  ),
}));

vi.mock('../../components/LoadingAnimation', () => ({
  LoadingAnimation: ({ message }: { message: string }) => (
    <div data-testid="loading">{message}</div>
  ),
}));

const baseContext = {
  myths: [],
  mythemes: [],
  updateVariant: vi.fn(),
  currentUserEmail: 'owner@example.com',
  currentUserDisplayName: 'Owner One',
  currentUserAvatarUrl: 'owner.png',
  sessionUserId: 'user-1',
  createCollaboratorCategory: vi.fn(),
  openManageCollaborators: vi.fn(),
  isInitialLoad: false,
};

describe('VariantDetailPage', () => {
  beforeEach(() => {
    useArchiveMock.mockReturnValue(baseContext);
  });

  it('shows loading UI during initial fetch', () => {
    useArchiveMock.mockReturnValue({ ...baseContext, isInitialLoad: true });

    render(
      <MemoryRouter initialEntries={['/myths/myth-1/variants/variant-1']}>
        <Routes>
          <Route path="/myths/:mythId/variants/:variantId" element={<VariantDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('loading')).toHaveTextContent(/loading variant/i);
  });

  it('shows message when myth is missing', () => {
    useArchiveMock.mockReturnValue(baseContext);

    render(
      <MemoryRouter initialEntries={['/myths/missing/variants/variant-1']}>
        <Routes>
          <Route path="/myths/:mythId/variants/:variantId" element={<VariantDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/myth not found/i)).toBeInTheDocument();
  });

  it('shows message when variant is missing', () => {
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
          collaborators: [],
          canonicalCategories: [],
          collaboratorCategories: [],
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/myths/myth-1/variants/missing']}>
        <Routes>
          <Route path="/myths/:mythId/variants/:variantId" element={<VariantDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/variant not found/i)).toBeInTheDocument();
  });

  it('renders the variant view when data is available', () => {
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
          variants: [
            {
              id: 'variant-1',
              name: 'Variant A',
              source: 'Source',
              plotPoints: [],
            },
          ],
          collaborators: [],
          canonicalCategories: [],
          collaboratorCategories: [],
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/myths/myth-1/variants/variant-1']}>
        <Routes>
          <Route path="/myths/:mythId/variants/:variantId" element={<VariantDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('variant-view')).toHaveTextContent('Variant A');
  });
});
