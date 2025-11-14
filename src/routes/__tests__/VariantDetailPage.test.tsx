import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { VariantDetailPage } from '../VariantDetailPage';

const useMythsContextMock = vi.fn();
const useMythemesContextMock = vi.fn();
const useArchiveLayoutContextMock = vi.fn();

vi.mock('../../providers/MythArchiveProvider', () => ({
  useMythsContext: () => useMythsContextMock(),
  useMythemesContext: () => useMythemesContextMock(),
}));

vi.mock('../ArchiveLayout', () => ({
  useArchiveLayoutContext: () => useArchiveLayoutContextMock(),
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

const baseMythsContext = {
  myths: [],
  updateVariant: vi.fn(),
  createCollaboratorCategory: vi.fn(),
  loading: false,
};

const baseMythemesContext = {
  mythemes: [],
};

const baseLayoutContext = {
  currentUserEmail: 'owner@example.com',
  currentUserDisplayName: 'Owner One',
  currentUserAvatarUrl: 'owner.png',
  sessionUserId: 'user-1',
  openManageCollaborators: vi.fn(),
};

describe('VariantDetailPage', () => {
  beforeEach(() => {
    useMythsContextMock.mockReturnValue(baseMythsContext);
    useMythemesContextMock.mockReturnValue(baseMythemesContext);
    useArchiveLayoutContextMock.mockReturnValue(baseLayoutContext);
  });

  it('shows loading UI during initial fetch', () => {
    useMythsContextMock.mockReturnValue({ ...baseMythsContext, loading: true });

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
    useMythsContextMock.mockReturnValue(baseMythsContext);

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
      <MemoryRouter initialEntries={['/myths/myth-1/variants/missing']}>
        <Routes>
          <Route path="/myths/:mythId/variants/:variantId" element={<VariantDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/variant not found/i)).toBeInTheDocument();
  });

  it('renders the variant view when data is available', () => {
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
